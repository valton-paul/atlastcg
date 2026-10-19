import { Pressable, StyleSheet } from 'react-native';

import { colors, MIN_TOUCH, radius, rarityStyles, spacing, type RarityKey } from '../tokens';
import { RarityGlyph } from './RarityBadge';
import { Text } from './Text';

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  count?: number;
  /** Affiché tel quel à la place de `count` (ex. « 12/20 »). */
  countLabel?: string;
  /** Ajoute le symbole de la rareté et colore la puce sélectionnée à sa couleur. */
  rarity?: RarityKey;
  /** Affiche uniquement le glyphe de rareté + la quantité (label réservé à l’accessibilité). */
  iconOnly?: boolean;
};

export function Chip({
  label,
  selected = false,
  onPress,
  count,
  countLabel,
  rarity,
  iconOnly = false,
}: Props) {
  const accent = rarity ? rarityStyles[rarity].color : colors.turquoise;
  const compact = iconOnly && !!rarity;
  const quantity = countLabel ?? (count !== undefined ? String(count) : undefined);
  const a11y = quantity !== undefined ? `${label}, ${quantity}` : label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={a11y}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        compact && styles.chipCompact,
        selected && { backgroundColor: accent, borderColor: accent },
        pressed && styles.pressed,
      ]}
    >
      {rarity ? (
        <RarityGlyph
          rarity={rarity}
          size={compact ? 12 : 10}
          color={selected ? colors.nightDeep : undefined}
        />
      ) : null}
      {compact ? (
        quantity !== undefined ? (
          <Text variant="caption" color={selected ? colors.nightDeep : colors.text}>
            {quantity}
          </Text>
        ) : null
      ) : (
        <Text variant="caption" color={selected ? colors.nightDeep : colors.text}>
          {quantity !== undefined ? `${label} · ${quantity}` : label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: MIN_TOUCH - 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  chipCompact: {
    paddingHorizontal: spacing.sm,
    minWidth: MIN_TOUCH - 4,
  },
  pressed: { opacity: 0.75 },
});
