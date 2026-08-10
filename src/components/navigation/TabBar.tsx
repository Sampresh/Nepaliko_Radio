import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { Colors, MinTouchTarget, Spacing } from '@/theme';

interface TabDef {
  href: '/' | '/social' | '/news' | '/connect';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabDef[] = [
  { href: '/', label: 'Listen', icon: 'radio-outline', activeIcon: 'radio' },
  { href: '/social', label: 'Social', icon: 'play-circle-outline', activeIcon: 'play-circle' },
  { href: '/news', label: 'News', icon: 'newspaper-outline', activeIcon: 'newspaper' },
  { href: '/connect', label: 'Connect', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
];

/**
 * Hand-rolled tab bar rather than the stock one: the mini player has to sit
 * directly above it, and the dark palette needs exact control.
 */
export function TabBar({ bottomInset }: { bottomInset: number }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, Spacing.sm) }]}>
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Pressable
            key={tab.href}
            onPress={() => router.navigate(tab.href)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            style={styles.tab}>
            <Ionicons
              name={isActive ? tab.activeIcon : tab.icon}
              size={22}
              color={isActive ? Colors.primary : Colors.textSecondary}
            />
            <AppText
              variant="caption"
              weight={isActive ? 'semibold' : 'regular'}
              color={isActive ? Colors.primary : Colors.textSecondary}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  tab: {
    flex: 1,
    minHeight: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
});
