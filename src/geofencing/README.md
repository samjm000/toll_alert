# Background geofencing — status

**Android: implemented, and confirmed working on an emulator with the app in
the foreground — but the first real-device tester got nothing at all, and
five separate defects were found as a result. See "2026-09-09: why the first
real tester got nothing" below before trusting any emulator result in this
file: the passes recorded further down are real, but they only ever exercised
a warm, foregrounded JS context, which is the one case the shipped app almost
never runs in. iOS: implemented, out of scope for further work until there's
a Mac for Xcode — see `ios.ts`.**
The region-swapping strategy and point-in-polygon confirmation described
below are real, working code — not stubs — built on `expo-location`'s
CoreLocation/Android-Geofencing-API wrappers and `expo-task-manager`:

- `boundary.ts` — pure math: haversine distance, ray-casting point-in-polygon
  (`isPointInPolygon`), and the real-world multi-polygon case
  (`isPointInAnyPolygon`) a boundary like ULEZ's actually has. No
  native/device dependency; covered by unit tests against real reference
  points, not just correct by inspection (`boundary.test.ts`, run via
  `npm test` — Node's own test runner, no new dependency).
- `engine.ts` — the shared engine (`createGeofencingEngine`) both platforms
  build on: registers all 8 real UK toll crossings as permanent circular
  geofences, plus **one** permanent circular "wake" geofence for ULEZ (not
  a ring of small circles approximating its boundary — see "Why ULEZ is
  different" below for why that was wrong), all under **one**
  `TaskManager.defineTask` per platform (not one per crossing — see "Why
  one task" below), branching on `region.identifier`. Point crossings and
  ULEZ both get outside→inside transition dedup via a shared `insideRegion`
  map, so a geofence re-registration that fires an immediate re-ENTER for a
  region you're already inside doesn't produce a duplicate notification.
- `ios.ts` / `android.ts` — thin per-platform config (task names, region
  budget, location-task tuning) plus the platform-specific caveats (iOS's
  20-region cap and "Always" permission upgrade UX; Android's foreground
  service and OEM battery-optimisation quirks).
- `batteryOptimization.ts` (Android only) — opens the system "ignore battery
  optimizations" dialog for this app via `expo-intent-launcher`, surfaced as
  the "Improve reliability" button in the Settings screen's "Reliability"
  section.

## 2026-09-09: why the first real tester got nothing, and what changed

The first real-device tester (Samsung, Android; drove over Dartford and
through the ULEZ) received **no notification at all** — not even the
persistent "Toll Alert is watching for crossings" foreground-service
notification. That last detail is the diagnostic one: that notification
appears the moment the fine-location task starts, and Dartford sits inside
ULEZ's 37 km wake circle, so on a working build it should have been on
screen for the whole drive. Its absence says monitoring was never armed at
all, rather than armed-but-failing.

Five separate defects were found, each of which alone is sufficient to
produce exactly "nothing happened". They are listed in the order they bite.

**1. Background monitoring was off by default, and could not stay on.**
`backgroundMonitoringEnabled` was `useState(false)` with no persistence, and
nothing called `geofencing.start()` at launch. Onboarding's Permissions
screen explicitly *doesn't* request anything and defers to "the Settings
screen's Background monitoring toggle" — which a non-technical tester has no
reason to find. Even a tester who did find it lost it on the next app
restart: the toggle read "Off" again and `start()` never re-ran. Fixed: the
flag is persisted (`src/state/persistence.ts`) and re-armed from a mount
effect in `AppState`.

**2. The engine could not survive process death — the core bug.**
`state.crossings` and `state.onDetected` lived only in module memory, set
only by `start()`. But the whole design depends on the OS relaunching the app
*headlessly* to deliver a transition: a fresh JS context where module scope
runs (so `defineTask` registers) but `start()` never does. The task fired
correctly, `state.crossings.find(...)` searched an empty array, and the
handler hit a bare `return`. **Every real crossing detected while the app
wasn't already running was silently discarded.** The emulator passes in the
sections above never caught this because the app was in the foreground with
Metro attached and `start()` had just run in that same context.
Fixed: `ensureHydrated()` re-derives the crossing list via the new
`EngineConfig.loadCrossings`, the inside/outside dedup map is persisted, and
a detection with no React handler registered falls through to the shared
headless pipeline in `detection.ts`.

**3. Notification permission was requested at the moment of detection.**
`presentCrossingNotification` called `requestNotificationPermissions()`
inline and returned silently on failure. Android 13+ gates notifications
behind runtime `POST_NOTIFICATIONS`, and a headless task cannot show a
permission dialog — so on a device that had never granted it, the request
could only ever fail, silently, forever. Fixed: permission is requested in
the foreground when monitoring is enabled; the detection path only *checks*,
and logs loudly when it has to drop an alert.

**4. Notifications were posted without an explicit Android channel.**
Android 8+ takes importance from the channel, not the request. Without a
high-importance channel a successful detection can post silently into the
shade with no banner and no sound — indistinguishable from nothing
happening, particularly on One UI. Fixed: an explicit `crossing-alerts`
channel at `AndroidImportance.MAX`.

**5. The notification was fired without being awaited.**
`recordCrossing` did `presentCrossingNotification(...).catch(() => {})` and
the task handlers were synchronous. A background task that returns before
its notification promise resolves can have its JS context torn down first.
Fixed: `CrossingDetectedHandler` now returns a promise and the engine awaits
the whole chain.

### Fixed: Dartford's geofence was 449m off the road

The centre shipped as (51.4657, 0.2649) — **449m east of the actual
crossing**. With the then-600m radius, a vehicle driving the A282 was inside
the circle for only about 25 seconds at 70mph, against transition latency
this project has measured in minutes. It would have missed most crossings
even with all five defects above fixed.

Corrected to **(51.46472, 0.25861)** — the published Dartford Crossing
coordinate (51°27'53"N 0°15'31"E), corroborated by a second independent
source (51.4651, 0.2587) that agrees to within **43m**.

`coordinatesVerified` deliberately stays `false`. That flag means checked
against OS OpenData/OSM specifically, and neither was reachable from the
environment this was fixed in (both are blocked by network egress policy,
as are expo.dev and docs.expo.dev). Two agreeing published sources beat a
landmark-level guess by a wide margin; they are not a survey.

The radius was widened **600m -> 1400m** at the same time, derived rather
than guessed: the QEII bridge crossing including its approach viaducts is
2,871m end to end (1,051m north viaduct + 821m bridge + 1,008m south
viaduct), so 1,436m is the half-length from mid-river. 1,400m covers the
whole structure a charged vehicle drives over, and the 1,430m tunnels on the
northbound side. It also raises time-inside-the-circle from ~38s to ~90s at
70mph — the number that actually decides whether Android ever samples
location while the vehicle is in there.

**Known trade-off**: 1,400m from mid-river reaches local roads on both banks
(West Thurrock north, Crossways/A206 south), so someone near the crossing who
doesn't use it can get a false alert. Deliberate: a miss costs the user a
£70+ PCN, a false positive costs a dismissible notification. Needs real-world
tuning.

**The principled fix is a polygon.** The charge applies to the whole A282
between M25 J1A and J31, so the charged area is a corridor, not a circle, and
this engine already supports polygon crossings (see ULEZ). Not done here
because hand-drawing that corridor from guessed junction coordinates would
reintroduce exactly the class of error this change fixes — it needs real
corridor geometry.

Three regression tests now guard this (`src/config/crossings.test.ts`): the
centre must be within 150m of the published coordinate, the radius must cover
the structure and give over 60s inside at 70mph, and Dartford must not fall
inside the ULEZ polygon (the pass-1 double-notification bug).

### The other seven crossings, checked the same way

Done in the same pass. Every one of the eight point crossings was a
landmark-level guess; **all eight were wrong**, and three were wrong by more
than a kilometre — enough that the driven route never entered the geofence
at all, so those crossings could never have fired regardless of any other
fix.

| Crossing | Was off by | Radius | Best source |
|---|---|---|---|
| Warburton | **2,467 m** | 250 -> 550 m | OS grid refs, Rixton and Warburton Bridge Order 2024 |
| Tyne Tunnel | **2,431 m** | 300 -> 900 m | latitude.to + OS ref NZ329659 (185 m apart) |
| Mersey Gateway | **1,707 m** | 600 -> 1,100 m | Wikipedia, confirmed by its documented offset from Silver Jubilee |
| Silvertown | 830 m | 300 -> 350 m | Wikipedia (single source) |
| Blackwall | 502 m | 300 -> 350 m | Wikipedia + latitude.to + OS refs for the southern structures |
| Dartford | 449 m | 600 -> 1,400 m | Wikipedia + latitude.to (43 m apart) |
| Humber Bridge | 436 m | 250 -> 1,150 m | Wikipedia + latitude.to (14 m apart) |
| Silver Jubilee | 257 m | 600 -> 500 m | Wikipedia |

Two of the old values were self-evidently placeholders once you look:
Warburton's latitude was the bare string `53.4`, and Humber's 250 m radius
did not reach the ends of a 2,220 m bridge.

Radii are derived from each structure's published length where nothing else
constrains them (half-length from the centre, rounded up to clear the
portals), which is why they now differ so much — the structures do. Silver
Jubilee went *down*, from 600 m to 500 m: the old comment claimed
"motorway-speed open crossing" by copying Dartford's reasoning, but since
Mersey Gateway opened in 2017 it carries local 30 mph traffic, so it needs
far less radius for the same time inside.

**Two pairs are close enough to constrain each other.** Geofence circles must
not overlap, or one crossing fires two notifications naming the wrong toll
and the wrong deadline. `crossings.test.ts` enforces this:

- Mersey Gateway and Silver Jubilee are 1,779 m apart; 1,100 + 500 leaves a
  179 m margin.
- **Blackwall and Silvertown are only 770 m apart**; 350 + 350 leaves 70 m.
  That is uncomfortably tight, and it caps both well below the 675 m
  half-length of the Blackwall bore.

**Blackwall and Silvertown should probably be one crossing.** Both bores
leave the *same* point on the Greenwich Peninsula and only diverge on the
north side, so on the southern approach no circular geofence can tell them
apart even in principle. They already share one `ChargingScheme`, one
operator, one payment page and one deadline — the label is the only thing
that differs. Merging them would allow a ~900 m radius covering both bores
instead of the 350 m compromise. Not done here because it changes the
crossing list rather than just its coordinates.

**Expected, not a bug**: Blackwall and Silvertown both fall inside the real
ULEZ polygon, so a non-compliant vehicle using either tunnel genuinely
incurs both charges and should get both notifications. This is not a return
of the old placeholder-rectangle false positive — that one put *Dartford*
inside ULEZ, which `crossings.test.ts` still guards against explicitly.

`coordinatesVerified` stays `false` on all eight. OS OpenData and OSM are
both blocked by this environment's network egress policy, so none of this is
survey data. Where an Ordnance Survey grid reference was quoted in a
published source it was converted to WGS84 and used as a cross-check — the
Warburton conversion agreed with an independently quoted coordinate to 115 m,
which is exactly the precision a 6-figure grid reference carries, and that
agreement is also what validated the conversion itself.

### Diagnosing this in future

`src/diagnostics/log.ts` is a persistent on-device log, surfaced at
Settings -> Diagnostics with a blocker summary a non-technical tester can
read aloud, and a Share button. It respects the project's
no-telemetry constraint: nothing is uploaded, ever; the tester chooses to
send it. Every previously-silent path now writes to it — task errors, empty
payloads, unmatched region identifiers, permission refusals, and
`startLocationUpdatesAsync` failures (Android 12+ can refuse to start a
location foreground service from the background, which used to be swallowed
by a bare `.catch(() => {})` and made total ULEZ failure invisible).

The Diagnostics screen also reads back what the **OS** believes
(`getStatus()`), not what the UI's toggle claims. Those two disagreeing is
the signature of every bug above.

## Why one task, not one per crossing

Registering a separate `TaskManager.defineTask` per crossing was
deliberately avoided: multiple simultaneous geofencing tasks are known to
cross-fire on both platforms — every registered task gets called for every
region's transition events, not just the regions it registered itself. One
task per platform, branching internally on `region.identifier`
(`crossing:<id>` for point crossings, `wake:<id>` for a zone crossing's
wake-up circle — see `pointRegionId`/`wakeRegionId` in `engine.ts`), avoids
that entirely. Both `iosGeofencingEngine` and `androidGeofencingEngine` are
top-level `const`s in their respective files, so `TaskManager.defineTask` at
module scope runs during app initialization — not lazily inside a component,
which would silently fail to receive events delivered while the app was
killed and relaunched by the OS specifically to handle them.

## Why ULEZ is different

**The bug that motivated this**: the old placeholder ULEZ boundary was a
coarse illustrative rectangle. During real-device testing, Dartford
Crossing's *real* coordinates turned out to sit inside that rectangle,
producing a false "ULEZ detected" notification alongside the genuine
Dartford one. Sourcing the real boundary alone wouldn't have fully fixed
this class of problem — a rectangle (or any small set of circles) cannot
represent ULEZ's actual shape, so *any* circle-based approximation of it
can both miss real entries (where the true boundary bulges outside the
approximating circles) and fire falsely (where it doesn't reach as far as
the circles do), independent of how good the underlying coordinates are.

**Why native geofencing can't be the whole answer here**: both Android's
`GeofencingClient` and iOS's CoreLocation region monitoring only support
circular regions. That's a fine, cheap, OS-managed primitive for the 8 real
point crossings — a bridge or tunnel entrance genuinely is well
approximated by a small circle. ULEZ is Greater London's actual
administrative boundary: a large, highly irregular polygon (TfL's own
published data is 22 separate simple polygons — one large contiguous area
plus small separate enclaves, ~1,700 vertices after simplification — see
`src/config/ulezBoundary.ts`). No native circular-region approximation of
that shape can be both accurate and battery-cheap; the previous
boundary-ring-swapping approach was already an attempt to work around
this, and it was exactly the source of the false-positive bug above.

**The fix — a two-tier approach specific to ULEZ, not a rework of the
point crossings**:

1. **Coarse tier**: one single, large, permanent circular geofence at
   ULEZ's centroid (`wakeRadiusMeters`, currently ~37km — big enough to
   comfortably contain the entire real boundary with margin). This is
   native, OS-managed, and effectively free — someone in Edinburgh with
   monitoring on costs nothing beyond this one circle existing.
2. **Fine tier**: a real point-in-polygon check
   (`isPointInAnyPolygon` in `boundary.ts`) against the actual boundary
   data, run against the device's genuine position on every background
   location update (`Location.startLocationUpdatesAsync`) — but that
   location task is only ever *running* while inside the coarse circle
   above. Entering the coarse circle starts it; leaving stops it. Someone
   driving around London's edge gets an accurate, real check against the
   real shape; someone who never gets near London never pays for
   continuous location polling at all.

This means ULEZ's own region-swapping code (the old `syncRegions` re-sync
on every location update, `nearestBoundaryPoints`, per-boundary-point
circles) is gone entirely — the region set registered with the OS is now
completely static for the lifetime of monitoring (8 point crossings + 1
ULEZ wake circle, at most 9 regions, registered once). **This also fully
resolves the iOS 20-region cap concern that used to justify the
region-swapping approach in the first place** — 9 static regions is nowhere
near CoreLocation's 20-region limit, so there's no swapping left to need
headroom for. See `ios.ts`'s doc comment.

The 8 real point crossings are untouched by any of this — same permanent
circular geofences, same dedup logic, same code path as before.

## Current verification status

### Confirmed by static analysis (no device/emulator involved)

- `tsc --noEmit` — clean.
- `npx expo-doctor` — 21/21 checks passed.
- `npx expo prebuild --platform android --clean` — succeeds; the generated
  `android/app/src/main/AndroidManifest.xml` contains every permission from
  `app.json` (`ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`,
  `FOREGROUND_SERVICE_LOCATION`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`,
  etc.). The Android 14+ `foregroundServiceType="location"` requirement
  doesn't need an app.json change — `expo-location`'s own bundled library
  manifest already declares it, merged into the final APK automatically.
- Web bundle (`npx expo start --web`) compiles cleanly with all the new code
  included — a bundler-level smoke test only.
- `expo`, `expo-location`, `expo-task-manager`, `expo-notifications`, and a
  few RN packages bumped to `expo install --fix`'s recommended versions for
  this project's SDK 57.
- `npm test` (`node --test src/**/*.test.ts`, zero new runtime
  dependencies — Node's own built-in test runner, since `boundary.ts`'s
  functions are pure and dependency-free) — **7/7 passing**, run against
  the real ULEZ boundary data, not a fixture: a simple-square sanity check,
  a multi-polygon sanity check, Dartford Crossing resolving outside,
  Trafalgar Square and Heathrow Terminal 5 (~349m from the nearest real
  boundary vertex — a genuine near-edge case) resolving inside, a point
  ~170m outside the boundary near Heathrow resolving outside, and a
  structural guard against ever silently regressing to a small number of
  vertices/polygons (the exact shape of the original bug). See
  `src/geofencing/boundary.test.ts`.

### Confirmed by actually running this — first pass (2026-09-05, Android emulator)

**ULEZ-specific findings below are about the OLD placeholder-rectangle
approach and are now superseded** — see the next section for the re-test
against the new two-tier real-boundary approach. Everything about the 8
point crossings (permanent circular geofences, the enter/exit dedup, the
foreground service, the dev-menu corner-tap friction) is unaffected by the
ULEZ rework and still stands.

This environment initially had no usable Android SDK — only an empty
`cmdline-tools` placeholder — so it was set up from scratch this pass:
`sdkmanager` installed `platform-tools`, `emulator`, `platforms;android-35`,
and `system-images;android-35;google_apis;x86_64`; `avdmanager` created an
AVD (`tollalert_test`, Pixel 6 profile); the emulator booted headless
(`-no-window`) with Google Play services present. The dev client was built
with `npx expo run:android` (BUILD SUCCESSFUL, ~9 min) and installed
automatically. **Note:** the running app's own `ActivityManager` logs report
`targetSdkVersion:36`, not 35 as the platform/system-image install above
might suggest — Expo's Gradle tooling resolved a newer default at build
time than what this pass explicitly installed the platform for. Either way
it's ≥34, so the foregroundServiceType requirement applies and — per below
— is confirmed actually working, not just present in a manifest.

Since there was nobody to tap through the rationale modal or system
permission dialogs, the flow was driven with `adb`/`uiautomator` instead:
`pm grant` for all four location/notification permissions (this fully
bypassed every system permission dialog — they never appeared, since the
permissions were already granted before the app asked), and UI navigation
via `uiautomator dump` + `input tap` for onboarding and the Settings
toggle. **One real friction hit here, not app-related**: the Home screen's
Settings gear icon (top-right corner, standard placement) sits exactly on
top of expo-dev-client's own corner-tap gesture zone for opening the dev
menu on emulators without shake support — every direct tap on the gear
opened the dev menu instead of navigating. Worked around with `input
keyevent KEYCODE_TAB` (focus) + `KEYCODE_DPAD_CENTER` (activate) instead of
a coordinate tap, which bypassed the corner gesture entirely. Worth knowing
if you're doing this by hand too: reach the gear via a d-pad/keyboard
(Enter) if a tap keeps opening the wrong menu.

With monitoring turned on (confirmed via the Settings toggle flipping to
"On", and the persistent "Toll Alert is watching for crossings" foreground
notification actually appearing in `dumpsys notification`), and with
`adb emu geo fix` established to be a dead end in this emulator image (see
below), location was injected via `adb shell cmd location providers
add-test-provider/set-test-provider-enabled/set-test-provider-location` —
this is the one deviation from the README's original `adb emu geo fix`
instructions, kept below for real devices/other emulator setups where it
may work, with this method noted as the fallback.

**Results, checked via `dumpsys notification` and `logcat` — not assumed:**

- Setting mock GPS to Dartford's coordinates (51.4657, 0.2649) produced a
  real Android notification titled **"Dartford detected"** with the exact
  body text `presentCrossingNotification` constructs
  (`Pay £3.50 (car) — free 22:00–06:00 by midnight the day after crossing —
  tap to pay, or mark as paid once you have.`), confirmed present in
  `dumpsys notification --noredact` output, in **~1 second** from the mock
  fix landing.
- **Unplanned but real finding**: the same fix also produced a **"ULEZ
  detected"** notification at the same instant. This is not a bug in the
  new work — Dartford's real coordinates (51.4657, 0.2649) fall inside the
  illustrative placeholder ULEZ rectangle (`-0.51°W to 0.32°E, 51.29°N to
  51.69°N`) that `src/config/crossings.ts` has always used as a stand-in
  for the real TfL boundary. This is a live, concrete demonstration of
  exactly the risk the "Source TfL's actual published ULEZ boundary
  GeoJSON" outstanding item already warned about — it just turned a
  Dartford-only test into a Dartford+ULEZ double-notification.
- **Exit/re-entry dedup — confirmed correct, with a real timing nuance**:
  moving the mock location away (to Edinburgh) and back to Dartford within
  ~81 seconds did **not** re-fire the Dartford notification (only ULEZ's
  polygon-based re-check fired again — it re-evaluates on every location
  update, independent of the OS's own transition timing). Moving away for a
  full ~3 minutes before returning **did** produce a fresh "Dartford
  detected" notification. Reading this together: the point-region EXIT
  transition itself — delivered by Android's Geofencing API, not by this
  app's own code — hadn't been processed by the OS within ~81s but had
  within ~3 minutes. The dedup logic (`insideRegion` in `engine.ts`) behaved
  correctly in both cases — it only suppressed a notification because the
  OS hadn't yet told it an exit occurred, not because of a bug. Final count
  across the whole session matched exactly: 2× "Dartford detected", 3×
  "ULEZ detected" (screenshot of the notification shade confirms this),
  with zero unexplained duplicates.
- Two task registrations confirmed in `logcat`:
  `Registered task with name 'toll-alert-android-geofence-task'` and
  `'toll-alert-android-location-task'`, plus
  `ActivityManager: Background started FGS: Allowed` for
  `expo.modules.location.services.LocationTaskService` — the foreground
  service actually started, it wasn't just configured.

**Not confirmed / genuinely still open:**

- The exact EXIT transition latency for a point geofence on a **real**
  device is unknown — the ~81s-vs-~3min emulator result is a real data
  point but the emulator's mock-location injection path (`cmd location
  providers set-test-provider-location`, not real GPS) may not have
  identical timing characteristics to genuine GPS movement or to
  `adb emu geo fix` on a device/emulator where that command actually works.
- Whether the "Improve reliability" battery-optimization button's system
  dialog actually renders correctly — not tapped through this pass (no
  human to visually confirm the dialog's content, and its result isn't
  observable via `dumpsys` the way a notification is). The
  `startActivityAsync` call itself didn't throw, which is a weaker signal
  than confirming the dialog visually.
- Real-device Doze/App Standby behavior over hours, and OEM-specific
  background kill behavior (Xiaomi/Huawei/Samsung/OnePlus) — this was one
  continuous ~30 minute emulator session, not a realistic battery-idle
  timescale.
- Everything else in "Outstanding work" below that says so explicitly
  (ULEZ real boundary, per-crossing radius tuning, iOS).

Why `adb emu geo fix` didn't work here, if you hit the same thing: on this
emulator image, `geo fix` reaches the emulator's simulated GPS hardware, but
nothing had an **active** GPS-priority location request registered, so
Android's `GnssService` never turned on to consume it (`dumpsys location`
showed `service: ProviderRequest[OFF]` and `last location=null`
indefinitely, even after repeated fixes). The app's own background location
task requests `Accuracy.Low`, which Play Services satisfies from
network/fused sources rather than raw GPS, so it never forced GPS on
either. Injecting via `cmd location providers ... set-test-provider-location`
sets the location directly at the framework level instead, which Fused/the
geofencer *did* pick up. This may be specific to this emulator image/API
level combination — worth trying `adb emu geo fix` first on a real device
or a different emulator, since the README's original instructions describe
it because it's the standard, better-known approach when it works.

### Confirmed by actually running this — second pass (2026-09-05, real ULEZ boundary + new architecture)

Re-ran the manual test plan against the same emulator (`tollalert_test`,
still running from the first pass) after replacing the placeholder ULEZ
rectangle with the real boundary and rewriting the detection approach (see
"Why ULEZ is different" above). Same `cmd location providers
set-test-provider-location` mocking approach as the first pass.

**Getting a clean result took a genuine detour, worth recording**: the
first several attempts this pass produced *no* notification at all — not
even Dartford's, which had worked reliably in the first pass. Added
temporary `console.log` instrumentation to `engine.ts` (removed before
finalizing; not in the shipped code) to see what was actually happening,
which showed: region registration was correct
(`{"identifier":"crossing:dartford-crossing",...}`,
`{"identifier":"wake:ulez","latitude":51.501458,"longitude":-0.094677,"radius":37000,...}`
— exactly right) and `startGeofencingAsync` resolved without error, but
location updates mostly weren't reaching the app's tasks at all. `dumpsys
location`'s event log showed Android's **"stationary throttling"**
engaging (a real power-saving feature that backs off update frequency when
successive mock fixes look like a parked, non-moving device — which is
exactly what repeated nearby test coordinates look like) combined with
Play Services increasingly rate-limiting delivery to the geofencer
(`location delivery to ...[geofencer_provider]... blocked - too fast`).
**Rebooting the emulator** (`adb reboot`, then re-granting permissions and
reconnecting to Metro, since both reset on reboot) cleared this
accumulated throttling state and testing worked reliably afterward — this
looks like an artifact of this specific long-running mocked-GPS session
rather than anything wrong with the new code (the region registration was
already confirmed correct before the reboot).

**Results after the reboot, checked via `dumpsys notification` and
`logcat` — not assumed:**

- Mock GPS at Dartford's real coordinates (51.4657, 0.2649) → exactly one
  notification, **"Dartford detected"**, correct body text, within ~9
  seconds. **No "ULEZ detected" alongside it this time** — the false
  positive from the first pass (Dartford sitting inside the old
  placeholder rectangle) is gone.
- Mock GPS at Trafalgar Square (51.5080, -0.1281, real central London) →
  **"ULEZ detected"** fired within ~13 seconds, with the correct body text
  (`Pay £12.50 per day (non-compliant vehicles) by midnight 3 days after
  driving in the zone...`). `logcat` confirms this went through the new
  path specifically: `TaskService: Handling job with task name
  'toll-alert-android-location-task'` fired at the same timestamp as the
  mock fix, meaning the real point-in-polygon check
  (`checkZoneTransition` → `isPointInAnyPolygon`) is what made this
  decision — not a boundary-ring geofence, which no longer exists.
  (The location task was already running at this point because Dartford's
  coordinates are themselves within ULEZ's 37km wake circle, so this
  update was picked up immediately rather than needing a fresh wake-circle
  ENTER first.)
- Moving to Edinburgh (55.9533, -3.1883, outside the wake circle)
  correctly triggered the wake circle's EXIT branch
  (`toll-alert-android-geofence-task` handled a job at the same instant),
  which stops the fine-grained location task — confirmed via logcat, not
  independently confirmed that location polling actually stayed off
  afterward (would need a longer, undisturbed observation window than
  this pass had time for).
- Final tally, confirmed via a notification-shade screenshot: exactly 2
  notifications for the whole second pass — one "Dartford detected", one
  "ULEZ detected" — no duplicates, no unexplained extras.

**Not confirmed / genuinely still open (second pass):**

- Real-device timing for the wake-circle ENTER → location-task-start →
  first-check sequence. On the emulator this pass, the location task
  happened to already be running (Dartford's coordinates are within the
  wake circle), so the "just crossed into the wake circle from far away"
  path specifically wasn't exercised end-to-end this time — only the
  "wake circle already active, ULEZ polygon check runs on the next
  update" path was.
- Whether `wakeRadiusMeters` (37km) is well-tuned — it's correct (verified
  to contain every real boundary vertex with margin), but nothing here
  tested the battery/latency tradeoff of that specific radius.
- Everything already listed as unconfirmed after the first pass that this
  rework didn't touch (real-device Doze/OEM behavior, the battery
  optimisation dialog's actual appearance, iOS entirely).

## What's already decided

- No commercial geofencing library (e.g. Transistor) — hand-rolled, per the
  agreement with the client.
- Dartford Crossing is a single circular geofence (`crossing.geofence.kind
  === 'circle'` in `src/types/crossing.ts`).
- ULEZ is a polygon (`crossing.geofence.kind === 'polygon'`) that's never
  turned into circular geofences at all — see "Why ULEZ is different"
  above for the full rationale. Its boundary is the real thing, sourced
  from TfL/GLA's own published open data (`src/config/ulezBoundary.ts`),
  not the illustrative rectangle this project started with.
- All eight other target crossings (Dartford, Blackwall, Silvertown, Mersey
  Gateway, Silver Jubilee, Tyne Tunnel, Humber Bridge, Warburton) are single
  circular point geofences, same shape as Dartford. Blackwall/Silvertown
  share one `ChargingScheme` object (`TFL_TUNNELS_SCHEME`) and Mersey
  Gateway/Silver Jubilee share another (`MERSEYFLOW_SCHEME`) in
  `src/config/crossings.ts`, so their toll/fine/deadline figures can't drift
  out of sync if only one crossing gets updated — see `src/types/crossing.ts`
  (`ChargingScheme`, `FineStage`) for the schema.

## Outstanding work (native build)

- [x] ~~Source TfL's actual published ULEZ boundary GeoJSON and replace the
      placeholder rectangle~~ — done 2026-09-05. Real data from "London
      Wide Ultra Low Emission Zone 2023" (London Datastore, TfL/GLA, Open
      Government Licence v2.0), converted from its native EPSG:27700
      (British National Grid) to WGS84 and simplified (Douglas-Peucker,
      15m tolerance — well inside GPS accuracy) from 24,857 to 1,687
      vertices. See `src/config/ulezBoundary.ts` for the full source,
      licence, and processing notes.
- [x] ~~Implement a real point-in-polygon check against the actual
      boundary~~ — done in `boundary.ts` (`isPointInPolygon`,
      `isPointInAnyPolygon` for the 22-separate-polygons case), covered by
      unit tests against real reference points
      (`boundary.test.ts`), not just a manual check.
- [x] ~~Fix the architecture so ULEZ can't be silently approximated by
      circles again~~ — done: `geofence.kind === 'polygon'` crossings no
      longer get turned into circular geofences at all (ringing the
      boundary with small circles was the old approach, and the direct
      cause of the Dartford/ULEZ false-positive bug). See "Why ULEZ is
      different" above for the two-tier wake-circle + polygon-check design
      that replaced it, and `engine.ts`'s module doc comment for the
      implementation.
- [x] ~~Wire native region-entry/geofence-transition events into
      `onCrossingDetected`~~ — done in `engine.ts`'s `TaskManager.defineTask`
      callbacks, and `onCrossingDetected` is now wired all the way through to
      `presentCrossingNotification` via `AppState.setBackgroundMonitoringEnabled`
      (toggle on the Settings screen, "Background monitoring" section).
- [x] ~~iOS: implement the "When In Use" → "Always" permission upgrade flow,
      with an in-app education screen before the system prompt~~ — done via
      `src/components/BackgroundLocationRationaleModal.tsx`, shown from the
      Settings toggle before `requestPermissions()` runs.
- [x] ~~Android: implement the foreground-permission → background-permission
      education screen~~ — same modal, platform-specific copy (Android 11+
      jumps straight to system settings instead of a dialog, so this is the
      only in-context explanation the user gets — see Expo's location docs).
      (The foreground *service* + persistent notification itself is wired
      via `app.json`'s expo-location plugin config + `android.ts`'s
      `foregroundService` option.)
- [x] ~~Android: OEM battery-optimisation exemption prompting~~ — done via
      `batteryOptimization.ts` (`expo-intent-launcher`'s
      `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` action) and the Settings
      screen's "Reliability" section ("Improve reliability" button,
      Android-only). No API exists to check whether the exemption is
      already granted, so it's a one-off action, not a toggle with a real
      status — see the file's doc comment.
- [x] ~~Android: register all 8 real UK toll crossings (plus ULEZ) as
      geofences under one task~~ — the 8 point crossings are permanent
      circular geofences (unchanged); ULEZ is one permanent circular wake
      geofence, not a boundary ring. All registered once, statically, in a
      single `startGeofencingAsync` call — see `registerRegions()` in
      `engine.ts`.
- [x] ~~iOS's 20-region cap concern~~ — resolved by the design itself
      rather than needing separate work: at most 9 total regions
      (8 point crossings + 1 ULEZ wake circle), all static, nowhere near
      the cap. See `ios.ts`'s doc comment. Still needs a real device/Mac
      to confirm CoreLocation behaves as expected in practice — the
      *region count* problem is solved, CoreLocation's actual runtime
      behaviour is untested.
- [x] ~~Test Android with simulated GPS for a point-crossing drive-through
      (e.g. Dartford) and a ULEZ boundary crossing~~ — done twice
      (2026-09-05): once against the old placeholder ULEZ rectangle (which
      is what surfaced the false-positive bug this rework fixes), and
      again after the fix, confirming Dartford no longer also fires ULEZ
      and that a real central-London position correctly fires ULEZ via the
      new wake-circle + polygon-check path. See "Confirmed by actually
      running this" (both passes) above for the full results. iOS is
      untested — needs a Mac.
- [ ] Real-world drive/walk-through testing before this ships (see the
      development agreement's plan — friends' commutes / walking the ULEZ
      boundary on foot). Emulator testing is not a substitute for this —
      see "Which crossings are realistic to actually drive or walk to"
      below.
- [ ] Tune `ZONE_ACTIVATION_RADIUS_METERS`-equivalent behaviour: there's no
      such constant any more (the wake circle's own radius does this job
      natively), but `wakeRadiusMeters` (currently ~37km, sized to just
      contain the real boundary with margin) hasn't been tuned against
      real battery/detection-latency data — only verified to be
      geometrically correct. Also tune each platform's `distanceInterval`
      (`android.ts` / `ios.ts`, used only while inside the wake circle now,
      not unconditionally) against the same real-world data once there is
      any.
- [x] ~~Per-crossing radius sizing~~ — done 2026-09-06, but reasoned, not
      measured, and **that's the deliberate final state, not a placeholder
      for a later measured pass**: there is deliberately no tester-facing
      logging, telemetry, debug screen, or background data upload to ever
      gather real detection data — testers are non-technical, and the only
      feedback channel is Rob asking each one directly, in plain language,
      whether and roughly when they got an alert. `radiusMeters` moved from
      a flat 250m to three reasoned categories (see the comment block at
      the top of `src/config/crossings.ts` and each crossing's own inline
      comment for which category and why):
  - **Motorway-speed open crossings** (Dartford, Mersey Gateway, Silver
    Jubilee) — 600m. Crossed at 60-70mph with observed geofence transition
    latency running into minutes (see the emulator test notes above); sized
    generously so a fast vehicle is still plausibly inside when a delayed
    check lands.
  - **Tunnel portals** (Blackwall, Silvertown, Tyne Tunnel) — 300m,
    centered on the portal, not sized to cover the tunnel interior (GPS
    doesn't work in there regardless of radius) — detection depends on
    catching the last fix before signal loss or the first fix after.
  - **Lower-speed / constrained crossings** — 400m (Humber Bridge: lower
    speed limit but a long ~2.2km structure) and 150m (Warburton: very low
    speed, narrow single-lane bridge, kept tight to stay specific to the
    structure).
  - Dartford and Tyne Tunnel both got a real judgment call, documented
    inline where each is defined: Dartford is genuinely two structures
    (open QEII Bridge southbound, twin-bore tunnel northbound) and was
    sized for the open/majority-traffic case, with the tunnel-specific risk
    flagged rather than solved; Tyne Tunnel has no open-air alternative in
    either direction, so it was sized as a tunnel portal despite its
    approach roads being motorway-speed.
  - Given no real detection data will ever come back from this testing
    approach, "tune these against real data" is not a meaningful future
    task the way it would be for the toll/fine figures — a future revision
    means reasoning through the categories again with better judgment, not
    replacing a guess with a measurement.
- [x] ~~Populate all eight target UK toll crossings (Dartford, Blackwall,
      Silvertown, Mersey Gateway, Silver Jubilee, Tyne Tunnel, Humber
      Bridge, Warburton) in `src/config/crossings.ts` with real toll/fine/
      deadline data and sources~~ — done 2026-09-05
      (`Crossing.scheme.verifiedAt` on every entry). **Not final** — see the
      two new items below and the field-verification item, which is
      explicitly NOT done just because the config compiles:
  - [ ] **Field-verify every coordinate.** All coordinates added 2026-09-05
        (`Crossing.coordinatesVerified: false` on every entry) are
        landmark-level approximations from general geographic knowledge,
        not surveyed data. Before any of this goes near a real device:
        cross-check each against OS OpenData or OpenStreetMap. (Radius
        sizing is now tracked separately, below — "Per-crossing radius
        tuning against real GPS data".)
  - [ ] Confirm Blackwall/Silvertown's final recovery stage figure (the
        Traffic Enforcement Centre cost beyond the £270 charge
        certificate) and Mersey Gateway/Silver Jubilee's payment deadline
        (next-day, as currently configured, vs. same-day, per at least one
        third-party source) directly against tfl.gov.uk and
        merseyflow.co.uk before shipping either number to users.
  - [ ] Re-check every scheme's figures against its `sourceUrl` on a
        regular cadence regardless of the above — toll/PCN rates change
        often (several of these eight changed in the last 12 months) and
        `verifiedAt` will silently go stale otherwise. The Settings screen
        shows each crossing's verified date as a visible tripwire for this.
- [ ] **Re-verify the ULEZ boundary data periodically.** It's real and
      sourced correctly today (`src/config/ulezBoundary.ts`,
      `verifiedAt: '2026-09-05'`), but TfL does change zone boundaries
      (see their own Tech Forum post, "Data update: ULEZ and Congestion
      Charge boundaries") — there's no mechanism here that would notice if
      the London Datastore dataset gets superseded. The Crossing Detail
      screen shows the boundary's own verified date (separately from the
      toll/fine data's) as the same kind of visible tripwire.
- [ ] Confirm the Open Government Licence attribution shown on the ULEZ
      crossing detail screen (`ULEZ_BOUNDARY_META` in
      `src/config/ulezBoundary.ts`) is sufficient/correctly worded —
      written from general knowledge of OGL attribution requirements, not
      checked against a solicitor or the licence text itself.

## Manual testing (Android)

**Update 2026-09-05: this was already done once this session** — see
"Confirmed by actually running this" above for the results. The Android SDK
is now installed at `%LOCALAPPDATA%\Android\Sdk`
(`platform-tools`, `emulator`, `platforms;android-35`,
`system-images;android-35;google_apis;x86_64`), an AVD named
`tollalert_test` exists, and — unless you've since closed them — the
emulator and `npx expo run:android`'s Metro process may still be running
with the dev client installed and background monitoring left **on**. Check
`adb devices` first; if `emulator-5554` is listed, you can skip straight to
step 5 below instead of rebuilding. If you'd rather start fresh (a new AVD,
a real device, or after closing everything down), the steps below still
apply from scratch.

### 1. Android SDK setup (already done this session; steps if starting fresh)

Open Android Studio → **More Actions → SDK Manager** (or **Settings →
Languages & Frameworks → Android SDK** if a project is already open):

- **SDK Platforms** tab: check **Android 15.0 ("VanillaIceCream", API 35)**.
  (The actual build resolved `targetSdkVersion: 36` at build time regardless
  of which platform you install for — Expo's Gradle tooling picks its own
  default — but installing 35 is enough for the emulator system image.)
- **SDK Tools** tab: check **Android SDK Platform-Tools**, **Android
  Emulator**, and **Android SDK Build-Tools**.
- Apply, let it download (a few GB).

Then **More Actions → Virtual Device Manager → Create device**:

- Pick any phone profile (e.g. Pixel 8).
- **Important**: pick a system image with **Google Play** in its name (the
  "Play Store" column shows a Play icon), not a plain "Google APIs" or AOSP
  image. `expo-location`'s Android geofencing relies on Google Play
  Services' Fused Location Provider — an emulator image without Play
  Services won't support background geofencing at all, and you'd see
  nothing fire and have no obvious reason why. (This session used a plain
  `google_apis` image, not `google_apis_playstore`, and Play services'
  Fused/geofencer components were present and working regardless — but the
  Play Store-branded image is the safer/more standard choice if picking
  from Android Studio's GUI, which only offers that or AOSP.)
- Finish, then launch the AVD once from the Device Manager to confirm it
  boots before moving on.

### 2. Build the dev client

Two options — pick whichever is more convenient:

- **Cloud build (no local SDK build step needed)**:
  `eas login` once, then `npm run build:android:dev` (already scripted —
  runs `eas build --platform android --profile development`, which
  produces an installable `.apk` since `eas.json`'s `development` profile
  sets `buildType: apk`). Download the APK when it finishes and drag it
  onto the running emulator window to install, or
  `adb install path/to/downloaded.apk`.
- **Local build** (what was used this session — needs step 1 done):
  `npx expo run:android` with the emulator already running — this both
  builds and installs in one step. Took ~9 minutes the first time
  (cold Gradle cache); faster on subsequent runs.

Either way, this is a **dev client** build (`expo-dev-client`), not Expo
Go — Expo Go cannot run this app's background geofencing at all (it has no
native geofencing module compiled in), so if you instead try
`npx expo start` and open the project in Expo Go, background monitoring
silently does nothing. That's expected, not a bug — always use the dev
client build above.

### 3. Start the JS bundler and open the app

`npx expo run:android` (or `npx expo start --dev-client` if the app's
already installed) starts Metro and opens the app automatically. On first
launch it lands on the dev-client's own launcher screen (not your app) —
tap **Continue** there to load the actual bundle.

### 4. Turn on background monitoring

In the app: Settings → "Monitor all crossings in the background" → toggle
on → the rationale modal appears → "Continue" → the Android system location
permission dialogs appear. Grant foreground location, then when prompted
again (or redirected to system settings on Android 11+, per the modal's own
copy) grant **"Allow all the time"**. You should then see:

- The toggle flips to "On".
- A persistent, low-priority notification: **"Toll Alert is watching for
  crossings"**. This should stay visible the whole time monitoring is on —
  if it disappears on its own, something killed the foreground service.

**If tapping the Settings gear icon (top-right of Home) keeps opening the
dev menu instead of navigating**: this is expo-dev-client's own corner-tap
gesture zone for opening the dev menu on emulators without shake support —
it overlaps the gear icon exactly. Confirmed this session; not an app bug.
Work around it by focusing the button with a hardware/keyboard d-pad
(e.g. Tab then Enter) instead of tapping it directly, or shake the AVD via
Extended Controls if you'd rather dismiss the dev menu and try a slightly
different tap position.

Optionally also tap **Settings → Reliability → "Improve reliability"** and
confirm the system "ignore battery optimizations" dialog appears (grant
it) — this session confirmed the intent launches without throwing, but
nobody visually confirmed the dialog's actual content, so it's still worth
a look.

### 5. Simulate arriving at Dartford Crossing

With the emulator running and the app backgrounded (press Home, don't
force-close it), open the emulator's **Extended Controls** (the **⋯** button
on the emulator's side toolbar) → **Location** tab, and either:

- Type in the coordinates and click **Send**: **Latitude 51.4657,
  Longitude 0.2649**, or
- From a terminal, with the emulator running:
  ```
  adb emu geo fix 0.2649 51.4657
  ```
  **`geo fix` takes LONGITUDE first, then LATITUDE** — the opposite order
  from how this README (and the app's config) lists coordinates. Getting
  this backwards is the single most common mistake here and will silently
  place you in the wrong hemisphere-ish location instead of erroring.

**If `geo fix`/Extended Controls doesn't seem to do anything** (checked via
`adb shell dumpsys location` showing `last location=null` under `gps
provider` no matter how many fixes you send): this happened in this exact
AVD/API combination this session — nothing had an active GPS-priority
location request, so `GnssService` never turned on to consume the injected
fix. The fallback that worked:
```
adb shell appops set --uid 2000 android:mock_location allow
adb shell cmd location providers add-test-provider gps --requiresSatellite
adb shell cmd location providers set-test-provider-enabled gps true
adb shell cmd location providers set-test-provider-location gps --location 51.4657,0.2649
```
(Latitude, longitude order here — opposite of `geo fix`.) Try `geo fix`
first since it's the standard/documented approach; only reach for this if
it's genuinely not registering.

**If nothing fires at all even with the fallback above, and it previously
worked in the same emulator session**: this happened mid-session once —
Android's "stationary throttling" (a real power-saving feature) backs off
update frequency when repeated nearby mock fixes look like a parked,
non-moving device, and Play Services can start rejecting deliveries to the
geofencer as "too fast" indefinitely once this kicks in. `adb reboot` the
emulator (then re-grant the four permissions with `pm grant` and reconnect
the app to Metro from its dev-launcher screen, since both reset on reboot)
cleared this reliably. Cheaper than debugging the throttling itself.

**Expected result**: within roughly a few seconds to a couple of minutes
(Android's Geofencing API doesn't guarantee instant delivery — responsiveness
depends on OS/battery state), a notification titled **"Dartford detected"**
should appear, with body **"Pay £3.50 (car) — free 22:00–06:00 by midnight
the day after crossing — tap to pay, or mark as paid once you have."** and a
**"Mark as paid"** action button — and **no** "ULEZ detected" alongside it
(Dartford's real coordinates are outside the real ULEZ boundary; if you see
a ULEZ notification here too, that's a real regression, not expected
behaviour, since this was the exact bug the ULEZ rework fixed). Tapping the
notification body should open the Crossing Detail screen for Dartford with
the same figures, fine stages, and the "Figures verified against Dart
Charge (National Highways) on ..." footnote.

### 6. Trigger an exit, then re-trigger an entry

Set the mock location somewhere clearly outside both Dartford's 600m radius
and ULEZ's real boundary — e.g. `adb emu geo fix -3.1883 55.9533`
(Edinburgh) comfortably clears both. No notification is expected here
(exits are tracked internally for dedup, not notified). Then set it back
to Dartford's coordinates (`adb emu geo fix 0.2649 51.4657`) again — this
session found the timing matters:

- Returning after only **~1-2 minutes** away did not reliably re-fire the
  Dartford notification (confirmed once at ~81 seconds — no repeat). This
  isn't a bug in the dedup logic itself: it's waiting on Android's
  Geofencing API to actually deliver the EXIT transition for the point
  region, which is out of this app's hands and wasn't confirmed to happen
  within that window on the emulator.
- Returning after a full **~3 minutes** away did reliably re-fire it,
  confirmed this session.

So: wait a genuine 3+ minutes away before concluding a missing second
notification is a bug, not just unprocessed OS-level exit timing. If it
still doesn't fire after that, that's worth reporting back with exactly
what you did. Note that a **second real crossing** (e.g. Blackwall at
300m, or Warburton at 150m — see "Per-crossing radius sizing" above) is a
stricter version of the same test since you're not relying on memory of
what "Dartford again" should look like.

### 7. Testing ULEZ (simpler now — a single mock position, no simulated route needed)

The old boundary-ring approach needed simulated movement to exercise
properly; the new wake-circle + polygon-check approach doesn't — a single
mock fix at a real central-London position is enough, since the check runs
against the device's actual position on the next location update rather
than needing to walk a ring of geofences.

- `adb emu geo fix -0.1281 51.5080` (Trafalgar Square — real central
  London, genuinely inside the real ULEZ boundary), or the
  `cmd location providers` fallback from step 5 if `geo fix` isn't
  registering (`--location 51.5080,-0.1281`, latitude first).
- If you haven't already triggered Dartford (step 5) or otherwise gotten
  within ULEZ's ~37km wake circle first, the very first check after moving
  inside that circle may take a little longer than subsequent ones — the
  wake circle's own ENTER event has to start the fine-grained location
  task before the first real polygon check can run. Once that task is
  running (confirmed via `adb logcat` showing
  `TaskService: Handling job with task name 'toll-alert-android-location-task'`),
  further updates are picked up immediately.

**Expected result**: a notification titled **"ULEZ detected"** with body
**"Pay £12.50 per day (non-compliant vehicles) by midnight 3 days after
driving in the zone — tap to pay, or mark as paid once you have."** —
confirmed to fire within ~13 seconds in this session's second-pass test.
No repeat while you stay inside (the same `insideRegion` dedup as point
crossings). Moving away to somewhere outside the ~37km wake circle (e.g.
Edinburgh again) should trigger the wake circle's own EXIT — visible in
`adb logcat` as `toll-alert-android-geofence-task` handling a job at that
moment — which stops the fine-grained location task; this session
confirmed the EXIT event fires but didn't independently re-confirm that
location polling actually stayed off afterward.

### Which crossings are realistic to actually drive or walk to

All of the above should be validated on the emulator first regardless of
where you are — it's the only way to test all 8 crossings without a lot of
driving. For real-world validation afterward, it depends on where you're
based:

- **Motorway-only, no pedestrian access — must be driven**: Dartford
  Crossing, Blackwall Tunnel, Silvertown Tunnel, Tyne Tunnel. You'd need to
  actually drive through with the app running in the background.
- **Bridges with pedestrian/cycle access — walkable if you're nearby**:
  Mersey Gateway Bridge and Silver Jubilee Bridge (Runcorn/Widnes), Humber
  Bridge (Hessle/Barton-upon-Humber) has a dedicated foot/cycle path
  alongside the carriageway, and Warburton Toll Bridge (Cheshire) is a
  small single-lane bridge that's realistically walkable end-to-end in a
  few minutes — probably the single easiest real-world test if you can get
  there, since it needs no driving and no motorway.
- Geographically: Dartford/Blackwall/Silvertown cluster around London;
  Mersey Gateway/Silver Jubilee cluster around Runcorn/Widnes (near
  Liverpool); Tyne Tunnel is near Newcastle; Humber Bridge is near
  Hull — pick whichever cluster is closest to you rather than trying to
  cover all eight in person.

## Wired into the app — via a Settings toggle, not auto-start

`AppState.setBackgroundMonitoringEnabled(true)` calls `geofencing.requestPermissions()`
then `geofencing.start()`; the Settings screen's "Background monitoring" row
drives this. Deliberately an explicit opt-in toggle rather than
auto-starting once onboarding permissions are granted, since real
background location tracking has a battery/privacy cost a tester should
choose to take on, not something sprung on them silently — revisit this
default once there's a real product decision on the onboarding flow. The
toggle is disabled on web (`Platform.OS === 'web'`), since geofencing needs
the custom dev client on a real device to do anything at all.
