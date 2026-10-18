import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../tokens';
import { IconButton } from './IconButton';
import { Text } from './Text';

type Props = {
  title?: string;
  subtitle?: string;
  /** Affiche un bouton retour (écrans empilés). */
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  /** Les écrans d'onglet n'ont pas besoin de la marge basse (barre d'onglets). */
  edgeBottom?: boolean;
};

export function Screen({
  title,
  subtitle,
  back = false,
  right,
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  contentStyle,
  footer,
  edgeBottom = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const header =
    title || back || right ? (
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        {back ? (
          <IconButton
            icon="chevron-left"
            label="Retour"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        ) : null}
        <View style={styles.headerText}>
          {title ? (
            <Text variant="title" numberOfLines={2}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text variant="caption" color={colors.textMuted}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    ) : (
      <View style={{ height: insets.top }} />
    );

  const bottomPadding = (edgeBottom ? insets.bottom : 0) + spacing.xl;

  return (
    <View style={styles.root}>
      {header}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.turquoise} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content, { paddingBottom: bottomPadding }, contentStyle]}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: (edgeBottom ? insets.bottom : 0) + spacing.md }]}>{footer}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.xxs },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.night,
    gap: spacing.sm,
  },
});
