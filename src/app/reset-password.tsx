import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, ErrorState, InlineMessage, LoadingState, Screen, spacing, TextField } from '@/design-system';
import { AuthHeader } from '@/features/auth/AuthHeader';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAuthRedirect } from '@/features/auth/useAuthRedirect';
import { validatePassword, validatePasswordConfirmation } from '@/features/auth/validation';
import { errorMessage } from '@/lib/errors';

/** Cible du lien de réinitialisation (`atlas://reset-password?code=…`). */
export default function ResetPasswordScreen() {
  const redirect = useAuthRedirect();
  const { updatePassword } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (redirect.status === 'pending') {
    return (
      <Screen>
        <LoadingState label="Vérification du lien…" />
      </Screen>
    );
  }
  if (redirect.status === 'error') {
    return (
      <Screen>
        <ErrorState title="Lien expiré ou déjà utilisé" message={redirect.message} />
        <Button label="Demander un nouveau lien" onPress={() => router.replace('/forgot-password')} />
      </Screen>
    );
  }

  const passwordError = validatePassword(password);
  const confirmationError = validatePasswordConfirmation(password, confirmation);

  async function submit() {
    setSubmitted(true);
    setError(null);
    if (passwordError || confirmationError) return;
    setLoading(true);
    try {
      await updatePassword(password);
      router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AuthHeader
        title="Nouveau mot de passe"
        subtitle="Choisissez un mot de passe que vous n’utilisez pas ailleurs."
      />
      <View style={styles.form}>
        <TextField
          label="Nouveau mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          error={submitted ? passwordError : null}
        />
        <TextField
          label="Confirmer le mot de passe"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          autoComplete="new-password"
          error={submitted ? confirmationError : null}
        />
        {error ? <InlineMessage tone="error" message={error} /> : null}
        <Button label="Enregistrer" onPress={submit} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg } });
