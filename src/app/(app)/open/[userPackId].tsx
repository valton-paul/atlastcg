import { useLocalSearchParams } from 'expo-router';

import { OpenPackFlow } from '@/features/packs/OpenPackFlow';

/** Route profonde / onboarding / reprise — l’accueil ouvre en overlay via le même flux. */
export default function OpenPackScreen() {
  const { userPackId, onboarding } = useLocalSearchParams<{ userPackId: string; onboarding?: string }>();
  return <OpenPackFlow userPackId={userPackId} onboarding={!!onboarding} />;
}
