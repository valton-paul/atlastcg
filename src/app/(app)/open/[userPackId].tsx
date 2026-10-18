import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  colors,
  ErrorState,
  Icon,
  IconButton,
  LoadingState,
  rarityStyles,
  spacing,
  Surface,
  Text,
} from '@/design-system';
import { toCardData } from '@/features/cards/adapters';
import { AtlasCard } from '@/features/cards/AtlasCard';
import type { Catalog } from '@/features/catalog/types';
import { useOpenPack, type OpeningResult } from '@/features/packs/api';
import { initialOpeningState, openingReducer, revealOrder } from '@/features/packs/opening-machine';
import { PackVisual } from '@/features/packs/PackVisual';
import { RevealCard } from '@/features/packs/RevealCard';
import { useCompleteOnboarding } from '@/features/player/api';
import { useAtlasData } from '@/features/player/useAtlasData';
import { toAppError } from '@/lib/errors';
import { useHaptics } from '@/lib/haptics';
import { usePreferences } from '@/lib/preferences';

const rank = (rarity: string) => rarityStyles[rarity as keyof typeof rarityStyles]?.rank ?? 0;

export default function OpenPackScreen() {
  const { userPackId, onboarding } = useLocalSearchParams<{ userPackId: string; onboarding?: string }>();
  const data = useAtlasData();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reduceMotion } = usePreferences();
  const haptic = useHaptics();
  const openPack = useOpenPack();
  const completeOnboarding = useCompleteOnboarding();
  const [state, dispatch] = useReducer(openingReducer, initialOpeningState);
  const startedAt = useRef(0);

  // L'inventaire est rafraîchi pendant l'ouverture : le type de paquet est mémorisé au toucher,
  // puis fourni par le résultat serveur.
  const [openingSlug, setOpeningSlug] = useState<string | null>(null);
  const inventoryPack = data.status === 'ready' ? data.player.packs.find((p) => p.id === userPackId) : undefined;
  const inventorySlug =
    inventoryPack && data.status === 'ready' ? (data.catalog.packsById.get(inventoryPack.pack_id)?.slug ?? null) : null;
  const resultSlug = state.phase === 'revealing' || state.phase === 'summary' ? state.result.pack.slug : null;
  const packSlug = resultSlug ?? openingSlug ?? inventorySlug;

  const lift = useSharedValue(0);
  const float = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    float.set(withRepeat(withSequence(withTiming(1, { duration: 1800 }), withTiming(0, { duration: 1800 })), -1, true));
  }, [float, reduceMotion]);

  const open = useCallback(() => {
    if (state.phase !== 'sealed' && state.phase !== 'error') return;
    haptic('reveal');
    setOpeningSlug(inventorySlug);
    dispatch({ type: 'OPEN' });
    startedAt.current = Date.now();
    if (!reduceMotion) lift.set(withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.4)) }));
    openPack.mutate(userPackId, {
      onSuccess: (result) => {
        // Laisse la courte animation d'ouverture se terminer (jamais plus de 700 ms d'attente).
        const wait = reduceMotion ? 0 : Math.max(0, 700 - (Date.now() - startedAt.current));
        setTimeout(() => dispatch({ type: 'RESOLVED', result }), wait);
      },
      onError: (error) => {
        lift.set(0);
        const appError = toAppError(error);
        haptic('error');
        dispatch({
          type: 'FAILED',
          message: appError.message,
          retryable: appError.retryable || appError.code === 'NETWORK',
        });
      },
    });
  }, [state.phase, haptic, inventorySlug, reduceMotion, lift, openPack, userPackId]);

  const ordered = useMemo(
    () => (state.phase === 'revealing' || state.phase === 'summary' ? revealOrder(state.result.cards, rank) : []),
    [state],
  );

  const current = state.phase === 'revealing' ? ordered[state.index] : undefined;
  useEffect(() => {
    if (state.phase !== 'revealing' || !state.flipped || !current) return;
    haptic(rank(current.rarity) >= 3 ? 'rare' : 'reveal');
    AccessibilityInfo.announceForAccessibility(
      `${current.title}, ${rarityStyles[current.rarity].label}${current.is_new ? ', nouvelle carte' : ', doublon'}`,
    );
  }, [state, current, haptic]);

  const finish = useCallback(
    (target: '/' | '/collection' | '/packs') => {
      if (onboarding) {
        completeOnboarding.mutate(undefined, { onSettled: () => router.replace(target) });
      } else {
        router.replace(target);
      }
    },
    [onboarding, completeOnboarding, router],
  );

  const packStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -float.get() * 6 - lift.get() * 30 },
      { rotate: `${lift.get() * -4}deg` },
      { scale: 1 + lift.get() * 0.06 },
    ],
  }));

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState message={toAppError(data.error).message} onRetry={data.retry} />;

  const catalog = data.catalog;
  const packDef = packSlug ? catalog.packs.find((p) => p.slug === packSlug) : undefined;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.topBar}>
        {state.phase === 'sealed' || state.phase === 'error' ? (
          <IconButton
            icon="close"
            label="Fermer"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        ) : (
          <View style={styles.spacer} />
        )}
        <Text variant="overline" color={colors.textMuted} style={styles.topTitle} align="center">
          {packDef ? `Paquet ${packDef.name}` : 'Ouverture'}
        </Text>
        {state.phase === 'revealing' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Passer l’animation et voir toutes les cartes"
            onPress={() => dispatch({ type: 'SKIP' })}
            style={styles.skip}
            testID="skip-reveal"
          >
            <Text variant="caption" color={colors.turquoise}>
              Tout voir
            </Text>
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      {state.phase === 'sealed' || state.phase === 'opening' ? (
        <View style={styles.center}>
          {packSlug ? (
            <Pressable
              onPress={open}
              disabled={state.phase === 'opening'}
              accessibilityRole="button"
              accessibilityLabel={`Ouvrir le paquet ${packDef?.name ?? ''}`}
              accessibilityState={{ busy: state.phase === 'opening' }}
              testID="sealed-pack"
            >
              <Animated.View style={packStyle}>
                <PackVisual slug={packSlug} width={200} glow={state.phase === 'opening' ? 1 : 0} />
              </Animated.View>
            </Pressable>
          ) : (
            <ErrorState
              title="Paquet déjà ouvert ?"
              message="Ce paquet n’est plus dans votre inventaire. S’il a été ouvert, son contenu peut être retrouvé."
            />
          )}
          {packSlug ? (
            <Text color={colors.textMuted} align="center" accessibilityLiveRegion="polite">
              {state.phase === 'opening'
                ? 'Ouverture en cours…'
                : `Touchez le paquet pour découvrir ${packDef?.cards_per_pack ?? 5} cartes.`}
            </Text>
          ) : (
            <>
              <Button label="Retrouver le résultat" onPress={open} loading={state.phase === 'opening'} />
              <Button label="Voir mes paquets" variant="ghost" onPress={() => router.replace('/packs')} />
            </>
          )}
          {packDef && state.phase === 'sealed' ? (
            <Button label="Voir les probabilités" variant="ghost" compact onPress={() => router.push('/packs')} />
          ) : null}
        </View>
      ) : null}

      {state.phase === 'error' ? (
        <View style={styles.center}>
          <ErrorState
            title="L’ouverture n’a pas abouti"
            message={`${state.message} Aucune carte n’a été perdue : le résultat sera retrouvé à la prochaine tentative.`}
            onRetry={state.retryable ? open : undefined}
          />
          <Button label="Retour à l’accueil" variant="ghost" onPress={() => router.replace('/')} />
        </View>
      ) : null}

      {state.phase === 'revealing' && current ? (
        <View style={styles.center}>
          <Text variant="caption" color={colors.textMuted}>
            Carte {state.index + 1} sur {ordered.length}
          </Text>
          <RevealCard
            key={`${current.slot}-${state.index}`}
            card={toCardData(catalog, current)}
            isNew={current.is_new}
            quantity={current.quantity}
            flipped={state.flipped}
            reduceMotion={reduceMotion}
            onPress={() => dispatch({ type: 'NEXT' })}
          />
          <View style={styles.revealInfo} accessibilityLiveRegion="polite">
            {state.flipped ? (
              current.is_new ? (
                <Text variant="bodyStrong" color={colors.turquoise}>
                  Nouvelle carte ajoutée à votre atlas
                </Text>
              ) : (
                <Text variant="bodyStrong" color={colors.textMuted}>
                  Doublon · +{current.fragments_awarded} fragments
                </Text>
              )
            ) : (
              <Text color={colors.textMuted}>Touchez la carte pour la retourner</Text>
            )}
          </View>
          <Button
            label={
              !state.flipped
                ? 'Révéler'
                : state.index + 1 >= ordered.length
                  ? 'Voir le récapitulatif'
                  : 'Carte suivante'
            }
            onPress={() => dispatch({ type: 'NEXT' })}
            style={styles.wide}
          />
        </View>
      ) : null}

      {state.phase === 'summary' ? (
        <Summary
          result={state.result}
          catalog={catalog}
          ordered={ordered}
          remainingPacks={data.player.packs.filter((p) => p.id !== userPackId).length}
          onboarding={!!onboarding}
          busy={completeOnboarding.isPending}
          onReplay={() => dispatch({ type: 'REPLAY' })}
          onCard={(slug) => router.push(`/card/${slug}`)}
          onFinish={finish}
          onNextPack={() => {
            const next = data.player.packs.find((p) => p.id !== userPackId);
            if (next)
              router.replace({
                pathname: '/open/[userPackId]',
                params: { userPackId: next.id, ...(onboarding ? { onboarding } : {}) },
              });
          }}
        />
      ) : null}
    </View>
  );
}

