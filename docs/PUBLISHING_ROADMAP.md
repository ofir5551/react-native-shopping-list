# Play Store Publishing Checklist

Status legend: `[ ]` todo, `[~]` partly done, `[x]` done. Items marked **(verify)** are things I noticed but did not confirm in code or in the console.

## Done so far

- [x] Expo SDK 54 packages bumped to the expected patch versions (`expo` 54.0.37, `expo-updates` 29.0.20, `expo-font` 14.0.12, `jest-expo` 54.0.18); `expo install --check` is clean and tests pass. Not yet run on a device or in a production build.
- [x] Account deletion backend and UI built, deployed and tested (details in section 1).
- [x] Separate dev and prod Supabase projects (`Shoppy-DEV` and `Shoppy`), with a one-command CLI link toggle. See `CLAUDE.md`, "Environments (dev / prod)".
- [x] EAS build config: remote versioning with auto-increment, `runtimeVersion` (appVersion policy), `preview`/`production` channels, Supabase env vars set in EAS for both profiles, `.env*` excluded from cloud uploads via `.easignore`.
- [x] Security hardening migration (anon `EXECUTE` revoked on `SECURITY DEFINER` functions, `search_path` pinned) and global AI cap migration, tested on dev and applied to prod.
- [x] `tsc --noEmit` is clean and all 245 tests pass (2026-10-21).

Known open item: `npm audit --omit=dev` reports 42 vulnerabilities (1 critical, 26 high, 14 moderate, 1 low) as of 2026-10-21. Not triaged yet; avoid `npm audit fix --force`. Work out which ones reach the shipped app.

## 1. Blockers (Play Store will reject, or the app is unsafe without these)

- [~] **In-app account deletion.** Done: `delete-account` edge function (deployed, JWT-verified), `src/utils/deleteAccount.ts` + tests, Settings button with confirm sheet, en/he strings. Verified end to end in a browser against the live project (cancel does nothing; confirm deletes the user and cascades their rows; app falls back to guest mode). Still to do: RTL visual check of the confirm sheet and a test with a list shared between two users. The web deletion page and privacy text are done (see below).
  - Add an edge function (e.g. `supabase/functions/delete-account`) that verifies the caller's JWT, then calls `auth.admin.deleteUser`. `ON DELETE CASCADE` (as on `ai_usage`) removes related rows; confirm every user-owned table cascades, including `lists` and `list_shares`.
  - Add a "Delete account" button in `SettingsScreen.tsx` with a confirmation dialog, plus en/he strings.
  - Clear local lists after deletion and fall back to a fresh anonymous session.
  - Google also requires a **web URL** for deletion requests (Play Console, Data safety). A page on the privacy site explaining how to delete is enough.
