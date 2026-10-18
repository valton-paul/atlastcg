import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { usePreferences } from './preferences';

export type HapticKind = 'tap' | 'reveal' | 'rare' | 'success' | 'error';

function play(kind: HapticKind): Promise<void> {
  switch (kind) {
    case 'tap':
      return Haptics.selectionAsync();
    case 'reveal':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case 'rare':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case 'success':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    case 'error':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}

/** Retour haptique discret, désactivable dans les paramètres. */
export function useHaptics() {
  const { preferences } = usePreferences();
  return useCallback(
    (kind: HapticKind) => {
      if (!preferences.haptics || Platform.OS === 'web') return;
      play(kind).catch(() => undefined);
    },
    [preferences.haptics],
  );
}
