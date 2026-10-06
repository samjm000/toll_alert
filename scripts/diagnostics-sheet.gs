/**
 * Toll Alert diagnostics receiver — a Google Apps Script web app that
 * appends testers' uploaded log lines to the sheet it's attached to.
 *
 * SETUP (once):
 *  1. Create a Google Sheet. Extensions → Apps Script. Replace the editor's
 *     contents with this file and Save.
 *  2. Deploy → New deployment → type "Web app".
 *     Execute as: Me. Who has access: Anyone. Deploy, authorise.
 *  3. Copy the Web app URL (ends in /exec) into app.json →
 *     expo.extra.diagnostics.uploadUrl, then rebuild the app.
 *
 * Redeploying after editing this script: Deploy → Manage deployments →
 * edit → Version: New version. That keeps the same URL; "New deployment"
 * would create a different one and the app would keep posting to the old.
 *
 * TOKEN must match expo.extra.diagnostics.uploadToken in app.json. It ships
 * inside the app, so it's not a real secret — it only stops random requests
 * to a public URL from filling the sheet.
 */

const TOKEN = 'aprPjYoebqexqFoEPust0U3a';
const SHEET_NAME = 'Logs';
const HEADER = ['Received', 'Tester', 'Device', 'App', 'Phone', 'Logged at', 'Level', 'Tag', 'Message'];
/** A tester's phone can't post more than this per request. */
const MAX_ENTRIES = 500;

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return reply({ ok: false, error: 'bad token' });

    const entries = Array.isArray(body.entries) ? body.entries.slice(0, MAX_ENTRIES) : [];
    if (entries.length === 0) return reply({ ok: true, appended: 0 });

    const sheet = getSheet();
    const received = new Date();
    const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
    const rows = entries.map((x) => [
      received,
      clip(body.tester, 60),
      clip(body.deviceId, 40),
      clip(body.appVersion, 30),
      clip(body.platform, 30),
      clip(x.at, 30),
      clip(x.level, 10),
      clip(x.tag, 30),
      // A leading = + - @ would be read as a formula.
      clip(x.message, 2000).replace(/^[=+\-@]/, "'$&"),
    ]);

    // Serialised so two phones posting at once can't interleave rows.
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADER.length).setValues(rows);
    } finally {
      lock.releaseLock();
    }
    return reply({ ok: true, appended: rows.length });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

/** Lets you open the URL in a browser to check the deployment is live. */
function doGet() {
  return reply({ ok: true, service: 'toll-alert-diagnostics' });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADER);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADER.length).setFontWeight('bold');
  }
  return sheet;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
