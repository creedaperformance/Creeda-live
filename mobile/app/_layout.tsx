import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MobileAuthProvider } from '../src/lib/auth';
import '../global.css'; // NativeWind CSS

export default function RootLayout() {
  return (
    <MobileAuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#04070A' } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </MobileAuthProvider>
  );
}
