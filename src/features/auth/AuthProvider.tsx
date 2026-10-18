import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { AppError, toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

import { normalizeDisplayName } from './validation';

/** `unverified` : session ouverte mais adresse e-mail pas encore confirmée. */
export type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'unverified' | 'unconfigured';

type SignUpResult = { needsEmailConfirmation: boolean };

/**
 * Issue d'un lien d'authentification : `session` (session ouverte sur cet appareil),
 * `confirmed` (adresse confirmée, mais lien ouvert ailleurs que sur l'appareil d'origine),
 * `none` (aucun code dans le lien).
 */
export type AuthRedirectOutcome = 'session' | 'confirmed' | 'none';

function statusFor(session: Session | null): AuthStatus {
  if (!session) return 'signed-out';
  return session.user.email_confirmed_at ? 'signed-in' : 'unverified';
}

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  userId: string | null;
  /** Vrai lorsque l'utilisateur arrive depuis un lien de réinitialisation. */
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  /** Recharge l'utilisateur depuis le serveur ; renvoie vrai si l'adresse est désormais confirmée. */
  refreshVerification: () => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  handleAuthRedirect: (url: string) => Promise<AuthRedirectOutcome>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AUTH_CALLBACK_PATH = 'auth/callback';
export const RESET_PASSWORD_PATH = 'reset-password';

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(configured ? 'loading' : 'unconfigured');
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!configured) return;
    const auth = getSupabase().auth;
    let active = true;
    auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setStatus(statusFor(data.session));
      })
      .catch((error: unknown) => {
        logger.warn('auth:get-session', toAppError(error).code);
        if (active) setStatus('signed-out');
      });
    const { data } = auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
        queryClient.clear();
      }
      setSession(next);
      setStatus(statusFor(next));
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [configured, queryClient]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw toAppError(error);
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { data, error } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: normalizeDisplayName(displayName) },
        emailRedirectTo: Linking.createURL(AUTH_CALLBACK_PATH),
      },
    });
    if (error) throw toAppError(error);
    return { needsEmailConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw toAppError(error);
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    const { error } = await getSupabase().auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: Linking.createURL(AUTH_CALLBACK_PATH) },
    });
    if (error) throw toAppError(error);
  }, []);

  const refreshVerification = useCallback(async () => {
    const { data, error } = await getSupabase().auth.refreshSession();
    if (error) throw toAppError(error);
    return !!data.session?.user.email_confirmed_at;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL(RESET_PASSWORD_PATH),
    });
    if (error) throw toAppError(error);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) throw toAppError(error);
    setPasswordRecovery(false);
  }, []);

  /** Échange le code PKCE reçu par lien profond (confirmation d'e-mail ou réinitialisation). */
  const handleAuthRedirect = useCallback(async (url: string): Promise<AuthRedirectOutcome> => {
    const { queryParams, path } = Linking.parse(url);
    const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
    // Selon le cas, Supabase place l'erreur dans la requête ou dans le fragment (`#error_code=…`).
    const errorCode =
      typeof queryParams?.error_code === 'string'
        ? queryParams.error_code
        : (/[?&#]error_code=([^&#]+)/.exec(url)?.[1] ?? null);
    if (errorCode) throw new AppError(errorCode === 'otp_expired' ? 'LINK_EXPIRED' : 'SESSION_EXPIRED');
    if (!code) return 'none';
    const { error } = await getSupabase().auth.exchangeCodeForSession(code);
    if (error) {
      // Le serveur ne délivre un code qu'après avoir validé le lien : l'adresse est confirmée,
      // mais le vérificateur PKCE n'existe que sur l'appareil qui a fait la demande.
      if (path !== RESET_PASSWORD_PATH) {
        logger.warn('auth:exchange-code', toAppError(error).code);
        return 'confirmed';
      }
      throw toAppError(error);
    }
    if (path === RESET_PASSWORD_PATH) setPasswordRecovery(true);
    return 'session';
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      userId: session?.user.id ?? null,
      passwordRecovery,
      signIn,
      signUp,
      signOut,
      resendConfirmation,
      refreshVerification,
      requestPasswordReset,
      updatePassword,
      handleAuthRedirect,
    }),
    [
      status,
      session,
      passwordRecovery,
      signIn,
      signUp,
      signOut,
      resendConfirmation,
      refreshVerification,
      requestPasswordReset,
      updatePassword,
      handleAuthRedirect,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return value;
}
