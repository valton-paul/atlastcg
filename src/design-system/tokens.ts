export const colors = {
  night: '#0B1426',
  nightDeep: '#070D1A',
  ink: '#111D35',
  slate: '#1A2A47',
  slateRaised: '#223558',
  border: '#2E4369',
  borderStrong: '#41598A',
  text: '#F2F5FA',
  textMuted: '#A9B6CC',
  textFaint: '#7D8BA5',
  gold: '#D9B66C',
  goldSoft: '#3A3222',
  turquoise: '#3CC6C0',
  turquoiseSoft: '#143A40',
  success: '#5FCB8F',
  warning: '#E8B04B',
  danger: '#F07A7A',
  dangerSoft: '#3D1F27',
  overlay: 'rgba(4, 8, 18, 0.82)',
  map: {
    ocean: '#0E1A30',
    graticule: '#16253F',
    unknown: '#22314D',
    unknownStroke: '#33486D',
    discovered: '#2A6F8F',
    explored: '#3CC6C0',
    completed: '#D9B66C',
    selected: '#F2F5FA',
  },
} as const;

export type RarityKey = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** La rareté est toujours signalée par un libellé ET une forme, jamais par la couleur seule. */
export const rarityStyles: Record<
  RarityKey,
  {
    label: string;
    color: string;
    surface: string;
    shape: 'circle' | 'diamond' | 'triangle' | 'star' | 'crown';
    rank: number;
  }
> = {
  common: { label: 'Commune', color: '#AEB9CC', surface: '#1D2B45', shape: 'circle', rank: 1 },
  uncommon: { label: 'Peu commune', color: '#6FD3A8', surface: '#163A36', shape: 'diamond', rank: 2 },
  rare: { label: 'Rare', color: '#6FA8FF', surface: '#1A2F5C', shape: 'triangle', rank: 3 },
  epic: { label: 'Épique', color: '#C49BFF', surface: '#2E2252', shape: 'star', rank: 4 },
  legendary: { label: 'Légendaire', color: '#E8C67A', surface: '#3A3020', shape: 'crown', rank: 5 },
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

export const typography = {
  hero: { fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 38 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30 },
  heading: { fontFamily: fonts.display, fontSize: 19, lineHeight: 25 },
  subheading: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Zone tactile minimale (WCAG 2.5.5 / recommandations iOS et Android). */
export const MIN_TOUCH = 44;

export const durations = {
  fast: 150,
  base: 250,
  slow: 450,
  reveal: 700,
} as const;
