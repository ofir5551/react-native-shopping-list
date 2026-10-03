# Guest Sign-Up Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show guests a full-screen prompt listing the benefits of registering — on first launch, every 3 days after, and whenever they tap AI, photo, share or join — with one-tap Google sign-in on the prompt itself.

**Architecture:** A `useSignUpPrompt` hook owns the prompt's open reason and the 3-day cadence (timestamp in AsyncStorage). `HomeScreen` calls the hook and renders one `SignUpPromptModal` over the Lists and List screens. Feature gates live where the actions are triggered (`ShoppingListScreen` for AI/photo/share, `HomeScreen` for join). Google sign-in is extracted from `AuthScreen` into a `GoogleSignInButton` component used by both screens.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, TypeScript, Supabase JS, AsyncStorage, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-10-03-signup-prompt-design.md`

**Deviation from spec (intentional, smaller):** the spec names a `useGoogleSignIn` hook. This plan extracts a `GoogleSignInButton` component instead (logic + button + error text in one place), which removes the duplicated ~25-line button style that a hook alone would leave in both screens.

## Global Constraints

- Guests only: the prompt never opens for a registered user (`user.is_anonymous !== true`).
- Periodic interval: exactly `3 * 24 * 60 * 60 * 1000` ms.
- Storage key: `@shopping-list/signup-prompt-shown-at` (new). Never read or write the frozen keys `@shopping_lists`, `@shopping_route`, `@sync_dirty_ids`, `@sync_pending_deletes`, `@shopping_saved_sets`.
- Feature prompts (`ai`, `share`, `join`) never read or write the stored timestamp.
- All UI strings via `t('key')` from `useLocale()`. Every new key goes in both `src/i18n/translations/en.ts` and `src/i18n/translations/he.ts` (`he` is typed `Record<TranslationKey, string>`, so a missing key fails `tsc`).
- RTL: no manual left/right overrides; `I18nManager.forceRTL()` handles mirroring. Verify in Hebrew.
- Delete dead code (unused props, imports, branches, translation keys) — never comment it out.
- Commits: no `Co-Authored-By` line (user preference).
- `npm test` must pass after every task.
- Type check: `npx tsc --noEmit 2>&1 | grep -v "^supabase/" | grep -c "error TS"` is **9** before this work (pre-existing errors in `useShoppingListsApp.ts`, `HomeScreen.tsx` `hasOverlayChanges`, and test fixtures). It must stay **9** — never higher.

## Review Focus

1. Guest signs in with Google (native) while the prompt is open → prompt closes by itself. Test: Task 1, "closes the prompt when the guest signs in".
2. Stored timestamp is corrupted (non-numeric) → treated as never shown, not "never show again". Test: Task 1, "treats a corrupted stored value as never shown".
3. Device clock moved backwards (stored time is in the future) → prompt is not suppressed until the clock catches up. Test: Task 1, `isPeriodicPromptDue` "is due when last shown is in the future".
4. A feature prompt is open when the periodic check fires → the feature headline stays and no time is recorded. Test: Task 1, "keeps an open feature prompt when the periodic check fires".
5. AsyncStorage read throws → prompt behaves as never shown. Test: Task 1, "still shows when storage read fails".

---

### Task 1: `useSignUpPrompt` hook

**Files:**
- Create: `src/hooks/useSignUpPrompt.ts`
- Test: `src/hooks/useSignUpPrompt.test.ts`

**Interfaces:**
- Consumes: `useAuth()` from `src/context/AuthContext.tsx` → `{ user: User | null, ... }` (Supabase `User`, has `is_anonymous?: boolean`).
- Produces:
  - `export type FeaturePromptReason = 'ai' | 'share' | 'join';`
  - `export type SignUpPromptReason = 'first' | 'periodic' | FeaturePromptReason;`
  - `export const isPeriodicPromptDue: (lastShownAt: number | null, now: number) => boolean;`
  - `export const useSignUpPrompt: (isHydrated: boolean) => { reason: SignUpPromptReason | null; promptSignUp: (reason: FeaturePromptReason) => void; dismiss: () => void; }`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useSignUpPrompt.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAuth } from '../context/AuthContext';
import { isPeriodicPromptDue, useSignUpPrompt } from './useSignUpPrompt';

jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));

const DAY = 24 * 60 * 60 * 1000;
const KEY = '@shopping-list/signup-prompt-shown-at';
const mockUseAuth = useAuth as jest.Mock;
const guest = { user: { id: 'anon-1', is_anonymous: true } };
const registered = { user: { id: 'user-1', is_anonymous: false } };

// Let pending AsyncStorage promises and state updates settle.
const flush = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

