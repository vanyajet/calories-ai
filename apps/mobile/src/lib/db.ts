import type { SQLiteDatabase } from 'expo-sqlite';

import type { DayLog, Entry, EntrySource, FoodItem, Settings } from './types';

const DB_VERSION = 1;

export async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DB_VERSION) return;
  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      CREATE TABLE kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      CREATE TABLE entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL,
        time TEXT,
        title TEXT NOT NULL,
        photo_uri TEXT,
        source TEXT NOT NULL,
        items TEXT NOT NULL,
        kcal REAL NOT NULL,
        protein REAL NOT NULL,
        fat REAL NOT NULL,
        carbs REAL NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX entries_day ON entries(day);
      CREATE TABLE day_logs (
        day TEXT PRIMARY KEY NOT NULL,
        active_kcal REAL,
        weight_kg REAL
      );
    `);
    version = 1;
  }
  await db.execAsync(`PRAGMA user_version = ${version}`);
}

// --- settings ---

export async function loadSettings(db: SQLiteDatabase): Promise<Partial<Settings>> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM kv WHERE key = 'settings'");
  return row ? JSON.parse(row.value) : {};
}

export async function saveSettings(db: SQLiteDatabase, s: Settings) {
  await db.runAsync(
    "INSERT INTO kv (key, value) VALUES ('settings', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    JSON.stringify(s),
  );
}

// --- entries ---

type EntryRow = {
  id: number;
  day: string;
  time: string | null;
  title: string;
  photo_uri: string | null;
  source: EntrySource;
  items: string;
  created_at: number;
};

const toEntry = (r: EntryRow): Entry => ({
  id: r.id,
  day: r.day,
  time: r.time,
  title: r.title,
  photoUri: r.photo_uri,
  source: r.source,
  items: JSON.parse(r.items) as FoodItem[],
  createdAt: r.created_at,
});

export async function getEntries(db: SQLiteDatabase, day: string): Promise<Entry[]> {
  const rows = await db.getAllAsync<EntryRow>(
    "SELECT * FROM entries WHERE day = ? ORDER BY COALESCE(time, '99:99'), created_at",
    day,
  );
  return rows.map(toEntry);
}

export async function getEntry(db: SQLiteDatabase, id: number): Promise<Entry | null> {
  const row = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', id);
  return row ? toEntry(row) : null;
}

export type EntryInput = Omit<Entry, 'id' | 'createdAt'>;

function totals(items: FoodItem[]) {
  return items.reduce(
    (a, i) => [a[0] + i.total.kcal, a[1] + i.total.protein, a[2] + i.total.fat, a[3] + i.total.carbs],
    [0, 0, 0, 0],
  );
}

export async function insertEntry(db: SQLiteDatabase, e: EntryInput): Promise<number> {
  const [kcal, protein, fat, carbs] = totals(e.items);
  const res = await db.runAsync(
    `INSERT INTO entries (day, time, title, photo_uri, source, items, kcal, protein, fat, carbs, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    e.day, e.time, e.title, e.photoUri, e.source, JSON.stringify(e.items), kcal, protein, fat, carbs, Date.now(),
  );
  return res.lastInsertRowId;
}

export async function updateEntry(db: SQLiteDatabase, id: number, e: EntryInput) {
  const [kcal, protein, fat, carbs] = totals(e.items);
  await db.runAsync(
    `UPDATE entries SET day = ?, time = ?, title = ?, photo_uri = ?, source = ?, items = ?,
       kcal = ?, protein = ?, fat = ?, carbs = ? WHERE id = ?`,
    e.day, e.time, e.title, e.photoUri, e.source, JSON.stringify(e.items), kcal, protein, fat, carbs, id,
  );
}

export async function deleteEntry(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM entries WHERE id = ?', id);
}

// --- day logs (activity, weight) ---

export async function getDayLog(db: SQLiteDatabase, day: string): Promise<DayLog> {
  const row = await db.getFirstAsync<{ active_kcal: number | null; weight_kg: number | null }>(
    'SELECT active_kcal, weight_kg FROM day_logs WHERE day = ?',
    day,
  );
  return { day, activeKcal: row?.active_kcal ?? null, weightKg: row?.weight_kg ?? null };
}

export async function setActiveKcal(db: SQLiteDatabase, day: string, kcal: number | null) {
  await db.runAsync(
    'INSERT INTO day_logs (day, active_kcal) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET active_kcal = excluded.active_kcal',
    day, kcal,
  );
}

export async function setWeight(db: SQLiteDatabase, day: string, kg: number | null) {
  await db.runAsync(
    'INSERT INTO day_logs (day, weight_kg) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET weight_kg = excluded.weight_kg',
    day, kg,
  );
}

// --- stats ---

export type DaySummary = {
  day: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  entries: number;
  activeKcal: number | null;
  weightKg: number | null;
};

export async function getRange(db: SQLiteDatabase, from: string, to: string): Promise<DaySummary[]> {
  const food = await db.getAllAsync<{ day: string; kcal: number; protein: number; fat: number; carbs: number; n: number }>(
    `SELECT day, SUM(kcal) kcal, SUM(protein) protein, SUM(fat) fat, SUM(carbs) carbs, COUNT(*) n
     FROM entries WHERE day BETWEEN ? AND ? GROUP BY day`,
    from, to,
  );
  const logs = await db.getAllAsync<{ day: string; active_kcal: number | null; weight_kg: number | null }>(
    'SELECT * FROM day_logs WHERE day BETWEEN ? AND ?',
    from, to,
  );
  const map = new Map<string, DaySummary>();
  const get = (day: string) => {
    let s = map.get(day);
    if (!s) {
      s = { day, kcal: 0, protein: 0, fat: 0, carbs: 0, entries: 0, activeKcal: null, weightKg: null };
      map.set(day, s);
    }
    return s;
  };
  for (const f of food) Object.assign(get(f.day), { kcal: f.kcal, protein: f.protein, fat: f.fat, carbs: f.carbs, entries: f.n });
  for (const l of logs) Object.assign(get(l.day), { activeKcal: l.active_kcal, weightKg: l.weight_kg });
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** Days within range that have any food logged (for calendar dots). */
export async function getLoggedDays(db: SQLiteDatabase, from: string, to: string): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ day: string }>(
    'SELECT DISTINCT day FROM entries WHERE day BETWEEN ? AND ?',
    from, to,
  );
  return new Set(rows.map((r) => r.day));
}

export async function latestWeight(db: SQLiteDatabase): Promise<number | null> {
  const row = await db.getFirstAsync<{ weight_kg: number }>(
    'SELECT weight_kg FROM day_logs WHERE weight_kg IS NOT NULL ORDER BY day DESC LIMIT 1',
  );
  return row?.weight_kg ?? null;
}
