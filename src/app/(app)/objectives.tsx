import { useState } from 'react';

import {
  Button,
  colors,
  EmptyState,
  ErrorState,
  InlineMessage,
  LoadingState,
  ProgressBar,
  Screen,
  SectionHeader,
  Surface,
  Text,
} from '@/design-system';
import { isClaimable, useClaimObjective, useObjectives } from '@/features/objectives/api';
import { errorMessage } from '@/lib/errors';
import { useHaptics } from '@/lib/haptics';

export default function ObjectivesScreen() {
  const objectives = useObjectives();
  const claim = useClaimObjective();
  const haptic = useHaptics();
  const [claimedId, setClaimedId] = useState<string | null>(null);

  if (objectives.isPending) return <LoadingState />;
  if (objectives.isError) {
    return (
      <Screen back title="Objectifs">
        <ErrorState message={errorMessage(objectives.error)} onRetry={() => void objectives.refetch()} />
      </Screen>
    );
  }

  const list = objectives.data;
  const open = list.filter((o) => !o.claimed);
  const done = list.filter((o) => o.claimed);

  return (
    <Screen
      back
      title="Objectifs"
      subtitle="Facultatifs et permanents : aucun délai, aucune série à maintenir."
      refreshing={objectives.isRefetching}
      onRefresh={() => void objectives.refetch()}
    >
      {claim.isError ? <InlineMessage tone="error" message={errorMessage(claim.error)} /> : null}
      {claimedId && claim.isSuccess ? (
        <InlineMessage tone="success" message="Récompense ajoutée à votre inventaire." />
      ) : null}
      {open.length === 0 ? (
        <EmptyState
          icon="trophy"
          title="Tous les objectifs sont accomplis"
          message="De nouveaux objectifs arriveront avec les prochains contenus."
        />
      ) : (
        open.map((objective) => {
          const claimable = isClaimable(objective);
          return (
            <Surface key={objective.id} tone={claimable ? 'precious' : 'panel'}>
              <Text variant="bodyStrong">{objective.title}</Text>
              <Text variant="caption" color={colors.textMuted}>
                {objective.description}
              </Text>
              <ProgressBar
                value={Math.min(objective.progress, objective.target)}
                total={objective.target}
                tone={claimable ? 'precious' : 'explore'}
              />
              <Text variant="caption" color={colors.gold}>
                Récompense : {objective.reward.quantity} paquet{objective.reward.quantity > 1 ? 's' : ''}{' '}
                {objective.reward.pack_name}
              </Text>
              {claimable ? (
                <Button
                  label="Récupérer la récompense"
                  variant="precious"
                  compact
                  loading={claim.isPending && claim.variables === objective.id}
                  disabled={claim.isPending}
                  onPress={() => {
                    setClaimedId(objective.id);
                    claim.mutate(objective.id, { onSuccess: () => haptic('success') });
                  }}
                />
              ) : null}
            </Surface>
          );
        })
      )}
      {done.length > 0 ? (
        <>
          <SectionHeader title="Accomplis" />
          {done.map((objective) => (
            <Surface key={objective.id}>
              <Text variant="bodyStrong" color={colors.textMuted}>
                {objective.title}
              </Text>
              <Text variant="caption" color={colors.textFaint}>
                Récompense récupérée
              </Text>
            </Surface>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
