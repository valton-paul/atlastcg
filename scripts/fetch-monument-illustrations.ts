/**
 * Récupère les photos des cartes patrimoine (monuments, lieux, sites…) via
 * Wikidata (P18) → Wikimedia Commons, convertit en WebP, met à jour countries.json.
 *
 *   npm run illustrations:monuments
 *   npm run illustrations:monuments -- --dry-run
 *   npm run illustrations:monuments -- --limit=20
 *   npm run illustrations:monuments -- --force=massada,persepolis
 *
 * Licences acceptées : Public Domain / CC0 / CC BY / CC BY-SA.
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
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
const forceArg = process.argv.find((a) => a.startsWith('--force='));
const forceSlugs = new Set(
  forceArg
    ? forceArg
        .slice('--force='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [],
);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function wikiJson(url: string, attempt = 1): Promise<unknown> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if ((res.status === 429 || res.status === 503) && attempt < 8) {
      await sleep(attempt * 5000);
      return wikiJson(url, attempt + 1);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.trimStart().startsWith('{') && !text.trimStart().startsWith('[')) {
      if (attempt < 8) {
        await sleep(attempt * 8000);
        return wikiJson(url, attempt + 1);
      }
      throw new Error(`Réponse non-JSON (rate-limit Wikimedia ?)`);
    }
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (attempt < 8 && !(error as Error).message.startsWith('HTTP ')) {
      await sleep(attempt * 4000);
      return wikiJson(url, attempt + 1);
    }
    throw error;
  }
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

async function collectMappedCandidates(entry: MappingEntry | undefined): Promise<ResolvedFile[]> {
  const out: ResolvedFile[] = [];
  const seen = new Set<string>();
  const push = (item: ResolvedFile) => {
    if (seen.has(item.fileTitle)) return;
    seen.add(item.fileTitle);
    out.push(item);
  };
  if (!entry) return out;
  const qid = typeof entry === 'string' ? entry : entry.qid;
  const forced = typeof entry === 'string' ? undefined : entry.file;
  if (forced) {
    push({ fileTitle: forced.startsWith('File:') ? forced : `File:${forced}` });
  }
  if (qid) {
    const file = await primaryImageTitle(qid);
    await sleep(700);
    if (file) push({ fileTitle: file });
  }
  return out;
}

async function collectSearchCandidates(card: HeritageCard): Promise<ResolvedFile[]> {
  const out: ResolvedFile[] = [];
  const seen = new Set<string>();
  const push = (item: ResolvedFile) => {
    if (seen.has(item.fileTitle)) return;
    seen.add(item.fileTitle);
    out.push(item);
  };
  const queries = [
    `${card.title} ${card.country}`,
    card.title,
    card.subtitle ? `${card.title} ${card.subtitle}` : null,
  ].filter(Boolean) as string[];

  for (const query of queries) {
    const qids = await searchWikidata(query);
    await sleep(900);
    for (const qid of qids.slice(0, 3)) {
      const file = await primaryImageTitle(qid);
      await sleep(700);
      if (file) push({ fileTitle: file, mappingUpdate: qid });
    }
  }

  for (const query of queries) {
    const files = await searchCommons(query);
    await sleep(900);
    for (const file of files) push({ fileTitle: file, mappingUpdate: { file } });
  }
  return out;
}

async function main() {
  const mapping = loadMapping();
  const all = listHeritageCards();
  const cards =
    forceSlugs.size > 0
      ? all.filter((c) => forceSlugs.has(c.slug))
      : all.filter((c) => !c.illustration);
  const todo = cards.slice(0, Number.isFinite(limit) ? limit : cards.length);

  console.log(
    forceSlugs.size > 0
      ? `Force ${todo.length} carte(s) : ${[...forceSlugs].join(', ')}.`
      : `${all.filter((c) => !c.illustration).length} carte(s) sans illustration — traitement de ${todo.length}.`,
  );

  const results: FetchResult[] = [];
  const skipped: { slug: string; reason: string }[] = [];

  for (const card of todo) {
    const rel = `monuments/${card.slug}.webp`;
    const abs = join(root, 'content', 'illustrations', rel);
    process.stdout.write(`• ${card.slug} (${card.category})… `);

    try {
      const licenseNotes: string[] = [];
      const triedFiles = new Set<string>();

      const tryCandidates = async (
        list: ResolvedFile[],
      ): Promise<{ resolved: ResolvedFile; info: CommonsInfo } | null> => {
        for (const resolved of list) {
          if (triedFiles.has(resolved.fileTitle)) continue;
          triedFiles.add(resolved.fileTitle);
          try {
            const info = await commonsInfo(resolved.fileTitle);
            await sleep(800);
            if (!licenseOk(info.license)) {
              licenseNotes.push(info.license);
              continue;
            }
            if (!imageLooksUsable(resolved.fileTitle, info.artist)) {
              licenseNotes.push('image-inutile');
              continue;
            }
            return { resolved, info };
          } catch {
            await sleep(1200);
          }
        }
        return null;
      };

      // 1) mapping Wikidata/Commons (peu d’appels) puis 2) recherche si besoin
      let chosen = await tryCandidates(await collectMappedCandidates(mapping[card.slug]));
      if (!chosen) {
        chosen = await tryCandidates(await collectSearchCandidates(card));
      }

      if (!chosen) {
        const reason =
          licenseNotes.length > 0 ? `licence:${licenseNotes.join('|')}` : 'introuvable';
        console.log(reason.startsWith('licence:') ? `licence refusée (${licenseNotes[0]})` : 'introuvable');
        skipped.push({ slug: card.slug, reason });
        await sleep(1500);
        continue;
      }

      // Ne pas écraser un mapping { file: … } forcé à la main.
      const existing = mapping[card.slug];
      const forcedFile =
        typeof existing === 'object' && existing && typeof existing.file === 'string'
          ? existing.file
          : null;
      if (chosen.resolved.mappingUpdate && !forcedFile) {
        mapping[card.slug] = chosen.resolved.mappingUpdate;
      }

      if (!dryRun && (forceSlugs.has(card.slug) || !existsSync(abs))) {
        if (forceSlugs.has(card.slug) && existsSync(abs)) unlinkSync(abs);
        await downloadWebp(chosen.info.thumbUrl, abs);
      } else if (!dryRun) {
        process.stdout.write('(déjà présent) ');
      }

      const credit = `${chosen.info.artist} — ${chosen.info.license} (Wikimedia Commons)`;
      results.push({
        slug: card.slug,
        path: rel,
        credit,
        license: chosen.info.license,
        fileTitle: chosen.resolved.fileTitle,
      });
      console.log(`ok [${chosen.info.license}]`);
      await sleep(1500);
    } catch (error) {
      console.log(`échec : ${(error as Error).message}`);
      skipped.push({ slug: card.slug, reason: (error as Error).message });
      await sleep(2000);
    }

    // Sauvegarde progressive (reprises possibles après interruption).
    if (!dryRun && results.length > 0 && results.length % 5 === 0) {
      saveMapping(mapping);
      patchCountriesJson(results);
    }
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
