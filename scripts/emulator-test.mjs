#!/usr/bin/env node
/**
 * Automated geofence detection test against a connected Android device or
 * emulator.
 *
 * WHY THIS EXISTS: the manual plan in src/geofencing/README.md is thorough
 * but long, and the two "confirmed by actually running this" passes recorded
 * there both missed the worst bug this project has had — because every step
 * left the app alive, so `start()` had already populated the engine in that
 * same JS context. This script force-stops the app before every case by
 * default, which is the real-world path: Android kills the app and relaunches
 * it headlessly to deliver a transition.
 *
 * It reads the coordinates it tests straight out of src/config/crossings.ts,
 * so it can never drift from what the app actually ships.
 *
 * Run:  npm run test:emulator
 *       npm run test:emulator -- --only dartford-crossing
 *       npm run test:emulator -- --timeout 240
 *       npm run test:emulator -- --no-cold      (leave the app running)
 *       npm run test:emulator -- --list
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE = 'com.tollalert.app';

/* ------------------------------------------------------------------ *
 * adb plumbing
 * ------------------------------------------------------------------ */

let resolvedAdb = null;

/**
 * Finds adb without requiring it on PATH.
 *
 * Anyone whose emulator starts from Android Studio or the VS Code extension
 * has a working SDK but often no PATH entry, because neither tool needs one —
 * so demanding PATH setup was friction for no reason. PATH is still tried
 * first, so an explicitly configured adb always wins.
 */
function resolveAdb() {
  if (resolvedAdb) return resolvedAdb;

  const exe = process.platform === 'win32' ? 'adb.exe' : 'adb';

  try {
    execFileSync('adb', ['version'], { stdio: 'ignore' });
    resolvedAdb = 'adb';
    return resolvedAdb;
  } catch {
    // Not on PATH — fall through to the standard SDK locations.
  }

  const roots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    join(homedir(), 'AppData', 'Local', 'Android', 'Sdk'),
    join(homedir(), 'Library', 'Android', 'sdk'),
    join(homedir(), 'Android', 'Sdk'),
  ].filter(Boolean);

  for (const root of roots) {
    const candidate = join(root, 'platform-tools', exe);
    if (existsSync(candidate)) {
      resolvedAdb = candidate;
      return resolvedAdb;
    }
  }

  fail(
    'adb not found — not on PATH, and not in any standard Android SDK location.\n' +
      '  Looked in:\n' +
      roots.map((r) => `    ${join(r, 'platform-tools', exe)}`).join('\n') +
      '\n\n  If your SDK is elsewhere, point ANDROID_HOME at it:\n' +
      '    PowerShell:  $env:ANDROID_HOME = "D:\\path\\to\\Sdk"\n' +
      '    bash:        export ANDROID_HOME=/path/to/Sdk\n' +
      '  Android Studio shows the path under Settings > Languages & Frameworks >\n' +
      '  Android SDK ("Android SDK Location").'
  );
}

/** Runs adb with an argument array — no shell, so Windows quoting can't bite. */
function adb(args, { allowFail = false } = {}) {
  try {
    return execFileSync(resolveAdb(), args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
  } catch (e) {
    if (allowFail) return '';
    throw e;
  }
}

function shell(command, opts) {
  return adb(['shell', command], opts);
}

function fail(message) {
  console.error(`\nFAILED  ${message}\n`);
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ *
 * Read the shipped geofences
 * ------------------------------------------------------------------ */

/**
 * Parses src/config/crossings.ts rather than importing it: that module
 * imports JSON the Metro-bundler way, which Node's ESM loader rejects (the
 * same reason the unit tests parse instead of import). Fields are matched
 * only as whole indented lines, so the many coordinates quoted in that file's
 * comments cannot be picked up as values.
 */
function readCrossings() {
  const source = readFileSync(join(ROOT, 'src/config/crossings.ts'), 'utf8');
  const configStart = source.indexOf('export const MOCK_CROSSINGS_CONFIG');
  if (configStart === -1) fail('Could not find MOCK_CROSSINGS_CONFIG in src/config/crossings.ts');

  const out = [];
  const idRe = /id: '([a-z0-9-]+)',\s*\n\s*name:/g;
  idRe.lastIndex = configStart;

  let m;
  while ((m = idRe.exec(source)) !== null) {
    const id = m[1];
    const block = source.slice(m.index, m.index + 8000);
    const circle = block.indexOf("kind: 'circle'");
    if (circle === -1 || circle > 600) continue; // ULEZ is a polygon — handled separately

    const rest = block.slice(circle);
    const field = (name) => {
      const hit = new RegExp(`^\\s*${name}:\\s*(-?[0-9.]+),\\s*$`, 'm').exec(rest);
      return hit ? Number(hit[1]) : null;
    };
    const shortName = /shortName: '([^']+)'/.exec(block)?.[1];
    const latitude = field('latitude');
    const longitude = field('longitude');
    const radiusMeters = field('radiusMeters');
    if (shortName && latitude !== null && longitude !== null) {
      out.push({ id, shortName, latitude, longitude, radiusMeters });
    }
  }
  if (out.length === 0) fail('Parsed no circle geofences out of src/config/crossings.ts');
  return out;
}

