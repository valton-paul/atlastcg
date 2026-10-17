import EmbeddedPostgres from 'embedded-postgres';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from 'pg';

import { STATE_FILE, TEMPLATE_DB, readMigrations, readSeed, readShim } from './paths';

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const { port } = address;
        server.close(() => resolve(port));
      } else {
        reject(new Error('port introuvable'));
      }
    });
  });
}

export default async function globalSetup(): Promise<void> {
  const port = await freePort();
  const dataDir = mkdtempSync(join(tmpdir(), 'atlas-pg-'));
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: false,
    onLog: () => undefined,
    onError: (message) => console.error(message),
  });
  await pg.initialise();
  await pg.start();
  (globalThis as { __ATLAS_PG__?: EmbeddedPostgres }).__ATLAS_PG__ = pg;

  const admin = new Client({ host: '127.0.0.1', port, user: 'postgres', password: 'postgres', database: 'postgres' });
  await admin.connect();
  await admin.query(`create database ${TEMPLATE_DB}`);
  await admin.end();

  const client = new Client({ host: '127.0.0.1', port, user: 'postgres', password: 'postgres', database: TEMPLATE_DB });
  await client.connect();
  await client.query(readShim());
  for (const migration of readMigrations()) {
    try {
      await client.query(migration.sql);
    } catch (error) {
      throw new Error(`Échec de la migration ${migration.name} : ${(error as Error).message}`);
    }
  }
  await client.query(readSeed());
  await client.end();

  writeFileSync(STATE_FILE, JSON.stringify({ port, dataDir }));
}
