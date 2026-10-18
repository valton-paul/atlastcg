import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import {
  Button,
  colors,
  ConfirmDialog,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  MIN_TOUCH,
  ProgressBar,
  radius,
  Screen,
  SectionHeader,
  spacing,
  Surface,
  Text,
} from '@/design-system';
import { CONTINENT_LABELS } from '@/features/catalog/types';
import {
  CHALLENGE_TYPE_LABELS,
  useChallenge,
  useRevokeChallengeLink,
  useSubmitChallenge,
  type AnswerDetail,
  type Challenge,
} from '@/features/social/api';
import { errorMessage } from '@/lib/errors';
import { useHaptics } from '@/lib/haptics';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challenge = useChallenge(id ?? '');

  if (challenge.isPending) return <LoadingState />;
  if (challenge.isError) {
    return (
      <Screen back title="Défi">
        <ErrorState message={errorMessage(challenge.error)} onRetry={() => void challenge.refetch()} />
      </Screen>
    );
  }
  const c = challenge.data;
  const title = `${CHALLENGE_TYPE_LABELS[c.challenge_type]}${c.continent ? ` · ${CONTINENT_LABELS[c.continent]}` : ''}`;

  return (
    <Screen
      back
      title={title}
      subtitle={`Défi de ${c.is_creator ? 'vous' : c.creator_name} · ${c.expired ? 'terminé' : `jusqu’au ${dateFormatter.format(new Date(c.expires_at))}`}`}
      refreshing={challenge.isRefetching}
      onRefresh={() => void challenge.refetch()}
    >
      {c.my_result ? (
        <Results challenge={c} details={c.my_result.details} score={c.my_result.score} />
      ) : c.expired ? (
        <InlineMessage message="Ce défi est terminé. Il n’est plus possible d’y répondre." />
      ) : (
        <Play challenge={c} />
      )}
      <Participants challenge={c} />
      {c.is_creator ? <InvitePanel challenge={c} /> : null}
    </Screen>
  );
}

