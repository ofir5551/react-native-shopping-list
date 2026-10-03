# Sign-Up Prompt for Guests — Design

**Date:** 2026-10-03
**Goal:** Convert as many guests (anonymous users) to registered accounts as possible, by showing them what they gain at the moments they are most likely to say yes.

## Scope

- A full-screen prompt listing the benefits of registering, with sign-in actions on it.
- Shown to guests only — never to registered users.
- Shown on first launch, then at most every 3 days, and whenever a guest taps a feature that needs an account (AI suggestions, photo-to-list, share, join).

Out of scope: analytics on prompt conversion, A/B testing copy, changes to `AuthScreen`'s own UI.

## Content

### Headline by reason

| Reason | Trigger | Headline | Subtitle |
|---|---|---|---|
| `first` | First periodic show (never shown before) | Get more from Shoppy | Create a free account in seconds |
| `periodic` | 3-day cadence | Get more from Shoppy | Create a free account in seconds |
| `ai` | Guest taps smart suggestions or photo-to-list | AI features need a free account | Get smart suggestions and turn photos into lists |
| `share` | Guest taps share list | Share lists with a free account | Shop together and see changes live |
| `join` | Guest taps join list | Join shared lists with a free account | Shop together and see changes live |

### Benefits (always all four, in this order)

1. `cloud-outline` — **Never lose a list** — backed up to the cloud
2. `people-outline` — **Shop together** — share lists with family, see updates live
3. `sparkles` — **AI shopping assistant** — smart suggestions and photo-to-list
4. `phone-portrait-outline` — **All your devices** — phone, tablet and web

Reassurance line below the list: **✓ Your current lists come with you**

### Actions

- **Continue with Google** — primary button; signs in directly from the prompt.
- **Sign up with email** — closes the prompt, routes to `SignUpScreen`.
- *Already have an account?* **Sign in** — closes the prompt, routes to `LoginScreen`.
- **Dismiss** — label is "Continue as guest" when reason is `first`, "Maybe later" otherwise. An ✕ in the top corner does the same.

All strings go in `en.ts` and `he.ts`. Layout must be verified in RTL.

## When it shows

### Periodic (`first` / `periodic`)

- Checked on app mount and on every `AppState` transition to `active`.
- Conditions: hydration complete, a session exists, the user is anonymous, no prompt currently open, and `isPeriodicPromptDue(lastShownAt, now)` is true.
- `isPeriodicPromptDue` returns true when `lastShownAt` is `null` or `now - lastShownAt >= 3 days`.
- Reason is `first` when `lastShownAt` is `null`, else `periodic`.
- When shown, `lastShownAt = now` is written to AsyncStorage key `@shopping-list/signup-prompt-shown-at` (new key, not one of the frozen data keys). Read/write failures are swallowed — the prompt simply behaves as never shown.
- Existing guests who update the app have no stored value, so they see the `first` variant on their next open.

### Feature-gated (`ai` / `share` / `join`)

- Shown every time a guest taps the gated action — no cooldown.
- Does not read or write `lastShownAt`.
- Opens instead of the feature's own UI, so a guest never types a prompt or uploads a photo just to be refused.
- The share button is no longer greyed out for guests; the join button is visible to guests.

### After sign-in

The prompt closes and the user stays on the screen they were on. Local lists carry over through the existing anonymous-to-registered conversion and SyncContext migration.

## Code structure

### New

- `src/components/SignUpPromptModal.tsx` — RN `<Modal>` with `presentationStyle="fullScreen"`. Props: `reason`, `onClose`, `onEmailSignUp`, `onSignIn`. Uses `useGoogleSignIn`; on success shows the existing "signed in" toast and calls `onClose`.
- `src/hooks/useSignUpPrompt.ts` — owns `reason: SignUpPromptReason | null`, `promptSignUp(reason)`, `dismiss()`, and the periodic check. Exports the pure `isPeriodicPromptDue(lastShownAt: number | null, now: number): boolean`.
- `src/hooks/useGoogleSignIn.ts` — Google OAuth flow moved verbatim from `AuthScreen` (web redirect, native `openAuthSessionAsync` + `setSession`). Returns `{ signIn, isLoading, error }`, takes an `onSuccess` callback.

### Changed

- `HomeScreen.tsx` — calls `useSignUpPrompt`, renders `SignUpPromptModal` once, passes `promptSignUp` to `ShoppingListScreen` and `ListsScreen`.
- `ShoppingListScreen.tsx` — smart-suggestions, photo and share actions call `promptSignUp('ai' | 'share')` when `!currentUserId`; share button no longer disabled for guests. `goToAuth` prop removed (it was only used for the AI modals' `onSignUp`).
- `ListsScreen.tsx` — join button always rendered; guests get `promptSignUp('join')`.
- `AuthScreen.tsx` — uses `useGoogleSignIn` instead of its inline copy.
- `PhotoModal.tsx`, `SmartSuggestionsModal.tsx` — remove the guest rate-limit branch and the `onSignUp` prop; the signed-in "daily limit reached" message stays. Server-side refusal of anonymous AI calls (`20261003000000_disable_guest_ai.sql`) remains the real enforcement.
- `en.ts`, `he.ts` — add prompt strings; remove `aiRateLimit.guestTitle`, `aiRateLimit.guestMessage`, `aiRateLimit.signUpButton`.

## Testing

- `src/hooks/useSignUpPrompt.test.ts` — `isPeriodicPromptDue`: due when `null`; not due at 3 days minus 1 minute; due at exactly 3 days; due well after.
- Guests-only rule is enforced in the hook's check (anonymous user required), covered by a hook test with a mocked registered user → no prompt.
- `npm test` passes.
- Manual on `npm run web`: first launch shows `first` variant; ✕ / "Continue as guest" dismisses; AI, photo, share and join each show the right headline; signed-in user never sees it. Repeat in Hebrew (RTL): layout mirrors, ✕ on the correct side, Google button content not flipped.
