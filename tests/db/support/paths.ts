import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = join(__dirname, '..', '..', '..');
export const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
export const STATE_FILE = join(ROOT, '.jest-db-state.json');

export const TEMPLATE_DB = 'atlas_template';

export function readShim(): string {
  return readFileSync(join(__dirname, 'supabase-shim.sql'), 'utf8');
}

export function readMigrations(): { name: string; sql: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(MIGRATIONS_DIR, name), 'utf8') }));
}

export function readSeed(): string {
  return readFileSync(join(ROOT, 'supabase', 'seed.sql'), 'utf8');
}

export interface DbState {
  port: number;
  dataDir: string;
  pid?: number;
}
