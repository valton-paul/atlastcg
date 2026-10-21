import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import SignInScreen from '@/app/(auth)/sign-in';
import { AppError } from '@/lib/errors';

const mockSignIn = jest.fn();
const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => false };

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: () => ({ signIn: mockSignIn }) }));

beforeEach(() => {
  mockSignIn.mockReset();
  mockRouter.replace.mockReset();
});

describe('connexion', () => {
  it('signale les champs manquants sans appeler le serveur', async () => {
    await render(<SignInScreen />);
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    expect(screen.getByText('Saisissez votre adresse e-mail.')).toBeOnTheScreen();
    expect(screen.getByText('Saisissez votre mot de passe.')).toBeOnTheScreen();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('connecte puis redirige vers l’accueil', async () => {
    mockSignIn.mockResolvedValue('signed-in');
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByTestId('sign-in-email'), 'paul@exemple.fr');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'atlas2026');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockSignIn).toHaveBeenCalledWith('paul@exemple.fr', 'atlas2026');
  });

  it('redirige vers la validation d’adresse si la session n’est pas encore confirmée', async () => {
    mockSignIn.mockResolvedValue('unverified');
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByTestId('sign-in-email'), 'paul@exemple.fr');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'atlas2026');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/verify-email',
        params: { email: 'paul@exemple.fr' },
      }),
    );
  });

  it('redirige vers la validation d’adresse si Supabase refuse la connexion non confirmée', async () => {
    mockSignIn.mockRejectedValue(new AppError('EMAIL_NOT_CONFIRMED'));
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByTestId('sign-in-email'), ' paul@exemple.fr ');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'atlas2026');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/verify-email',
        params: { email: 'paul@exemple.fr' },
      }),
    );
  });

  it('affiche un message compréhensible en cas d’identifiants incorrects', async () => {
    mockSignIn.mockRejectedValue(new AppError('INVALID_CREDENTIALS'));
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByTestId('sign-in-email'), 'paul@exemple.fr');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'mauvais1');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByText('Adresse e-mail ou mot de passe incorrect.')).toBeOnTheScreen();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
