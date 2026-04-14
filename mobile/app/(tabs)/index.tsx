import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  Activity,
  Brain,
  Footprints,
  HeartPulse,
  Moon,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react-native';

import { GlowingButtonNative } from '../../src/components/neon/GlowingButtonNative';
import { NeonGlassCardNative } from '../../src/components/neon/NeonGlassCardNative';
import { ReadinessOrbNative } from '../../src/components/neon/ReadinessOrbNative';
import { useMobileAuth } from '../../src/lib/auth';
import { fetchMobileDashboard, type MobileDashboard } from '../../src/lib/mobile-api';

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</Text>
      <Text className="mt-2 text-base font-black tracking-tight text-white">{value}</Text>
    </View>
  );
}

function SectionTitle({
  title,
  detail,
  icon: Icon,
}: {
  title: string;
  detail: string;
  icon: typeof Activity;
}) {
  return (
    <View className="mb-3 flex-row items-start gap-3">
      <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
        <Icon color="#FF5F1F" size={16} />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-black tracking-tight text-white">{title}</Text>
        <Text className="mt-1 text-sm leading-6 text-white/55">{detail}</Text>
      </View>
    </View>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <NeonGlassCardNative>
      <Text className="text-lg font-bold text-white">{title}</Text>
      <Text className="mt-3 text-sm leading-6 text-white/55">{body}</Text>
    </NeonGlassCardNative>
  );
}

