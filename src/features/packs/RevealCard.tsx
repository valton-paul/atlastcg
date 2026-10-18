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
import { colors, radius, rarityStyles, spacing, type RarityKey } from '@/design-system/tokens';
import { AtlasCard, cardAccessibilityLabel, type AtlasCardData } from '@/features/cards/AtlasCard';

import { FallingSparks, LightRays, MythicRift, ParticleBurst, Shockwave } from './effects';

const CARD_WIDTH = 260;
const CARD_HEIGHT = 390;

/**
 * Intensité de la mise en scène par rareté.
 * Commune = flip sec · prestige = hold face cachée puis flip lent.
 */
export const REVEAL_EFFECTS: Record<
  RarityKey,
  {
    flip: number;
    /** Silence doré avant le retournement (ms) — le dos pulse plus fort. */
    suspend: number;
    halo: number;
    sparks: number;
    ring: boolean;
    rays: 0 | 1 | 2;
    tease: boolean;
  }
> = {
  common: { flip: 280, suspend: 0, halo: 0, sparks: 0, ring: false, rays: 0, tease: false },
  uncommon: { flip: 300, suspend: 0, halo: 0.2, sparks: 6, ring: false, rays: 0, tease: true },
  rare: { flip: 340, suspend: 80, halo: 0.35, sparks: 10, ring: true, rays: 0, tease: true },
  epic: { flip: 420, suspend: 160, halo: 0.5, sparks: 16, ring: true, rays: 1, tease: true },
  legendary: { flip: 820, suspend: 780, halo: 0.82, sparks: 28, ring: true, rays: 2, tease: true },
  mythic: { flip: 980, suspend: 1100, halo: 0.95, sparks: 40, ring: true, rays: 2, tease: true },
};

/** Délai après le flip avant de lancer la conversion doublon (la carte reste intacte d’abord). */
export const DUPLICATE_CONVERT_DELAY = 900;

type Props = {
  card: AtlasCardData;
  isNew: boolean;
  quantity: number;
  fragments: number;
  flipped: boolean;
  reduceMotion: boolean;
  onPress: () => void;
  /** Appelé quand la conversion doublon démarre (pour animer le compteur). */
  onDuplicateConvert?: (fragments: number) => void;
};

