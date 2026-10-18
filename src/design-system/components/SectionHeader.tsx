import { Pressable, StyleSheet, View } from 'react-native';

import { colors, MIN_TOUCH, spacing } from '../tokens';
import { Text } from './Text';

type Props = { title: string; actionLabel?: string; onAction?: () => void };

export function SectionHeader({ title, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <Text variant="heading" style={styles.title}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.action} hitSlop={8}>
          <Text variant="caption" color={colors.turquoise}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1 },
  action: { minHeight: MIN_TOUCH, justifyContent: 'center' },
});
