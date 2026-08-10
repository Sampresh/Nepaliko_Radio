import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Same Firebase project as the mobile app. These values are public by design;
 * Firestore rules and the `admins/{uid}` roster are what actually gate writes.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyA3_SW1GQrPR03ver6dH8IHb7xjyHrQbW0',
  authDomain: 'nepaliko-radio.firebaseapp.com',
  projectId: 'nepaliko-radio',
  storageBucket: 'nepaliko-radio.firebasestorage.app',
  messagingSenderId: '978827989375',
  appId: '1:978827989375:web:f3f7c82f815772b1324a4a',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * The SDK default is two minutes of retries. When Storage has not been set up on
 * the project every call burns that full window before failing, which reads as a
 * hung page rather than a misconfiguration. Fail fast enough to show a message.
 */
storage.maxOperationRetryTime = 10_000;
storage.maxUploadRetryTime = 30_000;
