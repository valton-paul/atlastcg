import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';

import {
  Chip,
  colors,
  ErrorState,
  Icon,
  LoadingState,
  MIN_TOUCH,
  ProgressBar,
  radius,
  SectionHeader,
  spacing,
  Text,
} from '@/design-system';
import { CONTINENT_LABELS, CONTINENT_ORDER } from '@/features/catalog/types';
import {
  atlasStats,
  continentProgress,
  COUNTRY_STATE_LABELS,
  countryProgress,
  countryState,
  type CountryState,
} from '@/features/collection/progress';
import { PlayerHeader } from '@/features/player/PlayerHeader';
import { useAtlasData } from '@/features/player/useAtlasData';
import { CountryPanel } from '@/features/world-map/CountryPanel';
import { StateMarker, STATE_FILL, WorldMap } from '@/features/world-map/WorldMap';
import { errorMessage } from '@/lib/errors';
import { usePreferences } from '@/lib/preferences';

const LEGEND: CountryState[] = ['unknown', 'discovered', 'exploring', 'explored', 'completed'];
/** En deçà de cette largeur de carte, le détail du pays s'affiche en bas plutôt qu'à droite. */
const SIDE_PANEL_MIN_FRAME = 700;
const SIDE_PANEL_WIDTH = 360;

function LegendItem({ state }: { state: CountryState }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: STATE_FILL[state] }]}>
        <Svg width={16} height={16} viewBox="0 0 16 16">
          <StateMarker state={state} x={8} y={8} r={7} />
        </Svg>
      </View>
      <Text variant="caption" color={colors.textMuted}>
        {COUNTRY_STATE_LABELS[state]}
      </Text>
    </View>
  );
}

export default function WorldScreen() {
  const data = useAtlasData();
  const router = useRouter();
  const { reduceMotion } = usePreferences();
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [selected, setSelected] = useState<string | null>(null);
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);

  const derived = useMemo(() => {
    if (data.status !== 'ready') return null;
    const { catalog, player } = data;
    const byNumeric = new Map<string, CountryState>();
    const byIso = new Map<string, CountryState>();
    for (const country of catalog.countries) {
      const state = countryState(catalog, player.ownedCards, player.expeditions, country.iso_code);
      byNumeric.set(country.iso_numeric, state);
      byIso.set(country.iso_code, state);
    }
    return { byNumeric, byIso };
  }, [data]);

  if (data.status === 'loading' || !derived) return <LoadingState />;
  if (data.status === 'error') return <ErrorState message={errorMessage(data.error)} onRetry={data.retry} />;

  const { catalog, player } = data;
  const stats = atlasStats(catalog, player.ownedCards, player.expeditions);
  const selectedCountry = selected ? catalog.countries.find((c) => c.iso_numeric === selected) : undefined;
  const selectedState = selectedCountry ? derived.byIso.get(selectedCountry.iso_code) : undefined;
  const side = frame ? frame.width >= SIDE_PANEL_MIN_FRAME : false;
  const panelWidth = frame ? Math.min(SIDE_PANEL_WIDTH, frame.width * 0.42) : 0;
  const panelOpen = !!(selectedCountry && selectedState);
  const insetRight = panelOpen && side ? panelWidth + spacing.md * 2 : 0;
  const insetBottom = panelOpen && !side ? panelHeight + spacing.md * 2 : 0;

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
          accessible={false}
          accessibilityLabel="Carte du monde interactive. Utilisez la liste des pays pour une navigation accessible."
        >
          {frame ? (
            <WorldMap
              width={frame.width}
              height={frame.height}
              states={derived.byNumeric}
              selected={selected}
              onSelect={setSelected}
              reduceMotion={reduceMotion}
              insetRight={insetRight}
              insetBottom={insetBottom}
            />
          ) : null}
          {!panelOpen || side ? (
            <View style={styles.legend} pointerEvents="none">
              {LEGEND.map((state) => (
                <LegendItem key={state} state={state} />
              ))}
            </View>
          ) : null}
          {!panelOpen ? (
            <View style={styles.hint} pointerEvents="none">
              <Text variant="caption" color={colors.textMuted} align="center">
                Touchez un pays pour afficher son détail. Pincez pour zoomer.
              </Text>
            </View>
          ) : null}
          {selectedCountry && selectedState && frame ? (
            <CountryPanel
              catalog={catalog}
              owned={player.ownedCards}
              expeditions={player.expeditions}
              country={selectedCountry}
              state={selectedState}
              onClose={() => setSelected(null)}
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
                const state = derived.byIso.get(country.iso_code) ?? 'unknown';
                const p = countryProgress(catalog, player.ownedCards, country.iso_code);
                return (
                  <Pressable
                    key={country.iso_code}
                    accessibilityRole="button"
                    accessibilityLabel={`${country.name}, ${COUNTRY_STATE_LABELS[state]}, ${p.owned} cartes sur ${p.total}`}
                    onPress={() => router.push(`/country/${country.iso_code}`)}
                    style={({ pressed }) => [styles.countryRow, pressed && styles.pressed]}
                  >
                    <LegendSwatch state={state} />
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

function LegendSwatch({ state }: { state: CountryState }) {
  return (
    <View style={[styles.swatch, { backgroundColor: STATE_FILL[state] }]}>
      <Svg width={16} height={16} viewBox="0 0 16 16">
        <StateMarker state={state} x={8} y={8} r={7} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  toolbar: { gap: spacing.md },
  mapToolbar: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  segment: { flexDirection: 'row', gap: spacing.sm },
  mapArea: { flex: 1, overflow: 'hidden', backgroundColor: colors.nightDeep },
  legend: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    maxWidth: 480,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(11, 20, 38, 0.8)',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 22, height: 22, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', top: spacing.md, left: 64, right: 64 },
  flex: { flex: 1 },
  group: { gap: spacing.sm },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.7 },
});
