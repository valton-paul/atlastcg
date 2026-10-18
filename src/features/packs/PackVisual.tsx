import { useEffect } from 'react';
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
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { colors } from '@/design-system/tokens';

const AnimatedG = Animated.createAnimatedComponent(G);

export type PackTier = 'classique' | 'premium' | 'legendaire';

type PackTheme = {
  from: string;
  to: string;
  accent: string;
  label: string;
  tier: PackTier | 'other';
  /** Sous-titre court sous le paquet (accueil / boutique). */
  blurb: (cards: number) => string;
};

export const PACK_THEMES: Record<string, PackTheme> = {
  classique: {
    from: '#1A3A4A',
    to: '#0A1822',
    accent: '#7EC8C4',
    label: 'Classique',
    tier: 'classique',
    blurb: (n) => `${n} cartes · jusqu’à Rare`,
  },
  premium: {
    from: '#1A1228',
    to: '#0A0614',
    accent: '#B794F4',
    label: 'Premium',
    tier: 'premium',
    blurb: (n) => `${n} cartes · 1 Rare minimum`,
  },
  legendaire: {
    from: '#1C160C',
    to: '#080604',
    accent: '#E8C67A',
    label: 'Légendaire',
    tier: 'legendaire',
    blurb: (n) => `${n} cartes · 1 Légendaire minimum`,
  },
  decouverte: {
    from: '#163044',
    to: '#08141F',
    accent: colors.turquoise,
    label: 'Découverte',
    tier: 'other',
    blurb: (n) => `${n} cartes`,
  },
  exploration: {
    from: '#182444',
    to: '#0A1020',
    accent: '#8FB4FF',
    label: 'Exploration',
    tier: 'other',
    blurb: (n) => `${n} cartes`,
  },
  patrimoine: {
    from: '#2A2114',
    to: '#0C0906',
    accent: colors.gold,
    label: 'Patrimoine',
    tier: 'other',
    blurb: (n) => `${n} cartes`,
  },
};

const FALLBACK: PackTheme = {
  from: colors.slate,
  to: colors.ink,
  accent: colors.gold,
  label: '',
  tier: 'other',
  blurb: (n) => `${n} cartes`,
};

export function packTheme(slug: string): PackTheme {
  return PACK_THEMES[slug] ?? FALLBACK;
}

export function packBlurb(slug: string, cardsPerPack: number): string {
  return packTheme(slug).blurb(cardsPerPack);
}

type Props = {
  slug: string;
  width?: number;
  /** 0–1 : intensité pendant la charge d’ouverture. */
  glow?: number;
  /** Micro-animations Premium / Légendaire (désactiver pour miniatures ou reduce motion). */
  animated?: boolean;
};

const RINGS: Record<PackTier | 'other', number[]> = {
  classique: [12, 22, 34, 48],
  premium: [10, 18, 28, 40, 54, 68, 84],
  legendaire: [8, 16, 24, 34, 46, 58, 72, 86, 100],
  other: [12, 22, 34, 48],
};

