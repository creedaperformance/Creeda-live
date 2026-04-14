import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { useMobileAuth } from '../src/lib/auth';

export default function Index() {
  const { loading, session } = useMobileAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Loading your CREEDA mobile session...
        </Text>
      </View>
    );
  }

  return <Redirect href={session ? "/(tabs)" : "/login"} />;
}
