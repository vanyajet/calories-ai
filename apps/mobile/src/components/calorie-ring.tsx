import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { T } from './ui';
import { useApp } from '@/lib/app-context';

export function CalorieRing({ eaten, target, size = 168 }: { eaten: number; target: number; size?: number }) {
  const { colors, t } = useApp();
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = target > 0 ? eaten / target : 0;
  const over = eaten > target;
  const left = Math.round(target - eaten);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.ringTrack} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={over ? colors.danger : colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - Math.min(ratio, 1))}
        />
      </Svg>
      <T size={32} weight="700" style={{ color: over ? colors.danger : colors.text }}>
        {Math.abs(left)}
      </T>
      <T secondary size={13}>
        {over ? t.over : t.left}, {t.kcal}
      </T>
    </View>
  );
}
