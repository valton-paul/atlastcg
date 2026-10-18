import { act, fireEvent, render, screen } from '@testing-library/react-native';

import VerifyEmailScreen from '@/app/verify-email';
import { AppError } from '@/lib/errors';

const mockResend = jest.fn();
const mockRefresh = jest.fn();
const mockSignOut = jest.fn();
const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => false };
let mockParams: Record<string, string> = {};
let mockAuth: { status: string; session: { user: { email: string } } | null };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`redirect:${href}`}</Text>;
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    ...mockAuth,
    resendConfirmation: mockResend,
    refreshVerification: mockRefresh,
    signOut: mockSignOut,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockAuth = { status: 'signed-out', session: null };
});

afterEach(() => {
  jest.useRealTimers();
});

describe('validation de l’adresse e-mail', () => {
  it('après l’inscription, affiche l’adresse et bloque le renvoi pendant 60 s', async () => {
    jest.useFakeTimers();
    mockParams = { email: 'paul@exemple.fr', sent: '1' };
    mockResend.mockResolvedValue(undefined);
    await render(<VerifyEmailScreen />);

    expect(screen.getByText('Merci de valider votre adresse e-mail')).toBeOnTheScreen();
    expect(screen.getByText('paul@exemple.fr')).toBeOnTheScreen();
    expect(screen.getByText(/valable 15 minutes/)).toBeOnTheScreen();
    expect(screen.getByTestId('verify-email-resend')).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(61_000);
    });
    expect(screen.getByTestId('verify-email-resend')).toBeEnabled();

    await fireEvent.press(screen.getByTestId('verify-email-resend'));
    expect(mockResend).toHaveBeenCalledWith('paul@exemple.fr');
    expect(await screen.findByText('Un nouveau lien vient d’être envoyé à paul@exemple.fr.')).toBeOnTheScreen();
    expect(screen.getByTestId('verify-email-resend')).toBeDisabled();
  });

  it('depuis un lien expiré, demande l’adresse avant de renvoyer', async () => {
    mockResend.mockResolvedValue(undefined);
    await render(<VerifyEmailScreen />);

    await fireEvent.press(screen.getByTestId('verify-email-resend'));
    expect(screen.getByText('Saisissez votre adresse e-mail.')).toBeOnTheScreen();
    expect(mockResend).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('verify-email-input'), 'paul@exemple.fr');
    await fireEvent.press(screen.getByTestId('verify-email-resend'));
    expect(mockResend).toHaveBeenCalledWith('paul@exemple.fr');
  });

  it('affiche clairement la limite d’envoi de Supabase', async () => {
    mockParams = { email: 'paul@exemple.fr' };
    mockResend.mockRejectedValue(new AppError('RATE_LIMITED'));
    await render(<VerifyEmailScreen />);

    await fireEvent.press(screen.getByTestId('verify-email-resend'));
    expect(await screen.findByText(/Trop de tentatives/)).toBeOnTheScreen();
    expect(screen.getByTestId('verify-email-resend')).toBeDisabled();
  });

  it('avec une session non vérifiée, revérifie l’adresse et permet de se déconnecter', async () => {
    mockAuth = { status: 'unverified', session: { user: { email: 'paul@exemple.fr' } } };
    mockRefresh.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await render(<VerifyEmailScreen />);

    await fireEvent.press(screen.getByTestId('verify-email-check'));
    expect(await screen.findByText(/pas encore validée/)).toBeOnTheScreen();
    expect(mockRouter.replace).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('verify-email-check'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/');

    await fireEvent.press(screen.getByRole('button', { name: 'Se déconnecter' }));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('redirige vers l’application une fois l’adresse confirmée', async () => {
    mockAuth = { status: 'signed-in', session: { user: { email: 'paul@exemple.fr' } } };
    await render(<VerifyEmailScreen />);
    expect(screen.getByText('redirect:/')).toBeOnTheScreen();
  });
});
