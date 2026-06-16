export type PayType = 'CP' | 'WR' | 'INT' | 'FLT'
export type PayPeriodType = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'

export interface LaborLine {
  id: string
  opCode: string
  description: string
  flatRateHours: number
  payType: PayType
}

export interface ROEvent {
  id: string
  concern: string
  cause: string
  correction: string
  laborLines: LaborLine[]
}

export interface RepairOrder {
  id: string
  roNumber: string
  vehicleInfo: string
  customer: string
  serviceAdvisor…(truncated)