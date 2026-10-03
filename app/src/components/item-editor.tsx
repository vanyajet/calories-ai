import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Card, Input, MacroPills, NumberInput, Segmented, T } from './ui';
import { useApp } from '@/lib/app-context';
import { normalizeItem } from '@/lib/nutrition';
import type { FoodItem, Nutrients } from '@/lib/types';

type Mode = 'per100' | 'total';

export function ItemEditor({ item, onChange, onRemove }: { item: FoodItem; onChange: (i: FoodItem) => void; onRemove?: () => void }) {
  const { t, colors } = useApp();
  const mode: Mode = item.per100 ? 'per100' : 'total';

  const setMode = (m: Mode) => {
    if (m === mode) return;
    if (m === 'total') {
      onChange({ ...item, per100: null, grams: item.grams });
    } else {
      const grams = item.grams && item.grams > 0 ? item.grams : 100;
      const k = 100 / grams;
      const tot = item.total;
      onChange(
        normalizeItem({
          ...item,
          grams,
          per100: { kcal: Math.round(tot.kcal * k), protein: tot.protein * k, fat: tot.fat * k, carbs: tot.carbs * k },
        }),
      );
    }
  };

  const setNutrient = (key: keyof Nutrients, v: number | null) => {
    if (mode === 'per100') onChange(normalizeItem({ ...item, per100: { ...item.per100!, [key]: v ?? 0 } }));
    else onChange({ ...item, total: { ...item.total, [key]: v ?? 0 } });
  };

  const src = mode === 'per100' ? item.per100! : item.total;
  // Remount number fields when the mode flips so they pick up converted values.
  const k = `${mode}`;

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <Input
          label={t.itemName}
          value={item.name}
          onChangeText={(name) => onChange({ ...item, name })}
          containerStyle={{ flex: 1 }}
        />
        {onRemove ? (
          <Pressable onPress={onRemove} hitSlop={8} style={{ padding: 10 }}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        ) : null}
      </View>

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'per100', label: t.per100 },
          { value: 'total', label: t.totalOnly },
        ]}
      />

      <View key={k} style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {mode === 'per100' ? (
            <NumberInput
              label={t.grams}
              value={item.grams}
              onChange={(g) => onChange(normalizeItem({ ...item, grams: g ?? 0 }))}
              containerStyle={{ flex: 1 }}
            />
          ) : null}
          <NumberInput
            label={`${t.kcal}${mode === 'per100' ? ` / 100 ${t.g}` : ''}`}
            value={src.kcal}
            onChange={(v) => setNutrient('kcal', v)}
            containerStyle={{ flex: 1 }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <NumberInput label={t.protein} value={src.protein} onChange={(v) => setNutrient('protein', v)} containerStyle={{ flex: 1 }} />
          <NumberInput label={t.fat} value={src.fat} onChange={(v) => setNutrient('fat', v)} containerStyle={{ flex: 1 }} />
          <NumberInput label={t.carbs} value={src.carbs} onChange={(v) => setNutrient('carbs', v)} containerStyle={{ flex: 1 }} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <MacroPills protein={item.total.protein} fat={item.total.fat} carbs={item.total.carbs} />
        <T weight="700">
          {Math.round(item.total.kcal)} {t.kcal}
        </T>
      </View>
      {item.macrosEstimated || item.confidence ? (
        <T secondary size={12}>
          {[item.confidence ? `AI: ${t.confidence[item.confidence]}` : null, item.macrosEstimated ? t.estimated : null]
            .filter(Boolean)
            .join(' · ')}
        </T>
      ) : null}
    </Card>
  );
}
