---
name: build-android
description: Build a standalone Android APK via EAS Build and return the download link. Use when asked to build the app for Android, create an APK, or distribute to a device without Expo Go.
---

# Build Android APK

Build a standalone Android APK using EAS Build and return the install link.

## Arguments

$ARGUMENTS — optional EAS build profile (default: `preview`). Pass `production` for a Play Store AAB. Pass `local` to build on this machine instead of EAS servers.

## Steps

1. **Check EAS CLI is installed and user is logged in**:
   ```
   eas whoami
   ```
   If not found, install it first:
   ```
   npm install -g eas-cli
   ```
   If not logged in, tell the user to run `eas login` manually (interactive — cannot be automated).

2. **Determine build mode**:
   - If `$ARGUMENTS` is `local`, skip to the **Local Build** section below.
   - Otherwise, use `$ARGUMENTS` as the profile (default: `preview`).
     - `preview` → APK (sideloadable, internal distribution)
     - `production` → AAB (Play Store bundle)

3. **Check remaining EAS builds** (skip if doing a local build):
   ```
   eas build:list --limit 1 --platform android --non-interactive
   ```
   If the output indicates the monthly build quota is depleted, inform the user and offer to build locally instead (see Local Build below). Ask before proceeding.

4. **Run the EAS cloud build**:
   ```
   eas build --profile <profile> --platform android --non-interactive
   ```

5. **Report the result**:
   - Print the download URL for the APK
   - Remind the user to enable "Install from unknown sources" on their Android device before installing (only relevant for `preview` APK builds)
   - If the build failed, print the EAS logs URL for debugging

---

## Local Build

Use when EAS monthly builds are depleted or the user explicitly passes `local`.

**Prerequisites** — check each and warn if missing:
- Java: `java -version` (need JDK 17+)
- Android SDK: check `$ANDROID_HOME` or `$LOCALAPPDATA/Android/Sdk` exists
- `adb devices` reachable (add platform-tools to PATH if needed)

**Run the local build**:
```bash
npm run build:android
```

**After a successful build**, move the APK to a `builds/` folder in the project root with a timestamped name:
```bash
mkdir -p /c/Users/ofirb/dev/shopping-list/builds
TIMESTAMP=$(date +%y-%m-%d-%H-%M)
mv android/app/build/outputs/apk/release/app-release.apk /c/Users/ofirb/dev/shopping-list/builds/Shoppy${TIMESTAMP}.apk
```

**Report the result**:
- Final APK path: `builds/Shoppy<YY-MM-DD-HH-MM>.apk`
- File size
- Remind the user to enable "Install from unknown sources" before sideloading
- If the build fails due to missing SDK/NDK components, suggest running `npx expo install --fix` first
- To install directly to a connected device: `adb install builds/Shoppy<timestamp>.apk`
