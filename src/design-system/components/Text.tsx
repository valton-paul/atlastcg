import { Text as RNText, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '../tokens';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', color = colors.text, align, style, ...rest }: Props) {
  const isHeading = variant === 'hero' || variant === 'title' || variant === 'heading';
  return (
    <RNText
      accessibilityRole={isHeading ? 'header' : undefined}
      maxFontSizeMultiplier={isHeading ? 1.6 : 2}
      {...rest}
      style={[
        typography[variant],
        { color },
        align ? { textAlign: align } : null,
        variant === 'overline' ? { textTransform: 'uppercase' } : null,
        style,
      ]}
    />
  );
}