function Play({ challenge }: { challenge: Challenge }) {
  const submit = useSubmitChallenge();
  const haptic = useHaptics();
  const questions = challenge.questions ?? [];
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [index, setIndex] = useState(0);
  const question = questions[index];
  if (!question) return null;
  const chosen = answers[index];
  const last = index === questions.length - 1;

  return (
    <Surface tone="raised" testID="challenge-question">
      <ProgressBar label="Question" value={index + 1} total={questions.length} />
      <Text variant="heading">{question.prompt}</Text>
      <View style={styles.choices} accessibilityRole="radiogroup">
        {question.choices.map((choice, i) => (
          <Pressable
            key={`${question.position}-${choice}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: chosen === i }}
            onPress={() => {
              haptic('tap');
              setAnswers((list) => list.map((a, j) => (j === index ? i : a)));
            }}
            style={({ pressed }) => [styles.choice, chosen === i && styles.choiceSelected, pressed && styles.pressed]}
          >
            <Text style={styles.flex}>{choice}</Text>
            {chosen === i ? <Icon name="check" size={18} color={colors.turquoise} /> : null}
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        {index > 0 ? <Button label="Précédente" variant="ghost" compact onPress={() => setIndex(index - 1)} /> : null}
        <View style={styles.flex} />
        {last ? (
          <Button
            label="Valider mes réponses"
            compact
            disabled={answers.some((a) => a === null)}
            loading={submit.isPending}
            onPress={() =>
              submit.mutate({ id: challenge.challenge_id, answers }, { onSuccess: () => haptic('success') })
            }
          />
        ) : (
          <Button label="Suivante" compact disabled={chosen === null} onPress={() => setIndex(index + 1)} />
        )}
      </View>
      {submit.isError ? <InlineMessage tone="error" message={errorMessage(submit.error)} /> : null}
    </Surface>
  );
}

function Results({ challenge, details, score }: { challenge: Challenge; details: AnswerDetail[]; score: number }) {
  const questions = new Map((challenge.questions ?? []).map((q) => [q.position, q]));
  return (
    <>
      <Surface tone="precious">
        <Text variant="title" align="center">
          {score} / {challenge.question_count}
        </Text>
        <Text color={colors.textMuted} align="center">
          {score === challenge.question_count ? 'Sans faute !' : 'Chaque réponse est l’occasion d’apprendre.'}
        </Text>
      </Surface>
      {details.map((d) => {
        const q = questions.get(d.position);
        const right = d.chosen === d.correct_choice;
        return (
          <Surface key={d.position}>
            <View style={styles.row}>
              <Icon name={right ? 'check' : 'close'} size={18} color={right ? colors.success : colors.danger} />
              <Text variant="bodyStrong" style={styles.flex}>
                {q?.prompt}
              </Text>
            </View>
            {!right && q && d.chosen !== null ? (
              <Text variant="caption" color={colors.textMuted}>
                Votre réponse : {q.choices[d.chosen]}
              </Text>
            ) : null}
            <Text variant="caption">{d.explanation}</Text>
          </Surface>
        );
      })}
    </>
  );
}

function Participants({ challenge }: { challenge: Challenge }) {
  return (
    <>
      <SectionHeader title="Participants" />
      <Surface>
        {challenge.participants.map((p, i) => (
          <View key={`${p.display_name}-${i}`} style={styles.row}>
            <Text style={styles.flex} variant={p.is_me ? 'bodyStrong' : 'body'}>
              {p.display_name}
              {p.is_me ? ' (vous)' : ''}
            </Text>
            <Text variant="caption" color={colors.textMuted}>
              {p.score !== null ? `${p.score} / ${challenge.question_count}` : p.completed ? 'Terminé' : 'En attente'}
            </Text>
          </View>
        ))}
        {!challenge.my_result ? (
          <Text variant="caption" color={colors.textFaint}>
            Les scores des autres participants s’affichent une fois votre défi terminé.
          </Text>
        ) : null}
      </Surface>
    </>
  );
}

function InvitePanel({ challenge }: { challenge: Challenge }) {
  const revoke = useRevokeChallengeLink();
  const [confirm, setConfirm] = useState(false);
  if (challenge.expired) return null;
  if (!challenge.invite_code) {
    return <InlineMessage message="Le lien d’invitation de ce défi a été désactivé." />;
  }
  const url = Linking.createURL(`join/${challenge.invite_code}`);
  return (
    <>
      <SectionHeader title="Invitation" />
      <Surface>
        <Text variant="caption" color={colors.textMuted}>
          Code d’invitation
        </Text>
        <Text variant="title" color={colors.turquoise} selectable>
          {challenge.invite_code}
        </Text>
        <Button
          label="Partager l’invitation"
          icon="share"
          compact
          variant="secondary"
          onPress={() =>
            Share.share({
              message: `Relève mon défi Atlas ! Code : ${challenge.invite_code} (ou ouvre ${url} si l’application est installée).`,
            }).catch(() => undefined)
          }
        />
        <Button label="Désactiver le lien" icon="link" compact variant="ghost" onPress={() => setConfirm(true)} />
        {revoke.isError ? <InlineMessage tone="error" message={errorMessage(revoke.error)} /> : null}
      </Surface>
      <ConfirmDialog
        visible={confirm}
        title="Désactiver le lien ?"
        message="Plus personne ne pourra rejoindre ce défi avec ce code. Les participants actuels pourront toujours jouer."
        confirmLabel="Désactiver"
        destructive
        loading={revoke.isPending}
        onConfirm={() => revoke.mutate(challenge.challenge_id, { onSettled: () => setConfirm(false) })}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  choices: { gap: spacing.sm },
  choice: {
    minHeight: MIN_TOUCH + 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ink,
    gap: spacing.sm,
  },
  choiceSelected: { borderColor: colors.turquoise, backgroundColor: colors.turquoiseSoft },
  pressed: { opacity: 0.75 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
