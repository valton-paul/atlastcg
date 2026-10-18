import { Redirect, Stack, useSegments } from 'expo-router';

import { Button, colors, ErrorState, LoadingState, Screen } from '@/design-system';
import { useAuth } from '@/features/auth/AuthProvider';
import { NotConfiguredScreen } from '@/features/auth/NotConfiguredScreen';
import { usePlayerState } from '@/features/player/api';
import { errorMessage } from '@/lib/errors';

export default function AppLayout() {
  const { status, userId, passwordRecovery, signOut } = useAuth();
  const player = usePlayerState(status === 'signed-in' ? userId : null);
  const segments = useSegments();

  if (status === 'unconfigured') return <NotConfiguredScreen />;
  if (status === 'loading') return <LoadingState />;
  if (status === 'signed-out') return <Redirect href="/sign-in" />;
  if (status === 'unverified') return <Redirect href="/verify-email" />;
  if (passwordRecovery) return <Redirect href="/reset-password" />;

  if (player.isPending) {
    return (
      <Screen>
        <LoadingState label="Ouverture de votre atlas…" />
      </Screen>
    );
  }
  if (player.isError) {
    return (
      <Screen>
        <ErrorState message={errorMessage(player.error)} onRetry={() => void player.refetch()} />
        <Button label="Se déconnecter" variant="ghost" onPress={() => void signOut()} />
      </Screen>
    );
  }

  const onWelcome = (segments as string[]).includes('welcome');
  const inOpening = (segments as string[]).includes('open');
  if (!player.data.profile.onboarding_completed_at && !onWelcome && !inOpening) {
    return <Redirect href="/welcome" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="open/[userPackId]" options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
