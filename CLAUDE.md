# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A collection of independent, self-contained single-page apps — each one a single `.html` file with inline `<style>` and `<script>`. There is no build system, no `package.json`, no bundler, and no test suite. Every app loads its dependencies (React, Firebase, pdf.js, fonts) from public CDNs via `<script>` tags at the top of the file.

Most UI is Hebrew/RTL (`lang="he" dir="rtl"`), mobile-first (content capped around 420-480px wide), and designed to be installed as a PWA on a phone.

## Running / previewing an app

There's nothing to install or compile. To preview a change:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/<file>.html
```

Opening the file directly via `file://` mostly works too, but service worker registration (`sw.js`) and some fetches require an http(s) origin, so prefer the local server when testing PWA/install behavior.

There is no linter, formatter, or automated test suite in this repo — verify changes by loading the page in a browser and exercising the feature manually.

## Deployment

`.github/workflows/pages.yml` deploys the **entire repository root** to GitHub Pages on every push to `main` (no build step — it just uploads the tree as-is). This means:

- `index.html` is what visitors see at the site root. It currently mirrors `apex.html` (they're the same app at slightly different points of edit — check whether a change needs to land in both or is intentionally diverging before touching one).
- Any `.html` file added at the repo root becomes reachable at `/that-file.html` immediately on merge to `main`.
- The `vytal/` directory is a self-contained subfolder (its own `index.html`, `manifest.json`, `sw.js`) served at `/vytal/`. `vytal.html` at the root is a separate, diverged copy of the same app — same caveat as index/apex above.

Firestore rules (`firestore.rules`) are deployed separately via the Firebase CLI (`firebase deploy --only firestore:rules`, project `soccer-26e99` per `.firebaserc`) — this is **not** wired into the GitHub Actions workflow, so rule changes must be pushed manually if needed.

## Shared Firebase backend — the key architectural fact

Most apps in this repo are independent products, but several of them share **one single Firestore project** (`soccer-26e99`), with the same hardcoded `firebaseConfig` copy-pasted into each file. The Firestore rules are wide open:

```
allow read, write: if true;
```

Because every app reads/writes the same database with no isolation from rules, **each app namespaces its own data** to avoid colliding with other apps' documents:

- **Collection prefixes**: apps define a short prefix variable and prepend it to every collection name, e.g. `soccer.html` (`FootballCoach`) uses `var P = 'fc_';` → `db.collection(P+'matches')`; `athleteiq.html` uses `var P = 'ath_';`; `budget.html` uses raw `'bud_...'` collection names (`bud_expenses`, `bud_income`, ...); `worldcup.html` uses `'wc_...'`; `mundial.html` (a newer World Cup 2026 app) uses `'wc2_...'`. `client-app.html` / `manager-app.html` / `register.html` are one family and share `db.collection("clients")` deliberately.
- **Storage keys**: the same convention applies to `localStorage`/`sessionStorage` — e.g. the NIR AVIV client/manager apps use an `"na_"` prefix (`na_current_user`, `na_clients`, ...).

If you add a new Firebase-backed app or new collections to an existing one, follow this prefix convention — do not use bare/generic collection or storage-key names, since there is no per-app data isolation at the database-rules level.

Firebase SDK usage is the older **compat** style loaded via script tags (`firebase-app-compat.js`, `firebase-firestore-compat.js`, `firebase-auth-compat.js`), not the modern modular SDK — global `db`/`auth` objects, `.then()` callbacks, ES5-style `function(){}` code rather than modules or arrow-heavy modern JS. Match that style when editing these files.

Only `soccer.html` uses real Firebase Auth (phone number + invisible reCAPTCHA via `firebase.auth.RecaptchaVerifier` / `signInWithPhoneNumber`). The other apps (client-app/manager-app/register, worldcup, mundial, budget, athleteiq) roll their own lightweight auth: credentials are checked against a Firestore document directly, and the session is kept in `sessionStorage`/`localStorage`.

## Two coding styles in this repo

- **Vanilla + Firebase compat** (most apps: `soccer.html`, `athleteiq.html`, `budget.html`, `client-app.html`, `manager-app.html`, `register.html`, `mundial.html`, `worldcup.html`): plain ES5-ish JS, global functions, direct DOM manipulation, Firestore compat SDK.
- **React via CDN, no build step** (`apex.html` / `index.html`): React 18 + ReactDOM UMD builds plus in-browser Babel (`babel-standalone`) transpiling `<script type="text/babel">` blocks. There's no JSX compile step or npm — Babel runs client-side on page load.

Match the existing style of whichever file you're editing rather than introducing a new pattern into it.

## App directory (root-level files)

Filenames don't always indicate purpose — for quick orientation:

| File | App | Backend |
|---|---|---|
| `index.html` / `apex.html` | APEX — autonomous ad agency tool | none (local state) |
| `soccer.html` | FootballCoach — coach's match/training/player-clip tracker | Firebase (`fc_` / real Auth) |
| `athleteiq.html` | AthleteIQ | Firebase (`ath_`) |
| `client-app.html` / `manager-app.html` / `register.html` | NIR AVIV client & manager portals + signup | Firebase (`clients`, custom auth) |
| `worldcup.html` | מלך השער — World Cup 2026 predictions game (v1) | Firebase (`wc_`) |
| `mundial.html` | מונדיאל 2026 — World Cup predictions game (v2, newer) | Firebase (`wc2_`) |
| `budget.html` | Family budget tracker | Firebase (`bud_`) |
| `clash-lite.html` | PDF plan clash-detection report tool (uses pdf.js) | none (client-side only) |
| `weightstock.html` | Weight-based inventory tracker | localStorage only |
| `memory-app.html` | Personal reminders app | localStorage only |
| `vytal.html` / `vytal/index.html` | Vytal OS — onboarding/questionnaire flow | none (local state) |
| `business-card.html` | Digital business card | static |
| `prokids.html` | PRO KIDS Football Academy marketing site | static |
| `worldcup-old-index.html` | Legacy stub — meta-refresh redirect to `register.html` | — |

PWA manifests are paired per app: `manifest.json` (client-app), `manager-manifest.json` (manager-app), `memory-manifest.json` (memory-app), and `vytal/manifest.json` — each with a matching `start_url` and its own `sw.js` (root `sw.js` is a minimal skip-waiting/claim-clients worker shared by the root-level PWAs).
