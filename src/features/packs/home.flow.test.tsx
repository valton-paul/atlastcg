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
  it('met en avant le paquet à ouvrir, le nombre disponible et le prochain paquet du jour', async () => {
    const inTwoHours = new Date(Date.now() + 2 * 3600 * 1000 + 30_000).toISOString();
    mockRpc.mockResolvedValue({ data: { available: false, next_available_at: inTwoHours }, error: null });
    mockData = ready(['a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002']);
    await renderHome();

    expect(screen.getByRole('header', { name: 'Ouvrir un paquet' })).toBeOnTheScreen();
    expect(screen.getByText('Découvrez 5 nouvelles cartes du monde')).toBeOnTheScreen();
    expect(await screen.findByLabelText(/^2 paquets disponibles\. Prochain paquet dans 2:00:/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('home-open-pack'));
    expect(mockRouter.push).toHaveBeenCalledWith('/open/a0000000-0000-4000-8000-000000000001');
  });

  it('sans paquet, désactive l’ouverture et propose le paquet du jour', async () => {
    mockRpc.mockResolvedValue({ data: { available: true, next_available_at: new Date().toISOString() }, error: null });
    mockData = ready([]);
    await renderHome();

    expect(screen.getByTestId('home-open-pack')).toBeDisabled();
    expect(await screen.findByRole('button', { name: 'Récupérer le paquet du jour' })).toBeOnTheScreen();
  });
});

describe('formatCountdown', () => {
  it('affiche heures, minutes et secondes', () => {
    expect(formatCountdown(3725)).toBe('1:02:05');
    expect(formatCountdown(125)).toBe('2:05');
    expect(formatCountdown(0)).toBe('0:00');
  });
});
