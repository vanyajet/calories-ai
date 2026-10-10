// Day keys are local calendar dates (YYYY-MM-DD), never UTC, so a late-night
// snack stays on the day it was eaten.

const pad = (n: number) => String(n).padStart(2, '0');

export function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toDayKey(new Date());
}

export function addDays(key: string, delta: number): string {
  const d = fromDayKey(key);
  d.setDate(d.getDate() + delta);
  return toDayKey(d);
}

export function nowTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Accepts "9:5", "09:05", "905", "0905" → "09:05"; null if invalid. */
export function parseTime(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[:.\s]?(\d{2})$/) ?? s.match(/^(\d{1,2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

/** Monday-first week containing the day. */
export function weekDays(key: string): string[] {
  const d = fromDayKey(key);
  const shift = (d.getDay() + 6) % 7;
  const monday = addDays(key, -shift);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Grid of weeks (Monday-first) covering the month; null = padding cell. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(toDayKey(new Date(year, month, i)));
  while (cells.length % 7) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export function formatDay(key: string, locale: string, opts: Intl.DateTimeFormatOptions): string {
  return fromDayKey(key).toLocaleDateString(locale, opts);
}
