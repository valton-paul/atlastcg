import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';

import { errorMessage, toAppError } from '@/lib/errors';

import { useAuth } from './AuthProvider';

export type RedirectState =
  | { status: 'pending' }
  | { status: 'done' }
  /** Adresse confirmée, mais aucune session sur cet appareil : il faut se connecter. */
  | { status: 'confirmed' }
  | { status: 'error'; message: string; expired: boolean };

const INCOMPLETE = 'Ce lien est incomplet ou a déjà été utilisé.';

/** Traite une seule fois le lien profond d'authentification reçu (code PKCE). */
export function useAuthRedirect(): RedirectState {
  const { handleAuthRedirect, status: authStatus } = useAuth();
  const url = Linking.useLinkingURL();
  const handled = useRef(false);
  const [exchange, setExchange] = useState<RedirectState>({ status: 'pending' });
  const hasCode = !!url && /[?&#](code|error_code)=/.test(url);

  useEffect(() => {
    if (handled.current || !hasCode || !url || authStatus === 'loading') return;
    handled.current = true;
    handleAuthRedirect(url)
      .then((outcome) => {
        if (outcome === 'session') setExchange({ status: 'done' });
        else if (outcome === 'confirmed') setExchange({ status: 'confirmed' });
        else setExchange({ status: 'error', message: INCOMPLETE, expired: true });
      })
      .catch((e: unknown) =>
        setExchange({ status: 'error', message: errorMessage(e), expired: toAppError(e).code === 'LINK_EXPIRED' }),
      );
  }, [url, hasCode, authStatus, handleAuthRedirect]);

  if (hasCode) return exchange;
  if (authStatus === 'loading') return { status: 'pending' };
  // Sans code : la session éventuelle a déjà été établie (lien ouvert précédemment).
  if (authStatus === 'signed-in' || authStatus === 'unverified') return { status: 'done' };
  return { status: 'error', message: INCOMPLETE, expired: true };
}
