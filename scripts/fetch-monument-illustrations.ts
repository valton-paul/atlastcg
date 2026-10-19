/**
 * Récupère les photos des cartes patrimoine (monuments, lieux, sites…) via
 * Wikidata (P18) → Wikimedia Commons, convertit en WebP, met à jour countries.json.
 *
 *   npm run illustrations:monuments
 *   npm run illustrations:monuments -- --dry-run
 *   npm run illustrations:monuments -- --limit=20
 *
 * Licences acceptées : Public Domain / CC0 / CC BY / CC BY-SA.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import sharp from 'sharp';

const root = join(__dirname, '..');
const UA = 'AtlasTCG/0.1 (heritage illustrations build; contact: atlas-content)';
const WIDTH = 900;
const ALLOWED_LICENSE =
  /^(public domain|pd|cc0|cc-?by(?!-nc)|creative commons attribution(?!.*non)|attribution|fal|free art|licence ouverte|kogl)/i;

type MappingEntry = string | { qid?: string; file?: string };
type Mapping = Record<string, MappingEntry>;
type HeritageCard = {
  slug: string;
  title: string;
  subtitle?: string;
  category: string;
  country: string;
  illustration?: string;
};
type FetchResult = {
  slug: string;
  path: string;
  credit: string;
  license: string;
  fileTitle: string;
};

const dryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function wikiJson(url: string, attempt = 1): Promise<unknown> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (res.status === 429 && attempt < 6) {
    await sleep(attempt * 3000);
    return wikiJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function primaryImageTitle(qid: string): Promise<string | null> {
  const url =
    `https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&property=P18&entity=${encodeURIComponent(qid)}`;
  const data = (await wikiJson(url)) as {
    claims?: { P18?: { mainsnak?: { datavalue?: { value?: string } } }[] };
  };
  const value = data.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  return value ? `File:${value}` : null;
}

async function searchWikidata(query: string): Promise<string[]> {
  const url =
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=fr&uselang=fr&type=item&limit=5` +
    `&search=${encodeURIComponent(query)}`;
  const data = (await wikiJson(url)) as { search?: { id: string }[] };
  return (data.search ?? []).map((s) => s.id);
}

async function searchCommons(query: string): Promise<string[]> {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&list=search&format=json&srnamespace=6&srlimit=8` +
    `&srsearch=${encodeURIComponent(query)}`;
  const data = (await wikiJson(url)) as { query?: { search?: { title: string }[] } };
  return (data.query?.search ?? [])
    .map((s) => s.title)
    .filter((t) => /\.(jpe?g|png|webp)$/i.test(t));
}

type CommonsInfo = {
  thumbUrl: string;
  license: string;
  artist: string;
};

async function commonsInfo(fileTitle: string): Promise<CommonsInfo> {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo` +
    `&titles=${encodeURIComponent(fileTitle)}` +
    `&iiprop=url|extmetadata|size&iiurlwidth=${WIDTH}`;
  const data = (await wikiJson(url)) as {
    query?: {
      pages?: Record<
        string,
        {
          imageinfo?: {
            thumburl?: string;
            url?: string;
            extmetadata?: Record<string, { value?: string }>;
          }[];
        }
      >;
    };
  };
  const page = Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info?.thumburl && !info?.url) throw new Error(`Pas d’URL pour ${fileTitle}`);
  const meta = info.extmetadata ?? {};
  return {
    thumbUrl: info.thumburl ?? info.url!,
    license: stripHtml(meta.LicenseShortName?.value ?? meta.License?.value ?? 'unknown'),
    artist: stripHtml(meta.Artist?.value ?? meta.Credit?.value ?? 'Auteur inconnu').slice(0, 120),
  };
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function licenseOk(license: string): boolean {
  if (/non.?commercial|cc.?by.?nc|all rights reserved/i.test(license)) return false;
  return ALLOWED_LICENSE.test(license) || /^(cc by|cc-by)\b/i.test(license);
}

/** Évite les cartes topo / CIA / schémas souvent renvoyés par P18 ou la recherche Commons. */
function imageLooksUsable(fileTitle: string, artist: string): boolean {
  const hay = `${fileTitle} ${artist}`.toLowerCase();
  if (/location map|relief map|topograph|orthophoto|satellite|world factbook|central intelligence|cia\b/.test(hay)) {
    return false;
  }
  if (/\b(svg|pdf)\b/.test(hay)) return false;
  return true;
}

