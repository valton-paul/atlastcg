import { memo, useCallback, useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { IconButton } from '@/design-system/components/IconButton';
import { colors, spacing } from '@/design-system/tokens';
import type { CollectionTier } from '@/features/collection/progress';

import mapData from './data/world-map.json';
import {
  clientToSvg,
  countryAtSvgPoint,
  countryFromDomPoint,
  framePointToSvg,
  isTinyMapCountry,
  pathBBoxArea,
  TINY_MARKER_R,
} from './hit-test';
import { resolveMapCountryId } from './territories';
import { clamp, clampTranslation, focusViewport, geometry, MAX_SCALE, MIN_SCALE } from './viewport';

type MapCountry = { id: string; name: string; d: string; cx: number; cy: number };
const MAP = mapData as { width: number; height: number; countries: MapCountry[] };

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
  /** Pays retenu / destination d’expédition (rouge). */
  drawWinner?: string | null;
  /** Désactive les taps pays pendant l'animation de tirage. */
  interactionEnabled?: boolean;
};

const Countries = memo(function Countries({
  tiers,
  selected,
  drawHighlight,
  drawWinner,
}: {
  tiers: ReadonlyMap<string, CollectionTier>;
  selected: string | null;
  drawHighlight: string | null;
  drawWinner: string | null;
}) {
  // Remplissages → frontières → contour actif. Pas de stroke sur le fill
  // (un trait épais centré « mangeait » les voisins).
  return (
    <>
      {MAP.countries.map((country) => {
        const ownerId = resolveMapCountryId(country.id);
        const tier = tiers.get(ownerId);
        const isPulse = drawHighlight === ownerId;
        const isWinner = drawWinner === ownerId;
        const fill = isWinner
          ? colors.map.drawWinner
          : isPulse
            ? colors.map.drawPulse
            : tier
              ? TIER_FILL[tier]
              : colors.map.graticule;
        return (
          <Path
            key={`f-${country.id}`}
            d={country.d}
            fill={fill}
            fillOpacity={isPulse || isWinner ? 1 : tier ? 1 : 0.9}
            stroke="none"
            // Attribut web pour elementsFromPoint ; la sélection passe par Gesture.Tap partout.
            {...(tier ? ({ 'data-country': ownerId } as object) : null)}
          />
        );
      })}
      {MAP.countries.map((country) => {
        const ownerId = resolveMapCountryId(country.id);
        const tier = tiers.get(ownerId);
        // Micro-pays en tirage : le trait sombre recouvrirait tout le fill rouge.
        if (drawHighlight === ownerId || drawWinner === ownerId) return null;
        const stroke = tier ? colors.map.unknownStroke : colors.map.graticule;
        return (
          <Path
            key={`b-${country.id}`}
            d={country.d}
            fill="none"
            stroke={stroke}
            strokeWidth={0.45}
            strokeLinejoin="round"
            pointerEvents="none"
          />
        );
      })}
      {MAP.countries.map((country) => {
        const ownerId = resolveMapCountryId(country.id);
        const isSelected = selected === ownerId;
        const isPulse = drawHighlight === ownerId;
        const isWinner = drawWinner === ownerId;
        if (!isSelected && !isPulse && !isWinner) return null;
        const stroke = isWinner || isPulse ? colors.map.drawPulse : colors.map.selected;
        return (
          <Path
            key={`o-${country.id}`}
            d={country.d}
            fill="none"
            stroke={stroke}
            strokeWidth={isWinner || isPulse ? 0.7 : 0.85}
            strokeLinejoin="round"
            pointerEvents="none"
          />
        );
      })}
      {/* Halo rouge sur les micro-États tirés — sinon le fill est illisible. */}
      {MAP.countries.map((country) => {
        const ownerId = resolveMapCountryId(country.id);
        if (ownerId !== country.id) return null;
        if (!isTinyMapCountry(country)) return null;
        const lit = drawHighlight === ownerId || drawWinner === ownerId;
        if (!lit) return null;
        return (
          <Circle
            key={`p-${country.id}`}
            cx={country.cx}
            cy={country.cy}
            r={TINY_MARKER_R}
            fill={colors.map.drawPulse}
            fillOpacity={0.55}
            stroke={colors.map.drawPulse}
            strokeWidth={0.9}
            pointerEvents="none"
          />
        );
      })}
      {/* Cibles élargies seulement pour les micro-États (trop petits pour un tap précis). */}
      {MAP.countries.map((country) => {
        const ownerId = resolveMapCountryId(country.id);
        const tier = tiers.get(ownerId);
        if (!tier) return null;
        if (ownerId !== country.id) return null;
        if (!isTinyMapCountry(country)) return null;
        return (
          <Circle
            key={`h-${country.id}`}
            cx={country.cx}
            cy={country.cy}
            r={TINY_MARKER_R}
            fill="transparent"
            {...({ 'data-country': ownerId } as object)}
          />
        );
      })}
    </>
  );
});

