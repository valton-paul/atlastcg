import { Image } from 'expo-image';
import { useId, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors, rarityStyles } from '@/design-system/tokens';
import type { CardCategory, Rarity } from '@/features/catalog/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

import silhouettes from './data/silhouettes.json';

const SILHOUETTES = silhouettes as {
  size: number;
  paths: Record<string, string>;
  capitals?: Record<string, { x: number; y: number }>;
};

/** Placement de la silhouette dans le viewBox carte 100×150. */
const MAP_OFFSET_X = 4;
const MAP_OFFSET_Y = 14;
const MAP_SCALE = 0.92;

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

/** Illustration plein cadre. Sans photo licenciée, un paysage géométrique original est utilisé. */
export function CardArtwork({ category, rarity, isoNumeric, illustrationPath, locked = false }: Props) {
  const [failed, setFailed] = useState(false);
  const uri = locked ? null : illustrationUrl(illustrationPath);
  const saturate = locked ? 0 : rarityStyles[rarity].saturate;
  if (uri && !failed) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={{ uri }}
          style={[
            StyleSheet.absoluteFill,
            saturate < 1 && Platform.OS === 'web' ? ({ filter: `saturate(${saturate})` } as object) : null,
          ]}
          contentFit="cover"
          transition={200}
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
        {saturate < 1 && Platform.OS !== 'web' ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(11, 20, 38, ${1 - saturate})` }]} />
        ) : null}
      </View>
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
  const style = rarityStyles[rarity];
  const sky = locked ? colors.slate : style.artSurface;
  const ground = locked ? colors.ink : style.surface;
  const accent = locked ? colors.borderStrong : style.color;
  const moon = locked ? colors.border : mix(accent, '#F2F5FA', 0.45);
  const silhouette = isoNumeric ? SILHOUETTES.paths[isoNumeric] : undefined;
  const capitalPoint = isoNumeric ? SILHOUETTES.capitals?.[isoNumeric] : undefined;
  const gradientId = `sky-${useId().replace(/:/g, '')}`;
  const oceanId = `ocean-${useId().replace(/:/g, '')}`;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky} />
            <Stop offset="1" stopColor={ground} />
          </LinearGradient>
          <LinearGradient id={oceanId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={locked ? colors.slate : '#0E2438'} />
            <Stop offset="1" stopColor={locked ? colors.ink : '#16324A'} />
          </LinearGradient>
        </Defs>
        {category === 'country' || category === 'capital' ? (
          <>
            <Rect x={0} y={0} width={100} height={150} fill={`url(#${oceanId})`} />
            {/* Graticule léger — lit comme une carte, pas un simple fond uni. */}
            <G opacity={locked ? 0.12 : 0.22} stroke={accent} strokeWidth={0.35} fill="none">
              {[28, 50, 72, 94, 116].map((y) => (
                <Path key={`h-${y}`} d={`M4 ${y}H96`} />
              ))}
              {[18, 36, 54, 72, 90].map((x) => (
                <Path key={`v-${x}`} d={`M${x} 12V138`} />
              ))}
            </G>
            <CountryFigure
              silhouette={silhouette}
              capitalPoint={capitalPoint}
              accent={accent}
              locked={locked}
              showCapital={category === 'capital'}
            />
          </>
        ) : (
          <>
            <Rect x={0} y={0} width={100} height={150} fill={`url(#${gradientId})`} />
            <Circle cx={72} cy={28} r={14} fill={moon} opacity={locked ? 0.35 : 0.85} />
            <Scene category={category} accent={accent} locked={locked} />
          </>
        )}
        {locked ? <Rect x={0} y={0} width={100} height={150} fill={colors.nightDeep} opacity={0.45} /> : null}
      </Svg>
    </View>
  );
}

