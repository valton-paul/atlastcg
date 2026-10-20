import { type ReactNode, useEffect } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors } from './tokens';

/**
 * Largeur max du « cadre » app sur grand écran.
 * Assez large pour rester confortable, assez étroite pour garder les proportions téléphone.
 */
export const APP_MAX_WIDTH = 540;

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
 * Sur grand écran (web / tablette), centre l’app dans une colonne avec de grandes allées vides.
 * Sur téléphone, occupe toute la largeur.
 */
export function AppShell({ children }: Props) {
  useHideWebScrollbars();
  const { width } = useWindowDimensions();
  const constrain = width > APP_MAX_WIDTH + 48;

  if (!constrain) {
    return <View style={styles.fill}>{children}</View>;
  }

  return (
    <View
      style={[styles.outer, Platform.OS === 'web' ? styles.outerWeb : null]}
      accessibilityElementsHidden={false}
    >
      <View style={styles.frame}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.night },
  outer: {
    flex: 1,
    backgroundColor: colors.nightDeep,
    alignItems: 'center',
  },
  outerWeb: {
    // Fond un peu plus sombre que le cadre pour marquer les allées.
    backgroundColor: '#050A14',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: APP_MAX_WIDTH,
    backgroundColor: colors.night,
    // Légère séparation visuelle du fond (web surtout).
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
