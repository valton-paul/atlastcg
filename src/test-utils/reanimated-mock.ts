/**
 * Mock minimal de Reanimated pour Jest : le mock officiel (v4.7) initialise le runtime natif
 * et ne se charge pas sous jest-expo. Seules les API utilisées par l'application sont couvertes ;
 * les animations aboutissent immédiatement à leur valeur finale.
 */
import { Image, ScrollView, Text, View } from 'react-native';

type Shared<T> = { value: T; get: () => T; set: (next: T) => void };

function makeShared<T>(initial: T): Shared<T> {
  const shared = {
    value: initial,
    get: () => shared.value,
    set: (next: T) => {
      shared.value = next;
    },
  };
  return shared;
}

const identity = <T>(value: T) => value;
const curve = () => identity;

export const Easing = {
  linear: identity,
  ease: identity,
  quad: identity,
  cubic: identity,
  sin: identity,
  exp: identity,
  back: curve,
  bezier: curve,
  in: curve,
  out: curve,
  inOut: curve,
};

export function useSharedValue<T>(initial: T): Shared<T> {
  return makeShared(initial);
}

export function useAnimatedStyle<T>(factory: () => T): T {
  return factory();
}

export const withTiming = <T>(value: T) => value;
export const withSpring = <T>(value: T) => value;
export const withDelay = <T>(_delay: number, value: T) => value;
export const withRepeat = <T>(value: T) => value;
export const withSequence = <T>(...values: T[]) => values[values.length - 1];
export const cancelAnimation = () => undefined;

export function interpolate(value: number, input: number[], output: number[]) {
  const [i0, i1] = [input[0], input[input.length - 1]];
  const [o0, o1] = [output[0], output[output.length - 1]];
  if (i1 === i0) return o0;
  const t = Math.min(1, Math.max(0, (value - i0) / (i1 - i0)));
  return o0 + (o1 - o0) * t;
}

type LayoutAnimation = {
  delay: (ms: number) => LayoutAnimation;
  duration: (ms: number) => LayoutAnimation;
  springify: () => LayoutAnimation;
};
const layoutAnimation: LayoutAnimation = {
  delay: () => layoutAnimation,
  duration: () => layoutAnimation,
  springify: () => layoutAnimation,
};
export const FadeIn = layoutAnimation;
export const FadeInDown = layoutAnimation;
export const ZoomIn = layoutAnimation;

const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  createAnimatedComponent: <C>(component: C) => component,
};

export default Animated;
