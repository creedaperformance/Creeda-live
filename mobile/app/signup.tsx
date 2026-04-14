import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, Redirect } from 'expo-router';

import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative';
import { NeonGlassCardNative } from '../src/components/neon/NeonGlassCardNative';
import { useMobileAuth } from '../src/lib/auth';
import type { AppRole } from '../src/lib/mobile-api';

const ROLES: AppRole[] = ['athlete', 'coach', 'individual'];

export default function SignupScreen() {
  const { session, signUp, loading } = useMobileAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AppRole>('athlete');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!loading && session) {
    return <Redirect href="/(tabs)" />;
  }

  async function handleSignup() {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await signUp({ fullName, email, password, role });
    if (!result.ok) {
      setError(result.error);
    } else if (result.needsEmailVerification) {
      setMessage('Your account was created. Check your email to verify the address before signing in.');
    }

    setSubmitting(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View className="mb-10">
          <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            CREEDA Mobile
          </Text>
          <Text className="mt-4 text-5xl font-black tracking-tight text-white">Create account</Text>
          <Text className="mt-4 text-sm leading-6 text-white/55">
            Signup now writes the real CREEDA role and profile metadata into Supabase so the mobile dashboard can bootstrap correctly.
          </Text>
        </View>

        <NeonGlassCardNative watermark="NEW">
          <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Full name</Text>
          <TextInput
            autoCapitalize="words"
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={fullName}
            className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-base text-white"
          />

          <Text className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Role</Text>
          <View className="mt-3 flex-row flex-wrap gap-3">
            {ROLES.map((roleOption) => {
              const active = roleOption === role;
              return (
                <Pressable
                  key={roleOption}
                  onPress={() => setRole(roleOption)}
                  className={`rounded-full border px-4 py-3 ${
                    active
                      ? 'border-[#00E5FF]/50 bg-[#00E5FF]/10'
                      : 'border-white/5 bg-white/[0.03]'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold uppercase tracking-[0.18em] ${
                      active ? 'text-chakra-neon' : 'text-white/55'
                    }`}
                  >
                    {roleOption}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@creeda.app"
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={email}
            className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-base text-white"
          />

          <Text className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Password</Text>
          <TextInput
            secureTextEntry
            onChangeText={setPassword}
            placeholder="Choose a password"
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={password}
            className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-base text-white"
          />

          {message ? (
            <Text className="mt-4 text-sm leading-6 text-chakra-neon">{message}</Text>
          ) : null}
          {error ? (
            <Text className="mt-4 text-sm leading-6 text-[#FF8C5A]">{error}</Text>
          ) : null}

          <View className="mt-6">
            {submitting ? (
              <View className="items-center py-4">
                <ActivityIndicator color="#FF5F1F" />
              </View>
            ) : (
              <GlowingButtonNative title="Create Account" variant="chakra" onPress={handleSignup} />
            )}
          </View>
        </NeonGlassCardNative>

        <Link href="/login" asChild>
          <Pressable className="mt-6 items-center">
            <Text className="text-sm font-semibold text-white/60">
              Already have an account? <Text className="text-chakra-neon">Sign in</Text>
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
