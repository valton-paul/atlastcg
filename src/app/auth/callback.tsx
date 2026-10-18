import { Redirect, useRouter } from 'expo-router';

import { Button, ErrorState, LoadingState, Screen } from '@/design-system';
import { useAuthRedirect } from '@/features/auth/useAuthRedirect';

/** Cible du lien de confirmation d'adresse e-mail (`atlas://auth/callback?code=…`). */
export default function AuthCallbackScreen() {
  const state = useAuthRedirect();
  const router = useRouter();
  if (state.status === 'done') return <Redirect href="/" />;
  return (
    <Screen>
      {state.status === 'pending' ? (
        <LoadingState label="Validation de votre compte…" />
      ) : (
        <>
          <ErrorState title="Lien non valide" message={state.message} />
          <Button label="Aller à la connexion" onPress={() => router.replace('/sign-in')} />
        </>
      )}
    </Screen>
  );
}
