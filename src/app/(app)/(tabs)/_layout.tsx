import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, Icon, MIN_TOUCH, spacing, Text, type IconName } from '@/design-system';
import { useHaptics } from '@/lib/haptics';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Accueil', icon: 'home' },
  world: { label: 'Monde', icon: 'globe' },
  collection: { label: 'Collection', icon: 'cards' },
  friends: { label: 'Amis', icon: 'friends' },
};

function AtlasTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const haptic = useHaptics();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? colors.turquoise : colors.textMuted;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            testID={`tab-${route.name}`}
            style={styles.tab}
            onPress={() => {
              if (focused) return;
              haptic('tap');
              navigateToTab(route.key);
            }}
          >
            <View style={[styles.indicator, focused && styles.indicatorActive]} />
            <Icon name={tab.icon} color={color} size={24} />
            <Text variant="caption" color={color}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AtlasTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.night } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="world" />
      <Tabs.Screen name="collection" />
      <Tabs.Screen name="friends" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.nightDeep,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: MIN_TOUCH + 8 },
  indicator: { width: 24, height: 3, borderRadius: 2, marginBottom: 4, backgroundColor: 'transparent' },
  indicatorActive: { backgroundColor: colors.turquoise },
});