export default function HomeScreen() {
  const { session, user, error: authError } = useMobileAuth();
  const [dashboard, setDashboard] = useState<MobileDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard(showRefreshState = false) {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetchMobileDashboard(session.access_token);
      setDashboard(response.dashboard);
      setError(null);
    } catch (dashboardError) {
      setError(
        dashboardError instanceof Error
          ? dashboardError.message
          : 'Failed to load your CREEDA dashboard.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [session?.access_token]);

  const displayName =
    user?.profile.fullName ||
    (typeof session?.user.user_metadata?.full_name === 'string'
      ? session.user.user_metadata.full_name
      : 'CREEDA Athlete');

  if (loading && !dashboard) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Pulling your latest CREEDA dashboard...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background pt-16">
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadDashboard(true);
            }}
            tintColor="#FF5F1F"
          />
        }
      >
        <View className="mb-8 flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
              CREEDA Mobile
            </Text>
            <Text className="mt-3 text-4xl font-black tracking-tight text-white">
              {displayName}
            </Text>
            <Text className="mt-3 text-sm leading-6 text-white/55">
              Your mobile app is now reading live CREEDA role data from the server, not the old Expo scaffold.
            </Text>
          </View>

          <Pressable
            onPress={() => {
              void loadDashboard(true);
            }}
            className="rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3"
          >
            <RefreshCw color="#00E5FF" size={18} />
          </Pressable>
        </View>

        {!user?.profile.onboardingCompleted ? (
          <NeonGlassCardNative watermark="V1">
            <Text className="text-lg font-bold text-white">Finish onboarding to unlock the full mobile flow</Text>
            <Text className="mt-3 text-sm leading-6 text-white/55">
              Your account is authenticated, but CREEDA still marks onboarding as incomplete. The mobile dashboard will stay limited until the profile setup is finished.
            </Text>
          </NeonGlassCardNative>
        ) : null}

        {authError ? (
          <NeonGlassCardNative>
            <SectionTitle
              title="Profile bootstrap warning"
              detail={authError}
              icon={TriangleAlert}
            />
          </NeonGlassCardNative>
        ) : null}

        {error ? (
          <NeonGlassCardNative>
            <SectionTitle
              title="Dashboard load failed"
              detail={error}
              icon={TriangleAlert}
            />
            <View className="mt-4">
              <GlowingButtonNative
                title="Retry Dashboard"
                variant="chakra"
                onPress={() => {
                  void loadDashboard(true);
                }}
              />
            </View>
          </NeonGlassCardNative>
        ) : null}

        {!dashboard ? (
          <EmptyState
            title="No mobile dashboard yet"
            body="Your session is live, but the server has not returned a dashboard summary yet. Pull to refresh after your next CREEDA update."
          />
        ) : null}

        {dashboard?.type === 'athlete' ? (
          <>
            <View className="items-center mb-8 mt-4">
              <ReadinessOrbNative score={dashboard.readinessScore ?? 0} />
              <Text className="mt-6 text-4xl font-black tracking-tight text-white">
                {dashboard.decision || 'Awaiting Check-In'}
              </Text>
              <Text className="mt-3 rounded-full bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-chakra-neon">
                Readiness {dashboard.readinessScore ?? '--'} • Risk {dashboard.riskScore ?? '--'}
              </Text>
            </View>

            <NeonGlassCardNative watermark="ATH">
              <SectionTitle
                title="Today’s call"
                detail={dashboard.primaryReason}
                icon={Target}
              />
              <Text className="text-sm leading-6 text-white/70">{dashboard.actionInstruction}</Text>
              <View className="mt-5 gap-3">
                <StatPill
                  label="Objective"
                  value={dashboard.objective.headline || dashboard.objective.summary}
                />
                <StatPill
                  label="Health Sync"
                  value={
                    dashboard.health.connected
                      ? `${dashboard.health.sampleDays} days connected`
                      : 'Manual only'
                  }
                />
              </View>
            </NeonGlassCardNative>

            <NeonGlassCardNative>
              <SectionTitle
                title="Health influence"
                detail={
                  dashboard.health.connected
                    ? `Latest sync ${dashboard.health.latestMetricDate || 'pending'} from ${dashboard.health.source}.`
                    : 'Connect Apple Health or Health Connect from the Health tab to feed recovery metrics into CREEDA.'
                }
                icon={HeartPulse}
              />
              <View className="flex-row flex-wrap gap-3">
                <StatPill label="Steps" value={dashboard.health.latestSteps ? `${dashboard.health.latestSteps}` : 'N/A'} />
                <StatPill label="Sleep" value={dashboard.health.avgSleepHours ? `${dashboard.health.avgSleepHours} h` : 'N/A'} />
                <StatPill label="Heart Rate" value={dashboard.health.avgHeartRate ? `${dashboard.health.avgHeartRate}` : 'N/A'} />
                <StatPill label="HRV" value={dashboard.health.avgHrv ? `${dashboard.health.avgHrv}` : 'N/A'} />
              </View>
            </NeonGlassCardNative>

            {dashboard.context ? (
              <NeonGlassCardNative>
                <SectionTitle
                  title={`${dashboard.context.loadLabel} context load`}
                  detail={dashboard.context.summary}
                  icon={Brain}
                />
                <Text className="text-sm leading-6 text-white/70">{dashboard.context.nextAction}</Text>
              </NeonGlassCardNative>
            ) : null}

            <NeonGlassCardNative>
              <SectionTitle
                title={dashboard.nutrition.gateTitle}
                detail={dashboard.nutrition.summary}
                icon={ShieldCheck}
              />
              <Text className="text-sm leading-6 text-white/70">{dashboard.nutrition.nextAction}</Text>
            </NeonGlassCardNative>
          </>
        ) : null}

        {dashboard?.type === 'coach' ? (
          <>
            <NeonGlassCardNative watermark="CO">
              <SectionTitle
                title="Coach weekly signal"
                detail={`${dashboard.periodLabel}. ${dashboard.biggestWin}`}
                icon={Users}
              />
              <View className="mt-4 flex-row flex-wrap gap-3">
                <StatPill label="Athletes" value={`${dashboard.athleteCount}`} />
                <StatPill label="Readiness" value={`${dashboard.averageReadiness}`} />
                <StatPill label="Interventions" value={`${dashboard.activeInterventions}`} />
                <StatPill label="Low Data" value={`${dashboard.lowDataCount}`} />
              </View>
            </NeonGlassCardNative>

            <NeonGlassCardNative>
              <SectionTitle
                title="Next week focus"
                detail={dashboard.nextWeekFocus}
                icon={TrendingUp}
              />
              <Text className="text-sm leading-6 text-white/70">
                Highest risk cluster: {dashboard.highestRiskCluster}
              </Text>
            </NeonGlassCardNative>

            <NeonGlassCardNative>
              <SectionTitle
                title="Top priority athletes"
                detail={
                  dashboard.topPriorityAthletes.length
                    ? 'The highest-signal squad items from the live CREEDA coach queue.'
                    : 'No live escalations right now.'
                }
                icon={TriangleAlert}
              />
              {dashboard.topPriorityAthletes.length ? (
                <View className="gap-3">
                  {dashboard.topPriorityAthletes.map((athlete) => (
                    <View
                      key={`${athlete.athleteId}-${athlete.queueType}`}
                      className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"
                    >
                      <Text className="text-base font-black tracking-tight text-white">
                        {athlete.athleteName}
                      </Text>
                      <Text className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                        {athlete.teamName} • {athlete.priority}
                      </Text>
                      <Text className="mt-3 text-sm leading-6 text-white/65">
                        {athlete.recommendation}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </NeonGlassCardNative>
          </>
        ) : null}

        {dashboard?.type === 'individual' ? (
          <>
            <View className="items-center mb-8 mt-4">
              <ReadinessOrbNative score={dashboard.readinessScore || 0} />
              <Text className="mt-6 text-4xl font-black tracking-tight text-white">
                {dashboard.directionLabel}
              </Text>
              <Text className="mt-3 rounded-full bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-chakra-neon">
                {dashboard.sport} • {dashboard.primaryGoal || 'General Fitness'}
              </Text>
            </View>

            <NeonGlassCardNative watermark="IND">
              <SectionTitle
                title="Today’s direction"
                detail={dashboard.directionSummary}
                icon={Target}
              />
              <Text className="text-sm leading-6 text-white/70">{dashboard.explanation}</Text>
            </NeonGlassCardNative>

            {dashboard.today ? (
              <NeonGlassCardNative>
                <SectionTitle
                  title={dashboard.today.todayFocus}
                  detail={`${dashboard.today.intensity.toUpperCase()} intensity • ${dashboard.today.sessionDurationMinutes} minutes`}
                  icon={Activity}
                />
                <View className="gap-3">
                  {dashboard.today.whatToDo.map((item) => (
                    <View key={item} className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                      <Text className="text-sm leading-6 text-white/75">{item}</Text>
                    </View>
                  ))}
                </View>
                {dashboard.today.recoveryActions.length ? (
                  <View className="mt-4">
                    <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                      Recovery actions
                    </Text>
                    <Text className="mt-3 text-sm leading-6 text-white/65">
                      {dashboard.today.recoveryActions.join(' • ')}
                    </Text>
                  </View>
                ) : null}
              </NeonGlassCardNative>
            ) : null}

            <NeonGlassCardNative>
              <SectionTitle
                title="Health blend"
                detail={
                  dashboard.health.usedInDecision
                    ? `Device data is influencing ${dashboard.health.influencePct}% of this direction.`
                    : 'This direction is still running from FitStart and manual check-ins.'
                }
                icon={HeartPulse}
              />
              <View className="flex-row flex-wrap gap-3">
                <StatPill label="Sync state" value={dashboard.health.summary.connected ? 'Connected' : 'Manual'} />
                <StatPill label="Metric days" value={`${dashboard.health.connectedMetricDays}`} />
                <StatPill label="Steps" value={dashboard.health.summary.latestSteps ? `${dashboard.health.summary.latestSteps}` : 'N/A'} />
                <StatPill label="Sleep" value={dashboard.health.summary.avgSleepHours ? `${dashboard.health.summary.avgSleepHours} h` : 'N/A'} />
              </View>
            </NeonGlassCardNative>

            {dashboard.pathway ? (
              <NeonGlassCardNative>
                <SectionTitle
                  title={dashboard.pathway.title}
                  detail={dashboard.pathway.rationale}
                  icon={Footprints}
                />
              </NeonGlassCardNative>
            ) : null}

            <NeonGlassCardNative>
              <SectionTitle
                title={dashboard.nutrition.gateTitle}
                detail={dashboard.nutrition.summary}
                icon={Moon}
              />
              <Text className="text-sm leading-6 text-white/70">{dashboard.nutrition.nextAction}</Text>
            </NeonGlassCardNative>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
