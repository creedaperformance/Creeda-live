import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { normalizeVideoAnalysisReport, type VideoAnalysisReportSummary } from '@/lib/video-analysis/reporting'

type SupabaseLike = SupabaseClient

type ProfileSummary = {
  full_name?: string | null
  avatar_url?: string | null
}

type TeamMemberReportRow = {
  athlete_id: string | null
  profiles?: ProfileSummary | ProfileSummary[] | null
}

function normalizeProfileSummary(value: TeamMemberReportRow['profiles']) {
  const profile = Array.isArray(value) ? value[0] : value
  return {
    athleteName: String(profile?.full_name || 'Athlete'),
    athleteAvatarUrl: profile?.avatar_url ? String(profile.avatar_url) : null,
  }
}

export async function getUserVideoReports(
  supabase: SupabaseLike,
  userId: string,
  limit = 3
): Promise<VideoAnalysisReportSummary[]> {
  const { data, error } = await supabase
    .from('video_analysis_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[video-analysis] failed to load user reports', error)
    return []
  }

  return (Array.isArray(data) ? data : [])
    .map(normalizeVideoAnalysisReport)
    .filter((report): report is VideoAnalysisReportSummary => Boolean(report))
}

export async function getLatestUserVideoReport(
  supabase: SupabaseLike,
  userId: string
): Promise<VideoAnalysisReportSummary | null> {
  const reports = await getUserVideoReports(supabase, userId, 1)
  return reports[0] || null
}

export async function getCoachVideoReports(
  supabase: SupabaseLike,
  coachId: string,
  limit = 24
): Promise<Array<VideoAnalysisReportSummary & { athleteName: string; athleteAvatarUrl: string | null }>> {
  const { data: memberships, error: membershipError } = await supabase
    .from('team_members')
    .select(
      `
        athlete_id,
        status,
        teams!inner(coach_id),
        profiles:athlete_id(full_name, avatar_url)
      `
    )
    .eq('teams.coach_id', coachId)
    .eq('status', 'Active')

  if (membershipError) {
    console.warn('[video-analysis] failed to load coach roster for reports', membershipError)
    return []
  }

  const athleteRows = (Array.isArray(memberships) ? memberships : []) as TeamMemberReportRow[]
  const athleteIds = athleteRows.map((row) => String(row.athlete_id || '')).filter(Boolean)
  if (!athleteIds.length) return []

  const { data: reportRows, error: reportsError } = await supabase
    .from('video_analysis_reports')
    .select('*')
    .in('user_id', athleteIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (reportsError) {
    console.warn('[video-analysis] failed to load coach report feed', reportsError)
    return []
  }

  const athleteMap = new Map(
    athleteRows.map((row) => [
      String(row.athlete_id || ''),
      normalizeProfileSummary(row.profiles),
    ])
  )

  return (Array.isArray(reportRows) ? reportRows : [])
    .map(normalizeVideoAnalysisReport)
    .filter((report): report is VideoAnalysisReportSummary => Boolean(report))
    .filter((report) => athleteMap.has(report.userId))
    .map((report) => ({
      ...report,
      ...athleteMap.get(report.userId)!,
    }))
}

export async function getCoachVideoReportById(
  supabase: SupabaseLike,
  coachId: string,
  reportId: string
): Promise<(VideoAnalysisReportSummary & { athleteName: string; athleteAvatarUrl: string | null }) | null> {
  const { data: rawReport, error: reportError } = await supabase
    .from('video_analysis_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle()

  if (reportError || !rawReport?.user_id) {
    if (reportError) console.warn('[video-analysis] failed to load coach report by id', reportError)
    return null
  }

  const { data: membership, error: membershipError } = await supabase
    .from('team_members')
    .select(
      `
        athlete_id,
        status,
        teams!inner(coach_id),
        profiles:athlete_id(full_name, avatar_url)
      `
    )
    .eq('teams.coach_id', coachId)
    .eq('athlete_id', rawReport.user_id)
    .eq('status', 'Active')
    .maybeSingle()

  if (membershipError || !membership) {
    if (membershipError) console.warn('[video-analysis] failed to validate coach report access', membershipError)
    return null
  }

  const report = normalizeVideoAnalysisReport(rawReport)
  if (!report) return null

  const member = membership as TeamMemberReportRow

  return {
    ...report,
    ...normalizeProfileSummary(member.profiles),
  }
}
