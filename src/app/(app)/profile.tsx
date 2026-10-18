import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import {
  Button,
  Chip,
  colors,
  ErrorState,
  InlineMessage,
  LoadingState,
  Screen,
  SectionHeader,
  spacing,
  Surface,
  Text,
  TextField,
} from '@/design-system';
import { useAuth } from '@/features/auth/AuthProvider';
import { normalizeDisplayName, validateDisplayName } from '@/features/auth/validation';
import { atlasStats } from '@/features/collection/progress';
import { useUpdateProfile } from '@/features/player/api';
import { useAtlasData } from '@/features/player/useAtlasData';
import { errorMessage } from '@/lib/errors';

export default function ProfileScreen() {
  const data = useAtlasData();
  const router = useRouter();
  const { signOut, userId, session } = useAuth();
  const update = useUpdateProfile(userId);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState message={errorMessage(data.error)} onRetry={data.retry} />;

  const { catalog, player } = data;
  const { profile } = player;
  const stats = atlasStats(catalog, player.ownedCards, player.expeditions);
  const nameError = editing ? validateDisplayName(name) : null;

  const saveName = () => {
    if (validateDisplayName(name)) return;
    update.mutate({ display_name: normalizeDisplayName(name) }, { onSuccess: () => setEditing(false) });
  };

  return (
    <Screen back title="Profil">
      <Surface tone="raised">
        <Text variant="overline" color={colors.gold}>
          Explorateur
        </Text>
        {editing ? (
          <>
            <TextField label="Pseudo" value={name} onChangeText={setName} maxLength={24} error={nameError} autoFocus />
            <View style={styles.row}>
              <Button
                label="Enregistrer"
                compact
                onPress={saveName}
                loading={update.isPending}
                disabled={!!nameError}
              />
              <Button label="Annuler" compact variant="ghost" onPress={() => setEditing(false)} />
            </View>
          </>
        ) : (
          <>
            <Text variant="title">{profile.display_name}</Text>
            <Text variant="caption" color={colors.textMuted}>
              {session?.user.email}
            </Text>
            <Button
              label="Modifier le pseudo"
              compact
              variant="ghost"
              onPress={() => {
                setName(profile.display_name);
                setEditing(true);
              }}
            />
          </>
        )}
        {update.isError ? <InlineMessage tone="error" message={errorMessage(update.error)} /> : null}
      </Surface>

      <Surface>
        <Text variant="bodyStrong">Code explorateur</Text>
        <Text
          variant="title"
          color={colors.turquoise}
          selectable
          accessibilityLabel={`Code ${profile.public_code.split('').join(' ')}`}
        >
          {profile.public_code}
        </Text>
        <Text variant="caption" color={colors.textMuted}>
          Partagez ce code pour que vos amis puissent vous ajouter. Il ne révèle ni votre e-mail ni votre identifiant.
        </Text>
        <Button
          label="Partager mon code"
          icon="share"
          compact
          variant="secondary"
          onPress={() =>
            Share.share({ message: `Ajoute-moi sur Atlas avec mon code explorateur : ${profile.public_code}` }).catch(
              () => undefined,
            )
          }
        />
      </Surface>

      <SectionHeader title="Confidentialité" />
      <Surface>
        <Text variant="bodyStrong">Qui peut voir ma progression ?</Text>
        <View style={styles.row}>
          <Chip
            label="Mes amis"
            selected={profile.collection_visibility === 'friends'}
            onPress={() => update.mutate({ collection_visibility: 'friends' })}
          />
          <Chip
            label="Personne"
            selected={profile.collection_visibility === 'private'}
            onPress={() => update.mutate({ collection_visibility: 'private' })}
          />
        </View>
        <Text variant="caption" color={colors.textMuted}>
          {profile.collection_visibility === 'friends'
            ? 'Vos amis voient vos statistiques de collection (nombre de cartes, pays et expéditions).'
            : 'Vos amis voient uniquement votre pseudo.'}
        </Text>
      </Surface>

      <SectionHeader title="Statistiques" />
      <Surface>
        <Stat label="Cartes" value={`${stats.cardsOwned} / ${stats.cardsTotal}`} />
        <Stat label="Pays découverts" value={`${stats.countriesDiscovered} / ${stats.countriesTotal}`} />
        <Stat label="Continents" value={`${stats.continentsDiscovered} / 6`} />
        <Stat label="Expéditions terminées" value={String(stats.expeditionsCompleted)} />
        <Stat label="Fragments" value={String(player.fragments)} />
      </Surface>

      <View style={styles.actions}>
        <Button label="Objectifs" icon="trophy" variant="secondary" onPress={() => router.push('/objectives')} />
        <Button label="Paramètres" icon="settings" variant="secondary" onPress={() => router.push('/settings')} />
        <Button label="Mentions et confidentialité" icon="info" variant="ghost" onPress={() => router.push('/legal')} />
        {signOutError ? <InlineMessage tone="error" message={signOutError} /> : null}
        <Button
          label="Se déconnecter"
          icon="logout"
          variant="ghost"
          loading={signingOut}
          onPress={async () => {
            setSigningOut(true);
            setSignOutError(null);
            try {
              await signOut();
            } catch (e) {
              setSignOutError(errorMessage(e));
              setSigningOut(false);
            }
          }}
          testID="sign-out"
        />
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text color={colors.textMuted}>{label}</Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  stat: { flexDirection: 'row', justifyContent: 'space-between' },
  actions: { gap: spacing.sm },
});
