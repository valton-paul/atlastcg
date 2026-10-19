import { useRouter } from 'expo-router';
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
import { initialOpeningState, openingReducer, revealOrder } from '@/features/packs/opening-machine';
import { packTheme, PackVisual } from '@/features/packs/PackVisual';
import { REVEAL_EFFECTS, RevealCard } from '@/features/packs/RevealCard';
import { useCompleteOnboarding } from '@/features/player/api';
import { useAtlasData } from '@/features/player/useAtlasData';
import { toAppError } from '@/lib/errors';
import { useHaptics } from '@/lib/haptics';
import { usePreferences } from '@/lib/preferences';

const rank = (rarity: string) => rarityStyles[rarity as keyof typeof rarityStyles]?.rank ?? 0;

/** Charge minimale du paquet avant l'éclatement, puis durée de l'éclatement (≈ 0,85 s au total). */
const CHARGE_MS = 420;
const BURST_MS = 420;
/** Même largeur que l’accueil : le paquet ne change pas d’apparence en ouvrant. */
export const OPEN_PACK_WIDTH = 200;

export type OpenPackFlowProps = {
  userPackId: string;
  onboarding?: boolean;
  /** Démarre l’ouverture tout de suite (depuis l’accueil). */
  autoOpen?: boolean;
  /** Overlay sur l’accueil : fermer revient au menu sans navigation. */
  embedded?: boolean;
  onClose?: () => void;
  onFinished?: () => void;
  onRequestNextPack?: (userPackId: string) => void;
};

