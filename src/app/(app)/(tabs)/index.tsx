import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  colors,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  ProgressBar,
  SectionHeader,
  spacing,
  Surface,
  Text,
} from '@/design-system';
import { atlasStats, cardsOfCountry } from '@/features/collection/progress';
import { isClaimable, nextObjective, useObjectives } from '@/features/objectives/api';
import { useClaimDaily, useDailyStatus, useInterruptedOpenings } from '@/features/packs/api';
import { PackVisual } from '@/features/packs/PackVisual';
import { PlayerHeader } from '@/features/player/PlayerHeader';
import { useAtlasData } from '@/features/player/useAtlasData';
import { errorMessage } from '@/lib/errors';
import { useHaptics } from '@/lib/haptics';

export default function HomeScreen() {
  const data = useAtlasData();
  const router = useRouter();
  const objectives = useObjectives(data.status === 'ready');
  const daily = useDailyStatus(data.status === 'ready');
  const claimDaily = useClaimDaily();
  const interrupted = useInterruptedOpenings(data.status === 'ready');
  const haptic = useHaptics();

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') {
    return <ErrorState message={errorMessage(data.error)} onRetry={data.retry} />;
  }

  const { catalog, player } = data;
  const stats = atlasStats(catalog, player.ownedCards, player.expeditions);
  const firstPack = player.packs[0];
  const firstPackDef = firstPack ? catalog.packsById.get(firstPack.pack_id) : undefined;
  const objective = objectives.data ? nextObjective(objectives.data) : null;

  const inProgress = catalog.expeditions.find((e) => player.expeditions.get(e.id)?.status === 'in_progress');
  const suggestion = inProgress
    ? null
    : catalog.expeditions.find(
        (e) =>
          !player.expeditions.has(e.id) &&
          cardsOfCountry(catalog, e.country_code).some((c) => player.ownedCards.has(c.id)),
      );
  const featuredExpedition = inProgress ?? suggestion;
  const featuredCountry = featuredExpedition ? catalog.countriesByIso.get(featuredExpedition.country_code) : undefined;

  return (
    <View style={styles.root}>
      <PlayerHeader
        subtitle="Votre atlas"
        title={player.profile.display_name}
        fragments={player.fragments}
        packCount={player.packs.length}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={data.refreshing} onRefresh={data.refresh} tintColor={colors.turquoise} />
        }
      >
        {interrupted.data && interrupted.data.length > 0 ? (
          <Surface tone="explore" onPress={() => router.push(`/open/${interrupted.data[0]}`)}>
            <Text variant="bodyStrong">Une ouverture a été interrompue</Text>
            <Text variant="caption" color={colors.textMuted}>
              Vos cartes sont en sécurité. Touchez ici pour afficher le résultat.
            </Text>
          </Surface>
        ) : null}

        {firstPack && firstPackDef ? (
          <Surface tone="raised" style={styles.packHero}>
            <PackVisual slug={firstPackDef.slug} width={96} />
            <View style={styles.packText}>
              <Text variant="overline" color={colors.turquoise}>
                {player.packs.length > 1 ? `${player.packs.length} paquets à ouvrir` : 'Un paquet vous attend'}
              </Text>
              <Text variant="heading">Paquet {firstPackDef.name}</Text>
              <Text variant="caption" color={colors.textMuted}>
                {firstPackDef.cards_per_pack} cartes à découvrir
              </Text>
              <Button
                label="Ouvrir"
                icon="sparkle"
                compact
                onPress={() => router.push(`/open/${firstPack.id}`)}
                testID="home-open-pack"
              />
            </View>
          </Surface>
        ) : (
          <Surface>
            <Text variant="heading">Aucun paquet pour le moment</Text>
            <Text color={colors.textMuted}>
              Terminez une expédition, atteignez un objectif ou récupérez le paquet du jour pour continuer votre
              collection.
            </Text>
          </Surface>
        )}

        {daily.data ? (
          <Surface tone={daily.data.available ? 'explore' : 'panel'} style={styles.row}>
            <Icon name="calendar" color={daily.data.available ? colors.turquoise : colors.textMuted} />
            <View style={styles.flex}>
              <Text variant="bodyStrong">Paquet du jour</Text>
              <Text variant="caption" color={colors.textMuted}>
                {daily.data.available
                  ? 'Un paquet Exploration offert, sans obligation de revenir chaque jour.'
                  : 'Déjà récupéré aujourd’hui. Le prochain sera disponible demain.'}
              </Text>
            </View>
            {daily.data.available ? (
              <Button
                label="Récupérer"
                compact
                loading={claimDaily.isPending}
                onPress={() =>
                  claimDaily.mutate(undefined, {
                    onSuccess: (r) => r.granted && haptic('success'),
                  })
                }
              />
            ) : null}
          </Surface>
        ) : null}
        {claimDaily.isError ? <InlineMessage tone="error" message={errorMessage(claimDaily.error)} /> : null}

        <SectionHeader
          title="Progression"
          actionLabel="Voir la collection"
          onAction={() => router.push('/collection')}
        />
        <Surface>
          <ProgressBar label="Cartes découvertes" value={stats.cardsOwned} total={stats.cardsTotal} />
          <ProgressBar label="Pays découverts" value={stats.countriesDiscovered} total={stats.countriesTotal} />
          {stats.newCards > 0 ? (
            <Button
              label={
                stats.newCards > 1 ? `${stats.newCards} nouvelles cartes à consulter` : '1 nouvelle carte à consulter'
              }
              variant="ghost"
              compact
              onPress={() => router.push({ pathname: '/collection', params: { filter: 'new' } })}
            />
          ) : null}
        </Surface>

        <SectionHeader title="Expédition" actionLabel="Carte du monde" onAction={() => router.push('/world')} />
        {featuredExpedition && featuredCountry ? (
          <Surface
            tone="explore"
            onPress={() => router.push(`/expedition/${featuredExpedition.slug}`)}
            accessibilityLabel={`${inProgress ? 'Reprendre' : 'Commencer'} l’expédition ${featuredExpedition.title}`}
          >
            <Text variant="overline" color={colors.turquoise}>
              {inProgress ? 'En cours' : 'Disponible'} · {featuredCountry.name}
            </Text>
            <Text variant="heading">{featuredExpedition.title}</Text>
            {inProgress ? (
              <ProgressBar
                value={player.completedSteps.get(featuredExpedition.id) ?? 0}
                total={player.stepTotals.get(featuredExpedition.id) ?? 1}
                label="Étapes terminées"
              />
            ) : (
              <Text variant="caption" color={colors.textMuted}>
                {featuredExpedition.summary}
              </Text>
            )}
          </Surface>
        ) : (
          <Surface>
            <Text color={colors.textMuted}>
              {stats.cardsOwned === 0
                ? 'Ouvrez votre premier paquet : chaque pays découvert débloque une expédition.'
                : 'Toutes les expéditions disponibles sont terminées. Découvrez de nouveaux pays pour en débloquer d’autres.'}
            </Text>
          </Surface>
        )}

        <SectionHeader
          title="Prochain objectif"
          actionLabel="Tous les objectifs"
          onAction={() => router.push('/objectives')}
        />
        {objectives.isPending ? (
          <Surface>
            <Text color={colors.textMuted}>Chargement des objectifs…</Text>
          </Surface>
        ) : objective ? (
          <Surface tone={isClaimable(objective) ? 'precious' : 'panel'} onPress={() => router.push('/objectives')}>
            <Text variant="bodyStrong">{objective.title}</Text>
            <Text variant="caption" color={colors.textMuted}>
              {objective.description}
            </Text>
            <ProgressBar
              value={Math.min(objective.progress, objective.target)}
              total={objective.target}
              tone={isClaimable(objective) ? 'precious' : 'explore'}
            />
            {isClaimable(objective) ? (
              <Text variant="caption" color={colors.gold}>
                Récompense prête : {objective.reward.quantity} paquet{objective.reward.quantity > 1 ? 's' : ''}{' '}
                {objective.reward.pack_name}
              </Text>
            ) : null}
          </Surface>
        ) : (
          <Surface>
            <Text color={colors.textMuted}>
              {objectives.isError
                ? errorMessage(objectives.error)
                : 'Tous les objectifs actuels sont accomplis. Bravo !'}
            </Text>
          </Surface>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  packHero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  packText: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
});
