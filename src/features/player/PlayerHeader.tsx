import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, Icon, IconButton, radius, spacing, Text } from '@/design-system';

import { explorationProgress } from './level';

type Props = {
  title: string;
  subtitle?: string;
  fragments?: number;
  packCount?: number;
  /** XP d’exploration globale — affiche niveau + barre sous le titre. */
  explorationXp?: number;
};

/** En-tête des onglets : titre, ressources et accès au profil. */
export function PlayerHeader({ title, subtitle, fragments, packCount, explorationXp }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const progress = explorationXp !== undefined ? explorationProgress(explorationXp) : null;

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
        {progress ? (
          <View
            style={styles.levelBlock}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Niveau ${progress.level}, ${progress.xpIntoLevel} sur ${progress.xpForNextLevel} XP`}
            accessibilityValue={{
              min: 0,
              max: progress.xpForNextLevel,
              now: progress.xpIntoLevel,
            }}
          >
            <View style={styles.levelRow}>
              <Text variant="caption" color={colors.turquoise} style={styles.levelLabel}>
                Niv. {progress.level}
              </Text>
              <Text variant="caption" color={colors.textMuted}>
                {progress.xpIntoLevel} / {progress.xpForNextLevel} XP
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress.progress * 100)}%` }]} />
            </View>
          </View>
        ) : null}
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
  text: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  levelBlock: { gap: spacing.xxs, marginTop: spacing.xxs, maxWidth: 200 },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  levelLabel: { fontVariant: ['tabular-nums'] },
  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.slateRaised,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.turquoise,
  },
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
