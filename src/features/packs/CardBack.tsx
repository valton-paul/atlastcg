import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors, fonts, radius } from '@/design-system/tokens';

type Props = {
  width: number;
  height: number;
  shimmer: boolean;
  accent: string;
  borderWidth: number;
  glowPulse: number;
};

/**
 * Dos de carte à l’ouverture : fond cartographique Atlas + rose des vents,
 * aligné sur l’identité foil des paquets.
 */
export function CardBack({ width, height, shimmer, accent, borderWidth, glowPulse }: Props) {
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (!shimmer) return;
    sweep.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withDelay(900, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(sweep);
  }, [shimmer, sweep]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sweep.get(), [0, 1], [-width, width * 1.35]) }, { rotate: '20deg' }],
  }));

  const cx = width / 2;
  const cy = height * 0.46;
  const id = `cb-${Math.round(width)}-${accent.replace('#', '')}`;

  return (
    <View
      style={[
        styles.back,
        {
          width,
          height,
          borderColor: accent,
          borderWidth,
          boxShadow: glowPulse > 0 ? `0 0 ${16 + glowPulse * 30}px ${accent}aa` : undefined,
        },
      ]}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}-bg`} x1="0.2" y1="0" x2="0.85" y2="1">
            <Stop offset="0" stopColor="#152338" />
            <Stop offset="0.55" stopColor="#0B1426" />
            <Stop offset="1" stopColor="#070D1A" />
          </LinearGradient>
          <RadialGradient id={`${id}-core`} cx={String(cx)} cy={String(cy)} r="90" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={accent} stopOpacity={0.16 + glowPulse * 0.12} />
            <Stop offset="0.55" stopColor={accent} stopOpacity={0.05} />
            <Stop offset="1" stopColor={accent} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={`${id}-foil`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.1} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={width} height={height} rx={radius.lg} fill={`url(#${id}-bg)`} />
        <Rect x={0} y={0} width={width} height={height} rx={radius.lg} fill={`url(#${id}-core)`} />
        <Rect x={0} y={0} width={width} height={height} rx={radius.lg} fill={`url(#${id}-foil)`} />

        {/* Graticule discret */}
        <G opacity={0.22} stroke={accent} fill="none" strokeWidth={1}>
          {Array.from({ length: 5 }, (_, i) => (
            <Path
              key={`h-${i}`}
              d={`M${width * 0.12} ${height * (0.22 + i * 0.12)} Q${cx} ${height * (0.2 + i * 0.12)} ${width * 0.88} ${height * (0.22 + i * 0.12)}`}
            />
          ))}
          <Path d={`M${cx} ${height * 0.18} V${height * 0.78}`} />
          <Path d={`M${width * 0.28} ${height * 0.22} Q${width * 0.3} ${cy} ${width * 0.28} ${height * 0.74}`} />
          <Path d={`M${width * 0.72} ${height * 0.22} Q${width * 0.7} ${cy} ${width * 0.72} ${height * 0.74}`} />
        </G>

        {/* Rose des vents */}
        <G>
          <Circle cx={cx} cy={cy} r={52} fill="none" stroke={accent} strokeWidth={1.2} opacity={0.55} />
          <Circle cx={cx} cy={cy} r={34} fill="none" stroke={accent} strokeWidth={0.8} opacity={0.35} />
          <Path
            d={`M${cx} ${cy - 28} L${cx + 7} ${cy - 4} L${cx + 28} ${cy} L${cx + 7} ${cy + 4} L${cx} ${cy + 28} L${cx - 7} ${cy + 4} L${cx - 28} ${cy} L${cx - 7} ${cy - 4} Z`}
            fill={accent}
            opacity={0.92}
          />
          <Circle cx={cx} cy={cy} r={4} fill={colors.nightDeep} />
        </G>

        {/* Mot ATLAS */}
        <Path
          d={`M${width * 0.22} ${height * 0.86} H${width * 0.78}`}
          stroke={accent}
          strokeWidth={0.8}
          opacity={0.35}
        />
      </Svg>

      <View style={styles.brand} pointerEvents="none">
        <Text style={[styles.brandText, { color: accent, opacity: 0.75 }]}>ATLAS</Text>
      </View>

      {shimmer ? (
        <Animated.View pointerEvents="none" style={[styles.sweep, sweepStyle]}>
          <Svg width={56} height={height * 1.5}>
            <Defs>
              <LinearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.32} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width={56} height={height * 1.5} fill={`url(#${id}-sweep)`} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    borderRadius: radius.lg,
    backgroundColor: colors.nightDeep,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brand: {
    position: 'absolute',
    bottom: '12%',
    alignItems: 'center',
  },
  brandText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 3.2,
  },
  sweep: { position: 'absolute', top: '-20%', left: 0 },
});