async function downloadWebp(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Download HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(dest), { recursive: true });
  await sharp(buf)
    .rotate()
    .resize({ width: WIDTH, height: Math.round(WIDTH * 1.5), fit: 'cover', position: 'centre' })
    .webp({ quality: 82 })
    .toFile(dest);
}

function listHeritageCards(): HeritageCard[] {
  const data = JSON.parse(readFileSync(join(root, 'content', 'countries.json'), 'utf8')) as {
    countries: {
      name: string;
      cards: {
        heritage: HeritageCard;
        extras?: HeritageCard[];
      };
    }[];
  };
  const out: HeritageCard[] = [];
  for (const country of data.countries) {
    const cards = [country.cards.heritage, ...(country.cards.extras ?? [])];
    for (const card of cards) {
      out.push({ ...card, country: country.name });
    }
  }
  return out;
}

function loadMapping(): Mapping {
  const path = join(root, 'scripts', 'data', 'monument-wikidata.json');
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Mapping & { $comment?: string };
  delete raw.$comment;
  return raw;
}

function saveMapping(mapping: Mapping) {
  const path = join(root, 'scripts', 'data', 'monument-wikidata.json');
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        $comment: 'slug → QID Wikidata (P18) ou { file: "File:…" }. Généré / enrichi par illustrations:monuments.',
        ...mapping,
      },
      null,
      2,
    )}\n`,
  );
}

function patchCountriesJson(results: FetchResult[]): number {
  const path = join(root, 'content', 'countries.json');
  const data = JSON.parse(readFileSync(path, 'utf8')) as {
    countries: {
      cards: {
        heritage: { slug: string; illustration?: string; illustrationCredit?: string };
        extras?: { slug: string; illustration?: string; illustrationCredit?: string }[];
      };
    }[];
  };
  const bySlug = new Map(results.map((r) => [r.slug, r]));
  let updated = 0;
  const apply = (card: { slug: string; illustration?: string; illustrationCredit?: string }) => {
    const hit = bySlug.get(card.slug);
    if (!hit) return;
    card.illustration = hit.path;
    card.illustrationCredit = hit.credit;
    updated += 1;
  };
  for (const country of data.countries) {
    apply(country.cards.heritage);
    for (const extra of country.cards.extras ?? []) apply(extra);
  }
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  return updated;
}

type ResolvedFile = { fileTitle: string; mappingUpdate?: MappingEntry };

/** Collecte plusieurs candidats Commons : mapping → P18 Wikidata → recherche. */
async function collectCandidates(
  card: HeritageCard,
  entry: MappingEntry | undefined,
): Promise<ResolvedFile[]> {
  const out: ResolvedFile[] = [];
  const seen = new Set<string>();
  const push = (item: ResolvedFile) => {
    if (seen.has(item.fileTitle)) return;
    seen.add(item.fileTitle);
    out.push(item);
  };

  if (entry) {
    const qid = typeof entry === 'string' ? entry : entry.qid;
    const forced = typeof entry === 'string' ? undefined : entry.file;
    if (forced) {
      push({ fileTitle: forced.startsWith('File:') ? forced : `File:${forced}` });
    }
    if (qid) {
      const file = await primaryImageTitle(qid);
      await sleep(400);
      if (file) push({ fileTitle: file });
    }
  }

  const queries = [
    `${card.title} ${card.country}`,
    card.title,
    card.subtitle ? `${card.title} ${card.subtitle}` : null,
  ].filter(Boolean) as string[];

  for (const query of queries) {
    const qids = await searchWikidata(query);
    await sleep(500);
    for (const qid of qids.slice(0, 4)) {
      const file = await primaryImageTitle(qid);
      await sleep(400);
      if (file) push({ fileTitle: file, mappingUpdate: qid });
    }
  }

  for (const query of queries) {
    const files = await searchCommons(query);
    await sleep(500);
    for (const file of files) push({ fileTitle: file, mappingUpdate: { file } });
  }

  return out;
}

async function main() {
  const mapping = loadMapping();
  const cards = listHeritageCards().filter((c) => !c.illustration);
  const todo = cards.slice(0, Number.isFinite(limit) ? limit : cards.length);

  console.log(`${cards.length} carte(s) sans illustration — traitement de ${todo.length}.`);

  const results: FetchResult[] = [];
  const skipped: { slug: string; reason: string }[] = [];

  for (const card of todo) {
    const rel = `monuments/${card.slug}.webp`;
    const abs = join(root, 'content', 'illustrations', rel);
    process.stdout.write(`• ${card.slug} (${card.category})… `);

    try {
      const candidates = await collectCandidates(card, mapping[card.slug]);
      if (candidates.length === 0) {
        console.log('introuvable');
        skipped.push({ slug: card.slug, reason: 'introuvable' });
        await sleep(800);
        continue;
      }

      let picked: { resolved: ResolvedFile; info: CommonsInfo } | null = null;
      const licenseNotes: string[] = [];
      for (const resolved of candidates) {
        try {
          const info = await commonsInfo(resolved.fileTitle);
          await sleep(500);
          if (!licenseOk(info.license)) {
            licenseNotes.push(info.license);
            continue;
          }
          if (!imageLooksUsable(resolved.fileTitle, info.artist)) {
            licenseNotes.push('image-inutile');
            continue;
          }
          picked = { resolved, info };
          break;
        } catch {
          await sleep(800);
        }
      }

      if (!picked) {
        const reason =
          licenseNotes.length > 0 ? `licence:${licenseNotes.join('|')}` : 'introuvable';
        console.log(reason.startsWith('licence:') ? `licence refusée (${licenseNotes[0]})` : 'introuvable');
        skipped.push({ slug: card.slug, reason });
        continue;
      }

      // Ne pas écraser un mapping { file: … } forcé à la main.
      const existing = mapping[card.slug];
      const forcedFile =
        typeof existing === 'object' && existing && typeof existing.file === 'string'
          ? existing.file
          : null;
      if (picked.resolved.mappingUpdate && !forcedFile) {
        mapping[card.slug] = picked.resolved.mappingUpdate;
      }

      if (!dryRun && !existsSync(abs)) {
        await downloadWebp(picked.info.thumbUrl, abs);
      } else if (!dryRun) {
        process.stdout.write('(déjà présent) ');
      }

      const credit = `${picked.info.artist} — ${picked.info.license} (Wikimedia Commons)`;
      results.push({
        slug: card.slug,
        path: rel,
        credit,
        license: picked.info.license,
        fileTitle: picked.resolved.fileTitle,
      });
      console.log(`ok [${picked.info.license}]`);
      await sleep(900);
    } catch (error) {
      console.log(`échec : ${(error as Error).message}`);
      skipped.push({ slug: card.slug, reason: (error as Error).message });
      await sleep(2000);
    }

    // Sauvegarde progressive du mapping (reprises possibles).
    if (!dryRun && results.length % 10 === 0) saveMapping(mapping);
  }

  if (!dryRun) {
    saveMapping(mapping);
    if (results.length > 0) {
      const n = patchCountriesJson(results);
      console.log(`\n${n} carte(s) mises à jour dans content/countries.json`);
    }
  }

  writeFileSync(
    join(root, 'scripts', 'data', 'monument-illustrations-report.json'),
    JSON.stringify({ fetchedAt: new Date().toISOString(), results, skipped }, null, 2) + '\n',
  );
  console.log(`Rapport : scripts/data/monument-illustrations-report.json`);
  console.log(`Réussis : ${results.length} — Ignorés : ${skipped.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