describe('isPeriodicPromptDue', () => {
  const now = 100 * DAY;

  it('is due when never shown', () => {
    expect(isPeriodicPromptDue(null, now)).toBe(true);
  });

  it('is not due one minute before 3 days', () => {
    expect(isPeriodicPromptDue(now - 3 * DAY + 60_000, now)).toBe(false);
  });

  it('is due at exactly 3 days', () => {
    expect(isPeriodicPromptDue(now - 3 * DAY, now)).toBe(true);
  });

  it('is due well after 3 days', () => {
    expect(isPeriodicPromptDue(now - 30 * DAY, now)).toBe(true);
  });

  it('is due when last shown is in the future (clock moved back)', () => {
    expect(isPeriodicPromptDue(now + DAY, now)).toBe(true);
  });
});

describe('useSignUpPrompt', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(guest);
  });

  it('shows the first-launch prompt to a new guest and records the time', async () => {
    const { result } = renderHook(() => useSignUpPrompt(true));

    await waitFor(() => expect(result.current.reason).toBe('first'));
    expect(Number(await AsyncStorage.getItem(KEY))).toBeGreaterThan(0);
  });

  it('shows the periodic prompt when last shown 3+ days ago', async () => {
    await AsyncStorage.setItem(KEY, String(Date.now() - 4 * DAY));
    const { result } = renderHook(() => useSignUpPrompt(true));

    await waitFor(() => expect(result.current.reason).toBe('periodic'));
  });

  it('does not show when last shown 1 day ago', async () => {
    await AsyncStorage.setItem(KEY, String(Date.now() - DAY));
    const { result } = renderHook(() => useSignUpPrompt(true));

    await flush();
    expect(result.current.reason).toBeNull();
  });

  it('never shows to registered users', async () => {
    mockUseAuth.mockReturnValue(registered);
    const { result } = renderHook(() => useSignUpPrompt(true));

    await flush();
    expect(result.current.reason).toBeNull();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('never shows when there is no user (offline first launch)', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useSignUpPrompt(true));

    await flush();
    expect(result.current.reason).toBeNull();
  });

  it('waits for hydration', async () => {
    const { result } = renderHook(() => useSignUpPrompt(false));

    await flush();
    expect(result.current.reason).toBeNull();
  });

  it('treats a corrupted stored value as never shown', async () => {
    await AsyncStorage.setItem(KEY, 'garbage');
    const { result } = renderHook(() => useSignUpPrompt(true));

    await waitFor(() => expect(result.current.reason).toBe('first'));
  });

  it('still shows when storage read fails', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disk error'));
    const { result } = renderHook(() => useSignUpPrompt(true));

    await waitFor(() => expect(result.current.reason).toBe('first'));
  });

  it('opens for a feature reason and dismisses', async () => {
    await AsyncStorage.setItem(KEY, String(Date.now() - DAY));
    const { result } = renderHook(() => useSignUpPrompt(true));
    await flush();

    act(() => result.current.promptSignUp('ai'));
    expect(result.current.reason).toBe('ai');

    act(() => result.current.dismiss());
    expect(result.current.reason).toBeNull();
  });

  it('does not record a time for feature prompts', async () => {
    const stored = String(Date.now() - DAY);
    await AsyncStorage.setItem(KEY, stored);
    const { result } = renderHook(() => useSignUpPrompt(true));
    await flush();

    act(() => result.current.promptSignUp('share'));
    await flush();
    expect(await AsyncStorage.getItem(KEY)).toBe(stored);
  });

  it('keeps an open feature prompt when the periodic check fires', async () => {
    const stored = String(Date.now() - 4 * DAY);
    await AsyncStorage.setItem(KEY, stored);
    const { result } = renderHook(() => useSignUpPrompt(true));

    // Open a feature prompt before the periodic check's storage read resolves.
    act(() => result.current.promptSignUp('join'));
    await flush();

    expect(result.current.reason).toBe('join');
    expect(await AsyncStorage.getItem(KEY)).toBe(stored);
  });

  it('closes the prompt when the guest signs in', async () => {
    const { result, rerender } = renderHook(() => useSignUpPrompt(true));
    await waitFor(() => expect(result.current.reason).toBe('first'));

    mockUseAuth.mockReturnValue(registered);
    rerender({});

    expect(result.current.reason).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/hooks/useSignUpPrompt.test.ts`
Expected: FAIL — `Cannot find module './useSignUpPrompt'`.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/useSignUpPrompt.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/hooks/useSignUpPrompt.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Run the full suite and type check**

Run: `npm test` → all suites pass.
Run: `npx tsc --noEmit 2>&1 | grep -v "^supabase/" | grep -c "error TS"` → `9`.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useSignUpPrompt.ts src/hooks/useSignUpPrompt.test.ts
git commit -m "feat(signup-prompt): add useSignUpPrompt hook with 3-day guest cadence"
```

---

### Task 2: Extract `GoogleSignInButton` from `AuthScreen`

Pure refactor — `AuthScreen` must look and behave the same, except the email buttons are no longer disabled while Google sign-in is loading (on native the browser sheet covers them; on web the page redirects).

**Files:**
- Create: `src/components/GoogleSignInButton.tsx`
- Modify: `src/screens/AuthScreen.tsx`

**Interfaces:**
- Consumes: `supabase` from `src/supabase`, `useToast`, `useTheme`, `useAppStyles`, `useLocale`.
- Produces: `export const GoogleSignInButton: ({ onSuccess }: { onSuccess: () => void }) => JSX.Element` — renders the Google button and, below it, any sign-in error. Shows the `login.signedIn` toast and calls `onSuccess` after a native sign-in. On web, `signInWithOAuth` redirects the page, so `onSuccess` is not called.

- [ ] **Step 1: Create the component**

Create `src/components/GoogleSignInButton.tsx` (the OAuth logic and button styles are moved verbatim from `AuthScreen.tsx`):

```tsx
import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useLocale } from '../i18n/LocaleContext';
import { supabase } from '../supabase';

WebBrowser.maybeCompleteAuthSession();

type GoogleSignInButtonProps = {
    onSuccess: () => void;
};

export const GoogleSignInButton = ({ onSuccess }: GoogleSignInButtonProps) => {
    const styles = useAppStyles();
    const { theme } = useTheme();
    const { showToast } = useToast();
    const { t } = useLocale();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignIn = async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (Platform.OS === 'web') {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin },
                });
                if (error) throw error;
            } else {
                const redirectUrl = makeRedirectUri();
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
                });
                if (error) throw error;
                if (data.url) {
                    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                    if (result.type === 'success') {
                        const { params, errorCode } = QueryParams.getQueryParams(result.url);
                        if (errorCode) throw new Error(errorCode);
                        const { access_token, refresh_token } = params;
                        const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
                        if (sessionError) throw sessionError;
                        showToast(t('login.signedIn'));
                        onSuccess();
                    }
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Pressable
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1.5,
                    borderColor: theme.colors.border,
                    borderRadius: 14,
                    paddingVertical: 14,
                    marginBottom: 14,
                    shadowColor: '#000',
                    shadowOpacity: 0.06,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                }}
                onPress={handleSignIn}
                disabled={isLoading}
                accessibilityRole="button"
            >
                {isLoading ? (
                    <ActivityIndicator color={theme.colors.textSecondary} />
                ) : (
                    <>
                        <AntDesign name="google" size={20} color="#DB4437" />
                        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>
                            {t('auth.continueWithGoogle')}
                        </Text>
                    </>
                )}
            </Pressable>
            {error && (
                <Text style={[styles.nameModalError, { marginBottom: 14, textAlign: 'center' }]}>
                    {error}
                </Text>
            )}
        </>
    );
};
```

- [ ] **Step 2: Use it in `AuthScreen`**

In `src/screens/AuthScreen.tsx`:

1. Replace the import block (lines 1–21) with:

```tsx
import React from 'react';
import { Text, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
```

2. Delete `const { showToast } = useToast();`, the two `useState` lines (`isGoogleLoading`, `error`), and the whole `handleGoogleSignIn` function.

3. Replace the `{/* Google button */}` `<Pressable>…</Pressable>` block with:

```tsx
                {/* Google button */}
                <GoogleSignInButton onSuccess={onAuthSuccess} />
```

4. Remove `disabled={isGoogleLoading}` from the "Sign in with email" and "Create account" `Pressable`s.

5. Delete the `{/* Error */}` block at the bottom (`{error && (…)}`) — the error now renders inside `GoogleSignInButton`.

- [ ] **Step 3: Run the full suite and type check**

Run: `npm test` → all suites pass.
Run: `npx tsc --noEmit 2>&1 | grep -v "^supabase/" | grep -c "error TS"` → `9`.
Run: `npx tsc --noEmit 2>&1 | grep -E "AuthScreen|GoogleSignInButton"` → no output.

- [ ] **Step 4: Commit**

```bash
git add src/components/GoogleSignInButton.tsx src/screens/AuthScreen.tsx
git commit -m "refactor(auth): extract GoogleSignInButton from AuthScreen"
```

---

### Task 3: `SignUpPromptModal` component and strings

**Files:**
- Create: `src/components/SignUpPromptModal.tsx`
- Modify: `src/i18n/translations/en.ts`, `src/i18n/translations/he.ts`
- Test: `src/components/SignUpPromptModal.test.tsx`

**Interfaces:**
- Consumes: `SignUpPromptReason` from `src/hooks/useSignUpPrompt.ts` (Task 1); `GoogleSignInButton` from `src/components/GoogleSignInButton.tsx` (Task 2); `TranslationKey` from `src/i18n/translations/en.ts`.
- Produces: `export const SignUpPromptModal: (props: { reason: SignUpPromptReason | null; onClose: () => void; onEmailSignUp: () => void; onSignIn: () => void }) => JSX.Element` — visible when `reason !== null`.

- [ ] **Step 1: Add the strings**

In `src/i18n/translations/en.ts`, insert before `} as const;`:

```ts

  // Sign-up prompt
  'signUpPrompt.close': 'Close',
  'signUpPrompt.titleDefault': 'Get more from Shoppy',
  'signUpPrompt.subtitleDefault': 'Create a free account in seconds',
  'signUpPrompt.titleAi': 'AI features need a free account',
  'signUpPrompt.subtitleAi': 'Get smart suggestions and turn photos into lists',
  'signUpPrompt.titleShare': 'Share lists with a free account',
  'signUpPrompt.titleJoin': 'Join shared lists with a free account',
  'signUpPrompt.subtitleShared': 'Shop together and see changes live',
  'signUpPrompt.benefitBackupTitle': 'Never lose a list',
  'signUpPrompt.benefitBackupText': 'Backed up to the cloud',
  'signUpPrompt.benefitShareTitle': 'Shop together',
  'signUpPrompt.benefitShareText': 'Share lists with family, see updates live',
  'signUpPrompt.benefitAiTitle': 'AI shopping assistant',
  'signUpPrompt.benefitAiText': 'Smart suggestions and photo-to-list',
  'signUpPrompt.benefitDevicesTitle': 'All your devices',
  'signUpPrompt.benefitDevicesText': 'Phone, tablet and web',
  'signUpPrompt.listsComeAlong': 'Your current lists come with you',
  'signUpPrompt.signUpWithEmail': 'Sign up with email',
  'signUpPrompt.haveAccount': 'Already have an account?',
  'signUpPrompt.signIn': 'Sign in',
  'signUpPrompt.continueAsGuest': 'Continue as guest',
  'signUpPrompt.maybeLater': 'Maybe later',
```

In `src/i18n/translations/he.ts`, insert before the closing `};`:

```ts

  // Sign-up prompt
  'signUpPrompt.close': 'סגירה',
  'signUpPrompt.titleDefault': 'קבלו יותר מ-Shoppy',
  'signUpPrompt.subtitleDefault': 'צרו חשבון חינמי תוך שניות',
  'signUpPrompt.titleAi': 'תכונות AI דורשות חשבון חינמי',
  'signUpPrompt.subtitleAi': 'קבלו הצעות חכמות והפכו תמונות לרשימות',
  'signUpPrompt.titleShare': 'שתפו רשימות עם חשבון חינמי',
  'signUpPrompt.titleJoin': 'הצטרפו לרשימות משותפות עם חשבון חינמי',
  'signUpPrompt.subtitleShared': 'קונים יחד ורואים שינויים בזמן אמת',
  'signUpPrompt.benefitBackupTitle': 'לעולם לא תאבדו רשימה',
  'signUpPrompt.benefitBackupText': 'גיבוי בענן',
  'signUpPrompt.benefitShareTitle': 'קונים יחד',
  'signUpPrompt.benefitShareText': 'שתפו רשימות עם המשפחה, עם עדכונים בזמן אמת',
  'signUpPrompt.benefitAiTitle': 'עוזר קניות AI',
  'signUpPrompt.benefitAiText': 'הצעות חכמות ויצירת רשימה מתמונה',
  'signUpPrompt.benefitDevicesTitle': 'כל המכשירים שלכם',
  'signUpPrompt.benefitDevicesText': 'טלפון, טאבלט ואתר',
  'signUpPrompt.listsComeAlong': 'הרשימות הנוכחיות שלכם יעברו איתכם',
  'signUpPrompt.signUpWithEmail': 'הרשמה עם אימייל',
  'signUpPrompt.haveAccount': 'כבר יש לכם חשבון?',
  'signUpPrompt.signIn': 'התחברות',
  'signUpPrompt.continueAsGuest': 'המשך כאורח',
  'signUpPrompt.maybeLater': 'אולי מאוחר יותר',
```

- [ ] **Step 2: Write the failing test**

Create `src/components/SignUpPromptModal.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SignUpPromptModal } from './SignUpPromptModal';
import { useTheme } from '../context/ThemeContext';
import { useAppStyles } from '../styles/appStyles';
import { useLocale } from '../i18n/LocaleContext';
import { createT } from '../i18n/index';

jest.mock('../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../styles/appStyles', () => ({ useAppStyles: jest.fn() }));
jest.mock('../i18n/LocaleContext', () => ({ useLocale: jest.fn() }));
jest.mock('./GoogleSignInButton', () => {
  const { Text } = require('react-native');
  return {
    GoogleSignInButton: ({ onSuccess }: { onSuccess: () => void }) => (
      <Text onPress={onSuccess}>google-button</Text>
    ),
  };
});

const props = {
  onClose: jest.fn(),
  onEmailSignUp: jest.fn(),
  onSignIn: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({
    theme: {
      colors: { text: '#000', textSecondary: '#666', primary: '#007AFF', primaryText: '#fff', surface: '#fff', border: '#ccc' },
      fonts: { regular: 'r', medium: 'm', semibold: 's', bold: 'b' },
    },
    isDark: false,
  });
  (useAppStyles as jest.Mock).mockReturnValue({
    container: {}, iconButton: {}, title: {}, subtitle: {},
    authButtonSecondary: {}, authButtonTextSecondary: {},
  });
  (useLocale as jest.Mock).mockReturnValue({ t: createT('en'), locale: 'en', isRTL: false, setLocale: jest.fn() });
});

describe('SignUpPromptModal', () => {
  it('renders nothing when there is no reason', () => {
    const { queryByText } = render(<SignUpPromptModal reason={null} {...props} />);
    expect(queryByText('Get more from Shoppy')).toBeNull();
  });

  it('shows the default headline, all benefits and "Continue as guest" on first launch', () => {
    const { getByText } = render(<SignUpPromptModal reason="first" {...props} />);
    expect(getByText('Get more from Shoppy')).toBeTruthy();
    expect(getByText('Never lose a list')).toBeTruthy();
    expect(getByText('Shop together')).toBeTruthy();
    expect(getByText('AI shopping assistant')).toBeTruthy();
    expect(getByText('All your devices')).toBeTruthy();
    expect(getByText('Your current lists come with you')).toBeTruthy();
    expect(getByText('Continue as guest')).toBeTruthy();
  });

  it('shows "Maybe later" for periodic prompts', () => {
    const { getByText, queryByText } = render(<SignUpPromptModal reason="periodic" {...props} />);
    expect(getByText('Maybe later')).toBeTruthy();
    expect(queryByText('Continue as guest')).toBeNull();
  });

  it.each([
    ['ai', 'AI features need a free account', 'Get smart suggestions and turn photos into lists'],
    ['share', 'Share lists with a free account', 'Shop together and see changes live'],
    ['join', 'Join shared lists with a free account', 'Shop together and see changes live'],
  ] as const)('shows the %s headline', (reason, title, subtitle) => {
    const { getByText } = render(<SignUpPromptModal reason={reason} {...props} />);
    expect(getByText(title)).toBeTruthy();
    expect(getByText(subtitle)).toBeTruthy();
  });

  it('wires the actions', () => {
    const { getByText, getByLabelText } = render(<SignUpPromptModal reason="ai" {...props} />);

    fireEvent.press(getByText('Sign up with email'));
    expect(props.onEmailSignUp).toHaveBeenCalledTimes(1);

    fireEvent.press(getByText('Sign in'));
    expect(props.onSignIn).toHaveBeenCalledTimes(1);

    fireEvent.press(getByText('Maybe later'));
    fireEvent.press(getByLabelText('Close'));
    fireEvent.press(getByText('google-button'));
    expect(props.onClose).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/components/SignUpPromptModal.test.tsx`
Expected: FAIL — `Cannot find module './SignUpPromptModal'`.

- [ ] **Step 4: Write the component**

Create `src/components/SignUpPromptModal.tsx`:

```tsx
import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';
import { TranslationKey } from '../i18n/translations/en';
import { SignUpPromptReason } from '../hooks/useSignUpPrompt';
import { GoogleSignInButton } from './GoogleSignInButton';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const HEADLINES: Record<SignUpPromptReason, { title: TranslationKey; subtitle: TranslationKey }> = {
    first: { title: 'signUpPrompt.titleDefault', subtitle: 'signUpPrompt.subtitleDefault' },
    periodic: { title: 'signUpPrompt.titleDefault', subtitle: 'signUpPrompt.subtitleDefault' },
    ai: { title: 'signUpPrompt.titleAi', subtitle: 'signUpPrompt.subtitleAi' },
    share: { title: 'signUpPrompt.titleShare', subtitle: 'signUpPrompt.subtitleShared' },
    join: { title: 'signUpPrompt.titleJoin', subtitle: 'signUpPrompt.subtitleShared' },
};

const BENEFITS: { icon: IconName; title: TranslationKey; text: TranslationKey }[] = [
    { icon: 'cloud-outline', title: 'signUpPrompt.benefitBackupTitle', text: 'signUpPrompt.benefitBackupText' },
    { icon: 'people-outline', title: 'signUpPrompt.benefitShareTitle', text: 'signUpPrompt.benefitShareText' },
    { icon: 'sparkles', title: 'signUpPrompt.benefitAiTitle', text: 'signUpPrompt.benefitAiText' },
    { icon: 'phone-portrait-outline', title: 'signUpPrompt.benefitDevicesTitle', text: 'signUpPrompt.benefitDevicesText' },
];

type SignUpPromptModalProps = {
    reason: SignUpPromptReason | null;
    onClose: () => void;
    onEmailSignUp: () => void;
    onSignIn: () => void;
};

export const SignUpPromptModal = ({ reason, onClose, onEmailSignUp, onSignIn }: SignUpPromptModalProps) => {
    const styles = useAppStyles();
    const { theme } = useTheme();
    const { t } = useLocale();

    if (!reason) return null;
    const headline = HEADLINES[reason];

    return (
        <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
            <SafeAreaView style={[styles.container, { paddingHorizontal: 0 }]}>
                <View style={{ paddingHorizontal: 20, paddingTop: 8, alignItems: 'flex-end' }}>
                    <Pressable
                        style={styles.iconButton}
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel={t('signUpPrompt.close')}
                    >
                        <Ionicons name="close" size={22} color={theme.colors.text} />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
                    {/* Branding + headline */}
                    <View style={{ alignItems: 'center', marginBottom: 28 }}>
                        <View style={{
                            width: 72,
                            height: 72,
                            borderRadius: 22,
                            backgroundColor: theme.colors.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16,
                        }}>
                            <Ionicons name="bag-outline" size={40} color="#ffffff" />
                        </View>
                        <Text style={[styles.title, { textAlign: 'center', marginBottom: 8 }]}>
                            {t(headline.title)}
                        </Text>
                        <Text style={[styles.subtitle, { textAlign: 'center' }]}>
                            {t(headline.subtitle)}
                        </Text>
                    </View>

                    {/* Benefits */}
                    <View style={{ gap: 16, marginBottom: 20 }}>
                        {BENEFITS.map((benefit) => (
                            <View key={benefit.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    backgroundColor: theme.colors.surface,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Ionicons name={benefit.icon} size={20} color={theme.colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontFamily: theme.fonts.semibold, color: theme.colors.text }}>
                                        {t(benefit.title)}
                                    </Text>
                                    <Text style={{ fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }}>
                                        {t(benefit.text)}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Reassurance */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
                        <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                        <Text style={{ fontSize: 14, fontFamily: theme.fonts.medium, color: theme.colors.textSecondary }}>
                            {t('signUpPrompt.listsComeAlong')}
                        </Text>
                    </View>

                    {/* Actions */}
                    <GoogleSignInButton onSuccess={onClose} />

                    <Pressable
                        style={[styles.authButtonSecondary, { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }]}
                        onPress={onEmailSignUp}
                        accessibilityRole="button"
                    >
                        <Ionicons name="mail-outline" size={18} color={theme.colors.text} />
                        <Text style={[styles.authButtonTextSecondary, { fontSize: 16 }]}>
                            {t('signUpPrompt.signUpWithEmail')}
                        </Text>
                    </Pressable>

                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, paddingVertical: 8 }}>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
                            {t('signUpPrompt.haveAccount')}
                        </Text>
                        <Pressable onPress={onSignIn} accessibilityRole="button">
                            <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '600' }}>
                                {t('signUpPrompt.signIn')}
                            </Text>
                        </Pressable>
                    </View>

                    <Pressable style={{ alignItems: 'center', paddingVertical: 12 }} onPress={onClose} accessibilityRole="button">
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
                            {reason === 'first' ? t('signUpPrompt.continueAsGuest') : t('signUpPrompt.maybeLater')}
                        </Text>
                    </Pressable>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/components/SignUpPromptModal.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 6: Run the full suite and type check**

Run: `npm test` → all suites pass.
Run: `npx tsc --noEmit 2>&1 | grep -v "^supabase/" | grep -c "error TS"` → `9`.

- [ ] **Step 7: Commit**

```bash
git add src/components/SignUpPromptModal.tsx src/components/SignUpPromptModal.test.tsx src/i18n/translations/en.ts src/i18n/translations/he.ts
git commit -m "feat(signup-prompt): add full-screen sign-up prompt with benefits"
```

---

### Task 4: Wire the prompt into the app and gate AI, photo, share and join

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/ShoppingListScreen.tsx`
- Modify: `src/screens/ListsScreen.tsx`
- Modify: `src/components/SmartSuggestionsModal.tsx`
- Modify: `src/components/PhotoModal.tsx`
- Modify: `src/i18n/translations/en.ts`, `src/i18n/translations/he.ts`

**Interfaces:**
- Consumes: `useSignUpPrompt(isHydrated)` and `FeaturePromptReason` (Task 1); `SignUpPromptModal` (Task 3).
- Produces: `ShoppingListScreen` prop `promptSignUp: (reason: FeaturePromptReason) => void` replaces `goToAuth`. `SmartSuggestionsModal` and `PhotoModal` lose their `onSignUp` prop.

- [ ] **Step 1: `HomeScreen` — call the hook and render the modal**

In `src/screens/HomeScreen.tsx`:

1. Add imports:

```tsx
import { useSignUpPrompt } from '../hooks/useSignUpPrompt';
import { SignUpPromptModal } from '../components/SignUpPromptModal';
```

2. Directly after the `} = useShoppingListsApp();` line, add:

```tsx
  const { reason: signUpPromptReason, promptSignUp, dismiss: dismissSignUpPrompt } = useSignUpPrompt(isHydrated);
  const handleOpenJoinListModal = currentUserId ? openJoinListModal : () => promptSignUp('join');
```

3. Directly before `if (route.name === 'lists' || !currentList) {`, add:

```tsx
  // Only rendered over the Lists and List screens, so it never covers the auth/settings flows.
  const signUpPrompt = (
    <SignUpPromptModal
      reason={signUpPromptReason}
      onClose={dismissSignUpPrompt}
      onEmailSignUp={() => { dismissSignUpPrompt(); goToSignup(); }}
      onSignIn={() => { dismissSignUpPrompt(); goToLogin(); }}
    />
  );
```

4. In the `route.name === 'lists' || !currentList` branch, wrap the returned `<ListsScreen … />` in a fragment and add `{signUpPrompt}` after it. In that `<ListsScreen>`, change `onOpenJoinListModal={openJoinListModal}` to `onOpenJoinListModal={handleOpenJoinListModal}`.

5. In the final return, add `{signUpPrompt}` after the hidden `<ListsScreen … hidden={true} />`, change that `ListsScreen`'s `onOpenJoinListModal={openJoinListModal}` to `onOpenJoinListModal={handleOpenJoinListModal}`, and in `<ShoppingListScreen>` replace `goToAuth={goToAuth}` with `promptSignUp={promptSignUp}`.

- [ ] **Step 2: `ListsScreen` — show the join button to everyone**

In `src/screens/ListsScreen.tsx`, replace:

```tsx
        {currentUserId && (
          <Pressable
            style={styles.iconButton}
            onPress={onOpenJoinListModal}
            accessibilityRole="button"
            accessibilityLabel={t('lists.joinShared')}
          >
            <Ionicons name="link-outline" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        )}
```

with:

```tsx
        <Pressable
          style={styles.iconButton}
          onPress={onOpenJoinListModal}
          accessibilityRole="button"
          accessibilityLabel={t('lists.joinShared')}
        >
          <Ionicons name="link-outline" size={20} color={theme.colors.textSecondary} />
        </Pressable>
```

(`currentUserId` is still used by `ListCard` — leave the prop.)

- [ ] **Step 3: `ShoppingListScreen` — gate AI, photo and share**

In `src/screens/ShoppingListScreen.tsx`:

1. Add the import:

```tsx
import { FeaturePromptReason } from '../hooks/useSignUpPrompt';
```

2. In the props type, replace `goToAuth: () => void;` with `promptSignUp: (reason: FeaturePromptReason) => void;`. In the destructured props, replace `goToAuth,` with `promptSignUp,`.

3. Replace `handleOpenAiSuggestions`:

```tsx
  const handleOpenAiSuggestions = () => {
    if (!currentUserId) {
      promptSignUp('ai');
      return;
    }
    setSuggestPrompt('');
    setIsSuggestPromptOpen(true);
  };

  const handleOpenPhotoModal = () => {
    if (!currentUserId) {
      promptSignUp('ai');
      return;
    }
    setIsPhotoModalOpen(true);
  };
```

4. Replace the share button in the settings popover:

```tsx
            <Pressable
              style={styles.settingsPopoverButton}
              onPress={() => {
                setIsSettingsOpen(false);
                if (!currentUserId) {
                  promptSignUp('share');
                  return;
                }
                onShareList();
              }}
            >
              <Text style={styles.settingsPopoverButtonText}>{t('shoppingList.shareList')}</Text>
            </Pressable>
```

5. In the add-items overlay props, replace `onFromPhoto={() => { closeOverlay(); setIsPhotoModalOpen(true); }}` with `onFromPhoto={() => { closeOverlay(); handleOpenPhotoModal(); }}`.

6. In `<CaretPopover>`, replace the `onFromPhoto={() => { // MVP: … setIsPhotoModalOpen(true); }}` block with `onFromPhoto={handleOpenPhotoModal}`.

7. Remove `onSignUp={goToAuth}` from both `<SmartSuggestionsModal>` and `<PhotoModal>`.

- [ ] **Step 4: `SmartSuggestionsModal` — drop the guest branch**

In `src/components/SmartSuggestionsModal.tsx`:

1. Delete `type RateLimitInfo = { isAnonymous: boolean };`, the `onSignUp?: () => void;` prop line, and `onSignUp,` from the destructured props.
2. Replace `const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);` with `const [isRateLimited, setIsRateLimited] = useState(false);`.
3. Replace `setRateLimit(null);` with `setIsRateLimited(false);`.
4. Replace `setRateLimit({ isAnonymous: body.isAnonymous ?? false });` with `setIsRateLimited(true);`.
5. Replace the `{rateLimit ? ( <View …> … </View> ) : loading ? (` block with:

```tsx
                    {isRateLimited ? (
                        <View style={{ padding: 32, alignItems: 'center', gap: 12 }}>
                            <Ionicons name="sparkles" size={36} color={theme.colors.primary} />
                            <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: theme.colors.text, textAlign: 'center' }}>
                                {t('aiRateLimit.authTitle')}
                            </Text>
                            <Text style={{ fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                                {t('aiRateLimit.authMessage')}
                            </Text>
                        </View>
                    ) : loading ? (
```

6. Replace `{!rateLimit && (` with `{!isRateLimited && (`.
7. If `Pressable` is no longer referenced anywhere in the file, remove it from the `react-native` import.

- [ ] **Step 5: `PhotoModal` — drop the guest branch**

In `src/components/PhotoModal.tsx`:

1. Delete `type RateLimitInfo = { isAnonymous: boolean };` and the `onSignUp?: () => void;` prop line; change the signature to `export const PhotoModal = ({ visible, onClose, onAdd }: PhotoModalProps) => {`.
2. Delete `const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);` and the `setRateLimit(null);` line in `reset`.
3. In the 429 branch, delete `setRateLimit({ isAnonymous: body.isAnonymous ?? false });` (keep `setState('rate_limit'); return;`).
4. Replace the `{state === 'rate_limit' && rateLimit && ( … )}` block with:

```tsx
                    {state === 'rate_limit' && (
                        <View style={{ padding: 32, alignItems: 'center', gap: 12 }}>
                            <Ionicons name="sparkles" size={36} color={theme.colors.primary} />
                            <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: theme.colors.text, textAlign: 'center' }}>
                                {t('aiRateLimit.authTitle')}
                            </Text>
                            <Text style={{ fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                                {t('aiRateLimit.authMessage')}
                            </Text>
                        </View>
                    )}
```

5. Replace `{(state === 'idle' || state === 'results') && !rateLimit && (` with `{(state === 'idle' || state === 'results') && (`.
6. If `Pressable` is no longer referenced anywhere in the file, remove it from the `react-native` import.

- [ ] **Step 6: Remove the obsolete strings**

Delete these three lines from both `src/i18n/translations/en.ts` and `src/i18n/translations/he.ts`:
- `'aiRateLimit.guestTitle'`
- `'aiRateLimit.guestMessage'`
- `'aiRateLimit.signUpButton'`

Then confirm nothing references them:

Run: `grep -rnE "aiRateLimit\.(guest|signUpButton)|goToAuth=\{|onSignUp[=?,]" src`
Expected: no output.

- [ ] **Step 7: Run the full suite and type check**

Run: `npm test` → all suites pass.
Run: `npx tsc --noEmit 2>&1 | grep -v "^supabase/" | grep -c "error TS"` → `9`.

- [ ] **Step 8: Manual check on web (English)**

Run: `npm run web`. In the browser, open DevTools → Application → Local Storage and delete `@shopping-list/signup-prompt-shown-at` (or use a private window), then reload.

Expected:
- As a guest, the prompt appears with "Get more from Shoppy" and "Continue as guest"; ✕ and "Continue as guest" both close it; reloading does not show it again.
- Set `@shopping-list/signup-prompt-shown-at` to a value 4 days ago (`Date.now() - 4*864e5` in the console) and reload → prompt shows with "Maybe later".
- Inside a list: AI suggestions and "from photo" open the prompt with "AI features need a free account"; the list settings → Share opens "Share lists with a free account". On the Lists screen the join (link) icon is visible and opens "Join shared lists with a free account". In each case, closing it leaves you on the same screen.
- "Sign up with email" goes to the sign-up screen; "Sign in" goes to the login screen.
- Signed in: none of these open the prompt; AI, photo, share and join behave as before.

- [ ] **Step 9: Manual check in Hebrew (RTL)**

Settings → language → Hebrew, then repeat the first-launch and AI checks.
Expected: text right-aligned, ✕ on the left, benefit icons on the right of their text, Google button logo/text not mirrored, nothing clipped or overflowing on a phone-width window.

- [ ] **Step 10: Commit**

```bash
git add src/screens/HomeScreen.tsx src/screens/ShoppingListScreen.tsx src/screens/ListsScreen.tsx src/components/SmartSuggestionsModal.tsx src/components/PhotoModal.tsx src/i18n/translations/en.ts src/i18n/translations/he.ts
git commit -m "feat(signup-prompt): show prompt on launch, every 3 days, and on AI/share/join for guests"
```
