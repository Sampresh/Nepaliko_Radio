import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/theme';
import type { StationLink } from '@/types/firestore';

/** Maps the admin-supplied `icon` key onto a real glyph. */
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  facebook: 'logo-facebook',
  youtube: 'logo-youtube',
  instagram: 'logo-instagram',
  tiktok: 'musical-notes',
  twitter: 'logo-twitter',
  website: 'globe-outline',
  phone: 'call',
  email: 'mail',
  whatsapp: 'logo-whatsapp',
};

function iconFor(link: StationLink): keyof typeof Ionicons.glyphMap {
  if (link.icon && ICONS[link.icon]) return ICONS[link.icon];
  if (link.url.startsWith('tel:')) return 'call';
  if (link.url.startsWith('mailto:')) return 'mail';
  return 'open-outline';
}

async function open(url: string) {
  // tel: and mailto: must go to the OS; http(s) opens in the in-app browser.
  if (/^https?:\/\//i.test(url)) {
    await WebBrowser.openBrowserAsync(url).catch(() => {});
    return;
  }
  const supported = await Linking.canOpenURL(url).catch(() => false);
  if (supported) await Linking.openURL(url).catch(() => {});
}

export function LinkRow({ link }: { link: StationLink }) {
  return (
    <Pressable
      onPress={() => open(link.url)}
      accessibilityRole="link"
      accessibilityLabel={link.label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconFor(link)} size={18} color={Colors.primary} />
      </View>
      <AppText variant="body" style={styles.label}>
        {link.label}
      </AppText>
      <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: MinTouchTarget,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
});
