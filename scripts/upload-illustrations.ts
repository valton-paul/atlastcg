/**
 * Envoie `content/illustrations/**` vers le bucket public Supabase `card-illustrations`.
 *
 *   npm run illustrations:upload
 *
 * Requiert `SUPABASE_URL` + `SUPABASE_SECRET_KEY` (service role) dans `.env`.
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(__dirname, '..');

/** Charge `.env` sans dépendance (évite d’imposer dotenv au projet). */
function loadEnvFile(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(join(root, '.env'));

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL et SUPABASE_SECRET_KEY sont requis.');
  process.exit(1);
}

const dir = join(root, 'content', 'illustrations');
if (!existsSync(dir)) {
  console.error('Aucun dossier content/illustrations.');
  process.exit(1);
}

function listFiles(base: string): string[] {
  return readdirSync(base).flatMap((entry) => {
    const full = join(base, entry);
    return statSync(full).isDirectory() ? listFiles(full) : [relative(dir, full)];
  });
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const files = listFiles(dir).filter((f) => /\.(webp|png|jpg)$/i.test(f));

async function main() {
  let ok = 0;
  for (const path of files) {
    const body = readFileSync(join(dir, path));
    const contentType = path.endsWith('.webp')
      ? 'image/webp'
      : path.endsWith('.png')
        ? 'image/png'
        : 'image/jpeg';
    const { error } = await sb.storage.from('card-illustrations').upload(path, body, {
      contentType,
      upsert: true,
    });
    if (error) {
      console.error(`✗ ${path} : ${error.message}`);
      continue;
    }
    console.log(`✓ ${path}`);
    ok += 1;
  }
  console.log(`${ok}/${files.length} fichier(s) envoyés.`);
  if (ok < files.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
