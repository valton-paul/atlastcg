import { useState } from 'react';

import { Button, colors, ConfirmDialog, InlineMessage, Screen, Surface, Text, TextField } from '@/design-system';
import { deleteMyAccount } from '@/features/player/api';
import { errorMessage } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';

const CONFIRMATION = 'SUPPRIMER';

export default function DeleteAccountScreen() {
  const [typed, setTyped] = useState('');
  const [dialog, setDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = typed.trim().toUpperCase() === CONFIRMATION;

  async function remove() {
    setLoading(true);
    setError(null);
    try {
      await deleteMyAccount(CONFIRMATION);
      // Le compte n'existe plus : la session locale est effacée.
      await getSupabase()
        .auth.signOut({ scope: 'local' })
        .catch(() => undefined);
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
      setDialog(false);
    }
  }

  return (
    <Screen back title="Supprimer mon compte">
      <Surface>
        <Text>La suppression est définitive et immédiate. Elle efface :</Text>
        <Text color={colors.textMuted}>• votre profil, votre pseudo et votre code explorateur ;</Text>
        <Text color={colors.textMuted}>
          • votre collection, vos paquets, vos fragments et l’historique de vos ouvertures ;
        </Text>
        <Text color={colors.textMuted}>• vos expéditions, objectifs, amitiés et participations aux défis.</Text>
        <Text color={colors.textMuted}>Les défis que vous avez créés sont supprimés pour tous les participants.</Text>
      </Surface>
      <TextField
        label={`Saisissez « ${CONFIRMATION} » pour confirmer`}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {error ? <InlineMessage tone="error" message={error} /> : null}
      <Button
        label="Supprimer définitivement"
        variant="danger"
        icon="trash"
        disabled={!confirmed}
        onPress={() => setDialog(true)}
      />
      <ConfirmDialog
        visible={dialog}
        title="Dernière confirmation"
        message="Votre compte et toutes vos données seront supprimés. Cette action est irréversible."
        confirmLabel="Supprimer mon compte"
        destructive
        loading={loading}
        onConfirm={remove}
        onCancel={() => setDialog(false)}
      />
    </Screen>
  );
}
