import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';

export type FeaturePromptReason = 'ai' | 'share' | 'join';
export type SignUpPromptReason = 'first' | 'periodic' | FeaturePromptReason;

const SHOWN_AT_KEY = '@shopping-list/signup-prompt-shown-at';
const OPTED_OUT_KEY = '@shopping-list/signup-prompt-opted-out';
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

// Unreadable storage counts as "not opted out" — showing once too often beats never.
const readOptedOut = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(OPTED_OUT_KEY)) === 'true';
  } catch {
    return false;
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
      const [optedOut, lastShownAt] = await Promise.all([readOptedOut(), readLastShownAt()]);
      const now = Date.now();
      if (cancelled || optedOut || reasonRef.current !== null || !isPeriodicPromptDue(lastShownAt, now)) return;
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
    // Opting out stops only the automatic prompts; feature prompts still explain why AI/share/join are locked.
    dismiss: (dontShowAgain = false) => {
      setReason(null);
      if (dontShowAgain) AsyncStorage.setItem(OPTED_OUT_KEY, 'true').catch(() => {});
    },
  };
};
