import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
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
import { ParticleBurst, ScreenFlash, Shockwave } from '@/features/packs/effects';
import { bestRarity, initialOpeningState, openingReducer, revealOrder } from '@/features/packs/opening-machine';
import { packTheme, PackVisual } from '@/features/packs/PackVisual';
import { REVEAL_EFFECTS, RevealCard } from '@/features/packs/RevealCard';
import { useCompleteOnboarding } from '@/features/player/api';
import { useAtlasData } from '@/features/player/useAtlasData';
import { toAppError } from '@/lib/errors';
import { useHaptics } from '@/lib/haptics';
import { usePreferences } from '@/lib/preferences';

const rank = (rarity: string) => rarityStyles[rarity as keyof typeof rarityStyles]?.rank ?? 0;

/** Charge minimale du paquet avant l'éclatement, puis durée de l'éclatement (≈ 0,7 s au total). */
const CHARGE_MS = 380;
const BURST_MS = 320;

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
  const shake = useSharedValue(0);
  const burst = useSharedValue(0);
  // Couleur de la meilleure rareté obtenue : l'éclatement du paquet annonce ce qui l'attend.
  const [burstColor, setBurstColor] = useState<string | null>(null);
  useEffect(() => {
    if (reduceMotion) return;
    float.set(withRepeat(withSequence(withTiming(1, { duration: 1800 }), withTiming(0, { duration: 1800 })), -1, true));
  }, [float, reduceMotion]);

  const open = useCallback(() => {
    if (state.phase !== 'sealed' && state.phase !== 'error') return;
    haptic('reveal');
    setOpeningSlug(inventorySlug);
    setBurstColor(null);
    burst.set(0);
    dispatch({ type: 'OPEN' });
    startedAt.current = Date.now();
    if (!reduceMotion) {
      lift.set(withTiming(1, { duration: CHARGE_MS, easing: Easing.out(Easing.cubic) }));
      shake.set(withRepeat(withSequence(withTiming(1, { duration: 45 }), withTiming(-1, { duration: 45 })), -1, true));
    }
    openPack.mutate(userPackId, {
      onSuccess: (result) => {
        if (reduceMotion) {
          dispatch({ type: 'RESOLVED', result });
          return;
        }
        const charge = Math.max(0, CHARGE_MS - (Date.now() - startedAt.current));
        setTimeout(() => {
          cancelAnimation(shake);
          shake.set(0);
          const best = bestRarity(result.cards, rank);
          haptic(best && rank(best) >= 3 ? 'rare' : 'reveal');
          setBurstColor(best ? rarityStyles[best].color : colors.gold);
          burst.set(withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) }));
          setTimeout(() => dispatch({ type: 'RESOLVED', result }), BURST_MS);
        }, charge);
      },
      onError: (error) => {
        cancelAnimation(shake);
        shake.set(0);
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
  }, [state.phase, haptic, inventorySlug, reduceMotion, lift, shake, burst, openPack, userPackId]);

  const ordered = useMemo(
    () => (state.phase === 'revealing' || state.phase === 'summary' ? revealOrder(state.result.cards, rank) : []),
    [state],
  );

  const current = state.phase === 'revealing' ? ordered[state.index] : undefined;
  const flashKey =
    state.phase === 'revealing' && state.flipped && current && rank(current.rarity) >= 5 && !reduceMotion
      ? `${current.slot}-${state.index}`
      : null;
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
    opacity: 1 - burst.get(),
    transform: [
      { translateY: -float.get() * 6 - lift.get() * 24 },
      { translateX: shake.get() * lift.get() * 3 },
      { rotate: `${shake.get() * lift.get() * 2.5}deg` },
      { scale: 1 + lift.get() * 0.06 + burst.get() * 0.35 },
    ],
  }));
  const auraStyle = useAnimatedStyle(() => ({
    opacity: lift.get() * 0.45 * (1 - burst.get()) + Math.sin(burst.get() * Math.PI) * 0.5,
    transform: [{ scale: 0.8 + lift.get() * 0.3 + burst.get() * 0.9 }],
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
            <View style={styles.packStage}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.packAura,
                  {
                    backgroundColor: burstColor ?? packTheme(packSlug).accent,
                    shadowColor: burstColor ?? packTheme(packSlug).accent,
                  },
                  auraStyle,
                ]}
              />
              {burstColor ? (
                <>
                  <Shockwave color={burstColor} size={320} duration={BURST_MS + 200} />
                  <ParticleBurst count={26} color={burstColor} distance={220} duration={BURST_MS + 300} />
                </>
              ) : null}
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
            </View>
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
            fragments={current.fragments_awarded}
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
                  Doublon converti · +{current.fragments_awarded} fragments
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

      {flashKey && current ? (
        <ScreenFlash
          key={flashKey}
          color={rarityStyles[current.rarity].color}
          peak={0.45}
          delay={REVEAL_EFFECTS[current.rarity].flip * 0.5}
        />
      ) : null}
      {state.phase === 'opening' && burstColor ? (
        <ScreenFlash color={burstColor} peak={0.35} duration={BURST_MS} />
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
        {ordered.map((card, i) => (
          <Animated.View key={card.slot} entering={FadeInDown.delay(i * 60).duration(280)}>
            <AtlasCard
              card={toCardData(catalog, card)}
              isNew={card.is_new}
              quantity={card.quantity}
              size="small"
              onPress={() => onCard(card.slug)}
            />
          </Animated.View>
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
  packStage: { width: 280, height: 340, alignItems: 'center', justifyContent: 'center' },
  packAura: {
    position: 'absolute',
    width: 180,
    height: 250,
    borderRadius: 40,
    shadowOpacity: 1,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
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
