import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  colors,
  EmptyState,
  ErrorState,
  InlineMessage,
  LoadingState,
  ProgressBar,
  RarityGlyph,
  rarityStyles,
  Screen,
  SectionHeader,
  spacing,
  Surface,
  Text,
} from '@/design-system';
import type { PackDefinition } from '@/features/catalog/types';
import { useExchangeFragments } from '@/features/packs/api';
import { formatProbability } from '@/features/packs/format';
import { PackVisual } from '@/features/packs/PackVisual';
import { useAtlasData } from '@/features/player/useAtlasData';
import { errorMessage } from '@/lib/errors';
import { useHaptics } from '@/lib/haptics';

const SOURCE_LABELS = {
  starter: 'Cadeau de bienvenue',
  expedition: 'Récompense d’expédition',
  objective: 'Récompense d’objectif',
  daily: 'Paquet du jour',
  timer: 'Recharge automatique',
  fragment_exchange: 'Échange de fragments',
} as const;

function DropRates({ pack }: { pack: PackDefinition }) {
  const rates = [...pack.pack_drop_rates].sort((a, b) => rarityStyles[a.rarity].rank - rarityStyles[b.rarity].rank);
  return (
    <View style={styles.rates} accessibilityLabel={`Probabilités par carte du paquet ${pack.name}`}>
      {rates.map((rate) => (
        <View
          key={rate.rarity}
          style={styles.rateRow}
          accessible
          accessibilityLabel={`${rarityStyles[rate.rarity].label} : ${formatProbability(rate.probability)}`}
        >
          <RarityGlyph rarity={rate.rarity} />
          <Text variant="caption" style={styles.flex}>
            {rarityStyles[rate.rarity].label}
          </Text>
          <Text variant="caption" color={colors.textMuted}>
            {formatProbability(rate.probability)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function PacksScreen() {
  const data = useAtlasData();
  const router = useRouter();
  const exchange = useExchangeFragments();
  const haptic = useHaptics();

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState message={errorMessage(data.error)} onRetry={data.retry} />;

  const { catalog, player } = data;
  const cost = catalog.settings.fragmentExchangeCost;
  const exchangePack = catalog.packs.find((p) => p.slug === catalog.settings.fragmentExchangePackSlug);

  return (
    <Screen title="Mes paquets" back refreshing={data.refreshing} onRefresh={data.refresh}>
      {player.packs.length === 0 ? (
        <EmptyState
          icon="pack"
          title="Aucun paquet à ouvrir"
          message="Un nouveau paquet arrive toutes les 10 minutes. Expéditions et objectifs en rapportent aussi."
        />
      ) : (
        player.packs.map((userPack) => {
          const def = catalog.packsById.get(userPack.pack_id);
          if (!def) return null;
          return (
            <Surface key={userPack.id} tone="raised" style={styles.packRow}>
              <PackVisual slug={def.slug} width={64} />
              <View style={styles.flex}>
                <Text variant="bodyStrong">Paquet {def.name}</Text>
                <Text variant="caption" color={colors.textMuted}>
                  {SOURCE_LABELS[userPack.source]}
                </Text>
              </View>
              <Button label="Ouvrir" compact onPress={() => router.push(`/open/${userPack.id}`)} />
            </Surface>
          );
        })
      )}

      {cost && exchangePack ? (
        <>
          <SectionHeader title="Fragments" />
          <Surface tone="precious">
            <Text color={colors.text}>
              Chaque doublon rapporte des fragments. {cost} fragments s’échangent contre un paquet {exchangePack.name}.
            </Text>
            <ProgressBar value={Math.min(player.fragments, cost)} total={cost} tone="precious" label="Fragments" />
            <Button
              label={`Échanger ${cost} fragments`}
              variant="precious"
              disabled={player.fragments < cost}
              loading={exchange.isPending}
              onPress={() => exchange.mutate(undefined, { onSuccess: () => haptic('success') })}
            />
            {exchange.isError ? <InlineMessage tone="error" message={errorMessage(exchange.error)} /> : null}
            {exchange.isSuccess && exchange.data.packs_granted > 0 ? (
              <InlineMessage tone="success" message="Un nouveau paquet a été ajouté à votre inventaire." />
            ) : null}
          </Surface>
        </>
      ) : null}

      <SectionHeader title="Contenu des paquets" />
      <Text variant="caption" color={colors.textMuted}>
        Probabilités de rareté pour chaque carte, identiques pour tous les joueurs. Aucun paquet n’est vendu.
      </Text>
      {catalog.packs.map((pack) => (
        <Surface key={pack.id}>
          <Text variant="bodyStrong">Paquet {pack.name}</Text>
          <Text variant="caption" color={colors.textMuted}>
            {pack.description} · {pack.cards_per_pack} cartes
          </Text>
          <DropRates pack={pack} />
        </Surface>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  packRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  rates: { gap: spacing.xs, marginTop: spacing.xs },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
