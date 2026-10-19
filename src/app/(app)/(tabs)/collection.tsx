import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  Chip,
  colors,
  EmptyState,
  ErrorState,
  LoadingState,
  MIN_TOUCH,
  ProgressBar,
  rarityStyles,
  spacing,
  Surface,
  Text,
  TextField,
} from '@/design-system';
import { toCardData } from '@/features/cards/adapters';
import { AtlasCard, type AtlasCardData } from '@/features/cards/AtlasCard';
import { CONTINENT_LABELS, CONTINENT_ORDER, type Continent, type Rarity } from '@/features/catalog/types';
import {
  DEFAULT_FILTERS,
  filterCards,
  OWNERSHIP_LABELS,
  type CardFilters,
  type OwnershipFilter,
  type SortOrder,
} from '@/features/collection/filters';
import { atlasStats, collectionProgress, rarityProgress } from '@/features/collection/progress';
import { useMarkCardsSeen } from '@/features/player/api';
import { PlayerHeader } from '@/features/player/PlayerHeader';
import { useAtlasData } from '@/features/player/useAtlasData';
import { errorMessage } from '@/lib/errors';

type View_ = 'cards' | 'albums';

const OWNERSHIP: OwnershipFilter[] = ['owned', 'new', 'duplicates', 'missing', 'all'];
const COLLECTION_DEFAULTS: CardFilters = { ...DEFAULT_FILTERS, ownership: 'owned' };
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const SORTS: { key: SortOrder; label: string }[] = [
  { key: 'rarity', label: 'Plus rares d’abord' },
  { key: 'country', label: 'Par pays' },
  { key: 'recent', label: 'Récentes' },
];

/** Seuil tablette / desktop : en dessous = téléphone. */
const DESKTOP_MIN_WIDTH = 700;
const COLUMNS_PHONE = 2;
const COLUMNS_DESKTOP = 5;
/** Fenêtre initiale puis pages du scroll infini. */
const ROWS_INITIAL = 10;
const ROWS_PAGE = 3;
/** Sur grand écran, plafonne la largeur pour éviter des cartes trop énormes. */
const DESKTOP_MAX_CARD_WIDTH = 168;

type GridItem = {
  id: string;
  slug: string;
  card: AtlasCardData;
  locked: boolean;
  isNew: boolean;
  quantity?: number;
};

const CollectionCard = memo(function CollectionCard({
  item,
  width,
  onPress,
}: {
  item: GridItem;
  width: number;
  onPress: (slug: string) => void;
}) {
  return (
    <AtlasCard
      size={width >= 150 ? 'medium' : 'small'}
      width={width}
      onPress={() => onPress(item.slug)}
      card={item.card}
      locked={item.locked}
      isNew={item.isNew}
      quantity={item.quantity}
    />
  );
});

