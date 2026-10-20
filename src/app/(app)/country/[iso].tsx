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
import {
  cardsOfCountry,
  COLLECTION_TIER_LABELS,
  collectionRatio,
  collectionTier,
  countryProgress,
} from '@/features/collection/progress';
import { sortCards } from '@/features/collection/filters';
import { useCountryJournal, useCountryMastery } from '@/features/expeditions/journal';
import {
  MASTERY_TIER_LABELS,
  masteryNextThreshold,
  masteryTier,
} from '@/features/expeditions/mastery';
import { useAtlasData } from '@/features/player/useAtlasData';
import { errorMessage } from '@/lib/errors';

const SILHOUETTES = silhouettes as { size: number; paths: Record<string, string> };

export default function CountryScreen() {
  const { iso } = useLocalSearchParams<{ iso: string }>();
  const data = useAtlasData();
  const router = useRouter();
  const isoCode = iso?.toUpperCase() ?? '';
  const country = data.status === 'ready' ? data.catalog.countriesByIso.get(isoCode) : undefined;
  const discovered =
    data.status === 'ready' && country
      ? countryProgress(data.catalog, data.player.ownedCards, country.iso_code).owned > 0
      : false;
  const masteryQuery = useCountryMastery(discovered);
  const journalQuery = useCountryJournal(country?.iso_code ?? '', discovered);

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState message={errorMessage(data.error)} onRetry={data.retry} />;

  const { catalog, player } = data;
  if (!country) {
    return (
      <Screen back title="Pays">
        <EmptyState icon="globe" title="Pays introuvable" message="Ce pays n’est pas encore présent dans Atlas TCG." />
      </Screen>
    );
  }

  const progress = countryProgress(catalog, player.ownedCards, country.iso_code);
  const tier = collectionTier(progress);
  const pct = Math.round(collectionRatio(progress) * 100);
  const cards = sortCards(catalog, player.ownedCards, cardsOfCountry(catalog, country.iso_code), 'country');
  const expedition = catalog.expeditionsByCountry.get(country.iso_code);
  const expeditionState = expedition ? player.expeditions.get(expedition.id) : undefined;
  const silhouette = SILHOUETTES.paths[country.iso_numeric];
  const displayName = discovered ? country.name : '???';
  const masteryXp =
    masteryQuery.data?.find((m) => m.country_code === country.iso_code)?.xp ?? 0;
  const masteryCompleted =
    masteryQuery.data?.find((m) => m.country_code === country.iso_code)?.expeditions_completed ?? 0;
  const mastery = masteryTier(masteryXp);
  const nextXp = masteryNextThreshold(masteryXp);
  const journal = journalQuery.data ?? [];
  const canResume = expeditionState?.status === 'in_progress';
  const canReview = expeditionState?.status === 'completed';

  return (
    <Screen
      back
      title={displayName}
      subtitle={discovered ? `${CONTINENT_LABELS[country.continent]} · ${country.region}` : CONTINENT_LABELS[country.continent]}
    >
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
            {COLLECTION_TIER_LABELS[tier]}
            {progress.total > 0 ? ` · ${pct} %` : ''}
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

      {discovered ? (
        <>
          <SectionHeader title="Maîtrise" />
          <Surface tone="explore">
            <Text variant="overline" color={colors.turquoise}>
              {MASTERY_TIER_LABELS[mastery]}
            </Text>
            <Text variant="bodyStrong">{masteryXp} XP d’exploration</Text>
            <Text variant="caption" color={colors.textMuted}>
              {masteryCompleted === 0
                ? 'Complétez une expédition pour progresser.'
                : masteryCompleted === 1
                  ? '1 expédition réussie dans ce pays.'
                  : `${masteryCompleted} expéditions réussies dans ce pays.`}
            </Text>
            {nextXp != null ? (
              <ProgressBar label={`Prochain palier (${nextXp} XP)`} value={masteryXp} total={nextXp} />
            ) : (
              <Text variant="caption" color={colors.gold}>
                Palier maximum atteint.
              </Text>
            )}
          </Surface>
        </>
      ) : null}

      {expedition ? (
        <>
          <SectionHeader title="Expédition" />
          {!discovered ? (
            <Surface tone="panel">
              <Text variant="bodyStrong">???</Text>
              <Text variant="caption" color={colors.textMuted}>
                Obtenez une carte de ce pays pour découvrir l’expédition associée. Les destinations se
                tirent sur la carte du monde.
              </Text>
            </Surface>
          ) : (
            <Surface tone={canReview ? 'precious' : 'raised'}>
              <Text variant="bodyStrong">{expedition.title}</Text>
              <Text variant="caption" color={colors.textMuted}>
                {expedition.summary}
              </Text>
              {canResume ? (
                <Text variant="caption" color={colors.turquoise}>
                  Expédition en cours — vous pouvez la reprendre.
                </Text>
              ) : canReview ? (
                <Text variant="caption" color={colors.gold}>
                  Expédition terminée.
                </Text>
              ) : (
                <Text variant="caption" color={colors.textMuted}>
                  Les destinations se tirent au sort sur la carte du monde (1 charge). Vous ne choisissez
                  pas le pays à explorer.
                </Text>
              )}
              {canResume ? (
                <Button
                  label="Reprendre l’expédition"
                  icon="compass"
                  compact
                  onPress={() => router.push(`/expedition/${expedition.slug}`)}
                />
              ) : canReview ? (
                <Button
                  label="Revoir l’expédition"
                  icon="compass"
                  compact
                  variant="secondary"
                  onPress={() => router.push(`/expedition/${expedition.slug}`)}
                />
              ) : (
                <Button
                  label="Aller à la carte du monde"
                  icon="globe"
                  compact
                  variant="secondary"
                  onPress={() => router.push('/world')}
                />
              )}
            </Surface>
          )}
        </>
      ) : null}

      {discovered && journal.length > 0 ? (
        <>
          <SectionHeader title="Carnet de voyage" />
          {journal.map((entry) => (
            <Surface key={entry.id} tone="panel">
              <Text variant="overline" color={colors.gold}>
                Découverte
              </Text>
              <Text variant="bodyStrong">{entry.title}</Text>
              <Text color={colors.textMuted}>{entry.body}</Text>
            </Surface>
          ))}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, justifyContent: 'center' },
});
