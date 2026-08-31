import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/**
 * Leaves an auth screen.
 *
 * The auth screens used to be a gated stack that expo-router swapped out on its
 * own, so they never navigated. Now that they are ordinary routes pushed from
 * the Profile tab, finishing one has to unwind it explicitly.
 *
 * `canGoBack` is checked because these are also reachable by deep link, where
 * there is no history to pop and `back()` would strand the listener on a screen
 * they cannot leave.
 */
export function dismiss(router: Router): void {
  if (router.canGoBack()) router.back();
  else router.replace('/profile');
}