/* ------------------------------------------------------------------ *
 * Test cases
 * ------------------------------------------------------------------ */

const ELSEWHERE = { latitude: 55.9533, longitude: -3.1883, label: 'Edinburgh' };
const TRAFALGAR = { latitude: 51.508, longitude: -0.1281, label: 'Trafalgar Square' };

/**
 * Blackwall and Silvertown genuinely sit inside the real ULEZ boundary, so a
 * "ULEZ detected" alongside either is correct — a non-compliant vehicle owes
 * both charges. Anywhere else a ULEZ alert would be a real regression, and
 * was one once: with the old placeholder rectangle, Dartford fell inside it.
 */
const ULEZ_IS_EXPECTED_AT = new Set(['blackwall-tunnel', 'silvertown-tunnel']);

function buildCases(crossings) {
  const allTitles = crossings.map((c) => `${c.shortName} detected`).concat('ULEZ detected');

  const cases = crossings.map((c) => {
    const own = `${c.shortName} detected`;
    return {
      id: c.id,
      label: `${c.shortName} (${c.radiusMeters}m radius)`,
      at: c,
      expect: [own],
      forbid: allTitles.filter(
        (t) => t !== own && !(t === 'ULEZ detected' && ULEZ_IS_EXPECTED_AT.has(c.id))
      ),
    };
  });

  cases.push({
    id: 'ulez',
    label: 'ULEZ via Trafalgar Square',
    at: TRAFALGAR,
    expect: ['ULEZ detected'],
    forbid: crossings.map((c) => `${c.shortName} detected`),
  });

  // Negative control. Without it, a build that fired unconditionally would
  // sail through every other case and look completely green.
  cases.push({
    id: 'nowhere',
    label: 'Edinburgh — nothing should fire (negative control)',
    at: ELSEWHERE,
    expect: [],
    forbid: allTitles,
    timeoutOverride: 45,
  });

  return cases;
}

/* ------------------------------------------------------------------ *
 * Device actions
 * ------------------------------------------------------------------ */

function preflight() {
  const online = adb(['devices'])
    .split('\n')
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l.endsWith('\tdevice'));

  if (online.length === 0) {
    fail('No device or emulator connected.\n  Start your AVD, then re-run — `adb devices` should list it as "device".');
  }
  if (online.length > 1) {
    fail(
      `More than one device connected:\n${online.map((d) => `    ${d}`).join('\n')}\n` +
        '  Disconnect all but one — this script does not pass -s.'
    );
  }

  if (!shell(`pm list packages ${PACKAGE}`, { allowFail: true }).includes(PACKAGE)) {
    fail(
      `${PACKAGE} is not installed.\n` +
        '  Install a PREVIEW build (npm run build:android:preview), not a development one.'
    );
  }

  console.log(`adb:     ${resolvedAdb === 'adb' ? 'adb (from PATH)' : resolvedAdb}`);
  console.log(`Device:  ${online[0].split('\t')[0]}`);
  console.log(`Package: ${PACKAGE}`);
}

/**
 * Warns if background monitoring looks like it was never armed.
 *
 * Granting permissions is NOT the same as registering geofences. Regions
 * only reach the OS when `geofencing.start()` runs, which happens when the
 * user turns alerts on — during onboarding, or from the Settings toggle.
 * On a fresh install with nobody having opened the app, nothing is
 * registered, so every case here fails with "expected ... never appeared"
 * and no hint as to why. That is a wasted twenty minutes.
 *
 * Deliberately a WARNING, not a hard failure: `dumpsys location`'s format
 * varies across Android versions and this heuristic has not been verified
 * against every one of them, so a false negative must not block a run that
 * would otherwise work.
 */
function warnIfNotArmed() {
  const dump = shell('dumpsys location', { allowFail: true });
  if (dump.includes(PACKAGE)) {
    console.log('Geofences: registered with the OS');
    return;
  }

  console.log('');
  console.log('  WARNING  No geofences for this app found in `dumpsys location`.');
  console.log('           Granting permissions does not register them — the app has to be');
  console.log('           opened and monitoring turned on at least once:');
  console.log('');
  console.log('             1. Open Toll Alert on the device');
  console.log('             2. Tap "Turn on crossing alerts" (or Settings > Background monitoring)');
  console.log('             3. Confirm the home screen shows "Watching N crossings"');
  console.log('');
  console.log('           Continuing anyway — this check is a heuristic and can be wrong.');
  console.log('           But if every case below fails, this is the first thing to rule out.');
  console.log('');
}

function grantPermissions() {
  const permissions = [
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.ACCESS_BACKGROUND_LOCATION',
    'android.permission.POST_NOTIFICATIONS',
  ];
  for (const p of permissions) shell(`pm grant ${PACKAGE} ${p}`, { allowFail: true });

  const dump = shell(`dumpsys package ${PACKAGE}`, { allowFail: true });
  const missing = permissions.filter((p) => !new RegExp(`${p}: granted=true`).test(dump));
  if (missing.length) {
    fail(
      `Could not grant: ${missing.join(', ')}\n` +
        '  ACCESS_BACKGROUND_LOCATION in particular cannot always be granted by `pm` on newer\n' +
        '  Android versions. Grant it by hand — Settings > Apps > Toll Alert > Permissions >\n' +
        '  Location > "Allow all the time" — then re-run.'
    );
  }
  console.log('Permissions: all four granted');
}

function enableMockLocation() {
  // `adb emu geo fix` did not register in the AVD used for the 2026-09-05
  // passes; the test-provider route did. Both are issued, cheaply.
  shell('appops set --uid 2000 android:mock_location allow', { allowFail: true });
  shell('cmd location providers add-test-provider gps --requiresSatellite', { allowFail: true });
  shell('cmd location providers set-test-provider-enabled gps true', { allowFail: true });
}

function setLocation({ latitude, longitude }) {
  shell(`cmd location providers set-test-provider-location gps --location ${latitude},${longitude}`, {
    allowFail: true,
  });
  // NOTE: `geo fix` takes LONGITUDE first. Issued as a belt-and-braces nudge.
  adb(['emu', 'geo', 'fix', String(longitude), String(latitude)], { allowFail: true });
}

/** Titles of Toll Alert crossing notifications currently posted. */
function postedTitles() {
  const dump = shell('dumpsys notification --noredact', { allowFail: true });
  const titles = new Set();
  for (const match of dump.matchAll(/android\.title=String \(([^)]*)\)/g)) {
    const title = match[1].trim();
    if (title.endsWith(' detected')) titles.add(title);
  }
  return titles;
}

/* ------------------------------------------------------------------ *
 * One case
 * ------------------------------------------------------------------ */

