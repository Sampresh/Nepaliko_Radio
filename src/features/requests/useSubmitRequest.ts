import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useCallback, useState } from 'react';

import type { RequestInput } from '@/features/requests/schema';
import { db } from '@/services/firebase';

const DEVICE_KEY = 'nepaliko:deviceHash';
const SENT_KEY = 'nepaliko:requestTimestamps';

/** Client-side throttle. The authoritative limit lands in a Cloud Function. */
const MAX_PER_HOUR = 3;
const HOUR = 60 * 60 * 1000;

/**
 * A stable anonymous id for this install. Not tied to any device identifier —
 * it is a random value we generate once, used only to group submissions for
 * rate limiting.
 */
async function getDeviceHash(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) return existing;

  const created = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_KEY, created);
  return created;
}

async function recentSubmissionCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(SENT_KEY);
  const timestamps: number[] = raw ? JSON.parse(raw) : [];
  return timestamps.filter((t) => Date.now() - t < HOUR).length;
}

async function recordSubmission() {
  const raw = await AsyncStorage.getItem(SENT_KEY);
  const timestamps: number[] = raw ? JSON.parse(raw) : [];
  const fresh = [...timestamps.filter((t) => Date.now() - t < HOUR), Date.now()];
  await AsyncStorage.setItem(SENT_KEY, JSON.stringify(fresh));
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export function useSubmitRequest() {
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (input: RequestInput) => {
    setError(null);
    setState('submitting');

    try {
      if ((await recentSubmissionCount()) >= MAX_PER_HOUR) {
        setError('You have sent a few messages already. Please try again later.');
        setState('error');
        return false;
      }

      // Field set must match the rule's hasOnly list exactly.
      await addDoc(collection(db, 'requests'), {
        type: input.type,
        name: input.name.trim(),
        message: input.message.trim(),
        contact: input.contact?.trim() ?? '',
        status: 'new',
        createdAt: serverTimestamp(),
        deviceHash: await getDeviceHash(),
      });

      await recordSubmission();
      setState('success');
      return true;
    } catch {
      setError('Could not send your message. Check your connection and try again.');
      setState('error');
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

  return { submit, reset, state, error };
}