- [x] **Public privacy policy, terms and deletion pages.** Live at https://ofir5551.github.io/react-native-shopping-list/ (`privacy.html`, `terms.html`, `delete-account.html`), built from `site/` by `.github/workflows/pages.yml`. Settings links to them. Still to do outside the repo: paste the privacy and deletion URLs into the Play Console. Optional: Hebrew versions.
- [ ] **Data safety form** (Play Console). Declare: email address, user-generated content (lists), photos and voice input (sent to Google for AI features), user IDs. State that data is encrypted in transit and that users can request deletion.
- [x] **Versioning.** `"appVersionSource": "remote"` under `cli` and `"autoIncrement": true` on the `production` profile in `eas.json`; `android.versionCode` removed from `app.json` (EAS owns it now).
- [ ] **Play developer account.** Not created yet as of 2026-10-21. One-time $25 fee plus identity verification, which can take days. Everything under Play Console depends on it.
- [ ] **Closed testing requirement.** If the developer account is a personal account created after Nov 2023, run a closed test with at least 12 testers opted in for 14 continuous days before applying for production access. Start recruiting early; this is usually the longest wait.
- [~] **Production build env vars.** `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set in EAS for `production` and `preview` (both point at the prod project), and `.easignore` now excludes `.env*` (an `.easignore` replaces `.gitignore` for EAS uploads, so `.env` was not actually excluded before). Still to do: run a real EAS build and confirm it launches and signs in on a device.

## 2. Cost and abuse protection (AI features)

- [ ] Decision (2026-10-21): dev and prod share one Gemini key and billing while this is a small preview. Revisit before a public launch: give dev its own Google Cloud project and key, and note that Google Cloud budgets only alert; the real ceilings are the 1000/day in-code cap and an optional per-key quota.
- [ ] Enable billing on the Gemini API key (the free tier throttles with 429s and lets Google train on user content), and set a hard monthly spending limit in Google Cloud billing.
- [x] Guests get no AI (`20261003212720_disable_guest_ai.sql`). Anonymous sessions are free to create, so a per-user guest allowance was unlimited in practice.
- [x] **Global daily AI cap.** `check_and_increment_ai_usage` now also counts calls in `ai_usage_global` and refuses above 1000/day (constant `c_global_limit`, change it with a new migration). A denied call rolls back both counters. Migration `20261021130000_add_global_ai_cap.sql`, live on prod. Boundary behavior was tested in SQL on dev; there is no automated test for it.
- [ ] Consider CAPTCHA on sign-up (Supabase Auth setting).
- [~] `parse-photo`: oversized `imageBase64` (over about 9 MB) is rejected with 413 before forwarding. Still open: the app does not downscale images before upload (needs `expo-image-manipulator`; Gemini bills per image, not per megabyte, so this is low priority).
- [x] `suggest-items` / `parse-photo`: Google's raw error text now goes to the server logs only; clients get `AI request failed`.
- [ ] Restrict CORS on the edge functions if no web client uses them (currently `*`). Low risk because JWT auth is required.
- [ ] Add a way for users to report bad AI output (Google's generative-AI policy). A small "Report" action on AI results is enough.
- [ ] Disclose in the privacy policy and Data safety form that prompts and images go to Google (the in-app text already says this; keep it in the public version).

## 3. Supabase hardening (security advisor run 2026-10-02, re-run 2026-10-21)

- [x] Revoked `EXECUTE` from `anon` on the `SECURITY DEFINER` functions (and from everyone on the trigger function `enforce_list_owner_update`). Migration `20261021120000_harden_function_permissions.sql`, live on prod. Tested on dev: guest session create/read/lookup, two-user join by share code, owner-only rename.
- [x] Pinned `search_path` on `generate_unique_share_code` and `set_share_code` (same migration).
- [ ] Enable leaked-password protection (Dashboard, Authentication, Password security). Manual; may need a paid plan. Still the only non-expected warning from the advisor.
- [~] Review the "anonymous access" warnings on `lists`, `list_shares`, `ai_usage` and `storage.objects`. They remain by design for guest sessions. The `lists`, `list_shares` and `ai_usage` policies are scoped to `auth.uid()` in the migrations; the avatar storage read policy is public on purpose. Not yet reviewed against a live two-account test on prod.
- [x] The avatar storage policies do have a migration (`20260301232030_add_avatar_storage_bucket.sql`). The whole migration history now replays on a fresh database (verified by building the dev project from scratch). Two earlier migrations were made idempotent for this.
- [ ] Production auth config (Dashboard, not `config.toml`): decide on email confirmation, set the Site URL and redirect URLs for the `shopping-list://` scheme, and confirm password-reset flows work end to end.
- [ ] **Custom SMTP.** The built-in Supabase mailer is heavily rate-limited and meant for testing only. Connect a real provider (Resend, Postmark, etc.) before inviting real users.
- [ ] Plan for the Supabase free tier: projects pause after about a week of inactivity, and limits apply. Move to Pro before a real launch, and enable backups.
- [ ] Rotate any keys that were ever shared. Keep `GEMINI_API_KEY` only in Supabase secrets.

## 4. App configuration (`app.json`, `eas.json`)

- [ ] `icon` points at `adaptive-icon.png`. Use a dedicated full-bleed 1024x1024 icon, and verify the adaptive icon foreground sits within the safe zone. The adaptive icon background is plain white, which may not match the brand.
- [ ] `userInterfaceStyle` is `"light"` although the app has dark themes. Set `"automatic"` so system UI (keyboard, dialogs) matches. Check this against `ThemeScreen`.
- [x] `runtimeVersion` (`{ "policy": "appVersion" }`) added to `app.json`, and `channel` (`preview`, `production`) added to the `eas.json` build profiles. Bump `version` in `app.json` whenever native code changes, so OTA updates only reach compatible binaries.
- [ ] Declare Android permissions deliberately. `expo-speech-recognition` and `expo-image-picker` add microphone and camera permissions. Check the merged manifest and add clear permission strings in plugin config. Remove any permission the app does not actually use. **(verify)**
- [ ] Add `eas submit` config (service account key) to automate uploads, or plan to upload the `.aab` manually.
- [ ] Confirm `edgeToEdgeEnabled` layouts look right on Android 15 (status/navigation bars) in all themes and in RTL.
- [x] `android.versionCode` handling is remote per section 1. Still bump `version` for each release.
- [ ] `.github/` only contains `copilot-instructions.md`. Add CI that runs `npm test` and a type check on every push.

