# Handover

Read this in full before starting new work — it's the fastest way to pick up
where the last session left off. If anything here conflicts with what you
find in the code, trust the code and update this file.

## What this project is

Toll Alert: an Expo/React Native app that geofences UK toll crossings (plus
the ULEZ zone) and reminds the user to pay before the deadline. See
`README.md` for the full feature/architecture rundown and
`src/geofencing/README.md` for the geofencing engine specifically.

## 2026-09-09: CONFIRMED WORKING IN A REAL-WORLD DRIVE

The tester ran it on a real device on a real journey and reported it
working. No further detail was available — no crossing name, no delay
figure, no confirmation of whether the sound played. Recorded as-is rather
than inflated: **detection is confirmed in the field, the latency and audio
behaviour on real hardware are still unmeasured.**

This supersedes the emulator-only status. The emulator result below is still
the only place a *number* exists (~144s), and that number is from mock GPS on
a stationary device, so it should not be quoted as real-world latency.

Worth capturing next time a tester drives: which crossing, roughly how long
after crossing the alert arrived, whether it made a sound, and whether
anything fired that should not have.

## NOT BUILT: payment reminders (verified 2026-09-09)

**Reminders were never implemented. They were not dropped or lost.**
Verified against the full git history, not by inspection:

- `trigger: null` in every version of `src/notifications/index.ts` that has
  ever existed, from `c2b2497` (which first introduced notifications)
  onward.
- `git log --all -S` finds no `timeInterval`, no
  `SchedulableTriggerInputTypes`, no date trigger, anywhere, ever.
- `paymentDeadlineHours` is populated for all eight schemes and declared in
  `src/types/crossing.ts` with the comment "for reminder-scheduling
  purposes" — and **is read by no code at all**. Dead data awaiting a
  feature that was never written.
- `CrossingEvent.status` is set to `'pending'` at detection and used only to
  filter the Home screen list. Nothing acts on it over time.

So the current behaviour is: **one notification, at the moment of detection,
and never again.** A tester who swipes it away while driving — which is what
you do while driving — is relying on memory from then on.

### The same gap, user-visible, on the Subscription screen

`SubscriptionScreen.tsx` tells the user, from real config values
(`renewalReminderDaysBefore: 7`, `lapsedReminderIntervalDays: 7`):

> - We'll notify you 7 days before your subscription renews
> - If it lapses, we'll remind you every 7 days

Nothing schedules either. The app promises reminders in its own UI that no
code delivers. Whoever builds crossing reminders should decide whether these
are in the same piece of work.

## NOT BUILT: chargeable-hours awareness (verified 2026-09-09)

Same class of gap as reminders, found the same way. **No time-of-day logic
exists anywhere in the app.** `grep` for `getHours`, `freeHours`, `isFree`,
`22:00` etc. finds nothing outside display-label strings. `Crossing.price`
is `{ amount, currency, label }` — there is nowhere in the data model to put
a chargeable window. `detection.ts` records `detectedAt` and never consults
it before firing.

**Three of the nine crossings are free overnight, and all three will fire
false alerts in that window:**

| Crossing | Free window | Current behaviour |
|---|---|---|
| Dartford | 22:00-06:00 | Alerts anyway |
| Blackwall | 22:00-06:00 | Alerts anyway |
| Silvertown | 22:00-06:00 | Alerts anyway |

A night-shift driver crossing Dartford at 3am is woken and told to pay £3.50
they do not owe. That is the worst kind of false positive: it teaches people
to ignore the app. Partial mitigation only — the notification body includes
the price label verbatim, so a 3am Dartford alert does read "Pay £3.50 (car)
— free 22:00-06:00...", which a careful reader might catch.

Sources for the TfL window (Blackwall/Silvertown charge applies 06:00-22:00
daily, free otherwise, free all day on 25 December): blackcircles.com,
epcplc.com, minicabs.co.uk — published sources, not TfL directly, so
re-check against tfl.gov.uk before coding to them.

There is further time-sensitivity the app cannot express: the TfL tunnels'
peak rates are **directional** (northbound 06:00-10:00, southbound
16:00-19:00, weekdays only). The app has no concept of direction or time, so
its "£1.50 to £4.00" label is the best it can currently do.

### Do this with the reminder work, not separately

Chargeable windows, the ULEZ daily-charge collapse, and reminders all answer
the same question — *should this detection actually produce an alert, and
when?* — and all touch `detection.ts`. Doing them in one pass avoids
touching that path three times. Deferred 2026-09-09 at the user's request,
pending the client's decision on reminder frequency.

### Open questions for the client before building

1. How many reminders and when — anchored to the crossing, or to the
   deadline? Deadline-anchored is more useful but needs the exact rule.
2. Same cadence for every scheme? Dartford is midnight-the-next-day
   (24-48h depending on crossing time); TfL tunnels and ULEZ are midnight on
   the third day (72h). One cadence does not fit both.
3. What happens once the deadline passes unpaid — stop silently, or switch
   to "you may have been issued a PCN"?
