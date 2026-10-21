# SquadUp — Gemini AI (NO SQL MIGRATION)

This is an **additive enhancement to the existing SquadUp Expo + Supabase project**, based on `squadup (3).zip`. Do NOT create a new Supabase project.

## MOST IMPORTANT: Do NOT run the SQL from the previous ZIP

- **Cancel** the `010_sports_identity.sql` query in the Supabase SQL Editor. It is **not included** in this release.
- **No table changes, no RLS-policy changes, no PostgreSQL functions, no SQL migrations.** Existing Auth, users, lobbies, chat and Join/Leave remain on the same Supabase project.
- Gemini AI is enabled by deploying **one new Supabase Edge Function** (`squadmatch-ai`) and setting **one SquadMatch-only secret** (`SQUADMATCH_GEMINI_API_KEY`). Deploying an Edge Function changes the Functions configuration, **not the database schema**.
- No need for Docker or a database backup solely to copy the source files. Still use a Git feature branch before applying changes, and obtain appropriate team consent before deploying to production.

## What works

1. Premium Sports Profile accessible from the original Profile navigation tab, using existing `users` / `squad_lobbies` / `squad_members` data.
2. Account Settings is separate. The existing avatar, name, password and language functions stay available.
3. Sports interests onboarding after login, or edit from Profile (stored on **this device only** with AsyncStorage; scoped by signed-in user ID).
4. SquadMatch AI in Feed: filters out unavailable/full/ended/out-of-radius lobbies **on device** first, sends compact eligible list and sports interests to an authenticated Supabase Edge Function, and **Gemini** picks up to three lobbies with explanations.
5. If Edge Function, internet or Gemini quota fails: **preference-based matching fallback** displays instead. The UI labels whether a result is Gemini or fallback. A fallback is **not machine learning**.
6. Manual host attendance **notes** in Lobby Details, saved only on the host's phone. These **are not shared, synced or verified**, because there is no database table.
7. Badges/XP come from the number of existing joined/hosted squad memberships and distinct sports — **not proven physical attendance**. They are for engagement, not a trust/reliability rating.
8. A viewer can see a member's **existing name/avatar** through Public Player Profile. Other users' interests/badges/XP remain private: public sharing of extra stats requires server-side consent and access rules, which this release deliberately does not add.

## Git branch first (Windows Git Bash)

```bash
cd ~/Downloads/squadup
git status
# If clean:
git switch main
git pull --ff-only origin main
git switch -c feature/squadup-gemini
```

If `git status` shows local changes, DO NOT run `git restore`, overwrite or delete files blindly. Protect them first.

## Install files

Recommended: use `SquadUp_Gemini_NoSQL_Merge_Patch.zip`. Extract to a temporary folder, then copy its `squadup/` contents into your **existing** SquadUp repository, preserving directory structure. It contains only changed and new source files. Do not replace `.git`, `.env`, or `node_modules`.

Run:

```bash
npm install     # only if node_modules is missing; not required for the patch itself
npx tsc --noEmit
npx expo start -c
```

No new npm dependency or package-lock change is required.

## Gemini setup — ONE Edge Function, ZERO SQL

You need a Gemini API key from Google AI Studio. Consider API cost and quota, and do not share the key or put it in any `EXPO_PUBLIC_*` variable.

**Step A — Save the secret in your existing Supabase project:**

1. In the Supabase Dashboard for the **same SquadUp project**, open **Edge Functions → Secrets**.
2. Add `SQUADMATCH_GEMINI_API_KEY` = your own Gemini API key. Keep it secret. **Do not edit or replace `GEMINI_API_KEY`: the existing `backend/supabase/functions/moderate-message` chat moderation function uses that secret.**
3. Optional: `SQUADMATCH_GEMINI_MODEL` = `gemini-2.5-flash` (default; availability depends on your Google account).

**Step B — Deploy the function from the root of your existing repo:**

```bash
npx supabase login
npx supabase functions deploy squadmatch-ai --project-ref YOUR_PROJECT_REF --no-verify-jwt --use-api
```

