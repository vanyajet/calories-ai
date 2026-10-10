import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileForm } from '@/components/profile-form';
import { Segmented, T } from '@/components/ui';
import { useApp } from '@/lib/app-context';

export default function Onboarding() {
  const { t, settings, update, colors } = useApp();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Segmented
            value={settings.lang}
            onChange={(lang) => update({ lang })}
            options={[
              { value: 'ru', label: 'Русский' },
              { value: 'en', label: 'English' },
            ]}
          />
          <T size={28} weight="700">{t.welcome}</T>
          <T secondary>{t.welcomeHint}</T>
          <ProfileForm initial={null} submitLabel={t.start} onSubmit={(profile) => update({ profile })} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
