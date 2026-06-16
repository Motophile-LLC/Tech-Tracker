'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, addDays } from 'date-fns'
import { Camera, Loader2, BarChart3, CheckCircle, AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BottomNav } from '@/components/bottom-nav'
import { CameraCapture } from '@/components/camera-capture'
import { getAllROs, saveAuditSession, getAllAuditSessions } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { extractSummaryFromPhotos } from '@/lib/ai'
import {
  getCurrentPayPeriod, getROsInPeriod, getTotalHours,
  buildLoggedHoursMap, buildSummaryHoursMap, compareHoursMaps
} from '@/lib/pay'
import { RepairOrder, AuditSession, ComparisonResult } from '@/types'

type AuditStep = 'setup' | 'capture' | 'extracting' | 'results'

const STATUS_CONFIG: Record<ComparisonResult['status'], { icon: typeof CheckCircle; color: string; label: string }> = {
  match:              { icon: CheckCircle,  color: 'text-emerald-400', label: 'Match' },
  over:               { icon: AlertCircle,  color: 'text-amber-400',   label: 'You logged more' },
  under:              { icon: AlertTriangle,color: 'text-red-400',     label: '⚠ Short-paid' },
  missing_log:        { icon: Info,         color: 'text-slate-400',   label: 'Not in your log' },
  missing_summary:    { icon: Info,         color: 'text-blue-400',    label: 'Not on pay stub' },
}

