import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { Activity, HeartPulse, User } from 'lucide-react-native';
import { ActivityIndicator, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useMobileAuth } from '../../src/lib/auth';

export default function TabLayout() {
  const { loading, session } = useMobileAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Checking your CREEDA session...
        </Text>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0A0E',
          borderTopColor: 'rgba(255,255,255,0.04)',
          height: 90,
          paddingBottom: 30,
        },
        tabBarActiveTintColor: '#FF5F1F',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Activity color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ color }) => <HeartPulse color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
