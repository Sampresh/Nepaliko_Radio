import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { usePlayer } from '@/features/player/PlayerProvider';
import {
  loadPromptState,
  recordDismissed,
  recordListening,
  recordOpen,
  recordShown,
  recordSignedIn,
  shouldPrompt,
} from '@/features/auth/signInPrompt';

/**
 * Decides when the sign-in sheet appears, and counts what it needs to decide.
 *
 * Listening time is measured here rather than in the player because it is only
 * ever needed for this: the player has no reason to know about a sign-in
 * prompt, and threading a counter through it would couple the two.
 */
export function useSignInPrompt(): { visible: boolean; dismiss: () => void; accept: () => void } {
  const { user } = useAuth();
  const { isPlaying } = usePlayer();
  const [visible, setVisible] = useState(false);

  // Once shown it stays shown until answered, so a re-render mid-song cannot
  // dismiss it, and a state refresh cannot show it a second time.
  const settled = useRef(false);

  // Wall-clock start of the current stretch of playback, or null when stopped.
  const playingSince = useRef<number | null>(null);

  useEffect(() => {
    recordOpen().catch(() => {});
  }, []);

  // Signing in ends this for good — including a sign-in that happened on an
  // earlier launch, since the flag is persisted.
  useEffect(() => {
    if (!user) return;
    setVisible(false);
    settled.current = true;
    recordSignedIn().catch(() => {});
  }, [user]);

  /** Banks the current stretch and re-evaluates. */
  const flush = useRef(async () => {});
  flush.current = async () => {
    const started = playingSince.current;
    playingSince.current = started === null ? null : Date.now();

    const state = started === null
      ? await loadPromptState()
      : await recordListening(Date.now() - started);

    if (settled.current || user) return;
    if (!shouldPrompt(state)) return;

    settled.current = true;
    setVisible(true);
    await recordShown();
  };

  useEffect(() => {
    if (isPlaying) {
      playingSince.current = Date.now();
      return;
    }

    // Stopped: bank whatever was accumulated and check the thresholds.
    void flush.current();
    playingSince.current = null;
  }, [isPlaying]);

  // Backgrounding ends the measurable stretch — the stream may keep playing,
  // but a prompt that appears while the phone is in a pocket is wasted, and the
  // time would otherwise never be banked at all for a listener who never stops.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' || playingSince.current === null) return;
      void flush.current();
    });
    return () => subscription.remove();
  }, []);

  // A long uninterrupted listen would otherwise never cross a threshold,
  // because nothing banks the time until playback stops.
  useEffect(() => {
    const timer = setInterval(() => {
      if (playingSince.current !== null) void flush.current();
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  return {
    visible,
    dismiss: () => {
      setVisible(false);
      recordDismissed().catch(() => {});
    },
    accept: () => setVisible(false),
  };
}
