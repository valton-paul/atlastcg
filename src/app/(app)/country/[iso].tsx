import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  Button,
  colors,
  EmptyState,
  ErrorState,
  LoadingState,
  ProgressBar,
  Screen,
  SectionHeader,
  spacing,
  Surface,
  Text,
} from '@/design-system';
import { decorativeSvgProps } from '@/design-system/decorative';
import { toCardData } from '@/features/cards/adapters';
import { AtlasCard } from '@/features/cards/AtlasCard';
import silhouettes from '@/features/cards/data/silhouettes.json';
import { CONTINENT_LABELS } from '@/features/catalog/types';
import { cardsOfCountry, COUNTRY_STATE_LABELS, countryProgress, countryState } from '@/features/collection/progress';
import { sortCards } from '@/features/collection/filters';
import { useAtlasData } from '@/features/player/useAtlasData';
import { errorMessage } from '@/lib/errors';

const SILHOUETTES = silhouettes as { size: number; paths: Record<string, string> };

export default function CountryScreen() {
  const { iso } = useLocalSearchParams<{ iso: string }>();
  const data = useAtlasData();
  const router = useRouter();

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState message={errorMessage(data.error)} onRetry={data.retry} />;

  const { catalog, player } = data;
  const country = catalog.countriesByIso.get(iso?.toUpperCase() ?? '');
  if (!country) {
    return (
      <Screen back title="Pays">
        <EmptyState icon="globe" title="Pays introuvable" message="Ce pays n’est pas encore présent dans Atlas." />
      </Screen>
    );
  }

  const state = countryState(catalog, player.ownedCards, player.expeditions, country.iso_code);
  const progress = countryProgress(catalog, player.ownedCards, country.iso_code);
  const cards = sortCards(catalog, player.ownedCards, cardsOfCountry(catalog, country.iso_code), 'country');
  const expedition = catalog.expeditionsByCountry.get(country.iso_code);
  const expeditionState = expedition ? player.expeditions.get(expedition.id) : undefined;
  const discovered = progress.owned > 0;
  const silhouette = SILHOUETTES.paths[country.iso_numeric];

  return (
    <Screen back title={country.name} subtitle={`${CONTINENT_LABELS[country.continent]} · ${country.region}`}>
      <Surface tone={discovered ? 'explore' : 'panel'} style={styles.hero}>
        {silhouette ? (
          <Svg width={96} height={96} viewBox="0 0 100 100" {...decorativeSvgProps}>
            <Path
              d={silhouette}
              fill={discovered ? colors.turquoise : colors.slateRaised}
              fillOpacity={0.25}
              stroke={discovered ? colors.turquoise : colors.borderStrong}
              strokeWidth={1.2}
            />
          </Svg>
        ) : null}
        <View style={styles.flex}>
          <Text variant="overline" color={discovered ? colors.turquoise : colors.textMuted}>
            {COUNTRY_STATE_LABELS[state]}
          </Text>
          {discovered ? (
            <Text>
              Capitale : <Text variant="bodyStrong">{country.capital}</Text>
            </Text>
          ) : (
            <Text color={colors.textMuted}>Obtenez une carte de ce pays pour révéler ses informations.</Text>
          )}
          <ProgressBar label="Cartes du pays" value={progress.owned} total={progress.total} />
        </View>
      </Surface>

      {expedition ? (
        <>
          <SectionHeader title="Expédition" />
          <Surface tone={expeditionState?.status === 'completed' ? 'precious' : 'raised'}>
            <Text variant="bodyStrong">{expedition.title}</Text>
            <Text variant="caption" color={colors.textMuted}>
              {expedition.summary}
            </Text>
            {!discovered ? (
              <Text variant="caption" color={colors.textMuted}>
                Débloquée dès que vous possédez une carte de ce pays.
              </Text>
            ) : expeditionState?.status === 'completed' ? (
              <Text variant="caption" color={colors.gold}>
                Expédition terminée.
              </Text>
            ) : null}
            <Button
              label={
                expeditionState?.status === 'completed'
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
          </Surface>
        </>
      ) : null}

      <SectionHeader title="Cartes" />
      <View style={styles.grid}>
        {cards.map((card) => {
          const owned = player.ownedCards.get(card.id);
          return (
            <AtlasCard
              key={card.id}
              card={toCardData(catalog, card)}
              locked={!owned}
              isNew={!!owned && !owned.seen_at}
              quantity={owned?.quantity}
              size="medium"
              onPress={() => router.push(`/card/${card.slug}`)}
            />
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  flex: { flex: 1, gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
});