## 5. Quality and robustness

- [~] Run the full test suite and `tsc --noEmit`. Both green on 2026-10-21 (tsconfig now excludes `supabase/functions`, which are Deno). Repeat before each release candidate; CI would automate it (section 4).
- [~] Tests for the account-deletion flow exist (`src/utils/deleteAccount.test.ts`). The global AI cap has no automated test; it was verified with a SQL script on dev.
- [x] Web smoke test on phone-sized viewports (Pixel 7 and 360 px, Playwright, against the dev project): guest sign-in, create list, add item, persistence after reload. This found and fixed an overlay bug where the Add button hid behind the mic/camera buttons. It does not replace testing on a real Android device.
- [ ] Add crash reporting (Sentry for Expo, or Firebase Crashlytics) so production crashes are visible. Add the disclosure to the privacy policy.
- [ ] Offline and flaky-network pass: airplane mode while adding, editing and deleting items, then reconnect and confirm `SyncEngine` converges without duplicates or lost edits.
- [ ] Multi-device sharing test: two real accounts, owner rename and delete, member leave, simultaneous edits.
- [ ] Anonymous-to-account upgrade: create lists as a guest, sign up, confirm lists migrate (`SyncContext`) and nothing is lost if the migration is interrupted.
- [ ] If `signInAnonymously` fails (offline first launch), confirm the app still works fully in local mode and retries later.
- [ ] RTL/Hebrew pass on every screen, including new Settings controls (per CLAUDE.md).
- [ ] Accessibility pass: TalkBack labels on icon-only buttons (Fab, Header, ItemRow actions), touch targets of at least 48dp, contrast across all palettes, large font scaling. Known gap: the Settings gear in `Header.tsx` has no `accessibilityLabel`; the Archive and Join buttons on the Lists screen may be the same.
- [ ] Test on at least: a small low-end Android device, a large phone, a tablet (`supportsTablet` is true for iOS), and Android 10 through 15.
- [ ] Performance check with a large list (hundreds of items) and many lists.
- [ ] Remove or gate leftover dev features. Developer options are already behind `__DEV__`; confirm `parserDevMode` has no effect in release builds.
- [ ] Confirm no `console.log` of sensitive data (tokens, emails) in release code.

## 6. Store listing assets

- [ ] App name, short description (80 chars) and full description. Provide both English and Hebrew listings.
- [ ] 512x512 icon, 1024x500 feature graphic.
- [ ] Phone screenshots (at least 2, ideally 6-8) in both languages and in a couple of themes. 7-inch and 10-inch tablet screenshots if you want tablet visibility.
- [ ] Content rating questionnaire (IARC). Select user-generated content, and answer AI-feature questions truthfully.
- [ ] Target audience: choose 18+ or general, not "children", to avoid Families Policy requirements.
- [ ] Ads declaration (none), app category (Shopping or Productivity), and contact email and website.
- [ ] Add a support contact and a public URL for reporting problems.

## 7. Launch sequence

Interim path while there is no Play account: `eas build --profile preview --platform android` produces an installable APK that talks to the prod project; share the download link directly. There is no free equivalent for iPhones; installing without the App Store needs the Apple Developer Program ($99/yr) for ad hoc builds or TestFlight, and `app.json` has no `ios.bundleIdentifier` yet.

1. Finish sections 1-3.
2. Build with `eas build --profile production --platform android` (`.aab`).
3. Upload to **Internal testing**; check the **Pre-launch report** for crashes and accessibility findings.
4. Run the **Closed testing** period (section 1) with 12+ testers; collect feedback.
5. Complete the Play Console **"Set up your app"** checklist until every item shows done.
6. Apply for production access, then do a staged rollout (e.g. 10% then 50% then 100%).
7. Monitor crashes, Supabase usage and Gemini spend during the first weeks.

## 8. Post-launch / nice to have

- [ ] In-app review prompt after a positive moment (e.g. completing a list).
- [ ] Aisle or category auto-sort, using a local lookup first and AI only for unknown items.
- [ ] Shared-list indicators (see `docs/ROADMAP.md`).
- [ ] Home-screen widget and notifications for shared-list changes.
- [ ] Monitoring: Supabase log alerts and a Google Cloud billing alert for the Gemini key.
