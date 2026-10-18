import { Screen } from '@/design-system/components/Screen';
import { ErrorState } from '@/design-system/components/States';

/** Affiché si l'application a été construite sans configuration Supabase publique. */
export function NotConfiguredScreen() {
  return (
    <Screen>
      <ErrorState
        title="Configuration manquante"
        message="Atlas n’est pas relié à son serveur. Renseignez SUPABASE_URL et SUPABASE_PUBLIC_KEY dans le fichier .env (voir README), puis relancez l’application."
      />
    </Screen>
  );
}
