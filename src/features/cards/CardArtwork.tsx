import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { CardCategory, Rarity } from '@/features/catalog/types';
import { colors, rarityStyles } from '@/design-system/tokens';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

import silhouettes from './data/silhouettes.json';

const SILHOUETTES = silhouettes as { size: number; paths: Record<string, string> };

const CATEGORY_TINT: Record<CardCategory, [string, string]> = {
  country: ['#17345A', '#0D1B33'],
  capital: ['#1F2D55', '#0C1530'],
  culture: ['#3A2546', '#141022'],
  monument: ['#3B3020', '#15110B'],
  geography: ['#173E3C', '#0A1A1E'],
  history: ['#3A2A22', '#140E0C'],
  special: ['#2B2B4A', '#10101E'],
};

export function illustrationUrl(path: string | null): string | null {
  if (!path || !isSupabaseConfigured()) return null;
  return getSupabase().storage.from('card-illustrations').getPublicUrl(path).data.publicUrl;
}

type Props = {
  category: CardCategory;
  rarity: Rarity;
  isoNumeric: string | null;
  illustrationPath: string | null;
  locked?: boolean;
};

/** Illustration de carte. Sans image licenciée, un rendu cartographique original est utilisé. */
export function CardArtwork({ category, rarity, isoNumeric, illustrationPath, locked = false }: Props) {
  const [failed, setFailed] = useState(false);
  const uri = locked ? null : illustrationUrl(illustrationPath);
  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return <ProceduralArtwork category={category} rarity={rarity} isoNumeric={isoNumeric} locked={locked} />;
}

function ProceduralArtwork({
  category,
  rarity,
  isoNumeric,
  locked,
}: {
  category: CardCategory;
  rarity: Rarity;
  isoNumeric: string | null;
  locked: boolean;
}) {
  const [from, to] = locked ? [colors.slate, colors.ink] : CATEGORY_TINT[category];
  const accent = locked ? colors.borderStrong : rarityStyles[rarity].color;
  const silhouette = isoNumeric ? SILHOUETTES.paths[isoNumeric] : undefined;
  const gradientId = `bg-${category}-${locked ? 'l' : 'u'}`;
  const showSilhouetteLarge = category === 'country' || category === 'capital';
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} fill={`url(#${gradientId})`} />
        <G opacity={0.18}>
          {[20, 40, 60, 80].map((v) => (
            <Path key={`h${v}`} d={`M0 ${v}H100`} stroke={colors.text} strokeWidth={0.2} />
          ))}
          {[20, 40, 60, 80].map((v) => (
            <Path key={`v${v}`} d={`M${v} 0V100`} stroke={colors.text} strokeWidth={0.2} />
          ))}
        </G>
        {silhouette ? (
          <G
            opacity={showSilhouetteLarge ? 0.95 : 0.28}
            transform={showSilhouetteLarge ? 'translate(10 10) scale(0.8)' : 'translate(0 0) scale(1)'}
          >
            <Path
              d={silhouette}
              fill={locked ? colors.slateRaised : accent}
              fillOpacity={showSilhouetteLarge ? 0.22 : 0.4}
              stroke={accent}
              strokeWidth={showSilhouetteLarge ? 1.2 : 0.8}
              strokeLinejoin="round"
            />
          </G>
        ) : null}
        {!locked && category === 'capital' ? (
          <G transform="translate(50 50)">
            <Circle r={6} fill={colors.night} stroke={accent} strokeWidth={1.2} />
            <Path d="M0 -3.4l1 2.2 2.4.3-1.8 1.6.5 2.4L0 1.9l-2.1 1.1.5-2.4-1.8-1.6 2.4-.3z" fill={accent} />
          </G>
        ) : null}
        {!locked && !showSilhouetteLarge ? <CategoryEmblem category={category} color={accent} /> : null}
        {locked ? (
          <G transform="translate(50 50)">
            <Circle r={11} fill={colors.night} opacity={0.8} />
            <Path
              d="M-4.5 -1.5h9v8h-9zM-3 -1.5v-3a3 3 0 0 1 6 0v3"
              stroke={colors.textMuted}
              strokeWidth={1.4}
              fill="none"
            />
          </G>
        ) : null}
      </Svg>
    </View>
  );
}

function CategoryEmblem({ category, color }: { category: CardCategory; color: string }) {
  const stroke = {
    stroke: color,
    strokeWidth: 1.6,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (category) {
    case 'monument':
      return (
        <G transform="translate(30 28)">
          <Path {...stroke} d="M4 14 20 4l16 10M6 14h28M9 16v20M17 16v20M23 16v20M31 16v20M4 38h32M2 42h36" />
        </G>
      );
    case 'geography':
      return (
        <G transform="translate(24 32)">
          <Path {...stroke} d="M2 34 18 8l9 14 6-8 17 20zM14 15l4 4 4-5" />
          <Circle {...stroke} cx={42} cy={6} r={4} />
        </G>
      );
    case 'culture':
      return (
        <G transform="translate(30 28)">
          <Path {...stroke} d="M20 2c8 6 16 6 18 4v14c0 12-8 20-18 22C10 40 2 32 2 20V6c2 2 10 2 18-4z" />
          <Path {...stroke} d="M11 18c2-2 4-2 6 0M23 18c2-2 4-2 6 0M12 28c4 4 12 4 16 0" />
        </G>
      );
    case 'history':
      return (
        <G transform="translate(30 30)">
          <Path {...stroke} d="M6 4h28v32H6zM6 4c-4 0-4 6 0 6M34 36c4 0 4-6 0-6M12 14h16M12 20h16M12 26h10" />
        </G>
      );
    default:
      return (
        <G transform="translate(50 50)">
          <Circle {...stroke} r={14} />
          <Path {...stroke} d="M6 -6 -3 -2 -6 6 3 2z" />
        </G>
      );
  }
}
