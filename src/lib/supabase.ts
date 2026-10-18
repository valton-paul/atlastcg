import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { getSupabaseConfig } from './env';
import { AppError } from './errors';

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const config = getSupabaseConfig();
  if (!config) throw new AppError('NOT_CONFIGURED');
  client = createClient(config.url, config.key, {
    auth: {
      storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  if (Platform.OS !== 'web') {
    // Le rafraîchissement automatique du jeton n'est actif qu'au premier plan.
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }
  return client;
}
