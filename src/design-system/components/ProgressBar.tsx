import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../tokens';
import { Text } from './Text';

type Props = {
  value: number;
  total: number;
  label?: string;
  tone?: 'explore' | 'precious' | 'prestige';
  showCount?: boolean;
};

export function ProgressBar({ value, total, label, tone = 'explore', showCount = true }: Props) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  const fill = tone === 'precious' ? colors.gold : tone === 'prestige' ? colors.violet : colors.turquoise;
  return (
    <View
      style={styles.root}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ? `${label} : ${value} sur ${total}` : `${value} sur ${total}`}
      accessibilityValue={{ min: 0, max: total, now: value }}
    >
      {label || showCount ? (
        <View style={styles.row}>
          {label ? (
            <Text variant="caption" color={colors.textMuted} style={styles.label} numberOfLines={1}>
              {label}
            </Text>
          ) : (
            <View />
          )}
          {showCount ? (
            <Text variant="caption" color={colors.text}>
              {value} / {total}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: fill }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  label: { flex: 1 },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.slateRaised, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
