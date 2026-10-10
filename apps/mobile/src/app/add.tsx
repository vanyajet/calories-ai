import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, T } from '@/components/ui';
import { AiError, analyzeMeal } from '@/lib/ai';
import { useApp } from '@/lib/app-context';
import { todayKey } from '@/lib/dates';
import { setDraft } from '@/lib/draft';
import { deletePhoto, storePhoto } from '@/lib/photos';

export default function AddScreen() {
  const { day = todayKey() } = useLocalSearchParams<{ day?: string }>();
  const { t, colors, settings } = useApp();
  const [photoUri, setPhotoState] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const baseText = useRef('');
  // The photo file belongs to this screen until it is handed to the review screen.
  const handedOff = useRef(false);
  const photoRef = useRef<string | null>(null);
  const setPhotoUri = (uri: string | null) => {
    photoRef.current = uri;
    setPhotoState(uri);
  };

  const navigation = useNavigation();
  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        if (!handedOff.current) deletePhoto(photoRef.current);
      }),
    [navigation],
  );

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (e) => {
    const transcript = e.results[0]?.transcript ?? '';
    setText(baseText.current ? `${baseText.current} ${transcript}` : transcript);
  });
  useSpeechRecognitionEvent('error', (e) => {
    setListening(false);
    if (e.error !== 'no-speech' && e.error !== 'aborted') Alert.alert(t.errors.mic, e.message);
  });

  const toggleMic = async () => {
    if (listening) return ExpoSpeechRecognitionModule.stop();
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return Alert.alert(t.errors.mic);
    baseText.current = text.trim();
    ExpoSpeechRecognitionModule.start({
      lang: settings.lang === 'ru' ? 'ru-RU' : 'en-US',
      interimResults: true,
      continuous: false,
    });
  };

  const pick = async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      }
      if (result.canceled || !result.assets?.[0]) return;
      const stored = await storePhoto(result.assets[0].uri);
      deletePhoto(photoUri);
      setPhotoUri(stored);
    } catch (e) {
      Alert.alert(t.errors.photo, String(e));
    }
  };

  const analyze = async () => {
    if (!photoUri && !text.trim()) return Alert.alert(t.errors.needInput);
    if (listening) ExpoSpeechRecognitionModule.stop();
    setBusy(true);
    try {
      const res = await analyzeMeal({ photoUri, text, lang: settings.lang, profile: settings.profile });
      handedOff.current = true;
      setDraft({ day, title: res.title, photoUri, source: photoUri ? 'photo' : 'text', items: res.items });
      router.replace('/review');
    } catch (e) {
      const code = e instanceof AiError ? e.code : 'server';
      Alert.alert(t.errors[code]);
    } finally {
      setBusy(false);
    }
  };

  const manual = () => {
    handedOff.current = true;
    setDraft({
      day,
      title: text.trim(),
      photoUri,
      source: 'manual',
      items: [
        {
          name: text.trim(),
          grams: null,
          per100: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
          total: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
          macrosEstimated: false,
          confidence: null,
        },
      ],
    });
    router.replace('/review');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {photoUri ? (
          <View>
            <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
            <Pressable
              onPress={() => {
                deletePhoto(photoUri);
                setPhotoUri(null);
              }}
              style={styles.removePhoto}>
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            title={t.takePhoto}
            variant="secondary"
            onPress={() => pick('camera')}
            icon={<Ionicons name="camera" size={20} color={colors.text} />}
            style={{ flex: 1 }}
          />
          <Button
            title={t.fromGallery}
            variant="secondary"
            onPress={() => pick('gallery')}
            icon={<Ionicons name="images" size={20} color={colors.text} />}
            style={{ flex: 1 }}
          />
        </View>

        <Card>
          <T secondary size={13}>{t.describe}</T>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={listening ? t.listening : t.describePlaceholder}
              placeholderTextColor={colors.textSecondary}
              multiline
              style={[styles.text, { color: colors.text, backgroundColor: colors.cardAlt }]}
            />
            <Pressable
              onPress={toggleMic}
              style={[styles.mic, { backgroundColor: listening ? colors.danger : colors.cardAlt }]}>
              <Ionicons name={listening ? 'stop' : 'mic'} size={22} color={listening ? '#fff' : colors.text} />
            </Pressable>
          </View>
        </Card>

        <Button
          title={busy ? t.analyzing : t.analyze}
          loading={busy}
          onPress={analyze}
          icon={busy ? undefined : <Ionicons name="sparkles" size={18} color={colors.accentText} />}
        />

        <Pressable onPress={manual} disabled={busy} style={{ alignItems: 'center', padding: 8, gap: 2 }}>
          <T weight="600" style={{ color: colors.accent }}>{t.manual}</T>
          <T secondary size={12}>{t.manualHint}</T>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16 },
  removePhoto: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minHeight: 88, borderRadius: 10, padding: 12, fontSize: 16, textAlignVertical: 'top' },
  mic: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
