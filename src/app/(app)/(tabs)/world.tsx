import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  Chip,
  colors,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  MIN_TOUCH,
  ProgressBar,
  radius,
  SectionHeader,
  spacing,
  Surface,
  Text,
} from '@/design-system';
import { CONTINENT_LABELS, CONTINENT_ORDER } from '@/features/catalog/types';
import {
  atlasStats,
  COLLECTION_TIER_LABELS,
  COLLECTION_TIER_ORDER,
  collectionTier,
  continentProgress,
  countryProgress,
  type CollectionTier,
} from '@/features/collection/progress';
import {
  buildDrawSequence,
  drawStepDelay,
  useDrawExpedition,
  useExpeditionCharges,
  useRevealExpeditionDraw,
  type ExpeditionDraw,
} from '@/features/expeditions/draw';
import { formatCountdown, useCountdown } from '@/features/packs/useCountdown';
import { PlayerHeader } from '@/features/player/PlayerHeader';
import { useAtlasData } from '@/features/player/useAtlasData';
import { CountryPanel } from '@/features/world-map/CountryPanel';
import { TIER_FILL, WorldMap } from '@/features/world-map/WorldMap';
import { errorMessage } from '@/lib/errors';
import { useHaptics } from '@/lib/haptics';
import { usePreferences } from '@/lib/preferences';
import { queryKeys } from '@/lib/query-client';
import { useQueryClient } from '@tanstack/react-query';

const SIDE_PANEL_MIN_FRAME = 700;
const SIDE_PANEL_WIDTH = 360;

type DrawPhase = 'idle' | 'spinning' | 'winner' | 'reveal';

function LegendItem({ tier }: { tier: CollectionTier }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: TIER_FILL[tier] }]} />
      <Text variant="caption" color={colors.textMuted}>
        {COLLECTION_TIER_LABELS[tier]}
      </Text>
    </View>
  );
}

