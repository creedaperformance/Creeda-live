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

export default function LoginScreen() {
  const { session, signIn, loading } = useMobileAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && session) {
    return <Redirect href="/(tabs)" />;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const result = await signIn(email, password);
    if (!result.ok) {
      setError(result.error);
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
          <Text className="mt-4 text-5xl font-black tracking-tight text-white">Sign in</Text>
          <Text className="mt-4 text-sm leading-6 text-white/55">
            This Expo build now uses real Supabase sessions and authenticated CREEDA mobile APIs.
          </Text>
        </View>

        <NeonGlassCardNative watermark="GO">
          <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Email</Text>
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
            placeholder="Your password"
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={password}
            className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-base text-white"
          />

          {error ? (
            <Text className="mt-4 text-sm leading-6 text-[#FF8C5A]">{error}</Text>
          ) : null}

          <View className="mt-6">
            {submitting ? (
              <View className="items-center py-4">
                <ActivityIndicator color="#FF5F1F" />
              </View>
            ) : (
              <GlowingButtonNative title="Sign In" variant="saffron" onPress={handleSubmit} />
            )}
          </View>
        </NeonGlassCardNative>

        <Link href="/signup" asChild>
          <Pressable className="mt-6 items-center">
            <Text className="text-sm font-semibold text-white/60">
              Need an account? <Text className="text-chakra-neon">Create one</Text>
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
