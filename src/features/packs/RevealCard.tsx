import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { AtlasCard, cardAccessibilityLabel, type AtlasCardData } from '@/features/cards/AtlasCard';
import { colors, durations, radius, rarityStyles } from '@/design-system/tokens';

const CARD_WIDTH = 260;
const CARD_HEIGHT = 400;

/** Intensité des effets par rareté : sobre pour les cartes communes, plus marquée ensuite. */
const EFFECTS = {
  common: { halo: 0, rays: false, flip: durations.base },
  uncommon: { halo: 0.25, rays: false, flip: durations.base },
  rare: { halo: 0.45, rays: false, flip: durations.slow },
  epic: { halo: 0.6, rays: true, flip: durations.slow },
  legendary: { halo: 0.8, rays: true, flip: durations.reveal },
} as const;

type Props = {
  card: AtlasCardData;
  isNew: boolean;
  quantity: number;
  flipped: boolean;
  reduceMotion: boolean;
  onPress: () => void;
};

function CardBack() {
  return (
    <View style={styles.back}>
      <Svg width={120} height={120} viewBox="0 0 56 56">
        <Circle cx={28} cy={28} r={26} fill="none" stroke={colors.gold} strokeWidth={1} />
        <Circle cx={28} cy={28} r={18} fill="none" stroke={colors.borderStrong} strokeWidth={0.8} />
        <Path d="M2 28h52M28 2v52" stroke={colors.borderStrong} strokeWidth={0.6} />
        <Path d="M28 10l3 15 15 3-15 3-3 15-3-15-15-3 15-3z" fill={colors.gold} />
      </Svg>
    </View>
  );
}

export function RevealCard({ card, isNew, quantity, flipped, reduceMotion, onPress }: Props) {
  const effect = EFFECTS[card.rarity];
  const accent = rarityStyles[card.rarity].color;
  const enter = useSharedValue(0);
  const flip = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    enter.set(0);
    flip.set(0);
    glow.set(0);
    enter.set(reduceMotion ? 1 : withTiming(1, { duration: durations.slow, easing: Easing.out(Easing.cubic) }));
  }, [card.title, enter, flip, glow, reduceMotion]);

  useEffect(() => {
    if (!flipped) return;
    if (reduceMotion) {
      flip.set(1);
      glow.set(effect.halo);
      return;
    }
    flip.set(withTiming(1, { duration: effect.flip, easing: Easing.inOut(Easing.cubic) }));
    glow.set(
      effect.rays
        ? withDelay(
            effect.flip * 0.6,
            withRepeat(
              withSequence(
                withTiming(effect.halo, { duration: 900 }),
                withTiming(effect.halo * 0.6, { duration: 900 }),
              ),
              2,
              true,
            ),
          )
        : withDelay(effect.flip * 0.6, withTiming(effect.halo, { duration: durations.slow })),
    );
  }, [flipped, reduceMotion, effect, flip, glow]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: enter.get(),
    transform: [
      { translateY: interpolate(enter.get(), [0, 1], [40, 0]) },
      { scale: interpolate(enter.get(), [0, 1], [0.92, 1]) },
    ],
  }));
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

  return (
    <Animated.View style={[styles.stage, containerStyle]}>
      {effect.halo > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.halo, { shadowColor: accent, backgroundColor: accent }, haloStyle]}
        />
      ) : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={flipped ? 'Passe à la carte suivante' : undefined}
        style={styles.pressable}
        testID="reveal-card"
      >
        <Animated.View style={[styles.face, backStyle]}>
          <CardBack />
        </Animated.View>
        <Animated.View style={[styles.face, frontStyle]}>
          <AtlasCard card={card} isNew={isNew} quantity={quantity} size="large" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { width: CARD_WIDTH + 40, height: CARD_HEIGHT + 40, alignItems: 'center', justifyContent: 'center' },
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
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
});
