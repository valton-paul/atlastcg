import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { AppError, toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

import { normalizeDisplayName } from './validation';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'unconfigured';

type SignUpResult = { needsEmailConfirmation: boolean };

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  userId: string | null;
  /** Vrai lorsque l'utilisateur arrive depuis un lien de réinitialisation. */
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  handleAuthRedirect: (url: string) => Promise<boolean>;
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
        setStatus(data.session ? 'signed-in' : 'signed-out');
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
      setStatus(next ? 'signed-in' : 'signed-out');
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
  const handleAuthRedirect = useCallback(async (url: string) => {
    const { queryParams, path } = Linking.parse(url);
    const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
    const errorCode = typeof queryParams?.error_code === 'string' ? queryParams.error_code : null;
    if (errorCode) throw new AppError('SESSION_EXPIRED');
    if (!code) return false;
    const { error } = await getSupabase().auth.exchangeCodeForSession(code);
    if (error) throw toAppError(error);
    if (path === RESET_PASSWORD_PATH) setPasswordRecovery(true);
    return true;
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
