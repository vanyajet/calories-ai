import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemEditor } from '@/components/item-editor';
import { Button, Card, Input, MacroPills, T } from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { nowTime, parseTime, todayKey } from '@/lib/dates';
import { deleteEntry, getEntry, insertEntry, updateEntry } from '@/lib/db';
import { getDraft, setDraft, type Draft } from '@/lib/draft';
import { itemsTotal } from '@/lib/nutrition';
import { deletePhoto } from '@/lib/photos';
import type { FoodItem } from '@/lib/types';

type State = Draft & { time: string; keys: number[] };

let keySeq = 0;
const newKeys = (n: number) => Array.from({ length: n }, () => ++keySeq);

export default function ReviewScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const entryId = id ? Number(id) : null;
  const { t, colors, notifyDataChanged } = useApp();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<State | null>(() => {
    if (entryId) return null;
    const d = getDraft();
    return d ? { ...d, time: d.day === todayKey() ? nowTime() : '', keys: newKeys(d.items.length) } : null;
  });
  const saved = useRef(false);
  const draftPhoto = useRef<string | null>(state?.photoUri ?? null);

  useEffect(() => {
    if (!entryId) return;
    getEntry(db, entryId).then((e) => {
      if (e) setState({ day: e.day, title: e.title, photoUri: e.photoUri, source: e.source, items: e.items, time: e.time ?? '', keys: newKeys(e.items.length) });
    });
  }, [db, entryId]);

  // A new entry that is abandoned should not leave its photo behind.
  const navigation = useNavigation();
  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        if (entryId) return;
        if (!saved.current) deletePhoto(draftPhoto.current);
        setDraft(null);
      }),
    [navigation, entryId],
  );

  if (!state) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const total = itemsTotal(state.items);
  const setItem = (i: number, item: FoodItem) =>
    setState((s) => s && { ...s, items: s.items.map((x, j) => (j === i ? item : x)) });

  const save = async () => {
    const items = state.items.filter((i) => i.name.trim() || i.total.kcal > 0);
    if (items.length === 0) return;
    const title = state.title.trim() || items.map((i) => i.name.trim()).filter(Boolean).join(', ') || '—';
    const input = {
      day: state.day,
      time: parseTime(state.time),
      title,
      photoUri: state.photoUri,
      source: state.source,
      items,
    };
    if (entryId) await updateEntry(db, entryId, input);
    else await insertEntry(db, input);
    saved.current = true;
    notifyDataChanged();
    router.back();
  };

  const remove = () =>
    Alert.alert(t.deleteEntryQ, undefined, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(db, entryId!);
          deletePhoto(state.photoUri);
          notifyDataChanged();
          router.back();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: entryId ? t.editEntry : t.review }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 + insets.bottom }} keyboardShouldPersistTaps="handled">
        {state.photoUri ? (
          <Image source={{ uri: state.photoUri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 16 }} contentFit="cover" />
        ) : null}

        <Card>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Input
              label={t.title}
              value={state.title}
              onChangeText={(title) => setState({ ...state, title })}
              containerStyle={{ flex: 2 }}
            />
            <Input
              label={t.time}
              value={state.time}
              placeholder="--:--"
              keyboardType="numbers-and-punctuation"
              onChangeText={(time) => setState({ ...state, time })}
              containerStyle={{ flex: 1 }}
            />
          </View>
        </Card>

        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ gap: 4 }}>
            <T secondary size={13}>{t.total}</T>
            <MacroPills protein={total.protein} fat={total.fat} carbs={total.carbs} size={14} />
          </View>
          <T size={24} weight="700">
            {Math.round(total.kcal)} <T secondary size={14}>{t.kcal}</T>
          </T>
        </Card>

        {state.items.map((item, i) => (
          <ItemEditor
            key={state.keys[i]}
            item={item}
            onChange={(it) => setItem(i, it)}
            onRemove={
              state.items.length > 1
                ? () => setState({ ...state, items: state.items.filter((_, j) => j !== i), keys: state.keys.filter((_, j) => j !== i) })
                : undefined
            }
          />
        ))}

        <Button
          title={t.addItem}
          variant="secondary"
          icon={<Ionicons name="add" size={20} color={colors.text} />}
          onPress={() =>
            setState({
              ...state,
              keys: [...state.keys, ...newKeys(1)],
              items: [
                ...state.items,
                {
                  name: '',
                  grams: 100,
                  per100: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
                  total: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
                  macrosEstimated: false,
                  confidence: null,
                },
              ],
            })
          }
        />

        <Button title={t.save} onPress={save} />
        {entryId ? <Button title={t.delete} variant="danger" onPress={remove} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
