import { getLocales } from 'expo-localization';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { latestWeight, loadSettings, saveSettings } from './db';
import { LOCALES, STRINGS, type Strings } from './i18n';
import { Palette, type Colors } from './theme';
import type { Profile, Settings } from './types';

type AppContextValue = {
  settings: Settings;
  /** Profile with the most recent logged weight, used for all calorie math. */
  profile: Profile | null;
  update: (patch: Partial<Settings>) => Promise<void>;
  t: Strings;
  locale: string;
  colors: Colors;
  isDark: boolean;
  /** Bumped after any data change so screens can refetch. */
  dataVersion: number;
  notifyDataChanged: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function defaultLang(): Settings['lang'] {
  return getLocales()[0]?.languageCode === 'ru' ? 'ru' : 'en';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const system = useColorScheme();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [loggedWeight, setLoggedWeight] = useState<number | null>(null);

  useEffect(() => {
    latestWeight(db).then(setLoggedWeight);
  }, [db, dataVersion]);

  useEffect(() => {
    loadSettings(db).then((s) =>
      setSettings({ lang: s.lang ?? defaultLang(), theme: s.theme ?? 'system', profile: s.profile ?? null }),
    );
  }, [db]);

  const update = useCallback(
    async (patch: Partial<Settings>) => {
      if (!settings) return;
      const next = { ...settings, ...patch };
      setSettings(next);
      await saveSettings(db, next);
    },
    [db, settings],
  );

  const notifyDataChanged = useCallback(() => setDataVersion((v) => v + 1), []);

  const value = useMemo<AppContextValue | null>(() => {
    if (!settings) return null;
    const isDark = settings.theme === 'system' ? system === 'dark' : settings.theme === 'dark';
    const profile = settings.profile && { ...settings.profile, weightKg: loggedWeight ?? settings.profile.weightKg };
    return {
      settings,
      profile,
      update,
      t: STRINGS[settings.lang],
      locale: LOCALES[settings.lang],
      colors: isDark ? Palette.dark : Palette.light,
      isDark,
      dataVersion,
      notifyDataChanged,
    };
  }, [settings, system, update, dataVersion, notifyDataChanged, loggedWeight]);

  if (!value) return null;
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
