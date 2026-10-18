import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  colors,
  InlineMessage,
  LoadingState,
  Screen,
  spacing,
  Surface,
  Text,
  TextField,
} from '@/design-system';
import { AuthHeader } from '@/features/auth/AuthHeader';
import { useAuth } from '@/features/auth/AuthProvider';
import { useResendCooldown } from '@/features/auth/useResendCooldown';
import { validateEmail } from '@/features/auth/validation';
import { errorMessage, toAppError } from '@/lib/errors';

/** Durée de validité du lien, configurée côté Supabase (« Email OTP Expiration » = 900 s). */
const LINK_VALIDITY_MINUTES = 15;

type Feedback = { tone: 'success' | 'error' | 'info'; message: string } | null;

/**
 * Attente de confirmation de l'adresse e-mail. Accessible après l'inscription, après une connexion
 * refusée pour adresse non confirmée, depuis un lien expiré, ou avec une session non vérifiée.
 */
export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string; sent?: string }>();
  const { status, session, resendConfirmation, refreshVerification, signOut } = useAuth();
  const router = useRouter();
  const knownEmail = session?.user.email ?? (typeof params.email === 'string' ? params.email : '');
  const [typedEmail, setTypedEmail] = useState('');
  const email = knownEmail || typedEmail;
  const cooldown = useResendCooldown(params.sent === '1');
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  if (status === 'loading') return <LoadingState />;
  if (status === 'signed-in') return <Redirect href="/" />;
  const signedIn = status === 'unverified';

  async function resend() {
    const invalid = validateEmail(email);
    if (invalid) {
      setEmailError(invalid);
      return;
    }
    setEmailError(null);
    setFeedback(null);
    setSending(true);
    try {
      await resendConfirmation(email);
      cooldown.start();
      setFeedback({ tone: 'success', message: `Un nouveau lien vient d’être envoyé à ${email.trim()}.` });
    } catch (e) {
      if (toAppError(e).code === 'RATE_LIMITED') cooldown.start();
      setFeedback({ tone: 'error', message: errorMessage(e) });
    } finally {
      setSending(false);
    }
  }

  async function checkVerification() {
    setFeedback(null);
    setChecking(true);
    try {
      const confirmed = await refreshVerification();
      if (confirmed) router.replace('/');
      else
        setFeedback({
          tone: 'info',
          message: 'Votre adresse n’est pas encore validée. Ouvrez le lien reçu, puis réessayez.',
        });
    } catch (e) {
      setFeedback({ tone: 'error', message: errorMessage(e) });
    } finally {
      setChecking(false);
    }
  }

  const resendLabel = cooldown.remaining > 0 ? `Renvoyer l’e-mail (${cooldown.remaining} s)` : 'Renvoyer l’e-mail';

  return (
    <Screen>
      <AuthHeader
        title="Merci de valider votre adresse e-mail"
        subtitle="Une dernière étape avant d’ouvrir vos premiers paquets."
      />
      <Surface tone="explore">
        <View style={styles.explanation}>
          {knownEmail ? (
            <Text>
              Nous avons envoyé un lien de confirmation à <Text variant="bodyStrong">{knownEmail}</Text>.
            </Text>
          ) : (
            <Text>Indiquez l’adresse utilisée lors de l’inscription pour recevoir un nouveau lien.</Text>
          )}
          <Text color={colors.textMuted}>
            Le lien est valable {LINK_VALIDITY_MINUTES} minutes. Ouvrez-le sur cet appareil. S’il a expiré ou si vous ne
            le trouvez pas, vérifiez vos courriers indésirables puis demandez-en un nouveau.
          </Text>
        </View>
      </Surface>

      <View style={styles.actions}>
        {!knownEmail ? (
          <TextField
            label="Adresse e-mail"
            value={typedEmail}
            onChangeText={setTypedEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            error={emailError}
            testID="verify-email-input"
          />
        ) : null}
        {feedback ? <InlineMessage tone={feedback.tone} message={feedback.message} /> : null}
        <Button
          label={resendLabel}
          icon="refresh"
          onPress={resend}
          loading={sending}
          disabled={cooldown.remaining > 0}
          accessibilityHint="Envoie un nouveau lien de confirmation à votre adresse"
          testID="verify-email-resend"
        />
        {signedIn ? (
          <>
            <Button
              label="J’ai validé mon adresse"
              variant="secondary"
              onPress={checkVerification}
              loading={checking}
              testID="verify-email-check"
            />
            <Button label="Se déconnecter" variant="ghost" onPress={() => void signOut()} />
          </>
        ) : (
          <>
            <Button
              label="J’ai validé, me connecter"
              variant="secondary"
              onPress={() => router.replace('/sign-in')}
              testID="verify-email-sign-in"
            />
            <Button label="Utiliser une autre adresse" variant="ghost" onPress={() => router.replace('/sign-up')} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  explanation: { gap: spacing.sm },
  actions: { gap: spacing.md, marginTop: spacing.lg },
});
