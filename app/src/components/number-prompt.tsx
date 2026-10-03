import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, Input, T } from './ui';
import { useApp } from '@/lib/app-context';

/** Cross-platform numeric prompt (Alert.prompt is iOS-only). Mount only while open. */
export function NumberPrompt({
  title,
  hint,
  initial,
  onSubmit,
  onClose,
}: {
  title: string;
  hint?: string;
  initial: number | null;
  onSubmit: (v: number | null) => void;
  onClose: () => void;
}) {
  const { colors, t } = useApp();
  const [text, setText] = useState(initial == null ? '' : String(initial));

  const submit = () => {
    const n = parseFloat(text.replace(',', '.'));
    onSubmit(text.trim() === '' || Number.isNaN(n) ? null : n);
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <T size={18} weight="700">
              {title}
            </T>
            {hint ? <T secondary>{hint}</T> : null}
            <Input autoFocus value={text} onChangeText={setText} keyboardType="decimal-pad" onSubmitEditing={submit} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title={t.cancel} variant="secondary" onPress={onClose} style={{ flex: 1 }} />
              <Button title={t.save} onPress={submit} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 18, padding: 20, gap: 12 },
});
