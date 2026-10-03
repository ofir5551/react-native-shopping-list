import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';

export type FeaturePromptReason = 'ai' | 'share' | 'join';
export type SignUpPromptReason = 'first' | 'periodic' | FeaturePromptReason;

const SHOWN_AT_KEY = '@shopping-list/signup-prompt-shown-at';
const PERIODIC_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

// A future timestamp means the device clock moved back — treat it as due.
export const isPeriodicPromptDue = (lastShownAt: number | null, now: number) =>
  lastShownAt === null || lastShownAt > now || now - lastShownAt >= PERIODIC_INTERVAL_MS;

// Missing, corrupted or unreadable values all count as "never shown".
const readLastShownAt = async (): Promise<number | null> => {
  try {
    const value = Number(await AsyncStorage.getItem(SHOWN_AT_KEY));
    return value > 0 ? value : null;
  } catch {
    return null;
  }
};

export const useSignUpPrompt = (isHydrated: boolean) => {
  const { user } = useAuth();
  const isGuest = user?.is_anonymous === true;
  const [reason, setReason] = useState<SignUpPromptReason | null>(null);
  const reasonRef = useRef(reason);
  reasonRef.current = reason;

  useEffect(() => {
    if (!isHydrated || !isGuest) {
      setReason(null);
      return;
    }
    let cancelled = false;

    const check = async () => {
      const lastShownAt = await readLastShownAt();
      const now = Date.now();
      if (cancelled || reasonRef.current !== null || !isPeriodicPromptDue(lastShownAt, now)) return;
      setReason(lastShownAt === null ? 'first' : 'periodic');
      AsyncStorage.setItem(SHOWN_AT_KEY, String(now)).catch(() => {});
    };

    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [isHydrated, isGuest]);

  return {
    reason,
    promptSignUp: (next: FeaturePromptReason) => setReason(next),
    dismiss: () => setReason(null),
  };
};