export function OpenPackFlow({
  userPackId,
  onboarding = false,
  autoOpen = false,
  embedded = false,
  onClose,
  onFinished,
  onRequestNextPack,
}: OpenPackFlowProps) {
  const data = useAtlasData();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reduceMotion } = usePreferences();
  const haptic = useHaptics();
  const openPack = useOpenPack();
  const completeOnboarding = useCompleteOnboarding();
  const [state, dispatch] = useReducer(openingReducer, initialOpeningState);
  const startedAt = useRef(0);
  const autoStarted = useRef(false);

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
  /** true le temps de l’éclatement (particules), sans spoiler de rareté. */
  const [bursting, setBursting] = useState(false);
  /** Horodatage avant lequel on refuse « carte suivante » (anti-spam). */
  const revealUnlockAt = useRef(0);
  /** Fragments déjà convertis pendant cette ouverture (le solde de base vient du résultat serveur). */
  const [gainedFragments, setGainedFragments] = useState(0);
  const [fragmentGain, setFragmentGain] = useState<number | null>(null);
  const [trackedOpeningId, setTrackedOpeningId] = useState<string | null>(null);
  const [trackedRevealIndex, setTrackedRevealIndex] = useState(-1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    if (reduceMotion) return;
    float.set(withRepeat(withSequence(withTiming(1, { duration: 1800 }), withTiming(0, { duration: 1800 })), -1, true));
  }, [float, reduceMotion]);
  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t);
      timers.current = [];
    },
    [],
  );

  const open = useCallback(() => {
    if (state.phase !== 'sealed' && state.phase !== 'error') return;
    haptic('reveal');
    setOpeningSlug(inventorySlug);
    setBursting(false);
    burst.set(0);
    dispatch({ type: 'OPEN' });
    startedAt.current = Date.now();
    if (!reduceMotion) {
      lift.set(withTiming(1, { duration: CHARGE_MS, easing: Easing.out(Easing.cubic) }));
      // Tremblement discret : trop rapide ou trop ample donnait un effet saccadé.
      shake.set(withRepeat(withSequence(withTiming(1, { duration: 70 }), withTiming(-1, { duration: 70 })), -1, true));
    }
    openPack.mutate(userPackId, {
      onSuccess: (result) => {
        if (reduceMotion) {
          dispatch({ type: 'RESOLVED', result });
          return;
        }
        const charge = Math.max(0, CHARGE_MS - (Date.now() - startedAt.current));
        const burstTimer = setTimeout(() => {
          cancelAnimation(shake);
          shake.set(withTiming(0, { duration: 80 }));
          // Haptique neutre : on ne spoile pas la meilleure rareté du tirage.
          haptic('reveal');
          setBursting(true);
          burst.set(withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) }));
          const revealTimer = setTimeout(() => {
            setBursting(false);
            dispatch({ type: 'RESOLVED', result });
          }, BURST_MS);
          timers.current.push(revealTimer);
        }, charge);
        timers.current.push(burstTimer);
      },
      onError: (error) => {
        cancelAnimation(shake);
        shake.set(0);
        lift.set(0);
        burst.set(0);
        setBursting(false);
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

  useEffect(() => {
    if (!autoOpen || autoStarted.current) return;
    if (state.phase !== 'sealed') return;
    if (data.status !== 'ready') return;
    autoStarted.current = true;
    open();
  }, [autoOpen, state.phase, data.status, open]);

  const ordered = useMemo(
    () => (state.phase === 'revealing' || state.phase === 'summary' ? revealOrder(state.result.cards, rank) : []),
    [state],
  );

  const revealingOpeningId = state.phase === 'revealing' ? state.result.opening_id : null;
  const revealingBaseFragments =
    state.phase === 'revealing'
      ? state.result.summary.fragments_balance - state.result.summary.fragments_awarded
      : null;
  if (revealingOpeningId !== trackedOpeningId) {
    setTrackedOpeningId(revealingOpeningId);
    setGainedFragments(0);
    setFragmentGain(null);
    setTrackedRevealIndex(-1);
  }
  const revealIndex = state.phase === 'revealing' ? state.index : -1;
  if (revealIndex !== trackedRevealIndex) {
    setTrackedRevealIndex(revealIndex);
    setFragmentGain(null);
  }
  const liveFragments =
    revealingBaseFragments === null ? null : revealingBaseFragments + gainedFragments;

  const current = state.phase === 'revealing' ? ordered[state.index] : undefined;
  const currentRank = current ? rank(current.rarity) : 0;
  const prestigeKind = currentRank >= 6 ? 'mythic' : currentRank >= 5 ? 'legendary' : null;
  const isPrestigeReveal = prestigeKind !== null;
  const flashKey =
    state.phase === 'revealing' && state.flipped && prestigeKind && !reduceMotion
      ? `${current?.slot}-${state.index}`
      : null;

  // Anti-spam : après retournement, on attend la fin de l’anim (prestige) ou un court dwell (autres).
  useEffect(() => {
    if (state.phase !== 'revealing' || !current) {
      revealUnlockAt.current = 0;
      return;
    }
    if (!state.flipped) {
      revealUnlockAt.current = 0;
      return;
    }
    const effect = REVEAL_EFFECTS[current.rarity as keyof typeof REVEAL_EFFECTS];
    if (reduceMotion) {
      revealUnlockAt.current = Date.now() + 180;
      return;
    }
    // Prestige : hold + flip complets. Autres : dès que la face est visible (~mi-flip) + court dwell.
    const lockMs = isPrestigeReveal
      ? effect.suspend + effect.flip + 280
      : Math.max(360, effect.suspend + effect.flip * 0.55 + 160);
    revealUnlockAt.current = Date.now() + lockMs;
  }, [state, current, isPrestigeReveal, reduceMotion]);

  const onRevealStep = useCallback(() => {
    if (state.phase !== 'revealing' || !current) return;
    if (!state.flipped) {
      dispatch({ type: 'FLIP' });
      return;
    }
    if (Date.now() < revealUnlockAt.current) return;
    dispatch({ type: 'NEXT' });
  }, [state, current]);

  useEffect(() => {
    if (state.phase !== 'revealing' || !state.flipped || !current) return;
    haptic(currentRank >= 6 ? 'mythic' : currentRank >= 5 ? 'legendary' : currentRank >= 3 ? 'rare' : 'reveal');
    AccessibilityInfo.announceForAccessibility(
      `${current.title}, ${rarityStyles[current.rarity].label}${current.is_new ? ', nouvelle carte' : ', doublon'}`,
    );
  }, [state, current, currentRank, haptic]);

  const close = useCallback(() => {
    if (embedded) {
      onClose?.();
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [embedded, onClose, router]);

  const finish = useCallback(
    (target: '/' | '/collection' | '/packs') => {
      const go = () => {
        if (embedded && target === '/') {
          onFinished?.();
          return;
        }
        if (embedded) {
          onFinished?.();
          router.replace(target);
          return;
        }
        router.replace(target);
      };
      if (onboarding) completeOnboarding.mutate(undefined, { onSettled: go });
      else go();
    },
    [embedded, onboarding, completeOnboarding, router, onFinished],
  );

  const packStyle = useAnimatedStyle(() => {
    const b = burst.get();
    const s = shake.get() * lift.get();
    return {
      opacity: 1 - b,
      transform: [
        { translateY: -float.get() * 6 - lift.get() * 18 },
        { translateX: s * 1.5 },
        { rotate: `${s * 1.2}deg` },
        { scale: 1 + lift.get() * 0.04 + b * 0.2 },
      ],
    };
  });
  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState message={toAppError(data.error).message} onRetry={data.retry} />;

  const catalog = data.catalog;
  const packDef = packSlug ? catalog.packs.find((p) => p.slug === packSlug) : undefined;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.topBar}>
        {state.phase === 'sealed' || state.phase === 'error' ? (
          <IconButton icon="close" label="Fermer" onPress={close} />
        ) : embedded && state.phase === 'summary' ? (
          <IconButton icon="close" label="Fermer" onPress={() => finish('/')} />
        ) : (
          <View style={styles.spacer} />
        )}
        <Text variant="overline" color={colors.textMuted} style={styles.topTitle} align="center">
          {packDef ? `Paquet ${packDef.name}` : 'Ouverture'}
        </Text>
        {state.phase === 'revealing' && !isPrestigeReveal ? (
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
              {bursting ? (
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <Shockwave color={packTheme(packSlug).accent} size={280} duration={BURST_MS} />
                  <ParticleBurst
                    count={18}
                    color={packTheme(packSlug).accent}
                    secondary="#FFFFFF"
                    distance={150}
                    duration={BURST_MS}
                    gravity={18}
                  />
                </View>
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
                  <PackVisual
                    slug={packSlug}
                    width={OPEN_PACK_WIDTH}
                    cardsPerPack={packDef?.cards_per_pack ?? 5}
                    glow={state.phase === 'opening' ? 1 : 0}
                  />
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
                : autoOpen
                  ? 'Préparation du paquet…'
                  : `Touchez le paquet pour découvrir ${packDef?.cards_per_pack ?? 5} cartes.`}
            </Text>
          ) : (
            <>
              <Button label="Retrouver le résultat" onPress={open} loading={state.phase === 'opening'} />
              <Button
                label="Voir mes paquets"
                variant="ghost"
                onPress={() => (embedded ? onClose?.() : router.replace('/packs'))}
              />
            </>
          )}
          {packDef && state.phase === 'sealed' && !autoOpen ? (
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
          <Button label="Retour à l’accueil" variant="ghost" onPress={() => finish('/')} />
        </View>
      ) : null}

      {state.phase === 'revealing' && current ? (
        <View style={styles.center}>
          {liveFragments !== null ? (
            <View style={styles.fragmentHud} pointerEvents="none" accessibilityLiveRegion="polite">
              <View style={styles.fragmentChip}>
                <Icon name="fragment" size={16} color={colors.gold} />
                <Text variant="bodyStrong" color={colors.gold}>
                  {liveFragments.toLocaleString('fr-FR')}
                </Text>
              </View>
              {fragmentGain !== null ? (
                <View style={styles.fragmentGain}>
                  <Text variant="caption" color={colors.gold}>
                    +{fragmentGain}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <ProgressDots total={ordered.length} index={state.index} accent={rarityStyles[current.rarity].color} />
          <RevealCard
            key={`${current.slot}-${state.index}`}
            card={toCardData(catalog, current)}
            isNew={current.is_new}
            quantity={current.quantity}
            fragments={current.fragments_awarded}
            flipped={state.flipped}
            reduceMotion={reduceMotion}
            onPress={onRevealStep}
            onDuplicateConvert={(gained) => {
              setGainedFragments((n) => n + gained);
              setFragmentGain(gained);
            }}
          />
          <View style={styles.revealInfo} accessibilityLiveRegion="polite">
            {state.flipped ? (
              current.is_new ? (
                <Text variant="bodyStrong" color={colors.turquoise}>
                  Nouvelle carte
                </Text>
              ) : (
                <Text color={colors.textMuted}>Touche pour continuer</Text>
              )
            ) : (
              <Text color={colors.textMuted}>Touche pour révéler</Text>
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
            onPress={onRevealStep}
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
            if (!next) return;
            if (onRequestNextPack) {
              onRequestNextPack(next.id);
              return;
            }
            router.replace({
              pathname: '/open/[userPackId]',
              params: { userPackId: next.id, ...(onboarding ? { onboarding: '1' } : {}) },
            });
          }}
        />
      ) : null}

      {flashKey && current ? (
        <>
          <ScreenFlash
            key={flashKey}
            color={rarityStyles[current.rarity].color}
            peak={prestigeKind === 'mythic' ? 0.72 : 0.48}
            duration={prestigeKind === 'mythic' ? 900 : 680}
            delay={
              REVEAL_EFFECTS[current.rarity].suspend + REVEAL_EFFECTS[current.rarity].flip * 0.42
            }
          />
          {prestigeKind === 'mythic' ? (
            <ScreenFlash
              key={`${flashKey}-white`}
              color="#FFFFFF"
              peak={0.28}
              duration={420}
              delay={
                REVEAL_EFFECTS[current.rarity].suspend +
                REVEAL_EFFECTS[current.rarity].flip * 0.42 +
                120
              }
            />
          ) : null}
        </>
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

      {remainingPacks > 0 ? (
        <Button
          label={`Ouvrir le paquet suivant (${remainingPacks})`}
          icon="sparkle"
          onPress={onNextPack}
          disabled={busy}
          testID="open-next-pack"
        />
      ) : null}

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
      <Text variant="caption" color={colors.textMuted} align="center">
        Solde : {summary.fragments_balance} fragments
      </Text>
      <View style={styles.actions}>
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

function ProgressDots({ total, index, accent }: { total: number; index: number; accent: string }) {
  return (
    <View
      style={styles.dots}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Carte ${index + 1} sur ${total}`}
      accessibilityValue={{ min: 1, max: total, now: index + 1 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === index
              ? { backgroundColor: accent, transform: [{ scale: 1.25 }] }
              : { backgroundColor: colors.border },
          ]}
        />
      ))}
    </View>
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
  root: { flex: 1, backgroundColor: colors.night },
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
  fragmentHud: {
    position: 'absolute',
    top: 0,
    right: spacing.md,
    alignItems: 'flex-end',
    gap: spacing.xs,
    zIndex: 3,
  },
  fragmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: 'rgba(7, 13, 26, 0.88)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  fragmentGain: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(212, 168, 67, 0.18)',
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  packStage: { width: 300, height: 400, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  revealInfo: { minHeight: 24 },
  wide: { alignSelf: 'stretch' },
  summary: { padding: spacing.lg, gap: spacing.lg },
  summaryHeader: { gap: spacing.xs },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, justifyContent: 'center' },
  collectionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  actions: { gap: spacing.sm },
});
