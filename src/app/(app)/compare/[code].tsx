import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  colors,
  ErrorState,
  LoadingState,
  ProgressBar,
  Screen,
  SectionHeader,
  spacing,
  Surface,
  Text,
} from '@/design-system';
import { useComparison, type PlayerStats } from '@/features/social/api';
import { errorMessage } from '@/lib/errors';

function Row({ label, me, friend }: { label: string; me: number; friend: number | null }) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${label} : vous ${me}${friend !== null ? `, votre ami ${friend}` : ''}`}
    >
      <Text style={styles.label}>{label}</Text>
      <Text variant="bodyStrong" style={styles.value}>
        {me}
      </Text>
      <Text variant="bodyStrong" style={styles.value} color={colors.turquoise}>
        {friend ?? '—'}
      </Text>
    </View>
  );
}

export default function CompareScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const comparison = useComparison(code ?? '');

  if (comparison.isPending) return <LoadingState />;
  if (comparison.isError) {
    return (
      <Screen back title="Comparaison">
        <ErrorState message={errorMessage(comparison.error)} onRetry={() => void comparison.refetch()} />
      </Screen>
    );
  }

  const { friend, me } = comparison.data;
  const stats: PlayerStats | null = friend.stats;
  const friendCollections = new Map((stats?.collections ?? []).map((c) => [c.slug, c]));

  return (
    <Screen back title={friend.display_name} subtitle="Comparaison des atlas">
      <Surface>
        <View style={styles.row}>
          <Text style={styles.label} />
          <Text variant="caption" color={colors.textMuted} style={styles.value}>
            Vous
          </Text>
          <Text variant="caption" color={colors.textMuted} style={styles.value}>
            {friend.display_name}
          </Text>
        </View>
        <Row label="Cartes" me={me.cards_owned} friend={stats?.cards_owned ?? null} />
        <Row label="Pays découverts" me={me.countries_discovered} friend={stats?.countries_discovered ?? null} />
        <Row label="Expéditions" me={me.expeditions_completed} friend={stats?.expeditions_completed ?? null} />
      </Surface>
      {!friend.visible ? (
        <Text color={colors.textMuted}>{friend.display_name} a choisi de garder sa collection privée.</Text>
      ) : (
        <>
          <SectionHeader title="Albums" />
          {me.collections.map((collection) => {
            const other = friendCollections.get(collection.slug);
            return (
              <Surface key={collection.slug}>
                <Text variant="bodyStrong">{collection.title}</Text>
                <ProgressBar label="Vous" value={collection.owned} total={collection.total} />
                {other ? (
                  <ProgressBar label={friend.display_name} value={other.owned} total={other.total} tone="precious" />
                ) : null}
              </Surface>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  label: { flex: 2 },
  value: { flex: 1, textAlign: 'right' },
});
