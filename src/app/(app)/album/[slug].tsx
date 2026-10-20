import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  colors,
  EmptyState,
  ErrorState,
  LoadingState,
  ProgressBar,
  Screen,
  spacing,
  Surface,
  Text,
  useAppContentWidth,
} from '@/design-system';
import { toCardData } from '@/features/cards/adapters';
import { AtlasCard } from '@/features/cards/AtlasCard';
import { collectionProgress } from '@/features/collection/progress';
import { useAtlasData } from '@/features/player/useAtlasData';
import { errorMessage } from '@/lib/errors';

export default function AlbumScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const data = useAtlasData();
  const router = useRouter();
  const width = useAppContentWidth();

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState message={errorMessage(data.error)} onRetry={data.retry} />;

  const { catalog, player } = data;
  const collection = catalog.collections.find((c) => c.slug === slug);
  if (!collection) {
    return (
      <Screen back title="Album">
        <EmptyState icon="cards" title="Album introuvable" message="Cet album n’est pas disponible." />
      </Screen>
    );
  }

  const progress = collectionProgress(collection, player.ownedCards);
  const complete = progress.total > 0 && progress.owned === progress.total;
  const cards = [...collection.collection_cards]
    .sort((a, b) => a.position - b.position)
    .map((entry) => catalog.cardsById.get(entry.card_id))
    .filter((card): card is NonNullable<typeof card> => !!card);
  const columns = width >= 600 ? 5 : 3;
  const gap = spacing.lg;
  const cardWidth = Math.floor((width - spacing.lg * 2 - gap * (columns - 1)) / columns);

  return (
    <Screen back title={collection.title}>
      <Text color={colors.textMuted}>{collection.description}</Text>
      <ProgressBar
        label="Cartes de l’album"
        value={progress.owned}
        total={progress.total}
        tone={complete ? 'precious' : 'explore'}
      />
      {complete ? (
        <Surface tone="precious">
          <Text variant="bodyStrong">Album complet</Text>
          <Text variant="caption" color={colors.textMuted}>
            Toutes les cartes de cet album sont dans votre atlas.
          </Text>
        </Surface>
      ) : null}
      <View style={[styles.grid, { gap }]}>
        {cards.map((card) => {
          const owned = player.ownedCards.get(card.id);
          return (
            <AtlasCard
              key={card.id}
              size="small"
              width={cardWidth}
              card={toCardData(catalog, card)}
              locked={!owned}
              isNew={!!owned && !owned.seen_at}
              quantity={owned?.quantity}
              onPress={() => router.push(`/card/${card.slug}`)}
            />
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
