import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, colors, InlineMessage, Screen, SectionHeader, spacing, Text } from '@/design-system';
import { CONTINENT_LABELS, CONTINENT_ORDER, type Continent } from '@/features/catalog/types';
import { CHALLENGE_TYPE_LABELS, useCreateChallenge, useFriends, type ChallengeType } from '@/features/social/api';
import { errorMessage } from '@/lib/errors';

const TYPE_HINTS: Record<ChallengeType, string> = {
  capitals: 'Retrouver la capitale de cinq pays.',
  continents: 'Situer cinq pays sur le bon continent.',
};

export default function NewChallengeScreen() {
  const router = useRouter();
  const friends = useFriends();
  const create = useCreateChallenge();
  const [type, setType] = useState<ChallengeType>('capitals');
  const [continent, setContinent] = useState<Continent | null>(null);
  const [invited, setInvited] = useState<string[]>([]);

  const toggle = (code: string) =>
    setInvited((list) =>
      list.includes(code) ? list.filter((c) => c !== code) : list.length >= 10 ? list : [...list, code],
    );

  return (
    <Screen back title="Nouveau défi">
      <SectionHeader title="Thème" />
      <View style={styles.wrap}>
        {(Object.keys(CHALLENGE_TYPE_LABELS) as ChallengeType[]).map((t) => (
          <Chip key={t} label={CHALLENGE_TYPE_LABELS[t]} selected={type === t} onPress={() => setType(t)} />
        ))}
      </View>
      <Text variant="caption" color={colors.textMuted}>
        {TYPE_HINTS[type]}
      </Text>
      {type === 'capitals' ? (
        <>
          <SectionHeader title="Région" />
          <View style={styles.wrap}>
            <Chip label="Le monde entier" selected={!continent} onPress={() => setContinent(null)} />
            {CONTINENT_ORDER.map((c) => (
              <Chip key={c} label={CONTINENT_LABELS[c]} selected={continent === c} onPress={() => setContinent(c)} />
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title="Inviter des amis" />
      {friends.data && friends.data.friends.length > 0 ? (
        <View style={styles.wrap}>
          {friends.data.friends.map((friend) => (
            <Chip
              key={friend.public_code}
              label={friend.display_name}
              selected={invited.includes(friend.public_code)}
              onPress={() => toggle(friend.public_code)}
            />
          ))}
        </View>
      ) : (
        <Text variant="caption" color={colors.textMuted}>
          Vous pourrez aussi partager un code d’invitation une fois le défi créé.
        </Text>
      )}

      {create.isError ? <InlineMessage tone="error" message={errorMessage(create.error)} /> : null}
      <Button
        label="Créer le défi"
        loading={create.isPending}
        onPress={() =>
          create.mutate(
            { type, continent: type === 'capitals' ? continent : null, friendCodes: invited },
            { onSuccess: (r) => router.replace(`/challenge/${r.challenge_id}`) },
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } });
