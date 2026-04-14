import type { HealthSyncMetric, MobileHealthSource } from './types'

type DayAccumulator = {
  steps: number
  sleepHours: number
  heartRateValues: number[]
  hrvValues: number[]
}

function roundToTwo(value: number) {
  return Number(value.toFixed(2))
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function createDateRange(days: number) {
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  const start = new Date(end)
  start.setDate(end.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)

  return { start, end }
}

export function getLocalDateKey(input: Date | string) {
  const value = new Date(input)
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function ensureAccumulator(
  map: Map<string, DayAccumulator>,
  key: string
) {
  const existing = map.get(key)
  if (existing) return existing

  const created: DayAccumulator = {
    steps: 0,
    sleepHours: 0,
    heartRateValues: [],
    hrvValues: [],
  }

  map.set(key, created)
  return created
}

export function finalizeMetrics(
  map: Map<string, DayAccumulator>,
  source: MobileHealthSource
): HealthSyncMetric[] {
  return [...map.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, values]) => ({
      date,
      steps: Math.round(values.steps),
      sleep_hours: roundToTwo(values.sleepHours),
      heart_rate_avg: roundToTwo(average(values.heartRateValues)),
      hrv: roundToTwo(average(values.hrvValues)),
      source,
    }))
}

