# Handover

Read this in full before starting new work — it's the fastest way to pick up
where the last session left off. If anything here conflicts with what you
find in the code, trust the code and update this file.

## What this project is

Toll Alert: an Expo/React Native app that geofences UK toll crossings (plus
the ULEZ zone) and reminds the user to pay before the deadline. See
`README.md` for the full feature/architecture rundown and
`src/geofencing/README.md` for the geofencing engine specifically.

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
