import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import { Button, colors, Icon, MIN_TOUCH, ProgressBar, radius, spacing, Text } from '@/design-system';
import { toCardData } from '@/features/cards/adapters';
import { AtlasCard } from '@/features/cards/AtlasCard';
import { CONTINENT_LABELS, type Catalog, type Country } from '@/features/catalog/types';
import { sortCards } from '@/features/collection/filters';
import {
  cardsOfCountry,
  COLLECTION_TIER_LABELS,
  collectionRatio,
  countryProgress,
  type CollectionTier,
  type OwnedMap,
} from '@/features/collection/progress';

type Props = {
  catalog: Catalog;
  owned: OwnedMap;
  country: Country;
  tier: CollectionTier;
  onClose: () => void;
  /** Expédition en cours : pas de fermeture / changement de pays. */
  locked?: boolean;
  style?: ViewStyle;
  onHeight?: (height: number) => void;
};

/** Détail d'un pays affiché par-dessus la carte, sans quitter la vue. */
export function CountryPanel({
  catalog,
  owned,
  country,
  tier,
  onClose,
  locked = false,
  style,
  onHeight,
}: Props) {
  const router = useRouter();
  const progress = countryProgress(catalog, owned, country.iso_code);
  const discovered = progress.owned > 0;
  const pct = Math.round(collectionRatio(progress) * 100);
  const cards = sortCards(catalog, owned, cardsOfCountry(catalog, country.iso_code), 'rarity');

  const displayName = discovered ? country.name : '???';

  return (
    <View
      style={[styles.panel, discovered && styles.discovered, style]}
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
      testID="country-panel"
      accessibilityLabel={discovered ? `Détail : ${country.name}` : 'Pays inconnu'}
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="overline" color={discovered ? colors.turquoise : colors.textMuted}>
            {COLLECTION_TIER_LABELS[tier]}
            {discovered ? ` · ${CONTINENT_LABELS[country.continent]}` : ''}
          </Text>
          <Text variant="heading" accessibilityRole="header">
            {displayName}
          </Text>
          {discovered ? (
            <Text variant="caption" color={colors.textMuted}>
              {country.region}
              {progress.total > 0 ? ` · ${pct} %` : ''}
            </Text>
          ) : null}
        </View>
        {locked ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer le panneau"
            onPress={onClose}
            style={styles.close}
          >
            <Icon name="close" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {discovered ? (
          <Text>
            Capitale : <Text variant="bodyStrong">{country.capital}</Text>
          </Text>
        ) : (
          <Text variant="caption" color={colors.textMuted}>
            Obtenez une carte de ce pays pour révéler ses informations.
          </Text>
        )}
        <ProgressBar label="Cartes du pays" value={progress.owned} total={progress.total} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
          {cards.map((card) => {
            const entry = owned.get(card.id);
            return (
              <AtlasCard
                key={card.id}
                card={toCardData(catalog, card)}
                locked={!entry}
                isNew={!!entry && !entry.seen_at}
                quantity={entry?.quantity}
                size="small"
                onPress={() => router.push(`/card/${card.slug}`)}
              />
            );
          })}
        </ScrollView>

        <Button
          label="Voir la fiche du pays"
          variant="ghost"
          compact
          icon="chevron-right"
          onPress={() => router.push(`/country/${country.iso_code}`)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
    // Sous la barre de tirage / reprendre (zIndex 30 sur world).
    zIndex: 10,
  },
  discovered: { borderColor: colors.turquoise },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1 },
  close: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing.sm,
    marginRight: -spacing.sm,
  },
  body: { flexGrow: 0 },
  bodyContent: { gap: spacing.md },
  cards: { gap: spacing.sm, paddingVertical: spacing.xs },
});
