import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, colors, InlineMessage, Screen, spacing, Text, TextField } from '@/design-system';
import { AuthHeader } from '@/features/auth/AuthHeader';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  validateDisplayName,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from '@/features/auth/validation';
import { errorMessage } from '@/lib/errors';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errors = {
    displayName: validateDisplayName(displayName),
    email: validateEmail(email),
    password: validatePassword(password),
    confirmation: validatePasswordConfirmation(password, confirmation),
  };
  const hasErrors = Object.values(errors).some(Boolean);

  async function submit() {
    setSubmitted(true);
    setError(null);
    if (hasErrors) return;
    setLoading(true);
    try {
      const result = await signUp(email, password, displayName);
      if (result.needsEmailConfirmation) {
        router.replace({ pathname: '/verify-email', params: { email: email.trim(), sent: '1' } });
      } else router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen back>
      <AuthHeader
        title="Commencez votre atlas"
        subtitle="Créez votre compte pour recevoir vos deux premiers paquets et découvrir vos premières cartes."
      />
      <View style={styles.form}>
        <TextField
          label="Pseudo"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoComplete="username"
          maxLength={24}
          hint="Visible par vos amis. 3 à 24 caractères."
          error={submitted ? errors.displayName : null}
          testID="sign-up-name"
        />
        <TextField
          label="Adresse e-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          error={submitted ? errors.email : null}
          testID="sign-up-email"
        />
        <TextField
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          hint="Au moins 8 caractères, dont une lettre et un chiffre."
          error={submitted ? errors.password : null}
          testID="sign-up-password"
        />
        <TextField
          label="Confirmer le mot de passe"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          autoComplete="new-password"
          error={submitted ? errors.confirmation : null}
          testID="sign-up-confirmation"
        />
        {error ? <InlineMessage tone="error" message={error} /> : null}
        <Button label="Créer mon compte" onPress={submit} loading={loading} testID="sign-up-submit" />
        <Text variant="caption" color={colors.textMuted} align="center">
          En créant un compte, vous acceptez les conditions d’utilisation et la politique de confidentialité.
        </Text>
        <Button
          label="Lire les mentions et la confidentialité"
          variant="ghost"
          compact
          onPress={() => router.push('/legal')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
});
