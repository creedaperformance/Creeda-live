import {
  SdkAvailabilityStatus,
  SleepStageType,
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
} from 'react-native-health-connect'
import type { Permission, ReadRecordsResult, RecordType } from 'react-native-health-connect'

import { createDateRange, ensureAccumulator, finalizeMetrics, getLocalDateKey } from './helpers'
import type { HealthSupportStatus, PreparedHealthSyncResult } from './types'

const ANDROID_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
]

async function readAllRecords<T extends RecordType>(
  recordType: T,
  startTime: string,
  endTime: string
): Promise<ReadRecordsResult<T>['records']> {
  const records: ReadRecordsResult<T>['records'] = []
  let pageToken: string | undefined

  do {
    const response = await readRecords(recordType, {
      timeRangeFilter: {
        operator: 'between',
        startTime,
        endTime,
      },
      pageSize: 1000,
      pageToken,
      ascendingOrder: true,
    })

    records.push(...response.records)
    pageToken = response.pageToken
  } while (pageToken)

  return records
}

function getSdkReason(status: number) {
  if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
    return 'Health Connect needs to be installed or updated on this Android device before CREEDA can sync.'
  }

  if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
    return 'Health Connect is unavailable on this Android device.'
  }

  return undefined
}

export async function getHealthSupportStatus(): Promise<HealthSupportStatus> {
  const status = await getSdkStatus()

  return {
    supported: status === SdkAvailabilityStatus.SDK_AVAILABLE,
    source: 'android',
    platformLabel: 'Health Connect',
    reason: getSdkReason(status),
  }
}

export async function prepareHealthSync(days = 7): Promise<PreparedHealthSyncResult> {
  const status = await getSdkStatus()
  if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
    throw new Error(getSdkReason(status) || 'Health Connect is unavailable.')
  }

  const initialized = await initialize()
  if (!initialized) {
    throw new Error('Health Connect could not be initialized.')
  }

  const grantedPermissions = await requestPermission(ANDROID_PERMISSIONS)
  if (!grantedPermissions.length) {
    throw new Error('Health Connect permissions were not granted.')
  }

  const { start, end } = createDateRange(days)
  const startTime = start.toISOString()
  const endTime = end.toISOString()

  const [stepRecords, sleepRecords, heartRateRecords, hrvRecords] = await Promise.all([
    readAllRecords('Steps', startTime, endTime),
    readAllRecords('SleepSession', startTime, endTime),
    readAllRecords('HeartRate', startTime, endTime),
    readAllRecords('HeartRateVariabilityRmssd', startTime, endTime),
  ])

  const dailyMetrics = new Map()

  stepRecords.forEach((record) => {
    const key = getLocalDateKey(record.startTime)
    const bucket = ensureAccumulator(dailyMetrics, key)
    bucket.steps += record.count
  })

  sleepRecords.forEach((record) => {
    const key = getLocalDateKey(record.startTime)
    const bucket = ensureAccumulator(dailyMetrics, key)

    if (record.stages?.length) {
      record.stages.forEach((stage) => {
        if (
          stage.stage === SleepStageType.SLEEPING ||
          stage.stage === SleepStageType.LIGHT ||
          stage.stage === SleepStageType.DEEP ||
          stage.stage === SleepStageType.REM
        ) {
          bucket.sleepHours +=
            (new Date(stage.endTime).getTime() - new Date(stage.startTime).getTime()) /
            (1000 * 60 * 60)
        }
      })
      return
    }

    bucket.sleepHours +=
      (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) /
      (1000 * 60 * 60)
  })

  heartRateRecords.forEach((record) => {
    const key = getLocalDateKey(record.startTime)
    const bucket = ensureAccumulator(dailyMetrics, key)
    record.samples.forEach((sample) => {
      bucket.heartRateValues.push(sample.beatsPerMinute)
    })
  })

  hrvRecords.forEach((record) => {
    const key = getLocalDateKey(record.time)
    const bucket = ensureAccumulator(dailyMetrics, key)
    bucket.hrvValues.push(record.heartRateVariabilityMillis)
  })

  return {
    source: 'android',
    data: finalizeMetrics(dailyMetrics, 'android'),
    permissionState: {
      granted: true,
      source: 'android',
      permissions: grantedPermissions,
    },
  }
}

