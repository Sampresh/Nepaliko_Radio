import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { Colors, MinTouchTarget, Radius } from '@/theme';

/**
 * The profile control in the Home header.
 *
 * One button in both states, at one size, so the header never reflows when a
 * session is restored a moment after launch — the signed-out and signed-in
 * versions differ only in what is drawn inside the same circle.
 *
 * It navigates rather than opening a sheet. Sign-in lives on its own screen and
 * profile details live on the Profile tab; a third surface here would be a
 * third place to keep in step.
 */
export function ProfileButton() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const signedIn = !!user;
  const name = profile?.name ?? user?.displayName ?? '';
  const photo = user?.photoURL ?? null;

  return (
    <Pressable
      onPress={() => router.push(signedIn ? '/profile' : '/sign-in')}
      accessibilityRole="button"
      accessibilityLabel={signedIn ? 'Your profile' : 'Sign in'}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      {signedIn ? (
        photo ? (
          <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.inner, styles.innerSignedIn]}>
            <AppText variant="small" weight="bold">
              {initialOf(name)}
            </AppText>
          </View>
        )
      ) : (
        <View style={[styles.inner, styles.innerSignedOut]}>
          <Ionicons name="person-outline" size={19} color={Colors.textSecondary} />
        </View>
      )}

      {/*
        Signals that there is something to do here without spelling it out.
        Absolutely positioned so adding or removing it cannot move the button —
        the badge appearing must not nudge the header.
      */}
      {!signedIn && <View style={styles.badge} />}
    </Pressable>
  );
}

/** First letter of the name, or a neutral mark when there is nothing to use. */
function initialOf(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '•';
}

const styles = StyleSheet.create({
  button: {
    // The circle is 40, but the pressable is a full touch target so the corner
    // of the screen is not a near-miss.
    width: MinTouchTarget,
    height: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  innerSignedIn: {
    backgroundColor: Colors.primary,
  },
  innerSignedOut: {
    backgroundColor: Colors.surface,
  },
  photo: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  badge: {
    position: 'absolute',
    // Sits on the circle's edge, inside the larger touch target.
    top: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBright,
    // Rings the dot in the page background so it reads as separate from the
    // button rather than a smudge on its rim.
    borderWidth: 2,
    borderColor: Colors.background,
  },
  pressed: {
    opacity: 0.7,
  },
});
