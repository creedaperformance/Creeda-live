import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  CalendarRange,
  ClipboardCheck,
  Flame,
  ShieldCheck,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react'

import { DashboardLayout } from '@/components/DashboardLayout'
import { IdentityMetricGrid } from '@/components/review/IdentityMetricGrid'
import { getAthleteWeeklyReviewSnapshot } from '@/lib/dashboard_decisions'
import { getRoleHomeRoute, getRoleOnboardingRoute, isAppRole } from '@/lib/auth_utils'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AthleteReviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.onboarding_completed === false) {
    redirect(getRoleOnboardingRoute('athlete'))
  }

  if (isAppRole(profile.role) && profile.role !== 'athlete') {
    redirect(getRoleHomeRoute(profile.role))
  }

  const review = await getAthleteWeeklyReviewSnapshot(supabase, user.id)

  const streakIntensity = Math.min(1, (review.adherencePct || 0) / 100)

  return (
    <DashboardLayout type="athlete" user={user}>
      <div className="space-y-8 pb-20">
        {/* ── Hero Section ── */}
        <section className="relative overflow-hidden rounded-[2.25rem] border border-white/[0.06] bg-[#111118] p-8 sm:p-10">
          {/* Neon aura blobs */}
          <div className="absolute top-[-30%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[#0055FF] blur-[120px] opacity-[0.06] pointer-events-none" />
          <div className="absolute bottom-[-30%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[#FF5F1F] blur-[120px] opacity-[0.06] pointer-events-none" />

          {/* Devanagari watermark */}
          <div className="absolute top-4 right-6 text-8xl font-black text-white/[0.015] select-none pointer-events-none font-hindi">
            समीक्षा
          </div>

          {/* Streak Flame */}
          <div className="absolute top-6 right-6 z-10">
            <div
              className="relative w-10 h-14 flex items-end justify-center"
              title={`Streak: ${review.adherencePct}%`}
            >
              <div
                className="absolute inset-0 rounded-full blur-xl pointer-events-none"
                style={{
                  background: `radial-gradient(circle, rgba(255,95,31,${0.2 + streakIntensity * 0.5}) 0%, transparent 70%)`,
                }}
              />
              <div
                className="relative w-8 h-11 rounded-t-full"
                style={{
                  background: `linear-gradient(to top, #FF5F1F ${Math.round(streakIntensity * 40)}%, #FF8C5A ${Math.round(40 + streakIntensity * 30)}%, #FCD34D 100%)`,
                  filter: `drop-shadow(0 0 ${10 + streakIntensity * 20}px rgba(255,95,31,${0.3 + streakIntensity * 0.4}))`,
                  clipPath: 'ellipse(50% 60% at 50% 60%)',
                  animation: 'streak-burn 1.5s ease-in-out infinite',
                }}
              />
              <Flame className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 text-white/60" />
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--chakra-neon)]">Weekly Review</p>
              <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight text-white">
                What this week did to your readiness
              </h1>
              <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-white/50">
                {review.periodLabel}. {review.biggestWin} {review.bottleneck}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <BadgeChip icon={Target} text={review.decision?.decision || 'Review'} />
                <BadgeChip icon={ShieldCheck} text={review.trustSummary ? `${review.trustSummary.confidenceLevel} confidence` : 'Confidence building'} />
                <BadgeChip icon={BarChart3} text={`${review.readinessDelta >= 0 ? '+' : ''}${review.readinessDelta} readiness`} />
                <BadgeChip icon={Brain} text={`${review.contextSummary?.loadLabel || 'Low'} context`} />
                <BadgeChip
                  icon={Timer}
                  text={review.objectiveTest?.latestValidatedScoreMs ? `${review.objectiveTest.latestValidatedScoreMs}ms objective` : 'Objective test optional'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:min-w-[340px]">
              <MetricCard label="Average readiness" value={`${review.averageReadiness}`} />
              <MetricCard label="Adherence" value={`${review.adherencePct}%`} />
              <MetricCard label="Training load" value={`${review.loadMinutes} min`} />
              <MetricCard label="Training days" value={`${review.trainingDays}`} />
            </div>
          </div>
        </section>

        {/* ── Trend + Insights ── */}
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SurfaceCard>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--saffron)]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">Readiness trend</p>
            </div>
            <div className="mt-6 grid grid-cols-7 gap-3">
              {review.trend.map((entry) => (
                <div key={entry.date} className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-3 text-center group hover:bg-white/[0.04] transition-all">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">{entry.label}</p>
                  <div className="mt-4 flex h-32 items-end justify-center">
                    <div className="flex w-full items-end justify-center rounded-full bg-white/[0.04] px-2 py-2">
                      <div
                        className="w-full rounded-full bg-gradient-to-t from-[#FF5F1F] to-[#00E5FF] group-hover:shadow-[0_0_12px_var(--saffron-glow)] transition-shadow"
                        style={{ height: `${Math.max(12, Math.round(entry.readinessScore))}%` }}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-lg font-black tracking-tight text-white">{entry.readinessScore}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
                    {entry.loadMinutes || 0} min
                  </p>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <div className="grid gap-4">
            <InsightCard
              icon={Activity}
              eyebrow="Bottleneck"
              title="What held the week back"
              body={review.bottleneck}
            />
            <InsightCard
              icon={ShieldCheck}
              eyebrow="Win"
              title="What actually moved forward"
              body={review.biggestWin}
            />
            <InsightCard
              icon={ArrowRight}
              eyebrow="Next week"
              title="What to focus on next"
              body={review.nextWeekFocus}
            />
            <InsightCard
              icon={Timer}
              eyebrow="Objective"
              title={review.objectiveTest?.classification || 'Measured signal'}
              body={review.objectiveTest?.summary || 'Objective testing is optional. Add a reaction test only if you want CREEDA to compare subjective readiness with one measured phone-based signal.'}
            />
          </div>
        </section>

        {/* ── Identity ── */}
        <SurfaceCard>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-[var(--chakra-neon)]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">Identity this week</p>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            The deeper patterns your week is building
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/40">
            Readiness shows today. These identity metrics show what your habits, recovery, and training rhythm are turning you into over time.
          </p>
          <div className="mt-6">
            <IdentityMetricGrid metrics={review.identityMetrics} />
          </div>
        </SurfaceCard>

        {/* ── Trust + Close the loop ── */}
        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <SurfaceCard>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--saffron)]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">Trust this week</p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard
                label="Confidence"
                value={review.trustSummary ? `${review.trustSummary.confidenceLevel} ${review.trustSummary.confidenceScore}` : 'N/A'}
              />
              <MetricCard
                label="Data quality"
                value={review.trustSummary?.dataQuality || 'WEAK'}
              />
              <MetricCard
                label="Completeness"
                value={review.trustSummary ? `${review.trustSummary.dataCompleteness}%` : '0%'}
              />
              <MetricCard
                label="Objective"
                value={review.objectiveTest?.latestValidatedScoreMs ? `${review.objectiveTest.latestValidatedScoreMs}ms` : 'Not recent'}
              />
            </div>

            <div className="mt-6 space-y-3">
              {(review.trustSummary?.nextBestInputs || ['Keep logging daily inputs so next week\u0027s decision has stronger signal quality.']).slice(0, 3).map((item) => (
                <p key={item} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm leading-relaxed text-white/50">
                  {item}
                </p>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-[var(--chakra-neon)]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">Close the loop</p>
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
              Turn this review into a better next week
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/40">
              Reviews only matter if they change the next decision. Use this summary to tighten recovery, improve logging quality, and make the next training call more believable.
            </p>

            <div className="mt-6 rounded-[1.6rem] border border-white/[0.06] bg-white/[0.03] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">Objective signal</p>
              <p className="mt-3 text-xl font-bold text-white">
                {review.objectiveTest?.latestValidatedScoreMs ? `${review.objectiveTest.latestValidatedScoreMs}ms` : 'No recent test'}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/40">
                {review.objectiveTest?.summary || 'Objective testing is optional. Add one saved reaction session only if you want CREEDA to compare measured sharpness against your weekly readiness story.'}
              </p>
            </div>

            <div className="mt-6 rounded-[1.6rem] border border-white/[0.06] bg-white/[0.03] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">India-context signal</p>
              <p className="mt-3 text-xl font-bold text-white">{review.contextSummary?.loadLabel || 'Low'} load</p>
              <p className="mt-3 text-sm leading-relaxed text-white/40">
                {review.contextSummary?.summary || 'Optional context like heat, commute, fasting, or air quality was not a major part of this week\u0027s story.'}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Link
                href="/athlete/checkin"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--saffron)] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black hover:brightness-110 transition-all shadow-[0_0_20px_var(--saffron-glow)]"
              >
                <ClipboardCheck className="h-4 w-4" />
                Daily Check-In
              </Link>
              <Link
                href="/athlete/tests"
                className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--chakra-neon)]/20 bg-[var(--chakra-neon)]/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--chakra-neon)] hover:bg-[var(--chakra-neon)]/15 transition-all"
              >
                <Timer className="h-4 w-4" />
                Objective Test
              </Link>
              <Link
                href="/athlete/dashboard"
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/50 hover:bg-white/[0.05] transition-all"
              >
                <Activity className="h-4 w-4" />
                Back To Today
              </Link>
            </div>
          </SurfaceCard>
        </section>
      </div>
    </DashboardLayout>
  )
}

function SurfaceCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/[0.06] bg-[#111118] p-6 sm:p-7 group hover:border-white/[0.1] transition-all">
      {children}
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-4 group/metric hover:bg-white/[0.05] transition-all">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">{label}</p>
      <p className="mt-3 text-2xl font-black tracking-tight text-white">{value}</p>
    </div>
  )
}

function InsightCard({
  icon: Icon,
  eyebrow,
  title,
  body,
}: {
  icon: typeof Activity
  eyebrow: string
  title: string
  body: string
}) {
  return (
    <SurfaceCard>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--saffron)]" />
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">{eyebrow}</p>
      </div>
      <h3 className="mt-4 text-xl font-bold tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/40">{body}</p>
    </SurfaceCard>
  )
}

function BadgeChip({
  icon: Icon,
  text,
}: {
  icon: typeof Activity
  text: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
      <Icon className="h-3.5 w-3.5 text-[var(--saffron)]" />
      {text}
    </span>
  )
}
