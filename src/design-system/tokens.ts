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
    unknownStroke: '#33486D',
    selected: '#F2F5FA',
    /** Paliers de collection (cartes uniques / cartes disponibles). */
    tierEmpty: '#22314D',
    tierStarted: '#1A4554',
    tierExploring: '#2A6F8F',
    tierAdvanced: '#2F9E98',
    tierNearly: '#A8904E',
    tierComplete: '#D9B66C',
    /** Alias historiques encore utilisés hors carte. */
    unknown: '#22314D',
    discovered: '#2A6F8F',
    explored: '#3CC6C0',
    completed: '#D9B66C',
    /** Signature du tirage d'expédition (illumination temporaire). */
    drawPulse: '#E85A5A',
    /** Destination tirée / en cours — reste rouge jusqu’au départ. */
    drawWinner: '#E85A5A',
  },
} as const;

export type RarityKey = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

/** La rareté est toujours signalée par un libellé ET une forme, jamais par la couleur seule. */
export const rarityStyles: Record<
  RarityKey,
  {
    label: string;
    color: string;
    /** Fond teinté du corps de carte. */
    surface: string;
    /** Fond légèrement teinté de la zone illustration. */
    artSurface: string;
    borderWidth: number;
    /** Rayon de lueur (0 = aucune) : le budget d’effets commence à Rare. */
    glow: number;
    /** Saturation de l’illustration (communes volontairement mates). */
    saturate: number;
    shine: boolean;
    embers: boolean;
    brackets: boolean;
    shape: 'circle' | 'diamond' | 'triangle' | 'star' | 'crown' | 'sun';
    rank: number;
  }
> = {
  common: {
    label: 'Commune',
    color: '#8E9BB0',
    surface: '#121C2E',
    artSurface: '#1A2438',
    borderWidth: 1,
    glow: 0,
    saturate: 0.35,
    shine: false,
    embers: false,
    brackets: false,
    shape: 'circle',
    rank: 1,
  },
  uncommon: {
    label: 'Peu commune',
    color: '#5FCB8F',
    surface: '#0F2420',
    artSurface: '#163A32',
    borderWidth: 1.5,
    glow: 0,
    saturate: 0.75,
    shine: false,
    embers: false,
    brackets: true,
    shape: 'diamond',
    rank: 2,
  },
  rare: {
    label: 'Rare',
    color: '#5B9CFF',
    surface: '#101F3A',
    artSurface: '#1A2F5C',
    borderWidth: 1.5,
    glow: 10,
    saturate: 1,
    shine: false,
    embers: false,
    brackets: true,
    shape: 'triangle',
    rank: 3,
  },
  epic: {
    label: 'Épique',
    color: '#8B5CF0',
    surface: '#161022',
    artSurface: '#221835',
    borderWidth: 2,
    glow: 14,
    saturate: 1,
    shine: false,
    embers: false,
    brackets: true,
    shape: 'star',
    rank: 4,
  },
  legendary: {
    label: 'Légendaire',
    color: '#E8B04B',
    surface: '#241C10',
    artSurface: '#3A2A14',
    borderWidth: 2,
    glow: 20,
    saturate: 1,
    shine: true,
    embers: false,
    brackets: true,
    shape: 'crown',
    rank: 5,
  },
  mythic: {
    label: 'Mythique',
    color: '#F05A5A',
    surface: '#261014',
    artSurface: '#3A1818',
    borderWidth: 2,
    glow: 22,
    saturate: 1,
    shine: true,
    embers: true,
    brackets: true,
    shape: 'sun',
    rank: 6,
  },
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