function CardBack({
  shimmer,
  accent,
  borderWidth,
  glowPulse,
}: {
  shimmer: boolean;
  accent: string;
  borderWidth: number;
  glowPulse: number;
}) {
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (!shimmer) return;
    sweep.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withDelay(700, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(sweep);
  }, [shimmer, sweep]);
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sweep.get(), [0, 1], [-CARD_WIDTH, CARD_WIDTH * 1.4]) }, { rotate: '22deg' }],
  }));

  return (
    <View
      style={[
        styles.back,
        {
          borderColor: accent,
          borderWidth,
          boxShadow: glowPulse > 0 ? `0 0 ${18 + glowPulse * 28}px ${accent}99` : undefined,
        },
      ]}
    >
      <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="back-stripes" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={accent} stopOpacity={0} />
            <Stop offset="0.5" stopColor={accent} stopOpacity={0.08} />
            <Stop offset="1" stopColor={accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {Array.from({ length: 8 }, (_, i) => (
          <Path
            key={i}
            d={`M${-40 + i * 48} 0 L${40 + i * 48} ${CARD_HEIGHT}`}
            stroke={accent}
            strokeWidth={10}
            strokeOpacity={0.06}
          />
        ))}
      </Svg>
      <Svg width={120} height={120} viewBox="0 0 56 56">
        <Circle cx={28} cy={28} r={26} fill="none" stroke={accent} strokeWidth={1.2} />
        <Circle cx={28} cy={28} r={18} fill="none" stroke={accent} strokeWidth={0.7} opacity={0.55} />
        <Path d="M28 10l3 15 15 3-15 3-3 15-3-15-15-3 15-3z" fill={accent} />
      </Svg>
      {shimmer ? (
        <Animated.View pointerEvents="none" style={[styles.sweep, sweepStyle]}>
          <Svg width={64} height={CARD_HEIGHT * 1.6}>
            <Defs>
              <LinearGradient id="card-sweep" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.28} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width={64} height={CARD_HEIGHT * 1.6} fill="url(#card-sweep)" />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * Conversion doublon : la carte reste lisible.
 * Badge discret, puis gerbe de fragments vers le haut-droite (compteur).
 */
function DuplicateConversion({
  fragments,
  delay,
  onConvert,
}: {
  fragments: number;
  delay: number;
  onConvert?: (fragments: number) => void;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withDelay(delay, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) })));
    const timer = setTimeout(() => onConvert?.(fragments), delay);
    return () => {
      cancelAnimation(progress);
      clearTimeout(timer);
    };
  }, [progress, delay, fragments, onConvert]);

  const badgeStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p === 0 ? 0 : Math.min(1, p * 4),
      transform: [{ translateY: interpolate(p, [0, 0.3, 1], [12, 0, -6]) }, { scale: 0.9 + Math.min(1, p * 3) * 0.1 }],
    };
  });
  const cardDimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - progress.get() * 0.06 }],
  }));

  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, cardDimStyle]} />
      <ParticleBurst
        count={16}
        color={colors.gold}
        secondary="#FFF3D1"
        distance={180}
        delay={delay}
        duration={900}
        direction={-Math.PI / 3.2}
        spread={0.9}
        gravity={-55}
      />
      <View pointerEvents="none" style={styles.badgeSlot}>
        <Animated.View style={[styles.dupBadge, badgeStyle]}>
          <Text variant="caption" color={colors.gold}>
            Doublon
          </Text>
        </Animated.View>
      </View>
    </>
  );
}

function StatusBadge({ label, color, delay }: { label: string; color: string; delay: number }) {
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.set(withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.back(1.3)) })));
    return () => cancelAnimation(enter);
  }, [enter, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: enter.get(),
    transform: [{ translateY: (1 - enter.get()) * 10 }, { scale: 0.9 + enter.get() * 0.1 }],
  }));
  return (
    <Animated.View style={[styles.statusBadge, { backgroundColor: color }, style]} accessibilityElementsHidden>
      <Text variant="caption" color={colors.nightDeep} style={styles.statusBadgeText}>
        {label}
      </Text>
    </Animated.View>
  );
}

function LegendarySpectacle({ accent, delay }: { accent: string; delay: number }) {
  return (
    <>
      <LightRays color={accent} size={CARD_HEIGHT * 1.85} delay={delay} intensity={0.45} />
      <LightRays color="#FFF6D0" size={CARD_HEIGHT * 1.4} delay={delay} dense reverse intensity={0.22} />
      <Shockwave color={accent} size={CARD_HEIGHT * 1.05} delay={delay} duration={720} />
      <ParticleBurst count={28} color={accent} secondary="#FFF6D0" distance={CARD_HEIGHT * 0.72} delay={delay} />
      <FallingSparks
        count={14}
        color={accent}
        secondary="#FFF6D0"
        width={CARD_WIDTH + 20}
        height={CARD_HEIGHT}
        delay={delay + 60}
      />
    </>
  );
}

function MythicSpectacle({ accent, delay }: { accent: string; delay: number }) {
  return (
    <>
      <MythicRift color={accent} delay={Math.max(0, delay - 160)} />
      <LightRays color={accent} size={CARD_HEIGHT * 2} delay={delay} intensity={0.55} />
      <LightRays color="#FFD0A8" size={CARD_HEIGHT * 1.5} delay={delay} dense reverse intensity={0.28} />
      <Shockwave color={accent} size={CARD_HEIGHT * 1.1} delay={delay} duration={600} />
      <Shockwave color="#FFB347" size={CARD_HEIGHT * 1.35} delay={delay + 100} duration={780} />
      <ParticleBurst count={24} color={accent} secondary="#FFB347" distance={CARD_HEIGHT * 0.7} delay={delay} />
      <ParticleBurst
        count={18}
        color="#FFFFFF"
        secondary={accent}
        distance={CARD_HEIGHT * 0.9}
        delay={delay + 60}
        duration={880}
      />
      <FallingSparks
        count={20}
        color={accent}
        secondary="#FFB347"
        width={CARD_WIDTH + 60}
        height={CARD_HEIGHT + 20}
        delay={delay + 40}
        duration={1500}
      />
    </>
  );
}

