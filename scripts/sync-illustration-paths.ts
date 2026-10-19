/**
 * Pousse illustration_path / illustration_credit depuis content/countries.json
 * vers la table public.cards (via REST service role).
 *
 *   npx tsx scripts/sync-illustration-paths.ts
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');

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

type CardRow = { slug: string; illustration: string; illustrationCredit?: string };

function listIllustratedHeritage(): CardRow[] {
  const data = JSON.parse(readFileSync(join(root, 'content', 'countries.json'), 'utf8')) as {
    countries: {
      cards: {
        heritage: CardRow;
        extras?: CardRow[];
      };
    }[];
  };
  const out: CardRow[] = [];
  for (const country of data.countries) {
    for (const card of [country.cards.heritage, ...(country.cards.extras ?? [])]) {
      if (card.illustration) out.push(card);
    }
  }
  return out;
}

async function main() {
  const sb = createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const cards = listIllustratedHeritage();
  console.log(`${cards.length} carte(s) à synchroniser.`);

  let ok = 0;
  let fail = 0;
  const batchSize = 50;
  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (card) => {
        const { error, count } = await sb
          .from('cards')
          .update({
            illustration_path: card.illustration,
            illustration_credit: card.illustrationCredit ?? null,
          })
          .eq('slug', card.slug);
        if (error) {
          console.error(`✗ ${card.slug}: ${error.message}`);
          return false;
        }
        if (count === 0) {
          // count may be null without Prefer header — ignore
        }
        return true;
      }),
    );
    for (const r of results) {
      if (r) ok += 1;
      else fail += 1;
    }
    process.stdout.write(`… ${Math.min(i + batchSize, cards.length)}/${cards.length}\n`);
  }

  const { count: withPath } = await sb
    .from('cards')
    .select('slug', { count: 'exact', head: true })
    .in('category', ['monument', 'geography', 'history', 'culture'])
    .not('illustration_path', 'is', null);

  console.log(`Updates ok=${ok} fail=${fail}. Heritage avec path en DB : ${withPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
