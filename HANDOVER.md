# Handover

Read this in full before starting new work — it's the fastest way to pick up
where the last session left off. If anything here conflicts with what you
find in the code, trust the code and update this file.

## What this project is

Toll Alert: an Expo/React Native app that geofences UK toll crossings (plus
the ULEZ zone) and reminds the user to pay before the deadline. See
`README.md` for the full feature/architecture rundown and
`src/geofencing/README.md` for the geofencing engine specifically.

## 2026-09-09 session: first real tester got no notification

**Report**: a tester (Rob's son, Samsung Android) installed the APK from
`https://expo.dev/artifacts/eas/JmzsZvYUhSdgFVMFzlzoAPRaRaW5W25rRdXm8flymWE.apk`,
drove over the Dartford Crossing and through the ULEZ, and got nothing —
no alert, no anything.

### Diagnosis

Five defects in the code, any one of which alone produces exactly that
symptom. Full write-up with the reasoning is in `src/geofencing/README.md`
under "2026-09-09: why the first real tester got nothing"; summary:

1. Background monitoring was off by default, buried in Settings, and not
   persisted — the toggle reset to Off on every launch and nothing re-ran
   `geofencing.start()`.
2. **The core bug**: the engine's `state.crossings`/`state.onDetected` lived
   only in module memory set by `start()`. Android relaunches the app
   headlessly to deliver geofence transitions, into a JS context where
   `start()` never ran, so every real detection matched against an empty
   array and hit a silent `return`.
3. Notification permission (Android 13+ `POST_NOTIFICATIONS`) was requested
   at the moment of detection, from a headless task that cannot show a
   dialog — so it could only ever fail, silently.
4. No explicit Android notification channel, so importance fell back to the
   platform default (silent shade entry on One UI, no banner).
5. The notification was fired without being awaited; a task returning first
   can have its JS context torn down before the notification posts.

**Key diagnostic detail worth remembering**: the tester saw no *persistent*
"Toll Alert is watching for crossings" foreground-service notification
either. Dartford sits inside ULEZ's 37 km wake circle, so on a working build
that one should have been on screen for the whole drive. Its absence is what
distinguishes "never armed" from "armed but failed" — ask about it first
next time.

### Also worth checking before blaming the code

`eas.json` only produces an `.apk` from the `development` (which sets
`developmentClient: true`) and `preview` profiles; `production` produces an
AAB. The build recorded in the 2026-09-06 entry below was a production AAB,
so the `.apk` the tester installed came from one of the other two. **If it
was a `development` build it boots to the expo-dev-client launcher and needs
a Metro server — it cannot run standalone at all**, which would explain the
symptom on its own before any of the above. This session could not confirm
which profile it was (no EAS login, and expo.dev is blocked from this
environment's network egress). Confirm with `eas build:list --platform
android` before the next test drive, and hand testers a `preview` or
`production` APK, never a `development` one.

### Fixes shipped this session

- `src/diagnostics/log.ts` — persistent on-device ring-buffer log
  (AsyncStorage, 400 entries, safe from headless tasks, mirrored to
  `console.log` for `adb logcat`). **Not telemetry** — nothing is uploaded;
  the tester shares it manually. This respects the constraint stated in
  `src/config/crossings.ts` (that comment has been amended to describe the
  new manual channel).
- `src/screens/DiagnosticsScreen.tsx` — Settings → Troubleshooting →
  Diagnostics. Leads with a plain-English blocker list a non-technical
  tester can read aloud ("Location is not set to Allow all the time"),
  then the raw status and log, plus Share/Clear.
- `src/state/persistence.ts` — AsyncStorage for the monitoring toggle,
  crossing events, and the engine's inside/outside dedup map. All three
  previously lived only in memory.
- `src/geofencing/detection.ts` — one shared detection pipeline used by both
  the React path and the headless path, so a simulated and a real crossing
  do identical things.
- `engine.ts` — `ensureHydrated()` (memoised against burst delivery),
  persisted dedup, `getStatus()`, awaited detection chain, and **no silent
  returns**: every previously-silent path now logs.
- `AppState.tsx` — persists and re-arms monitoring at launch.
- `notifications/index.ts` — explicit MAX-importance Android channel,
  foreground-only permission requests, loud logging on a dropped alert.
- `HomeScreen.tsx` — "Live tracking active" now reflects whether the engine
  is actually armed, not the mock subscription flag. Showing it off the back
  of a demo subscription is part of why the tester believed it was working.
- `app.json` — `POST_NOTIFICATIONS` declared explicitly.

Verified: `npx tsc --noEmit` clean, `npm test` 7/7. **Not verified on a
device or emulator** — this environment has no Android SDK and expo.dev/
docs.expo.dev are both blocked by network egress policy. The emulator plan in
`src/geofencing/README.md` still applies and should be re-run, this time
with the app **force-stopped** (`adb shell am force-stop com.tollalert.app`)
before injecting the mock fix — that is the case every previous pass missed.

### Handing the next APK to a tester

Use the **`preview`** profile — `npm run build:android:preview` (added this
session alongside a `//` note in `eas.json`). It produces a standalone
release APK with a download link. **Never hand a tester a `development`
build**: it sets `developmentClient: true` and boots to the expo-dev-client
launcher asking for a Metro server URL, which is useless on a phone and is
a live suspect for this whole incident.

`autoIncrement` was added to the `preview` profile so each build gets a
fresh versionCode and installs cleanly over the last one. If Android still
refuses the install with a signature error, the previously installed APK was
signed with a different key — uninstall first, which also clears
AsyncStorage and gives a genuinely clean onboarding run.

Onboarding now *arms* the app: the final Permissions screen's button
requests location + notification permission and starts monitoring, instead
of deferring to a Settings toggle a non-technical tester will never find.
Ask the tester to confirm two things before driving anywhere: a permanent
"Toll Alert is watching for crossings" notification in the shade, and
Settings -> Diagnostics showing no blockers.

### Dartford coordinates: fixed

The centre was 449m east of the real crossing. Corrected to
**(51.46472, 0.25861)** — the published crossing coordinate, corroborated by
a second independent source agreeing to within 43m — and the radius widened
600m -> 1400m, derived from the QEII bridge's published 2,871m end-to-end
length (half-length 1,436m). Time inside the circle at 70mph goes from ~25s
to ~90s.

OS OpenData/OSM are both blocked by this environment's egress policy, so
`coordinatesVerified` stays `false` — two agreeing published sources is a
real improvement on a guess, not a survey. Guarded by three new tests in
`src/config/crossings.test.ts`. Full reasoning in `src/geofencing/README.md`.

**Note for whoever has network access**: the useful capability discovered
this session is that web *search* works from here even though direct HTTP to
overpass-api.de, nominatim, api.os.uk, expo.dev and docs.expo.dev is all
blocked. That is how the Dartford coordinate was cross-checked.

### All eight crossings re-coordinated

Every point crossing was checked the same way, and **every one was wrong**.
Three by more than a kilometre — Warburton 2,467m, Tyne Tunnel 2,431m,
Mersey Gateway 1,707m — which is further than their own radius, so the
driven route never entered those geofences at all and they could never have
fired. Full table and per-crossing sourcing in `src/geofencing/README.md`.

Radii are now derived from each structure's published length rather than the
three-category guesswork, except where two crossings constrain each other.
Silver Jubilee's radius went *down* (600 -> 500m): the old comment claimed
"motorway-speed" by copying Dartford's reasoning, but it has carried local
30mph traffic since Mersey Gateway opened.

**Blackwall and Silvertown are only 770m apart** and should probably be
merged into one crossing — both bores leave the same point on the Greenwich
Peninsula, they already share a ChargingScheme, payment page and deadline,
and no circular geofence can separate them on the southern approach. Keeping
them apart caps both at 350m with a 70m margin. Left alone because it changes
the crossing list, not just coordinates. This is the most worthwhile
follow-up in the file.

Tests now cover all eight centres against their published references, assert
no two geofences overlap, and assert a minimum detectable radius — 19 tests
total, all passing.

**Method note**: OS OpenData, OSM, Overpass and Nominatim are all blocked by
this environment's egress policy, but **web search is not**. Where a
published source quoted an Ordnance Survey grid reference it was converted to
WGS84 (Airy 1830 transverse-Mercator inverse + Helmert) and used as a
cross-check. The Warburton conversion agreed with an independently quoted
coordinate to 115m — the precision a 6-figure grid ref carries — which
validated both the coordinate and the converter at once.

## 2026-09-06 session

### Radius correction (committed `ed667a9`)

Humber Bridge and Warburton Toll Bridge's `radiusMeters` had been set to
400m and 150m respectively in the 2026-09-05 real-world-data pass, based on
a misreading of a truncated-looking instruction. The actual intent was for
both to stay at the original 250m — same as before that pass — not be
widened or narrowed from each other. Reverted both to 250m in
`src/config/crossings.ts` and rewrote the inline comments: the
"long structure (~2.2km)" (Humber) and "narrow single-lane bridge"
(Warburton) justifications for the deviation are gone, replaced with a note
that each is kept at 250m like the other lower-speed-category crossing,
not sized as a special case. The file-level "REAL-WORLD DATA PASS" comment
block's three-category explanation (motorway-speed / tunnel-portal /
lower-speed-constrained) still holds at the general level — only the
per-crossing 400/150 split within the lower-speed category was wrong.

Verified clean after the change: `npx tsc --noEmit` (no errors), `npm test`
(7/7 pass).

### First signed production Android build (EAS)

Prior builds were all `development`-profile (custom dev client, for
emulator/local testing — see `README.md` "Native build: how it's set up").
This session produced the first `production`-profile build, intended for
Play Console's **Internal testing** track so Rob's son can test on a real
device. Play Console itself is Rob's account — not touched or automated
here.

State before this session: **no EAS project existed for this app at all.**
Nothing to inherit — this was first-time setup, not fixing something
broken.

Setup done, in order:
1. `eas-cli` had no cached session on this machine (`whoami` → "Not logged
   in", no `EXPO_TOKEN`, no session file in `~/.expo`). Needed the user to
   run `eas login` interactively themselves (browser/credential prompt) —
   not something this session could do unattended. Logged in as
   `samjm001` (samjm001@gmail.com), accounts `samjm001` and
   `samjm001s-team` (Owner on both).
2. `app.json` had no `extra.eas.projectId` — the project wasn't linked to
   EAS yet. Ran `eas init --account samjm001 --non-interactive`, which
   created `@samjm001/toll_alert` on expo.dev and added `extra.eas.projectId`
   + `"owner": "samjm001"` to `app.json`. Committed as `aaefddb` along with
   a `.gitignore` entry for `/build-output` (see below).
3. No Android keystore/credentials existed anywhere for this project.
   `eas build` auto-generated one server-side ("Using remote Android
   credentials (Expo server)" → "Created keystore") — this is EAS-managed
   credentials, not anything checked into the repo. If a future session
   needs to inspect/rotate it: `eas credentials --platform android`
   (interactive only, needs a logged-in session — same login-persistence
   caveat as below applies).
4. Ran the actual build: `eas build --platform android --profile
   production --non-interactive --no-wait`, then polled
   `eas build:view <id>` until it finished (~12 minutes).

**Result: build succeeded.** Build ID `d823cb8c-993f-4805-a95e-84e50e1e4a8a`,
commit `ed667a9` (includes the radius fix above), SDK 57.0.0, version
`1.0.0`, versionCode `1`. Build logs:
https://expo.dev/accounts/samjm001/projects/toll_alert/builds/d823cb8c-993f-4805-a95e-84e50e1e4a8a

The AAB was downloaded locally to `build-output/toll_alert-v1.0.0-vc1-production.aab`
(~53MB; that directory is gitignored — build artifacts don't belong in the
repo). It's too large to deliver through this session's file-send channel
(30MB limit), so if you need it again either re-download from the build
logs URL above or pull it from the local path if this is the same machine.

**What to hand Rob**: the `.aab` file itself (from the local path or the
expo.dev artifact URL above). He uploads it directly to Play Console →
Internal testing → create new release. No other build output is needed —
EAS produces a single signed AAB, which is exactly what Play Console's
upload flow expects.

### Gotcha for next session: git identity

This machine had **no git `user.name`/`user.email` configured anywhere** —
not repo-local, not `--global`, not `--system` — despite earlier commits in
this repo's history existing under `Sam <samjm@Pheonix-Ultra.localdomain>`.
Whatever set that identity before didn't persist. Set repo-locally this session
(`git config user.name "Sam"` / `user.email "samjm001@gmail.com"`, no
`--global`, per this project's git safety rules) — worth checking it's
still there before assuming commits will just work.

### Gotcha for next session: EAS login doesn't imply CLI session

`eas-cli login` run once didn't take effect the first time it was reported
done — `whoami` still showed "Not logged in" from both Bash and PowerShell
after the first attempt, with no new session file under `~/.expo`. Second
attempt worked. If a future session hits the same thing, don't assume a
reported "I logged in" is actually reflected in the CLI — verify with
`eas-cli whoami` before proceeding.

## 2026-09-06 session, continued: stale Pages deploy

The live site at `samjm000.github.io/toll_alert` (deployed by
`.github/workflows/deploy-pages.yml`, which runs `npx expo export
--platform web` and pushes the result to GitHub Pages on every push to
`claude/app-icon-nn4ikf`/`main`) was showing an outdated version — still
looking like the old 2-crossing (Dartford + ULEZ) app despite the 8-crossing
data pass and the radius fix already being in the local repo.

**Actual cause, confirmed from the GitHub Actions API before touching
anything** (do this again first if this ever recurs — don't assume from the
workflow file or a green checkmark):
- Checked `.../actions/workflows/345486059/runs` — the workflow itself had
  **never failed**. Its most recent run (#22, 2026-09-04) succeeded, but
  it ran on commit `245ed30` ("Implement real background geofencing
  engine..."), which predates the entire 8-crossing/real-ULEZ-boundary
  commit (`91c2705`) and everything after it.
- `git status` showed the local repo was **4 commits ahead of
  `origin/claude/app-icon-nn4ikf`**. `91c2705`, plus this session's three
  commits (radius fix, EAS link, this file), had only ever been committed
  locally — never pushed. So the workflow had nothing new to trigger on;
  it wasn't broken, it just hadn't run against current source because
  current source never reached GitHub.
- This was **not** a caching issue, **not** a workflow-trigger-branch
  mismatch (the workflow already correctly lists
  `claude/app-icon-nn4ikf`, which is both the branch actually being
  pushed to and the repo's GitHub default branch), and **not** a build
  failure. Ruled all three out via the Actions API and a plain `git
  status` before concluding this.

**Fix**: `git push origin claude/app-icon-nn4ikf` (fast-forward,
`245ed30..220d821`). This triggered run #23 automatically, which
succeeded. Verified the live result by fetching the deployed JS bundle
directly (`_expo/static/js/web/index-<hash>.js` referenced from
`index.html`) and grepping it for all 8 crossing names — **do this, not
a plain `curl`/`WebFetch` of the page itself**, since the site is a
client-rendered SPA and a non-JS-executing fetch only ever returns the
empty shell (`<div id="root"></div>` plus the bare `<title>toll_alert</title>`)
regardless of whether the underlying deploy is fresh or stale. That
shell-only response is what caused this to look like "no content" during
earlier diagnosis in this same session — false alarm, not the real
bug. The bundle's `Last-Modified` header matching the just-completed
deploy, combined with all 8 crossing names actually present in it, is
what confirmed the fix worked.

**Lesson for next session**: in this repo, a local commit is not "done"
until it's pushed — the Pages deploy (and anything else gated on `push`)
silently does nothing otherwise, with no error anywhere to notice. Push
after committing unless there's a specific reason not to.

## Known-stale / needs-verification items (carried over, not new)

These predate this session — see `src/config/crossings.ts`'s file-level
comment and `src/geofencing/README.md` for the full list. Not re-verified
here:
- All 8 point-crossing geofence coordinates are landmark-level guesses
  (`coordinatesVerified: false`) — need checking against OS OpenData/OSM
  before this goes near a real device.
- Toll/fine figures need re-checking against each `sourceUrl` — several
  changed in the last 12 months per the file's own notes.
- Merseyflow's payment deadline (24h vs same-day) is disputed by at least
  one third-party source — flagged as unconfirmed in `crossings.ts`.
