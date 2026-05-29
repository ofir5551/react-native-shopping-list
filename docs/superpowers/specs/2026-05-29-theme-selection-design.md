# Theme Selection — Design Spec

**Date:** 2026-05-29
**Status:** Approved

## Overview

Replace the binary dark mode toggle in Settings with a dedicated Theme Selection screen. Users choose from 8 named palettes (4 light, 4 dark), accessed via a new screen pushed from Settings. Theme is stored locally in AsyncStorage only — no Supabase sync.

## Decisions

| Question | Decision |
|---|---|
| Layout | 2-column swatch grid |
| Palette scope | Accent color + background/surface variation (not full redesign) |
| Navigation | New screen pushed from Settings (like Terms of Service) |
| System/auto option | Dropped — user picks a specific palette |
| DB sync | Local only (AsyncStorage) |

## Palettes

### Light

| ID | Name | Background | Accent | Surface |
|---|---|---|---|---|
| `natural` | Natural | `#f3ede4` | `#196b4e` | `#fdfaf6` |
| `ocean` | Ocean | `#edf4fc` | `#1a6fa8` | `#f4f9ff` |
| `sunset` | Sunset | `#fdf0ea` | `#c4522a` | `#fffaf7` |
| `lavender` | Lavender | `#f5f0ff` | `#6b3fa0` | `#faf7ff` |

### Dark

| ID | Name | Background | Accent | Surface |
|---|---|---|---|---|
| `midnight` | Midnight | `#16130e` | `#2a9470` | `#201d17` |
| `navy` | Navy | `#0d1520` | `#4a9fd4` | `#162030` |
| `charcoal` | Charcoal | `#181818` | `#e07b39` | `#242424` |
| `plum` | Plum | `#1a1022` | `#9b6fd4` | `#261535` |

`natural` is the default. `midnight` maps from the previous dark default.

Each palette defines all `Theme` color tokens. The table above shows the three anchor colors; remaining tokens (`border`, `textSecondary`, `surfaceHighlight`, `danger`, `dangerSurface`, `inputBackground`, `backdrop`, `syncActive`) are derived to match the palette's color family and follow the same warm/cool/dark logic as the existing `lightTheme`/`darkTheme`.

## Data Model

```ts
// src/styles/palettes.ts (new)
type ThemeId = 'natural' | 'ocean' | 'sunset' | 'lavender'
             | 'midnight' | 'navy' | 'charcoal' | 'plum';

type Palette = Theme & { id: ThemeId; isDark: boolean };

const PALETTES: Record<ThemeId, Palette>;
const DEFAULT_THEME_ID: ThemeId = 'natural';
```

The existing `Theme` type in `src/styles/theme.ts` is unchanged. `lightTheme` and `darkTheme` exports are removed (only used in `ThemeContext.tsx`).

Storage key `@shopping-list/theme` is reused, now storing a `ThemeId` string.

## Migration

On load, if the stored value is not a valid `ThemeId`:
- `'light'` or `'system'` → `'natural'`
- `'dark'` → `'midnight'`
- anything else → `'natural'`

No user-facing prompt. Silent, on first load after update.

## Files Changed

### New
- `src/styles/palettes.ts` — `ThemeId`, `Palette` type, `PALETTES` record, `DEFAULT_THEME_ID`
- `src/screens/ThemeScreen.tsx` — theme selection screen

### Modified
- `src/styles/theme.ts` — remove `lightTheme`/`darkTheme` exports
- `src/context/ThemeContext.tsx` — swap `themeType`/`setThemeType` → `themeId`/`setThemeId`; derive `isDark` from palette; migration on load
- `src/screens/SettingsScreen.tsx` — remove dark mode Switch; add "Theme" Pressable row with current palette name + chevron; add `onTheme` prop
- `src/screens/HomeScreen.tsx` — render `ThemeScreen` for `'theme'` route; pass `onTheme` to `SettingsScreen`
- `src/types.ts` — add `| { name: 'theme' }` to `AppRoute`
- `src/hooks/useShoppingListsApp.ts` — add `goToTheme` nav function
- `src/i18n/translations/en.ts` + `he.ts` — new i18n keys (see below)

## ThemeScreen UI

- Header: back arrow + title (`theme.title`)
- Section: "Light Themes" label + 2-column swatch grid of 4 palettes
- Section: "Dark Themes" label + 2-column swatch grid of 4 palettes
- Each swatch card: 3 color dots (background · accent · surface), palette name, active border + checkmark if selected
- Tapping a palette: calls `setThemeId` immediately (live preview, no confirm)
- RTL: grid auto-flips; back arrow uses `isRTL ? 'arrow-forward' : 'arrow-back'`

## i18n Keys

```ts
// Add to en.ts and he.ts
'settings.theme': 'Theme'           // row label in Settings
'theme.title': 'Theme'              // screen title
'theme.lightThemes': 'Light Themes' // section header
'theme.darkThemes': 'Dark Themes'   // section header
'theme.natural': 'Natural'
'theme.ocean': 'Ocean'
'theme.sunset': 'Sunset'
'theme.lavender': 'Lavender'
'theme.midnight': 'Midnight'
'theme.navy': 'Navy'
'theme.charcoal': 'Charcoal'
'theme.plum': 'Plum'
```

## Behaviour

- **Live preview** — palette applies immediately on tap; AsyncStorage saves in background
- **No confirm button** — selection is the action
- **Local only** — no Supabase sync for logged-in users; theme is per-device
- **RTL** — all layout auto-flips via `I18nManager`; arrow icons follow project convention

## Testing

- Update `ThemeContext` tests: replace `'light'/'dark'/'system'` with `ThemeId` values
- Add migration test: stored value `'dark'` loads as `'midnight'`, `'light'` loads as `'natural'`
- `ThemeScreen` is pure UI — no business logic tests needed
- `goToTheme` is a one-liner nav function — no test needed
