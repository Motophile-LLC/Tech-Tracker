import { PayType } from '@/types'
import { cn } from '@/lib/utils'

const CONFIG: Record<PayType, { label: string; short: string; className: string }> = {
  CP: { label: 'Customer Pay', short: 'CP', className: 'bg-emerald-900/40 text-emerald-400 border-emerald-800/60' },
  WR: { label: 'Warranty',     short: 'WR', className: 'bg-blue-900/40 text-blue-400 border-blue-800/60' },
  INT: { label: 'Internal',    short: 'INT', className: 'bg-amber-900/40 text-amber-400 border-amber-800/60' },
  FLT: { label: 'Fleet',       short: 'FLT', className: 'bg-purple-900/40 text-purple-400 border-purple-800/60' },
}

interface Props {
  payType: PayType
  short?: boolean
  className?: string
}

export function PayTypeBadge({ payType, short = false, className }: Props) {
  const cfg = CONFIG[payType] ?? CONFIG.CP
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold border', cfg.className, className)}>
      {short ? cfg.short : cfg.label}
    </span>
  )
}
