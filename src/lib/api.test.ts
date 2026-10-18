import { z } from 'zod';

import { PAGE_SIZE, selectAllRows } from './api';

jest.mock('./supabase', () => ({ getSupabase: jest.fn() }));

const rowSchema = z.object({ n: z.number() });
const rows = (start: number, count: number) => Array.from({ length: count }, (_, i) => ({ n: start + i }));

describe('selectAllRows', () => {
  it('enchaîne les pages tant qu’elles sont pleines', async () => {
    const page = jest.fn(async (from: number, to: number) => ({
      data: rows(from, Math.min(to + 1, PAGE_SIZE * 2 + 5) - from),
      error: null,
    }));

    const result = await selectAllRows('test', page, rowSchema);

    expect(result).toHaveLength(PAGE_SIZE * 2 + 5);
    expect(result[PAGE_SIZE * 2 + 4]).toEqual({ n: PAGE_SIZE * 2 + 4 });
    expect(page.mock.calls).toEqual([
      [0, PAGE_SIZE - 1],
      [PAGE_SIZE, PAGE_SIZE * 2 - 1],
      [PAGE_SIZE * 2, PAGE_SIZE * 3 - 1],
    ]);
  });

  it('s’arrête après une seule requête quand la première page suffit', async () => {
    const page = jest.fn(async () => ({ data: rows(0, 3), error: null }));
    await expect(selectAllRows('test', page, rowSchema)).resolves.toHaveLength(3);
    expect(page).toHaveBeenCalledTimes(1);
  });

  it('remonte les erreurs PostgREST', async () => {
    const page = jest.fn(async () => ({
      data: null,
      error: { code: 'P0001', message: 'NOT_AUTHENTICATED', details: null, hint: null },
    }));
    await expect(selectAllRows('test', page, rowSchema)).rejects.toMatchObject({ code: 'NOT_AUTHENTICATED' });
  });
});
