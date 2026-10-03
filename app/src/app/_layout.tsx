import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppProvider, useApp } from '@/lib/app-context';
import { migrate } from '@/lib/db';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="calories.db" onInit={migrate}>
      <AppProvider>
        <Navigator />
      </AppProvider>
    </SQLiteProvider>
  );
}

function Navigator() {
  const { colors, isDark, t, settings } = useApp();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: colors.background, card: colors.card, text: colors.text, primary: colors.accent, border: colors.border },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!!settings.profile}>
          <Stack.Screen name="index" options={{ title: t.appName }} />
          <Stack.Screen name="add" options={{ title: t.addFood, presentation: 'modal' }} />
          <Stack.Screen name="review" options={{ title: t.review }} />
          <Stack.Screen name="stats" options={{ title: t.stats }} />
          <Stack.Screen name="settings" options={{ title: t.settings }} />
        </Stack.Protected>
        <Stack.Protected guard={!settings.profile}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
