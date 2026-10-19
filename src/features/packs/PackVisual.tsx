import { useEffect, useId, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { colors, fonts } from '@/design-system/tokens';
import { illustrationUrl } from '@/features/cards/CardArtwork';

/** Photos légendaires affichées en éventail sur le sachet. */
const FAN_CARDS = [
  { path: 'monuments/tour-eiffel.webp', stamp: 'FR', label: 'Paris' },
  { path: 'monuments/statue-de-la-liberte.webp', stamp: 'US', label: 'New York' },
  { path: 'monuments/mont-fuji.webp', stamp: 'JP', label: 'Fuji' },
] as const;

const AnimatedG = Animated.createAnimatedComponent(G);

export type PackTier = 'classique' | 'premium' | 'legendaire';

type PackTheme = {
  from: string;
  mid: string;
  to: string;
  accent: string;
  glow: string;
  seal: string;
  sealDark: string;
  label: string;
  tagline: string;
  tier: PackTier | 'other';
  /** Sous-titre court sous le paquet (accueil / boutique). */
  blurb: (cards: number) => string;
};

export const PACK_THEMES: Record<string, PackTheme> = {
  classique: {
    from: '#1A3A48',
    mid: '#122A36',
    to: '#0A1820',
    accent: '#7EC8C4',
    glow: '#3CC6C0',
    seal: '#C5D0DA',
    sealDark: '#7A8A98',
    label: 'Classique',
    tagline: 'Les merveilles du monde.',
    tier: 'classique',
    blurb: () => 'Les merveilles du monde.',
  },
  premium: {
    from: '#2A1848',
    mid: '#1A0E30',
    to: '#0C0618',
    accent: '#B794F4',
    glow: '#9B6FE8',
    seal: '#C4B0E8',
    sealDark: '#6E5A9A',
    label: 'Premium',
    tagline: "Cartes d'exception.",
    tier: 'premium',
    blurb: () => "Cartes d'exception.",
  },
  legendaire: {
    from: '#3A1418',
    mid: '#241018',
    to: '#10080A',
    accent: '#E8C67A',
    glow: '#F0A84A',
    seal: '#E8C67A',
    sealDark: '#8A6A28',
    label: 'Légendaire',
    tagline: 'Les trésors du monde.',
    tier: 'legendaire',
    blurb: () => 'Les trésors du monde.',
  },
  decouverte: {
    from: '#163044',
    mid: '#0E2030',
    to: '#08141F',
    accent: colors.turquoise,
    glow: colors.turquoise,
    seal: '#A8C0D0',
    sealDark: '#5A7080',
    label: 'Découverte',
    tagline: 'Premiers horizons.',
    tier: 'other',
    blurb: (n) => `${n} cartes`,
  },
  exploration: {
    from: '#182444',
    mid: '#101830',
    to: '#0A1020',
    accent: '#8FB4FF',
    glow: '#6A9AE8',
    seal: '#A8C0E8',
    sealDark: '#4A6088',
    label: 'Exploration',
    tagline: 'Plus loin sur la carte.',
    tier: 'other',
    blurb: (n) => `${n} cartes`,
  },
  patrimoine: {
    from: '#2A2114',
    mid: '#1A160E',
    to: '#0C0906',
    accent: colors.gold,
    glow: colors.gold,
    seal: '#D4B878',
    sealDark: '#7A6230',
    label: 'Patrimoine',
    tagline: 'Traces du passé.',
    tier: 'other',
    blurb: (n) => `${n} cartes`,
  },
};

const FALLBACK: PackTheme = {
  from: colors.slate,
  mid: colors.ink,
  to: colors.nightDeep,
  accent: colors.gold,
  glow: colors.gold,
  seal: '#C0C8D4',
  sealDark: '#6A7480',
  label: '',
  tagline: '',
  tier: 'other',
  blurb: (n) => `${n} cartes`,
};

export function packTheme(slug: string): PackTheme {
  return PACK_THEMES[slug] ?? FALLBACK;
}

export function packBlurb(slug: string, cardsPerPack: number): string {
  return packTheme(slug).blurb(cardsPerPack);
}

type Pt = { x: number; y: number };

/** Crénelage bord à bord (les dents forment le contour extérieur du sachet). */
function zigPoints(y: number, amp: number, fromX: number, toX: number, steps = 30): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({
      x: fromX + (toX - fromX) * t,
      y: y + (i % 2 === 0 ? 0 : amp),
    });
  }
  return pts;
}