export default function AuditPage() {
  const [ros, setRos] = useState<RepairOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<AuditStep>('setup')
  const [photos, setPhotos] = useState<string[]>([])
  const [results, setResults] = useState<ComparisonResult[]>([])
  const [periodROs, setPeriodROs] = useState<RepairOrder[]>([])
  const [extractedCount, setExtractedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pastSessions, setPastSessions] = useState<AuditSession[]>([])
  const [showPast, setShowPast] = useState(false)

  const s = getSettings()
  const defaultPeriod = getCurrentPayPeriod(s.payPeriodType, s.payPeriodStartDate)

  const [startDate, setStartDate] = useState(format(defaultPeriod.start, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(defaultPeriod.end, 'yyyy-MM-dd'))

  const load = useCallback(async () => {
    try {
      const [allROs, sessions] = await Promise.all([getAllROs(), getAllAuditSessions()])
      setRos(allROs)
      setPastSessions(sessions)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Recompute periodROs whenever dates change
  useEffect(() => {
    try {
      const start = parseISO(startDate)
      const end = parseISO(endDate)
      setPeriodROs(getROsInPeriod(ros, start, end))
    } catch {}
  }, [startDate, endDate, ros])

  async function handleExtract() {
    if (!photos.length) { setError('Add at least one photo of your pay summary'); return }
    const apiKey = getSettings().openaiApiKey
    if (!apiKey) { setError('No OpenAI API key configured. Add it in Settings.'); return }
    setError(null)
    setStep('extracting')
    try {
      const summaryLines = await extractSummaryFromPhotos(photos, apiKey)
      setExtractedCount(summaryLines.length)

      const loggedMap = buildLoggedHoursMap(periodROs)
      const summaryMap = buildSummaryHoursMap(summaryLines)
      const comparison = compareHoursMaps(loggedMap, summaryMap)
      setResults(comparison)

      // Save audit session
      const session: AuditSession = {
        id: crypto.randomUUID(),
        periodLabel: `${format(parseISO(startDate), 'MMM d')} – ${format(parseISO(endDate), 'MMM d, yyyy')}`,
        startDate, endDate,
        summaryPhotos: photos,
        summaryLines,
        createdAt: new Date().toISOString(),
      }
      await saveAuditSession(session)
      setPastSessions(prev => [session, ...prev])
      setStep('results')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Extraction failed. Check your API key.')
      setStep('capture')
    }
  }

  // ── Setup step ───────────────────────────────────────────────────────────────
  if (step === 'setup') return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <div className="bg-slate-900 px-4 pt-14 pb-5 border-b border-slate-800">
        <h1 className="text-xl font-bold text-slate-100">Pay Period Audit</h1>
        <p className="text-sm text-slate-400 mt-1">Compare your logged hours against your pay stub</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Period selector */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-slate-400 uppercase tracking-wide">Audit Period</CardTitle></CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-400">Start Date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="bg-slate-900 border-slate-600 text-slate-100 mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-400">End Date</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="bg-slate-900 border-slate-600 text-slate-100 mt-1" />
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 flex-wrap">
              {[0, 1, 2].map(i => {
                const ref = addDays(parseISO(s.payPeriodStartDate), -14 * i)
                const p = getCurrentPayPeriod(s.payPeriodType, format(ref, 'yyyy-MM-dd'))
                const label = i === 0 ? 'Current' : i === 1 ? 'Previous' : '2 ago'
                return (
                  <button key={i}
                    onClick={() => { setStartDate(format(p.start, 'yyyy-MM-dd')); setEndDate(format(p.end, 'yyyy-MM-dd')) }}
                    className="text-xs px-2.5 py-1 rounded-full border border-slate-600 text-slate-400 hover:border-blue-600 hover:text-blue-400 transition-colors">
                    {label}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Logged ROs summary */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Logged in this period</p>
              <p className="text-2xl font-bold text-slate-100 tabular-nums mt-0.5">{loading ? '…' : `${periodROs.length} ROs`}</p>
              <p className="text-sm text-blue-400 font-mono">{getTotalHours(periodROs).toFixed(1)} hrs total</p>
            </div>
            <BarChart3 className="w-10 h-10 text-slate-600" />
          </CardContent>
        </Card>

        <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white h-12 font-semibold" onClick={() => setStep('capture')}>
          <Camera className="w-4 h-4 mr-2" /> Capture Pay Summary Sheet
        </Button>

        {/* Past audits */}
        {pastSessions.length > 0 && (
          <div>
            <button
              onClick={() => setShowPast(!showPast)}
              className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2 w-full"
            >
              Past Audits
              {showPast ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showPast && (
              <div className="space-y-2">
                {pastSessions.slice(0, 5).map(session => (
                  <div key={session.id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                    <p className="text-sm font-medium text-slate-200">{session.periodLabel}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{format(parseISO(session.createdAt), 'MMM d, yyyy')} · {session.summaryLines.length} lines extracted</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )

  // ── Capture step ─────────────────────────────────────────────────────────────
  if (step === 'capture') return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="bg-slate-900 px-4 pt-14 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('setup')} className="p-1">
            <RefreshCw className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-100">Capture Summary Sheet</h1>
            <p className="text-xs text-slate-500">{format(parseISO(startDate), 'MMM d')} – {format(parseISO(endDate), 'MMM d, yyyy')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 space-y-4">
        <p className="text-sm text-slate-400">Take a photo of your pay stub or the shop's technician productivity/summary report. AI will extract the RO numbers and hours.</p>
        <CameraCapture photos={photos} onPhotosChange={setPhotos} label="Add Summary Pages" />
        {error && (
          <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      <div className="px-4 pb-10">
        <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white h-12 font-semibold" onClick={handleExtract} disabled={!photos.length}>
          <BarChart3 className="w-4 h-4 mr-2" /> Compare Hours
        </Button>
      </div>
    </div>
  )

  // ── Extracting step ──────────────────────────────────────────────────────────
  if (step === 'extracting') return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 px-6">
      <div className="w-24 h-24 bg-blue-900/30 rounded-full flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-200">Analyzing Pay Summary</h2>
        <p className="text-sm text-slate-400 mt-2">AI is extracting RO numbers and hours from your summary sheet…</p>
      </div>
    </div>
  )

  // ── Results step ─────────────────────────────────────────────────────────────
  const discrepancies = results.filter(r => r.status !== 'match' && r.status !== 'missing_summary')
  const totalLoggedHours = results.reduce((t, r) => t + r.loggedHours, 0)
  const totalSummaryHours = results.reduce((t, r) => t + r.summaryHours, 0)
  const totalDiff = totalLoggedHours - totalSummaryHours

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <div className="bg-slate-900 px-4 pt-14 pb-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Audit Results</h1>
            <p className="text-xs text-slate-500 mt-0.5">{format(parseISO(startDate), 'MMM d')} – {format(parseISO(endDate), 'MMM d, yyyy')} · {extractedCount} lines from summary</p>
          </div>
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 h-8 text-xs" onClick={() => { setPhotos([]); setStep('setup') }}>
            New Audit
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Summary totals */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Logged</p>
              <p className="text-xl font-bold text-blue-400 tabular-nums">{totalLoggedHours.toFixed(1)}</p>
              <p className="text-[10px] text-slate-500">hrs</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Summary</p>
              <p className="text-xl font-bold text-slate-200 tabular-nums">{totalSummaryHours.toFixed(1)}</p>
              <p className="text-[10px] text-slate-500">hrs</p>
            </CardContent>
          </Card>
          <Card className={`border ${Math.abs(totalDiff) < 0.1 ? 'bg-emerald-900/20 border-emerald-800/50' : totalDiff < 0 ? 'bg-red-900/20 border-red-800/50' : 'bg-amber-900/20 border-amber-800/50'}`}>
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Diff</p>
              <p className={`text-xl font-bold tabular-nums ${Math.abs(totalDiff) < 0.1 ? 'text-emerald-400' : totalDiff < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                {totalDiff >= 0 ? '+' : ''}{totalDiff.toFixed(1)}
              </p>
              <p className="text-[10px] text-slate-500">hrs</p>
            </CardContent>
          </Card>
        </div>

        {/* Alert banner */}
        {discrepancies.length > 0 ? (
          <div className="flex items-start gap-3 bg-red-900/20 border border-red-800/50 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300">{discrepancies.length} discrepanc{discrepancies.length === 1 ? 'y' : 'ies'} found</p>
              <p className="text-xs text-red-400/70 mt-0.5">Review the flagged ROs below and compare with your records</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-emerald-900/20 border border-emerald-800/50 rounded-xl p-4">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">Everything matches!</p>
              <p className="text-xs text-emerald-400/70 mt-0.5">All logged hours match your pay summary</p>
            </div>
          </div>
        )}

        {/* RO comparison table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs text-slate-400 uppercase tracking-wide">RO Comparison</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-0">
            <div className="px-4 pb-2 grid grid-cols-[1fr,auto,auto,auto] gap-2 text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
              <span>RO #</span>
              <span className="text-right">Logged</span>
              <span className="text-right">Summary</span>
              <span className="text-right">Status</span>
            </div>
            <Separator className="bg-slate-700/50" />
            <div className="divide-y divide-slate-700/30">
              {results.map(r => {
                const cfg = STATUS_CONFIG[r.status]
                const Icon = cfg.icon
                return (
                  <div key={r.roNumber} className={`px-4 py-3 grid grid-cols-[1fr,auto,auto,auto] gap-2 items-center ${r.status === 'under' || r.status === 'missing_log' ? 'bg-red-950/10' : ''}`}>
                    <span className="font-mono text-sm font-semibold text-slate-100">#{r.roNumber}</span>
                    <span className="text-right font-mono text-sm text-slate-300 tabular-nums">
                      {r.loggedHours > 0 ? `${r.loggedHours.toFixed(1)}h` : '—'}
                    </span>
                    <span className="text-right font-mono text-sm text-slate-300 tabular-nums">
                      {r.summaryHours > 0 ? `${r.summaryHours.toFixed(1)}h` : '—'}
                    </span>
                    <div className="flex items-center justify-end gap-1">
                      <Icon className={`w-3.5 h-3.5 ${cfg.color} shrink-0`} />
                      <span className={`text-[10px] font-medium ${cfg.color} whitespace-nowrap hidden sm:inline`}>{cfg.label}</span>
                    </div>
                  </div>
                )
              })}
              {results.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-slate-500">No matching ROs found</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="pt-3 pb-3 px-4 space-y-1.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">Legend</p>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon
              return (
                <div key={key} className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${cfg.color} shrink-0`} />
                  <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  )
}
