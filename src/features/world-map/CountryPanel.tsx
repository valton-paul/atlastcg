import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import { Button, colors, Icon, MIN_TOUCH, ProgressBar, radius, spacing, Text } from '@/design-system';
import { toCardData } from '@/features/cards/adapters';
import { AtlasCard } from '@/features/cards/AtlasCard';
import { CONTINENT_LABELS, type Catalog, type Country } from '@/features/catalog/types';
import { sortCards } from '@/features/collection/filters';
import {
  cardsOfCountry,
  COUNTRY_STATE_LABELS,
  countryProgress,
  type CountryState,
  type OwnedMap,
} from '@/features/collection/progress';
import type { UserExpedition } from '@/features/player/api';

type Props = {
  catalog: Catalog;
  owned: OwnedMap;
  expeditions: ReadonlyMap<string, UserExpedition>;
  country: Country;
  state: CountryState;
  onClose: () => void;
  style?: ViewStyle;
  onHeight?: (height: number) => void;
};

/** Détail d'un pays affiché par-dessus la carte, sans quitter la vue. */
export function CountryPanel({ catalog, owned, expeditions, country, state, onClose, style, onHeight }: Props) {
  const router = useRouter();
  const progress = countryProgress(catalog, owned, country.iso_code);
  const discovered = progress.owned > 0;
  const cards = sortCards(catalog, owned, cardsOfCountry(catalog, country.iso_code), 'rarity');
  const expedition = catalog.expeditionsByCountry.get(country.iso_code);
  const expeditionState = expedition ? expeditions.get(expedition.id) : undefined;

  return (
    <View
      style={[styles.panel, discovered && styles.discovered, style]}
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
      testID="country-panel"
      accessibilityLabel={`Détail : ${country.name}`}
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="overline" color={discovered ? colors.turquoise : colors.textMuted}>
            {COUNTRY_STATE_LABELS[state]} · {CONTINENT_LABELS[country.continent]}
          </Text>
          <Text variant="heading" accessibilityRole="header">
            {country.name}
          </Text>
          <Text variant="caption" color={colors.textMuted}>
            {country.region}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer le panneau"
          onPress={onClose}
          style={styles.close}
        >
          <Icon name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {discovered ? (
          <Text>
            Capitale : <Text variant="bodyStrong">{country.capital}</Text>
          </Text>
        ) : (
          <Text variant="caption" color={colors.textMuted}>
            Obtenez une carte de ce pays pour révéler ses informations et débloquer son expédition.
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

        {expedition ? (
          <View style={styles.expedition}>
            <Text variant="overline" color={colors.textMuted}>
              Expédition
            </Text>
            <Text variant="bodyStrong">{expedition.title}</Text>
            <Text variant="caption" color={colors.textMuted} numberOfLines={3}>
              {expedition.summary}
            </Text>
            <Button
              label={
                !discovered
                  ? 'Expédition verrouillée'
                  : expeditionState?.status === 'completed'
                    ? 'Revoir l’expédition'
                    : expeditionState
                      ? 'Reprendre l’expédition'
                      : 'Partir en expédition'
              }
              icon="compass"
              compact
              disabled={!discovered}
              variant={expeditionState?.status === 'completed' ? 'secondary' : 'primary'}
              onPress={() => router.push(`/expedition/${expedition.slug}`)}
            />
          </View>
        ) : null}

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
  expedition: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.night,
  },
});
