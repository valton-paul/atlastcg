import { Pressable, StyleSheet } from 'react-native';

import { colors, MIN_TOUCH, radius, spacing } from '../tokens';
import { Text } from './Text';

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  count?: number;
};

export function Chip({ label, selected = false, onPress, count }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
    >
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.turquoise, borderColor: colors.turquoise },
  pressed: { opacity: 0.75 },
});
