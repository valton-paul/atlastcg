import { fireEvent, render, screen } from '@testing-library/react-native';

import { expeditionState, makeCatalog, owned, ownedMap } from '@/test-utils/fixtures';

import { CountryPanel } from './CountryPanel';

const mockRouter = { push: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

const { catalog, cards } = makeCatalog();
const france = catalog.countriesByIso.get('FR')!;
const kenya = catalog.countriesByIso.get('KE')!;
const frExpedition = catalog.expeditionsByCountry.get('FR')!;

beforeEach(() => jest.clearAllMocks());

describe('détail d’un pays sur la carte', () => {
  it('affiche la capitale, la progression, les cartes et l’expédition d’un pays découvert', async () => {
    const onClose = jest.fn();
    await render(
      <CountryPanel
        catalog={catalog}
        owned={ownedMap(owned(cards.frCountry.id))}
        expeditions={new Map([[frExpedition.id, expeditionState(frExpedition.id, 'in_progress')]])}
        country={france}
        state="exploring"
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('header', { name: 'France' })).toBeOnTheScreen();
    expect(screen.getByText('Capitale France')).toBeOnTheScreen();
    expect(screen.getByText('Expédition France')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Reprendre l’expédition' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/expedition/expedition-fr');
    await fireEvent.press(screen.getByRole('button', { name: 'Voir la fiche du pays' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/country/FR');
    await fireEvent.press(screen.getByRole('button', { name: 'Fermer le panneau' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('ne révèle pas la capitale d’un pays encore inconnu', async () => {
    await render(
      <CountryPanel
        catalog={catalog}
        owned={ownedMap()}
        expeditions={new Map()}
        country={kenya}
        state="unknown"
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole('header', { name: 'Kenya' })).toBeOnTheScreen();
    expect(screen.queryByText(/Capitale/)).toBeNull();
    expect(screen.getByText(/Obtenez une carte de ce pays/)).toBeOnTheScreen();
  });
});
