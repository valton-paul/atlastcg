import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { decorativeSvgProps } from '@/design-system/decorative';

/**
 * Effets de mise en scène de l'ouverture. Tous sont décoratifs (ignorés par les lecteurs
 * d'écran), pilotés par une seule valeur partagée chacun, et se jouent une fois sauf les rayons.
 */

/** Pseudo-aléa déterministe dans [0, 1] : même dessin à chaque rendu. */
const jitter = (i: number) => Math.sin(i * 12.9898 + 4.1414) * 0.5 + 0.5;

function useOneShot(delay: number, duration: number) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) })));
    return () => cancelAnimation(progress);
  }, [progress, delay, duration]);
  return progress;
}

type BurstProps = {
  count: number;
  color: string;
  secondary?: string;
  distance: number;
  delay?: number;
  duration?: number;
  /** Direction moyenne en radians (par défaut : tout autour). */
  direction?: number;
  /** Ouverture du cône en radians (2π : gerbe circulaire). */
  spread?: number;
  /** Chute (positive) ou envol (négative) en fin de trajectoire, en points. */
  gravity?: number;
};

/** Gerbe d'étincelles en losange qui jaillissent du centre puis s'éteignent. */
export function ParticleBurst({
  count,
  color,
  secondary = '#FFFFFF',
  distance,
  delay = 0,
  duration = 700,
  direction = 0,
  spread = Math.PI * 2,
  gravity = 30,
}: BurstProps) {
  const progress = useOneShot(delay, duration);
  return (
    <View pointerEvents="none" style={styles.center} {...decorativeViewProps}>
      {Array.from({ length: count }, (_, i) => {
        const j = jitter(i);
        const angle =
          spread >= Math.PI * 2
            ? (i / count) * Math.PI * 2 + j * 0.5
            : direction - spread / 2 + spread * ((i + j) / count);
        return (
          <Spark
            key={i}
            progress={progress}
            dx={Math.cos(angle) * distance * (0.55 + j * 0.5)}
            dy={Math.sin(angle) * distance * (0.55 + j * 0.5)}
            gravity={gravity}
            size={4 + Math.round(j * 6)}
            color={i % 3 === 0 ? secondary : color}
          />
        );
      })}
    </View>
  );
}

type SparkProps = {
  progress: SharedValue<number>;
  dx: number;
  dy: number;
  gravity: number;
  size: number;
  color: string;
};

function Spark({ progress, dx, dy, gravity, size, color }: SparkProps) {
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p === 0 ? 0 : 1 - p * p,
      transform: [
        { translateX: dx * p },
        { translateY: dy * p + gravity * p * p },
        { rotate: '45deg' },
        { scale: 1 - 0.6 * p },
      ],
    };
  });
  return (
    <Animated.View
      style={[styles.spark, { width: size, height: size, backgroundColor: color, shadowColor: color }, style]}
    />
  );
}

/** Anneau qui s'élargit et s'efface : l'onde de choc de la révélation. */
export function Shockwave({
  color,
  size,
  delay = 0,
  duration = 650,
}: {
  color: string;
  size: number;
  delay?: number;
  duration?: number;
}) {
  const progress = useOneShot(delay, duration);
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return { opacity: p === 0 ? 0 : (1 - p) * 0.9, transform: [{ scale: 0.35 + p * 1.4 }] };
  });
  return (
    <View pointerEvents="none" style={styles.center} {...decorativeViewProps}>
      <Animated.View
        style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: color }, style]}
      />
    </View>
  );
}

function raysPath(count: number) {
  let d = '';
  const width = (Math.PI / count) * 0.45;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x1 = 50 + Math.cos(a - width) * 50;
    const y1 = 50 + Math.sin(a - width) * 50;
    const x2 = 50 + Math.cos(a + width) * 50;
    const y2 = 50 + Math.sin(a + width) * 50;
    d += `M50 50L${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}Z`;
  }
  return d;
}

const RAYS_12 = raysPath(12);
const RAYS_18 = raysPath(18);

