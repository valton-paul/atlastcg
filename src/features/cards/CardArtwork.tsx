import { Image } from 'expo-image';
import { useId, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

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

/**
 * Illustration plein cadre.
 * Pays → silhouette premium (piste atlas).
 * Capitales → photo de ville si dispo + médaillon pays, sinon hybride procédural.
 * Autres → photo licenciée ou scène procédurale.
 */
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
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(11, 20, 38, ${1 - saturate})` }]}
          />
        ) : null}
        {category === 'capital' && !locked ? (
          <CapitalMedallion isoNumeric={isoNumeric} rarity={rarity} />
        ) : null}
      </View>
    );
  }

  if (category === 'country') {
    return <CountryPremiumArt rarity={rarity} isoNumeric={isoNumeric} locked={locked} />;
  }
  if (category === 'capital') {
    return <CapitalHybridArt rarity={rarity} isoNumeric={isoNumeric} locked={locked} />;
  }
  return <ProceduralArtwork category={category} rarity={rarity} isoNumeric={isoNumeric} locked={locked} />;
}

/** Piste 1 — carte pays : silhouette dorée, relief discret, graticule d’atlas. */
function CountryPremiumArt({
  rarity,
  isoNumeric,
  locked,
}: {
  rarity: Rarity;
  isoNumeric: string | null;
  locked: boolean;
}) {
  const style = rarityStyles[rarity];
  const accent = locked ? colors.borderStrong : style.color;
  const silhouette = isoNumeric ? SILHOUETTES.paths[isoNumeric] : undefined;
  const uid = useId().replace(/:/g, '');
  const land = locked ? colors.slateRaised : mix(accent, '#D9B66C', 0.35);
  const landDeep = locked ? colors.slate : mix(accent, '#3A3222', 0.55);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={`${uid}-bg`} x1="0.2" y1="0" x2="0.85" y2="1">
            <Stop offset="0" stopColor={locked ? colors.slate : '#151C2A'} />
            <Stop offset="1" stopColor={locked ? colors.ink : '#0A101C'} />
          </LinearGradient>
          <LinearGradient id={`${uid}-land`} x1="0.3" y1="0.15" x2="0.7" y2="0.9">
            <Stop offset="0" stopColor={land} />
            <Stop offset="1" stopColor={landDeep} />
          </LinearGradient>
          <RadialGradient id={`${uid}-glow`} cx="50" cy="68" r="48" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={accent} stopOpacity={locked ? 0.06 : 0.2} />
            <Stop offset="1" stopColor={accent} stopOpacity={0} />
          </RadialGradient>
          {silhouette ? (
            <ClipPath id={`${uid}-clip`}>
              <Path d={silhouette} transform={`translate(${MAP_OFFSET_X} ${MAP_OFFSET_Y}) scale(${MAP_SCALE})`} />
            </ClipPath>
          ) : null}
        </Defs>

        <Rect x={0} y={0} width={100} height={150} fill={`url(#${uid}-bg)`} />
        <Rect x={0} y={0} width={100} height={150} fill={`url(#${uid}-glow)`} />

        {/* Graticule atlas */}
        <G opacity={locked ? 0.1 : 0.18} stroke={accent} strokeWidth={0.3} fill="none">
          {[26, 46, 66, 86, 106, 126].map((y) => (
            <Path key={`h-${y}`} d={`M6 ${y}H94`} />
          ))}
          {[16, 34, 52, 70, 88].map((x) => (
            <Path key={`v-${x}`} d={`M${x} 16V134`} />
          ))}
        </G>

        {silhouette ? (
          <G>
            <Path
              d={silhouette}
              fill={colors.nightDeep}
              fillOpacity={0.4}
              transform={`translate(${MAP_OFFSET_X + 1.4} ${MAP_OFFSET_Y + 2}) scale(${MAP_SCALE})`}
            />
            <Path
              d={silhouette}
              fill={`url(#${uid}-land)`}
              fillOpacity={locked ? 0.5 : 1}
              stroke={accent}
              strokeWidth={1.8}
              strokeLinejoin="round"
              transform={`translate(${MAP_OFFSET_X} ${MAP_OFFSET_Y}) scale(${MAP_SCALE})`}
            />
            {/* « Frontières » internes stylisées (relief / régions). */}
            <G clipPath={`url(#${uid}-clip)`} opacity={locked ? 0.15 : 0.32} stroke="#F2F5FA" fill="none">
              <Path d="M12 48 Q50 42 88 52" strokeWidth={0.55} />
              <Path d="M18 72 Q52 66 84 78" strokeWidth={0.45} />
              <Path d="M22 96 Q50 90 80 100" strokeWidth={0.45} />
              <Path d="M40 30 Q44 70 42 118" strokeWidth={0.4} />
              <Path d="M62 28 Q58 74 64 120" strokeWidth={0.4} />
            </G>
            <Path
              d={silhouette}
              fill="none"
              stroke="#F2F5FA"
              strokeOpacity={locked ? 0.15 : 0.35}
              strokeWidth={0.65}
              strokeLinejoin="round"
              transform={`translate(${MAP_OFFSET_X} ${MAP_OFFSET_Y}) scale(${MAP_SCALE})`}
            />
          </G>
        ) : (
          <Circle cx={50} cy={68} r={28} fill="none" stroke={accent} strokeWidth={1.2} opacity={0.5} />
        )}

        {locked ? <Rect x={0} y={0} width={100} height={150} fill={colors.nightDeep} opacity={0.45} /> : null}
      </Svg>
    </View>
  );
}

