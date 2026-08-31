import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Push notifications, over FCM topics.
 *
 * Three topics rather than one, because importance is the whole point: if a
 * flood warning arrives through the same channel as "new blog post", people
 * mute the channel and are then unreachable when it matters. Each topic maps to
 * an Android notification channel with its own importance, so the OS treats
 * them differently even before the listener touches a setting.
 *
 * Subscription happens on the device — `subscribeToTopicAsync` is Android-only
 * and talks to FCM directly, so no server is involved in who receives what. The
 * one server endpoint exists purely to *send*, because that needs a service
 * account credential that must never reach a client.
 *
 * Deliberately independent of accounts: notifications are requested on first
 * launch, not at signup, and a signed-out listener gets alerts like anyone else.
 */

const PREFS_KEY = 'nepaliko:notificationPrefs';

/** The FCM topics. These strings are the contract with the admin panel. */
export const TOPICS = ['alerts', 'all', 'news'] as const;
export type Topic = (typeof TOPICS)[number];

export type NotificationPrefs = Record<Topic, boolean>;

/**
 * `news` is the only one off by default.
 *
 * Emergency alerts and station announcements are the reason someone installs a
 * local radio app; a per-post notification is not, and defaulting it on is how
 * an app teaches people to disable the lot.
 */
export const DEFAULT_PREFS: NotificationPrefs = { alerts: true, all: true, news: false };

/** Android channel definitions. The importance is what the OS actually honours. */
const CHANNELS: Record<
  Topic,
  { name: string; description: string; importance: Notifications.AndroidImportance }
> = {
  alerts: {
    name: 'Emergency alerts',
    description: 'Earthquake, flood and other official public-safety warnings.',
    // MAX is what produces a heads-up notification with sound. Anything lower
    // can be silently collapsed into the shade, which defeats the purpose.
    importance: Notifications.AndroidImportance.MAX,
  },
  all: {
    name: 'Station announcements',
    description: 'When we go live, schedule changes and station news.',
    importance: Notifications.AndroidImportance.DEFAULT,
  },
  news: {
    name: 'New posts',
    description: 'A notification each time an article is published.',
    importance: Notifications.AndroidImportance.LOW,
  },
};

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Only the alerts channel makes noise in the foreground. Someone already
    // looking at the app does not need a sound for a new blog post.
    const topic = topicOf(notification.request.content.data);
    return {
      shouldPlaySound: topic === 'alerts',
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

/** Reads the topic a message was sent to, tolerating anything malformed. */
export function topicOf(data: unknown): Topic | null {
  if (typeof data !== 'object' || data === null) return null;
  const value = (data as { topic?: unknown }).topic;
  return TOPICS.includes(value as Topic) ? (value as Topic) : null;
}

export async function loadPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    // A corrupt blob must not cost someone their emergency alerts.
    return DEFAULT_PREFS;
  }
}

export async function savePrefs(prefs: NotificationPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
}

/**
 * Creates the Android channels.
 *
 * Must run before any token or subscription call — the OS ties a notification
 * to its channel at delivery, and a message naming a channel that does not
 * exist yet is delivered at default importance instead.
 */
async function ensureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Promise.all(
    TOPICS.map((topic) =>
      Notifications.setNotificationChannelAsync(topic, {
        name: CHANNELS[topic].name,
        description: CHANNELS[topic].description,
        importance: CHANNELS[topic].importance,
      })
    )
  );
}

/**
 * Asks for permission, creating the channels first.
 *
 * Android 13+ shows the OS prompt on `requestPermissionsAsync`; earlier
 * versions grant it implicitly. Returns whether we may post notifications.
 */
export async function requestPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;

  await ensureChannels();

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  // `canAskAgain` false means the listener has denied it for good; asking again
  // is a no-op that returns denied, so skip the round trip.
  if (!existing.canAskAgain) return false;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Applies a set of preferences to FCM.
 *
 * Every topic is explicitly subscribed or unsubscribed rather than only the
 * changed one: subscriptions live on FCM's servers, not on the device, so a
 * reinstall or a failed call earlier can leave them out of step with what the
 * listener last chose. Reasserting all three on launch makes the stored
 * preference the single source of truth.
 *
 * Individual failures are swallowed. One topic failing to subscribe must not
 * stop the other two — least of all `alerts`.
 */
export async function applyTopics(prefs: NotificationPrefs): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Promise.all(
    TOPICS.map(async (topic) => {
      try {
        if (prefs[topic]) await Notifications.subscribeToTopicAsync(topic);
        else await Notifications.unsubscribeFromTopicAsync(topic);
      } catch {
        // Offline, or FCM not reachable. The next launch reasserts it.
      }
    })
  );
}

/**
 * The first-launch path: channels, permission, then subscriptions.
 *
 * Returns the preferences actually in force, so a caller that was denied
 * permission can reflect that rather than showing toggles that do nothing.
 */
export async function initNotifications(): Promise<{
  granted: boolean;
  prefs: NotificationPrefs;
}> {
  const prefs = await loadPrefs();

  const granted = await requestPermission();
  if (!granted) return { granted, prefs };

  await applyTopics(prefs);
  return { granted, prefs };
}

/** Persists a preference change and pushes it straight to FCM. */
export async function setTopicEnabled(
  prefs: NotificationPrefs,
  topic: Topic,
  enabled: boolean
): Promise<NotificationPrefs> {
  const next = { ...prefs, [topic]: enabled };
  await savePrefs(next);
  await applyTopics(next);
  return next;
}
