import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase web config is public by design — it identifies the project, it does
 * not authorise anything. Access is enforced by Firestore security rules and
 * App Check, never by hiding these values.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyA3_SW1GQrPR03ver6dH8IHb7xjyHrQbW0',
  authDomain: 'nepaliko-radio.firebaseapp.com',
  projectId: 'nepaliko-radio',
  storageBucket: 'nepaliko-radio.firebasestorage.app',
  messagingSenderId: '978827989375',
  appId: '1:978827989375:web:f3f7c82f815772b1324a4a',
};

// Guard against re-initialisation across Fast Refresh.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * `getReactNativePersistence` exists only in the React Native build of
 * `@firebase/auth`, which Metro selects through that package's `react-native`
 * export condition. The umbrella `firebase/auth` types describe the browser
 * build, so the symbol is real at runtime but invisible to TypeScript — hence
 * the require and the hand-written signature.
 */
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

/**
 * Without an explicit persistence the SDK falls back to in-memory storage and
 * every cold start signs the listener out again. AsyncStorage is what makes the
 * session survive an app restart.
 *
 * The catch is narrowed to `auth/already-initialized` on purpose. It exists for
 * Fast Refresh, which re-runs this module against an app that already holds an
 * Auth instance — and `getAuth` there returns the instance that was built with
 * persistence, so nothing is lost. A blanket catch would also swallow a real
 * persistence failure and hand back an in-memory Auth, turning "stay signed in"
 * into "sign in on every launch" with no error anywhere to explain it.
 */
function createAuth(): Auth {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';
    if (code !== 'auth/already-initialized') throw error;
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
export default app;
