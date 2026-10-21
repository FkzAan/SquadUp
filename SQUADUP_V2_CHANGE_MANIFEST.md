# SquadUp V2 — precise change manifest

Based on `SquadUp_Gemini_Separate_Keys_Full_Project.zip` (the version already in use).

## Modified files

- `mobile/screens/SportsPreferencesScreen.tsx` — explicit All Days preference; remove distance/GPS options and old location prompt
- `mobile/services/squadMatchService.ts` — remove legacy radius filtering and coordinate-sensitive scores, respect All Days default
- `mobile/screens/FeedScreen.tsx` — joinable-first sorted list, visually separate section header, pass joined status to recommendations
- `mobile/components/SquadMatchSection.tsx` — contained Gemini/fallback recommendation carousel and View & Join affordance
- `mobile/screens/LobbyDetailScreen.tsx` — Join action for eligible nonmembers, using existing service; full/ended explanation
- `mobile/screens/ProfileScreen.tsx` — white header Settings control, better Play Style spacing

## Added files

- `mobile/utils/squadSort.ts` — pure presentation-order utility
- `tests/refinementV2.test.cjs` — regression checks for ordering, all days, radius removal, UI Join wiring
- `SQUADUP_V2_REFINEMENT_INSTALL_GUIDE.md` — installation, tests, Supabase scope and rollback
- `SQUADUP_V2_CHANGE_MANIFEST.md` — this manifest

## Explicitly not modified

`package.json`, `package-lock.json`, all existing SQL/migrations, `supabase/functions/squadmatch-ai/index.ts`, `backend/supabase/functions/moderate-message/index.ts`, existing `lobbyService.ts`, auth/session services, chat services, profile service, Supabase secrets, `.env` and `.git`.

## Checks

- 7 changed TypeScript/TSX files: syntax transpilation checks passed (including one newly added TS utility).
- `node --test tests/*.test.cjs` with a locally available TypeScript transpiler: **11/11 passed** (5 V2 and 6 existing Gemini Edge tests).
- Project-wide TypeScript semantic check: **not available in isolated environment** because `npm ci` could not complete.
- Expo Go runtime and live Supabase calls: **not tested** in isolated environment.