/** Piste 4 — capitale sans photo : ambiance urbaine + silhouette + pin. */
function CapitalHybridArt({
  rarity,
  isoNumeric,
  locked,
}: {
  rarity: Rarity;
  isoNumeric: string | null;
  locked: boolean;
}) {
  const style = rarityStyles[rarity];
  const accent = locked ? colors.borderStrong : style.color;
  const silhouette = isoNumeric ? SILHOUETTES.paths[isoNumeric] : undefined;
  const capitalPoint = isoNumeric ? SILHOUETTES.capitals?.[isoNumeric] : undefined;
  const uid = useId().replace(/:/g, '');
  const pin = capitalPoint
    ? {
        x: MAP_OFFSET_X + capitalPoint.x * MAP_SCALE,
        y: MAP_OFFSET_Y + capitalPoint.y * MAP_SCALE,
      }
    : { x: 50, y: 68 };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0.2" y2="1">
            <Stop offset="0" stopColor={locked ? colors.slate : '#1A2840'} />
            <Stop offset="0.55" stopColor={locked ? colors.ink : '#0E1A2E'} />
            <Stop offset="1" stopColor={locked ? colors.nightDeep : '#070D18'} />
          </LinearGradient>
          <LinearGradient id={`${uid}-glow`} x1="0.5" y1="0.35" x2="0.5" y2="1">
            <Stop offset="0" stopColor={accent} stopOpacity={locked ? 0.04 : 0.14} />
            <Stop offset="1" stopColor={accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={100} height={150} fill={`url(#${uid}-sky)`} />
        <Rect x={0} y={0} width={100} height={150} fill={`url(#${uid}-glow)`} />

        {/* Skyline abstrait */}
        {!locked ? (
          <G opacity={0.22} fill={accent}>
            <Rect x={8} y={102} width={10} height={28} />
            <Rect x={20} y={88} width={8} height={42} />
            <Rect x={30} y={96} width={12} height={34} />
            <Rect x={46} y={80} width={9} height={50} />
            <Rect x={58} y={92} width={11} height={38} />
            <Rect x={72} y={86} width={8} height={44} />
            <Rect x={84} y={100} width={10} height={30} />
          </G>
        ) : null}

        {/* Silhouette pays en filigrane */}
        {silhouette ? (
          <Path
            d={silhouette}
            fill={accent}
            fillOpacity={locked ? 0.12 : 0.2}
            stroke={accent}
            strokeWidth={1.2}
            strokeOpacity={locked ? 0.25 : 0.55}
            strokeLinejoin="round"
            transform={`translate(${MAP_OFFSET_X} ${MAP_OFFSET_Y}) scale(${MAP_SCALE})`}
          />
        ) : null}

        {!locked ? (
          <G transform={`translate(${pin.x} ${pin.y})`}>
            <Circle r={10} fill={colors.nightDeep} opacity={0.5} />
            <Circle r={7} fill={colors.nightDeep} stroke={accent} strokeWidth={1.6} />
            <Path
              d="M0 -3.6l1.1 2.2 2.4.3-1.8 1.65.5 2.4L0 1.8l-2.2 1.15.5-2.4-1.8-1.65 2.4-.3z"
              fill={accent}
            />
          </G>
        ) : null}

        {locked ? <Rect x={0} y={0} width={100} height={150} fill={colors.nightDeep} opacity={0.45} /> : null}
      </Svg>
      {!locked ? <CapitalMedallion isoNumeric={isoNumeric} rarity={rarity} /> : null}
    </View>
  );
}