function pathFrom(pts: Pt[], cmd: 'M' | 'L' = 'M'): string {
  return pts.map((p, i) => `${i === 0 ? cmd : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

const PACK_LEFT = 2.5;
const PACK_RIGHT = 97.5;
const SEAL_INNER_TOP = 17;
const SEAL_INNER_BOT = 133;

/** Mini-carte de l’éventail : photo monument + pastille pays. */
function MiniCard({
  x,
  y,
  rot,
  border,
  fill,
  photoUri,
  stamp,
  label,
  clipId,
}: {
  x: number;
  y: number;
  rot: number;
  border: string;
  fill: string;
  photoUri: string | null;
  stamp: string;
  label: string;
  clipId: string;
}) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${rot} 16 24)`}>
      <Defs>
        <ClipPath id={clipId}>
          <Rect x={0} y={0} width={32} height={48} rx={3} />
        </ClipPath>
        <LinearGradient id={`${clipId}-scrim`} x1="0" y1="0.55" x2="0" y2="1">
          <Stop offset="0" stopColor="#070D1A" stopOpacity={0} />
          <Stop offset="1" stopColor="#070D1A" stopOpacity={0.72} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={32} height={48} rx={3} fill={fill} />
      {photoUri ? (
        <SvgImage
          href={photoUri}
          x={0}
          y={0}
          width={32}
          height={48}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      ) : (
        <Path
          d="M8 30 L16 12 L24 30 Z M12 30 V36 H20 V30"
          fill={border}
          opacity={0.55}
          clipPath={`url(#${clipId})`}
        />
      )}
      <Rect
        x={0}
        y={0}
        width={32}
        height={48}
        rx={3}
        fill={`url(#${clipId}-scrim)`}
        clipPath={`url(#${clipId})`}
      />
      <Rect x={0} y={0} width={32} height={48} rx={3} fill="none" stroke={border} strokeWidth={1.25} />
      <Circle cx={6.5} cy={6.5} r={3.4} fill="rgba(7,13,26,0.82)" />
      <SvgText
        x={6.5}
        y={7.7}
        fontSize={3.1}
        fill="#F2F5FA"
        fontFamily={fonts.bodySemiBold}
        textAnchor="middle"
      >
        {stamp}
      </SvgText>
      {/* Glyphe mythique (soleil) en coin */}
      <Circle cx={25.5} cy={6.5} r={3.2} fill="rgba(7,13,26,0.75)" stroke={border} strokeWidth={0.5} />
      <Circle cx={25.5} cy={6.5} r={1.35} fill={border} />
      <SvgText
        x={16}
        y={43.5}
        fontSize={3.4}
        fill="#F2F5FA"
        fontFamily={fonts.display}
        textAnchor="middle"
      >
        {label}
      </SvgText>
    </G>
  );
}

type Props = {
  slug: string;
  width?: number;
  cardsPerPack?: number;
  /** 0–1 : intensité pendant la charge d’ouverture. */
  glow?: number;
  /** Micro-animations Premium / Légendaire (désactiver pour miniatures ou reduce motion). */
  animated?: boolean;
};

