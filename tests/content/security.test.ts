import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { isSecretKey, publicRuntimeConfig } from '../../scripts/public-config';
import { SERVER_ERROR_MESSAGES } from '../../src/lib/errors';

const root = join(__dirname, '..', '..');

function listFiles(dir: string, extensions: RegExp): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return listFiles(full, extensions);
    return extensions.test(entry) ? [full] : [];
  });
}

function fakeJwt(payload: object) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('configuration publique', () => {
  it('reconnaît les clés secrètes Supabase', () => {
    expect(isSecretKey('sb_secret_abc')).toBe(true);
    expect(isSecretKey(fakeJwt({ role: 'service_role' }))).toBe(true);
    expect(isSecretKey('sb_publishable_abc')).toBe(false);
    expect(isSecretKey(fakeJwt({ role: 'anon' }))).toBe(false);
  });

  it('refuse d’embarquer une clé secrète dans l’application', () => {
    expect(() =>
      publicRuntimeConfig({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_PUBLIC_KEY: 'sb_secret_x' }),
    ).toThrow(/clé secrète/);
  });

  it('n’utilise jamais la variable de clé secrète, même si elle est présente', () => {
    const config = publicRuntimeConfig({
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_PUBLIC_KEY: 'sb_publishable_x',
      SUPABASE_SECRET_KEY: 'sb_secret_x',
    });
    expect(config).toEqual({ supabaseUrl: 'https://x.supabase.co', supabaseKey: 'sb_publishable_x' });
  });

  it('privilégie les variables EXPO_PUBLIC_*', () => {
    const config = publicRuntimeConfig({
      EXPO_PUBLIC_SUPABASE_URL: 'https://a.supabase.co',
      SUPABASE_URL: 'https://b.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_a',
    });
    expect(config).toEqual({ supabaseUrl: 'https://a.supabase.co', supabaseKey: 'sb_publishable_a' });
  });
});

describe('code embarqué dans l’application', () => {
  const sources = listFiles(join(root, 'src'), /\.(ts|tsx|json)$/).filter((file) => !/\.test\.tsx?$/.test(file));

  it('ne contient ni clé secrète ni référence au rôle service', () => {
    const offenders = sources.filter((file) => {
      const text = readFileSync(file, 'utf8');
      return /sb_secret_|service_role|SUPABASE_SECRET|SERVICE_ROLE/.test(text);
    });
    expect(offenders).toEqual([]);
  });

  it('chaque erreur levée par la base a un message compréhensible côté client', () => {
    const migrations = listFiles(join(root, 'supabase', 'migrations'), /\.sql$/);
    const codes = new Set<string>();
    for (const file of migrations) {
      for (const match of readFileSync(file, 'utf8').matchAll(/raise exception '([A-Z_]+)'/g)) codes.add(match[1]);
    }
    expect(codes.size).toBeGreaterThan(10);
    const missing = [...codes].filter((code) => !(code in SERVER_ERROR_MESSAGES));
    expect(missing).toEqual([]);
  });
});

describe('données géographiques', () => {
  it('chaque pays du catalogue figure sur la carte et possède une silhouette', () => {
    const countries = JSON.parse(readFileSync(join(root, 'content', 'countries.json'), 'utf8')) as {
      countries: { isoNumeric: string; name: string }[];
    };
    const map = JSON.parse(readFileSync(join(root, 'src/features/world-map/data/world-map.json'), 'utf8')) as {
      countries: { id: string }[];
    };
    const silhouettes = JSON.parse(readFileSync(join(root, 'src/features/cards/data/silhouettes.json'), 'utf8')) as {
      paths: Record<string, string>;
    };
    const mapIds = new Set(map.countries.map((c) => c.id));
    const missing = countries.countries.filter((c) => !mapIds.has(c.isoNumeric) || !silhouettes.paths[c.isoNumeric]);
    expect(missing.map((c) => c.name)).toEqual([]);
  });
});
