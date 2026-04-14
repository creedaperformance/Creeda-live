import { mobileEnv } from './env'

export type AppRole = 'athlete' | 'coach' | 'individual'

export interface MobileProfile {
  id: string
  role: AppRole
  fullName: string
  username: string | null
  avatarUrl: string | null
  primarySport: string | null
  position: string | null
  onboardingCompleted: boolean
}

export interface MobileUserEnvelope {
  id: string
  email: string | null
  profile: MobileProfile
  homeRoute: string
  onboardingRoute: string
}

export interface AthleteMobileDashboard {
  type: 'athlete'
  readinessScore: number | null
  decision: string | null
  primaryReason: string
  actionInstruction: string
  riskScore: number | null
  objective: {
    summary: string
    headline: string | null
    trustStatus: string
    freshness: string
  }
  health: {
    connected: boolean
    available: boolean
    source: 'apple' | 'android' | 'mixed' | 'none'
    lastSyncAt: string | null
    lastSyncStatus: string | null
    lastError: string | null
    latestMetricDate: string | null
    latestSteps: number | null
    avgSleepHours: number | null
    avgHeartRate: number | null
    avgHrv: number | null
    sampleDays: number
  }
  context: {
    summary: string
    nextAction: string
    loadLabel: string
  } | null
  nutrition: {
    statusLabel: string
    gateTitle: string
    summary: string
    nextAction: string
    blocksDetailedAdvice: boolean
  }
  latestVideoReport: {
    status: 'available'
  } | null
}

export interface CoachMobileDashboard {
  type: 'coach'
  periodLabel: string
  athleteCount: number
  teamCount: number
  averageReadiness: number
  readinessDelta: number
  squadCompliancePct: number
  activeInterventions: number
  lowDataCount: number
  resolvedThisWeek: number
  objectiveCoveragePct: number
  objectiveDecliningCount: number
  bottleneck: string
  biggestWin: string
  highestRiskCluster: string
  nextWeekFocus: string
  topPriorityAthletes: Array<{
    athleteId: string
    athleteName: string
    teamName: string
    queueType: string
    priority: string
    reasons: string[]
    recommendation: string
    updatedAt: string | null
  }>
  groupSuggestions: Array<{
    title: string
    detail: string
    priority: string
  }>
  teamSummaries: Array<{
    teamId: string
    teamName: string
    athleteCount: number
    averageReadiness: number
    compliancePct: number
    interventionCount: number
    lowDataCount: number
    highRiskCount: number
    objectiveCoveragePct: number
    consistencyScore: number | null
    reliabilityScore: number | null
  }>
}

export interface IndividualMobileDashboard {
  type: 'individual'
  readinessScore: number
  sport: string
  primaryGoal: string
  directionLabel: string
  directionSummary: string
  explanation: string
  today: {
    todayFocus: string
    intensity: 'low' | 'moderate' | 'high'
    sessionDurationMinutes: number
    whatToDo: string[]
    recoveryActions: string[]
    adaptationNote: string
  } | null
  pathway: {
    title: string
    mappedSport: string
    type: string
    rationale: string
  } | null
  health: {
    usedInDecision: boolean
    influencePct: number
    latestMetricDate: string | null
    connectedMetricDays: number
    summary: AthleteMobileDashboard['health']
  }
  objective: {
    summary: string
    headline: string | null
    freshness: string
  }
  context: {
    summary: string
    nextAction: string
    loadLabel: string
  } | null
  nutrition: {
    statusLabel: string
    gateTitle: string
    summary: string
    nextAction: string
    blocksDetailedAdvice: boolean
  }
}

export type MobileDashboard =
  | AthleteMobileDashboard
  | CoachMobileDashboard
  | IndividualMobileDashboard

export interface MobileMeResponse {
  success: true
  user: MobileUserEnvelope
}

export interface MobileDashboardResponse {
  success: true
  user: MobileUserEnvelope
  dashboard: MobileDashboard
}

export interface HealthConnectionState {
  user_id: string
  apple_connected?: boolean
  android_connected?: boolean
  connection_preference?: 'connect_now' | 'later'
  permission_state?: Record<string, unknown>
  last_sync_status?: 'never' | 'success' | 'failed'
  last_sync_at?: string | null
  last_error?: string | null
  updated_at?: string
}

export interface HealthConnectionResponse {
  success: true
  user_id: string
  connection: HealthConnectionState | null
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback

  const record = payload as Record<string, unknown>
  if (typeof record.details === 'string' && record.details) return record.details
  if (typeof record.error === 'string' && record.error) return record.error
  return fallback
}

async function apiFetch<T>(path: string, accessToken: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {})
  headers.set('Authorization', `Bearer ${accessToken}`)
  headers.set('Accept', 'application/json')

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${mobileEnv.apiBaseUrl}${path}`, {
    ...init,
    headers,
  })

  const payload = (await response.json().catch(() => null)) as T | null
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `Request failed with status ${response.status}.`))
  }

  if (!payload) {
    throw new Error('Server returned an empty response.')
  }

  return payload
}

export function fetchMobileMe(accessToken: string) {
  return apiFetch<MobileMeResponse>('/api/mobile/me', accessToken)
}

export function fetchMobileDashboard(accessToken: string) {
  return apiFetch<MobileDashboardResponse>('/api/mobile/dashboard', accessToken)
}

export function fetchHealthConnection(accessToken: string) {
  return apiFetch<HealthConnectionResponse>('/api/v1/health/connection', accessToken)
}

export function updateHealthConnection(
  accessToken: string,
  payload: {
    source?: 'apple' | 'android'
    connected?: boolean
    connection_preference?: 'connect_now' | 'later'
    permission_state?: Record<string, unknown>
    status?: 'never' | 'success' | 'failed'
    error?: string
  }
) {
  return apiFetch<HealthConnectionResponse>('/api/v1/health/connection', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function syncHealthMetrics(
  accessToken: string,
  payload: {
    data: Array<{
      date: string
      steps: number
      sleep_hours: number
      heart_rate_avg: number
      hrv: number
      source: 'apple' | 'android'
    }>
  }
) {
  return apiFetch<{ success: true; synced_rows: number; user_id: string }>(
    '/api/v1/health/sync',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
}

