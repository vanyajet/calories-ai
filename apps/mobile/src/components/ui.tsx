import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useApp } from '@/lib/app-context';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useApp();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

export function T({
  children,
  style,
  secondary,
  size = 15,
  weight,
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  secondary?: boolean;
  size?: number;
  weight?: TextStyle['fontWeight'];
  numberOfLines?: number;
}) {
  const { colors } = useApp();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ color: secondary ? colors.textSecondary : colors.text, fontSize: size, fontWeight: weight }, style]}>
      {children}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useApp();
  const bg =
    variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.cardAlt : 'transparent';
  const fg =
    variant === 'primary' ? colors.accentText : variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'danger' && { borderWidth: 1, borderColor: colors.danger },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <Text style={{ color: fg, fontSize: 16, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string; containerStyle?: StyleProp<ViewStyle> }) {
  const { colors } = useApp();
  const { label, containerStyle, style, ...rest } = props;
  return (
    <View style={[{ gap: 4 }, containerStyle]}>
      {label ? <T secondary size={13}>{label}</T> : null}
      <TextInput
        placeholderTextColor={colors.textSecondary}
        {...rest}
        style={[
          styles.input,
          { color: colors.text, backgroundColor: colors.cardAlt, borderColor: colors.border },
          style,
        ]}
      />
    </View>
  );
}

/** Text input bound to a number; empty string → null. */
export function NumberInput({
  value,
  onChange,
  label,
  placeholder,
  containerStyle,
  decimals = true,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label?: string;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
  decimals?: boolean;
}) {
  return (
    <Input
      label={label}
      placeholder={placeholder}
      containerStyle={containerStyle}
      keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
      defaultValue={value == null ? '' : String(value)}
      onChangeText={(s) => {
        const n = parseFloat(s.replace(',', '.'));
        onChange(s.trim() === '' || Number.isNaN(n) ? null : n);
      }}
    />
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  const { colors } = useApp();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.cardAlt }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: colors.card }]}>
            <Text style={{ color: active ? colors.text : colors.textSecondary, fontWeight: active ? '600' : '400' }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MacroPills({ protein, fat, carbs, size = 13 }: { protein: number; fat: number; carbs: number; size?: number }) {
  const { colors, t } = useApp();
  const item = (label: string, v: number, c: string) => (
    <Text style={{ fontSize: size, color: colors.textSecondary }}>
      <Text style={{ color: c, fontWeight: '700' }}>{label}</Text> {Math.round(v)}
    </Text>
  );
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {item(t.proteinShort, protein, colors.protein)}
      {item(t.fatShort, fat, colors.fat)}
      {item(t.carbsShort, carbs, colors.carbs)}
    </View>
  );
}

export const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  input: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  segmented: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
});
