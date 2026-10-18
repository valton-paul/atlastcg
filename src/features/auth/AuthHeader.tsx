import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/design-system/components/Text';
import { decorativeSvgProps } from '@/design-system/decorative';
import { colors, spacing } from '@/design-system/tokens';

export function AtlasMark({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" {...decorativeSvgProps}>
      <Circle cx={28} cy={28} r={26} fill={colors.ink} stroke={colors.gold} strokeWidth={1.5} />
      <Path
        d="M4 28h48M28 2c8 7 12 16 12 26s-4 19-12 26c-8-7-12-16-12-26S20 9 28 2z"
        stroke={colors.borderStrong}
        strokeWidth={1.2}
        fill="none"
      />
      <Path d="M28 12l3.2 12.8L44 28l-12.8 3.2L28 44l-3.2-12.8L12 28l12.8-3.2z" fill={colors.gold} />
      <Circle cx={28} cy={28} r={2.4} fill={colors.night} />
    </Svg>
  );
}

export function AuthHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.root}>
      <AtlasMark />
      <Text variant="overline" color={colors.gold}>
        Atlas
      </Text>
      <Text variant="hero">{title}</Text>
      {subtitle ? <Text color={colors.textMuted}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm, paddingTop: spacing.xxl, paddingBottom: spacing.lg },
});
