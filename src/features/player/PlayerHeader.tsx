import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, Icon, IconButton, radius, spacing, Text } from '@/design-system';

type Props = {
  title: string;
  subtitle?: string;
  fragments?: number;
  packCount?: number;
};

/** En-tête des onglets : titre, ressources et accès au profil. */
export function PlayerHeader({ title, subtitle, fragments, packCount }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.text}>
        {subtitle ? (
          <Text variant="overline" color={colors.gold}>
            {subtitle}
          </Text>
        ) : null}
        <Text variant="title" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {fragments !== undefined ? (
        <View style={styles.resource} accessible accessibilityLabel={`${fragments} fragments`}>
          <Icon name="fragment" size={16} color={colors.gold} />
          <Text variant="caption">{fragments}</Text>
          <Text variant="overline" color={colors.textMuted} style={styles.resourceLabel}>
            Fragments
          </Text>
        </View>
      ) : null}
      {packCount !== undefined ? (
        <IconButton icon="pack" label="Mes paquets" badge={packCount} onPress={() => router.push('/packs')} />
      ) : null}
      <IconButton
        icon="user"
        label="Profil et paramètres"
        onPress={() => router.push('/profile')}
        testID="open-profile"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.night,
  },
  text: { flex: 1 },
  resource: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resourceLabel: { fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase' },
});
