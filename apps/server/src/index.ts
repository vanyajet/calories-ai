import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { SECRET_HEADER, type AnalyzeErrorResponse, type AnalyzeRequest, type AnalyzeResponse } from '@calories/shared';
import { z } from 'zod';

import { analyzeMeal } from './gemini.ts';

const PORT = Number(process.env.PORT ?? 8787);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-3.6-flash';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? 30000);
const APP_SECRET = process.env.APP_SECRET ?? '';

if (!GEMINI_API_KEY || !APP_SECRET) {
  console.error('GEMINI_API_KEY and APP_SECRET must be set (see .env.example)');
  process.exit(1);
}

const AnalyzeBody = z
  .object({
    image: z.string().optional(),
    text: z.string().max(2000).optional(),
    lang: z.enum(['ru', 'en']).default('ru'),
    hand: z.object({ lengthCm: z.number().positive(), widthCm: z.number().positive() }).optional(),
  })
  .refine((b) => b.image || b.text?.trim(), { message: 'image or text is required' }) satisfies z.ZodType<AnalyzeRequest>;

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, model: GEMINI_MODEL }));

app.use('/analyze', async (c, next) => {
  if (c.req.header(SECRET_HEADER) !== APP_SECRET) return c.json<AnalyzeErrorResponse>({ error: 'unauthorized' }, 401);
  await next();
});

app.post('/analyze', bodyLimit({ maxSize: 10 * 1024 * 1024 }), async (c) => {
  const parsed = AnalyzeBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json<AnalyzeErrorResponse>({ error: 'bad_request', details: parsed.error.issues }, 400);
  const { image, text, lang, hand } = parsed.data;
  const started = Date.now();
  try {
    const { model, ...result } = await analyzeMeal(
      { imageBase64: image, text: text?.trim(), lang, hand },
      { apiKey: GEMINI_API_KEY, model: GEMINI_MODEL, fallbackModel: GEMINI_FALLBACK_MODEL, timeoutMs: GEMINI_TIMEOUT_MS },
    );
    console.log(`analyze ok in ${Date.now() - started}ms via ${model}, ${result.items.length} items`);
    return c.json<AnalyzeResponse>(result);
  } catch (err) {
    console.error('analyze failed:', err);
    return c.json<AnalyzeErrorResponse>({ error: 'ai_failed' }, 502);
  }
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`calories-ai server on :${info.port}, model ${GEMINI_MODEL}`);
});
