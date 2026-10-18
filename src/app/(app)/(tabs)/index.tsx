import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import {
  Button,
  colors,
  ErrorState,
  InlineMessage,
  LoadingState,
  radius,
  spacing,
  Surface,
  Text,
} from '@/design-system';
import type { PackDefinition } from '@/features/catalog/types';
import { type TimedPacks, useInterruptedOpenings, useTimedPacks } from '@/features/packs/api';
import { OpenPackFlow } from '@/features/packs/OpenPackFlow';
import { packBlurb, packTheme, PackVisual } from '@/features/packs/PackVisual';
import { formatCountdown, useCountdown } from '@/features/packs/useCountdown';
import { PlayerHeader } from '@/features/player/PlayerHeader';
import { useAtlasData } from '@/features/player/useAtlasData';
import { errorMessage } from '@/lib/errors';
import { useHaptics } from '@/lib/haptics';
import { usePreferences } from '@/lib/preferences';
import { queryKeys } from '@/lib/query-client';

const PACK_WIDTH = 200;

type PackGroup = {
  packId: string;
  userPackIds: string[];
  definition: PackDefinition;
};

export default function HomeScreen() {
  const data = useAtlasData();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width: screenWidth } = useWindowDimensions();
  const userId = data.status === 'ready' ? data.player.profile.id : null;
  const timed = useTimedPacks(data.status === 'ready', userId);
  const interrupted = useInterruptedOpenings(data.status === 'ready');
  const haptic = useHaptics();
  const { reduceMotion } = usePreferences();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const carouselRef = useRef<{ scrollTo: (opts: { x: number; animated?: boolean }) => void } | null>(null);

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

  const groups = useMemo((): PackGroup[] => {
    if (data.status !== 'ready') return [];
    const byPack = new Map<string, PackGroup>();
    for (const pack of data.player.packs) {
      const definition = data.catalog.packsById.get(pack.pack_id);
      if (!definition) continue;
      const group = byPack.get(pack.pack_id) ?? { packId: pack.pack_id, userPackIds: [], definition };
      group.userPackIds.push(pack.id);
      byPack.set(pack.pack_id, group);
    }
    return [...byPack.values()].sort((a, b) => a.definition.position - b.definition.position);
  }, [data]);

  useEffect(() => {
    if (selectedIndex >= groups.length) setSelectedIndex(0);
  }, [groups.length, selectedIndex]);

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState message={errorMessage(data.error)} onRetry={data.retry} />;

  const { catalog, player } = data;
  const group = groups[selectedIndex] ?? groups[0];
  const total = player.packs.length;
  const classiqueId = catalog.packs.find((p) => p.slug === 'classique')?.id;
  const reserveCount = classiqueId
    ? player.packs.filter((p) => p.pack_id === classiqueId).length
    : Math.min(total, timed.data?.maxStored ?? total);

  function open() {
    if (!group) return;
    haptic('tap');
    setOpeningPackId(group.userPackIds[0]);
  }

  function onCarouselScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    if (index !== selectedIndex && index >= 0 && index < groups.length) setSelectedIndex(index);
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
        {interrupted.data && interrupted.data.length > 0 && !openingPackId ? (
          <Surface tone="explore" onPress={() => setOpeningPackId(interrupted.data[0]!)}>
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
          <Button label="Comment ça marche ?" variant="ghost" compact onPress={() => router.push('/packs')} />
        </View>

        {groups.length > 0 ? (
          <View>
            <ScrollView
              ref={(node) => {
                carouselRef.current = node
                  ? { scrollTo: (opts) => node.scrollTo(opts) }
                  : null;
              }}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onCarouselScroll}
              decelerationRate="fast"
            >
              {groups.map((item) => {
                const itemTheme = packTheme(item.definition.slug);
                return (
                  <Pressable
                    key={item.packId}
                    onPress={open}
                    accessibilityRole="button"
                    accessibilityLabel={`Ouvrir le paquet ${item.definition.name}, ${item.userPackIds.length} en stock`}
                    style={[styles.slide, { width: screenWidth }]}
                    testID={item.packId === group?.packId ? 'home-pack' : undefined}
                  >
                    <Animated.View style={[styles.packFloat, floatStyle]}>
                      <PackVisual slug={item.definition.slug} width={PACK_WIDTH} animated={!reduceMotion} />
                    </Animated.View>
                    <Text variant="subheading" color={itemTheme.accent} align="center">
                      Paquet {item.definition.name}
                    </Text>
                    <Text variant="caption" color={colors.textMuted} align="center">
                      {packBlurb(item.definition.slug, item.definition.cards_per_pack)}
                      {item.userPackIds.length > 1 ? ` · ×${item.userPackIds.length}` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {groups.length > 1 ? (
              <View style={styles.dots} accessibilityRole="tablist">
                {groups.map((g, i) => (
                  <Pressable
                    key={g.packId}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: i === selectedIndex }}
                    accessibilityLabel={`Paquet ${g.definition.name}`}
                    onPress={() => {
                      setSelectedIndex(i);
                      carouselRef.current?.scrollTo({ x: screenWidth * i, animated: !reduceMotion });
                    }}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: i === selectedIndex ? packTheme(g.definition.slug).accent : colors.border,
                        transform: [{ scale: i === selectedIndex ? 1.2 : 1 }],
                      },
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyPack}>
            <View style={styles.packEmpty}>
              <PackVisual slug="classique" width={PACK_WIDTH} animated={false} />
            </View>
            <Text color={colors.textMuted} align="center">
              Plus aucun paquet à ouvrir pour le moment
            </Text>
          </View>
        )}

        <Button
          label={group ? 'Ouvrir' : 'Aucun paquet'}
          icon="sparkle"
          onPress={open}
          disabled={!group}
          style={styles.openButton}
          testID="home-open-pack"
        />

        <View
          style={styles.counter}
          accessible
          accessibilityLabel={counterLabel(total, reserveCount, timed.data, nextPackIn)}
        >
          <Text variant="title" align="center">
            {total}
          </Text>
          <Text variant="caption" color={colors.textMuted} align="center">
            paquet{total > 1 ? 's' : ''} à ouvrir
          </Text>
          {timed.data ? (
            <Text variant="caption" color={colors.textMuted} align="center">
              Réserve {Math.min(reserveCount, timed.data.maxStored)} / {timed.data.maxStored}
            </Text>
          ) : null}
          {timed.data && !timed.data.nextAt ? (
            <Text variant="caption" color={colors.gold} align="center">
              Réserve pleine : ouvrez un paquet pour relancer la recharge
            </Text>
          ) : nextPackIn !== null ? (
            <Text variant="caption" color={colors.turquoise} align="center">
              Prochain paquet dans {formatCountdown(nextPackIn)}
            </Text>
          ) : null}
        </View>
        {timed.isError ? <InlineMessage tone="error" message={errorMessage(timed.error)} /> : null}
      </ScrollView>

      {openingPackId ? (
        <View style={styles.openOverlay} accessibilityViewIsModal>
          <OpenPackFlow
            key={openingPackId}
            userPackId={openingPackId}
            autoOpen
            embedded
            onClose={() => setOpeningPackId(null)}
            onFinished={() => setOpeningPackId(null)}
            onRequestNextPack={setOpeningPackId}
          />
        </View>
      ) : null}
    </View>
  );
}

function counterLabel(
  total: number,
  reserveCount: number,
  timed: TimedPacks | undefined,
  nextPackIn: number | null,
): string {
  const packs = `${total} paquet${total > 1 ? 's' : ''} à ouvrir`;
  if (!timed) return packs;
  const reserve = `Réserve ${Math.min(reserveCount, timed.maxStored)} sur ${timed.maxStored}`;
  if (!timed.nextAt) return `${packs}. ${reserve}. Réserve pleine.`;
  if (nextPackIn !== null) return `${packs}. ${reserve}. Prochain paquet dans ${formatCountdown(nextPackIn)}.`;
  return `${packs}. ${reserve}.`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  openOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.night,
    zIndex: 20,
  },
  content: { paddingBottom: spacing.lg, gap: spacing.md, alignItems: 'stretch', flexGrow: 1 },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  slide: {
    alignItems: 'center',
    gap: spacing.sm,
    // Marge pour l’aura du paquet (sinon le ScrollView horizontal la coupe).
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    overflow: 'visible',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  packFloat: { alignItems: 'center', overflow: 'visible' },
  packEmpty: { opacity: 0.35 },
  emptyPack: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
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
});
