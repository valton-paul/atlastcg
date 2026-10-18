import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, ErrorState, LoadingState, Screen, spacing, Surface, Text } from '@/design-system';
import { AuthHeader } from '@/features/auth/AuthHeader';
import { useAuthRedirect } from '@/features/auth/useAuthRedirect';

/** Cible du lien de confirmation d'adresse e-mail (`atlas://auth/callback?code=…`). */
export default function AuthCallbackScreen() {
  const state = useAuthRedirect();
  const router = useRouter();

  if (state.status === 'done') return <Redirect href="/" />;
  if (state.status === 'pending') {
    return (
      <Screen>
        <LoadingState label="Validation de votre compte…" />
      </Screen>
    );
  }
  if (state.status === 'confirmed') {
    return (
      <Screen>
        <AuthHeader title="Adresse confirmée" />
        <Surface tone="explore">
          <Text>Votre adresse e-mail est validée. Connectez-vous pour ouvrir vos premiers paquets.</Text>
        </Surface>
        <Button label="Me connecter" onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }
  return (
    <Screen>
      <ErrorState title="Lien non valide" message={state.message} />
      <View style={styles.actions}>
        {state.expired ? (
          <Button label="Recevoir un nouveau lien" onPress={() => router.replace('/verify-email')} />
        ) : null}
        <Button label="Aller à la connexion" variant="secondary" onPress={() => router.replace('/sign-in')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.md },
});