async function runCase(testCase, { cold, timeoutSeconds }) {
  const limit = testCase.timeoutOverride ?? timeoutSeconds;
  process.stdout.write(`\n${testCase.label}\n`);

  // Start far away so the transition is a genuine outside->inside crossing
  // rather than the immediate ENTER the OS dispatches for a region you are
  // already inside when monitoring (re)starts.
  setLocation(ELSEWHERE);
  await sleep(3000);

  let coldVerified = false;
  if (cold) {
    shell(`am force-stop ${PACKAGE}`, { allowFail: true });
    await sleep(1500);
    const pid = shell(`pidof ${PACKAGE}`, { allowFail: true });
    if (pid) {
      console.log(`  WARN  process still alive after force-stop (pid ${pid}) — NOT testing a cold start`);
    } else {
      coldVerified = true;
      console.log('  app force-stopped, pid gone — testing the headless relaunch path');
    }
    adb(['logcat', '-c'], { allowFail: true });
  }

  setLocation(testCase.at);

  const startedAt = Date.now();
  const deadline = startedAt + limit * 1000;
  let seen = new Set();
  let hitAfterMs = null;

  if (testCase.expect.length) {
    while (Date.now() < deadline) {
      seen = postedTitles();
      if (testCase.expect.every((t) => seen.has(t))) {
        hitAfterMs = Date.now() - startedAt;
        break;
      }
      await sleep(3000);
    }
  } else {
    // Negative control: let the whole window elapse, then look once.
    await sleep(limit * 1000);
    seen = postedTitles();
  }

  const problems = [];
  for (const title of testCase.expect) {
    if (!seen.has(title)) problems.push(`expected "${title}" but it never appeared within ${limit}s`);
  }
  for (const title of testCase.forbid) {
    if (seen.has(title)) problems.push(`"${title}" fired but should not have`);
  }

  let coldPathConfirmed = false;
  if (cold && coldVerified && testCase.expect.length && problems.length === 0) {
    const log = adb(['logcat', '-d', '-s', 'ReactNativeJS'], { allowFail: true });
    coldPathConfirmed = /Cold-start hydrate/i.test(log);
    if (!coldPathConfirmed) {
      problems.push(
        'notification fired, but no "Cold-start hydrate" line in logcat — the process was ' +
          'probably still warm, so the headless path was NOT exercised'
      );
    }
  }

  if (problems.length === 0) {
    const timing = hitAfterMs !== null ? ` in ~${Math.round(hitAfterMs / 1000)}s` : '';
    console.log(`  PASS${timing}${coldPathConfirmed ? ', cold path confirmed' : ''}`);
    return { id: testCase.id, ok: true };
  }

  console.log('  FAIL');
  for (const p of problems) console.log(`    - ${p}`);
  console.log(`    notifications present: ${seen.size ? [...seen].join(', ') : '(none)'}`);
  return { id: testCase.id, ok: false };
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function main() {
  const argv = process.argv.slice(2);
  const flag = (name) => argv.includes(name);
  const value = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? null : argv[i + 1];
  };

  let cases = buildCases(readCrossings());

  if (flag('--list')) {
    // Prints the coordinates as parsed, so you can eyeball that the script is
    // reading the shipped config rather than something stale.
    for (const c of cases) {
      const where = c.at.latitude !== undefined ? `${c.at.latitude}, ${c.at.longitude}` : '';
      console.log(`${c.id.padEnd(24)} ${c.label.padEnd(44)} ${where}`);
    }
    return;
  }

  const only = value('--only');
  if (only) {
    cases = cases.filter((c) => c.id === only);
    if (!cases.length) fail(`No case with id "${only}". Use --list to see them.`);
  }

  const cold = !flag('--no-cold');
  const timeoutSeconds = Number(value('--timeout') ?? 120);

  console.log('Toll Alert - automated geofence detection test');
  console.log('='.repeat(62));
  preflight();
  grantPermissions();
  enableMockLocation();
  warnIfNotArmed();
  console.log(`Mode:    ${cold ? 'COLD START (force-stop before each case)' : 'warm (app left running)'}`);
  console.log(`Timeout: ${timeoutSeconds}s per case`);
  console.log(
    '\nThis must run against a PREVIEW build. A development build relaunched\n' +
      'headlessly needs Metro to serve its JS bundle and will fail for reasons\n' +
      'that have nothing to do with the geofencing code.'
  );

  const results = [];
  for (const testCase of cases) results.push(await runCase(testCase, { cold, timeoutSeconds }));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${'='.repeat(62)}`);
  console.log(`${results.length - failed.length}/${results.length} passed`);

  if (failed.length) {
    console.log(`Failed: ${failed.map((f) => f.id).join(', ')}`);
    console.log('\nThe on-device log has the reason for any failure:');
    console.log('  adb logcat -d -s ReactNativeJS | findstr TollAlert      (PowerShell)');
    console.log('  adb logcat -d -s ReactNativeJS | grep TollAlert         (bash)');
    console.log('Or in the app: Settings > Troubleshooting > Diagnostics.');
    process.exit(1);
  }
}

main().catch((e) => fail(e?.stack ?? String(e)));
