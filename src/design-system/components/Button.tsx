import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useHaptics } from '@/lib/haptics';

import { colors, MIN_TOUCH, radius, spacing } from '../tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'precious' | 'prestige' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  testID?: string;
};

const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.turquoise, fg: colors.nightDeep, border: colors.turquoise },
  secondary: { bg: colors.slate, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.turquoise, border: 'transparent' },
  precious: { bg: colors.gold, fg: colors.nightDeep, border: colors.gold },
  prestige: { bg: colors.violet, fg: colors.nightDeep, border: colors.violet },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.danger },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  accessibilityHint,
  style,
  compact = false,
  testID,
}: Props) {
  const haptic = useHaptics();
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        haptic('tap');
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: p.bg, borderColor: p.border },
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={p.fg} />
        ) : icon ? (
          <Icon name={icon} size={compact ? 18 : 20} color={p.fg} />
        ) : null}
        <Text variant="bodyStrong" color={p.fg}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: MIN_TOUCH, paddingHorizontal: spacing.lg, borderRadius: radius.md },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
