import { z } from 'zod';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export type AnalyzeInput = {
  imageBase64?: string;
  text?: string;
  lang: 'ru' | 'en';
  hand?: { lengthCm: number; widthCm: number };
};

// Ranges come from the model; the midpoint is taken here in code so the
// final estimate is deterministic rather than left to the model's mood.
const RawItem = z.object({
  name: z.string().min(1),
  grams_min: z.number().nonnegative(),
  grams_max: z.number().nonnegative(),
  kcal_per100_min: z.number().nonnegative(),
  kcal_per100_max: z.number().nonnegative(),
  protein_per100: z.number().nonnegative(),
  fat_per100: z.number().nonnegative(),
  carbs_per100: z.number().nonnegative(),
  macros_estimated: z.boolean(),
  confidence: z.enum(['high', 'medium', 'low']),
});

const RawResult = z.object({
  is_food: z.boolean(),
  title: z.string(),
  items: z.array(RawItem),
});

// OpenAPI-subset schema for Gemini structured output.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_food: { type: 'BOOLEAN' },
    title: { type: 'STRING', description: 'Short name of the whole meal' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          grams_min: { type: 'NUMBER' },
          grams_max: { type: 'NUMBER' },
          kcal_per100_min: { type: 'NUMBER' },
          kcal_per100_max: { type: 'NUMBER' },
          protein_per100: { type: 'NUMBER' },
          fat_per100: { type: 'NUMBER' },
          carbs_per100: { type: 'NUMBER' },
          macros_estimated: { type: 'BOOLEAN' },
          confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
        },
        required: [
          'name',
          'grams_min',
          'grams_max',
          'kcal_per100_min',
          'kcal_per100_max',
          'protein_per100',
          'fat_per100',
          'carbs_per100',
          'macros_estimated',
          'confidence',
        ],
        propertyOrdering: [
          'name',
          'grams_min',
          'grams_max',
          'kcal_per100_min',
          'kcal_per100_max',
          'protein_per100',
          'fat_per100',
          'carbs_per100',
          'macros_estimated',
          'confidence',
        ],
      },
    },
  },
  required: ['is_food', 'title', 'items'],
  propertyOrdering: ['is_food', 'title', 'items'],
};

function buildPrompt(input: AnalyzeInput): string {
  const language = input.lang === 'ru' ? 'Russian' : 'English';
  const lines = [
    'You are a professional nutritionist and food portion estimator. Your job is to produce a concrete numeric estimate of the calories and macronutrients of the food described or shown. Uncertainty is expected and is NOT a reason to refuse or hedge — you always give numbers.',
    '',
    'Method:',
    '1. Identify every distinct component of the meal (e.g. pizza → dough base, cheese, sauce, toppings; or list a dish as one item if it is homogeneous). Include cooking oil, butter, dressings and sauces that are visible or typical for the dish — they are the most common source of underestimation.',
    '2. For each component estimate its weight in grams as a realistic range [grams_min, grams_max]. Use visual scale cues: standard dinner plate ≈ 26 cm, side plate ≈ 20 cm, fork ≈ 19 cm, tablespoon ≈ 15 ml, cutlery, packaging, cans and cups. Keep the range tight — it must reflect genuine uncertainty, not a safety margin.',
    '3. For each component give energy density per 100 g as a range [kcal_per100_min, kcal_per100_max] based on standard nutrition references (USDA, local food composition tables) for that food prepared the way it appears.',
    '4. Give protein, fat and carbs per 100 g (best single estimate). Set macros_estimated = true if the composition is not clearly determinable (hidden fillings, unknown sauce, mixed dishes); false for unambiguous foods (plain chicken breast, rice, an apple, a labelled product).',
    '5. confidence: high = food and portion clearly visible/specified; medium = some guessing; low = strong guessing.',
    '',
    'Rules:',
    '- Never answer with text, apologies or caveats. Only the JSON object.',
    '- If the user states a weight or a quantity, use it: set grams_min = grams_max = stated weight.',
    '- If the user states nutrition label values, use them exactly for kcal/macros per 100 g.',
    '- Make sure macros are consistent with energy: protein*4 + carbs*4 + fat*9 should be close to kcal per 100 g.',
    '- If there is no food at all, set is_food = false and items = [].',
    `- Write "title" and item "name" in ${language}.`,
  ];
  if (input.hand) {
    lines.push(
      `- The user's palm (hand without fingers) is about ${input.hand.lengthCm} cm long and ${input.hand.widthCm} cm wide. If a hand is visible in the photo, use it as the primary scale reference.`,
    );
  }
  if (input.text) {
    lines.push('', `User description: """${input.text}"""`);
  }
  if (input.imageBase64) {
    lines.push('', 'Analyze the attached photo of the meal.');
  }
  return lines.join('\n');
}

export type AnalyzedItem = {
  name: string;
  grams: number;
  kcalPer100: number;
  proteinPer100: number;
  fatPer100: number;
  carbsPer100: number;
  macrosEstimated: boolean;
  confidence: 'high' | 'medium' | 'low';
};

export type AnalyzeResult = { isFood: boolean; title: string; items: AnalyzedItem[] };

const round1 = (n: number) => Math.round(n * 10) / 10;
const mid = (a: number, b: number) => (Math.min(a, b) + Math.max(a, b)) / 2;

function toResult(raw: z.infer<typeof RawResult>): AnalyzeResult {
  return {
    isFood: raw.is_food && raw.items.length > 0,
    title: raw.title,
    items: raw.items.map((it) => ({
      name: it.name,
      grams: Math.round(mid(it.grams_min, it.grams_max)),
      kcalPer100: round1(mid(it.kcal_per100_min, it.kcal_per100_max)),
      proteinPer100: round1(it.protein_per100),
      fatPer100: round1(it.fat_per100),
      carbsPer100: round1(it.carbs_per100),
      macrosEstimated: it.macros_estimated,
      confidence: it.confidence,
    })),
  };
}

async function callOnce(input: AnalyzeInput, apiKey: string, model: string): Promise<AnalyzeResult> {
  const parts: object[] = [{ text: buildPrompt(input) }];
  if (input.imageBase64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: input.imageBase64 } });
  }
  const res = await fetch(`${API_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.filter((p) => !p.thought && p.text)
    .map((p) => p.text)
    .join('');
  if (!text) throw new Error('Gemini returned empty response');
  return toResult(RawResult.parse(JSON.parse(text)));
}

export async function analyzeMeal(input: AnalyzeInput, apiKey: string, model: string): Promise<AnalyzeResult> {
  try {
    return await callOnce(input, apiKey, model);
  } catch (err) {
    console.warn('analyze attempt 1 failed, retrying:', (err as Error).message);
    return await callOnce(input, apiKey, model);
  }
}