4. **ULEZ is a daily charge, not per crossing.** The engine currently fires
   per entry (outside->inside transition, no per-day logic anywhere), so
   driving in and out twice in a day produces two alerts for one £12.50.
   Reminders will multiply that unless it collapses to one per day.
5. Are the subscription reminders above in scope?

## 2026-09-09 session: FIRST CONFIRMED COLD-START DETECTION

Preview build on an API 35 emulator, app force-stopped and confirmed dead
with `pidof`, position injected at Dartford:

```
12:33:52.642  app            Re-armed background monitoring at launch
12:33:52.874  geofence-task  ENTER crossing:dartford-crossing
12:33:52.897  detection      Dartford detected (geofence)
12:33:53.216  notifications  Posted "Dartford detected"
```

Confirmed working in one run: cold-start hydration, enter/exit dedup, the
ULEZ wake-circle + fine-location path, no false ULEZ alert at Dartford, and
all 9 regions registered with the corrected coordinates. The Android 11+
settings-redirect resume also fired during setup
(`Background location was granted while the app was away`).

**Measured latency: ~144 seconds** from position injection to ENTER
delivery, process relaunch included. First real figure the project has had.
Two consequences, both recorded in `src/geofencing/README.md`:

- The emulator script's 120s default timeout **failed a run that had
  worked**, by 24 seconds, reporting "never appeared" for a notification
  already in flight. Default raised to 300s and the failure message now
  says to read the log before believing it.
- Latency is not a miss. Android records the transition and delivers when
  it can; two minutes is nothing against a deadline measured in days. Radius
  buys the chance the OS samples location *at all* while inside, not
  delivery before the vehicle leaves.

One emulator, one measurement. Not a distribution.

**Still unverified**: anything on real hardware in a moving vehicle, and the
`postedTitles()` dumpsys parser — the run timed out before a notification was
ever visible to it, so the regex has still never matched anything. Confirm
with `adb shell dumpsys notification --noredact | findstr "android.title"`
while an alert is in the shade before trusting a future PASS.

## 2026-09-09 session: silent notification channel

Surfaced as a console error on the emulator:

    expo-notifications: Custom sound 'default' not found in native app.

Not console noise — the channel had **no sound at all**, on an app whose
entire job is a time-limited payment alert.

`setNotificationChannelAsync`'s `sound` field takes a custom sound
*filename*, not a mode. The read type is `'default' | 'custom' | null`, which
is what misled the original code; the *input* type is `string | null`.
`AndroidXNotificationsChannelManager.createSoundUriFromArguments` is explicit:

- key absent -> `Settings.System.DEFAULT_NOTIFICATION_URI` (what we want)
- `null` -> no sound at all
- any string -> resolved as a bundled filename

So `sound: 'default'` went hunting for a `default.wav` that does not exist.
Fixed by omitting the key.

### The channel-id bump matters more than the fix

**Android notification channels are immutable once created.** After the first
`setNotificationChannelAsync`, the OS ignores later changes to sound,
importance and vibration for that id — those settings belong to the user from
then on. The silent channel would therefore have stayed silent forever on any
device that already had it, however correct this file became.

So the id moved to `crossing-alerts-v2`, and `RETIRED_ANDROID_CHANNEL_IDS`
deletes the old one on startup so it does not linger in system settings. **Any
future change to sound, importance or vibration needs the same treatment:**
bump the id, add the old one to that array. Otherwise the change silently does
nothing on existing installs and everything looks fine in code review.

### If a bell is wanted later

A custom sound needs a real audio file committed to the repo and listed in
app.json's `expo-notifications` plugin `sounds` array, then named here. The
plugin copies it into `android/app/src/main/res/raw` at prebuild, so it needs
a native rebuild — not just a JS reload. The system default is what most users
expect from an alert app, so this was not done speculatively.

## 2026-09-09 session: automated emulator test

`npm run test:emulator` (`scripts/emulator-test.mjs`). Node, no new
dependencies, cross-platform. Drives adb directly via `execFileSync` with an
argument array rather than a shell string, so Windows quoting cannot bite.

Ten cases: the eight point crossings, ULEZ via Trafalgar Square, and a
negative control at Edinburgh where nothing should fire. Per case it grants
permissions, enables mock location, moves far away, force-stops the app and
**confirms with `pidof` that the process is gone**, injects the coordinates,
polls `dumpsys notification`, and greps logcat for `Cold-start hydrate` to
prove the headless path actually ran. A notification without that log line
FAILS the case — that combination means the process was still warm and
nothing was tested.

