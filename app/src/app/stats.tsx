import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { Card, MacroPills, Segmented, T } from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { addDays, formatDay, fromDayKey, todayKey, toDayKey, weekDays } from '@/lib/dates';
import { getRange, type DaySummary } from '@/lib/db';
import { fmt } from '@/lib/i18n';
import { dayBurned, KCAL_PER_KG_FAT } from '@/lib/nutrition';

type Period = 'week' | 'month';

function periodDays(period: Period, anchor: string): string[] {
  if (period === 'week') return weekDays(anchor);
  const d = fromDayKey(anchor);
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => toDayKey(new Date(d.getFullYear(), d.getMonth(), i + 1)));
}

function shift(period: Period, anchor: string, dir: 1 | -1): string {
  if (period === 'week') return addDays(anchor, 7 * dir);
  const d = fromDayKey(anchor);
  return toDayKey(new Date(d.getFullYear(), d.getMonth() + dir, 1));
}

export default function StatsScreen() {
  const db = useSQLiteContext();
  const { t, colors, locale, profile: effectiveProfile, dataVersion } = useApp();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState(todayKey);
  const [rows, setRows] = useState<DaySummary[]>([]);
  const profile = effectiveProfile!;

  const days = periodDays(period, anchor);
  const from = days[0];
  const to = days[days.length - 1];

  useEffect(() => {
    getRange(db, from, to).then(setRows);
  }, [db, from, to, dataVersion]);

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const logged = rows.filter((r) => r.entries > 0);
  const n = logged.length;
  const balance = logged.reduce((a, r) => a + r.kcal - dayBurned(profile, r.activeKcal), 0);
  const avg = n
    ? {
        kcal: logged.reduce((a, r) => a + r.kcal, 0) / n,
        protein: logged.reduce((a, r) => a + r.protein, 0) / n,
        fat: logged.reduce((a, r) => a + r.fat, 0) / n,
        carbs: logged.reduce((a, r) => a + r.carbs, 0) / n,
      }
    : null;
  const weights = days.map((d) => byDay.get(d)?.weightKg ?? null);

  const title =
    period === 'week'
      ? `${formatDay(from, locale, { day: 'numeric', month: 'short' })} – ${formatDay(to, locale, { day: 'numeric', month: 'short' })}`
      : fromDayKey(anchor).toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const chartW = width - 64;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'week', label: t.week },
          { value: 'month', label: t.month },
        ]}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable hitSlop={10} onPress={() => setAnchor(shift(period, anchor, -1))}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <T size={17} weight="700" style={{ textTransform: 'capitalize' }}>{title}</T>
        <Pressable hitSlop={10} onPress={() => setAnchor(shift(period, anchor, 1))}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      {n === 0 ? (
        <Card>
          <T secondary style={{ textAlign: 'center' }}>{t.noData}</T>
        </Card>
      ) : (
        <>
          <Card>
            <T secondary size={13}>{t.balance}</T>
            <T size={28} weight="700" style={{ color: balance <= 0 ? colors.accent : colors.danger }}>
              {balance <= 0 ? t.deficit : t.surplus} {Math.abs(Math.round(balance))} {t.kcal}
            </T>
            <T secondary>
              {fmt(t.fatEquivalent, { kg: (Math.abs(balance) / KCAL_PER_KG_FAT).toFixed(2) })} · {fmt(t.daysLogged, { n })}
            </T>
          </Card>

          <Card>
            <T secondary size={13}>{t.avgPerDay}</T>
            <T size={22} weight="700">
              {Math.round(avg!.kcal)} <T secondary size={14}>{t.kcal}</T>
            </T>
            <MacroPills protein={avg!.protein} fat={avg!.fat} carbs={avg!.carbs} size={15} />
          </Card>

          <Card>
            <T secondary size={13}>{t.consumedVsBurned}</T>
            <BalanceChart
              width={chartW}
              days={days}
              values={days.map((d) => {
                const r = byDay.get(d);
                return r && r.entries > 0 ? { eaten: r.kcal, burned: dayBurned(profile, r.activeKcal) } : null;
              })}
              showLabels={period === 'week'}
            />
          </Card>
        </>
      )}

      {weights.some((w) => w != null) ? (
        <Card>
          <T secondary size={13}>{t.weightChart}</T>
          <WeightChart width={chartW} weights={weights} />
        </Card>
      ) : null}
    </ScrollView>
  );
}

function BalanceChart({
  width,
  days,
  values,
  showLabels,
}: {
  width: number;
  days: string[];
  values: ({ eaten: number; burned: number } | null)[];
  showLabels: boolean;
}) {
  const { colors, locale } = useApp();
  const height = 160;
  const labelH = showLabels ? 18 : 0;
  const plotH = height - labelH;
  const max = Math.max(1, ...values.flatMap((v) => (v ? [v.eaten, v.burned] : []))) * 1.1;
  const slot = width / days.length;
  const barW = Math.max(3, slot * 0.6);

  return (
    <Svg width={width} height={height}>
      {values.map((v, i) => {
        const x = i * slot + (slot - barW) / 2;
        if (!v) return null;
        const h = (v.eaten / max) * plotH;
        const by = plotH - (v.burned / max) * plotH;
        return (
          <G key={days[i]}>
            <Rect x={x} y={plotH - h} width={barW} height={h} rx={3} fill={v.eaten <= v.burned ? colors.accent : colors.danger} />
            <Line x1={x - 2} x2={x + barW + 2} y1={by} y2={by} stroke={colors.text} strokeWidth={2} />
          </G>
        );
      })}
      {showLabels
        ? days.map((d, i) => (
            <SvgText key={d} x={i * slot + slot / 2} y={height - 4} fontSize={11} fill={colors.textSecondary} textAnchor="middle">
              {formatDay(d, locale, { weekday: 'short' })}
            </SvgText>
          ))
        : null}
    </Svg>
  );
}

function WeightChart({ width, weights }: { width: number; weights: (number | null)[] }) {
  const { colors } = useApp();
  const height = 140;
  const pad = 16;
  const pts = weights.map((w, i) => (w == null ? null : { i, w })).filter((p): p is { i: number; w: number } => p != null);
  const min = Math.min(...pts.map((p) => p.w)) - 0.5;
  const max = Math.max(...pts.map((p) => p.w)) + 0.5;
  const x = (i: number) => (weights.length === 1 ? width / 2 : (i / (weights.length - 1)) * (width - 2 * pad) + pad);
  const y = (w: number) => pad + (1 - (w - min) / (max - min)) * (height - 2 * pad);
  const first = pts[0];
  const last = pts[pts.length - 1];

  return (
    <View>
      <Svg width={width} height={height}>
        <Polyline points={pts.map((p) => `${x(p.i)},${y(p.w)}`).join(' ')} fill="none" stroke={colors.protein} strokeWidth={2.5} />
        {pts.map((p) => (
          <Circle key={p.i} cx={x(p.i)} cy={y(p.w)} r={3.5} fill={colors.protein} />
        ))}
      </Svg>
      <T secondary size={13}>
        {first.w} → {last.w} ({last.w - first.w >= 0 ? '+' : ''}
        {(last.w - first.w).toFixed(1)})
      </T>
    </View>
  );
}
