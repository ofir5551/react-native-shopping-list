---
name: build-android
description: Build a standalone Android APK via EAS Build and return the download link. Use when asked to build the app for Android, create an APK, or distribute to a device without Expo Go.
---

# Build Android APK

Build a standalone Android APK using EAS Build and return the install link.

## Arguments

$ARGUMENTS — optional EAS build profile (default: `preview`). Pass `production` for a Play Store AAB.

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

2. **Determine profile**: Use `$ARGUMENTS` if provided, otherwise default to `preview`.
   - `preview` → APK (sideloadable, internal distribution)
   - `production` → AAB (Play Store bundle)

3. **Run the build**:
   ```
   eas build --profile <profile> --platform android --non-interactive
   ```

4. **Report the result**:
   - Print the download URL for the APK
   - Remind the user to enable "Install from unknown sources" on their Android device before installing (only relevant for `preview` APK builds)
   - If the build failed, print the EAS logs URL for debugging
