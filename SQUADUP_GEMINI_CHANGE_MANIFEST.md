# SquadUp Gemini No-SQL Release — Change Manifest

Baseline: the uploaded `squadup (3).zip`, not a new project. All files not in the following list are unchanged relative to that ZIP.

**New files:**
- `mobile/services/sportsIdentityService.ts` — per-user, device-only sports preferences and host-only local attendance notes; read-only lobby/profile summaries.
- `mobile/services/squadMatchService.ts` — hard-filtered preference fallback and Gemini Edge Function invocation.
- `mobile/screens/SportsPreferencesScreen.tsx` — onboarding and editable sports preferences.
- `mobile/screens/SettingsScreen.tsx` — original account/profile settings split from Sports Profile.
- `mobile/components/SquadMatchSection.tsx` — Gemini recommendations or honest preference-based fallback.
- `mobile/components/SquadAttendanceCard.tsx` — optional local host attendance notes (not synced).
- `mobile/utils/sportsAchievements.ts` — XP and badges based on existing squad membership/hosting, not physical attendance.
- `src/app/(player)/preferences.tsx` — onboarding router screen.
- `src/app/(player)/settings.tsx` — settings router screen.
- `src/app/(player)/player/[id].tsx` — public profile viewer (existing name/avatar only).
- `supabase/config.toml` — config affecting only the new Edge Function.
- `supabase/functions/squadmatch-ai/index.ts` — authenticated, read-only Gemini inference; key stored server-side.
- `tests/squadmatchEdge.test.cjs` — security and validation tests with mocked Gemini response.
- `SQUADUP_GEMINI_NO_SQL_GUIDE.md` — installation and Supabase Edge Function setup.
- `SQUADUP_GEMINI_CHANGE_MANIFEST.md` — this file.

**Changed existing files:**
- `mobile/App.tsx` — navigation support for new screens in legacy route.
- `src/app/(player)/index.tsx` — first-login onboarding in Expo Router.
- `src/app/(player)/profile.tsx` — opens Sports Profile + Settings navigation.
- `src/app/(player)/lobby/[id].tsx` — opens player profile from existing lobby.
- `mobile/screens/LobbyDetailScreen.tsx` — displays host-only attendance notes and clickable player card.
- `mobile/screens/FeedScreen.tsx` — shows SquadMatch recommendation section, retains original Join and lobby cards.
- `mobile/screens/ProfileScreen.tsx` — premium sports profile in Profile tab.
- `tsconfig.json` — excludes Edge Function Deno code from React Native TypeScript typecheck.

**Explicitly unchanged:**
- `package.json`, `package-lock.json`, `.gitignore`, `mobile/services/lobbyService.ts`, `mobile/services/chatService.ts`, `mobile/services/authService.ts`, `mobile/services/profileService.ts`, `mobile/services/supabaseClient.ts`.
- Every existing `backend/supabase/migrations/*.sql` file.
- The Supabase database schema, row-level security policies and stored data are not modified by merely installing the patch.

**Important differences versus previous proposal:**
- No `010_sports_identity.sql` migration. Do not run the old one.
- Gemini AI is genuine model-powered **only when the new Edge Function has been deployed and configured**; preference matching is an explicitly non-AI fallback.
- No shared/public sports stats, verified attendance, automated no-show penalties, or synced badges. Those would require additional approved backend work.

**Verification performed on working copy:**
- `tsc --noEmit`: **PASS (exit 0)**.
- 22 existing automated tests: **PASS**.
- 5 new Edge Function tests: **PASS** (mocked Auth and Gemini, no network/API-key access).
- TS/TSX syntax transpilation of all 68 source files: **PASS**.
- Expo Go / live Supabase deployment: **NOT tested**; must be validated by the owner.

Use the **Merge Patch ZIP** for an existing team Git repository. The full ZIP is an optional clean source snapshot without `.git`, `.env`, `.expo` or `node_modules`.

**Secrets compatibility correction:** SquadMatch Edge Function uses `SQUADMATCH_GEMINI_API_KEY` / optional `SQUADMATCH_GEMINI_MODEL`, not the shared `GEMINI_API_KEY` / `GEMINI_MODEL` used by existing chat moderation. No chat moderation files changed.
