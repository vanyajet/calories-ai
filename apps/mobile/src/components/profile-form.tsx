import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Card, NumberInput, Segmented, T } from './ui';
import { useApp } from '@/lib/app-context';
import { fmt } from '@/lib/i18n';
import { bmr, goalOffset } from '@/lib/nutrition';
import type { Goal, Profile, Sex } from '@/lib/types';

type Form = {
  sex: Sex;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  goal: Goal;
  goalDelta: number | null;
  handLengthCm: number | null;
  handWidthCm: number | null;
};

function toProfile(f: Form): Profile | null {
  if (!f.age || !f.weightKg || !f.heightCm) return null;
  if (f.age < 10 || f.age > 110 || f.weightKg < 25 || f.weightKg > 350 || f.heightCm < 100 || f.heightCm > 250) return null;
  return {
    sex: f.sex,
    age: f.age,
    weightKg: f.weightKg,
    heightCm: f.heightCm,
    goal: f.goal,
    goalDelta: f.goalDelta ?? 400,
    handLengthCm: f.handLengthCm,
    handWidthCm: f.handWidthCm,
  };
}

export function ProfileForm({ initial, submitLabel, onSubmit }: { initial: Profile | null; submitLabel: string; onSubmit: (p: Profile) => void }) {
  const { t } = useApp();
  const [f, setF] = useState<Form>({
    sex: initial?.sex ?? 'male',
    age: initial?.age ?? null,
    weightKg: initial?.weightKg ?? null,
    heightCm: initial?.heightCm ?? null,
    goal: initial?.goal ?? 'maintain',
    goalDelta: initial?.goalDelta ?? 400,
    handLengthCm: initial?.handLengthCm ?? null,
    handWidthCm: initial?.handWidthCm ?? null,
  });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const preview = toProfile(f);

  return (
    <View style={{ gap: 16 }}>
      <Card>
        <T secondary size={13}>{t.sex}</T>
        <Segmented
          value={f.sex}
          onChange={(v) => set('sex', v)}
          options={[
            { value: 'male', label: t.male },
            { value: 'female', label: t.female },
          ]}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <NumberInput label={t.age} value={f.age} onChange={(v) => set('age', v)} decimals={false} containerStyle={{ flex: 1 }} />
          <NumberInput label={t.height} value={f.heightCm} onChange={(v) => set('heightCm', v)} containerStyle={{ flex: 1 }} />
          <NumberInput label={t.weightKg} value={f.weightKg} onChange={(v) => set('weightKg', v)} containerStyle={{ flex: 1 }} />
        </View>
      </Card>

      <Card>
        <T secondary size={13}>{t.goal}</T>
        <Segmented
          value={f.goal}
          onChange={(v) => set('goal', v)}
          options={[
            { value: 'lose', label: t.goalLose },
            { value: 'maintain', label: t.goalMaintain },
            { value: 'gain', label: t.goalGain },
          ]}
        />
        {f.goal !== 'maintain' ? (
          <NumberInput label={t.goalDelta} value={f.goalDelta} onChange={(v) => set('goalDelta', v)} decimals={false} />
        ) : null}
      </Card>

      <Card>
        <T weight="600">{t.hand}</T>
        <T secondary size={13}>{t.handHint}</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <NumberInput label={t.handLength} value={f.handLengthCm} onChange={(v) => set('handLengthCm', v)} containerStyle={{ flex: 1 }} />
          <NumberInput label={t.handWidth} value={f.handWidthCm} onChange={(v) => set('handWidthCm', v)} containerStyle={{ flex: 1 }} />
        </View>
      </Card>

      {preview ? (
        <Card>
          <T>{fmt(t.bmrLine, { kcal: bmr(preview) })}</T>
          <T weight="600">{fmt(t.normLine, { kcal: bmr(preview) + goalOffset(preview) })}</T>
        </Card>
      ) : null}

      <Button
        title={submitLabel}
        onPress={() => {
          const p = toProfile(f);
          if (!p) return Alert.alert(t.invalidProfile);
          onSubmit(p);
        }}
      />
    </View>
  );
}