export function RevealCard({
  card,
  isNew,
  quantity,
  fragments,
  flipped,
  reduceMotion,
  onPress,
  onDuplicateConvert,
}: Props) {
  const effect = REVEAL_EFFECTS[card.rarity];
  const rarity = rarityStyles[card.rarity];
  const accent = rarity.color;
  const isLegendary = card.rarity === 'legendary';
  const isMythic = card.rarity === 'mythic';
  const isPrestige = isLegendary || isMythic;
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const flip = useSharedValue(0);
  const glow = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    enter.set(withTiming(1, { duration: isPrestige ? 520 : 380, easing: Easing.out(Easing.cubic) }));
    // Avant-goût : la lueur du dos trahit la rareté avant le retournement.
    const tease = Math.max(effect.halo, rarity.rank >= 2 ? 0.25 : 0);
    if (tease > 0 || effect.tease) {
      const peakMs = isMythic ? 620 : isLegendary ? 780 : 700;
      const valleyMs = isMythic ? 520 : isLegendary ? 640 : 700;
      glow.set(
        withRepeat(
          withSequence(
            withTiming(Math.max(tease, 0.2) * (isPrestige ? 0.9 : 0.55), { duration: peakMs }),
            withTiming(Math.max(tease, 0.2) * (isPrestige ? 0.28 : 0.2), { duration: valleyMs }),
          ),
          -1,
          true,
        ),
      );
    }
  }, [enter, glow, effect, reduceMotion, isPrestige, isLegendary, isMythic, rarity.rank]);

  useEffect(() => {
    if (!flipped) return;
    if (reduceMotion) {
      flip.set(1);
      glow.set(effect.halo);
      return;
    }
    const hold = effect.suspend;
    const afterGlow = effect.halo || 0.35;
    const pulseMs = isPrestige ? 1100 : 800;
    // Hold : la lueur monte au maximum, puis le flip lent commence.
    glow.set(
      withSequence(
        ...(hold > 0
          ? [
              withTiming(Math.min(1, afterGlow * 1.2), {
                duration: hold * 0.85,
                easing: Easing.out(Easing.cubic),
              }),
              withTiming(afterGlow, { duration: hold * 0.15 }),
            ]
          : []),
        withDelay(
          effect.flip * 0.5,
          withRepeat(
            withSequence(withTiming(afterGlow, { duration: pulseMs }), withTiming(afterGlow * 0.55, { duration: pulseMs })),
            -1,
            true,
          ),
        ),
      ),
    );
    flip.set(withDelay(hold, withTiming(1, { duration: effect.flip, easing: Easing.inOut(Easing.cubic) })));
    if (isMythic) {
      shake.set(
        withDelay(
          hold + effect.flip * 0.42,
          withSequence(
            withTiming(1, { duration: 40 }),
            withTiming(-1, { duration: 40 }),
            withTiming(0.7, { duration: 36 }),
            withTiming(0, { duration: 100 }),
          ),
        ),
      );
    }
  }, [flipped, reduceMotion, effect, flip, glow, shake, isMythic, isPrestige]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.get() * 1.5),
    transform: [
      { translateY: interpolate(enter.get(), [0, 1], [80, 0]) },
      { translateX: shake.get() * 6 },
      { scale: interpolate(enter.get(), [0, 1], [0.88, 1]) },
    ],
  }));
  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + Math.sin(flip.get() * Math.PI) * (isPrestige ? 0.12 : 0.06) }],
  }));
  const backStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - flip.get() }
      : {
          transform: [{ perspective: 1100 }, { rotateY: `${interpolate(flip.get(), [0, 1], [0, 180])}deg` }],
          opacity: flip.get() < 0.5 ? 1 : 0,
        },
  );
  const frontStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: flip.get() }
      : {
          transform: [{ perspective: 1100 }, { rotateY: `${interpolate(flip.get(), [0, 1], [180, 360])}deg` }],
          opacity: flip.get() >= 0.5 ? 1 : 0,
        },
  );
  const rimStyle = useAnimatedStyle(() => ({
    opacity: glow.get(),
    transform: [{ scale: 1 + glow.get() * 0.04 }],
    boxShadow: `0 0 ${22 + glow.get() * 36}px ${accent}`,
  }));

  const label = flipped
    ? cardAccessibilityLabel(card, { isNew, quantity })
    : 'Carte face cachée. Touchez pour la révéler.';
  const burstDelay = effect.suspend + effect.flip * 0.48;
  const showEffects = flipped && !reduceMotion;
  const showStandardFx = showEffects && !isPrestige;
  const convertDelay = reduceMotion ? 0 : effect.suspend + effect.flip + DUPLICATE_CONVERT_DELAY;

  return (
    <Animated.View style={[styles.stage, containerStyle]}>
      {showEffects && isLegendary ? <LegendarySpectacle accent={accent} delay={burstDelay} /> : null}
      {showEffects && isMythic ? <MythicSpectacle accent={accent} delay={burstDelay} /> : null}
      {showStandardFx && effect.rays > 0 ? (
        <LightRays color={accent} size={CARD_HEIGHT * 1.45} delay={burstDelay} intensity={0.35} />
      ) : null}
      {/* Halo = lueur de bord uniquement, sans plateau opaque derrière la carte. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.rimGlow, { borderColor: accent }, rimStyle]}
      />
      {showStandardFx && effect.ring ? <Shockwave color={accent} size={CARD_HEIGHT * 0.95} delay={burstDelay} /> : null}
      {showEffects && isNew ? (
        <View style={styles.statusSlot}>
          <StatusBadge label="Nouvelle" color={colors.turquoise} delay={burstDelay + 40} />
        </View>
      ) : null}
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
            <CardBack
              shimmer={!reduceMotion && !flipped}
              accent={accent}
              borderWidth={Math.max(2, rarity.borderWidth + (isPrestige ? 1 : 0))}
              glowPulse={!flipped ? effect.halo || (rarity.rank >= 2 ? 0.3 : 0) : 0}
            />
          </Animated.View>
          <Animated.View style={[styles.face, frontStyle]}>
            <AtlasCard card={card} isNew={false} quantity={quantity} size="large" />
            {flipped && !isNew ? (
              <DuplicateConversion
                fragments={fragments}
                delay={convertDelay}
                onConvert={onDuplicateConvert}
              />
            ) : null}
          </Animated.View>
        </Pressable>
      </Animated.View>
      {showStandardFx && effect.sparks > 0 ? (
        <ParticleBurst count={effect.sparks} color={accent} distance={CARD_HEIGHT * 0.6} delay={burstDelay} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: CARD_WIDTH + 48,
    height: CARD_HEIGHT + 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: { width: CARD_WIDTH, height: CARD_HEIGHT },
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
    backgroundColor: '#0A101C',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sweep: { position: 'absolute', top: -CARD_HEIGHT * 0.3, left: 0 },
  rimGlow: {
    position: 'absolute',
    width: CARD_WIDTH + 8,
    height: CARD_HEIGHT + 8,
    borderRadius: radius.xl,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  statusSlot: { position: 'absolute', top: 0, alignSelf: 'center', zIndex: 2 },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  statusBadgeText: { fontWeight: '700' },
  badgeSlot: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dupBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(7, 13, 26, 0.82)',
  },
});
