import { Pressable, StyleSheet, View } from 'react-native';

import { useHaptics } from '@/lib/haptics';

import { colors, MIN_TOUCH, radius } from '../tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  badge?: number;
  disabled?: boolean;
  tone?: 'default' | 'raised';
  testID?: string;
};

export function IconButton({ icon, label, onPress, badge, disabled, tone = 'default', testID }: Props) {
  const haptic = useHaptics();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label} (${badge})` : label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        haptic('tap');
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        tone === 'raised' && styles.raised,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon name={icon} size={22} />
      {badge ? (
        <View style={styles.badge}>
          <Text variant="overline" color={colors.nightDeep}>
            {badge > 99 ? '99+' : String(badge)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raised: { backgroundColor: colors.slate, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    paddingHorizontal: 4,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
