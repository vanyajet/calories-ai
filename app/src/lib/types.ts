export type Sex = 'male' | 'female';
export type Goal = 'maintain' | 'lose' | 'gain';
export type Lang = 'ru' | 'en';
export type ThemePref = 'system' | 'light' | 'dark';
export type Confidence = 'high' | 'medium' | 'low';

export type Profile = {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  goal: Goal;
  /** kcal subtracted (lose) or added (gain) to the daily norm */
  goalDelta: number;
  handLengthCm: number | null;
  handWidthCm: number | null;
};

export type Settings = {
  lang: Lang;
  theme: ThemePref;
  profile: Profile | null;
};

export type Nutrients = { kcal: number; protein: number; fat: number; carbs: number };

/**
 * A food item. If `grams` and `per100` are set, totals are derived from them;
 * otherwise (label gives only totals) `total` is entered directly.
 */
export type FoodItem = {
  name: string;
  grams: number | null;
  per100: Nutrients | null;
  total: Nutrients;
  macrosEstimated: boolean;
  confidence: Confidence | null;
};

export type EntrySource = 'photo' | 'text' | 'manual';

export type Entry = {
  id: number;
  day: string;
  time: string | null;
  title: string;
  photoUri: string | null;
  source: EntrySource;
  items: FoodItem[];
  createdAt: number;
};

export type DayLog = { day: string; activeKcal: number | null; weightKg: number | null };
