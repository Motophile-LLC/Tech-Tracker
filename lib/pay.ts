import { RepairOrder, PayPeriodType, SummaryLineItem, ComparisonResult } from '@/types'
import {
  addDays, parseISO, isWithinInterval,
  startOfDay, endOfDay, format,
  startOfMonth, getDate
} from 'date-fns'

export interface PayPeriodRange {
  start: Date
  end: Date
  label: string
}

export function getCurrentPayPeriod(
  type: PayPeriodType,
  referenceStart: string,
  targetDate: Date = new Date()
): PayPeriodRange {
  const today = startOfDay(targetDate)

  if (type === 'weekly') {
    let start = startOfDay(parseISO(referenceStart))
    while (start > today) start = addDays(start, -7)
    while (addDays(start, 7) <= today) start = addDays(start, 7)
    const end = addDays(start, 6)
    return { start, end, label: `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}` }
  }

  if (type === 'biweekly') {
    let start = startOfDay(parseISO(referenceStart))
    while (start > today) start = addDays(start, -14)
    while (addDays(start, 14) <= today) start = addDays(start, 14)
    const end = addDays(start, 13)
    return { start, end, label: `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}` }
  }

  if (type === 'semimonthly') {
    const day = getDate(today)
    if (day <= 15) {
      const start = startOfMonth(today)
      const end = new Date(today.getFullYear(), today.getMonth(), 15)
      return { start, end, label: `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}` }
    } else {
      const start = new Date(today.getFullYear(), today.getMonth(), 16)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start, end, label: `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}` }
    }
  }

  // Monthly
  const start = startOfMonth(today)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return { start, end, label: format(start, 'MMMM yyyy') }
}

export function getROsInPeriod(ros: RepairOrder[], start: Date, end: Date): RepairOrder[] {
  return ros.filter(ro => {
    try {
      const d = parseISO(ro.date)
      return isWithinInterval(d, { start: startOfDay(start), end: endOfDay(end) })
    } catch { return false }
  })
}

export function getTotalHours(ros: RepairOrder[]): number {
  return ros.reduce((t, ro) =>
    t + ro.events.reduce((et, ev) =>
      et + ev.laborLines.reduce((lt, ll) => lt + (ll.flatRateHours || 0), 0), 0), 0)
}

export function getHoursByPayType(ros: RepairOrder[]): Record<string, number> {
  const result: Record<string, number> = { CP: 0, WR: 0, INT: 0, FLT: 0 }
  ros.forEach(ro => ro.events.forEach(ev => ev.laborLines.forEach(ll => {
    const pt = ll.payType || 'CP'
    result[pt] = (result[pt] || 0) + (ll.flatRateHours || 0)
  })))
  return result
}

/** Build a map of roNumber → totalLoggedHours from the RO database */
export function buildLoggedHoursMap(ros: RepairOrder[]): Record<string, number> {
  const map: Record<string, number> = {}
  ros.forEach(ro => {
    if (!ro.roNumber) return
    const hours = ro.events.reduce((et, ev) =>
      et + ev.laborLines.reduce((lt, ll) => lt + (ll.flatRateHours || 0), 0), 0)
    map[ro.roNumber] = (map[ro.roNumber] || 0) + hours
  })
  return map
}

/** Build a map of roNumber → totalSummaryHours from the pay stub extraction */
export function buildSummaryHoursMap(lines: SummaryLineItem[]): Record<string, number> {
  const map: Record<string, number> = {}
  lines.forEach(line => {
    if (!line.roNumber) return
    map[line.roNumber] = (map[line.roNumber] || 0) + (line.hours || 0)
  })
  return map
}

export function compareHoursMaps(
  loggedMap: Record<string, number>,
  summaryMap: Record<string, number>
): ComparisonResult[] {
  const allROs = new Set([...Object.keys(loggedMap), ...Object.keys(summaryMap)])
  const results: ComparisonResult[] = []

  allROs.forEach(roNum => {
    const logged = loggedMap[roNum] || 0
    const summary = summaryMap[roNum] || 0
    const discrepancy = parseFloat((logged - summary).toFixed(2))
    let status: ComparisonResult['status'] = 'match'

    if (!loggedMap[roNum]) status = 'missing_log'
    else if (!summaryMap[roNum]) status = 'missing_summary'
    else if (Math.abs(discrepancy) <= 0.05) status = 'match'
    else if (discrepancy < 0) status = 'under'
    else status = 'over'

    results.push({ roNumber: roNum, loggedHours: logged, summaryHours: summary, discrepancy, status })
  })

  // Sort: problems first
  const order = { missing_log: 0, under: 1, over: 2, missing_summary: 3, match: 4 }
  return results.sort((a, b) => order[a.status] - order[b.status])
}
