import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';

import { analyzeMeal } from './gemini.ts';

const PORT = Number(process.env.PORT ?? 8787);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';
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
  .refine((b) => b.image || b.text?.trim(), { message: 'image or text is required' });

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, model: GEMINI_MODEL }));

app.use('/analyze', async (c, next) => {
  if (c.req.header('x-app-secret') !== APP_SECRET) return c.json({ error: 'unauthorized' }, 401);
  await next();
});

app.post('/analyze', bodyLimit({ maxSize: 10 * 1024 * 1024 }), async (c) => {
  const parsed = AnalyzeBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'bad_request', details: parsed.error.issues }, 400);
  const { image, text, lang, hand } = parsed.data;
  const started = Date.now();
  try {
    const result = await analyzeMeal({ imageBase64: image, text: text?.trim(), lang, hand }, GEMINI_API_KEY, GEMINI_MODEL);
    console.log(`analyze ok in ${Date.now() - started}ms, ${result.items.length} items`);
    return c.json(result);
  } catch (err) {
    console.error('analyze failed:', err);
    return c.json({ error: 'ai_failed' }, 502);
  }
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`calories-ai server on :${info.port}, model ${GEMINI_MODEL}`);
});
