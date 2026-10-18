import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import {
  Button,
  colors,
  EmptyState,
  ErrorState,
  IconButton,
  InlineMessage,
  LoadingState,
  RarityBadge,
  Screen,
  SectionHeader,
  spacing,
  Surface,
  Text,
} from '@/design-system';
import { toCardData } from '@/features/cards/adapters';
import { packsContaining, shareMessage, useCardContent } from '@/features/cards/api';
import { AtlasCard } from '@/features/cards/AtlasCard';
import { CATEGORY_LABELS, CONTINENT_LABELS } from '@/features/catalog/types';
import { useMarkCardsSeen } from '@/features/player/api';
import { useAtlasData } from '@/features/player/useAtlasData';
import { errorMessage } from '@/lib/errors';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export default function CardScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const data = useAtlasData();
  const router = useRouter();
  const markSeen = useMarkCardsSeen();
  const card = data.status === 'ready' ? data.catalog.cardsBySlug.get(slug) : undefined;
  const owned = card && data.status === 'ready' ? data.player.ownedCards.get(card.id) : undefined;
  const content = useCardContent(card?.id ?? null, !!owned);
  const marked = useRef(false);

  useEffect(() => {
    if (owned && !owned.seen_at && !marked.current) {
      marked.current = true;
      markSeen.mutate([owned.card_id]);
    }
  }, [owned, markSeen]);

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState message={errorMessage(data.error)} onRetry={data.retry} />;
  if (!card) {
    return (
      <Screen back title="Carte">
        <EmptyState
          icon="cards"
          title="Carte introuvable"
          message="Cette carte n’existe pas ou n’est plus disponible."
        />
      </Screen>
    );
  }

  const { catalog } = data;
  const country = card.country_code ? catalog.countriesByIso.get(card.country_code) : undefined;
  const cardData = toCardData(catalog, card);

  if (!owned) {
    const packs = packsContaining(catalog, card);
    return (
      <Screen back title="Carte à découvrir">
        <View style={styles.center}>
          <AtlasCard card={cardData} locked size="large" />
        </View>
        <Surface>
          <Text variant="bodyStrong">Vous ne possédez pas encore cette carte</Text>
          <Text color={colors.textMuted}>
            {CATEGORY_LABELS[card.category]}
            {country ? ` · ${country.name}` : ''}. Son contenu sera révélé lorsque vous l’obtiendrez.
          </Text>
          <RarityBadge rarity={card.rarity} />
          {packs.length > 0 ? (
            <Text variant="caption" color={colors.textMuted}>
              Peut apparaître dans : {packs.map((p) => `paquet ${p.name}`).join(', ')}.
            </Text>
          ) : null}
        </Surface>
        {country ? (
          <Button
            label={`Voir ${country.name_with_article}`}
            variant="secondary"
            onPress={() => router.push(`/country/${country.iso_code}`)}
          />
        ) : null}
      </Screen>
    );
  }

  const share = () => {
    Share.share({ message: shareMessage(card, country?.name ?? null) }).catch(() => undefined);
  };

  return (
    <Screen back title={card.title} right={<IconButton icon="share" label="Partager cette carte" onPress={share} />}>
      <View style={styles.center}>
        <AtlasCard card={cardData} size="large" quantity={owned.quantity} />
      </View>
      <View style={styles.meta}>
        <Text variant="caption" color={colors.textMuted}>
          {CATEGORY_LABELS[card.category]}
          {country ? ` · ${country.name} · ${CONTINENT_LABELS[country.continent]}` : ''}
        </Text>
        <Text variant="caption" color={colors.textMuted}>
          Obtenue le {dateFormatter.format(new Date(owned.first_acquired_at))}
          {owned.quantity > 1 ? ` · ${owned.quantity} exemplaires` : ''}
        </Text>
        {card.status === 'archived' ? (
          <InlineMessage message="Cette carte n’est plus distribuée. Elle reste dans votre collection." />
        ) : null}
      </View>

      <SectionHeader title="Découverte" />
      {content.isPending ? (
        <Text color={colors.textMuted}>Chargement…</Text>
      ) : content.isError ? (
        <ErrorState message={errorMessage(content.error)} onRetry={() => void content.refetch()} />
      ) : content.data ? (
        <>
          <Text>{content.data.discovery_text}</Text>
          {content.data.fun_fact ? (
            <Surface tone="explore">
              <Text variant="overline" color={colors.turquoise}>
                Le saviez-vous ?
              </Text>
              <Text>{content.data.fun_fact}</Text>
            </Surface>
          ) : null}
          {content.data.sources.length > 0 ? (
            <View style={styles.sources}>
              <Text variant="overline" color={colors.textMuted}>
                Sources
              </Text>
              {content.data.sources.map((source) => (
                <Text key={source} variant="caption" color={colors.textMuted}>
                  {source}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <Text color={colors.textMuted}>Le texte de découverte de cette carte est en cours de rédaction.</Text>
      )}

      {card.illustration_credit ? (
        <Text variant="caption" color={colors.textFaint}>
          Illustration : {card.illustration_credit}
        </Text>
      ) : (
        <Text variant="caption" color={colors.textFaint}>
          Illustration cartographique d’après Natural Earth (domaine public).
        </Text>
      )}

      <View style={styles.actions}>
        {country ? (
          <Button
            label={`Explorer ${country.name_with_article}`}
            icon="globe"
            variant="secondary"
            onPress={() => router.push(`/country/${country.iso_code}`)}
          />
        ) : null}
        <Button label="Partager" icon="share" variant="ghost" onPress={share} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.md },
  meta: { gap: spacing.xs },
  sources: { gap: spacing.xxs },
  actions: { gap: spacing.sm },
});
