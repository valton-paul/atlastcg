import { useEffect, useId } from 'react';
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

import { RarityGlyph } from '@/design-system/components/RarityBadge';
import { Text } from '@/design-system/components/Text';
import { decorativeSvgProps } from '@/design-system/decorative';
import { colors, fonts, radius, rarityStyles, spacing } from '@/design-system/tokens';
import { CATEGORY_LABELS, type CardCategory, type Rarity } from '@/features/catalog/types';
import { usePreferences } from '@/lib/preferences';

import { CardArtwork } from './CardArtwork';

export type AtlasCardData = {
  title: string;
  subtitle: string | null;
  category: CardCategory;
  rarity: Rarity;
  countryName: string | null;
  isoCode: string | null;
  isoNumeric: string | null;
  illustrationPath: string | null;
};

type Props = {
  card: AtlasCardData;
  /** Carte manquante : seul un aperçu neutre est affiché, sans révéler son contenu. */
  locked?: boolean;
  isNew?: boolean;
  quantity?: number;
  size?: 'small' | 'medium' | 'large';
  /** Largeur imposée (grilles adaptatives) ; sinon dérivée de `size`. */
  width?: number;
  onPress?: () => void;
  /** Remplace le hint d’accessibilité par défaut du bouton. */
  accessibilityHint?: string;
  testID?: string;
};

const WIDTHS = { small: 112, medium: 168, large: 260 } as const;
const RATIO = 1.5;
const RANKS: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

export function cardAccessibilityLabel(
  card: AtlasCardData,
  opts: { locked?: boolean; isNew?: boolean; quantity?: number },
) {
  if (opts.locked) {
    return `Carte manquante, ${CATEGORY_LABELS[card.category]}${card.countryName ? `, ${card.countryName}` : ''}`;
  }
  const parts = [card.title, CATEGORY_LABELS[card.category], `rareté ${rarityStyles[card.rarity].label}`];
  if (card.countryName && card.category !== 'country') parts.push(card.countryName);
  if (opts.isNew) parts.push('nouvelle');
  if (opts.quantity && opts.quantity > 1) parts.push(`${opts.quantity} exemplaires`);
  return parts.join(', ');
}

function rarityGlow(color: string, radiusPx: number): string | undefined {
  if (radiusPx <= 0) return undefined;
  return `0 0 ${radiusPx}px ${color}66`;
}

export function AtlasCard({
  card,
  locked = false,
  isNew = false,
  quantity,
  size = 'medium',
  width: forcedWidth,
  onPress,
  accessibilityHint,
  testID,
}: Props) {
  const { reduceMotion } = usePreferences();
  const shineId = `shine-${useId().replace(/:/g, '')}`;
  const scrimId = `scrim-${useId().replace(/:/g, '')}`;
  const width = forcedWidth ?? WIDTHS[size];
  const height = Math.round(width * RATIO);
  const rarity = rarityStyles[card.rarity];
  const frame = locked ? colors.border : rarity.color;
  const compact = size === 'small';
  const glow = locked ? undefined : rarityGlow(rarity.color, rarity.glow);
  const titleColor = locked
    ? colors.textMuted
    : card.rarity === 'legendary' || card.rarity === 'mythic'
      ? rarity.color
      : colors.text;
  const pad = compact ? spacing.sm : spacing.md;
  const stamp = card.isoCode ?? (card.isoNumeric ? card.isoNumeric.slice(0, 3) : null);

  const content = (
    <View
      style={[
        styles.card,
        {
          width,
          height,
          borderColor: frame,
          borderWidth: locked ? 1 : rarity.borderWidth,
        },
        glow ? { boxShadow: glow } : null,
        compact && styles.cardSmall,
      ]}
    >
      <CardArtwork
        category={card.category}
        rarity={card.rarity}
        isoNumeric={card.isoNumeric}
        illustrationPath={card.illustrationPath}
        locked={locked}
      />
      <View pointerEvents="none" style={styles.scrim}>
        <Svg width="100%" height="100%" viewBox="0 0 100 150" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={scrimId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.42" stopColor="#070D1A" stopOpacity={0} />
              <Stop offset="1" stopColor="#070D1A" stopOpacity={0.92} />
            </LinearGradient>
          </Defs>
          <Rect width={100} height={150} fill={`url(#${scrimId})`} />
        </Svg>
      </View>
      {!reduceMotion && !locked && rarity.shine ? <ShineSweep gradientId={shineId} /> : null}
      {!reduceMotion && !locked && rarity.embers ? <RisingEmbers color={rarity.color} /> : null}

      {stamp ? (
        <View style={[styles.stamp, { borderColor: frame, top: pad, left: pad }]}>
          <Text variant="overline" color={locked ? colors.textFaint : colors.text} style={styles.stampText}>
            {stamp}
          </Text>
        </View>
      ) : null}
      <View style={[styles.categoryMark, { top: pad, right: pad, borderColor: frame }]}>
        <CategoryMark category={card.category} color={locked ? colors.textFaint : rarity.color} />
      </View>
      {isNew && !locked ? <View style={[styles.newDot, { top: pad + 4, left: stamp ? pad + 34 : pad }]} /> : null}
      {quantity && quantity > 1 && !locked ? (
        <View style={[styles.quantity, { top: pad, right: pad + 30 }]}>
          <Text variant="caption" color={colors.text}>
            ×{quantity}
          </Text>
        </View>
      ) : null}

      <View style={[styles.footer, { padding: pad, paddingBottom: compact ? spacing.sm : spacing.md }]}>
        <Text
          variant={size === 'large' ? 'heading' : 'bodyStrong'}
          color={titleColor}
          numberOfLines={2}
          style={[styles.title, compact && styles.smallTitle, size === 'medium' && styles.mediumTitle]}
        >
          {locked ? '???' : card.title}
        </Text>
        {!locked ? (
          <Text variant="caption" color={colors.textMuted} numberOfLines={1}>
            {card.subtitle || card.countryName || CATEGORY_LABELS[card.category]}
          </Text>
        ) : (
          <Text variant="caption" color={colors.textFaint} numberOfLines={1}>
            Non obtenue
          </Text>
        )}
        <View style={styles.rarityRow}>
          <RarityGlyph rarity={card.rarity} size={compact ? 8 : 10} />
          {!compact ? (
            <Text variant="caption" color={locked ? colors.textFaint : rarity.color} style={styles.flex} numberOfLines={1}>
              {rarity.label}
            </Text>
          ) : (
            <View style={styles.flex} />
          )}
          <View style={styles.dots}>
            {RANKS.map((key) => (
              <View
                key={key}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      rarityStyles[key].rank <= rarity.rank ? (locked ? colors.borderStrong : rarity.color) : `${rarity.color}33`,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  const label = cardAccessibilityLabel(card, { locked, isNew, quantity });
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={
        accessibilityHint ?? (locked ? 'Affiche comment obtenir cette carte' : 'Ouvre la fiche de la carte')
      }
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

function ShineSweep({ gradientId }: { gradientId: string }) {
  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
          withDelay(2200, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(sweep);
  }, [sweep]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sweep.get(), [0, 1], [-80, 220]) }, { rotate: '18deg' }],
    opacity: sweep.get() === 0 ? 0 : 1,
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.shine, style]}>
      <Svg width={56} height={640}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.28} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width={56} height={640} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

function RisingEmbers({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 8 }, (_, i) => (
        <Ember key={i} index={i} color={i % 2 === 0 ? color : '#FFB347'} />
      ))}
    </View>
  );
}

