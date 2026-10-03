import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { ProfileForm } from '@/components/profile-form';
import { Card, Segmented, T } from '@/components/ui';
import { useApp } from '@/lib/app-context';

export default function SettingsScreen() {
  const { t, settings, update, colors } = useApp();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Card>
          <T secondary size={13}>{t.language}</T>
          <Segmented
            value={settings.lang}
            onChange={(lang) => update({ lang })}
            options={[
              { value: 'ru', label: 'Русский' },
              { value: 'en', label: 'English' },
            ]}
          />
          <T secondary size={13} style={{ marginTop: 8 }}>{t.theme}</T>
          <Segmented
            value={settings.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: 'system', label: t.themeSystem },
              { value: 'light', label: t.themeLight },
              { value: 'dark', label: t.themeDark },
            ]}
          />
        </Card>

        <T size={20} weight="700">{t.profile}</T>
        <ProfileForm
          initial={settings.profile}
          submitLabel={t.save}
          onSubmit={async (profile) => {
            await update({ profile });
            router.back();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
