import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import {
  Button,
  Chip,
  colors,
  ErrorState,
  InlineMessage,
  LoadingState,
  radius,
  spacing,
  Surface,
  Text,
} from '@/design-system';
import { type TimedPacks, useInterruptedOpenings, useTimedPacks } from '@/features/packs/api';
import { packTheme, PackVisual } from '@/features/packs/PackVisual';
import { formatCountdown, useCountdown } from '@/features/packs/useCountdown';
import { PlayerHeader } from '@/features/player/PlayerHeader';
import { useAtlasData } from '@/features/player/useAtlasData';
import { errorMessage } from '@/lib/errors';
import { useHaptics } from '@/lib/haptics';
import { usePreferences } from '@/lib/preferences';
import { queryKeys } from '@/lib/query-client';

const PACK_WIDTH = 190;

export default function HomeScreen() {
  const data = useAtlasData();
  const router = useRouter();
  const queryClient = useQueryClient();
  const timed = useTimedPacks(data.status === 'ready');
  const interrupted = useInterruptedOpenings(data.status === 'ready');
  const haptic = useHaptics();
  const { reduceMotion } = usePreferences();
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  const nextPackIn = useCountdown(timed.data?.nextAt ?? null);
  const nextPackDue = nextPackIn === 0;
  useEffect(() => {
    if (nextPackDue) void queryClient.invalidateQueries({ queryKey: queryKeys.timedPacks });
  }, [nextPackDue, queryClient]);

  const float = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      float.set(0);
      return;
    }
    float.set(withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [float, reduceMotion]);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * float.get() }] }));

  const groups = useMemo(() => {
    if (data.status !== 'ready') return [];
    const byPack = new Map<string, { packId: string; userPackIds: string[] }>();
    for (const pack of data.player.packs) {
      const group = byPack.get(pack.pack_id) ?? { packId: pack.pack_id, userPackIds: [] };
      group.userPackIds.push(pack.id);
      byPack.set(pack.pack_id, group);
    }
    return [...byPack.values()];
  }, [data]);

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState message={errorMessage(data.error)} onRetry={data.retry} />;

  const { catalog, player } = data;
  const group = groups.find((g) => g.packId === selectedPackId) ?? groups[0];
  const definition = group ? catalog.packsById.get(group.packId) : undefined;
  const theme = packTheme(definition?.slug ?? '');
  const total = player.packs.length;

  function open() {
    if (!group) return;
    haptic('tap');
    router.push(`/open/${group.userPackIds[0]}`);
  }

  return (
    <View style={styles.root}>
      <PlayerHeader
        subtitle="Votre atlas"
        title={player.profile.display_name}
        fragments={player.fragments}
        packCount={total}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={data.refreshing} onRefresh={data.refresh} tintColor={colors.turquoise} />
        }
      >
        {interrupted.data && interrupted.data.length > 0 ? (
          <Surface tone="explore" onPress={() => router.push(`/open/${interrupted.data[0]}`)}>
            <Text variant="bodyStrong">Une ouverture a été interrompue</Text>
            <Text variant="caption" color={colors.textMuted}>
              Vos cartes sont en sécurité. Touchez ici pour afficher le résultat.
            </Text>
          </Surface>
        ) : null}

        <View style={styles.hero}>
          <Text variant="hero" align="center" accessibilityRole="header">
            Ouvrir un paquet
          </Text>
          <Text color={colors.textMuted} align="center">
            {definition
              ? `Découvrez ${definition.cards_per_pack} nouvelles cartes du monde`
              : 'Plus aucun paquet à ouvrir pour le moment'}
          </Text>
          <Button label="Comment ça marche ?" variant="ghost" compact onPress={() => router.push('/packs')} />
        </View>

        {groups.length > 1 ? (
          <View style={styles.packChoices} accessibilityRole="tablist">
            {groups.map((g) => {
              const def = catalog.packsById.get(g.packId);
              return (
                <Chip
                  key={g.packId}
                  label={def?.name ?? 'Paquet'}
                  count={g.userPackIds.length}
                  selected={g.packId === group?.packId}
                  onPress={() => setSelectedPackId(g.packId)}
                />
              );
            })}
          </View>
        ) : null}

        <Pressable
          onPress={open}
          disabled={!group}
          accessibilityRole="button"
          accessibilityLabel={definition ? `Ouvrir le paquet ${definition.name}` : 'Aucun paquet disponible'}
          accessibilityState={{ disabled: !group }}
          style={styles.packArea}
          testID="home-pack"
        >
          <Animated.View style={[styles.packFloat, floatStyle]}>
            <View
              style={[
                styles.packGlow,
                { boxShadow: group ? `0 0 48px 8px ${theme.accent}55` : 'none' },
                !group && styles.packEmpty,
              ]}
            >
              <PackVisual slug={definition?.slug ?? 'decouverte'} width={PACK_WIDTH} />
            </View>
          </Animated.View>
          {definition ? (
            <Text variant="subheading" color={theme.accent} align="center">
              Paquet {definition.name}
            </Text>
          ) : null}
        </Pressable>

        <Button
          label={group ? 'Ouvrir' : 'Aucun paquet'}
          icon="sparkle"
          onPress={open}
          disabled={!group}
          style={styles.openButton}
          testID="home-open-pack"
        />

        <View style={styles.counter} accessible accessibilityLabel={counterLabel(total, timed.data, nextPackIn)}>
          <Text variant="title" align="center">
            {total}
            {timed.data ? (
              <Text variant="title" color={colors.textMuted}>
                {' '}
                / {timed.data.maxStored}
              </Text>
            ) : null}
          </Text>
          <Text variant="caption" color={colors.textMuted} align="center">
            paquet{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''}
          </Text>
          {timed.data && !timed.data.nextAt ? (
            <Text variant="caption" color={colors.gold} align="center">
              Réserve pleine : ouvrez un paquet pour relancer la recharge
            </Text>
          ) : nextPackIn !== null ? (
            <Text variant="caption" color={colors.textMuted} align="center">
              Prochain paquet dans{' '}
              <Text variant="caption" color={colors.turquoise}>
                {formatCountdown(nextPackIn)}
              </Text>
            </Text>
          ) : null}
        </View>
        {timed.isError ? <InlineMessage tone="error" message={errorMessage(timed.error)} /> : null}
        <View style={styles.links}>
          <Button label="Objectifs" variant="ghost" compact icon="trophy" onPress={() => router.push('/objectives')} />
          <Button label="Expéditions" variant="ghost" compact icon="compass" onPress={() => router.push('/world')} />
        </View>
      </ScrollView>
    </View>
  );
}

function counterLabel(total: number, timed: TimedPacks | undefined, nextPackIn: number | null): string {
  const packs = `${total} paquet${total > 1 ? 's' : ''} disponible${total > 1 ? 's' : ''}`;
  if (!timed) return packs;
  const stock = `${packs} sur ${timed.maxStored}`;
  if (!timed.nextAt) return `${stock}. Réserve pleine.`;
  if (nextPackIn !== null) return `${stock}. Prochain paquet dans ${formatCountdown(nextPackIn)}.`;
  return stock;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg, alignItems: 'stretch' },
  hero: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  packChoices: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  packArea: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  packFloat: { alignItems: 'center' },
  packGlow: { borderRadius: radius.lg },
  packEmpty: { opacity: 0.35 },
  openButton: { alignSelf: 'center', minWidth: 200 },
  counter: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 220,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ink,
  },
  links: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
});