function CountryFigure({
  silhouette,
  capitalPoint,
  accent,
  locked,
  showCapital,
}: {
  silhouette: string | undefined;
  capitalPoint: { x: number; y: number } | undefined;
  accent: string;
  locked: boolean;
  showCapital: boolean;
}) {
  const landFill = locked ? colors.slateRaised : mix(accent, '#1A2A3A', 0.35);
  const landStroke = locked ? colors.borderStrong : accent;
  const pin = capitalPoint
    ? {
        x: MAP_OFFSET_X + capitalPoint.x * MAP_SCALE,
        y: MAP_OFFSET_Y + capitalPoint.y * MAP_SCALE,
      }
    : { x: 50, y: 68 };

  return (
    <G>
      {silhouette ? (
        <G transform={`translate(${MAP_OFFSET_X} ${MAP_OFFSET_Y}) scale(${MAP_SCALE})`}>
          {/* Ombre portée pour détacher le pays de l’océan. */}
          <Path
            d={silhouette}
            fill={colors.nightDeep}
            fillOpacity={locked ? 0.15 : 0.35}
            transform="translate(1.2 1.8)"
          />
          <Path
            d={silhouette}
            fill={landFill}
            fillOpacity={locked ? 0.45 : 0.92}
            stroke={landStroke}
            strokeWidth={2.1}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Trait intérieur pour renforcer le contour. */}
          <Path
            d={silhouette}
            fill="none"
            stroke={locked ? colors.border : '#F2F5FA'}
            strokeOpacity={locked ? 0.2 : 0.28}
            strokeWidth={0.7}
            strokeLinejoin="round"
          />
        </G>
      ) : (
        <Circle cx={50} cy={68} r={28} fill="none" stroke={accent} strokeWidth={1.2} opacity={0.5} />
      )}
      {showCapital && !locked ? (
        <G transform={`translate(${pin.x} ${pin.y})`}>
          <Circle r={8} fill={colors.nightDeep} opacity={0.45} />
          <Circle r={6.5} fill={colors.nightDeep} stroke={accent} strokeWidth={1.5} />
          <Path
            d="M0 -3.4l1.05 2.15 2.35.3-1.75 1.6.45 2.35L0 1.7l-2.1 1.15.45-2.35-1.75-1.6 2.35-.3z"
            fill={accent}
          />
        </G>
      ) : null}
    </G>
  );
}

function Scene({ category, accent, locked }: { category: CardCategory; accent: string; locked: boolean }) {
  const fill = locked ? colors.slateRaised : accent;
  switch (category) {
    case 'geography':
      return (
        <G>
          <Path d="M0 150 0 108 22 64 40 92 58 48 78 86 100 62 100 150z" fill={fill} opacity={0.55} />
          <Path d="M0 150 0 118 28 86 46 108 70 72 100 98 100 150z" fill={fill} opacity={0.85} />
        </G>
      );
    case 'monument':
      return (
        <G>
          <Path d="M0 150H100V118H0z" fill={fill} opacity={0.22} />
          <Path d="M38 118 50 36 62 118z" fill={fill} opacity={0.9} />
          <Rect x={47} y={70} width={6} height={18} fill={colors.nightDeep} opacity={0.35} />
        </G>
      );
    case 'history':
      return (
        <G>
          <Rect x={28} y={88} width={44} height={30} fill={fill} opacity={0.9} />
          <Path d="M24 88h52c0-18-12-32-26-32S24 70 24 88z" fill={fill} opacity={0.8} />
          <Circle cx={50} cy={70} r={22} fill={fill} opacity={0.35} />
        </G>
      );
    case 'capital':
      return (
        <G>
          <Rect x={0} y={108} width={100} height={42} fill={fill} opacity={0.2} />
          <Rect x={22} y={78} width={56} height={40} fill={fill} opacity={0.85} />
          <Rect x={34} y={90} width={10} height={12} fill={colors.nightDeep} opacity={0.35} />
          <Rect x={56} y={90} width={10} height={12} fill={colors.nightDeep} opacity={0.35} />
        </G>
      );
    case 'culture':
      return (
        <G>
          <Path d="M20 118c0-28 12-48 30-48s30 20 30 48H20z" fill={fill} opacity={0.85} />
          <Rect x={46} y={88} width={8} height={30} fill={colors.nightDeep} opacity={0.3} />
        </G>
      );
    case 'special':
      return (
        <G>
          {[
            [18, 24],
            [40, 18],
            [82, 40],
            [28, 48],
          ].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={1.4} fill={fill} opacity={0.7} />
          ))}
          <Path d="M50 42 56 58h18l-14 11 5 18-15-10-15 10 5-18-14-11h18z" fill={fill} opacity={0.8} />
        </G>
      );
    default:
      return (
        <G>
          <Path d="M0 150 0 112 100 96 100 150z" fill={fill} opacity={0.35} />
          <Path d="M18 112h64v8H18z" fill={fill} opacity={0.7} />
        </G>
      );
  }
}

function mix(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  if (!pa || !pb) return a;
  const m = (i: number) => Math.round(pa[i] + (pb[i] - pa[i]) * t);
  return `#${[m(0), m(1), m(2)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function hex(value: string): [number, number, number] | null {
  const raw = value.replace('#', '');
  if (raw.length !== 6) return null;
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
}
