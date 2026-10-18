import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../tokens';

type Props = {
  children: ReactNode;
  tone?: 'panel' | 'raised' | 'precious' | 'explore';
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const tones = {
  panel: { backgroundColor: colors.ink, borderColor: colors.border },
  raised: { backgroundColor: colors.slate, borderColor: colors.border },
  precious: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  explore: { backgroundColor: colors.turquoiseSoft, borderColor: colors.turquoise },
} as const;

export function Surface({
  children,
  tone = 'panel',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: Props) {
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        style={({ pressed }) => [styles.base, tones[tone], pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={[styles.base, tones[tone], style]} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  pressed: { opacity: 0.85 },
});
