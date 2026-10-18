import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  colors,
  EmptyState,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  MIN_TOUCH,
  ProgressBar,
  radius,
  Screen,
  spacing,
  Surface,
  Text,
} from '@/design-system';
import { countryProgress } from '@/features/collection/progress';
import {
  useCompleteExpedition,
  useExpeditionSteps,
  useStartExpedition,
  useSubmitStep,
  type ExpeditionStep,
  type StepAnswer,
} from '@/features/expeditions/api';
import { useInvalidatePlayer } from '@/features/player/api';
import { useAtlasData } from '@/features/player/useAtlasData';
import { errorMessage } from '@/lib/errors';
import { useHaptics } from '@/lib/haptics';

const KIND_LABELS = { locate: 'Repérage', discover: 'Découverte', quiz: 'Question' } as const;

export default function ExpeditionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const data = useAtlasData();
  const router = useRouter();
  const expedition = data.status === 'ready' ? data.catalog.expeditions.find((e) => e.slug === slug) : undefined;
  const userExpedition = expedition && data.status === 'ready' ? data.player.expeditions.get(expedition.id) : undefined;
  const steps = useExpeditionSteps(expedition?.id ?? null, !!userExpedition);
  const start = useStartExpedition();
  const complete = useCompleteExpedition();
  const haptic = useHaptics();

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState message={errorMessage(data.error)} onRetry={data.retry} />;
  if (!expedition) {
    return (
      <Screen back title="Expédition">
        <EmptyState icon="compass" title="Expédition introuvable" message="Cette expédition n’est pas disponible." />
      </Screen>
    );
  }

  const { catalog } = data;
  const country = catalog.countriesByIso.get(expedition.country_code);
  const rewardPack = catalog.packsById.get(expedition.reward_pack_id);
  const unlocked = countryProgress(catalog, data.player.ownedCards, expedition.country_code).owned > 0;
  const rewardLabel =
    `${expedition.reward_pack_quantity} paquet${expedition.reward_pack_quantity > 1 ? 's' : ''} ${rewardPack?.name ?? ''}`.trim();

  if (!userExpedition) {
    return (
      <Screen back title={expedition.title} subtitle={country?.name}>
        <Surface tone="explore">
          <Text>{expedition.summary}</Text>
          <Text variant="caption" color={colors.textMuted}>
            Trois étapes courtes, sans limite de temps. Une erreur n’est jamais pénalisée : vous pouvez réessayer.
          </Text>
          <Text variant="caption" color={colors.gold}>
            Récompense : {rewardLabel}
          </Text>
        </Surface>
        {unlocked ? (
          <Button
            label="Commencer l’expédition"
            icon="compass"
            loading={start.isPending}
            onPress={() => start.mutate(expedition.id, { onSuccess: () => haptic('success') })}
            testID="start-expedition"
          />
        ) : (
          <InlineMessage
            message={`Obtenez une carte ${country ? `de ${country.name_with_article}` : 'de ce pays'} pour débloquer cette expédition.`}
          />
        )}
        {start.isError ? <InlineMessage tone="error" message={errorMessage(start.error)} /> : null}
      </Screen>
    );
  }

  if (steps.isPending) return <LoadingState label="Préparation de l’expédition…" />;
  if (steps.isError) return <ErrorState message={errorMessage(steps.error)} onRetry={() => void steps.refetch()} />;

  const list = steps.data.steps;
  const done = list.filter((s) => steps.data.progress.get(s.id)?.completed_at).length;
  const currentStep = list.find((s) => !steps.data.progress.get(s.id)?.completed_at);
  const completed = userExpedition.status === 'completed';

  return (
    <Screen back title={expedition.title} subtitle={country?.name}>
      <ProgressBar label="Étapes terminées" value={done} total={list.length} />
      <View style={styles.timeline}>
        {list.map((step) => {
          const stepDone = !!steps.data.progress.get(step.id)?.completed_at;
          const isCurrent = currentStep?.id === step.id;
          return (
            <View
              key={step.id}
              style={styles.timelineRow}
              accessible
              accessibilityLabel={`Étape ${step.position} : ${step.title}, ${stepDone ? 'terminée' : isCurrent ? 'en cours' : 'à venir'}`}
            >
              <View style={[styles.dot, stepDone && styles.dotDone, isCurrent && styles.dotCurrent]}>
                {stepDone ? (
                  <Icon name="check" size={14} color={colors.nightDeep} />
                ) : (
                  <Text variant="overline">{step.position}</Text>
                )}
              </View>
              <Text
                variant="caption"
                color={stepDone || isCurrent ? colors.text : colors.textMuted}
                style={styles.flex}
              >
                {KIND_LABELS[step.kind]} · {step.title}
              </Text>
            </View>
          );
        })}
      </View>

      {completed ? (
        <Surface tone="precious">
          <Text variant="heading">Expédition terminée</Text>
          <Text color={colors.textMuted}>Vous avez exploré {country?.name_with_article ?? 'ce pays'}. Bravo !</Text>
          <Button
            label="Voir le pays"
            variant="secondary"
            compact
            onPress={() => router.replace(`/country/${expedition.country_code}`)}
          />
        </Surface>
      ) : currentStep ? (
        <StepCard key={currentStep.id} step={currentStep} />
      ) : (
        <Surface tone="precious">
          <Text variant="heading">Toutes les étapes sont terminées</Text>
          <Text color={colors.textMuted}>Validez l’expédition pour recevoir : {rewardLabel}.</Text>
          <Button
            label="Terminer et recevoir la récompense"
            variant="precious"
            loading={complete.isPending}
            onPress={() =>
              complete.mutate(expedition.id, {
                onSuccess: (r) => {
                  haptic('success');
                  if (r.packs_granted > 0) {
                    AccessibilityInfo.announceForAccessibility(`Récompense reçue : ${rewardLabel}`);
                  }
                },
              })
            }
            testID="complete-expedition"
          />
          {complete.isError ? <InlineMessage tone="error" message={errorMessage(complete.error)} /> : null}
        </Surface>
      )}
      {complete.isSuccess && complete.data.packs_granted > 0 ? (
        <>
          <InlineMessage tone="success" message={`Récompense ajoutée à votre inventaire : ${rewardLabel}.`} />
          <Button label="Ouvrir mes paquets" icon="pack" onPress={() => router.push('/packs')} />
        </>
      ) : null}
    </Screen>
  );
}

