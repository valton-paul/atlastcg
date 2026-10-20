import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { callRpc, selectRows } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import { getSupabase } from '@/lib/supabase';

export const stepSchema = z.object({
  id: z.string().uuid(),
  position: z.number(),
  kind: z.enum(['locate', 'discover', 'quiz']),
  title: z.string(),
  prompt: z.string(),
  body: z.string().nullable(),
  choices: z.array(z.string()).nullable(),
  explanation: z.string(),
});

const progressSchema = z.object({
  step_id: z.string().uuid(),
  attempts: z.number(),
  completed_at: z.string().nullable(),
});

export type ExpeditionStep = z.infer<typeof stepSchema>;
export type StepProgress = z.infer<typeof progressSchema>;

const stateSchema = z.object({
  expedition_id: z.string().uuid(),
  status: z.enum(['in_progress', 'completed']),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  completed_steps: z.number(),
  total_steps: z.number(),
});

/** Les étapes ne sont lisibles qu'après le démarrage (RLS) ; les bonnes réponses restent côté serveur. */
export function useExpeditionSteps(expeditionId: string | null, started: boolean) {
  return useQuery({
    queryKey: [...queryKeys.player, 'expedition-steps', expeditionId],
    enabled: !!expeditionId && started,
    queryFn: async () => {
      const db = getSupabase();
      const [steps, progress] = await Promise.all([
        selectRows(
          'expedition-steps',
          db
            .from('expedition_steps')
            .select('id, position, kind, title, prompt, body, choices, explanation')
            .eq('expedition_id', expeditionId as string)
            .order('position'),
          z.array(stepSchema),
        ),
        selectRows(
          'expedition-progress',
          db
            .from('user_expedition_steps')
            .select('step_id, attempts, completed_at')
            .eq('expedition_id', expeditionId as string),
          z.array(progressSchema),
        ),
      ]);
      return { steps, progress: new Map(progress.map((p) => [p.step_id, p])) };
    },
  });
}

export function useStartExpedition() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (expeditionId: string) => callRpc('start_expedition', { p_expedition_id: expeditionId }, stateSchema),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.player });
      void client.invalidateQueries({ queryKey: queryKeys.expeditionCharges });
    },
  });
}

const submitSchema = z.object({
  step_id: z.string().uuid(),
  correct: z.boolean(),
  correct_choice: z.number().nullable().optional(),
  explanation: z.string(),
  xp_granted: z.number().optional().default(0),
  country_xp: z.number().optional().default(0),
  mastery_tier: z.enum(['novice', 'explorer', 'expert', 'master']).optional(),
  state: stateSchema,
});

export type StepAnswer = z.infer<typeof submitSchema>;

/** Le cache n'est pas rafraîchi ici : l'écran affiche d'abord l'explication, puis passe à la suite. */
export function useSubmitStep() {
  return useMutation({
    mutationFn: ({ stepId, choice }: { stepId: string; choice: number | null }) =>
      callRpc('submit_expedition_step', { p_step_id: stepId, p_choice: choice }, submitSchema),
  });
}

export function useCompleteExpedition() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (expeditionId: string) =>
      callRpc(
        'complete_expedition',
        { p_expedition_id: expeditionId },
        z.object({
          newly_completed: z.boolean(),
          packs_granted: z.number(),
          fragments_granted: z.number(),
          xp_granted: z.number(),
          perfect: z.boolean(),
          fragments_balance: z.number(),
          exploration_xp: z.number(),
          country_xp: z.number().optional().default(0),
          mastery_tier: z.enum(['novice', 'explorer', 'expert', 'master']).optional(),
          state: stateSchema,
        }),
      ),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.player }),
  });
}
