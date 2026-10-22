# SquadUp — UI/UX Refinement V2

## What this patch is

A **small merge patch** for the already-installed **SquadUp Gemini Separate Keys** version. This is **not a replacement project**. Apply it on the existing feature branch `feature/squadup-enhancements`. It doesn't modify package manifests, Supabase database schema, RLS, existing Edge Functions, Gemini secrets, login, chat moderation, or existing Join/Leave service logic.

## Changes

1. **Sports Preferences**: visible **All Days** toggle defaults to selected; selecting a weekday deselects All Days. If individual weekdays are all deselected, All Days is selected again. Removed preferred radius and optional GPS prompt. Existing local preferences remain readable; whenever preferences are saved in V2, legacy GPS fields are cleared on the device.
2. **SquadMatch recommendations**: prominent navy contained section and horizontally swipeable cards, dot pagination, Gemini/fallback attribution, match reasons and a **View & Join** call-to-action. Tapping the card **opens the existing Lobby Details**. It does *not* auto-join; users can review the event before they join.
3. **Lobby Details**: fixed missing action for non-member on an eligible open squad. Button calls the **existing** `joinLobby()` function and refreshes lobby/members after the request. A full/ended squad shows an explanation instead of an empty dock.
4. **Nearby Squads**: separate visual section with joinable squads at top, followed by full/expired ones; ascending start time within each group. Existing filter and map are preserved.
5. **Sports Profile**: white, high-contrast header Settings button; larger, consistently spaced Play Style tiles.

**Important: The floating gray gear seen over multiple screens may be the Expo Go developer overlay; that overlay is not an app control and cannot be recolored by a SquadUp component patch.** The real button in SquadUp's Sports Profile header is now white with a blue icon.

## Install (Windows, safely)

**Before copying:** `git status` should show branch `feature/squadup-enhancements` and a clean working tree. If you still have uncommitted work, commit it or save a snapshot **before** applying this patch. Avoid `git restore` on any work you wish to keep.

1. Extract `SquadUp_V2_Refinement_Merge_Patch.zip` to a temporary folder.
2. Open its inner **`squadup`** folder.
3. Copy the **contents** of that inner folder into your existing `Downloads/squadup` project root. Merge folders and replace only matching files from the patch. Do not create `squadup/squadup`.
4. Do **not** copy an old Full Project ZIP and do **not** touch `.git`, `.env`, or `node_modules`.
5. Review changes using:
   ```bash
   git status
   git diff --stat
   git diff -- mobile/screens/LobbyDetailScreen.tsx mobile/screens/FeedScreen.tsx
   ```
6. Type-check using your **already-installed** dependencies:
   ```bash
   npx tsc --noEmit
   ```
7. Run existing and V2 logic tests if Node and TypeScript are installed locally:
   ```bash
   node --test tests/*.test.cjs
   ```
8. Start Metro:
   ```bash
   npx expo start -c
   ```

## Manual smoke test on Expo Go

- Log in as before, open Sports Preferences. **All Days** is visibly selected by default. Select `Sat`, verify All Days deselects; deselect `Sat`, verify All Days returns. Save and reopen the page.
- Confirm **no preferred-distance / GPS selector** on the Sports Preferences screen. Existing lobby maps and location data should still work.
- On Home, swipe the **Picked For You** recommendation cards sideways; test dots and **View & Join**.
- On an **open lobby you haven't joined**, Lobby Details must display **Join** at the bottom. Join once; the member list and chat/leave controls should update. **Never double-tap Join** if the network is slow.
- On an already joined/hosted lobby, ensure chat, leave, delete (host), kick (host) and local attendance notes are unchanged.
- On Home, full lobbies appear **below available** lobbies. Sport filters and map still work.
- On Profile, check **Play Style** spacing, white header gear, and old Settings options (name/photo/language/password).
- Check whether Home says **Gemini AI** or **Preference matching · fallback**. Both should continue to work with the same existing `squadmatch-ai` Edge Function.

## Supabase action required

**None.** No SQL migration, secret changes, Gemini key changes, deploy or database writes have been added to this patch. Your existing Supabase project must already have the `squadmatch-ai` function and its key configured for live Gemini recommendations (as in the previous version).

## Known testing limitations

V2 logic/security tests and TypeScript syntax transpilation were run in the build environment. A **complete Expo/TypeScript semantic compilation and phone runtime test could not be completed** because the dependency install did not finish in the isolated environment; please perform `npx tsc --noEmit` and the phone smoke test on your machine **before** committing or opening a PR. No production Supabase credentials were used or touched.

## Rollback

If you installed into a clean **feature branch** and have not made other changes, you can revert individual V2-modified files from Git using VS Code Source Control (Discard Changes), or use a pre-copy commit/checkpoint. Do **not** run `git clean -fd` or blanket restores in a project with other uncommitted work.
