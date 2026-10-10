import { SECRET_HEADER, type AnalyzeRequest, type AnalyzeResponse } from '@calories/shared';
import { File } from 'expo-file-system';

import type { FoodItem, Lang, Profile } from './types';
import { normalizeItem } from './nutrition';

const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL ?? '';
const APP_SECRET = process.env.EXPO_PUBLIC_APP_SECRET ?? '';

export type AnalyzeResult = { isFood: boolean; title: string; items: FoodItem[] };

export class AiError extends Error {
  constructor(public code: 'not_configured' | 'network' | 'server' | 'not_food') {
    super(code);
  }
}

export async function analyzeMeal(args: {
  photoUri?: string | null;
  text?: string;
  lang: Lang;
  profile: Profile | null;
}): Promise<AnalyzeResult> {
  if (!PROXY_URL || !APP_SECRET) throw new AiError('not_configured');

  const image = args.photoUri ? await new File(args.photoUri).base64() : undefined;
  const p = args.profile;
  const hand =
    p?.handLengthCm && p.handWidthCm ? { lengthCm: p.handLengthCm, widthCm: p.handWidthCm } : undefined;

  let res: Response;
  try {
    res = await fetch(`${PROXY_URL.replace(/\/$/, '')}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [SECRET_HEADER]: APP_SECRET },
      body: JSON.stringify({ image, text: args.text?.trim() || undefined, lang: args.lang, hand } satisfies AnalyzeRequest),
    });
  } catch {
    throw new AiError('network');
  }
  if (!res.ok) throw new AiError('server');

  const data = (await res.json()) as AnalyzeResponse;
  if (!data.isFood || data.items.length === 0) throw new AiError('not_food');

  return {
    isFood: true,
    title: data.title,
    items: data.items.map((i) =>
      normalizeItem({
        name: i.name,
        grams: i.grams,
        per100: { kcal: i.kcalPer100, protein: i.proteinPer100, fat: i.fatPer100, carbs: i.carbsPer100 },
        total: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
        macrosEstimated: i.macrosEstimated,
        confidence: i.confidence,
      }),
    ),
  };
}