/** Médaillon pays + pin capitale (coin bas-droit de l’illustration). */
function CapitalMedallion({ isoNumeric, rarity }: { isoNumeric: string | null; rarity: Rarity }) {
  const accent = rarityStyles[rarity].color;
  const silhouette = isoNumeric ? SILHOUETTES.paths[isoNumeric] : undefined;
  const capitalPoint = isoNumeric ? SILHOUETTES.capitals?.[isoNumeric] : undefined;
  const uid = useId().replace(/:/g, '');
  if (!silhouette) return null;

  const pin = capitalPoint ?? { x: 50, y: 50 };

  return (
    <View pointerEvents="none" style={styles.medallion}>
      <Svg width="100%" height="100%" viewBox="0 0 40 40">
        <Defs>
          <ClipPath id={`${uid}-m`}>
            <Circle cx={20} cy={20} r={17.5} />
          </ClipPath>
        </Defs>
        <Circle cx={20} cy={20} r={18.5} fill="rgba(7,13,26,0.82)" stroke={accent} strokeWidth={1.2} />
        <G clipPath={`url(#${uid}-m)`}>
          <Rect x={0} y={0} width={40} height={40} fill="#0E1A30" />
          <Path
            d={silhouette}
            fill={mix(accent, '#1A2A3A', 0.25)}
            stroke={accent}
            strokeWidth={1.4}
            strokeLinejoin="round"
            transform="translate(4 5) scale(0.32)"
          />
          <Circle
            cx={4 + pin.x * 0.32}
            cy={5 + pin.y * 0.32}
            r={1.8}
            fill={colors.nightDeep}
            stroke={accent}
            strokeWidth={0.7}
          />
          <Circle cx={4 + pin.x * 0.32} cy={5 + pin.y * 0.32} r={0.7} fill={accent} />
        </G>
      </Svg>
    </View>
  );
}

function ProceduralArtwork({
  category,
  rarity,
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
  const gradientId = `sky-${useId().replace(/:/g, '')}`;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky} />
            <Stop offset="1" stopColor={ground} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={150} fill={`url(#${gradientId})`} />
        <Circle cx={72} cy={28} r={14} fill={moon} opacity={locked ? 0.35 : 0.85} />
        <Scene category={category} accent={accent} locked={locked} />
        {locked ? <Rect x={0} y={0} width={100} height={150} fill={colors.nightDeep} opacity={0.45} /> : null}
      </Svg>
    </View>
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

const styles = StyleSheet.create({
  medallion: {
    position: 'absolute',
    right: '5%',
    bottom: '30%',
    width: '30%',
    aspectRatio: 1,
    maxWidth: 56,
    maxHeight: 56,
  },
});
