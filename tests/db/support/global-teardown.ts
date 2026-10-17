import type EmbeddedPostgres from 'embedded-postgres';
import { rmSync } from 'node:fs';

import { STATE_FILE } from './paths';

export default async function globalTeardown(): Promise<void> {
  const pg = (globalThis as { __ATLAS_PG__?: EmbeddedPostgres }).__ATLAS_PG__;
  if (pg) await pg.stop();
  rmSync(STATE_FILE, { force: true });
}
