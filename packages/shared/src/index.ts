// Contract between the mobile app and the AI proxy (POST /analyze).
// Plain types only, so both sides can use it without extra dependencies.

export type Lang = 'ru' | 'en';
export type Confidence = 'high' | 'medium' | 'low';

export type HandSize = { lengthCm: number; widthCm: number };

export type AnalyzeRequest = {
  /** JPEG, base64 without data: prefix */
  image?: string;
  text?: string;
  lang: Lang;
  hand?: HandSize;
};

/** One food component; the server has already taken the midpoint of the model's ranges. */
export type AnalyzedItem = {
  name: string;
  grams: number;
  kcalPer100: number;
  proteinPer100: number;
  fatPer100: number;
  carbsPer100: number;
  macrosEstimated: boolean;
  confidence: Confidence;
};

export type AnalyzeResponse = { isFood: boolean; title: string; items: AnalyzedItem[] };

export type AnalyzeErrorCode = 'unauthorized' | 'bad_request' | 'ai_failed';
export type AnalyzeErrorResponse = { error: AnalyzeErrorCode; details?: unknown };

export const SECRET_HEADER = 'x-app-secret';