export default function CollectionScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const data = useAtlasData();
  const router = useRouter();
  const markSeen = useMarkCardsSeen();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [view, setView] = useState<View_>('cards');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CardFilters>(() => ({
    ...DEFAULT_FILTERS,
    ownership: OWNERSHIP.includes(params.filter as OwnershipFilter) ? (params.filter as OwnershipFilter) : 'owned',
  }));

  const columns = width >= DESKTOP_MIN_WIDTH ? COLUMNS_DESKTOP : COLUMNS_PHONE;
  const columnGap = spacing.sm;
  const initialCount = columns * ROWS_INITIAL;
  const pageCount = columns * ROWS_PAGE;
  const [visibleCount, setVisibleCount] = useState(initialCount);

  const filtered = useMemo(
    () => (data.status === 'ready' ? filterCards(data.catalog, data.player.ownedCards, filters) : []),
    [data, filters],
  );

  useEffect(() => {
    setVisibleCount(initialCount);
  }, [initialCount, filters, view]);

  const visibleItems = useMemo((): GridItem[] => {
    if (data.status !== 'ready') return [];
    const { catalog, player } = data;
    return filtered.slice(0, visibleCount).map((item) => {
      const owned = player.ownedCards.get(item.id);
      return {
        id: item.id,
        slug: item.slug,
        card: toCardData(catalog, item),
        locked: !owned,
        isNew: !!owned && !owned.seen_at,
        quantity: owned?.quantity,
      };
    });
  }, [data, filtered, visibleCount]);

  const availableWidth = width - spacing.lg * 2;
  const rawCardWidth = Math.floor((availableWidth - columnGap * (columns - 1)) / columns);
  const cardWidth =
    columns === COLUMNS_DESKTOP ? Math.min(DESKTOP_MAX_CARD_WIDTH, rawCardWidth) : rawCardWidth;
  const gridWidth = cardWidth * columns + columnGap * (columns - 1);
  const listPadH = Math.max(spacing.lg, Math.floor((width - gridWidth) / 2));
  const listBottomPad = MIN_TOUCH + spacing.xxxl + Math.max(insets.bottom, spacing.sm);

  const openCard = useCallback((slug: string) => router.push(`/card/${slug}`), [router]);
  const loadMore = useCallback(() => {
    setVisibleCount((n) => Math.min(filtered.length, n + pageCount));
  }, [filtered.length, pageCount]);
  const renderItem = useCallback(
    ({ item }: { item: GridItem }) => <CollectionCard item={item} width={cardWidth} onPress={openCard} />,
    [cardWidth, openCard],
  );
  const keyExtractor = useCallback((item: GridItem) => item.id, []);

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState message={errorMessage(data.error)} onRetry={data.retry} />;

  const { catalog, player } = data;
  const stats = atlasStats(catalog, player.ownedCards, player.expeditions);
  const newIds = [...player.ownedCards.values()].filter((c) => !c.seen_at).map((c) => c.card_id);
  const activeFilterCount = (filters.continent ? 1 : 0) + (filters.sort !== DEFAULT_FILTERS.sort ? 1 : 0);

  const header = (
    <View style={styles.header}>
      <View
        style={styles.total}
        accessible
        accessibilityLabel={`${stats.cardsOwned} cartes collectionnées sur ${stats.cardsTotal}`}
      >
        <Text variant="hero">
          <Text variant="hero" color={colors.gold}>
            {stats.cardsOwned}
          </Text>
          <Text variant="hero" color={colors.textFaint}>
            {' '}
            / {stats.cardsTotal}
          </Text>
        </Text>
        <Text variant="caption" color={colors.textMuted}>
          cartes collectionnées · {stats.countriesDiscovered} pays sur {stats.countriesTotal}
        </Text>
        <ProgressBar value={stats.cardsOwned} total={stats.cardsTotal} tone="precious" showCount={false} />
      </View>
      <View style={styles.segment} accessibilityRole="tablist">
        <Chip label="Cartes" selected={view === 'cards'} onPress={() => setView('cards')} />
        <Chip label="Albums" selected={view === 'albums'} onPress={() => setView('albums')} />
      </View>
      {view === 'cards' ? (
        <>
          <TextField
            label="Rechercher dans mes cartes"
            value={filters.query}
            onChangeText={(query) => setFilters((f) => ({ ...f, query }))}
            placeholder="Titre, pays, catégorie…"
            autoCorrect={false}
            returnKeyType="search"
          />
          <View style={styles.chipWrap}>
            {OWNERSHIP.map((o) => (
              <Chip
                key={o}
                label={OWNERSHIP_LABELS[o]}
                selected={filters.ownership === o}
                count={o === 'new' && stats.newCards > 0 ? stats.newCards : undefined}
                onPress={() => setFilters((f) => ({ ...f, ownership: o }))}
              />
            ))}
          </View>
          <View style={styles.chipWrap}>
            <Chip
              label="Toutes raretés"
              selected={!filters.rarity}
              onPress={() => setFilters((f) => ({ ...f, rarity: null }))}
            />
            {RARITIES.map((r) => {
              const progress = rarityProgress(catalog, player.ownedCards, r);
              return (
                <Chip
                  key={r}
                  label={rarityStyles[r].label}
                  rarity={r}
                  iconOnly
                  countLabel={`${progress.owned}/${progress.total}`}
                  selected={filters.rarity === r}
                  onPress={() => setFilters((f) => ({ ...f, rarity: f.rarity === r ? null : r }))}
                />
              );
            })}
          </View>
          <Button
            label={
              showFilters
                ? 'Masquer les filtres'
                : activeFilterCount
                  ? `Continent et tri (${activeFilterCount})`
                  : 'Continent et tri'
            }
            variant="ghost"
            compact
            icon="filter"
            onPress={() => setShowFilters((v) => !v)}
            style={styles.filtersToggle}
          />
          {showFilters ? (
            <Surface>
              <Text variant="caption" color={colors.textMuted}>
                Continent
              </Text>
              <View style={styles.wrap}>
                <Chip
                  label="Tous"
                  selected={!filters.continent}
                  onPress={() => setFilters((f) => ({ ...f, continent: null }))}
                />
                {CONTINENT_ORDER.map((c: Continent) => (
                  <Chip
                    key={c}
                    label={CONTINENT_LABELS[c]}
                    selected={filters.continent === c}
                    onPress={() => setFilters((f) => ({ ...f, continent: f.continent === c ? null : c }))}
                  />
                ))}
              </View>
              <Text variant="caption" color={colors.textMuted}>
                Tri
              </Text>
              <View style={styles.wrap}>
                {SORTS.map((s) => (
                  <Chip
                    key={s.key}
                    label={s.label}
                    selected={filters.sort === s.key}
                    onPress={() => setFilters((f) => ({ ...f, sort: s.key }))}
                  />
                ))}
              </View>
              <Button label="Réinitialiser" variant="ghost" compact onPress={() => setFilters(COLLECTION_DEFAULTS)} />
            </Surface>
          ) : null}
          {filters.ownership === 'new' && newIds.length > 0 ? (
            <Button
              label="Tout marquer comme vu"
              variant="secondary"
              compact
              loading={markSeen.isPending}
              onPress={() => markSeen.mutate(newIds)}
            />
          ) : null}
          <Text variant="caption" color={colors.textMuted} accessibilityLiveRegion="polite">
            {filtered.length} carte{filtered.length > 1 ? 's' : ''}
          </Text>
        </>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <PlayerHeader title="Collection" fragments={player.fragments} packCount={player.packs.length} />
      {view === 'cards' ? (
        <FlatList
          key={columns}
          data={visibleItems}
          keyExtractor={keyExtractor}
          numColumns={columns}
          columnWrapperStyle={[styles.columns, { gap: columnGap, marginBottom: columnGap, paddingHorizontal: listPadH }]}
          contentContainerStyle={{ paddingBottom: listBottomPad }}
          ListHeaderComponent={
            <View style={[styles.listHeader, { width, paddingHorizontal: spacing.lg }]}>{header}</View>
          }
          ListHeaderComponentStyle={styles.listHeaderWrap}
          refreshing={data.refreshing}
          onRefresh={data.refresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          initialNumToRender={initialCount}
          maxToRenderPerBatch={pageCount}
          updateCellsBatchingPeriod={50}
          windowSize={5}
          // Sur web, removeClippedSubviews coupe souvent le header (filtres).
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: spacing.lg }}>
              {stats.cardsOwned === 0 ? (
                <EmptyState
                  icon="pack"
                  title="Votre collection est vide"
                  message="Ouvrez votre premier paquet pour y ranger vos premières cartes."
                  actionLabel="Mes paquets"
                  onAction={() => router.push('/packs')}
                />
              ) : (
                <EmptyState
                  icon="filter"
                  title="Aucune carte ne correspond"
                  message="Modifiez ou réinitialisez les filtres."
                  actionLabel="Réinitialiser"
                  onAction={() => setFilters(COLLECTION_DEFAULTS)}
                />
              )}
            </View>
          }
          renderItem={renderItem}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: listBottomPad }]}>
          {header}
          {catalog.collections.map((collection) => {
            const progress = collectionProgress(collection, player.ownedCards);
            const complete = progress.total > 0 && progress.owned === progress.total;
            return (
              <Surface
                key={collection.id}
                tone={complete ? 'precious' : 'panel'}
                onPress={() => router.push(`/album/${collection.slug}`)}
                accessibilityLabel={`${collection.title}, ${progress.owned} sur ${progress.total}${complete ? ', complété' : ''}`}
              >
                <Text variant="bodyStrong">{collection.title}</Text>
                <Text variant="caption" color={colors.textMuted} numberOfLines={2}>
                  {collection.description}
                </Text>
                <ProgressBar value={progress.owned} total={progress.total} tone={complete ? 'precious' : 'explore'} />
              </Surface>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  listHeaderWrap: { width: '100%' },
  listHeader: { alignSelf: 'center' },
  header: { gap: spacing.md, paddingBottom: spacing.md },
  total: { gap: spacing.xs, paddingVertical: spacing.sm },
  filtersToggle: { alignSelf: 'flex-start' },
  segment: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  list: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  columns: { gap: spacing.sm },
});
