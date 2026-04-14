import { Platform } from 'react-native'

import type { HealthSupportStatus, PreparedHealthSyncResult } from './types'

type HealthSyncModule = {
  getHealthSupportStatus: () => Promise<HealthSupportStatus>
  prepareHealthSync: (days?: number) => Promise<PreparedHealthSyncResult>
}

const healthSyncModule = Platform.select<HealthSyncModule>({
  ios: require('./index.ios'),
  android: require('./index.android'),
  default: require('./index.web'),
}) as HealthSyncModule

export const getHealthSupportStatus = healthSyncModule.getHealthSupportStatus
export const prepareHealthSync = healthSyncModule.prepareHealthSync

export type { HealthSupportStatus, PreparedHealthSyncResult } from './types'
