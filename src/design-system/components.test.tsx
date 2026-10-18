import { fireEvent, render, screen } from '@testing-library/react-native';

import { AtlasCard } from '@/features/cards/AtlasCard';

import { Button } from './components/Button';
import { ProgressBar } from './components/ProgressBar';
import { RarityBadge } from './components/RarityBadge';
import { ErrorState } from './components/States';

const cardData = {
  title: 'Mont-Saint-Michel',
  subtitle: 'Normandie',
  category: 'monument' as const,
  rarity: 'epic' as const,
  countryName: 'France',
  isoCode: 'FR',
  isoNumeric: '250',
  illustrationPath: null,
};

describe('composants du design system', () => {
  it('Button déclenche l’action et respecte l’état désactivé', async () => {
    const onPress = jest.fn();
    await render(<Button label="Ouvrir" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    const disabled = jest.fn();
    await render(<Button label="Indisponible" onPress={disabled} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Indisponible' }));
    expect(disabled).not.toHaveBeenCalled();
  });

  it('la rareté est annoncée par un libellé, pas seulement par une couleur', async () => {
    await render(<RarityBadge rarity="legendary" />);
    expect(screen.getByLabelText('Rareté : Légendaire')).toBeOnTheScreen();
    expect(screen.getByText('Légendaire')).toBeOnTheScreen();
  });

  it('ProgressBar expose sa valeur aux technologies d’assistance', async () => {
    await render(<ProgressBar label="Pays découverts" value={3} total={30} />);
    expect(screen.getByLabelText('Pays découverts : 3 sur 30')).toBeOnTheScreen();
    expect(screen.getByText('3 / 30')).toBeOnTheScreen();
  });

  it('une carte manquante ne révèle pas son titre', async () => {
    await render(<AtlasCard card={cardData} locked />);
    expect(screen.queryByText('Mont-Saint-Michel')).toBeNull();
    expect(screen.getByLabelText('Carte manquante, Monument, France')).toBeOnTheScreen();
  });

  it('une carte possédée décrit titre, catégorie, rareté et statut', async () => {
    await render(<AtlasCard card={cardData} isNew quantity={2} onPress={() => undefined} />);
    expect(screen.getByText('Mont-Saint-Michel')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: 'Mont-Saint-Michel, Monument, rareté Épique, France, nouvelle, 2 exemplaires',
      }),
    ).toBeOnTheScreen();
  });

  it('ErrorState propose une action de reprise', async () => {
    const retry = jest.fn();
    await render(<ErrorState message="Connexion impossible." onRetry={retry} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer' }));
    expect(retry).toHaveBeenCalled();
  });
});
