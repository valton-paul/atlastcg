import { useRouter } from 'expo-router';

import { Button, EmptyState, Screen } from '@/design-system';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen>
      <EmptyState icon="compass" title="Page introuvable" message="Ce lien ne mène nulle part dans Atlas TCG." />
      <Button label="Retour à l’accueil" onPress={() => router.replace('/')} />
    </Screen>
  );
}
