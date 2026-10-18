import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { IconButton } from '@/design-system/components/IconButton';
import { colors, spacing } from '@/design-system/tokens';
import type { CountryState } from '@/features/collection/progress';

import mapData from './data/world-map.json';
import { clamp, clampTranslation, focusViewport, MAX_SCALE, MIN_SCALE } from './viewport';

type MapCountry = { id: string; name: string; d: string; cx: number; cy: number };
const MAP = mapData as { width: number; height: number; countries: MapCountry[] };

export const MAP_ASPECT = MAP.height / MAP.width;

export const STATE_FILL: Record<CountryState, string> = {
  unknown: colors.map.unknown,
  discovered: colors.map.discovered,
  exploring: colors.map.discovered,
  explored: colors.map.explored,
  completed: colors.map.completed,
};

export function mapCountryByNumeric(isoNumeric: string): MapCountry | undefined {
  return MAP.countries.find((c) => c.id === isoNumeric);
}

type Props = {
  width: number;
  /** États indexés par code ISO numérique, uniquement pour les pays du catalogue. */
  states: ReadonlyMap<string, CountryState>;
  selected: string | null;
  onSelect: (isoNumeric: string) => void;
  reduceMotion: boolean;
};

/** Symbole porté par chaque état, pour ne jamais dépendre de la seule couleur. */
export function StateMarker({ state, x, y, r }: { state: CountryState; x: number; y: number; r: number }) {
  switch (state) {
    case 'unknown':
      return (
        <Circle
          cx={x}
          cy={y}
          r={r * 0.55}
          fill="none"
          stroke={colors.textFaint}
          strokeWidth={r * 0.25}
          strokeDasharray={`${r * 0.4} ${r * 0.3}`}
        />
      );
    case 'discovered':
      return <Circle cx={x} cy={y} r={r * 0.6} fill="none" stroke={colors.text} strokeWidth={r * 0.28} />;
    case 'exploring':
      return (
        <G>
          <Circle cx={x} cy={y} r={r * 0.6} fill="none" stroke={colors.turquoise} strokeWidth={r * 0.28} />
          <Path d={`M${x} ${y - r * 0.6}A${r * 0.6} ${r * 0.6} 0 0 1 ${x} ${y + r * 0.6}z`} fill={colors.turquoise} />
        </G>
      );
    case 'explored':
      return <Circle cx={x} cy={y} r={r * 0.62} fill={colors.text} stroke={colors.nightDeep} strokeWidth={r * 0.18} />;
    case 'completed': {
      const s = r * 0.9;
      return (
        <Path
          d={`M${x} ${y - s}l${s * 0.29} ${s * 0.6} ${s * 0.66} ${s * 0.09}-${s * 0.48} ${s * 0.46} ${s * 0.12} ${s * 0.66}L${x} ${y + s * 0.5}l-${s * 0.59} ${s * 0.31} ${s * 0.12}-${s * 0.66}-${s * 0.48}-${s * 0.46} ${s * 0.66}-${s * 0.09}z`}
          fill={colors.gold}
          stroke={colors.nightDeep}
          strokeWidth={r * 0.12}
        />
      );
    }
  }
}

const Countries = memo(function Countries({
  states,
  selected,
  onSelect,
}: {
  states: ReadonlyMap<string, CountryState>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {MAP.countries.map((country) => {
        const state = states.get(country.id);
        const isSelected = selected === country.id;
        return (
          <Path
            key={country.id}
            d={country.d}
            fill={state ? STATE_FILL[state] : colors.map.graticule}
            fillOpacity={state ? 1 : 0.9}
            stroke={isSelected ? colors.map.selected : state ? colors.map.unknownStroke : colors.map.graticule}
            strokeWidth={isSelected ? 1.4 : 0.4}
            onPress={state ? () => onSelect(country.id) : undefined}
          />
        );
      })}
      {MAP.countries.map((country) => {
        const state = states.get(country.id);
        if (!state) return null;
        return (
          <G key={`m-${country.id}`}>
            <StateMarker state={state} x={country.cx} y={country.cy} r={8} />
            {/* Zone tactile élargie pour les petits pays. */}
            <Circle cx={country.cx} cy={country.cy} r={18} fill="transparent" onPress={() => onSelect(country.id)} />
          </G>
        );
      })}
    </>
  );
});

