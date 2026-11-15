// Command loop L7 render proof (2026-11-15): boots a real RBiH campaign in the dev map build,
// writes one open army clash into the raw state (a halted operation of the player's first
// commanded corps, objected to by the faction's real army commander, with a previous clash on
// record) and reloads it through the real adapter. Opens the Command Surface on the clash card
// and photographs it at 1280x720 and the wide desk size, in EN and BCS, records the facts and the
// three answer buttons (labels, aria labels, disabled state), and checks there is no raw id.
// Usage: node tools/ui/army_clash_browser_proof.mjs --url http://127.0.0.1:5202 --out <dir>
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const origin = opt('--url', 'http://127.0.0.1:5202');
const out = opt('--out', 'C:/Pyrrhic/AWWV-worktrees/_logs/cl-l7-clashes-20261115');
fs.mkdirSync(out, { recursive: true });

const SIZES = [{ width: 1280, height: 720 }, { width: 2293, height: 960 }];

const browser = await chromium.launch({ headless: true });
const report = [];
try {
  const context = await browser.newContext({ viewport: SIZES[0], reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message).slice(0, 600)));

  async function boot(size) {
    await page.setViewportSize(size);
    await page.goto(`${origin}/?dev=1`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /new war|novi rat/i }).click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /Republic of Bosnia/ }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /take command/i }).click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /^begin/i }).click();
    await page.getByRole('button', { name: /^war map$/i }).waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2500);
    for (let i = 0; i < 5; i += 1) {
      const ack = page.getByRole('button', { name: /^acknowledge$|^potvrdi$/i }).first();
      if (!(await ack.isVisible().catch(() => false))) break;
      await ack.click().catch(() => page.keyboard.press('Enter'));
      await page.waitForTimeout(900);
    }
    await page.evaluate(async () => {
      const urls = performance.getEntriesByType('resource').map((r) => r.name);
      const find = (part) => urls.find((u) => u.includes(part));
      window.__l7 = {
        store: (await import(find('/store/gameStore.ts'))).useGameStore,
        i18n: await import(find('/i18n/index.ts')),
        lens: await import(find('/utils/decisionRoomLensRequest.ts')),
      };
    });
  }

  async function injectClash() {
    return page.evaluate(async () => {
      const { store } = window.__l7;
      const raw = structuredClone(store.getState().loadedGameState.rawGameState);
      const faction = raw.meta.player_faction;
      const turn = raw.meta.turn;
      const officers = raw.military.named_officers ?? {};
      const data = raw.military.named_officer_data ?? [];
      const formations = raw.military.formations ?? {};
      const corpsId = Object.keys(officers).sort()
        .map((id) => officers[id])
        .filter((o) => o && o.status === 'active' && o.assigned_corps_id && formations[o.assigned_corps_id]?.faction === faction)
        .map((o) => o.assigned_corps_id)[0];
      const armyChief = Object.keys(officers).sort()
        .find((id) => officers[id]?.status === 'active' && data.find((o) => o.id === id)?.rank === 'army_commander'
          && data.find((o) => o.id === id)?.faction === faction);
      if (!corpsId || !armyChief) throw new Error('no corps or army commander');
      raw.meta.army_clashes = [{
        id: `CLASH_${turn}_${faction}`, faction, turn, act: 'stop_op', corps_id: corpsId, army_officer_id: armyChief,
        conflict: 'main_effort', compliance: 'partial', counter_order: 'continue_operation',
        order_ref: 'Operation Vozuca', staged_cost: 25, corps_objection: true,
        previous_clash_id: `CLASH_${Math.max(0, turn - 1)}_${faction}_prev`,
      }];
      raw.meta.army_clash_history = [{
        id: `CLASH_${Math.max(0, turn - 1)}_${faction}_prev`, faction, turn: Math.max(0, turn - 1), act: 'withhold_plan',
        corps_id: corpsId, army_officer_id: armyChief, conflict: 'primary_corps', outcome: 'insist',
        resolved_turn: Math.max(0, turn - 1), cost: 15,
      }];
      raw.military.command_authority.current = 34;
      await store.getState().loadSave(JSON.stringify(raw));
      const loaded = store.getState().loadedGameState;
      return { cardId: `command:army-clash:CLASH_${turn}_${faction}`, corpsId, armyChief, views: loaded.armyClashes ?? null };
    });
  }

  async function openClash(cardId) {
    await page.evaluate((id) => window.__l7.lens.requestDecisionRoomLens('all', null, id), cardId);
    const toolbar = page.locator('[data-testid="warroom-toolbar-command-surface"]');
    if (await toolbar.isVisible().catch(() => false)) await toolbar.click();
    await page.waitForTimeout(1500);
    const rail = page.locator(`[data-card-id="${cardId}"]`).first();
    if (await rail.isVisible().catch(() => false)) await rail.click().catch(() => {});
    await page.locator('[data-testid="army-clash-actions"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(600);
  }

  const facts = () => page.evaluate(() => {
    const root = document.querySelector('[data-testid="army-clash-actions"]');
    const panel = root?.closest('[data-testid="decision-room-active-dossier"]') ?? root?.parentElement;
    const text = panel?.innerText ?? '';
    return {
      lines: text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 40),
      buttons: [...(root?.querySelectorAll('button') ?? [])].map((b) => ({ text: b.textContent.trim(), aria: b.getAttribute('aria-label'), disabled: b.disabled })),
      hasRawId: /CLASH_|arbih_|op:|_corps\b/.test(text),
    };
  });

  for (const size of SIZES) {
    for (const locale of ['en', 'bcs']) {
      await boot(size);
      await page.evaluate((l) => window.__l7.i18n.setLocale(l), locale);
      const injected = await injectClash();
      await openClash(injected.cardId);
      const file = path.join(out, `army_clash_${locale}_${size.width}x${size.height}.png`);
      await page.screenshot({ path: file });
      const row = { locale, size: `${size.width}x${size.height}`, file, injected: { ...injected, views: injected.views?.length ?? 0 }, ...(await facts()) };
      report.push(row);
      console.log(JSON.stringify(row));
      await page.evaluate(() => window.__l7.i18n.setLocale('en'));
    }
  }
  report.push({ pageErrors: errors });
} finally {
  fs.writeFileSync(path.join(out, 'army_clash_browser_report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