export default function WorldScreen() {
  const data = useAtlasData();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { reduceMotion } = usePreferences();
  const haptic = useHaptics();
  const drawExpedition = useDrawExpedition();
  const revealDraw = useRevealExpeditionDraw();
  const charges = useExpeditionCharges(data.status === 'ready');
  const nextChargeIn = useCountdown(charges.data?.nextAt ?? null);
  const nextChargeDue = nextChargeIn === 0;
  useEffect(() => {
    if (nextChargeDue) void queryClient.invalidateQueries({ queryKey: queryKeys.expeditionCharges });
  }, [nextChargeDue, queryClient]);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [selected, setSelected] = useState<string | null>(null);
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const [drawPhase, setDrawPhase] = useState<DrawPhase>('idle');
  const [drawResult, setDrawResult] = useState<ExpeditionDraw | null>(null);
  const [drawHighlight, setDrawHighlight] = useState<string | null>(null);
  const [drawWinner, setDrawWinner] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const derived = useMemo(() => {
    if (data.status !== 'ready') return null;
    const { catalog, player } = data;
    const tiersByNumeric = new Map<string, CollectionTier>();
    const tiersByIso = new Map<string, CollectionTier>();
    for (const country of catalog.countries) {
      const progress = countryProgress(catalog, player.ownedCards, country.iso_code);
      const tier = collectionTier(progress);
      tiersByNumeric.set(country.iso_numeric, tier);
      tiersByIso.set(country.iso_code, tier);
    }
    return { tiersByNumeric, tiersByIso };
  }, [data]);

  const animPool = useMemo(() => {
    if (data.status !== 'ready') return [] as string[];
    const { catalog, player } = data;
    return catalog.expeditions
      .filter((e) => countryProgress(catalog, player.ownedCards, e.country_code).owned > 0)
      .map((e) => catalog.countriesByIso.get(e.country_code)?.iso_numeric)
      .filter((id): id is string => !!id);
  }, [data]);

  const finishReveal = useCallback(
    (result: ExpeditionDraw) => {
      setDrawPhase('reveal');
      setDrawHighlight(null);
      setDrawWinner(result.iso_numeric);
      setSelected(result.iso_numeric);
      if (result.draw_id) {
        revealDraw.mutate(result.draw_id);
      }
    },
    [revealDraw],
  );

  const runSpin = useCallback(
    (result: ExpeditionDraw) => {
      clearTimers();
      setSelected(null);
      setDrawResult(result);
      setDrawWinner(null);

      if (result.already_active || reduceMotion) {
        finishReveal(result);
        return;
      }

      setDrawPhase('spinning');
      const sequence = buildDrawSequence(result.iso_numeric, animPool);
      let elapsed = 0;
      sequence.forEach((id, index) => {
        const delay = drawStepDelay(index, sequence.length);
        elapsed += delay;
        const timer = setTimeout(() => {
          setDrawHighlight(id);
          if (index === sequence.length - 1) {
            haptic('rare');
            setDrawPhase('winner');
            setDrawWinner(id);
            const revealTimer = setTimeout(() => finishReveal(result), 700);
            timers.current.push(revealTimer);
          } else if (index % 3 === 0) {
            haptic('tap');
          }
        }, elapsed);
        timers.current.push(timer);
      });
    },
    [animPool, clearTimers, finishReveal, haptic, reduceMotion],
  );

  const launchDraw = useCallback(() => {
    if (drawPhase === 'spinning' || drawPhase === 'winner') return;
    drawExpedition.mutate(undefined, {
      onSuccess: (result) => runSpin(result),
    });
  }, [drawExpedition, drawPhase, runSpin]);

  const skipDraw = useCallback(() => {
    if (!drawResult || (drawPhase !== 'spinning' && drawPhase !== 'winner')) return;
    clearTimers();
    finishReveal(drawResult);
  }, [clearTimers, drawPhase, drawResult, finishReveal]);

  if (data.status === 'loading' || !derived) return <LoadingState />;
  if (data.status === 'error') return <ErrorState message={errorMessage(data.error)} onRetry={data.retry} />;

  const { catalog, player } = data;
  const stats = atlasStats(catalog, player.ownedCards, player.expeditions);
  const activeExpedition = [...player.expeditions.values()].find((e) => e.status === 'in_progress');
  const activeCountryNumeric = (() => {
    if (!activeExpedition) return null;
    const def = catalog.expeditions.find((e) => e.id === activeExpedition.expedition_id);
    if (!def) return null;
    return catalog.countriesByIso.get(def.country_code)?.iso_numeric ?? null;
  })();
  const drawing = drawPhase === 'spinning' || drawPhase === 'winner';
  /** Tirage / expédition en cours : le pays reste verrouillé (et en rouge si destination tirée). */
  const countryLocked = drawing || drawPhase === 'reveal' || !!activeExpedition;
  const effectiveSelected =
    drawing ? null : countryLocked && activeCountryNumeric ? activeCountryNumeric : selected;
  const selectedCountry = effectiveSelected
    ? catalog.countries.find((c) => c.iso_numeric === effectiveSelected)
    : undefined;
  const selectedTier = selectedCountry ? derived.tiersByIso.get(selectedCountry.iso_code) : undefined;
  const side = frame ? frame.width >= SIDE_PANEL_MIN_FRAME : false;
  const panelWidth = frame ? Math.min(SIDE_PANEL_WIDTH, frame.width * 0.42) : 0;
  const panelOpen = !!(selectedCountry && selectedTier) && drawPhase !== 'spinning';
  const insetRight = panelOpen && side ? panelWidth + spacing.md * 2 : 0;
  const insetBottom = panelOpen && !side ? panelHeight + spacing.md * 2 : 0;
  const chargeCount = charges.data?.charges ?? 0;
  const chargeMax = charges.data?.maxStored ?? 10;
  const canLaunchDraw = chargeCount > 0 || !!activeExpedition;
  /** Rouge tant que la destination tirée n’a pas été quittée via « Partir ». */
  const mapWinner = drawWinner;

  const clearDrawHighlight = () => {
    setDrawPhase('idle');
    setDrawResult(null);
    setDrawWinner(null);
    setDrawHighlight(null);
  };

  const goToExpedition = (slug: string) => {
    clearDrawHighlight();
    router.push(`/expedition/${slug}`);
  };

  const toolbar = (
    <View style={styles.toolbar}>
      <View style={styles.segment}>
        <Chip label="Carte" selected={mode === 'map'} onPress={() => setMode('map')} />
        <Chip label="Liste des pays" selected={mode === 'list'} onPress={() => setMode('list')} />
      </View>
      <ProgressBar label="Pays découverts" value={stats.countriesDiscovered} total={stats.countriesTotal} />
    </View>
  );

  if (mode === 'map') {
    return (
      <View style={styles.root}>
        <PlayerHeader title="Carte du monde" fragments={player.fragments} packCount={player.packs.length} />
        <View style={styles.mapToolbar}>{toolbar}</View>
        <View
          style={styles.mapArea}
          onLayout={(e) => setFrame({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
          accessibilityLabel="Carte du monde interactive. Utilisez la liste des pays pour une navigation accessible."
        >
          {frame ? (
            <WorldMap
              width={frame.width}
              height={frame.height}
              tiers={derived.tiersByNumeric}
              selected={effectiveSelected}
              onSelect={(id) => {
                if (countryLocked) return;
                setSelected(id);
              }}
              reduceMotion={reduceMotion}
              insetRight={insetRight}
              insetBottom={insetBottom}
              drawHighlight={drawHighlight}
              drawWinner={mapWinner}
              interactionEnabled={!countryLocked}
            />
          ) : null}

          {drawPhase !== 'reveal' ? (
            <View style={styles.drawBar} pointerEvents="box-none">
              {drawing ? (
                <Button label="Passer" variant="secondary" compact onPress={skipDraw} />
              ) : (
                <Button
                  label={
                    activeExpedition
                      ? 'Reprendre l’expédition'
                      : chargeCount <= 0
                        ? nextChargeIn !== null
                          ? `Prochaine charge dans ${formatCountdown(nextChargeIn)}`
                          : 'Aucune charge disponible'
                        : `Lancer une expédition (${chargeCount}/${chargeMax})`
                  }
                  icon="compass"
                  disabled={!canLaunchDraw}
                  onPress={() => {
                    if (activeExpedition && drawPhase === 'idle') {
                      const def = catalog.expeditions.find((e) => e.id === activeExpedition.expedition_id);
                      if (def) {
                        goToExpedition(def.slug);
                        return;
                      }
                    }
                    launchDraw();
                  }}
                  loading={drawExpedition.isPending || charges.isLoading}
                />
              )}
              {drawExpedition.isError ? (
                <InlineMessage tone="error" message={errorMessage(drawExpedition.error)} />
              ) : null}
              {charges.isError ? <InlineMessage tone="error" message={errorMessage(charges.error)} /> : null}
            </View>
          ) : null}

          {drawPhase === 'reveal' && drawResult ? (
            <Surface tone="explore" style={styles.revealCard}>
              <Text variant="overline" color={colors.gold}>
                Destination
              </Text>
              <Text variant="heading">{drawResult.country_name}</Text>
              <Text variant="caption" color={colors.textMuted}>
                Capitale : {drawResult.capital}
              </Text>
              <Text numberOfLines={3}>{drawResult.summary}</Text>
              <Button
                label="Partir en expédition"
                icon="sparkle"
                onPress={() => goToExpedition(drawResult.expedition_slug)}
              />
              <Button
                label="Rester sur la carte"
                variant="ghost"
                compact
                onPress={() => {
                  setDrawPhase('idle');
                  setDrawResult(null);
                }}
              />
            </Surface>
          ) : null}

          {!panelOpen || side ? (
            <View style={styles.legend} pointerEvents="none">
              {COLLECTION_TIER_ORDER.map((tier) => (
                <LegendItem key={tier} tier={tier} />
              ))}
            </View>
          ) : null}
          {!panelOpen && drawPhase === 'idle' ? (
            <View style={styles.hint} pointerEvents="none">
              <Text variant="caption" color={colors.textMuted} align="center">
                Jusqu’à 10 charges (1 toutes les 30 min), parmi vos pays découverts. Touchez un pays pour son détail.
              </Text>
            </View>
          ) : null}
          {selectedCountry && selectedTier && frame && drawPhase !== 'spinning' && drawPhase !== 'reveal' ? (
            <CountryPanel
              catalog={catalog}
              owned={player.ownedCards}
              country={selectedCountry}
              tier={selectedTier}
              locked={countryLocked}
              onClose={() => {
                if (countryLocked) return;
                setSelected(null);
              }}
              onHeight={side ? undefined : setPanelHeight}
              style={
                side
                  ? { top: spacing.md, right: spacing.md, bottom: spacing.md, width: panelWidth }
                  : { left: spacing.md, right: spacing.md, bottom: spacing.md, maxHeight: frame.height * 0.6 }
              }
            />
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <PlayerHeader title="Carte du monde" fragments={player.fragments} packCount={player.packs.length} />
      <ScrollView contentContainerStyle={styles.content}>
        {toolbar}
        {CONTINENT_ORDER.map((continent) => {
          const countries = catalog.countries.filter((c) => c.continent === continent);
          if (countries.length === 0) return null;
          const progress = continentProgress(catalog, player.ownedCards, continent);
          return (
            <View key={continent} style={styles.group}>
              <SectionHeader title={CONTINENT_LABELS[continent]} />
              <ProgressBar value={progress.owned} total={progress.total} label="Pays découverts" />
              {countries.map((country) => {
                const tier = derived.tiersByIso.get(country.iso_code) ?? 'empty';
                const p = countryProgress(catalog, player.ownedCards, country.iso_code);
                return (
                  <Pressable
                    key={country.iso_code}
                    accessibilityRole="button"
                    accessibilityLabel={`${country.name}, ${COLLECTION_TIER_LABELS[tier]}, ${p.owned} cartes sur ${p.total}`}
                    onPress={() => router.push(`/country/${country.iso_code}`)}
                    style={({ pressed }) => [styles.countryRow, pressed && styles.pressed]}
                  >
                    <LegendSwatch tier={tier} />
                    <Text style={styles.flex}>{country.name}</Text>
                    <Text variant="caption" color={colors.textMuted}>
                      {p.owned}/{p.total}
                    </Text>
                    <Icon name="chevron-right" size={18} color={colors.textMuted} />
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function LegendSwatch({ tier }: { tier: CollectionTier }) {
  return <View style={[styles.swatch, { backgroundColor: TIER_FILL[tier] }]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  toolbar: { gap: spacing.md },
  mapToolbar: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  segment: { flexDirection: 'row', gap: spacing.sm },
  mapArea: { flex: 1, overflow: 'hidden', backgroundColor: colors.nightDeep },
  drawBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  revealCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    gap: spacing.sm,
    maxHeight: '55%',
  },
  legend: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.md,
    maxWidth: 280,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(11, 20, 38, 0.8)',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  hint: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xxl + MIN_TOUCH,
    alignItems: 'center',
  },
  group: { gap: spacing.sm },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  flex: { flex: 1 },
});
