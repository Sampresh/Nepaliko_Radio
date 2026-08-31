import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { captureError } from '@/services/monitoring';
import { initNotifications } from '@/services/notifications';

/**
 * Sets notifications up on launch and routes taps.
 *
 * Mounted once from the root layout, above the auth gate that no longer exists
 * — notifications are deliberately independent of accounts, so a listener who
 * never signs in still gets emergency alerts.
 *
 * Two tap paths, and both are needed. `useLastNotificationResponse` covers the
 * cold start, where the tap happened before any listener could be attached and
 * the response is replayed to the first render. The subscription covers taps
 * while the app is already running, which the hook does not re-report.
 */
export function useNotifications(): void {
  const router = useRouter();
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    initNotifications().catch((error: unknown) =>
      captureError(error, 'notifications.init')
    );
  }, []);

  // The cold-start response is replayed on every render until it is superseded,
  // so without this the same notification would re-navigate on each re-render,
  // yanking the listener back if they had already browsed elsewhere.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!lastResponse) return;

    const id = lastResponse.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;

    openFrom(lastResponse.notification.request.content.data, router);
  }, [lastResponse, router]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const id = response.notification.request.identifier;
      if (handled.current === id) return;
      handled.current = id;

      openFrom(response.notification.request.content.data, router);
    });

    return () => subscription.remove();
  }, [router]);
}

/**
 * Follows a notification's `link`, if it carries one.
 *
 * Only in-app paths are honoured. A push payload is attacker-influenced in the
 * general case, and handing an arbitrary URL to the router is how a
 * notification ends up opening something the app never intended — so anything
 * that is not a plain `/path` is ignored rather than sanitised.
 */
function openFrom(data: unknown, router: ReturnType<typeof useRouter>): void {
  if (typeof data !== 'object' || data === null) return;

  const link = (data as { link?: unknown }).link;
  if (typeof link !== 'string' || !link.startsWith('/') || link.startsWith('//')) return;

  try {
    router.push(link as Parameters<typeof router.push>[0]);
  } catch (error) {
    captureError(error, 'notifications.openLink');
  }
}
