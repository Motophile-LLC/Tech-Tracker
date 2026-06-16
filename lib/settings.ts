import { AppSettings } from '@/types'

const SETTINGS_KEY = 'ro_audit_settings_v1'

export const DEFAULT_SETTINGS: AppSettings = {
  techName: '',
  shopName: '',
  employeeNumber: '',
  hourlyRate: 0,
  payPeriodType: 'biweekly',
  payPeriodStartDate: new Date().toISOString().split('T')[0],
  openaiApiKey: '',
}

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (!stored) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
