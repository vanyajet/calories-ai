import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, Stack } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalorieRing } from "@/components/calorie-ring";
import { MonthPicker, WeekStrip } from "@/components/calendar";
import { NumberPrompt } from "@/components/number-prompt";
import { Card, MacroPills, T } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { addDays, formatDay, todayKey } from "@/lib/dates";
import { getDayLog, getEntries, setActiveKcal, setWeight } from "@/lib/db";
import { dayTarget, itemsTotal, sum } from "@/lib/nutrition";
import type { DayLog, Entry } from "@/lib/types";

export default function DayScreen() {
  const db = useSQLiteContext();
  const { t, colors, locale, settings, dataVersion, notifyDataChanged } =
    useApp();
  const insets = useSafeAreaInsets();
  const [day, setDay] = useState(todayKey);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [log, setLog] = useState<DayLog>({
    day,
    activeKcal: null,
    weightKg: null,
  });
  const [monthOpen, setMonthOpen] = useState(false);
  const [prompt, setPrompt] = useState<"activity" | "weight" | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getEntries(db, day), getDayLog(db, day)]).then(([e, l]) => {
      if (!alive) return;
      setEntries(e);
      setLog(l);
    });
    return () => {
      alive = false;
    };
  }, [db, day, dataVersion]);

  const profile = settings.profile!;
  const target = dayTarget(profile, log.activeKcal);
  const eaten = sum(entries.map((e) => itemsTotal(e.items)));

  const today = todayKey();
  const dayLabel =
    day === today
      ? t.today
      : day === addDays(today, -1)
        ? t.yesterday
        : day === addDays(today, 1)
          ? t.tomorrow
          : formatDay(day, locale, { weekday: "long" });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Pressable
              onPress={() => setMonthOpen(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <T size={18} weight="700" style={{ textTransform: "capitalize" }}>
                {dayLabel},{" "}
                {formatDay(day, locale, { day: "numeric", month: "long" })}
              </T>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
          ),
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 18 }}>
              <Pressable hitSlop={8} onPress={() => router.push("/stats")}>
                <Ionicons name="stats-chart" size={22} color={colors.text} />
              </Pressable>
              <Pressable hitSlop={8} onPress={() => router.push("/settings")}>
                <Ionicons
                  name="settings-outline"
                  size={22}
                  color={colors.text}
                />
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: 110 + insets.bottom,
        }}
      >
        <WeekStrip day={day} onChange={setDay} />

        <Card style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <CalorieRing eaten={eaten.kcal} target={target} />
          <View style={{ flex: 1, gap: 10 }}>
            <View>
              <T secondary size={13}>
                {t.eaten}
              </T>
              <T size={20} weight="700">
                {Math.round(eaten.kcal)}{" "}
                <T secondary size={14}>
                  / {target} {t.kcal}
                </T>
              </T>
            </View>
            <MacroBar
              label={t.protein}
              value={eaten.protein}
              color={colors.protein}
            />
            <MacroBar label={t.fat} value={eaten.fat} color={colors.fat} />
            <MacroBar
              label={t.carbs}
              value={eaten.carbs}
              color={colors.carbs}
            />
          </View>
        </Card>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable style={{ flex: 1 }} onPress={() => setPrompt("activity")}>
            <Card>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name="flame" size={16} color={colors.warning} />
                <T secondary size={13}>
                  {t.activity}
                </T>
              </View>
              <T size={18} weight="600">
                {log.activeKcal != null
                  ? `+${Math.round(log.activeKcal)} ${t.kcal}`
                  : t.notSet}
              </T>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => setPrompt("weight")}>
            <Card>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons
                  name="scale-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <T secondary size={13}>
                  {t.weight}
                </T>
              </View>
              <T size={18} weight="600">
                {log.weightKg != null ? `${log.weightKg} ${t.kg}` : t.notSet}
              </T>
            </Card>
          </Pressable>
        </View>

        {entries.length === 0 ? (
          <T
            secondary
            style={{ textAlign: "center", marginTop: 24, lineHeight: 22 }}
          >
            {t.noEntries}
          </T>
        ) : (
          entries.map((e) => <EntryRow key={e.id} entry={e} />)
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.push({ pathname: "/add", params: { day } })}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.accent,
            bottom: 24 + insets.bottom,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Ionicons name="add" size={32} color={colors.accentText} />
      </Pressable>

      {monthOpen ? (
        <MonthPicker
          day={day}
          onPick={setDay}
          onClose={() => setMonthOpen(false)}
        />
      ) : null}
      {prompt === "activity" ? (
        <NumberPrompt
          title={t.activity}
          hint={t.activityHint}
          initial={log.activeKcal}
          onClose={() => setPrompt(null)}
          onSubmit={async (v) => {
            await setActiveKcal(db, day, v);
            notifyDataChanged();
          }}
        />
      ) : null}
      {prompt === "weight" ? (
        <NumberPrompt
          title={t.weight}
          hint={t.weightHint}
          initial={log.weightKg}
          onClose={() => setPrompt(null)}
          onSubmit={async (v) => {
            await setWeight(db, day, v);
            notifyDataChanged();
          }}
        />
      ) : null}
    </View>
  );
}

function MacroBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const { t } = useApp();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View
        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }}
      />
      <T secondary size={13} style={{ flex: 1 }}>
        {label}
      </T>
      <T size={14} weight="600">
        {Math.round(value)} {t.g}
      </T>
    </View>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  const { colors, t } = useApp();
  const total = itemsTotal(entry.items);
  const estimated = entry.items.some((i) => i.macrosEstimated);
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/review", params: { id: String(entry.id) } })
      }
    >
      <Card
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 12,
        }}
      >
        {entry.photoUri ? (
          <Image
            source={{ uri: entry.photoUri }}
            style={styles.thumb}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.thumb,
              {
                backgroundColor: colors.cardAlt,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Ionicons
              name={
                entry.source === "manual"
                  ? "create-outline"
                  : "chatbubble-ellipses-outline"
              }
              size={22}
              color={colors.textSecondary}
            />
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <View
            style={{ flexDirection: "row", gap: 6, alignItems: "baseline" }}
          >
            {entry.time ? (
              <T secondary size={13}>
                {entry.time}
              </T>
            ) : null}
            <T weight="600" numberOfLines={1} style={{ flex: 1 }}>
              {entry.title}
            </T>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MacroPills
              protein={total.protein}
              fat={total.fat}
              carbs={total.carbs}
            />
            {estimated ? (
              <T secondary size={13}>
                {" "}
                ≈
              </T>
            ) : null}
          </View>
        </View>
        <T size={17} weight="700">
          {Math.round(total.kcal)}
          <T secondary size={12}>
            {" "}
            {t.kcal}
          </T>
        </T>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  thumb: { width: 56, height: 56, borderRadius: 12 },
});