/** Rayons de lumière qui tournent lentement derrière les cartes épiques et au-delà. */
export function LightRays({
  color,
  size,
  delay = 0,
  dense = false,
  reverse = false,
  intensity = 0.55,
}: {
  color: string;
  size: number;
  delay?: number;
  dense?: boolean;
  reverse?: boolean;
  intensity?: number;
}) {
  const spin = useSharedValue(0);
  const fade = useSharedValue(0);
  useEffect(() => {
    fade.set(withDelay(delay, withTiming(1, { duration: 450 })));
    spin.set(withRepeat(withTiming(1, { duration: dense ? 14000 : 10000, easing: Easing.linear }), -1, false));
    return () => {
      cancelAnimation(spin);
      cancelAnimation(fade);
    };
  }, [spin, fade, delay, dense]);
  const style = useAnimatedStyle(() => ({
    opacity: fade.get() * intensity,
    transform: [{ rotate: `${(reverse ? -360 : 360) * spin.get()}deg` }],
  }));
  const id = `rays-${dense ? 'd' : 's'}-${color.replace('#', '')}`;
  return (
    <View pointerEvents="none" style={styles.center} {...decorativeViewProps}>
      <Animated.View style={[{ width: size, height: size }, style]}>
        <Svg width={size} height={size} viewBox="0 0 100 100" {...decorativeSvgProps}>
          <Defs>
            <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
              {/* Centre creux : la lumière porte sur les bords pour ne pas écraser la carte. */}
              <Stop offset="0" stopColor={color} stopOpacity={0.08} />
              <Stop offset="0.42" stopColor={color} stopOpacity={0.55} />
              <Stop offset="0.78" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Path d={dense ? RAYS_18 : RAYS_12} fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Éclair plein écran, bref, pour les cartes légendaires et mythiques. */
export function ScreenFlash({
  color,
  peak = 0.6,
  duration = 480,
  delay = 0,
}: {
  color: string;
  peak?: number;
  duration?: number;
  delay?: number;
}) {
  const progress = useOneShot(delay, duration);
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return { opacity: p === 0 ? 0 : peak * (1 - p) };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: color }, style]}
      {...decorativeViewProps}
    />
  );
}

/** Halo radial qui gonfle derrière une carte prestige. */
export function CoronaBloom({
  color,
  size,
  delay = 0,
  intensity = 0.55,
}: {
  color: string;
  size: number;
  delay?: number;
  intensity?: number;
}) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(
      withDelay(
        delay,
        withRepeat(
          withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
          -1,
          true,
        ),
      ),
    );
    return () => cancelAnimation(pulse);
  }, [pulse, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: intensity * (0.45 + pulse.get() * 0.55),
    transform: [{ scale: 0.82 + pulse.get() * 0.22 }],
  }));
  const id = `corona-${color.replace('#', '')}`;
  return (
    <View pointerEvents="none" style={styles.center} {...decorativeViewProps}>
      <Animated.View style={[{ width: size, height: size }, style]}>
        <Svg width={size} height={size} viewBox="0 0 100 100" {...decorativeSvgProps}>
          <Defs>
            <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
              <Stop offset="0.28" stopColor={color} stopOpacity={0.7} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Path d="M50 0A50 50 0 1 1 49.9 0Z" fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Anneau orbitant autour de la carte. */
export function OrbitRing({
  color,
  size,
  delay = 0,
  reverse = false,
  dashed = true,
}: {
  color: string;
  size: number;
  delay?: number;
  reverse?: boolean;
  dashed?: boolean;
}) {
  const spin = useSharedValue(0);
  const fade = useSharedValue(0);
  useEffect(() => {
    fade.set(withDelay(delay, withTiming(1, { duration: 400 })));
    spin.set(withRepeat(withTiming(1, { duration: reverse ? 9000 : 6500, easing: Easing.linear }), -1, false));
    return () => {
      cancelAnimation(spin);
      cancelAnimation(fade);
    };
  }, [spin, fade, delay, reverse]);
  const style = useAnimatedStyle(() => ({
    opacity: fade.get() * 0.9,
    transform: [{ rotate: `${(reverse ? -360 : 360) * spin.get()}deg` }],
  }));
  return (
    <View pointerEvents="none" style={styles.center} {...decorativeViewProps}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: dashed ? 1.5 : 2.5,
            borderColor: color,
            borderStyle: dashed ? 'dashed' : 'solid',
          },
          style,
        ]}
      />
    </View>
  );
}