/** Paquet scellé façon sachet foil (bords crantés, bandes striées, éventail de cartes). */
export function PackVisual({
  slug,
  width = 180,
  cardsPerPack = 5,
  glow = 0,
  animated = true,
}: Props) {
  const theme = packTheme(slug);
  const height = width * 1.55;
  const uid = useId().replace(/:/g, '');
  const id = `pk-${slug}-${Math.round(width)}-${uid}`;
  const tier = theme.tier;
  const detailed = width >= 110;
  const animate = animated && detailed && (tier === 'premium' || tier === 'legendaire');

  const sweep = useSharedValue(0);
  useEffect(() => {
    if (!animate) return;
    sweep.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: tier === 'legendaire' ? 1600 : 2000, easing: Easing.inOut(Easing.quad) }),
          withDelay(tier === 'legendaire' ? 1400 : 2200, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(sweep);
  }, [animate, sweep, tier]);

  const sweepProps = useAnimatedProps(() => {
    const p = sweep.get();
    return {
      // Lueur foil discrète — pas un bandeau blanc opaque.
      opacity: interpolate(p, [0, 0.2, 0.5, 0.8, 1], [0, 0.18, 0.28, 0.18, 0]),
      transform: `translate(${interpolate(p, [0, 1], [-24, 118])} 0) rotate(18 5 75)` as unknown as string,
    };
  });

  const auraPad = tier === 'legendaire' ? 40 : tier === 'premium' ? 32 : tier === 'classique' ? 22 : 12;
  const glowSpread = tier === 'legendaire' ? 30 : tier === 'premium' ? 22 : 16;

  const { outline, sealTop, sealBot, bodyRect } = useMemo(() => {
    const top = zigPoints(6.2, -2.6, PACK_LEFT, PACK_RIGHT, 32);
    const bot = zigPoints(143.8, 2.6, PACK_RIGHT, PACK_LEFT, 32);
    const outlinePath = `${pathFrom(top, 'M')} ${pathFrom(bot, 'L')} Z`;
    const sealTopPath = `${pathFrom(top, 'M')} L${PACK_RIGHT} ${SEAL_INNER_TOP} L${PACK_LEFT} ${SEAL_INNER_TOP} Z`;
    const sealBotPath = `${pathFrom(bot, 'M')} L${PACK_LEFT} ${SEAL_INNER_BOT} L${PACK_RIGHT} ${SEAL_INNER_BOT} Z`;
    return {
      outline: outlinePath,
      sealTop: sealTopPath,
      sealBot: sealBotPath,
      bodyRect: {
        x: PACK_LEFT,
        y: SEAL_INNER_TOP,
        w: PACK_RIGHT - PACK_LEFT,
        h: SEAL_INNER_BOT - SEAL_INNER_TOP,
      },
    };
  }, []);

  return (
    <View
      style={{
        width: width + auraPad * 2,
        height: height + auraPad * 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {auraPad > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.aura,
            {
              width: width * 0.9,
              height: height * 0.86,
              borderRadius: width * 0.06,
              boxShadow: `0 0 ${glowSpread}px ${glowSpread * 0.65}px ${theme.glow}${
                tier === 'legendaire' ? '77' : tier === 'premium' ? '66' : '55'
              }`,
            },
          ]}
        />
      ) : null}

      <View style={{ width, height }}>
        <Svg width={width} height={height} viewBox="0 0 100 150">
          <Defs>
            <LinearGradient id={`${id}-body`} x1="0.15" y1="0" x2="0.9" y2="1">
              <Stop offset="0" stopColor={theme.from} />
              <Stop offset="0.45" stopColor={theme.mid} />
              <Stop offset="1" stopColor={theme.to} />
            </LinearGradient>
            <LinearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.45} />
              <Stop offset="0.18" stopColor="#000000" stopOpacity={0} />
              <Stop offset="0.82" stopColor="#000000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.5} />
            </LinearGradient>
            <LinearGradient id={`${id}-seal`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.seal} />
              <Stop offset="0.5" stopColor={theme.sealDark} />
              <Stop offset="1" stopColor={theme.seal} />
            </LinearGradient>
            <LinearGradient id={`${id}-foil`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.42" stopColor="#FFFFFF" stopOpacity={0.08} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.35" stopColor={theme.accent} stopOpacity={0.12} />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.35} />
              <Stop offset="0.65" stopColor={theme.accent} stopOpacity={0.1} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
            <ClipPath id={`${id}-clip`}>
              <Path d={outline} />
            </ClipPath>
            <ClipPath id={`${id}-body-clip`}>
              <Rect x={bodyRect.x} y={bodyRect.y} width={bodyRect.w} height={bodyRect.h} />
            </ClipPath>
          </Defs>

          {/* Silhouette complète (dents = bord extérieur) */}
          <Path d={outline} fill={`url(#${id}-body)`} />
          <Path d={outline} fill={`url(#${id}-side)`} />

          {/* Scellages : remplissent jusqu’aux dents, bord à bord */}
          <Path d={sealTop} fill={`url(#${id}-seal)`} />
          <Path d={sealBot} fill={`url(#${id}-seal)`} />

          {/* Stries du scellage sur toute la largeur */}
          {Array.from({ length: 24 }, (_, i) => {
            const x = PACK_LEFT + 1.2 + i * ((PACK_RIGHT - PACK_LEFT - 2.4) / 23);
            return (
              <G key={`s-${i}`}>
                <Rect
                  x={x}
                  y={5.2}
                  width={1.15}
                  height={SEAL_INNER_TOP - 6.2}
                  fill={theme.sealDark}
                  opacity={0.28 + (i % 3) * 0.07}
                />
                <Rect
                  x={x}
                  y={SEAL_INNER_BOT + 0.8}
                  width={1.15}
                  height={144.5 - SEAL_INNER_BOT}
                  fill={theme.sealDark}
                  opacity={0.28 + (i % 3) * 0.07}
                />
              </G>
            );
          })}

          {/* Reflet foil statique léger */}
          <Rect
            x={bodyRect.x}
            y={bodyRect.y}
            width={bodyRect.w}
            height={bodyRect.h}
            fill={`url(#${id}-foil)`}
            clipPath={`url(#${id}-body-clip)`}
          />

          {/* Contour du sachet (suit les dents) */}
          <Path
            d={outline}
            fill="none"
            stroke={theme.accent}
            strokeWidth={tier === 'legendaire' ? 1.2 : 0.9}
            opacity={0.65}
          />

          {/* Éventail : Eiffel · Liberté · Fuji */}
          <G clipPath={`url(#${id}-body-clip)`} opacity={detailed ? 1 : 0.95}>
            {[
              { x: 16, y: 40, rot: -13, fill: theme.to, card: FAN_CARDS[0] },
              { x: 34, y: 36, rot: 0, fill: theme.mid, card: FAN_CARDS[1] },
              { x: 52, y: 40, rot: 13, fill: theme.to, card: FAN_CARDS[2] },
            ].map((slot, i) => (
              <MiniCard
                key={slot.card.path}
                x={slot.x}
                y={slot.y}
                rot={slot.rot}
                border={theme.accent}
                fill={slot.fill}
                photoUri={illustrationUrl(slot.card.path)}
                stamp={slot.card.stamp}
                label={slot.card.label}
                clipId={`${id}-fan-${i}`}
              />
            ))}
          </G>

          {animate ? (
            <AnimatedG animatedProps={sweepProps} pointerEvents="none" clipPath={`url(#${id}-body-clip)`}>
              <Rect x={0} y={SEAL_INNER_TOP} width={9} height={SEAL_INNER_BOT - SEAL_INNER_TOP} fill={`url(#${id}-sweep)`} />
            </AnimatedG>
          ) : null}

          {glow > 0 ? <Path d={outline} fill={theme.glow} opacity={glow * 0.12} /> : null}

          {detailed ? (
            <>
              <SvgText
                x={50}
                y={32}
                fill="#F2F5FA"
                opacity={0.85}
                fontSize={4.2}
                fontFamily={fonts.bodySemiBold}
                letterSpacing={1.6}
                textAnchor="middle"
              >
                ATLAS
              </SvgText>
              <SvgText
                x={50}
                y={108}
                fill={theme.accent}
                fontSize={tier === 'legendaire' ? 8.5 : 9}
                fontFamily={fonts.displayBold}
                textAnchor="middle"
              >
                {theme.label}
              </SvgText>
              <SvgText
                x={50}
                y={116}
                fill="#A9B6CC"
                fontSize={3.6}
                fontFamily={fonts.body}
                textAnchor="middle"
              >
                {theme.tagline}
              </SvgText>
              {/* Pastille X CARTES */}
              <Rect
                x={32}
                y={121}
                width={36}
                height={9}
                rx={4.5}
                fill="rgba(7,13,26,0.55)"
                stroke={theme.accent}
                strokeWidth={0.7}
                opacity={0.95}
              />
              <SvgText
                x={50}
                y={127.2}
                fill={theme.accent}
                fontSize={3.4}
                fontFamily={fonts.bodySemiBold}
                letterSpacing={0.6}
                textAnchor="middle"
              >
                {`${cardsPerPack} CARTES`}
              </SvgText>
            </>
          ) : null}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  aura: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
});
