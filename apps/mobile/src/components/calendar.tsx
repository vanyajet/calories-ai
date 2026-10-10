import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { T } from './ui';
import { useApp } from '@/lib/app-context';
import { addDays, formatDay, fromDayKey, monthGrid, todayKey, toDayKey, weekDays } from '@/lib/dates';
import { getLoggedDays } from '@/lib/db';

function DayCell({ day, selected, logged, onPress }: { day: string; selected: boolean; logged: boolean; onPress: () => void }) {
  const { colors, locale } = useApp();
  const isToday = day === todayKey();
  return (
    <Pressable onPress={onPress} style={[styles.cell, selected && { backgroundColor: colors.accent }]}>
      <T size={11} style={{ color: selected ? colors.accentText : colors.textSecondary }}>
        {formatDay(day, locale, { weekday: 'short' })}
      </T>
      <T size={17} weight={isToday || selected ? '700' : '500'} style={{ color: selected ? colors.accentText : isToday ? colors.accent : colors.text }}>
        {fromDayKey(day).getDate()}
      </T>
      <View style={[styles.dot, { backgroundColor: logged ? (selected ? colors.accentText : colors.accent) : 'transparent' }]} />
    </Pressable>
  );
}

export function WeekStrip({ day, onChange }: { day: string; onChange: (d: string) => void }) {
  const db = useSQLiteContext();
  const { colors, dataVersion } = useApp();
  const days = weekDays(day);
  const [logged, setLogged] = useState<Set<string>>(new Set());

  useEffect(() => {
    getLoggedDays(db, days[0], days[6]).then(setLogged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, days[0], dataVersion]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable hitSlop={8} onPress={() => onChange(addDays(day, -7))}>
        <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
      </Pressable>
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
        {days.map((d) => (
          <DayCell key={d} day={d} selected={d === day} logged={logged.has(d)} onPress={() => onChange(d)} />
        ))}
      </View>
      <Pressable hitSlop={8} onPress={() => onChange(addDays(day, 7))}>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

/** Mount only while open, so it starts on the selected day's month. */
export function MonthPicker({ day, onPick, onClose }: { day: string; onPick: (d: string) => void; onClose: () => void }) {
  const db = useSQLiteContext();
  const { colors, locale, t } = useApp();
  const [cursor, setCursor] = useState(() => fromDayKey(day));
  const [logged, setLogged] = useState<Set<string>>(new Set());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const grid = monthGrid(year, month);

  useEffect(() => {
    getLoggedDays(db, toDayKey(new Date(year, month, 1)), toDayKey(new Date(year, month + 1, 0))).then(setLogged);
  }, [db, year, month]);

  const title = cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable hitSlop={10} onPress={() => setCursor(new Date(year, month - 1, 1))}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <T size={17} weight="700" style={{ textTransform: 'capitalize' }}>{title}</T>
            <Pressable hitSlop={10} onPress={() => setCursor(new Date(year, month + 1, 1))}>
              <Ionicons name="chevron-forward" size={22} color={colors.text} />
            </Pressable>
          </View>
          {grid.map((row, i) => (
            <View key={i} style={{ flexDirection: 'row' }}>
              {row.map((d, j) =>
                d ? (
                  <Pressable
                    key={d}
                    onPress={() => {
                      onPick(d);
                      onClose();
                    }}
                    style={[styles.monthCell, d === day && { backgroundColor: colors.accent }]}>
                    <T weight={d === todayKey() ? '700' : '400'} style={{ color: d === day ? colors.accentText : d === todayKey() ? colors.accent : colors.text }}>
                      {fromDayKey(d).getDate()}
                    </T>
                    <View style={[styles.dot, { backgroundColor: logged.has(d) ? (d === day ? colors.accentText : colors.accent) : 'transparent' }]} />
                  </Pressable>
                ) : (
                  <View key={`e${j}`} style={styles.monthCell} />
                ),
              )}
            </View>
          ))}
          <Pressable
            onPress={() => {
              onPick(todayKey());
              onClose();
            }}
            style={{ alignSelf: 'center', padding: 8 }}>
            <T weight="600" style={{ color: colors.accent }}>{t.today}</T>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cell: { alignItems: 'center', paddingVertical: 6, width: 42, borderRadius: 12, gap: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  sheet: { borderRadius: 18, padding: 16, gap: 6 },
  monthCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, gap: 2 },
});
