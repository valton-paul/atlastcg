import { Platform } from 'react-native';

/**
 * Masque un SVG décoratif aux technologies d'assistance. Sur le web, react-native-svg transmet
 * les props natives telles quelles au DOM : on y utilise `aria-hidden`.
 */
export const decorativeSvgProps =
  Platform.OS === 'web'
    ? ({ 'aria-hidden': true } as const)
    : ({ accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const);
