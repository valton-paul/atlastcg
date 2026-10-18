import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import OpenPackScreen from '@/app/(app)/open/[userPackId]';
import type { AtlasData } from '@/features/player/useAtlasData';
import { makeCatalog, playerState } from '@/test-utils/fixtures';

const USER_PACK_ID = '11111111-1111-4111-8111-111111111111';
const mockRpc = jest.fn();
const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true };
let mockData: AtlasData;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ userPackId: '11111111-1111-4111-8111-111111111111' }),
  useRouter: () => mockRouter,
}));
jest.mock('@/lib/supabase', () => ({
  getSupabase: () => ({ rpc: mockRpc }),
  isSupabaseConfigured: () => false,
}));
jest.mock('@/features/player/useAtlasData', () => ({ useAtlasData: () => mockData }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const fixture = makeCatalog();

function openingPayload() {
  const fr = fixture.cards.frCountry;
  const jp = fixture.cards.jpCountry;
  const toCard = (card: typeof fr, slot: number, isNew: boolean) => ({
    slot,
    card_id: card.id,
    slug: card.slug,
    title: card.title,
    subtitle: card.subtitle,
    category: card.category,
    rarity: card.rarity,
    country_code: card.country_code,
    illustration_path: null,
    is_new: isNew,
    quantity: isNew ? 1 : 2,
    fragments_awarded: isNew ? 0 : 5,
  });
  return {
    opening_id: '22222222-2222-4222-8222-222222222222',
    user_pack_id: USER_PACK_ID,
    pack: { slug: 'classique', name: 'Classique' },
    configuration_version: 2,
    opened_at: '2026-10-17T10:00:00Z',
    cards: [toCard(fr, 1, true), toCard(jp, 2, false)],
    summary: {
      new_count: 1,
      duplicate_count: 1,
      rare_count: 0,
      fragments_awarded: 5,
      fragments_balance: 5,
      collections: [{ slug: 'pays-europe', title: 'Pays d’Europe', owned: 1, total: 2 }],
    },
    replayed: false,
  };
}

async function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <OpenPackScreen />
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  mockRpc.mockReset();
  await AsyncStorage.clear();
  mockData = {
    status: 'ready',
    catalog: fixture.catalog,
    player: playerState({
      packs: [
        {
          id: USER_PACK_ID,
          pack_id: fixture.catalog.packs[0].id,
          source: 'starter',
          created_at: '2026-10-17T09:00:00Z',
        },
      ],
    }),
    refreshing: false,
    refresh: jest.fn(),
  };
});

describe('parcours d’ouverture d’un paquet', () => {
  it('ouvre le paquet une seule fois, révèle les cartes et présente le récapitulatif', async () => {
    mockRpc.mockResolvedValue({ data: openingPayload(), error: null });
    await renderScreen();

    const pack = screen.getByRole('button', { name: 'Ouvrir le paquet Classique' });
    await fireEvent.press(pack);
    await fireEvent.press(pack);

    await waitFor(() => expect(screen.getByLabelText('Carte 1 sur 2')).toBeOnTheScreen(), { timeout: 3000 });
    expect(screen.getByText('Touche pour révéler')).toBeOnTheScreen();
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('open_pack', {
      p_user_pack_id: USER_PACK_ID,
      p_idempotency_key: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Révéler' }));
    expect(screen.getByText('Nouvelle carte')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Passer l’animation et voir toutes les cartes' }));
    expect(screen.getByText('Votre atlas s’agrandit')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 nouvelle')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 doublon')).toBeOnTheScreen();
    expect(screen.getByText('Pays d’Europe')).toBeOnTheScreen();
    expect(screen.getByText('Expédition disponible : Expédition France')).toBeOnTheScreen();

    // La clé d'idempotence est effacée une fois le résultat reçu.
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('après une coupure réseau, la nouvelle tentative réutilise la même clé d’idempotence', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { message: 'Network request failed' } })
      .mockResolvedValueOnce({ data: { ...openingPayload(), replayed: true }, error: null });
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir le paquet Classique' }));
    await waitFor(() => expect(screen.getByText('L’ouverture n’a pas abouti')).toBeOnTheScreen(), { timeout: 3000 });

    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(screen.getByTestId('opening-summary')).toBeOnTheScreen(), { timeout: 3000 });

    const firstKey = mockRpc.mock.calls[0][1].p_idempotency_key;
    const secondKey = mockRpc.mock.calls[1][1].p_idempotency_key;
    expect(firstKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(firstKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(secondKey).toBe(firstKey);
    expect(screen.getByText('Ce paquet avait déjà été ouvert : voici son contenu.')).toBeOnTheScreen();
  });

  it('une erreur métier non récupérable n’offre pas de nouvelle tentative trompeuse', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'PACK_NOT_FOUND' } });
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir le paquet Classique' }));
    await waitFor(() => expect(screen.getByText(/Ce paquet est introuvable/)).toBeOnTheScreen(), { timeout: 3000 });
    expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull();
  });

  it('rejette une réponse serveur invalide au lieu d’afficher des cartes inventées', async () => {
    mockRpc.mockResolvedValue({ data: { cards: [] }, error: null });
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir le paquet Classique' }));
    await waitFor(() => expect(screen.getByText(/répondu de façon inattendue/)).toBeOnTheScreen(), { timeout: 3000 });
  });
});
