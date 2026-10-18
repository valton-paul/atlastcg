import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, InlineMessage, Screen, spacing, TextField } from '@/design-system';
import { AuthHeader } from '@/features/auth/AuthHeader';
import { useAuth } from '@/features/auth/AuthProvider';
import { validateEmail } from '@/features/auth/validation';
import { errorMessage } from '@/lib/errors';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    setSubmitted(true);
    setError(null);
    if (validateEmail(email)) return;
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen back>
      <AuthHeader
        title="Mot de passe oublié"
        subtitle="Saisissez votre adresse : si un compte existe, vous recevrez un lien pour choisir un nouveau mot de passe."
      />
      <View style={styles.form}>
        <TextField
          label="Adresse e-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          error={submitted ? validateEmail(email) : null}
        />
        {error ? <InlineMessage tone="error" message={error} /> : null}
        {sent ? (
          <InlineMessage
            tone="success"
            message="Si cette adresse correspond à un compte, un e-mail vient d’être envoyé. Ouvrez le lien depuis ce téléphone."
          />
        ) : null}
        <Button label={sent ? 'Renvoyer le lien' : 'Envoyer le lien'} onPress={submit} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg } });
