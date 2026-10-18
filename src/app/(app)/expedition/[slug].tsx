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
  type StepProgress,
} from '@/features/expeditions/api';
import { useInvalidatePlayer } from '@/features/player/api';
import { useAtlasData } from '@/features/player/useAtlasData';
import { errorMessage } from '@/lib/errors';
import { useHaptics } from '@/lib/haptics';

const KIND_LABELS = { locate: 'Repérage', discover: 'Découverte', quiz: 'Question' } as const;

function questionScore(steps: ExpeditionStep[], progress: Map<string, StepProgress>) {
  const questions = steps.filter((s) => s.kind === 'locate' || s.kind === 'quiz');
  const perfect = questions.filter((s) => {
    const p = progress.get(s.id);
    return !!p?.completed_at && p.attempts === 1;
  }).length;
  return { perfect, total: questions.length };
}

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
  const [showScore, setShowScore] = useState(false);

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
            Quelques étapes courtes, sans limite de temps. Une erreur n’est jamais bloquante : vous pouvez réessayer.
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
  const finale = showScore || completed;

  if (finale) {
    const { perfect, total } = questionScore(list, steps.data.progress);
    const mistakes = Math.max(0, total - perfect);
    return (
      <Screen back title={expedition.title} subtitle={country?.name}>
        <Surface tone="precious" testID="expedition-score">
          <Text variant="overline" color={colors.gold}>
            Expédition terminée
          </Text>
          <Text variant="hero" align="center">
            {perfect}/{total}
          </Text>
          <Text align="center" color={colors.textMuted}>
            {total <= 1 ? 'bonne réponse du premier coup' : 'bonnes réponses du premier coup'}
          </Text>
          {mistakes === 0 ? (
            <Text align="center">Sans faute — bel effort d’exploration.</Text>
          ) : (
            <Text align="center">
              {mistakes === 1
                ? '1 question a nécessité une correction.'
                : `${mistakes} questions ont nécessité une correction.`}
            </Text>
          )}
          {complete.data?.packs_granted || completed ? (
            <Text variant="caption" color={colors.gold} align="center">
              Récompense : {rewardLabel}
            </Text>
          ) : null}
          <Button
            label="Terminer"
            icon="compass"
            onPress={() => router.replace('/world')}
            testID="expedition-finish"
          />
        </Surface>
      </Screen>
    );
  }

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

      {currentStep ? (
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
                  setShowScore(true);
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
          // Découverte : pas d’écran intermédiaire — enchaîne sur l’étape suivante.
          if (step.kind === 'discover' && result.correct) {
            haptic('success');
            void invalidate();
            return;
          }
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
            Bonne réponse !
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
