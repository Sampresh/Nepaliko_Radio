import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase web config is public by design — it identifies the project, it does
 * not authorise anything. Access is enforced by Firestore security rules and
 * App Check, never by hiding these values.
 *
 * Auth is deliberately absent: the app has no user accounts and never writes
 * to a collection that requires them. Auth lives only in the admin panel.
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

export const db = getFirestore(app);
export default app;
