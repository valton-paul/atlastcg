import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/lib/errors';

import { useAuth } from './AuthProvider';

export type RedirectState = { status: 'pending' } | { status: 'done' } | { status: 'error'; message: string };

const INCOMPLETE = 'Ce lien est incomplet ou a déjà été utilisé.';

/** Traite une seule fois le lien profond d'authentification reçu (code PKCE). */
export function useAuthRedirect(): RedirectState {
  const { handleAuthRedirect, status: authStatus } = useAuth();
  const url = Linking.useLinkingURL();
  const handled = useRef(false);
  const [exchange, setExchange] = useState<RedirectState>({ status: 'pending' });
  const hasCode = !!url && /[?&](code|error_code)=/.test(url);

  useEffect(() => {
    if (handled.current || !hasCode || !url || authStatus === 'loading') return;
    handled.current = true;
    handleAuthRedirect(url)
      .then((exchanged) => setExchange(exchanged ? { status: 'done' } : { status: 'error', message: INCOMPLETE }))
      .catch((e: unknown) => setExchange({ status: 'error', message: errorMessage(e) }));
  }, [url, hasCode, authStatus, handleAuthRedirect]);

  if (hasCode) return exchange;
  if (authStatus === 'loading') return { status: 'pending' };
  // Sans code : la session éventuelle a déjà été établie (lien ouvert précédemment).
  return authStatus === 'signed-in' ? { status: 'done' } : { status: 'error', message: INCOMPLETE };
}
