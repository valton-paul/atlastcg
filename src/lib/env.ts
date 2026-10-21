import Constants from 'expo-constants';

export type SupabaseConfig = { url: string; key: string };

type Extra = { supabaseUrl?: unknown; supabaseKey?: unknown; appUrl?: unknown };

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Configuration publique du projet Supabase, injectée par `app.config.ts`
 * (liste blanche : URL + clé publishable/anon uniquement).
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
  const url = readString(extra.supabaseUrl) ?? readString(process.env.EXPO_PUBLIC_SUPABASE_URL);
  const key =
    readString(extra.supabaseKey) ??
    readString(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    readString(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) return null;
  return { url, key };
}

/**
 * Origine publique de l’app pour les liens d’e-mail (confirmation, reset).
 * Évite d’envoyer `localhost` dans les mails ouverts sur un autre appareil.
 */
export function getAppOrigin(): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
  const raw =
    readString(extra.appUrl) ??
    readString(process.env.EXPO_PUBLIC_APP_URL) ??
    readString(process.env.APP_URL);
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}
