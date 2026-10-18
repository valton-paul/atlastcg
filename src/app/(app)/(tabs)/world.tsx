import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg from 'react-native-svg';

import {
  Button,
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
  Surface,
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
import { StateMarker, STATE_FILL, WorldMap } from '@/features/world-map/WorldMap';
import { errorMessage } from '@/lib/errors';
import { usePreferences } from '@/lib/preferences';

const LEGEND: CountryState[] = ['unknown', 'discovered', 'exploring', 'explored', 'completed'];

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
  const { width } = useWindowDimensions();
  const { reduceMotion } = usePreferences();
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [selected, setSelected] = useState<string | null>(null);

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
  const selectedProgress = selectedCountry
    ? countryProgress(catalog, player.ownedCards, selectedCountry.iso_code)
    : null;
  const mapWidth = width - spacing.lg * 2;

  return (
    <View style={styles.root}>
      <PlayerHeader title="Carte du monde" fragments={player.fragments} packCount={player.packs.length} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segment}>
          <Chip label="Carte" selected={mode === 'map'} onPress={() => setMode('map')} />
          <Chip label="Liste des pays" selected={mode === 'list'} onPress={() => setMode('list')} />
        </View>
        <ProgressBar label="Pays découverts" value={stats.countriesDiscovered} total={stats.countriesTotal} />

        {mode === 'map' ? (
          <>
            <View
              accessible={false}
              accessibilityLabel="Carte du monde interactive. Utilisez la liste des pays pour une navigation accessible."
            >
              <WorldMap
                width={mapWidth}
                states={derived.byNumeric}
                selected={selected}
                onSelect={setSelected}
                reduceMotion={reduceMotion}
              />
            </View>
            <View style={styles.legend}>
              {LEGEND.map((state) => (
                <LegendItem key={state} state={state} />
              ))}
            </View>
            {selectedCountry && selectedState && selectedProgress ? (
              <Surface tone={selectedState === 'unknown' ? 'panel' : 'explore'} testID="country-panel">
                <View style={styles.panelHeader}>
                  <View style={styles.flex}>
                    <Text variant="overline" color={colors.turquoise}>
                      {COUNTRY_STATE_LABELS[selectedState]} · {CONTINENT_LABELS[selectedCountry.continent]}
                    </Text>
                    <Text variant="heading">{selectedCountry.name}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fermer le panneau"
                    onPress={() => setSelected(null)}
                    style={styles.close}
                  >
                    <Icon name="close" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
                {selectedState === 'unknown' ? (
                  <Text variant="caption" color={colors.textMuted}>
                    Obtenez une carte de ce pays pour le faire apparaître sur votre atlas.
                  </Text>
                ) : (
                  <ProgressBar label="Cartes du pays" value={selectedProgress.owned} total={selectedProgress.total} />
                )}
                <Button
                  label="Voir le pays"
                  compact
                  variant="secondary"
                  onPress={() => router.push(`/country/${selectedCountry.iso_code}`)}
                />
              </Surface>
            ) : (
              <Text variant="caption" color={colors.textMuted} align="center">
                Touchez un pays pour afficher sa progression. Pincez pour zoomer.
              </Text>
            )}
          </>
        ) : (
          CONTINENT_ORDER.map((continent) => {
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
          })
        )}
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
  segment: { flexDirection: 'row', gap: spacing.sm },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 22, height: 22, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  panelHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  close: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing.sm,
    marginRight: -spacing.sm,
  },
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
