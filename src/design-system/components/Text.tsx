import { Platform, Text as RNText, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '../tokens';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', color = colors.text, align, style, ...rest }: Props) {
  const isHeading = variant === 'hero' || variant === 'title' || variant === 'heading';
  // Sur le web, `accessibilityRole="header"` devient un <h1>. Les Text imbriqués (compteurs,
  // accents de couleur) produiraient alors un <h1> dans un <h1>, interdit en HTML.
  const headingRole = isHeading && Platform.OS !== 'web' ? ('header' as const) : undefined;
  return (
    <RNText
      accessibilityRole={headingRole}
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
