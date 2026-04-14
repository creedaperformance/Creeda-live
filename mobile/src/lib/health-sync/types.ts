export type MobileHealthSource = 'apple' | 'android'

export interface HealthSyncMetric {
  date: string
  steps: number
  sleep_hours: number
  heart_rate_avg: number
  hrv: number
  source: MobileHealthSource
}

export interface HealthSupportStatus {
  supported: boolean
  source: MobileHealthSource | 'unsupported'
  platformLabel: string
  reason?: string
}

export interface PreparedHealthSyncResult {
  source: MobileHealthSource
  data: HealthSyncMetric[]
  permissionState: Record<string, unknown>
}

