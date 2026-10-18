// CommonJS non transpilé : ce module est chargé par `app.config.ts`, dont le chargeur
// ne transpile pas les fichiers TypeScript importés.

/** @param {Record<string, string | undefined>} env @param {string[]} names */
function firstDefined(env, names) {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return null;
}

/** Une clé `service_role` est un JWT dont la charge utile porte `"role":"service_role"`. */
function isServiceRoleJwt(key) {
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

function isSecretKey(key) {
  return key.startsWith('sb_secret_') || isServiceRoleJwt(key);
}

function publicRuntimeConfig(env) {
  const supabaseUrl = firstDefined(env, ['EXPO_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']);
  const supabaseKey = firstDefined(env, [
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_PUBLIC_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
  ]);
  if (supabaseKey && isSecretKey(supabaseKey)) {
    throw new Error(
      'La clé Supabase fournie à l’application est une clé secrète. Utilisez la clé publishable (ou anon).',
    );
  }
  return { supabaseUrl, supabaseKey };
}

module.exports = { isSecretKey, publicRuntimeConfig };
