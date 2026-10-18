import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { decorativeSvgProps } from '../decorative';
import { radius, rarityStyles, spacing, type RarityKey } from '../tokens';
import { Text } from './Text';

export function RarityGlyph({ rarity, size = 12 }: { rarity: RarityKey; size?: number }) {
  const { color, shape } = rarityStyles[rarity];
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" {...decorativeSvgProps}>
      {shape === 'circle' && <Circle cx={6} cy={6} r={4.5} fill={color} />}
      {shape === 'diamond' && <Path d="M6 .8 11.2 6 6 11.2.8 6z" fill={color} />}
      {shape === 'triangle' && <Path d="M6 1 11.4 10.6H.6z" fill={color} />}
      {shape === 'star' && <Path d="M6 .5l1.6 3.6 3.9.4-2.9 2.6.8 3.9L6 9 2.6 11l.8-3.9L.5 4.5l3.9-.4z" fill={color} />}
      {shape === 'crown' && <Path d="M1 9.5 1.5 3l2.8 2.6L6 1.5l1.7 4.1L10.5 3l.5 6.5z" fill={color} />}
    </Svg>
  );
}

type Props = { rarity: RarityKey; compact?: boolean };

export function RarityBadge({ rarity, compact = false }: Props) {
  const style = rarityStyles[rarity];
  return (
    <View
      style={[styles.badge, { backgroundColor: style.surface, borderColor: style.color }]}
      accessible
      accessibilityLabel={`Rareté : ${style.label}`}
    >
      <RarityGlyph rarity={rarity} size={compact ? 10 : 12} />
      {!compact && (
        <Text variant="caption" color={style.color}>
          {style.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
});