export function WorldMap({ width, states, selected, onSelect, reduceMotion }: Props) {
  const height = Math.round(width * MAP_ASPECT);
  const ratio = width / MAP.width;
  const scale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const start = useSharedValue({ scale: 1, x: 0, y: 0 });

  const animateTo = (target: { scale: number; x: number; y: number }) => {
    if (reduceMotion) {
      scale.set(target.scale);
      x.set(target.x);
      y.set(target.y);
    } else {
      scale.set(withTiming(target.scale, { duration: 300 }));
      x.set(withTiming(target.x, { duration: 300 }));
      y.set(withTiming(target.y, { duration: 300 }));
    }
  };

  useEffect(() => {
    if (!selected) return;
    const country = mapCountryByNumeric(selected);
    if (!country) return;
    const target = focusViewport(country.cx * ratio, country.cy * ratio, Math.max(scale.get(), 2.5), width, height);
    if (reduceMotion) {
      scale.set(target.scale);
      x.set(target.x);
      y.set(target.y);
    } else {
      scale.set(withTiming(target.scale, { duration: 350 }));
      x.set(withTiming(target.x, { duration: 350 }));
      y.set(withTiming(target.y, { duration: 350 }));
    }
  }, [selected, ratio, width, height, reduceMotion, scale, x, y]);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      start.set({ scale: scale.get(), x: x.get(), y: y.get() });
    })
    .onUpdate((e) => {
      const s = clamp(start.get().scale * e.scale, MIN_SCALE, MAX_SCALE);
      const t = clampTranslation(
        s,
        (start.get().x * s) / start.get().scale,
        (start.get().y * s) / start.get().scale,
        width,
        height,
      );
      scale.set(s);
      x.set(t.x);
      y.set(t.y);
    });

  const pan = Gesture.Pan()
    .minDistance(8)
    .onStart(() => {
      start.set({ scale: scale.get(), x: x.get(), y: y.get() });
    })
    .onUpdate((e) => {
      const t = clampTranslation(
        scale.get(),
        start.get().x + e.translationX,
        start.get().y + e.translationY,
        width,
        height,
      );
      x.set(t.x);
      y.set(t.y);
    });

  const gesture = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));

  const zoomBy = (factor: number) => {
    const s = clamp(scale.get() * factor, MIN_SCALE, MAX_SCALE);
    const t = clampTranslation(s, (x.get() * s) / scale.get(), (y.get() * s) / scale.get(), width, height);
    animateTo({ scale: s, x: t.x, y: t.y });
  };

  return (
    <View style={[styles.frame, { width, height }]}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ width, height }, animatedStyle]}>
          <Svg width={width} height={height} viewBox={`0 0 ${MAP.width} ${MAP.height}`}>
            <Rect x={0} y={0} width={MAP.width} height={MAP.height} fill={colors.nightDeep} />
            <Countries states={states} selected={selected} onSelect={onSelect} />
          </Svg>
        </Animated.View>
      </GestureDetector>
      <View style={styles.controls}>
        <IconButton icon="plus" label="Zoomer" tone="raised" onPress={() => zoomBy(1.6)} />
        <IconButton icon="minus" label="Dézoomer" tone="raised" onPress={() => zoomBy(1 / 1.6)} />
        <IconButton
          icon="recenter"
          label="Vue d’ensemble"
          tone="raised"
          onPress={() => animateTo({ scale: 1, x: 0, y: 0 })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: colors.nightDeep, borderRadius: 12 },
  controls: { position: 'absolute', right: spacing.sm, top: spacing.sm, gap: spacing.xs },
});
