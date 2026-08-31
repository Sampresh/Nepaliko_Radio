import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { NotoSansDevanagari_400Regular } from '@expo-google-fonts/noto-sans-devanagari/400Regular';
import { NotoSansDevanagari_700Bold } from '@expo-google-fonts/noto-sans-devanagari/700Bold';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { useNotifications } from '@/features/notifications/useNotifications';
import { PlayerProvider } from '@/features/player/PlayerProvider';
import { initMonitoring } from '@/services/monitoring';
import { PERSIST_MAX_AGE, persister, queryClient } from '@/services/queryClient';
import { Colors } from '@/theme';

SplashScreen.preventAutoHideAsync();
initMonitoring();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.textPrimary,
    border: Colors.border,
  },
};

/**
 * The navigator.
 *
 * There is deliberately no auth gate. Playing a public radio stream does not
 * need an account, and Apple's guideline 5.1.1(v) forbids requiring one for
 * features that do not — quite apart from what a login wall in front of a free
 * stream does to first-time listeners. Every tab renders signed out; the auth
 * screens are ordinary routes reached from the Profile tab.
 */
function RootNavigator() {
  const { initialising } = useAuth();

  // Inside the navigator because tapping a notification navigates, and the
  // router has to exist before that can be handled. Independent of auth: an
  // emergency alert must reach a listener who never made an account.
  useNotifications();

  // Holding the splash until Auth has restored any persisted session avoids the
  // Profile tab flashing its signed-out pitch at someone who is signed in.
  useEffect(() => {
    if (!initialising) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [initialising]);

  if (initialising) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      <Stack.Screen name="(auth)/sign-in" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="(auth)/sign-up" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="(auth)/forgot-password" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: PERSIST_MAX_AGE }}>
        <ThemeProvider value={theme}>
          <AuthProvider>
            <PlayerProvider>
              <StatusBar style="light" />
              <RootNavigator />
            </PlayerProvider>
          </AuthProvider>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
