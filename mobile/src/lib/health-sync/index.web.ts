import type { HealthSupportStatus, PreparedHealthSyncResult } from './types'

export async function getHealthSupportStatus(): Promise<HealthSupportStatus> {
  return {
    supported: false,
    source: 'unsupported',
    platformLabel: 'Web',
    reason: 'Health sync is only available in the native iOS and Android builds.',
  }
}

export async function prepareHealthSync(_days = 7): Promise<PreparedHealthSyncResult> {
  throw new Error('Health sync is only available in the native iOS and Android builds.')
}