function StepCard({ step }: { step: ExpeditionStep }) {
  const submit = useSubmitStep();
  const invalidate = useInvalidatePlayer();
  const haptic = useHaptics();
  const [choice, setChoice] = useState<number | null>(null);
  const [answer, setAnswer] = useState<StepAnswer | null>(null);

  const send = (value: number | null) => {
    setChoice(value);
    submit.mutate(
      { stepId: step.id, choice: value },
      {
        onSuccess: (result) => {
          setAnswer(result);
          haptic(result.correct ? 'success' : 'error');
          AccessibilityInfo.announceForAccessibility(
            result.correct ? 'Bonne réponse.' : 'Ce n’est pas la bonne réponse.',
          );
        },
      },
    );
  };

  const wrong = answer && !answer.correct;

  if (answer?.correct) {
    return (
      <Surface tone="explore" testID="expedition-step">
        <Text variant="overline" color={colors.turquoise}>
          Étape {step.position} · {KIND_LABELS[step.kind]}
        </Text>
        <View style={styles.timelineRow}>
          <Icon name="check" color={colors.success} />
          <Text variant="heading" style={styles.flex}>
            {step.kind === 'discover' ? 'Découverte notée' : 'Bonne réponse !'}
          </Text>
        </View>
        <Text>{answer.explanation}</Text>
        <Button label="Continuer" onPress={() => void invalidate()} testID="expedition-continue" />
      </Surface>
    );
  }

  return (
    <Surface tone="raised" testID="expedition-step">
      <Text variant="overline" color={colors.turquoise}>
        Étape {step.position} · {KIND_LABELS[step.kind]}
      </Text>
      <Text variant="heading">{step.title}</Text>
      <Text>{step.prompt}</Text>
      {step.body ? <Text color={colors.textMuted}>{step.body}</Text> : null}

      {step.kind === 'discover' ? (
        <Button label="J’ai lu, continuer" onPress={() => send(null)} loading={submit.isPending} />
      ) : (
        <View style={styles.choices} accessibilityRole="radiogroup">
          {(step.choices ?? []).map((label, index) => {
            const selected = choice === index;
            const showCorrect = wrong && answer?.correct_choice === index;
            return (
              <Pressable
                key={label}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: submit.isPending }}
                accessibilityLabel={`${label}${selected && wrong ? ', réponse incorrecte' : ''}${showCorrect ? ', bonne réponse' : ''}`}
                disabled={submit.isPending}
                onPress={() => send(index)}
                style={({ pressed }) => [
                  styles.choice,
                  selected && wrong && styles.choiceWrong,
                  showCorrect && styles.choiceRight,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.flex}>{label}</Text>
                {selected && wrong ? <Icon name="close" size={18} color={colors.danger} /> : null}
                {showCorrect ? <Icon name="check" size={18} color={colors.success} /> : null}
              </Pressable>
            );
          })}
        </View>
      )}

      {wrong ? <InlineMessage message={`Pas tout à fait. ${answer.explanation} Vous pouvez réessayer.`} /> : null}
      {submit.isError ? <InlineMessage tone="error" message={errorMessage(submit.error)} /> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  timeline: { gap: spacing.sm },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  dotDone: { backgroundColor: colors.turquoise, borderColor: colors.turquoise },
  dotCurrent: { borderColor: colors.turquoise, borderWidth: 2 },
  flex: { flex: 1 },
  choices: { gap: spacing.sm },
  choice: {
    minHeight: MIN_TOUCH + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ink,
  },
  choiceWrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  choiceRight: { borderColor: colors.success },
  pressed: { opacity: 0.75 },
});
