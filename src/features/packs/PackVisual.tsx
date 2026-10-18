import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors } from '@/design-system/tokens';

export const PACK_THEMES: Record<string, { from: string; to: string; accent: string; label: string }> = {
  decouverte: { from: '#1B3F63', to: '#0B1A33', accent: colors.turquoise, label: 'Découverte' },
  exploration: { from: '#1F2F5E', to: '#0D1430', accent: '#8FB4FF', label: 'Exploration' },
  patrimoine: { from: '#4A3820', to: '#17110A', accent: colors.gold, label: 'Patrimoine' },
};

const FALLBACK = { from: colors.slate, to: colors.ink, accent: colors.turquoise, label: '' };

export function packTheme(slug: string) {
  return PACK_THEMES[slug] ?? FALLBACK;
}

type Props = { slug: string; width?: number; glow?: number };

/** Paquet scellé : lignes topographiques et rose des vents, sans imagerie de casino. */
export function PackVisual({ slug, width = 180, glow = 0 }: Props) {
  const theme = packTheme(slug);
  const height = width * 1.4;
  const id = `pack-${slug}`;
  return (
    <View style={{ width, height }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox="0 0 100 140">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0" stopColor={theme.from} />
            <Stop offset="1" stopColor={theme.to} />
          </LinearGradient>
        </Defs>
        <Rect x={1} y={1} width={98} height={138} rx={9} fill={`url(#${id})`} stroke={theme.accent} strokeWidth={1} />
        <G opacity={0.35}>
          <Path d="M-5 32c18-10 30 6 48-2s32-14 62 0" stroke={theme.accent} strokeWidth={0.6} fill="none" />
          <Path d="M-5 44c20-8 34 8 52 0s30-12 58 2" stroke={theme.accent} strokeWidth={0.6} fill="none" />
          <Path d="M-5 98c16 8 32-6 50 2s36 12 60-2" stroke={theme.accent} strokeWidth={0.6} fill="none" />
          <Path d="M-5 110c18 6 30-8 50 0s34 10 60-4" stroke={theme.accent} strokeWidth={0.6} fill="none" />
          <Path
            d="M20 70c0-14 12-22 30-22s30 8 30 22-12 22-30 22-30-8-30-22z"
            stroke={theme.accent}
            strokeWidth={0.5}
            fill="none"
          />
          <Path
            d="M28 70c0-9 9-15 22-15s22 6 22 15-9 15-22 15-22-6-22-15z"
            stroke={theme.accent}
            strokeWidth={0.5}
            fill="none"
          />
        </G>
        <Rect x={0} y={16} width={100} height={3} fill={theme.accent} opacity={0.5 + glow * 0.5} />
        <G transform="translate(50 70)">
          <Circle r={13} fill={colors.nightDeep} opacity={0.6} stroke={theme.accent} strokeWidth={0.8} />
          <Path d="M0 -11l2.4 8.6L11 0l-8.6 2.4L0 11l-2.4-8.6L-11 0l8.6-2.4z" fill={theme.accent} />
          <Circle r={1.6} fill={colors.nightDeep} />
        </G>
        {glow > 0 ? (
          <Rect x={1} y={1} width={98} height={138} rx={9} fill={theme.accent} opacity={glow * 0.25} />
        ) : null}
      </Svg>
    </View>
  );
}
