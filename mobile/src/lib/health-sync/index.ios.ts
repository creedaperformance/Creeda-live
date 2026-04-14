import {
  CategoryValueSleepAnalysis,
  isHealthDataAvailable,
  queryCategorySamples,
  queryQuantitySamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit'

import { createDateRange, ensureAccumulator, finalizeMetrics, getLocalDateKey } from './helpers'
import type { HealthSupportStatus, PreparedHealthSyncResult } from './types'

const IOS_READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKCategoryTypeIdentifierSleepAnalysis',
] as const

const ASLEEP_VALUES = new Set<number>([
  CategoryValueSleepAnalysis.asleep,
  CategoryValueSleepAnalysis.asleepUnspecified,
  CategoryValueSleepAnalysis.asleepCore,
  CategoryValueSleepAnalysis.asleepDeep,
  CategoryValueSleepAnalysis.asleepREM,
])

export async function getHealthSupportStatus(): Promise<HealthSupportStatus> {
  return {
    supported: Boolean(isHealthDataAvailable()),
    source: 'apple',
    platformLabel: 'Apple Health',
    reason: isHealthDataAvailable()
      ? undefined
      : 'Apple Health is unavailable in this runtime. Use a custom Expo dev client or a production build to access HealthKit.',
  }
}

export async function prepareHealthSync(days = 7): Promise<PreparedHealthSyncResult> {
  if (!isHealthDataAvailable()) {
    throw new Error('Apple Health is unavailable in this runtime. Build a custom Expo dev client or production app to enable HealthKit.')
  }

  const granted = await requestAuthorization({ toRead: IOS_READ_TYPES })
  if (!granted) {
    throw new Error('Apple Health permissions were not granted.')
  }

  const { start, end } = createDateRange(days)
  const [stepSamples, heartRateSamples, hrvSamples, sleepSamples] = await Promise.all([
    queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
      limit: -1,
      unit: 'count',
      ascending: true,
      filter: {
        date: {
          startDate: start,
          endDate: end,
        },
      },
    }),
    queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', {
      limit: -1,
      unit: 'count/min',
      ascending: true,
      filter: {
        date: {
          startDate: start,
          endDate: end,
        },
      },
    }),
    queryQuantitySamples('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', {
      limit: -1,
      unit: 'ms',
      ascending: true,
      filter: {
        date: {
          startDate: start,
          endDate: end,
        },
      },
    }),
    queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: -1,
      ascending: true,
      filter: {
        date: {
          startDate: start,
          endDate: end,
        },
      },
    }),
  ])

  const dailyMetrics = new Map()

  stepSamples.forEach((sample) => {
    const key = getLocalDateKey(sample.startDate)
    const bucket = ensureAccumulator(dailyMetrics, key)
    bucket.steps += sample.quantity
  })

  heartRateSamples.forEach((sample) => {
    const key = getLocalDateKey(sample.startDate)
    const bucket = ensureAccumulator(dailyMetrics, key)
    bucket.heartRateValues.push(sample.quantity)
  })

  hrvSamples.forEach((sample) => {
    const key = getLocalDateKey(sample.startDate)
    const bucket = ensureAccumulator(dailyMetrics, key)
    bucket.hrvValues.push(sample.quantity)
  })

  sleepSamples.forEach((sample) => {
    if (!ASLEEP_VALUES.has(Number(sample.value))) return

    const key = getLocalDateKey(sample.startDate)
    const bucket = ensureAccumulator(dailyMetrics, key)
    const durationHours =
      (new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime()) / (1000 * 60 * 60)

    bucket.sleepHours += Math.max(durationHours, 0)
  })

  return {
    source: 'apple',
    data: finalizeMetrics(dailyMetrics, 'apple'),
    permissionState: {
      granted: true,
      source: 'apple',
      types: [...IOS_READ_TYPES],
    },
  }
}

