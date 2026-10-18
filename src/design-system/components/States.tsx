import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../tokens';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.turquoise} size="large" />
      <Text variant="caption" color={colors.textMuted}>
        {label}
      </Text>
    </View>
  );
}

/** Bloc de substitution pendant le chargement d'une liste. */
export function SkeletonBlock({ height = 72 }: { height?: number }) {
  return <View style={[styles.skeleton, { height }]} accessibilityElementsHidden importantForAccessibility="no" />;
}

type EmptyProps = {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon = 'compass', title, message, actionLabel, onAction }: EmptyProps) {
  return (
    <View style={styles.center}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={28} color={colors.turquoise} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {message ? (
        <Text color={colors.textMuted} align="center">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" compact /> : null}
    </View>
  );
}

type ErrorProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ title = 'Une difficulté est survenue', message, onRetry }: ErrorProps) {
  return (
    <View style={styles.center} accessibilityRole="alert">
      <View style={[styles.iconWrap, styles.errorIcon]}>
        <Icon name="alert" size={26} color={colors.danger} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      <Text color={colors.textMuted} align="center">
        {message}
      </Text>
      {onRetry ? <Button label="Réessayer" icon="refresh" onPress={onRetry} variant="secondary" compact /> : null}
    </View>
  );
}

export function InlineMessage({ tone = 'info', message }: { tone?: 'info' | 'error' | 'success'; message: string }) {
  const color = tone === 'error' ? colors.danger : tone === 'success' ? colors.success : colors.turquoise;
  return (
    <View
      style={[styles.inline, { borderColor: color }]}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <Icon name={tone === 'error' ? 'alert' : tone === 'success' ? 'check' : 'info'} size={18} color={color} />
      <Text variant="caption" style={styles.inlineText}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.turquoiseSoft,
  },
  errorIcon: { backgroundColor: colors.dangerSoft },
  skeleton: { borderRadius: radius.lg, backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.slate },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.ink,
  },
  inlineText: { flex: 1 },
});
