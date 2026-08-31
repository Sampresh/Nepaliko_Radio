import * as Sentry from '@sentry/react-native';

/**
 * Crash reporting. The DSN is supplied at build time via EAS env vars, not
 * committed — an unset DSN simply leaves Sentry disabled rather than crashing.
 */
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initMonitoring() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    // Never ship debug logging; keep a modest trace sample in production.
    debug: false,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enabled: !__DEV__,
    // Listener messages and contact details must not leave the device.
    sendDefaultPii: false,
  });
}

export const wrapRootComponent = dsn ? Sentry.wrap : <T,>(component: T) => component;

/**
 * Reports a failure that the app deliberately swallowed.
 *
 * For paths where degrading quietly is the right product behaviour but silence
 * would hide a real misconfiguration — a security rule that rejects a write,
 * say — the user sees nothing and this is the only trace left.
 */
export function captureError(error: unknown, context: string) {
  if (__DEV__) console.warn(`[${context}]`, error);
  if (!dsn) return;
  Sentry.captureException(error, { tags: { context } });
}
