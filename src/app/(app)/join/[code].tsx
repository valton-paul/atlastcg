import { useLocalSearchParams } from 'expo-router';

import { Screen } from '@/design-system';
import { JoinChallengeForm } from '@/features/social/JoinChallengeForm';

/** Cible du lien d'invitation `atlas://join/<code>`. */
export default function JoinFromLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return (
    <Screen back title="Rejoindre un défi">
      <JoinChallengeForm initialCode={code} />
    </Screen>
  );
}
