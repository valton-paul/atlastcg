import type { ConfigContext, ExpoConfig } from 'expo/config';

import { publicRuntimeConfig } from './scripts/public-config';

/**
 * Seules les valeurs publiques (URL du projet et clé publishable/anon) sont transmises
 * à l'application. Toute clé secrète ou `service_role` présente dans `.env` est ignorée.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  extra: {
    ...config.extra,
    ...publicRuntimeConfig(process.env),
  },
});
