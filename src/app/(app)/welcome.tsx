import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, colors, Icon, InlineMessage, Screen, spacing, Text, type IconName } from '@/design-system';
import { AtlasMark } from '@/features/auth/AuthHeader';
import { useCompleteOnboarding } from '@/features/player/api';
import { useAtlasData } from '@/features/player/useAtlasData';
import { errorMessage } from '@/lib/errors';

const PILLARS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'pack',
    title: 'Ouvrez des paquets',
    text: 'Chaque paquet contient cinq cartes : pays, capitales, monuments, paysages et cultures.',
  },
  {
    icon: 'cards',
    title: 'Composez votre collection',
    text: 'Rangez vos cartes par continent et par thème. Les doublons deviennent des fragments.',
  },
  {
    icon: 'globe',
    title: 'Explorez le monde',
    text: 'Chaque pays découvert s’illumine sur votre carte et ouvre une courte expédition.',
  },
];

export default function WelcomeScreen() {
  const data = useAtlasData();
  const router = useRouter();
  const complete = useCompleteOnboarding();
  const firstPack = data.status === 'ready' ? data.player.packs[0] : undefined;
  const name = data.status === 'ready' ? data.player.profile.display_name : '';

  return (
    <Screen
      footer={
        <>
          {complete.isError ? <InlineMessage tone="error" message={errorMessage(complete.error)} /> : null}
          {firstPack ? (
            <Button
              label="Ouvrir mon premier paquet"
              icon="sparkle"
              onPress={() =>
                router.replace({
                  pathname: '/open/[userPackId]',
                  params: { userPackId: firstPack.id, onboarding: '1' },
                })
              }
              testID="welcome-open"
            />
          ) : null}
          <Button
            label={firstPack ? 'Plus tard' : 'Commencer'}
            variant={firstPack ? 'ghost' : 'primary'}
            loading={complete.isPending}
            onPress={() => complete.mutate(undefined, { onSuccess: () => router.replace('/') })}
          />
        </>
      }
    >
      <View style={styles.hero}>
        <AtlasMark size={72} />
        <Text variant="overline" color={colors.gold}>
          Bienvenue{name ? `, ${name}` : ''}
        </Text>
        <Text variant="hero">Le monde est à collectionner</Text>
        <Text color={colors.textMuted}>
          {firstPack ? 'Deux paquets Découverte vous attendent pour commencer votre atlas.' : 'Votre atlas est prêt.'}
        </Text>
      </View>
      {PILLARS.map((pillar) => (
        <View key={pillar.title} style={styles.pillar}>
          <View style={styles.icon}>
            <Icon name={pillar.icon} color={colors.turquoise} />
          </View>
          <View style={styles.flex}>
            <Text variant="subheading">{pillar.title}</Text>
            <Text variant="caption" color={colors.textMuted}>
              {pillar.text}
            </Text>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, paddingVertical: spacing.xl },
  pillar: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.turquoiseSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
});
