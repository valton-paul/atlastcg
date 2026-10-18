import { fireEvent, render, screen } from '@testing-library/react-native';

import { makeCatalog, owned, ownedMap } from '@/test-utils/fixtures';

import { CountryPanel } from './CountryPanel';

const mockRouter = { push: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

const { catalog, cards } = makeCatalog();
const france = catalog.countriesByIso.get('FR')!;
const kenya = catalog.countriesByIso.get('KE')!;

beforeEach(() => jest.clearAllMocks());

describe('détail d’un pays sur la carte', () => {
  it('affiche la capitale, la progression et les cartes d’un pays découvert', async () => {
    const onClose = jest.fn();
    await render(
      <CountryPanel
        catalog={catalog}
        owned={ownedMap(owned(cards.frCountry.id))}
        country={france}
        tier="exploring"
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('header', { name: 'France' })).toBeOnTheScreen();
    expect(screen.getByText('Capitale France')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /expédition/i })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Voir la fiche du pays' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/country/FR');
    await fireEvent.press(screen.getByRole('button', { name: 'Fermer le panneau' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('masque le nom et la capitale d’un pays encore inconnu', async () => {
    await render(
      <CountryPanel catalog={catalog} owned={ownedMap()} country={kenya} tier="empty" onClose={jest.fn()} />,
    );

    expect(screen.getByRole('header', { name: '???' })).toBeOnTheScreen();
    expect(screen.queryByText('Kenya')).toBeNull();
    expect(screen.queryByText(/Capitale/)).toBeNull();
    expect(screen.getByText(/Obtenez une carte de ce pays/)).toBeOnTheScreen();
  });
});
