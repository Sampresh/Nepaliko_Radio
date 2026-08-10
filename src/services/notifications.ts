import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { db } from '@/services/firebase';

const PREFS_KEY = 'nepaliko:notificationPrefs';

export interface NotificationPrefs {
  news: boolean;
  liveAlerts: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = { news: true, liveAlerts: true };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function loadPrefs(): Promise<NotificationPrefs> {
  const raw = await AsyncStorage.getItem(PREFS_KEY);
  return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
}

export async function savePrefs(prefs: NotificationPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

/**
 * Registers for push and mirrors the token into `devices/{token}`.
 *
 * Topics are not FCM topics — the Expo push service has no topic concept. The
 * sender (a Cloud Function) queries this collection by preference flag instead,
 * which also lets a listener opt out without an app update.
 *
 * Returns null on a simulator, when permission is denied, or before
 * `eas init` has written a project id.
 */
export async function registerForPush(prefs: NotificationPrefs): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Station updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    await setDoc(
      doc(db, 'devices', token),
      {
        token,
        platform: Platform.OS,
        news: prefs.news,
        liveAlerts: prefs.liveAlerts,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return token;
  } catch {
    return null;
  }
}

/** Updates the stored preferences for an already-registered device. */
export async function updateDevicePrefs(
  token: string,
  prefs: NotificationPrefs
): Promise<void> {
  await setDoc(
    doc(db, 'devices', token),
    { ...prefs, updatedAt: serverTimestamp() },
    { merge: true }
  ).catch(() => {});
}
