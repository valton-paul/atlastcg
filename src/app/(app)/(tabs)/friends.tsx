import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';

import {
  Button,
  colors,
  ConfirmDialog,
  ErrorState,
  InlineMessage,
  LoadingState,
  SectionHeader,
  spacing,
  Surface,
  Text,
  TextField,
} from '@/design-system';
import { CONTINENT_LABELS } from '@/features/catalog/types';
import { PlayerHeader } from '@/features/player/PlayerHeader';
import { useAtlasData } from '@/features/player/useAtlasData';
import {
  CHALLENGE_TYPE_LABELS,
  isValidCode,
  useChallenges,
  useFriends,
  useRemoveFriend,
  useRespondFriendRequest,
  useSendFriendRequest,
  type Person,
} from '@/features/social/api';
import { errorMessage } from '@/lib/errors';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

export default function FriendsScreen() {
  const data = useAtlasData();
  const router = useRouter();
  const friends = useFriends();
  const challenges = useChallenges();
  const send = useSendFriendRequest();
  const respond = useRespondFriendRequest();
  const remove = useRemoveFriend();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<Person | null>(null);

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState message={errorMessage(data.error)} onRetry={data.retry} />;
  const { player } = data;

  const submitCode = () => {
    setCodeError(null);
    if (!isValidCode(code)) {
      setCodeError('Un code explorateur contient 8 lettres et chiffres.');
      return;
    }
    send.mutate(code, { onSuccess: () => setCode('') });
  };

  const refreshing = friends.isRefetching || challenges.isRefetching;

  return (
    <View style={styles.root}>
      <PlayerHeader title="Amis" fragments={player.fragments} packCount={player.packs.length} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void friends.refetch();
              void challenges.refetch();
            }}
            tintColor={colors.turquoise}
          />
        }
      >
        <Surface>
          <Text variant="caption" color={colors.textMuted}>
            Votre code explorateur
          </Text>
          <View style={styles.row}>
            <Text variant="title" color={colors.turquoise} style={styles.flex} selectable>
              {player.profile.public_code}
            </Text>
            <Button
              label="Partager"
              icon="share"
              compact
              variant="secondary"
              onPress={() =>
                Share.share({
                  message: `Ajoute-moi sur Atlas TCG avec mon code explorateur : ${player.profile.public_code}`,
                }).catch(() => undefined)
              }
            />
          </View>
        </Surface>

        <SectionHeader title="Ajouter un ami" />
        <TextField
          label="Code explorateur de votre ami"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          error={codeError}
          onSubmitEditing={submitCode}
          testID="friend-code"
        />
        <Button label="Envoyer la demande" compact onPress={submitCode} loading={send.isPending} />
        {send.isError ? <InlineMessage tone="error" message={errorMessage(send.error)} /> : null}
        {send.isSuccess ? (
          <InlineMessage
            tone="success"
            message={send.data.status === 'accepted' ? 'Vous êtes maintenant amis.' : 'Demande envoyée.'}
          />
        ) : null}

        {friends.isPending ? (
          <LoadingState label="Chargement de vos amis…" />
        ) : friends.isError ? (
          <ErrorState message={errorMessage(friends.error)} onRetry={() => void friends.refetch()} />
        ) : (
          <>
            {friends.data.incoming.length > 0 ? (
              <>
                <SectionHeader title="Demandes reçues" />
                {friends.data.incoming.map((person) => (
                  <Surface key={person.friendship_id} style={styles.row}>
                    <Text variant="bodyStrong" style={styles.flex}>
                      {person.display_name}
                    </Text>
                    <Button
                      label="Accepter"
                      compact
                      disabled={respond.isPending}
                      onPress={() => respond.mutate({ id: person.friendship_id, accept: true })}
                    />
                    <Button
                      label="Refuser"
                      compact
                      variant="ghost"
                      disabled={respond.isPending}
                      onPress={() => respond.mutate({ id: person.friendship_id, accept: false })}
                    />
                  </Surface>
                ))}
              </>
            ) : null}
            {respond.isError ? <InlineMessage tone="error" message={errorMessage(respond.error)} /> : null}

            <SectionHeader title={`Mes amis (${friends.data.friends.length})`} />
            {friends.data.friends.length === 0 ? (
              <Text color={colors.textMuted}>
                Partagez votre code ou saisissez celui d’un ami pour comparer vos atlas et vous lancer des défis.
              </Text>
            ) : (
              friends.data.friends.map((person) => (
                <Surface
                  key={person.friendship_id}
                  onPress={() => router.push(`/compare/${person.public_code}`)}
                  accessibilityLabel={`${person.display_name}, comparer nos collections`}
                  style={styles.row}
                >
                  <Text variant="bodyStrong" style={styles.flex}>
                    {person.display_name}
                  </Text>
                  <Button label="Retirer" compact variant="ghost" onPress={() => setToRemove(person)} />
                </Surface>
              ))
            )}
            {friends.data.outgoing.length > 0 ? (
              <Text variant="caption" color={colors.textMuted}>
                En attente : {friends.data.outgoing.map((p) => p.display_name).join(', ')}
              </Text>
            ) : null}
          </>
        )}

        <SectionHeader title="Défis" actionLabel="Nouveau défi" onAction={() => router.push('/challenge/new')} />
        <Text variant="caption" color={colors.textMuted}>
          Cinq questions de géographie à jouer quand vous voulez, pendant 7 jours. Sans récompense ni classement public.
        </Text>
        <Button label="Rejoindre avec un code" variant="secondary" compact onPress={() => router.push('/join')} />
        {challenges.isPending ? null : challenges.isError ? (
          <ErrorState message={errorMessage(challenges.error)} onRetry={() => void challenges.refetch()} />
        ) : challenges.data.length === 0 ? (
          <Text color={colors.textMuted}>Aucun défi pour le moment.</Text>
        ) : (
          challenges.data.map((challenge) => (
            <Surface key={challenge.challenge_id} onPress={() => router.push(`/challenge/${challenge.challenge_id}`)}>
              <Text variant="bodyStrong">
                {CHALLENGE_TYPE_LABELS[challenge.challenge_type]}
                {challenge.continent ? ` · ${CONTINENT_LABELS[challenge.continent]}` : ''}
              </Text>
              <Text variant="caption" color={colors.textMuted}>
                {challenge.is_creator ? 'Créé par vous' : `Par ${challenge.creator_name}`} ·{' '}
                {challenge.participant_count} participant
                {challenge.participant_count > 1 ? 's' : ''} ·{' '}
                {challenge.expired ? 'terminé' : `jusqu’au ${dateFormatter.format(new Date(challenge.expires_at))}`}
              </Text>
              <Text variant="caption" color={challenge.completed ? colors.turquoise : colors.gold}>
                {challenge.completed
                  ? `Votre score : ${challenge.my_score} / ${challenge.question_count}`
                  : challenge.expired
                    ? 'Non joué'
                    : 'À jouer'}
              </Text>
            </Surface>
          ))
        )}
      </ScrollView>
      <ConfirmDialog
        visible={!!toRemove}
        title="Retirer cet ami ?"
        message={`${toRemove?.display_name ?? ''} ne pourra plus comparer sa collection avec la vôtre.`}
        confirmLabel="Retirer"
        destructive
        loading={remove.isPending}
        onConfirm={() => toRemove && remove.mutate(toRemove.friendship_id, { onSettled: () => setToRemove(null) })}
        onCancel={() => setToRemove(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