/** Paquet scellé : dos de carte cartographique — plus le tier monte, plus le dessin se « gravit ». */
export function PackVisual({ slug, width = 180, glow = 0, animated = true }: Props) {
  const theme = packTheme(slug);
  const height = width * 1.5;
  const id = `pack-${slug}-${Math.round(width)}`;
  const tier = theme.tier;
  const rings = RINGS[tier];
  const animate = animated && width >= 100 && (tier === 'premium' || tier === 'legendaire');

  const spin = useSharedValue(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    spin.set(
      withRepeat(withTiming(1, { duration: tier === 'legendaire' ? 18000 : 24000, easing: Easing.linear }), -1, false),
    );
    if (tier === 'legendaire' || tier === 'premium') {
      sweep.set(
        withRepeat(
          withSequence(
            withTiming(1, { duration: tier === 'legendaire' ? 1400 : 1800, easing: Easing.inOut(Easing.quad) }),
            withDelay(tier === 'legendaire' ? 1800 : 2600, withTiming(0, { duration: 0 })),
          ),
          -1,
          false,
        ),
      );
    }
    return () => {
      cancelAnimation(spin);
      cancelAnimation(sweep);
    };
  }, [animate, spin, sweep, tier]);

  const backCompassProps = useAnimatedProps(() => ({
    transform: `rotate(${spin.get() * 360} 50 68)` as unknown as string,
  }));
  // Balayage dans le viewBox SVG (clipé par le cadre, fiable sur web).
  const sweepProps = useAnimatedProps(() => {
    const p = sweep.get();
    return {
      opacity: interpolate(p, [0, 0.12, 0.5, 0.88, 1], [0, 0.55, 0.7, 0.55, 0]),
      transform: `translate(${interpolate(p, [0, 1], [-28, 110])} 0) rotate(18 9 75)` as unknown as string,
    };
  });

  const borderW = tier === 'legendaire' ? 2.4 : tier === 'premium' ? 1.8 : 1.45;
  const strokeOp = tier === 'classique' ? 0.72 : 0.78;
  // rx=12 dans le viewBox 100 → coin = 12 % de la largeur (évite le décalage clip / SVG).
  const corner = width * 0.12;
  const auraPad = tier === 'legendaire' ? 36 : tier === 'premium' ? 28 : tier === 'classique' ? 14 : 0;
  const glowSpread = tier === 'legendaire' ? 28 : tier === 'premium' ? 18 : 12;

  return (
    <View
      style={{ width: width + auraPad * 2, height: height + auraPad * 2, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Aura dans le padding : ne sera plus coupée par le parent. */}
      {auraPad > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.aura,
            {
              width,
              height,
              borderRadius: corner,
              boxShadow: `0 0 ${glowSpread}px ${glowSpread * 0.55}px ${theme.accent}${tier === 'legendaire' ? '66' : '44'}`,
            },
          ]}
        />
      ) : null}

      <View style={[styles.face, { width, height, borderRadius: corner }]}>
      <Svg width={width} height={height} viewBox="0 0 100 150">
        <Defs>
          <LinearGradient id={`${id}-body`} x1="0.25" y1="0" x2="0.75" y2="1">
            <Stop offset="0" stopColor={theme.from} />
            <Stop offset="1" stopColor={theme.to} />
          </LinearGradient>
          <LinearGradient id={`${id}-frame`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.accent} stopOpacity={tier === 'legendaire' ? 1 : 0.85} />
            <Stop offset="0.45" stopColor={theme.accent} stopOpacity={0.55} />
            <Stop offset="1" stopColor={theme.accent} stopOpacity={tier === 'legendaire' ? 0.95 : 0.8} />
          </LinearGradient>
          {/* Voile très léger, sans « pastille » de rareté au centre. */}
          <RadialGradient id={`${id}-core`} cx="50" cy="68" r="52" gradientUnits="userSpaceOnUse">
            <Stop
              offset="0"
              stopColor={theme.accent}
              stopOpacity={(tier === 'classique' ? 0.1 : 0.04) + glow * 0.12}
            />
            <Stop
              offset="0.55"
              stopColor={theme.accent}
              stopOpacity={(tier === 'classique' ? 0.04 : 0.02) + glow * 0.06}
            />
            <Stop offset="1" stopColor={theme.accent} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.22} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFF6D0" stopOpacity={0} />
            <Stop offset="0.45" stopColor="#FFF6D0" stopOpacity={0.75} />
            <Stop offset="1" stopColor="#FFF6D0" stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Rect x={2} y={2} width={96} height={146} rx={12} fill={`url(#${id}-body)`} />
        <Rect x={2} y={2} width={96} height={146} rx={12} fill={`url(#${id}-core)`} />

        <G opacity={strokeOp * 0.85} stroke={theme.accent} fill="none">
          <Path d="M10 28c16-8 26 6 42-2 14-7 24-9 38 3" strokeWidth={0.5} />
          <Path d="M8 34c18-7 30 8 48 0 14-6 24-7 36 5" strokeWidth={0.4} />
          {tier === 'classique' ? (
            <Path d="M12 40c14-5 26 6 42-1 12-5 22-5 34 3" strokeWidth={0.35} />
          ) : null}
          {tier === 'legendaire' ? (
            <>
              <Path d="M10 40c16-6 28 7 46-1 14-6 22-6 34 4" strokeWidth={0.35} />
              <Path d="M12 22c14-5 24 5 38-1 12-5 22-6 34 2" strokeWidth={0.35} />
            </>
          ) : null}
          <Path d="M10 122c14 7 28-7 46 2 14 7 26 9 36-3" strokeWidth={0.5} />
          <Path d="M8 128c16 5 30-8 48 0 14 6 24 7 36-5" strokeWidth={0.4} />
          {tier === 'classique' ? (
            <Path d="M12 134c14 4 26-5 42 1 12 4 22 4 34-3" strokeWidth={0.35} />
          ) : null}
          {tier === 'legendaire' ? (
            <>
              <Path d="M10 134c16 5 28-6 46 1 14 5 22 5 34-3" strokeWidth={0.35} />
              <Path d="M12 116c14 5 24-4 38 1 12 4 22 5 34-2" strokeWidth={0.35} />
            </>
          ) : null}
        </G>

        {/* Méridiens / parallèles — densifie le dos classique sans le surcharger. */}
        {tier === 'classique' ? (
          <G opacity={0.35} stroke={theme.accent} fill="none" strokeWidth={0.35}>
            <Path d="M50 30v76" />
            <Path d="M34 36c-2 10-2 22 0 34 2 12 2 24 0 34" />
            <Path d="M66 36c2 10 2 22 0 34-2 12-2 24 0 34" />
            <Path d="M22 68h56" />
          </G>
        ) : null}

        <G opacity={strokeOp} stroke={theme.accent} fill="none">
          {rings.map((r, i) => (
            <Ellipse key={r} cx={50} cy={68} rx={r * 0.48} ry={r * 0.34} strokeWidth={i === 0 ? 0.85 : 0.45} />
          ))}
        </G>

        {tier === 'legendaire' ? (
          <Circle
            cx={50}
            cy={68}
            r={18}
            fill="none"
            stroke={theme.accent}
            strokeWidth={0.7}
            strokeDasharray="1.6 1.8"
            opacity={0.85}
          />
        ) : null}

        {tier === 'premium' || tier === 'legendaire' ? (
          animate ? (
            <AnimatedG animatedProps={backCompassProps} opacity={0.35}>
              <Path d="M54 60l1.4 5.2 5.3 1.5-5.3 1.5L54 73.4l-1.4-5.2-5.3-1.5 5.3-1.5z" fill={theme.accent} />
            </AnimatedG>
          ) : (
            <G opacity={0.35}>
              <Path d="M54 60l1.4 5.2 5.3 1.5-5.3 1.5L54 73.4l-1.4-5.2-5.3-1.5 5.3-1.5z" fill={theme.accent} />
            </G>
          )
        ) : null}

        <G>
          <Path d="M50 56.5l2.4 8.8 8.9 2.5-8.9 2.5L50 79.1l-2.4-8.8-8.9-2.5 8.9-2.5z" fill={theme.accent} />
          <Circle cx={50} cy={68} r={1.6} fill={theme.to} />
        </G>

        {/* Reflet qui traverse le dos (Premium / Légendaire). */}
        {animate && (tier === 'premium' || tier === 'legendaire') ? (
          <AnimatedG animatedProps={sweepProps} pointerEvents="none">
            <Rect x={0} y={-10} width={18} height={170} fill={`url(#${id}-sweep)`} />
          </AnimatedG>
        ) : null}

        {tier === 'legendaire' ? (
          <G fill={theme.accent}>
            <Circle cx={22} cy={52} r={0.7} opacity={0.7} />
            <Circle cx={78} cy={48} r={0.55} opacity={0.55} />
            <Circle cx={26} cy={88} r={0.5} opacity={0.5} />
            <Circle cx={74} cy={92} r={0.65} opacity={0.65} />
            <Circle cx={50} cy={42} r={0.45} opacity={0.45} />
            <Circle cx={38} cy={100} r={0.5} opacity={0.5} />
            <Circle cx={64} cy={38} r={0.55} opacity={0.55} />
          </G>
        ) : null}

        {tier === 'classique' || tier === 'premium' ? (
          <G stroke={theme.accent} strokeWidth={tier === 'premium' ? 0.7 : 0.55} opacity={tier === 'premium' ? 0.75 : 0.65}>
            <Path d="M14 18h4M16 16v4" />
            <Path d="M82 18h4M84 16v4" />
            <Path d="M14 132h4M16 130v4" />
            <Path d="M82 132h4M84 130v4" />
          </G>
        ) : null}
        {tier === 'legendaire' ? (
          <G stroke={theme.accent} strokeWidth={1.1} fill="none" opacity={0.9}>
            <Path d="M12 22v-6h6" />
            <Path d="M88 22v-6h-6" />
            <Path d="M12 128v6h6" />
            <Path d="M88 128v6h-6" />
          </G>
        ) : null}

        <Rect
          x={2}
          y={2}
          width={96}
          height={146}
          rx={12}
          fill="none"
          stroke={`url(#${id}-frame)`}
          strokeWidth={borderW}
        />
        {tier === 'classique' || tier === 'premium' || tier === 'legendaire' ? (
          <Rect
            x={5.5}
            y={5.5}
            width={89}
            height={139}
            rx={10}
            fill="none"
            stroke={theme.accent}
            strokeWidth={tier === 'classique' ? 0.45 : 0.55}
            opacity={tier === 'classique' ? 0.4 : 0.55}
          />
        ) : null}
        {tier === 'legendaire' ? (
          <Rect
            x={8}
            y={8}
            width={84}
            height={134}
            rx={8}
            fill="none"
            stroke={theme.accent}
            strokeWidth={0.4}
            opacity={0.35}
          />
        ) : null}

        {tier === 'classique' || tier === 'premium' ? (
          <Rect
            x={3}
            y={6}
            width={8}
            height={138}
            rx={4}
            fill={`url(#${id}-shine)`}
            opacity={tier === 'premium' ? 0.5 : 0.35}
          />
        ) : null}

        {glow > 0 ? (
          <Rect x={2} y={2} width={96} height={146} rx={12} fill={theme.accent} opacity={glow * 0.12} />
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
  face: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});
