import { Pressable, StyleSheet } from 'react-native';

import { colors, MIN_TOUCH, radius, rarityStyles, spacing, type RarityKey } from '../tokens';
import { RarityGlyph } from './RarityBadge';
import { Text } from './Text';

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  count?: number;
  /** Ajoute le symbole de la rareté et colore la puce sélectionnée à sa couleur. */
  rarity?: RarityKey;
};

export function Chip({ label, selected = false, onPress, count, rarity }: Props) {
  const accent = rarity ? rarityStyles[rarity].color : colors.turquoise;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: accent, borderColor: accent },
        pressed && styles.pressed,
      ]}
    >
      {rarity ? <RarityGlyph rarity={rarity} size={10} /> : null}
      <Text variant="caption" color={selected ? colors.nightDeep : colors.text}>
        {count !== undefined ? `${label} · ${count}` : label}
      </Text>
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
  pressed: { opacity: 0.75 },
});
