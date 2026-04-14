import { Text, View } from 'react-native';
import { LogOut, ShieldCheck, User } from 'lucide-react-native';

import { GlowingButtonNative } from '../../src/components/neon/GlowingButtonNative';
import { NeonGlassCardNative } from '../../src/components/neon/NeonGlassCardNative';
import { useMobileAuth } from '../../src/lib/auth';
import { mobileEnv } from '../../src/lib/env';

function AccountStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</Text>
      <Text className="mt-2 text-base font-black tracking-tight text-white">{value}</Text>
    </View>
  );
}

export default function AccountScreen() {
  const { session, user, signOut, refreshUser, error } = useMobileAuth();

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <View className="mb-8">
        <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
          Session
        </Text>
        <Text className="mt-3 text-4xl font-black tracking-tight text-white">Account</Text>
        <Text className="mt-3 text-sm leading-6 text-white/55">
          Supabase auth is now persistent in Expo and this screen reflects the live CREEDA user profile attached to your mobile session.
        </Text>
      </View>

      <NeonGlassCardNative watermark="ME">
        <View className="mb-4 flex-row items-start gap-3">
          <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
            <User color="#FF5F1F" size={16} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-black tracking-tight text-white">
              {user?.profile.fullName || 'Authenticated CREEDA user'}
            </Text>
            <Text className="mt-1 text-sm leading-6 text-white/55">
              {session?.user.email || user?.email || 'No email attached'}
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <AccountStat label="Role" value={user?.profile.role || 'Unknown'} />
          <AccountStat
            label="Onboarding"
            value={user?.profile.onboardingCompleted ? 'Complete' : 'Incomplete'}
          />
          <AccountStat label="Sport" value={user?.profile.primarySport || 'Not set'} />
          <AccountStat label="Position" value={user?.profile.position || 'Not set'} />
        </View>
      </NeonGlassCardNative>

      {error ? (
        <NeonGlassCardNative>
          <View className="mb-3 flex-row items-start gap-3">
            <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
              <ShieldCheck color="#00E5FF" size={16} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-black tracking-tight text-white">Profile status</Text>
              <Text className="mt-1 text-sm leading-6 text-white/55">{error}</Text>
            </View>
          </View>
        </NeonGlassCardNative>
      ) : null}

      <NeonGlassCardNative>
        <Text className="text-lg font-black tracking-tight text-white">Mobile API target</Text>
        <Text className="mt-3 text-sm leading-6 text-white/55">{mobileEnv.apiBaseUrl}</Text>
        <View className="mt-5">
          <GlowingButtonNative
            title="Refresh Profile"
            variant="chakra"
            onPress={() => {
              void refreshUser();
            }}
          />
        </View>
      </NeonGlassCardNative>

      <View className="mt-4">
        <GlowingButtonNative
          title="Sign Out"
          variant="saffron"
          icon={<LogOut color="#FF5F1F" size={18} />}
          onPress={() => {
            void signOut();
          }}
        />
      </View>
    </View>
  );
}
