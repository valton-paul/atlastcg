import { Pressable, StyleSheet, View } from 'react-native';

import { CATEGORY_LABELS, type CardCategory, type Rarity } from '@/features/catalog/types';
import { RarityBadge, RarityGlyph } from '@/design-system/components/RarityBadge';
import { Text } from '@/design-system/components/Text';
import { colors, radius, rarityStyles, spacing } from '@/design-system/tokens';

import { CardArtwork } from './CardArtwork';

export type AtlasCardData = {
  title: string;
  subtitle: string | null;
  category: CardCategory;
  rarity: Rarity;
  countryName: string | null;
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
  testID?: string;
};

const WIDTHS = { small: 104, medium: 160, large: 260 } as const;

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

export function AtlasCard({
  card,
  locked = false,
  isNew = false,
  quantity,
  size = 'medium',
  width: forcedWidth,
  onPress,
  testID,
}: Props) {
  const width = forcedWidth ?? WIDTHS[size];
  const rarity = rarityStyles[card.rarity];
  const frame = locked ? colors.border : rarity.color;
  const compact = size === 'small';
  const content = (
    <View
      style={[
        styles.card,
        { width, borderColor: frame },
        !locked && rarity.rank >= 3 && { boxShadow: `0 0 ${rarity.rank * 5}px ${rarity.color}66` },
        compact && styles.cardSmall,
      ]}
    >
      <View style={[styles.art, { height: width * 0.78 }]}>
        <CardArtwork
          category={card.category}
          rarity={card.rarity}
          isoNumeric={card.isoNumeric}
          illustrationPath={card.illustrationPath}
          locked={locked}
        />
        {isNew && !locked ? (
          <View style={styles.newBadge}>
            <Text variant="overline" color={colors.nightDeep}>
              Nouvelle
            </Text>
          </View>
        ) : null}
        {quantity && quantity > 1 && !locked ? (
          <View style={styles.quantity}>
            <Text variant="overline" color={colors.text}>
              ×{quantity}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.body, compact && styles.bodySmall]}>
        {compact ? (
          <View style={styles.row}>
            <RarityGlyph rarity={card.rarity} size={9} />
            <Text variant="overline" color={colors.textMuted} numberOfLines={1} style={styles.flex}>
              {CATEGORY_LABELS[card.category]}
            </Text>
          </View>
        ) : (
          <Text variant="overline" color={colors.textMuted} numberOfLines={1}>
            {CATEGORY_LABELS[card.category]}
            {card.countryName && card.category !== 'country' ? ` · ${card.countryName}` : ''}
          </Text>
        )}
        <Text
          variant={size === 'large' ? 'heading' : 'bodyStrong'}
          numberOfLines={2}
          style={compact && styles.smallTitle}
        >
          {locked ? '???' : card.title}
        </Text>
        {!compact && !locked && card.subtitle ? (
          <Text variant="caption" color={colors.textMuted} numberOfLines={2}>
            {card.subtitle}
          </Text>
        ) : null}
        {!compact ? <RarityBadge rarity={card.rarity} /> : null}
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
      accessibilityHint={locked ? 'Affiche comment obtenir cette carte' : 'Ouvre la fiche de la carte'}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    backgroundColor: colors.ink,
    overflow: 'hidden',
  },
  cardSmall: { borderRadius: radius.md },
  art: { width: '100%', backgroundColor: colors.slate },
  body: { padding: spacing.md, gap: spacing.xs },
  bodySmall: { padding: spacing.sm, gap: spacing.xxs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
  smallTitle: { fontSize: 13, lineHeight: 17 },
  newBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.turquoise,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  quantity: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
