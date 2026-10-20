import { type ReactNode, useEffect } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors } from './tokens';

/**
 * Largeur max du « cadre » app sur grand écran.
 * Plus large qu’un téléphone (moins serré), mais laisse des couloirs latéraux
 * prévus pour de futures pubs (~240 px mini de chaque côté).
 */
export const APP_MAX_WIDTH = 1280;

/** Largeur mini réservée à chaque couloir latéral (pubs plus tard). */
export const APP_SIDE_RAIL_MIN = 240;

const SCROLLBAR_STYLE_ID = 'atlas-hide-scrollbars';

/** Masque les barres de défilement natives sur le web (look téléphone). */
function useHideWebScrollbars() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById(SCROLLBAR_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = SCROLLBAR_STYLE_ID;
    style.textContent = `
      *::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }
      * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);
}

/** Largeur utile du contenu (jamais plus large que le cadre app). */
export function useAppContentWidth() {
  const { width } = useWindowDimensions();
  return Math.min(width, APP_MAX_WIDTH);
}

type Props = { children: ReactNode };

/**
 * Sur grand écran (web / tablette), centre l’app dans une colonne avec des couloirs latéraux.
 * Sur téléphone / fenêtre étroite, occupe toute la largeur.
 */
export function AppShell({ children }: Props) {
  useHideWebScrollbars();
  const { width } = useWindowDimensions();
  const constrain = width > APP_MAX_WIDTH + APP_SIDE_RAIL_MIN * 2;

  if (!constrain) {
    return <View style={styles.fill}>{children}</View>;
  }

  return (
    <View
      style={[styles.outer, Platform.OS === 'web' ? styles.outerWeb : null]}
      accessibilityElementsHidden={false}
    >
      {/* Couloirs latéraux : zone libre pour pubs / branding plus tard. */}
      <View style={styles.rail} accessibilityElementsHidden />
      <View style={styles.frame}>{children}</View>
      <View style={styles.rail} accessibilityElementsHidden />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.night },
  outer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.nightDeep,
  },
  outerWeb: {
    backgroundColor: '#050A14',
  },
  rail: {
    flex: 1,
    minWidth: APP_SIDE_RAIL_MIN,
    backgroundColor: '#050A14',
  },
  frame: {
    flexGrow: 0,
    flexShrink: 0,
    width: APP_MAX_WIDTH,
    maxWidth: APP_MAX_WIDTH,
    backgroundColor: colors.night,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