/** Zoom de base à la sélection ; les micro-pays montent plus haut (surtout en expédition). */
const FOCUS_SCALE = 2.5;

/** `boost` > 1 pour les destinations d’expédition : un peu plus serré sur les petits pays. */
function focusScaleForCountry(country: MapCountry, boost = 1): number {
  const area = pathBBoxArea(country.d);
  let base = FOCUS_SCALE;
  if (area < 2) base = 10;
  else if (area < 8) base = 8;
  else if (area < 16) base = 6;
  else if (area < 40) base = 4.5;
  else if (area < 120) base = 3.2;
  return Math.min(MAX_SCALE, base * boost);
}

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
  const interactionRef = useRef(interactionEnabled);
  useEffect(() => {
    interactionRef.current = interactionEnabled;
  }, [interactionEnabled]);

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
    // Destination d’expédition (gagnant du tirage) ou sélection manuelle.
    const focusId = selected ?? drawWinner;
    const wasSelected = prevSelected.current;
    prevSelected.current = focusId;

    // Croix du panneau : même reset que le bouton « Vue d’ensemble ».
    if (!focusId) {
      if (wasSelected) animateTo({ scale: 1, ...clampTranslation(1, 0, 0, g) });
      return;
    }
    const country = mapCountryByNumeric(focusId);
    if (!country) return;
    const expeditionBoost = drawWinner && drawWinner === focusId ? 1.2 : 1;
    const target = focusViewport(
      offsetX + country.cx * ratio,
      offsetY + country.cy * ratio,
      Math.max(scale.get(), focusScaleForCountry(country, expeditionBoost)),
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
    drawWinner,
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

  const selectAtSvg = useCallback(
    (svgX: number, svgY: number) => {
      if (!interactionRef.current) return;
      const id = countryAtSvgPoint(svgX, svgY, selectable);
      if (id) onSelect(id);
    },
    [selectable, onSelect],
  );

  const selectAtScreen = useCallback(
    (clientX: number, clientY: number) => {
      if (!interactionRef.current) return;

      // Web : DOM / CTM (prend en compte le transform CSS du pan/zoom).
      if (Platform.OS === 'web') {
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
        selectAtSvg(point.svgX, point.svgY);
        return;
      }

      // Natif : inverse manuelle du pan/zoom (Path.onPress est peu fiable sous GestureDetector).
      const node = hostRef.current as unknown as {
        measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
      } | null;
      if (!node?.measureInWindow) return;
      node.measureInWindow((wx, wy) => {
        const localX = clientX - wx;
        const localY = clientY - wy;
        const point = framePointToSvg(localX, localY, {
          frameWidth: width,
          frameHeight: height,
          mapWidth: MAP.width,
          mapHeight: MAP.height,
          scale: scale.get(),
          translateX: x.get(),
          translateY: y.get(),
        });
        selectAtSvg(point.svgX, point.svgY);
      });
    },
    [selectable, onSelect, selectAtSvg, width, height, scale, x, y],
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

  const gesture = Gesture.Simultaneous(pinch, pan, tap);
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
              drawHighlight={drawHighlight}
              drawWinner={drawWinner}
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