Coordinates are parsed out of `src/config/crossings.ts` (same whole-line
regex approach as `crossings.test.ts`, for the same reason: the module can't
be imported under Node's ESM loader). `--list` prints them, which is how you
confirm the script isn't testing stale values.

**Never run against a real device** — written with no Android SDK available.
Its first run is also a test of the script itself.

Still manual: the onboarding permission flow and Android 11+ Settings
redirect, the Diagnostics screen, and the battery-optimisation dialog.

### Two environment gotchas, both cost a round trip

**1. `'eas' is not recognized as an internal or external command.`**
`package.json`'s build scripts called bare `eas`, which only resolves if
`eas-cli` is installed globally. It never was on this machine. Fixed
2026-09-09: both scripts now call `npx eas-cli`, which needs no global
install. A global `npm i -g eas-cli` still works and is faster if you build
often — the scripts work either way.

**2. `The token '&&' is not a valid statement separator in this version.`**
`&&` is not a valid separator in **Windows PowerShell 5.1** (it works in
PowerShell 7+, and in `cmd.exe`). Chained commands copied from docs or chat —
e.g. `npx eas-cli login && npx eas-cli whoami` — fail there. Run them on
separate lines. Nothing to do with this project.

## 2026-09-09 session: emulator test plan revised

`src/geofencing/README.md`'s "Manual testing (Android)" plan existed but was
stale and, worse, **could not have caught the bug that broke the first real
tester**. Every step backgrounded the app without force-stopping it, so
`start()` had always run in that same JS context — the one case the shipped
app almost never runs in. Both prior "confirmed by actually running this"
passes are honest about what they did; they just never tested a cold start.

Changes:
- **New step 5b, the cold-start test**: force-stop the app, confirm with
  `pidof` that it is genuinely dead, then inject the fix. Includes how to
  confirm from logcat (`Cold-start hydrate …`) that the cold path actually
  ran rather than a still-warm process, how to read the diagnostic log when
  nothing fires, and a check that the detection survives into the next
  launch. Flags that this must run on a `preview` build, not a dev client —
  a headless dev-client relaunch needs Metro and fails for unrelated reasons.
- **New step 4b**: verify Settings → Diagnostics, including deliberately
  revoking ACCESS_BACKGROUND_LOCATION and confirming the screen reports it.
  A diagnostics screen that only ever says "fine" is worse than none.
- **Step 4 rewritten** around the onboarding path (now primary) and the
  Android 11+ Settings redirect, including that a fresh install is required
  because installing over the top keeps AsyncStorage and skips onboarding.
- **All mock coordinates and radii corrected.** The plan still used
  Dartford's old 51.4657, 0.2649 — which lands inside the new 1,400m radius,
  so testing with it would have appeared to pass while proving nothing.
  Added a table of all seven other crossings' `geo fix` values and radii.
- A "three tests that actually matter" summary at the top.

## 2026-09-09 session, later: the Android 11+ settings-redirect trap

Found while drafting tester instructions, and it would have wasted the next
drive on its own.

`expo-location`'s own SDK 57 typings say it plainly: **"On Android 11 or
higher: `requestBackgroundPermissionsAsync` will open the system settings
page."** No dialog. It navigates away and the promise resolves immediately,
while the user is still standing on that Settings screen deciding.

So the onboarding flow added earlier this session had a hole: it called
`requestPermissions()`, got `false` back (correctly — nothing was granted
*yet*), saved monitoring as off and told the user permission was refused.
A tester who then did exactly the right thing — Permissions → Location →
"Allow all the time" — came back to an app that was still switched off and
claiming they'd denied it. Every Samsung in service today is well past
Android 11, so this was the guaranteed path, not an edge case.

Fixed in three parts:
- `persistence.ts` now stores a monitoring **intent** separately from
  monitoring **enabled**. Intent is written *before* the permission request,
  precisely because the request navigates away.
- `AppState.tsx` listens for the app returning to the foreground. If intent
  is set and both location permissions are now granted, it starts the engine
  and switches monitoring on. A `startingRef` guard stops this racing the
  launch-time re-arm.
- The onboarding copy no longer promises a popup Android will not show. On
  Android it now describes the Settings redirect step by step; the failure
  alert is retitled "One step left" and asks the user to finish in Settings
  rather than telling them they refused.

`BackgroundLocationRationaleModal` already described this correctly for the
Settings-toggle path — the onboarding path added earlier this session simply
didn't reuse that knowledge. Worth reading that component before touching
any permission copy.

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
`production` APK, never a `development` one. (Use `npx eas-cli build:list
--platform android` — see the PATH gotcha below.)

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
session). It produces a standalone release APK with a download link.

**Do not put comment keys in `eas.json`.** A `"//": "..."` explanatory key
was added to the `preview` profile alongside that script and broke every
build with `eas.json is not valid. - "build.preview.//" is not allowed`.
EAS validates the file against a strict schema that rejects unknown keys;
the JSON-comment-by-convention trick does not work here. Removed
2026-09-09. Explain profiles in this file or the READMEs instead.

**Validating `eas.json` without a build or a login**: install
`@expo/eas-json` (the module eas-cli itself validates with) and call it
directly — this reproduces the exact error above and takes seconds, which
beats finding out from a failed build on someone else's machine:

```js
const { EasJsonAccessor, EasJsonUtils } = require('@expo/eas-json');
const accessor = EasJsonAccessor.fromProjectPath('/path/to/toll_alert');
await EasJsonUtils.getBuildProfileAsync(accessor, 'android', 'preview');
```

All three profiles were confirmed valid this way after the fix: `development`
resolves with `developmentClient: true`, `preview` with
`{distribution: internal, buildType: apk, autoIncrement: true}` and no
`developmentClient` (so it is a standalone release APK), `production` with
`distribution: store`. **Never hand a tester a `development`
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
