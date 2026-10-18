import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Text } from '@/design-system';
import { colors, radius, rarityStyles, type RarityKey } from '@/design-system/tokens';
import { AtlasCard, cardAccessibilityLabel, type AtlasCardData } from '@/features/cards/AtlasCard';

import { LightRays, ParticleBurst, Shockwave } from './effects';

const CARD_WIDTH = 260;
const CARD_HEIGHT = 400;

/**
 * Intensité de la mise en scène par rareté. Les retournements restent courts (≤ 520 ms) :
 * l'effet monte en puissance par les particules et la lumière, pas par l'attente.
 */
export const REVEAL_EFFECTS: Record<
  RarityKey,
  { flip: number; halo: number; sparks: number; ring: boolean; rays: 0 | 1 | 2; tease: boolean }
> = {
  common: { flip: 220, halo: 0, sparks: 0, ring: false, rays: 0, tease: false },
  uncommon: { flip: 240, halo: 0.25, sparks: 8, ring: true, rays: 0, tease: false },
  rare: { flip: 300, halo: 0.45, sparks: 12, ring: true, rays: 0, tease: true },
  epic: { flip: 380, halo: 0.6, sparks: 18, ring: true, rays: 1, tease: true },
  legendary: { flip: 460, halo: 0.8, sparks: 24, ring: true, rays: 1, tease: true },
  mythic: { flip: 520, halo: 0.95, sparks: 30, ring: true, rays: 2, tease: true },
};

type Props = {
  card: AtlasCardData;
  isNew: boolean;
  quantity: number;
  fragments: number;
  flipped: boolean;
  reduceMotion: boolean;
  onPress: () => void;
};

function CardBack({ shimmer }: { shimmer: boolean }) {
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (!shimmer) return;
    sweep.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withDelay(500, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(sweep);
  }, [shimmer, sweep]);
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sweep.get(), [0, 1], [-CARD_WIDTH, CARD_WIDTH * 1.4]) }, { rotate: '18deg' }],
  }));

  return (
    <View style={styles.back}>
      <Svg width={140} height={140} viewBox="0 0 56 56">
        <Circle cx={28} cy={28} r={26} fill="none" stroke={colors.gold} strokeWidth={1} />
        <Circle cx={28} cy={28} r={18} fill="none" stroke={colors.borderStrong} strokeWidth={0.8} />
        <Circle cx={28} cy={28} r={10} fill="none" stroke={colors.borderStrong} strokeWidth={0.5} />
        <Path d="M2 28h52M28 2v52" stroke={colors.borderStrong} strokeWidth={0.6} />
        <Path d="M28 10l3 15 15 3-15 3-3 15-3-15-15-3 15-3z" fill={colors.gold} />
      </Svg>
      {shimmer ? (
        <Animated.View pointerEvents="none" style={[styles.sweep, sweepStyle]}>
          <Svg width={70} height={CARD_HEIGHT * 1.6}>
            <Defs>
              <LinearGradient id="card-sweep" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.22} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width={70} height={CARD_HEIGHT * 1.6} fill="url(#card-sweep)" />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Doublon : la carte se voile et se change en fragments qui s'envolent vers le solde. */
function DuplicateConversion({ fragments, delay }: { fragments: number; delay: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withDelay(delay, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })));
    return () => cancelAnimation(progress);
  }, [progress, delay]);
  const veilStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.get() * 2) * 0.55 }));
  const labelStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p === 0 ? 0 : p < 0.2 ? p * 5 : 1,
      transform: [{ translateY: -40 * p }, { scale: 0.8 + 0.2 * Math.min(1, p * 3) }],
    };
  });
  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.veil, veilStyle]} />
      <ParticleBurst
        count={14}
        color={colors.gold}
        secondary="#FFF3D1"
        distance={150}
        delay={delay}
        duration={850}
        direction={-Math.PI / 2}
        spread={1.6}
        gravity={-40}
      />
      <View pointerEvents="none" style={styles.center}>
        <Animated.View style={[styles.fragmentChip, labelStyle]}>
          <Text variant="subheading" color={colors.gold}>
            +{fragments} fragments
          </Text>
        </Animated.View>
      </View>
    </>
  );
}