Project ref is shown in Supabase project URL / Settings → General. The function file is `supabase/functions/squadmatch-ai/index.ts`. `supabase/config.toml` sets `verify_jwt = false` for **this function only** to support modern publishable keys. **This does NOT leave the AI open to anonymous users:** the function explicitly verifies the signed-in caller's bearer session token against Supabase Auth `/auth/v1/user`, before making a paid Gemini call, and fails closed when authentication cannot be checked.

The `--use-api` option asks Supabase to bundle server-side without Docker. Remove it if your CLI version does not support it. Do not run `supabase db push`, `supabase migration up`, or old SQL from the previous ZIP.

Alternatively, deploy a function named `squadmatch-ai` in the Supabase Dashboard code editor using the complete contents of `supabase/functions/squadmatch-ai/index.ts`. Set **Verify JWT** OFF for this function only; server-side token verification still applies. Set the SquadMatch-specific Gemini secret as above.

**Step C — Verify:**

- Open Expo Go and sign in.
- Choose at least one favourite sport during onboarding (or from Profile).
- Make sure an existing lobby is open, not full and its end time is in the future.
- In the home list, `Gemini AI Picks` = API returned valid recommendations. `Preference-based matching (fallback)` = AI is not configured/available, but rule-based matching works.
- No AI request is sent for empty candidate list. Exact home latitude/longitude and user email are never sent to Gemini; the venue name and sport from **existing lobby information** are included to create recommendations.

## Safety and limitations

- Existing Supabase database is read only for these new features; regular existing Join/Leave/Profile operations still use their original services.
- The Edge Function does not query/write the database or use a service-role key. It only checks identity with Supabase Auth and requests Gemini inference.
- Authenticated clients can make Gemini requests, so a **production deployment should add durable rate limiting and budget monitoring** before wide release; there is no reliable database-backed per-user throttle in this no-schema version. Monitor usage/cost in Google AI Studio and Edge Function logs. Do not deploy to a public user base without an explicit rate-limiting plan.
- User sports preferences stay on one device, and won't sync to other devices.
- Manual host attendance marks are local notes; they cannot validate public attendance or no-show reputation across devices.
- Only existing public name/avatar can be displayed on another player's profile. Public badges/stats with privacy controls require a future, **separately approved** schema or backend design.
- No production Supabase deployment or on-device Expo Go test has been performed by the patch author; the user must configure the secrets and deploy/function-test in their project.

## Testing checklist (after applying)

- Existing registration, login, logout; language switch and password change.
- Existing Host, Join, Leave, Kick, Delete Lobby and chat permissions.
- Profile tab opens sports profile; Settings gear opens original account functions.
- Editing favourites updates SquadMatch without database schema changes.
- Join never asks for an extra RSVP.
- Host-only manual attendance notes show a clear "local only" label; a participant does not see controls.
- Empty lobby list, Gemini 429/quota error, no Gemini secret and offline mode all degrade gracefully.
- No SQL Error for missing `user_sport_preferences` / `squad_attendance` because those tables are not used.

## Rollback

- Before commit, review with `git status` and `git diff`.
- If the patch has been committed in a feature branch, revert that commit / discard the branch rather than editing production main.
- You can disable the **new** `squadmatch-ai` function through the Supabase Dashboard or remove its secret. Existing lobbies continue and SquadMatch falls back to preference matching.
- A ZIP extract **is not an automatic merge**; always review differences and test in a feature branch before raising a PR.

## Existing Gemini chat moderation stays untouched

- The existing `backend/supabase/functions/moderate-message/index.ts` reads `GEMINI_API_KEY` and optionally `GEMINI_MODEL`. Leave both in place.
- The new `supabase/functions/squadmatch-ai/index.ts` reads **only** `SQUADMATCH_GEMINI_API_KEY` and optionally `SQUADMATCH_GEMINI_MODEL`. The two features can use different Google AI Studio accounts, keys, quotas and models in the same Supabase project.
- Supabase Edge Function secrets are project-scoped, not automatically private per function; keep their **names separate** and do not expose either key in the Expo app.
- If the previous release has already been deployed, upload/redeploy this corrected SquadMatch function and set its own secret. Do **not** delete or overwrite the chat moderation secret.
