import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { Button, InlineMessage, LoadingState, TextField } from '@/design-system';
import { errorMessage } from '@/lib/errors';

import { isValidCode, useJoinChallenge } from './api';

/** Rejoint un défi par code ; si `initialCode` est fourni (lien profond), la demande part directement. */
export function JoinChallengeForm({ initialCode }: { initialCode?: string }) {
  const router = useRouter();
  const join = useJoinChallenge();
  const [code, setCode] = useState(initialCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const autoSubmitted = useRef(false);

  const submit = (value: string) => {
    setError(null);
    if (!isValidCode(value)) {
      setError('Un code d’invitation contient 8 lettres et chiffres.');
      return;
    }
    join.mutate(value, { onSuccess: (r) => router.replace(`/challenge/${r.challenge_id}`) });
  };

  useEffect(() => {
    if (initialCode && !autoSubmitted.current) {
      autoSubmitted.current = true;
      submit(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  if (initialCode && join.isPending) return <LoadingState label="Connexion au défi…" />;

  return (
    <>
      <TextField
        label="Code d’invitation"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={12}
        error={error}
        onSubmitEditing={() => submit(code)}
      />
      {join.isError ? <InlineMessage tone="error" message={errorMessage(join.error)} /> : null}
      <Button label="Rejoindre le défi" onPress={() => submit(code)} loading={join.isPending} />
    </>
  );
}
