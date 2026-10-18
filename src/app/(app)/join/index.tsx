import { Screen } from '@/design-system';
import { JoinChallengeForm } from '@/features/social/JoinChallengeForm';

export default function JoinScreen() {
  return (
    <Screen back title="Rejoindre un défi">
      <JoinChallengeForm />
    </Screen>
  );
}