function Ember({ index, color }: { index: number; color: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      withDelay(
        index * 220,
        withRepeat(withTiming(1, { duration: 2200 + index * 120, easing: Easing.out(Easing.quad) }), -1, false),
      ),
    );
    return () => cancelAnimation(progress);
  }, [progress, index]);
  const left = 18 + ((index * 37) % 70);
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p === 0 ? 0 : p < 0.15 ? p * 6 : 1 - p,
      transform: [{ translateY: (1 - p) * 28 - p * 110 }, { scale: 1 - p * 0.4 }],
    };
  });
  return (
    <Animated.View
      style={[
        styles.ember,
        { left: `${left}%`, bottom: 48, backgroundColor: color, shadowColor: color },
        style,
      ]}
    />
  );
}

function CategoryMark({ category, color }: { category: CardCategory; color: string }) {
  const stroke = { stroke: color, strokeWidth: 1.6, fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16" {...decorativeSvgProps}>
      {category === 'monument' ? <Path {...stroke} d="M2 14 8 2l6 12M5 14V8M11 14V8" /> : null}
      {category === 'geography' ? <Path {...stroke} d="M1 13 6 5l3 5 2-3 4 6z" /> : null}
      {category === 'history' ? <Path {...stroke} d="M3 4h10v10H3zM3 4c-2 0-2 3 0 3M5 8h6" /> : null}
      {category === 'capital' ? (
        <>
          <Rect {...stroke} x={3} y={6} width={10} height={8} />
          <Path {...stroke} d="M6 10h1.5M9.5 10H11" />
        </>
      ) : null}
      {category === 'culture' ? <Path {...stroke} d="M8 2c4 3 6 3 6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V4c1 1 4 1 6-2z" /> : null}
      {category === 'country' ? <Circle {...stroke} cx={8} cy={8} r={6} /> : null}
      {category === 'special' ? <Path {...stroke} d="M8 1.5 9.6 6h4.6L11 9.1l1.4 4.6L8 11.2 3.6 13.7 5 9.1 1.8 6h4.6z" /> : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.nightDeep,
  },
  cardSmall: { borderRadius: radius.md },
  scrim: { ...StyleSheet.absoluteFill },
  stamp: {
    position: 'absolute',
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 13, 26, 0.45)',
  },
  stampText: { letterSpacing: 1.4, fontSize: 9, lineHeight: 12 },
  categoryMark: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 13, 26, 0.45)',
  },
  newDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.turquoise,
    boxShadow: `0 0 8px ${colors.turquoise}`,
  },
  quantity: {
    position: 'absolute',
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 2 },
  title: { fontFamily: fonts.display, letterSpacing: 0.1 },
  mediumTitle: { fontSize: 17, lineHeight: 22 },
  smallTitle: { fontFamily: fonts.display, fontSize: 13, lineHeight: 17 },
  rarityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
  flex: { flex: 1 },
  dots: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  shine: { position: 'absolute', top: -80, left: 0 },
  ember: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
});
