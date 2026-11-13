// BCS corps-case render proof (SC8/SC9): drives the real dev map renderer through a real
// campaign in BCS, advances turns, and screenshots surfaces that interpolate corps names:
// the Chief of Staff briefing and threat assessment in the Army HQ, and the turn aftermath
// command record. It records every visible corps-name phrase it finds so a reviewer can
// read the case forms without opening the images.
// Usage: node tools/ui/bcs_corps_cases_browser_proof.mjs --url http://127.0.0.1:5299 --out <dir>
//        [--faction rbih|rs] [--turns 3] [--explore]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const origin = opt('--url', 'http://127.0.0.1:5299');
const out = opt('--out', 'F:/AWWV-coordination/surface_steps/bcs_corps_cases');
const faction = opt('--faction', 'rbih');
const turns = Number(opt('--turns', '3'));
const explore = args.includes('--explore');
fs.mkdirSync(out, { recursive: true });

const FACTION_BUTTON = { rbih: /Republika Bosna|Republic of Bosnia/, rs: /Republika Srpska/ };
const CORPS_PHRASE = /(\d\. (?:krajišk\w+ )?korpus\w*|Drinsk\w+ korpus\w*|Istočnobosansk\w+ korpus\w*|Hercegovačk\w+ korpus\w*|Sarajevsko-romanijsk\w+ korpus\w*|Glavn\w+ (?:štab|stožer)\w* \w+|OZ [A-ZČĆŠŽĐ][\wčćšžđ ]+|Komand\w JNA u Hercegovini|\b(?:1st|2nd|3rd|4th|5th) Corps\b|Drina Corps|Krajina Corps|Herzegovina Corps|Sarajevo-Romanija Corps)/g;

const browser = await chromium.launch({ headless: true });
const report = { faction, shots: [], phrases: {}, errors: [] };
const size = { width: 1600, height: 960 };
try {
  const context = await browser.newContext({ viewport: size, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    try { window.localStorage.setItem('awwv.locale', 'bcs'); } catch { /* best effort */ }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', (e) => report.errors.push(String(e.stack ?? e.message).slice(0, 600)));
  const shot = async (name) => {
    const file = path.join(out, `${faction}_${name}.png`);
    await page.screenshot({ path: file });
    report.shots.push(file);
    return file;
  };
  const phrases = async (name) => {
    const text = await page.evaluate(() => document.body.innerText);
    report.phrases[name] = [...new Set(text.split('\n').filter((line) => CORPS_PHRASE.test(line)).map((l) => l.trim().slice(0, 220)))].slice(0, 40);
    CORPS_PHRASE.lastIndex = 0;
  };
  const dump = async (name) => {
    const items = await page.evaluate(() => Array.from(document.querySelectorAll('button,[data-testid]'))
      .filter((el) => el.getBoundingClientRect().width > 0)
      .map((el) => `${el.tagName.toLowerCase()} ${el.getAttribute('data-testid') ?? ''} "${(el.textContent ?? '').trim().slice(0, 50)}"`));
    fs.writeFileSync(path.join(out, `explore_${faction}_${name}.txt`), items.join('\n'));
  };

  await page.goto(`${origin}/?dev=1`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /new war|novi rat/i }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: FACTION_BUTTON[faction] }).first().click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /take command|preuzmi komandu/i }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /^(begin|počni|započni)/i }).click();
  await page.getByTestId('warroom-toolbar-command-surface').waitFor({ state: 'visible', timeout: 90000 });
  await page.waitForTimeout(3000);
  if (explore) await dump('warroom');

  // The war-start notice ("Rat je počeo") and similar notices wait for "Prihvati".
  const acceptNotices = async () => {
    for (let i = 0; i < 4; i += 1) {
      const accept = page.getByRole('button', { name: /^(prihvati|accept)$/i }).first();
      if (!(await accept.isVisible().catch(() => false))) return;
      await accept.click();
      await page.waitForTimeout(800);
    }
  };
  await acceptNotices();

  const visitArmyHq = async (name) => {
    const armyHq = page.locator('[data-testid="warroom-toolbar-staff"], [data-testid="toolbar-route-army-hq"]').first();
    if (!(await armyHq.isVisible().catch(() => false))) { if (explore) await dump(`no_army_hq_${name}`); return; }
    await armyHq.click();
    await page.waitForTimeout(2500);
    await shot(`army_hq_${name}`);
    await phrases(`army_hq_${name}`);
    // The Chief of Staff briefing and the Personnel tab carry the corps names in sentences.
    for (const [tab, label] of [['briefing', /^Brifing$/i], ['personnel', /^Ljudstvo$/i]]) {
      const button = page.getByText(label).first();
      if (!(await button.isVisible().catch(() => false))) continue;
      await button.click();
      await page.waitForTimeout(1800);
      await shot(`army_hq_${name}_${tab}`);
      await phrases(`army_hq_${name}_${tab}`);
    }
    if (explore) await dump(`army_hq_${name}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
  };
  // Army HQ opens over the map, where the War Room advance control is not shown:
  // the turn-0 visit is optional and the turns run from the War Room first.
  if (args.includes('--turn0')) await visitArmyHq('turn0');

  for (let turn = 0; turn < turns; turn += 1) {
    await acceptNotices();
    const advance = page.locator('[data-testid="warroom-toolbar-advance"], [data-testid="advance-turn-button"]').first();
    if (!(await advance.isVisible().catch(() => false))) { await dump(`no_advance_${turn}`); break; }
    await advance.click();
    // Required decisions or the aftermath can appear; the aftermath is the one we want.
    const aftermath = page.getByTestId('turn-aftermath-command-record-row').first();
    try {
      await aftermath.waitFor({ state: 'visible', timeout: 120000 });
      await aftermath.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await shot(`aftermath_turn${turn + 1}`);
      await phrases(`aftermath_turn${turn + 1}`);
    } catch {
      await shot(`after_advance_${turn + 1}`);
      if (explore) await dump(`after_advance_${turn + 1}`);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
  }

  // Army HQ after the turns: Chief of Staff briefing, threat assessment, corps cards.
  await acceptNotices();
  await visitArmyHq(`turn${turns}`);
} finally {
  fs.writeFileSync(path.join(out, `${faction}_report.json`), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
