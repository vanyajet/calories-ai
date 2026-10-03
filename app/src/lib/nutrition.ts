import type { FoodItem, Nutrients, Profile } from './types';

export const ZERO: Nutrients = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

/** Energy of 1 kg of body fat, used to translate a calorie balance into kg. */
export const KCAL_PER_KG_FAT = 7700;

/** Resting energy (Mifflin–St Jeor), no activity multiplier. */
export function bmr(p: Profile): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(base + (p.sex === 'male' ? 5 : -161));
}

export function goalOffset(p: Profile): number {
  if (p.goal === 'lose') return -Math.abs(p.goalDelta);
  if (p.goal === 'gain') return Math.abs(p.goalDelta);
  return 0;
}

/** Calories to eat on a day: resting + active burned + goal adjustment. */
export function dayTarget(p: Profile, activeKcal: number | null): number {
  return bmr(p) + (activeKcal ?? 0) + goalOffset(p);
}

/** Calories actually burned on a day, the baseline for deficit/surplus. */
export function dayBurned(p: Profile, activeKcal: number | null): number {
  return bmr(p) + (activeKcal ?? 0);
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function fromPer100(per100: Nutrients, grams: number): Nutrients {
  const k = grams / 100;
  return {
    kcal: Math.round(per100.kcal * k),
    protein: r1(per100.protein * k),
    fat: r1(per100.fat * k),
    carbs: r1(per100.carbs * k),
  };
}

/** Recompute derived totals after an edit. */
export function normalizeItem(item: FoodItem): FoodItem {
  if (item.per100 && item.grams != null) {
    return { ...item, total: fromPer100(item.per100, item.grams) };
  }
  return item;
}

export function sum(list: Nutrients[]): Nutrients {
  return list.reduce(
    (a, n) => ({
      kcal: a.kcal + n.kcal,
      protein: r1(a.protein + n.protein),
      fat: r1(a.fat + n.fat),
      carbs: r1(a.carbs + n.carbs),
    }),
    ZERO,
  );
}

export function itemsTotal(items: FoodItem[]): Nutrients {
  return sum(items.map((i) => i.total));
}