type SummaryProps = {
  result: OpeningResult;
  catalog: Catalog;
  ordered: OpeningResult['cards'];
  remainingPacks: number;
  onboarding: boolean;
  busy: boolean;
  onReplay: () => void;
  onCard: (slug: string) => void;
  onFinish: (target: '/' | '/collection' | '/packs') => void;
  onNextPack: () => void;
};

function Summary({
  result,
  catalog,
  ordered,
  remainingPacks,
  onboarding,
  busy,
  onReplay,
  onCard,
  onFinish,
  onNextPack,
}: SummaryProps) {
  const { summary } = result;
  const rares = ordered.filter((c) => rank(c.rarity) >= 3);
  const unlockedExpeditions = [
    ...new Set(ordered.filter((c) => c.is_new && c.country_code).map((c) => c.country_code as string)),
  ]
    .map((iso) => catalog.expeditionsByCountry.get(iso))
    .filter((e): e is NonNullable<typeof e> => !!e);

  return (
    <ScrollView contentContainerStyle={styles.summary} testID="opening-summary">
      <View style={styles.summaryHeader}>
        <Text variant="title" align="center">
          {summary.new_count > 0 ? 'Votre atlas s’agrandit' : 'Paquet ouvert'}
        </Text>
        {result.replayed ? (
          <Text variant="caption" color={colors.textMuted} align="center">
            Ce paquet avait déjà été ouvert : voici son contenu.
          </Text>
        ) : null}
      </View>
      <View style={styles.stats}>
        <Stat
          label={summary.new_count > 1 ? 'nouvelles' : 'nouvelle'}
          value={summary.new_count}
          color={colors.turquoise}
        />
        <Stat
          label={summary.duplicate_count > 1 ? 'doublons' : 'doublon'}
          value={summary.duplicate_count}
          color={colors.textMuted}
        />
        <Stat label="fragments" value={summary.fragments_awarded} color={colors.gold} />
      </View>
      <View style={styles.grid}>
        {ordered.map((card) => (
          <AtlasCard
            key={card.slot}
            card={toCardData(catalog, card)}
            isNew={card.is_new}
            quantity={card.quantity}
            size="small"
            onPress={() => onCard(card.slug)}
          />
        ))}
      </View>
      {rares.length > 0 ? (
        <Surface tone="precious">
          <Text variant="bodyStrong">Cartes remarquables</Text>
          {rares.map((card) => (
            <Text key={card.slot} variant="caption">
              {card.title} — {rarityStyles[card.rarity].label}
            </Text>
          ))}
        </Surface>
      ) : null}
      {summary.collections.length > 0 ? (
        <Surface>
          <Text variant="bodyStrong">Collections en progression</Text>
          {summary.collections.map((c) => (
            <View key={c.slug} style={styles.collectionRow}>
              <Text variant="caption" style={styles.flex}>
                {c.title}
              </Text>
              <Text variant="caption" color={colors.turquoise}>
                {c.owned} / {c.total}
              </Text>
            </View>
          ))}
        </Surface>
      ) : null}
      {unlockedExpeditions.length > 0 ? (
        <Surface tone="explore">
          <View style={styles.collectionRow}>
            <Icon name="compass" color={colors.turquoise} size={20} />
            <Text variant="bodyStrong">Nouvelles découvertes</Text>
          </View>
          {unlockedExpeditions.map((e) => (
            <Text key={e.id} variant="caption">
              Expédition disponible : {e.title}
            </Text>
          ))}
        </Surface>
      ) : null}
      <Text variant="caption" color={colors.textMuted} align="center">
        Solde : {summary.fragments_balance} fragments
      </Text>
      <View style={styles.actions}>
        {remainingPacks > 0 ? (
          <Button
            label={`Ouvrir le paquet suivant (${remainingPacks})`}
            icon="sparkle"
            onPress={onNextPack}
            disabled={busy}
          />
        ) : null}
        {onboarding ? (
          <Button
            label="Découvrir mon atlas"
            onPress={() => onFinish('/')}
            loading={busy}
            variant={remainingPacks > 0 ? 'secondary' : 'primary'}
          />
        ) : (
          <>
            <Button
              label="Voir ma collection"
              variant={remainingPacks > 0 ? 'secondary' : 'primary'}
              onPress={() => onFinish('/collection')}
            />
            <Button label="Retour à l’accueil" variant="ghost" onPress={() => onFinish('/')} />
          </>
        )}
        <Button label="Revoir l’ouverture" variant="ghost" compact icon="refresh" onPress={onReplay} />
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Text variant="title" color={color}>
        {value}
      </Text>
      <Text variant="caption" color={colors.textMuted}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.nightDeep },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, minHeight: 48 },
  topTitle: { flex: 1 },
  spacer: { width: 44 },
  skip: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xs,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl },
  revealInfo: { minHeight: 24 },
  wide: { alignSelf: 'stretch' },
  summary: { padding: spacing.lg, gap: spacing.lg },
  summaryHeader: { gap: spacing.xs },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  collectionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  actions: { gap: spacing.sm },
});
