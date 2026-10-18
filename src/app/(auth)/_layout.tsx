import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/design-system';
import { useAuth } from '@/features/auth/AuthProvider';
import { NotConfiguredScreen } from '@/features/auth/NotConfiguredScreen';

export default function AuthLayout() {
  const { status } = useAuth();
  if (status === 'unconfigured') return <NotConfiguredScreen />;
  if (status === 'loading') return <LoadingState />;
  if (status === 'signed-in') return <Redirect href="/" />;
  if (status === 'unverified') return <Redirect href="/verify-email" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
