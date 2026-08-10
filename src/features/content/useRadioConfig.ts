import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { DEFAULT_RADIO_CONFIG } from '@/config/station';
import { db } from '@/services/firebase';
import type { RadioConfig } from '@/types/firestore';

const CACHE_KEY = 'nepaliko:config:radio';

export type ConfigSource = 'live' | 'cache' | 'default';

export interface RadioConfigState {
  config: RadioConfig | null;
  /** `loading` until either the cache or the server answers. */
  status: 'loading' | 'ready' | 'error';
  /** Where the current config came from, so the UI can flag stale data. */
  source: ConfigSource | null;
}

/**
 * Subscribes to `config/radio`.
 *
 * A realtime listener rather than a cached fetch, so `isLive` works as an
 * immediate kill-switch. The Firestore JS SDK has no disk persistence on React
 * Native, so the last good config is mirrored into AsyncStorage — that is what
 * makes a cold start work on a plane or a dead connection.
 *
 * Resolution order is cache → server, with `DEFAULT_RADIO_CONFIG` as a floor if
 * neither answers within `FALLBACK_DELAY_MS`. We deliberately do not seed the
 * default synchronously: that would let a first launch autoplay for a moment
 * before an `isLive: false` kill-switch could arrive and stop it.
 */
const FALLBACK_DELAY_MS = 2500;

export function useRadioConfig(): RadioConfigState {
  const [state, setState] = useState<RadioConfigState>({
    config: null,
    status: 'loading',
    source: null,
  });

  useEffect(() => {
    let cancelled = false;
    let gotServerData = false;

    // Offline first launch has no cache and no server, and would otherwise sit
    // on the spinner forever. Fall through to the bundled config instead.
    const fallbackTimer = setTimeout(() => {
      if (cancelled) return;
      setState((prev) =>
        prev.config ? prev : { config: DEFAULT_RADIO_CONFIG, status: 'ready', source: 'default' }
      );
    }, FALLBACK_DELAY_MS);

    // Paint from cache first; the listener overwrites it moments later.
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (cancelled || gotServerData || !raw) return;
        setState({ config: JSON.parse(raw) as RadioConfig, status: 'ready', source: 'cache' });
      })
      .catch(() => {
        // A broken cache is not worth surfacing; the listener is the real path.
      });

    const unsubscribe = onSnapshot(
      doc(db, 'config', 'radio'),
      (snapshot) => {
        if (cancelled) return;
        gotServerData = true;

        if (!snapshot.exists()) {
          setState({ config: DEFAULT_RADIO_CONFIG, status: 'ready', source: 'default' });
          return;
        }

        const { updatedAt, ...rest } = snapshot.data() as RadioConfig;
        const config = rest as RadioConfig;

        setState({ config, status: 'ready', source: 'live' });
        // `updatedAt` is a Timestamp and does not survive JSON; drop it.
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(config)).catch(() => {});
      },
      () => {
        if (cancelled) return;
        // Keep serving cached config if we have it; otherwise the bundled one.
        setState((prev) =>
          prev.config
            ? { ...prev, source: 'cache' }
            : { config: DEFAULT_RADIO_CONFIG, status: 'ready', source: 'default' }
        );
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  return state;
}
