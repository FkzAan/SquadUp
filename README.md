# SquadUp Township

**Find the right people to play with, right where you live.**

SquadUp is a hyper-local micro-matchmaking mobile app for township residents. Anyone can open a "squad" for a sport or activity at a nearby place, and AI recommends the right squads to players based on their favourite sports. It is built for shy and introverted young people, and gives township developers community data about how residents want to use their facilities.

SDP University Hackathon 2026 · Sime Darby Property · Theme 1: PEOPLE

> "Every township has the courts. SquadUp brings the people."

---

## Judges: quick links

| | |
|---|---|
| Pitch video | `https://youtu.be/xe5eqPw3trY` |
| Slides | `https://canva.link/hc6f8chkocp4otd` |
| Prototype | `https://expo.dev/artifacts/eas/7Jb9eDAeJf_3X7Yv_PFFiuQ8bG9cY1-EfJ3y4goLUDk.apk` |
| Google Sheet | `https://docs.google.com/spreadsheets/d/10vroWJeX-g4sGtFT7PsPxFSbJwEQrcVeU5f7VfXpF2U/edit?usp=sharing` |
---

## Try it in 5 minutes (Expo Go)

You do not need a Supabase account, API key or `.env` file. The app connects to our hosted backend.

### What you need

- A phone with **Expo Go** (App Store or Google Play). Use the latest version, because the project uses Expo SDK 57.
- A computer with **Node.js 20 or newer** and **Git**.
- Your phone and computer on the **same Wi-Fi**.

### Steps

```bash
git clone https://github.com/Meloppa/SquadUp.git
cd squadup-app
npm install
npx expo start -c
```

1. A QR code appears in the terminal.
2. **Android:** open Expo Go and tap **Scan QR code**.
   **iPhone:** open the normal Camera app and scan the code, then tap the Expo Go prompt.
3. Wait for the bundle to load (about 1 minute the first time).

If the phone cannot connect (for example on a campus or hotel Wi-Fi), stop the server and run:

```bash
npx expo start --tunnel
```

> Use a physical phone or an Android/iOS emulator. The web version is not supported, because the map uses native components.

---

## Signing in

### As a player (create your own account)

1. On the sign-in screen, switch to **Sign up**.
2. Enter any name, an email and a password, then continue. There is no email confirmation step.
3. You can also use the demo player accounts below.

| Role | Email | Password |
|---|---|---|
| Player (demo) | `<YOUR EMAIL>` | `<PASSWORD>` |
| Admin / township developer | `<squadupadmin@gmail.com>` | `<admin123>` |

Admin access is decided by the database, not by the email address. The admin account opens the **Admin Dashboard** automatically after sign-in. All other accounts open the player app.

### Switching language

The app supports **English** and **Bahasa Melayu**. Change it from the language selector on the sign-in screen or in Settings.

---

## Suggested walkthrough (about 4 minutes)

Follow this path to see everything that matters. For a live two-player demo, use two phones (or one phone and one emulator) signed into different accounts.

### 1. Set your sports (30 seconds)
- After your first sign-in, choose your favourite sports (for example badminton and futsal) and save.
- You can edit them anytime from **Profile**.

### 2. See AI SquadMatch (1 minute) — the star feature
- Open the **Feed**. At the top, the **"Picked For You"** section shows squads recommended for your sports, powered by Google Gemini.
- Tap a recommendation, then **View & Join**.
- If the AI service is unavailable, the app clearly falls back to simple preference-based matching, so recommendations never break.

### 3. Join a squad and watch it update live (40 seconds)
- Tap **Join**. There is no booking or payment.
- On a second device, join the same squad. The member list updates in real time on the first device.
- In the lobby detail, try **Copy coordinates** and **Open in Google Maps**.
- The **Map** tab shows all open squads as pins.

### 4. Host your own squad (40 seconds)
- Tap **Host Squad** in the bottom navigation.
- Type any activity name, drop an exact pin on the map, choose date and time, set the player limit with the slider, and choose **Friendly** or **Competitive**.
- Create it and see it appear on the feed of the other device.

