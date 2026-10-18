import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, colors, InlineMessage, Screen, spacing, Text, TextField, type TextFieldHandle } from '@/design-system';
import { AuthHeader } from '@/features/auth/AuthHeader';
import { useAuth } from '@/features/auth/AuthProvider';
import { validateEmail } from '@/features/auth/validation';
import { errorMessage, toAppError } from '@/lib/errors';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const passwordRef = useRef<TextFieldHandle>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = submitted ? validateEmail(email) : null;
  const passwordError = submitted && !password ? 'Saisissez votre mot de passe.' : null;

  async function submit() {
    setSubmitted(true);
    setError(null);
    if (validateEmail(email) || !password) return;
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/');
    } catch (e) {
      if (toAppError(e).code === 'EMAIL_NOT_CONFIRMED') {
        router.replace({ pathname: '/verify-email', params: { email: email.trim() } });
        return;
      }
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AuthHeader
        title="Bon retour, explorateur"
        subtitle="Retrouvez votre atlas et vos cartes là où vous les avez laissés."
      />
      <View style={styles.form}>
        <TextField
          label="Adresse e-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          error={emailError}
          testID="sign-in-email"
        />
        <TextField
          ref={passwordRef}
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={passwordError}
          testID="sign-in-password"
        />
        {error ? <InlineMessage tone="error" message={error} /> : null}
        <Button label="Se connecter" onPress={submit} loading={loading} testID="sign-in-submit" />
        <Button label="Mot de passe oublié ?" variant="ghost" onPress={() => router.push('/forgot-password')} />
      </View>
      <View style={styles.footer}>
        <Text color={colors.textMuted} align="center">
          Nouveau sur Atlas TCG ?
        </Text>
        <Button label="Créer un compte" variant="secondary" onPress={() => router.push('/sign-up')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  footer: { gap: spacing.sm, marginTop: spacing.xl },
});
