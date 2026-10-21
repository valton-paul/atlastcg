import * as Linking from 'expo-linking';

import { getAppOrigin } from '@/lib/env';

/**
 * URL de retour pour les e-mails Supabase (confirmation, reset).
 * Priorité à `EXPO_PUBLIC_APP_URL` pour ne pas coller localhost dans un mail ouvert sur téléphone.
 */
export function authRedirectUrl(path: string): string {
  const origin = getAppOrigin();
  const clean = path.replace(/^\//, '');
  if (origin) return `${origin}/${clean}`;
  return Linking.createURL(clean);
}