### 5. Try the safe group chat (30 seconds)
- Open a squad you have joined, then **Chat**.
- Send a normal message such as "jom main malam ni". It goes through.
- Try sending abusive text. The **AI Chat Safety Guard** blocks it before other members can see it.
- As the host, you can **Remove** a player from the squad. Removed players cannot rejoin.

### 6. Check your sports profile (20 seconds)
- Open **Profile** to see your level, XP bar, achievement badges (First Squad, Squad Regular, Host Hero, Sport Explorer) and activity statistics.

### 7. See what the developer sees (30 seconds)
- Sign in with the **admin account** (on a second device, or after signing out).
- The **Admin Dashboard** shows community insights: activity over the last 7 days, popular activities and locations, squad fill rate, an activity map, and CSV export.
- Admins can also end or cancel a squad.

---

## Feature list

**For players**
- Email sign-up and sign-in, profile name, avatar and password
- Favourite-sports onboarding
- **AI SquadMatch** recommendations (Google Gemini, with a preference-based fallback)
- Feed with list and map views, updated in real time
- Host a squad with free-text activity, exact map pin, date and time, player slider, Friendly or Competitive
- One-tap join and leave, with no booking or payment
- Copy exact coordinates and open in Google Maps
- Temporary group chat (no private DMs), deleted 2 hours after the activity ends
- **AI Chat Safety Guard** that blocks profanity, harassment, scams, personal information and sexual content in Bahasa Melayu, English and mixed slang
- Host can remove a player, and a removed player cannot rejoin
- Sports profile with XP, levels, achievement badges and activity statistics
- English and Bahasa Melayu

**For the township developer (Admin Dashboard)**
- Community insights, activity map, popular activities and locations, and squad fill rate
- CSV export
- End or cancel a squad

---

## Honest notes about scope

- XP, badges and statistics come from squad **join and host records**. They are not verified attendance.
- Dashboard figures show squad **activity and interest**, not verified facility bookings.
- Other players' XP and badges are private. Only name and avatar are visible to squad members.
- Chat moderation is built. Moderation of lobby names is a planned next step.
- Interests and host attendance notes are stored on the device only.

---

## Tech stack (100% free tier)

| Layer | Technology |
|---|---|
| Mobile app | React Native (Expo SDK 57), Expo Router, TypeScript |
| Backend | Supabase: Postgres, Auth, Realtime, Storage, Edge Functions, Row Level Security |
| AI | Google Gemini via Supabase Edge Functions (`squadmatch-ai`, `moderate-message`). API keys stay on the server |
| Maps | Leaflet and OpenStreetMap in a WebView |

### How it works

- All data rules are enforced in the database with Row Level Security, triggers and `security definer` functions. Examples: squad capacity checks, host-only removal, and a removed player's rejoin block.
- Chat messages go through the `moderate-message` Edge Function before they are saved.
- Chat is deleted by a scheduled database job 2 hours after a squad ends, and squads expire 15 minutes after they end.

### Project structure

```
mobile/                  Screens, components, services, localization
src/app/                 Expo Router routes (player and admin)
backend/supabase/        SQL migrations and the chat-moderation Edge Function
supabase/functions/      SquadMatch AI Edge Function
shared/                  Role resolution
tests/                   Automated tests
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| QR code does not connect | Put phone and computer on the same Wi-Fi, or run `npx expo start --tunnel` |
| "Incompatible SDK version" in Expo Go | Update Expo Go to the latest version |
| Old screens or red error after pulling updates | Run `npx expo start -c` to clear the cache |
| Sign-in or data does not load | Check your internet. The backend is hosted online and needs a connection |
| Map is blank | Wait a few seconds. The map loads its tiles from the internet |
| Opened in a web browser and it fails | Use the phone app. The web version is not supported |

---

## Team

`<A.EYE>`: `<SHAHMIL>`, `<FARHAN>`, `<FARIZ>`, `<FAIQ>`

Licensed under the terms in [LICENSE](LICENSE).
