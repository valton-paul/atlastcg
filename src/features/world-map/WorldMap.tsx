import { memo, useCallback, useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { IconButton } from '@/design-system/components/IconButton';
import { colors, spacing } from '@/design-system/tokens';
import type { CollectionTier } from '@/features/collection/progress';

import mapData from './data/world-map.json';
import { clientToSvg, countryAtSvgPoint, countryFromDomPoint } from './hit-test';
import { resolveMapCountryId } from './territories';
import { clamp, clampTranslation, focusViewport, geometry, MAX_SCALE, MIN_SCALE } from './viewport';

type MapCountry = { id: string; name: string; d: string; cx: number; cy: number };
const MAP = mapData as { width: number; height: number; countries: MapCountry[] };

/**
 * Sur le web, `onPress` de react-native-svg active un mixin qui spam des erreurs WebShape
 * et les `onClick` DOM sont avalés par Gesture Handler. La sélection web passe donc par
 * Gesture.Tap + hit-test. Sur natif, `onPress` reste le chemin fiable.
 */
function nativePress(enabled: boolean, onSelect: () => void) {
  if (!enabled || Platform.OS === 'web') return undefined;
  return { onPress: onSelect };
}

/** Remplissage d’un pays selon le % de cartes uniques collectées. */
export const TIER_FILL: Record<CollectionTier, string> = {
  empty: colors.map.tierEmpty,
  started: colors.map.tierStarted,
  exploring: colors.map.tierExploring,
  advanced: colors.map.tierAdvanced,
  nearly: colors.map.tierNearly,
  complete: colors.map.tierComplete,
};

/** @deprecated Alias de `TIER_FILL`. */
export const STATE_FILL = TIER_FILL;

export function mapCountryByNumeric(isoNumeric: string): MapCountry | undefined {
  return MAP.countries.find((c) => c.id === isoNumeric);
}

type Props = {
  width: number;
  height: number;
  /** Paliers de collection indexés par code ISO numérique (pays du catalogue uniquement). */
  tiers: ReadonlyMap<string, CollectionTier>;
  selected: string | null;
  onSelect: (isoNumeric: string) => void;
  reduceMotion: boolean;
  /** Part du cadre recouverte par un panneau : le pays sélectionné est cadré dans la zone restante. */
  insetRight?: number;
  insetBottom?: number;
  /** Pays brièvement illuminé (rouge) pendant le tirage d'expédition. */
  drawHighlight?: string | null;
  /** Pays retenu (or) à la fin du tirage. */
  drawWinner?: string | null;
  /** Désactive les taps pays pendant l'animation de tirage. */
  interactionEnabled?: boolean;
};

const Countries = memo(function Countries({
  tiers,
  selected,
  onSelect,
  drawHighlight,
  drawWinner,
  interactionEnabled,
}: {
  tiers: ReadonlyMap<string, CollectionTier>;
  selected: string | null;
  onSelect: (id: string) => void;
  drawHighlight: string | null;
  drawWinner: string | null;
  interactionEnabled: boolean;
}) {
  return (
    <>
      {MAP.countries.map((country) => {
        const ownerId = resolveMapCountryId(country.id);
        const tier = tiers.get(ownerId);
        const isSelected = selected === ownerId;
        const isPulse = drawHighlight === ownerId;
        const isWinner = drawWinner === ownerId;
        const fill = isWinner
          ? colors.map.drawWinner
          : isPulse
            ? colors.map.drawPulse
            : tier
              ? TIER_FILL[tier]
              : colors.map.graticule;
        const stroke = isWinner
          ? colors.gold
          : isPulse
            ? colors.map.drawPulse
            : isSelected
              ? colors.map.selected
              : tier
                ? colors.map.unknownStroke
                : colors.map.graticule;
        return (
          <Path
            key={country.id}
            d={country.d}
            fill={fill}
            fillOpacity={isPulse || isWinner ? 1 : tier ? 1 : 0.9}
            stroke={stroke}
            strokeWidth={isWinner ? 2 : isPulse || isSelected ? 1.4 : 0.4}
            {...(tier ? ({ 'data-country': ownerId } as object) : null)}
            {...nativePress(interactionEnabled && !!tier, () => onSelect(ownerId))}
          />
        );
      })}
      {MAP.countries.map((country) => {
        const ownerId = resolveMapCountryId(country.id);
        const tier = tiers.get(ownerId);
        if (!tier) return null;
        // Un seul hit-circle par souverain (évite un double cible Danemark / Groenland).
        if (ownerId !== country.id) return null;
        return (
          <Circle
            key={`h-${country.id}`}
            cx={country.cx}
            cy={country.cy}
            r={18}
            fill="transparent"
            {...({ 'data-country': ownerId } as object)}
            {...nativePress(interactionEnabled, () => onSelect(ownerId))}
          />
        );
      })}
    </>
  );
});

/** Zoom appliqué lors de la sélection d'un pays, pour qu'il soit lisible à côté du panneau. */
const FOCUS_SCALE = 2.5;

export function WorldMap({
  width,
  height,
  tiers,
  selected,
  onSelect,
  reduceMotion,
  insetRight = 0,
  insetBottom = 0,
  drawHighlight = null,
  drawWinner = null,
  interactionEnabled = true,
}: Props) {
  // La carte est réduite pour tenir entière dans le cadre, puis centrée.
  const ratio = Math.min(width / MAP.width, height / MAP.height);
  const contentWidth = MAP.width * ratio;
  const contentHeight = MAP.height * ratio;
  const offsetX = (width - contentWidth) / 2;
  const offsetY = (height - contentHeight) / 2;
  const g = geometry(width, height, { contentWidth, contentHeight, insetRight, insetBottom });
  const selectable = useMemo(() => new Set(tiers.keys()), [tiers]);
  const hostRef = useRef<ComponentRef<typeof View>>(null);

  const scale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const start = useSharedValue({ scale: 1, x: 0, y: 0 });
  const prevSelected = useRef(selected);

  const animateTo = (target: { scale: number; x: number; y: number }) => {
    if (reduceMotion) {
      scale.set(target.scale);
      x.set(target.x);
      y.set(target.y);
    } else {
      scale.set(withTiming(target.scale, { duration: 350 }));
      x.set(withTiming(target.x, { duration: 350 }));
      y.set(withTiming(target.y, { duration: 350 }));
    }
  };

  useEffect(() => {
    const wasSelected = prevSelected.current;
    prevSelected.current = selected;

    // Croix du panneau : même reset que le bouton « Vue d’ensemble ».
    if (!selected) {
      if (wasSelected) animateTo({ scale: 1, ...clampTranslation(1, 0, 0, g) });
      return;
    }
    const country = mapCountryByNumeric(selected);
    if (!country) return;
    const target = focusViewport(
      offsetX + country.cx * ratio,
      offsetY + country.cy * ratio,
      Math.max(scale.get(), FOCUS_SCALE),
      geometry(width, height, { contentWidth, contentHeight, insetRight, insetBottom }),
    );
    if (reduceMotion) {
      scale.set(target.scale);
      x.set(target.x);
      y.set(target.y);
    } else {
      scale.set(withTiming(target.scale, { duration: 350 }));
      x.set(withTiming(target.x, { duration: 350 }));
      y.set(withTiming(target.y, { duration: 350 }));
    }
  }, [
    selected,
    ratio,
    offsetX,
    offsetY,
    width,
    height,
    contentWidth,
    contentHeight,
    insetRight,
    insetBottom,
    reduceMotion,
    scale,
    x,
    y,
  ]);

  const selectAtScreen = useCallback(
    (clientX: number, clientY: number) => {
      const fromDom = countryFromDomPoint(clientX, clientY, selectable);
      if (fromDom) {
        onSelect(fromDom);
        return;
      }
      const host = hostRef.current as unknown as { querySelector?: (s: string) => Element | null } | null;
      const svg = host?.querySelector?.('svg') as SVGSVGElement | null;
      if (!svg) return;
      const point = clientToSvg(clientX, clientY, svg);
      if (!point) return;
      const id = countryAtSvgPoint(point.svgX, point.svgY, selectable);
      if (id) onSelect(id);
    },
    [selectable, onSelect],
  );
  const selectAtScreenRef = useRef(selectAtScreen);
  useEffect(() => {
    selectAtScreenRef.current = selectAtScreen;
  }, [selectAtScreen]);

  const tapOnJs = useCallback((clientX: number, clientY: number) => {
    selectAtScreenRef.current(clientX, clientY);
  }, []);

  // Les callbacks Gesture Handler s'exécutent hors du render ; le linter refs de React Compiler
  // les signale à tort lorsqu'ils ferment sur des shared values / runOnJS.
  /* eslint-disable react-hooks/refs */
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
        g,
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
      const t = clampTranslation(scale.get(), start.get().x + e.translationX, start.get().y + e.translationY, g);
      x.set(t.x);
      y.set(t.y);
    });

  const tap = Gesture.Tap()
    .maxDistance(12)
    .onEnd((e) => {
      runOnJS(tapOnJs)(e.absoluteX, e.absoluteY);
    });

  const gesture =
    Platform.OS === 'web' ? Gesture.Simultaneous(pinch, pan, tap) : Gesture.Simultaneous(pinch, pan);
  /* eslint-enable react-hooks/refs */

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));

  const zoomBy = (factor: number) => {
    const s = clamp(scale.get() * factor, MIN_SCALE, MAX_SCALE);
    const t = clampTranslation(s, (x.get() * s) / scale.get(), (y.get() * s) / scale.get(), g);
    animateTo({ scale: s, x: t.x, y: t.y });
  };

  return (
    <View ref={hostRef} style={[styles.frame, { width, height }]}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ width, height }, animatedStyle]}>
          <Svg
            width={width}
            height={height}
            viewBox={`0 0 ${MAP.width} ${MAP.height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <Rect x={0} y={0} width={MAP.width} height={MAP.height} fill={colors.nightDeep} />
            <Countries
              tiers={tiers}
              selected={selected}
              onSelect={onSelect}
              drawHighlight={drawHighlight}
              drawWinner={drawWinner}
              interactionEnabled={interactionEnabled}
            />
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
          onPress={() => animateTo({ scale: 1, ...clampTranslation(1, 0, 0, g) })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: colors.nightDeep },
  controls: { position: 'absolute', left: spacing.sm, top: spacing.sm, gap: spacing.xs },
});