export function RevealCard({ card, isNew, quantity, fragments, flipped, reduceMotion, onPress }: Props) {
  const effect = REVEAL_EFFECTS[card.rarity];
  const accent = rarityStyles[card.rarity].color;
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const flip = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    enter.set(withTiming(1, { duration: 360, easing: Easing.out(Easing.back(1.6)) }));
    if (effect.tease) {
      // Avant-goût : une aura discrète trahit une carte peu ordinaire.
      glow.set(
        withRepeat(
          withSequence(withTiming(effect.halo * 0.35, { duration: 600 }), withTiming(effect.halo * 0.12, { duration: 600 })),
          -1,
          true,
        ),
      );
    }
  }, [enter, glow, effect, reduceMotion]);

  useEffect(() => {
    if (!flipped) return;
    if (reduceMotion) {
      flip.set(1);
      glow.set(effect.halo);
      return;
    }
    flip.set(withTiming(1, { duration: effect.flip, easing: Easing.inOut(Easing.cubic) }));
    glow.set(
      withDelay(
        effect.flip * 0.5,
        withRepeat(
          withSequence(withTiming(effect.halo, { duration: 700 }), withTiming(effect.halo * 0.65, { duration: 700 })),
          -1,
          true,
        ),
      ),
    );
  }, [flipped, reduceMotion, effect, flip, glow]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.get() * 1.5),
    transform: [
      { translateY: interpolate(enter.get(), [0, 1], [140, 0]) },
      { scale: interpolate(enter.get(), [0, 1], [0.6, 1]) },
      { rotate: `${interpolate(enter.get(), [0, 1], [-10, 0])}deg` },
    ],
  }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + Math.sin(flip.get() * Math.PI) * 0.08 }] }));
  const backStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - flip.get() }
      : {
          transform: [{ perspective: 900 }, { rotateY: `${interpolate(flip.get(), [0, 1], [0, 180])}deg` }],
          opacity: flip.get() < 0.5 ? 1 : 0,
        },
  );
  const frontStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: flip.get() }
      : {
          transform: [{ perspective: 900 }, { rotateY: `${interpolate(flip.get(), [0, 1], [180, 360])}deg` }],
          opacity: flip.get() >= 0.5 ? 1 : 0,
        },
  );
  const haloStyle = useAnimatedStyle(() => ({ opacity: glow.get(), transform: [{ scale: 1 + glow.get() * 0.12 }] }));

  const label = flipped
    ? cardAccessibilityLabel(card, { isNew, quantity })
    : 'Carte face cachée. Touchez pour la révéler.';
  const burstDelay = effect.flip * 0.5;
  const showEffects = flipped && !reduceMotion;

  return (
    <Animated.View style={[styles.stage, containerStyle]}>
      {showEffects && effect.rays > 0 ? (
        <>
          <LightRays color={accent} size={CARD_HEIGHT * 1.5} delay={burstDelay} />
          {effect.rays > 1 ? (
            <LightRays color="#FFFFFF" size={CARD_HEIGHT * 1.25} delay={burstDelay} dense reverse intensity={0.3} />
          ) : null}
        </>
      ) : null}
      {effect.halo > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.halo, { shadowColor: accent, backgroundColor: accent }, haloStyle]}
        />
      ) : null}
      {showEffects && effect.ring ? <Shockwave color={accent} size={CARD_HEIGHT} delay={burstDelay} /> : null}
      <Animated.View style={popStyle}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={flipped ? 'Passe à la carte suivante' : undefined}
          style={styles.pressable}
          testID="reveal-card"
        >
          <Animated.View style={[styles.face, backStyle]}>
            <CardBack shimmer={!reduceMotion && !flipped} />
          </Animated.View>
          <Animated.View style={[styles.face, frontStyle]}>
            <AtlasCard card={card} isNew={isNew} quantity={quantity} size="large" />
            {showEffects && !isNew ? <DuplicateConversion fragments={fragments} delay={effect.flip + 350} /> : null}
          </Animated.View>
        </Pressable>
      </Animated.View>
      {showEffects && effect.sparks > 0 ? (
        <ParticleBurst count={effect.sparks} color={accent} distance={CARD_HEIGHT * 0.65} delay={burstDelay} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { width: CARD_WIDTH + 40, height: CARD_HEIGHT + 40, alignItems: 'center', justifyContent: 'center' },
  pressable: { width: CARD_WIDTH, height: CARD_HEIGHT },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sweep: { position: 'absolute', top: -CARD_HEIGHT * 0.3, left: 0 },
  halo: {
    position: 'absolute',
    width: CARD_WIDTH + 16,
    height: CARD_HEIGHT - 20,
    borderRadius: radius.xl,
    shadowOpacity: 0.9,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  veil: { ...StyleSheet.absoluteFill, borderRadius: radius.lg, backgroundColor: colors.nightDeep },
  fragmentChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.goldSoft,
  },
});
