import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
  radius,
  Screen,
  spacing,
  Surface,
  Text,
} from '@/design-system';
import { illustrationUrl } from '@/features/cards/CardArtwork';
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
import { MASTERY_TIER_LABELS, type MasteryTier } from '@/features/expeditions/mastery';
import { useInvalidatePlayer } from '@/features/player/api';
import { useAtlasData } from '@/features/player/useAtlasData';
import { errorMessage } from '@/lib/errors';
import { useHaptics } from '@/lib/haptics';

const KIND_LABELS = { locate: 'Repérage', discover: 'Découverte', quiz: 'Défi' } as const;
const KIND_HINTS = {
  locate: 'Géographie',
  discover: 'Culture générale',
  quiz: 'Réflexion',
} as const;

function questionScore(steps: ExpeditionStep[], progress: Map<string, StepProgress>) {
  const questions = steps.filter((s) => s.kind === 'locate' || s.kind === 'quiz');
  const perfect = questions.filter((s) => {
    const p = progress.get(s.id);
    return !!p?.completed_at && p.attempts === 1;
  }).length;
  return { perfect, total: questions.length };
}

function heritageIllustration(
  cards: { category: string; country_code: string | null; illustration_path: string | null }[],
  countryCode: string,
): string | null {
  const ofCountry = cards.filter((c) => c.country_code === countryCode && c.illustration_path);
  const preferred = ofCountry.find((c) => !['country', 'capital'].includes(c.category));
  return (preferred ?? ofCountry[0])?.illustration_path ?? null;
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
  const [finaleReward, setFinaleReward] = useState<{
    fragments: number;
    xp: number;
    perfect: boolean;
    masteryTier?: string;
    countryXp?: number;
  } | null>(null);

  const heroPath = useMemo(() => {
    if (data.status !== 'ready' || !expedition) return null;
    return heritageIllustration(data.catalog.cards, expedition.country_code);
  }, [data, expedition]);
  const heroUri = illustrationUrl(heroPath);

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
  const unlocked = countryProgress(catalog, data.player.ownedCards, expedition.country_code).owned > 0;
  const rewardSummary = `+${expedition.reward_fragments} Fragments · +${expedition.reward_xp} XP`;
  const perfectHint =
    expedition.perfect_bonus_fragments > 0 || expedition.perfect_bonus_xp > 0
      ? `Sans faute : +${expedition.perfect_bonus_fragments} Fragments · +${expedition.perfect_bonus_xp} XP`
      : null;

  if (!userExpedition) {
    return (
      <Screen back title={expedition.title} subtitle={country?.name}>
        {heroUri ? (
          <View style={styles.hero}>
            <Image source={{ uri: heroUri }} style={styles.heroImage} contentFit="cover" transition={200} />
            <View style={styles.heroScrim} />
            <Text variant="overline" color={colors.gold} style={styles.heroLabel}>
              {country?.name ?? 'Expédition'}
            </Text>
          </View>
        ) : null}
        <Surface tone="explore">
          <Text>{expedition.summary}</Text>
          <Text variant="caption" color={colors.textMuted}>
            Trois étapes : repérage, découverte, puis défi. Une erreur n’est jamais bloquante.
          </Text>
          <View style={styles.rewardRow}>
            <Icon name="fragment" size={16} color={colors.gold} />
            <Text variant="caption" color={colors.gold} style={styles.flex}>
              Récompense : {rewardSummary}
            </Text>
          </View>
          {perfectHint ? (
            <Text variant="caption" color={colors.textMuted}>
              {perfectHint}
            </Text>
          ) : null}
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
    const wasPerfect = finaleReward?.perfect ?? (mistakes === 0 && total > 0);
    const fragments =
      finaleReward?.fragments ??
      expedition.reward_fragments + (wasPerfect ? expedition.perfect_bonus_fragments : 0);
    const xp =
      finaleReward?.xp ??
      expedition.reward_xp +
        list.length * expedition.step_xp +
        (wasPerfect ? expedition.perfect_bonus_xp : 0);

    return (
      <Screen back title={expedition.title} subtitle={country?.name}>
        {heroUri ? (
          <View style={styles.heroCompact}>
            <Image source={{ uri: heroUri }} style={styles.heroImage} contentFit="cover" transition={200} />
          </View>
        ) : null}
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
          {wasPerfect ? (
            <Text align="center">Parfait — bonus de précision débloqué.</Text>
          ) : (
            <Text align="center">
              {mistakes === 1
                ? '1 question a nécessité une correction.'
                : `${mistakes} questions ont nécessité une correction.`}
            </Text>
          )}
          <View style={styles.finaleRewards}>
            <View style={styles.finaleChip}>
              <Icon name="fragment" size={18} color={colors.gold} />
              <Text variant="heading">+{fragments}</Text>
              <Text variant="caption" color={colors.textMuted}>
                Fragments
              </Text>
            </View>
            <View style={styles.finaleChip}>
              <Icon name="sparkle" size={18} color={colors.turquoise} />
              <Text variant="heading">+{xp}</Text>
              <Text variant="caption" color={colors.textMuted}>
                XP
              </Text>
            </View>
          </View>
          {finaleReward?.masteryTier ? (
            <Text align="center" color={colors.textMuted}>
              Maîtrise :{' '}
              {MASTERY_TIER_LABELS[finaleReward.masteryTier as MasteryTier] ?? finaleReward.masteryTier}
              {finaleReward.countryXp != null ? ` · ${finaleReward.countryXp} XP` : ''}
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
      <StepTimeline steps={list} progress={steps.data.progress} currentId={currentStep?.id} />
      {currentStep ? (
        <StepCard
          key={currentStep.id}
          step={currentStep}
          heroUri={currentStep.kind === 'discover' ? heroUri : null}
          stepXp={expedition.step_xp}
        />
      ) : (
        <Surface tone="precious">
          <Text variant="heading">Exploration terminée</Text>
          <Text color={colors.textMuted}>
            Validez pour recevoir {rewardSummary}
            {perfectHint ? ` (${perfectHint})` : ''}.
          </Text>
          <Button
            label="Récolter la récompense"
            variant="precious"
            loading={complete.isPending}
            onPress={() =>
              complete.mutate(expedition.id, {
                onSuccess: (r) => {
                  haptic('success');
                  setFinaleReward({
                    fragments: r.fragments_granted,
                    xp: r.xp_granted + list.length * expedition.step_xp,
                    perfect: r.perfect,
                    masteryTier: r.mastery_tier,
                    countryXp: r.country_xp,
                  });
                  setShowScore(true);
                  AccessibilityInfo.announceForAccessibility(
                    `Récompense reçue : ${r.fragments_granted} Fragments et ${r.xp_granted} XP.`,
                  );
                },
              })
            }
            testID="complete-expedition"
          />
          {complete.isError ? <InlineMessage tone="error" message={errorMessage(complete.error)} /> : null}
        </Surface>
      )}
      <Text variant="caption" color={colors.textFaint} align="center">
        Étape {Math.min(done + 1, list.length)}/{list.length}
      </Text>
    </Screen>
  );
}

function StepTimeline({
  steps,
  progress,
  currentId,
}: {
  steps: ExpeditionStep[];
  progress: Map<string, StepProgress>;
  currentId?: string;
}) {
  return (
    <View style={styles.timeline}>
      {steps.map((step, index) => {
        const stepDone = !!progress.get(step.id)?.completed_at;
        const isCurrent = currentId === step.id;
        const prevDone = index === 0 || !!progress.get(steps[index - 1]?.id)?.completed_at;
        return (
          <View key={step.id} style={styles.timelineItem}>
            <View style={styles.timelineTrack}>
              {index > 0 ? (
                <View style={[styles.timelineBridge, prevDone && styles.timelineBridgeDone]} />
              ) : (
                <View style={styles.timelineBridgeSpacer} />
              )}
              <View
                style={[styles.dot, stepDone && styles.dotDone, isCurrent && styles.dotCurrent]}
                accessible
                accessibilityLabel={`Étape ${step.position} : ${KIND_LABELS[step.kind]}, ${stepDone ? 'terminée' : isCurrent ? 'en cours' : 'à venir'}`}
              >
                {stepDone ? (
                  <Icon name="check" size={14} color={colors.nightDeep} />
                ) : (
                  <Text variant="overline">{step.position}</Text>
                )}
              </View>
              {index < steps.length - 1 ? (
                <View style={[styles.timelineBridge, stepDone && styles.timelineBridgeDone]} />
              ) : (
                <View style={styles.timelineBridgeSpacer} />
              )}
            </View>
            <Text
              variant="caption"
              color={stepDone || isCurrent ? colors.text : colors.textMuted}
              numberOfLines={1}
              style={styles.timelineLabel}
            >
              {KIND_LABELS[step.kind]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function StepCard({
  step,
  heroUri,
  stepXp,
}: {
  step: ExpeditionStep;
  heroUri: string | null;
  stepXp: number;
}) {
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
          {KIND_LABELS[step.kind]} · {KIND_HINTS[step.kind]}
        </Text>
        <View style={styles.row}>
          <Icon name="check" color={colors.success} />
          <Text variant="heading" style={styles.flex}>
            Bonne réponse !
          </Text>
        </View>
        <Text>{answer.explanation}</Text>
        {answer.xp_granted > 0 ? (
          <Text variant="caption" color={colors.turquoise}>
            +{answer.xp_granted} XP d’exploration
          </Text>
        ) : null}
        <Button label="Continuer" onPress={() => void invalidate()} testID="expedition-continue" />
      </Surface>
    );
  }

  return (
    <Surface tone="raised" testID="expedition-step">
      <Text variant="overline" color={colors.turquoise}>
        {KIND_LABELS[step.kind]} · {KIND_HINTS[step.kind]}
      </Text>
      <Text variant="heading">{step.title}</Text>
      {heroUri && step.kind === 'discover' ? (
        <View style={styles.stepHero}>
          <Image source={{ uri: heroUri }} style={styles.stepHeroImage} contentFit="cover" transition={200} />
        </View>
      ) : null}
      <Text>{step.prompt}</Text>
      {step.body ? <Text color={colors.textMuted}>{step.body}</Text> : null}

      {step.kind === 'discover' ? (
        <Button
          label="J’ai lu, continuer"
          onPress={() => send(null)}
          loading={submit.isPending}
        />
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

      {wrong ? (
        <InlineMessage message={`Pas tout à fait. ${answer.explanation} Vous pouvez réessayer — le bonus de précision sera perdu.`} />
      ) : null}
      {submit.isError ? <InlineMessage tone="error" message={errorMessage(submit.error)} /> : null}
      {step.kind !== 'discover' ? (
        <Text variant="caption" color={colors.textFaint}>
          +{stepXp} XP à la validation
        </Text>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 168,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    justifyContent: 'flex-end',
  },
  heroCompact: {
    height: 100,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.ink,
  },
  heroImage: StyleSheet.absoluteFill,
  heroScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 13, 26, 0.35)',
  },
  heroLabel: { padding: spacing.md },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  timelineItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  timelineTrack: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  timelineBridge: { flex: 1, height: 2, backgroundColor: colors.border },
  timelineBridgeDone: { backgroundColor: colors.turquoise },
  timelineBridgeSpacer: { flex: 1 },
  timelineLabel: { textAlign: 'center' },
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepHero: {
    height: 160,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.ink,
  },
  stepHeroImage: { width: '100%', height: '100%' },
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
  finaleRewards: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  finaleChip: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
