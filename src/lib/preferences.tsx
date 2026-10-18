import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Préférences propres à l'appareil (non synchronisées) : confort et accessibilité. */
export type MotionPreference = 'system' | 'reduced' | 'full';

export type Preferences = {
  motion: MotionPreference;
  haptics: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = { motion: 'system', haptics: true };

const STORAGE_KEY = 'atlas.preferences.v1';

type PreferencesContextValue = {
  preferences: Preferences;
  /** Vrai si les animations doivent être réduites (préférence ou réglage système). */
  reduceMotion: boolean;
  update: (patch: Partial<Preferences>) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const value = JSON.parse(raw) as Partial<Preferences>;
    return {
      motion: value.motion === 'reduced' || value.motion === 'full' ? value.motion : 'system',
      haptics: typeof value.haptics === 'boolean' ? value.haptics : true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function resolveReduceMotion(motion: MotionPreference, systemReduceMotion: boolean): boolean {
  if (motion === 'reduced') return true;
  if (motion === 'full') return false;
  return systemReduceMotion;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => active && setPreferences(parsePreferences(raw)))
      .catch(() => undefined);
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => active && setSystemReduceMotion(enabled))
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ preferences, reduceMotion: resolveReduceMotion(preferences.motion, systemReduceMotion), update }),
    [preferences, systemReduceMotion, update],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) {
    return { preferences: DEFAULT_PREFERENCES, reduceMotion: false, update: () => undefined };
  }
  return value;
}
