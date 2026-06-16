'use client'

import { useState, useEffect } from 'react'
import { Check, Eye, EyeOff, Shield, Loader2, AlertCircle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { BottomNav } from '@/components/bottom-nav'
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '@/lib/settings'
import { AppSettings, PayPeriodType } from '@/types'
import { getAllROs, deleteRO } from '@/lib/db'

const PERIOD_LABELS: Record<PayPeriodType, string> = {
  weekly: 'Weekly (7 days)',
  biweekly: 'Bi-weekly (14 days)',
  semimonthly: 'Semi-monthly (1–15, 16–end)',
  monthly: 'Monthly',
}

export default function SettingsPage() {
  const [form, setForm] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [roCount, setRoCount] = useState(0)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    setForm(getSettings())
    getAllROs().then(ros => setRoCount(ros.length))
  }, [])

  function setField<K extends keyof AppSettings>(field: K, value: AppSettings[K]) {
    setForm(p => ({ ...p, [field]: value }))
    setSaved(false)
    setTestResult(null)
  }

  function handleSave() {
    saveSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleTestKey() {
    if (!form.openaiApiKey) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${form.openaiApiKey}` }
      })
      if (res.ok) {
        setTestResult({ ok: true, msg: 'API key is valid ✓' })
      } else {
        const err = await res.json().catch(() => ({}))
        setTestResult({ ok: false, msg: (err as { error?: { message?: string } })?.error?.message || `Error ${res.status}` })
      }
    } catch {
      setTestResult({ ok: false, msg: 'Network error — check your connection' })
    } finally {
      setTesting(false)
    }
  }

  async function handleClearAll() {
    if (!confirmClear) { setConfirmClear(true); return }
    const ros = await getAllROs()
    await Promise.all(ros.map(ro => deleteRO(ro.id)))
    setRoCount(0)
    setConfirmClear(false)
    alert('All RO data cleared.')
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <div className="bg-slate-900 px-4 pt-14 pb-5 border-b border-slate-800">
        <h1 className="text-xl font-bold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">All data stays on your device</p>
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* Privacy notice */}
        <div className="flex items-start gap-3 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
          <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-200">100% Local Storage</p>
            <p className="text-xs text-slate-400 mt-0.5">All ROs and settings are stored only on this device — no account, no cloud, no server. Your OpenAI API key is stored locally and only used to send photos to OpenAI for extraction.</p>
          </div>
        </div>

        {/* Tech info */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-slate-400 uppercase tracking-wide">Your Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div>
              <Label className="text-xs text-slate-400">Your Name</Label>
              <Input value={form.techName} onChange={e => setField('techName', e.target.value)}
                placeholder="e.g. Alex Johnson" className="bg-slate-900 border-slate-600 text-slate-100 mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-400">Shop / Dealer</Label>
                <Input value={form.shopName} onChange={e => setField('shopName', e.target.value)}
                  placeholder="Shop name" className="bg-slate-900 border-slate-600 text-slate-100 mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Employee #</Label>
                <Input value={form.employeeNumber} onChange={e => setField('employeeNumber', e.target.value)}
                  placeholder="Emp ID" className="bg-slate-900 border-slate-600 text-slate-100 mt-1 font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pay settings */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-slate-400 uppercase tracking-wide">Pay Settings</CardTitle></CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div>
              <Label className="text-xs text-slate-400">Flat Rate ($/hr) — for pay estimate only</Label>
              <Input type="number" min="0" step="0.01" value={form.hourlyRate || ''}
                onChange={e => setField('hourlyRate', parseFloat(e.target.value) || 0)}
                placeholder="e.g. 28.00" className="bg-slate-900 border-slate-600 text-slate-100 mt-1 font-mono" />
              <p className="text-xs text-slate-500 mt-1">Used only for the estimated pay display on your dashboard. Not transmitted anywhere.</p>
            </div>
            <Separator className="bg-slate-700/50" />
            <div>
              <Label className="text-xs text-slate-400">Pay Period Type</Label>
              <Select value={form.payPeriodType} onValueChange={v => setField('payPeriodType', v as PayPeriodType)}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-100 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {(Object.entries(PERIOD_LABELS) as [PayPeriodType, string][]).map(([v, label]) => (
                    <SelectItem key={v} value={v} className="text-slate-200 focus:bg-slate-700">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-400">Pay Period Start Date (reference)</Label>
              <Input type="date" value={form.payPeriodStartDate}
                onChange={e => setField('payPeriodStartDate', e.target.value)}
                className="bg-slate-900 border-slate-600 text-slate-100 mt-1" />
              <p className="text-xs text-slate-500 mt-1">Set this to a known period start date. The app uses it to calculate all past and future periods.</p>
            </div>
          </CardContent>
        </Card>

        {/* OpenAI API Key */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs text-slate-400 uppercase tracking-wide">AI Extraction (OpenAI)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <p className="text-xs text-slate-400">Your own OpenAI API key is used to extract RO data from photos. It&apos;s stored only on this device and sent directly to OpenAI — never to any other server.</p>
            <div>
              <Label className="text-xs text-slate-400">OpenAI API Key</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={form.openaiApiKey}
                    onChange={e => setField('openaiApiKey', e.target.value)}
                    placeholder="sk-..."
                    className="bg-slate-900 border-slate-600 text-slate-100 font-mono pr-10"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 shrink-0"
                  onClick={handleTestKey}
                  disabled={!form.openaiApiKey || testing}
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                </Button>
              </div>
            </div>

            {testResult && (
              <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${testResult.ok ? 'bg-emerald-900/20 border border-emerald-800/40 text-emerald-400' : 'bg-red-900/20 border border-red-800/40 text-red-400'}`}>
                {testResult.ok ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {testResult.msg}
              </div>
            )}

            <div className="bg-slate-900/60 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-slate-300">How to get a key:</p>
              <p className="text-xs text-slate-500">1. Go to platform.openai.com</p>
              <p className="text-xs text-slate-500">2. API Keys → Create new secret key</p>
              <p className="text-xs text-slate-500">3. Paste it above</p>
              <p className="text-xs text-slate-500">4. Cost: ~$0.01–0.05 per photo extraction</p>
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <Button
          className={`w-full h-12 font-semibold transition-colors ${saved ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500'} text-white`}
          onClick={handleSave}
        >
          {saved ? <><Check className="w-4 h-4 mr-2" /> Saved!</> : 'Save Settings'}
        </Button>

        {/* Data management */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-slate-400 uppercase tracking-wide">Data Management</CardTitle></CardHeader>
          <CardContent className="pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300 font-medium">Stored ROs</p>
                <p className="text-xs text-slate-500 mt-0.5">Saved on this device only</p>
              </div>
              <span className="font-mono text-lg font-bold text-blue-400">{roCount}</span>
            </div>
            <Separator className="bg-slate-700/50" />
            <Button
              variant="ghost"
              className={`w-full h-10 font-medium transition-colors ${confirmClear ? 'text-red-400 bg-red-900/20 border border-red-800/50 hover:bg-red-900/30' : 'text-slate-500 hover:text-red-400'}`}
              onClick={handleClearAll}
            >
              {confirmClear ? 'Confirm — delete all RO data?' : 'Clear All RO Data'}
            </Button>
            {confirmClear && (
              <div className="flex gap-2">
                <p className="text-xs text-red-400/70 flex-1">This will permanently delete all {roCount} logged ROs from this device.</p>
                <button onClick={() => setConfirmClear(false)} className="text-xs text-slate-400 hover:text-slate-200 shrink-0">Cancel</button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* App info */}
        <div className="text-center pb-2">
          <p className="text-xs text-slate-600 font-medium">RO Audit v1.0</p>
          <p className="text-xs text-slate-700 mt-0.5">All data stored locally · No account required</p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