/** Poussière d'or / braises qui tombent du haut de la scène. */
export function FallingSparks({
  count,
  color,
  secondary = '#FFFFFF',
  width,
  height,
  delay = 0,
  duration = 1400,
}: {
  count: number;
  color: string;
  secondary?: string;
  width: number;
  height: number;
  delay?: number;
  duration?: number;
}) {
  const progress = useOneShot(delay, duration);
  return (
    <View pointerEvents="none" style={styles.center} {...decorativeViewProps}>
      {Array.from({ length: count }, (_, i) => {
        const j = jitter(i + 7);
        const x = (j - 0.5) * width;
        const fall = height * (0.55 + jitter(i + 19) * 0.7);
        const size = 2 + Math.round(j * 5);
        return (
          <DustMote
            key={i}
            progress={progress}
            x={x}
            fall={fall}
            size={size}
            color={i % 2 === 0 ? color : secondary}
            sway={12 + j * 18}
          />
        );
      })}
    </View>
  );
}

function DustMote({
  progress,
  x,
  fall,
  size,
  color,
  sway,
}: {
  progress: SharedValue<number>;
  x: number;
  fall: number;
  size: number;
  color: string;
  sway: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p === 0 ? 0 : p < 0.15 ? p * 6 : 1 - p,
      transform: [
        { translateX: x + Math.sin(p * 8) * sway },
        { translateY: -fall * 0.45 + fall * p },
        { rotate: '45deg' },
        { scale: 1 - 0.4 * p },
      ],
    };
  });
  return (
    <Animated.View
      style={[styles.spark, { width: size, height: size, backgroundColor: color, shadowColor: color }, style]}
    />
  );
}

/** Faille verticale qui s'ouvre (révélation mythique). */
export function MythicRift({ color, delay = 0 }: { color: string; delay?: number }) {
  const progress = useOneShot(delay, 720);
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    const open = p < 0.35 ? p / 0.35 : 1;
    const fade = p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45;
    return {
      opacity: p === 0 ? 0 : fade * 0.95,
      transform: [{ scaleY: 0.2 + open * 0.8 }, { scaleX: 0.35 + open * 2.4 }],
    };
  });
  return (
    <View pointerEvents="none" style={styles.center} {...decorativeViewProps}>
      <Animated.View style={[styles.rift, { backgroundColor: color, shadowColor: color }, style]} />
    </View>
  );
}

/**
 * Atmosphère derrière une révélation prestige.
 * Légendaire : vignette d'or. Mythique : éclipse, puis braise.
 */
export function PrestigeAtmosphere({
  kind,
  accent,
  delay = 0,
}: {
  kind: 'legendary' | 'mythic';
  accent: string;
  delay?: number;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      withDelay(
        delay,
        withTiming(1, { duration: kind === 'mythic' ? 900 : 600, easing: Easing.out(Easing.cubic) }),
      ),
    );
    return () => cancelAnimation(progress);
  }, [progress, delay, kind]);
  const veilStyle = useAnimatedStyle(() => {
    const p = progress.get();
    if (kind === 'mythic') {
      const eclipse = p < 0.45 ? p / 0.45 : Math.max(0.35, 1 - (p - 0.45) * 0.5);
      return { opacity: eclipse * 0.72 };
    }
    return { opacity: Math.min(0.38, p * 0.5) };
  });
  const glowStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: kind === 'mythic' ? Math.max(0, (p - 0.25) * 0.7) : p * 0.45,
      transform: [{ scale: 0.7 + p * 0.5 }],
    };
  });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} {...decorativeViewProps}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: kind === 'mythic' ? '#070308' : '#140E04' }, veilStyle]}
      />
      <View style={styles.center}>
        <Animated.View
          style={[
            {
              width: 340,
              height: 340,
              borderRadius: 170,
              backgroundColor: accent,
            },
            glowStyle,
          ]}
        />
      </View>
    </View>
  );
}

const decorativeViewProps = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants' as const,
};

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  spark: {
    position: 'absolute',
    borderRadius: 1.5,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  ring: { position: 'absolute', borderWidth: 3 },
  rift: {
    width: 8,
    height: 280,
    borderRadius: 8,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
});
