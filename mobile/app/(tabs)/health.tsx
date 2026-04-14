import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { HeartPulse, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react-native';

import { GlowingButtonNative } from '../../src/components/neon/GlowingButtonNative';
import { NeonGlassCardNative } from '../../src/components/neon/NeonGlassCardNative';
import { useMobileAuth } from '../../src/lib/auth';
import {
  fetchHealthConnection,
  syncHealthMetrics,
  updateHealthConnection,
  type HealthConnectionState,
} from '../../src/lib/mobile-api';
import { getHealthSupportStatus, prepareHealthSync } from '../../src/lib/health-sync';
import type { HealthSupportStatus } from '../../src/lib/health-sync/types';

function HealthMetric({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</Text>
      <Text className="mt-2 text-base font-black tracking-tight text-white">{value}</Text>
    </View>
  );
}

export default function HealthScreen() {
  const { session } = useMobileAuth();
  const [support, setSupport] = useState<HealthSupportStatus | null>(null);
  const [connection, setConnection] = useState<HealthConnectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadHealthState(showRefreshState = false) {
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

      const [supportStatus, connectionResponse] = await Promise.all([
        getHealthSupportStatus(),
        fetchHealthConnection(session.access_token),
      ]);

      setSupport(supportStatus);
      setConnection(connectionResponse.connection);
      setError(null);
    } catch (stateError) {
      setError(
        stateError instanceof Error ? stateError.message : 'Failed to load health sync status.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleSync() {
    if (!session?.access_token) return;

    setSyncing(true);
    setStatusMessage(null);
    setError(null);

    try {
      const prepared = await prepareHealthSync(7);

      await updateHealthConnection(session.access_token, {
        source: prepared.source,
        connected: true,
        connection_preference: 'connect_now',
        permission_state: prepared.permissionState,
      });

      if (!prepared.data.length) {
        setStatusMessage('Permissions are connected, but there were no recent health samples to sync.');
      } else {
        const result = await syncHealthMetrics(session.access_token, { data: prepared.data });
        setStatusMessage(`Synced ${result.synced_rows} daily health records into CREEDA.`);
      }

      const refreshed = await fetchHealthConnection(session.access_token);
      setConnection(refreshed.connection);
    } catch (syncError) {
      const message =
        syncError instanceof Error ? syncError.message : 'Health sync failed unexpectedly.'

      setError(message);

      try {
        await updateHealthConnection(session.access_token, {
          source: support?.source === 'unsupported' ? undefined : support?.source,
          connected: false,
          status: 'failed',
          error: message,
        });
      } catch {
        // Preserve the original sync error if status persistence also fails.
      }
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    void loadHealthState();
  }, [session?.access_token]);

  if (loading && !support) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Checking device health support...
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
              void loadHealthState(true);
            }}
            tintColor="#FF5F1F"
          />
        }
      >
        <View className="mb-8 flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
              Device Health
            </Text>
            <Text className="mt-3 text-4xl font-black tracking-tight text-white">
              {support?.platformLabel || 'Health Sync'}
            </Text>
            <Text className="mt-3 text-sm leading-6 text-white/55">
              This tab now uses Expo-compatible Apple Health and Health Connect libraries and sends the normalized data into CREEDA’s existing health tables.
            </Text>
          </View>

          <View className="rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3">
            <RefreshCw color="#00E5FF" size={18} />
          </View>
        </View>

        <NeonGlassCardNative watermark="SYNC">
          <View className="mb-4 flex-row items-start gap-3">
            <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
              <HeartPulse color="#FF5F1F" size={16} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-black tracking-tight text-white">
                {support?.supported ? 'Native health sync available' : 'Native health sync unavailable'}
              </Text>
              <Text className="mt-1 text-sm leading-6 text-white/55">
                {support?.supported
                  ? 'CREEDA can read recent steps, sleep, heart rate, and HRV from this device.'
                  : support?.reason || 'This runtime does not currently expose a supported health provider.'}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-3">
            <HealthMetric
              label="Apple"
              value={connection?.apple_connected ? 'Connected' : 'Not connected'}
            />
            <HealthMetric
              label="Android"
              value={connection?.android_connected ? 'Connected' : 'Not connected'}
            />
            <HealthMetric
              label="Last Sync"
              value={connection?.last_sync_at ? connection.last_sync_at.slice(0, 16).replace('T', ' ') : 'Never'}
            />
            <HealthMetric
              label="Status"
              value={connection?.last_sync_status || 'never'}
            />
          </View>

          <View className="mt-5">
            <GlowingButtonNative
              title={syncing ? 'Syncing...' : 'Connect and Sync'}
              variant="chakra"
              onPress={() => {
                if (!syncing && support?.supported) {
                  void handleSync();
                }
              }}
            />
          </View>
        </NeonGlassCardNative>

        {statusMessage ? (
          <NeonGlassCardNative>
            <View className="mb-3 flex-row items-start gap-3">
              <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
                <ShieldCheck color="#00E5FF" size={16} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-black tracking-tight text-white">Sync completed</Text>
                <Text className="mt-1 text-sm leading-6 text-white/55">{statusMessage}</Text>
              </View>
            </View>
          </NeonGlassCardNative>
        ) : null}

        {error ? (
          <NeonGlassCardNative>
            <View className="mb-3 flex-row items-start gap-3">
              <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
                <TriangleAlert color="#FF5F1F" size={16} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-black tracking-tight text-white">Sync needs attention</Text>
                <Text className="mt-1 text-sm leading-6 text-white/55">{error}</Text>
              </View>
            </View>
          </NeonGlassCardNative>
        ) : null}

        <NeonGlassCardNative>
          <Text className="text-lg font-black tracking-tight text-white">What CREEDA syncs</Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            Steps, sleep duration, heart rate, and HRV are normalized into the same `/api/v1/health/sync` endpoint the web build already understands.
          </Text>
        </NeonGlassCardNative>
      </ScrollView>
    </View>
  );
}
