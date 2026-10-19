import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/(app)/(tabs)/index';
import type { AtlasData } from '@/features/player/useAtlasData';
import { makeCatalog, playerState } from '@/test-utils/fixtures';

import { formatCountdown } from './useCountdown';

const mockRpc = jest.fn();
const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true };
let mockData: AtlasData;

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/lib/supabase', () => ({ getSupabase: () => ({ rpc: mockRpc }), isSupabaseConfigured: () => false }));
jest.mock('@/features/player/useAtlasData', () => ({ useAtlasData: () => mockData }));
jest.mock('@/features/player/PlayerHeader', () => ({ PlayerHeader: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const fixture = makeCatalog();
const packId = fixture.catalog.packs[0].id;

function ready(packIds: string[]): AtlasData {
  return {
    status: 'ready',
    catalog: fixture.catalog,
    player: playerState({
      packs: packIds.map((id) => ({ id, pack_id: packId, source: 'starter', created_at: '2026-10-17T09:00:00Z' })),
    }),
    refreshing: false,
    refresh: jest.fn(),
  };
}

async function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <HomeScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('accueil', () => {
  function timerState(available: number, nextInSeconds: number | null, serverAheadSeconds = 0) {
    const server = Date.now() + serverAheadSeconds * 1000;
    return {
      data: {
        available,
        max_stored: 15,
        interval_seconds: 600,
        granted: 0,
        next_at: nextInSeconds === null ? null : new Date(server + nextInSeconds * 1000).toISOString(),
        server_time: new Date(server).toISOString(),
      },
      error: null,
    };
  }

  it('met en avant le paquet à ouvrir, la réserve et le prochain paquet régénéré', async () => {
    mockRpc.mockResolvedValue(timerState(2, 7 * 60 + 42));
    mockData = ready(['a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002']);
    await renderHome();

    expect(mockRpc).toHaveBeenCalledWith('sync_timed_packs', {});
    expect(screen.getByRole('header', { name: 'Ouvrir un paquet' })).toBeOnTheScreen();
    expect(screen.getByLabelText(/Ouvrir le paquet Classique, 2 en stock/)).toBeOnTheScreen();
    expect(screen.getByText('×2 en stock')).toBeOnTheScreen();
    expect(
      await screen.findByLabelText(/^2 paquets à ouvrir\. Réserve 2 sur 15\. Prochain paquet dans 7:4[1-3]\.$/),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('home-open-pack'));
    // Ouverture en overlay sur l’accueil (pas de navigation vers /open).
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Fermer')).toBeOnTheScreen();
    expect(screen.getByText('Paquet Classique')).toBeOnTheScreen();
  });

  it('cale le compte à rebours sur l’horloge du serveur, pas sur celle de l’appareil', async () => {
    mockRpc.mockResolvedValue(timerState(0, 5 * 60, 3600));
    mockData = ready([]);
    await renderHome();

    expect(screen.getByTestId('home-open-pack')).toBeDisabled();
    expect(await screen.findByLabelText(/Prochain paquet dans [45]:\d\d\.$/)).toBeOnTheScreen();
  });

  it('signale une réserve pleine sans compte à rebours', async () => {
    mockRpc.mockResolvedValue(timerState(15, null));
    mockData = ready(['a0000000-0000-4000-8000-000000000001']);
    await renderHome();

    expect(await screen.findByText('Réserve pleine : ouvrez un paquet pour relancer la recharge')).toBeOnTheScreen();
    expect(screen.queryByText(/Prochain paquet/)).toBeNull();
  });
});

describe('formatCountdown', () => {
  it('affiche heures, minutes et secondes', () => {
    expect(formatCountdown(3725)).toBe('1:02:05');
    expect(formatCountdown(125)).toBe('2:05');
    expect(formatCountdown(0)).toBe('0:00');
  });
});
