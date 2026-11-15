// Command loop L6 render proof (2026-11-15): boots a real RBiH campaign in the dev map
// build, sets a known Authority account (balance, last recovery and its breakdown) and a
// pending corps operation proposal in the raw state, and reloads it through the real
// adapter. Photographs (1) the Desk's Authority column with the new ladder rows and the
// next-week income line, and (2) the proposal's directive footer with the 10-Authority price
// and the "You have ... next week" line, once affordable and once unaffordable (the button
// must be disabled), at 1280x720 and the wide desk size, in EN and BCS.
// Usage: node tools/ui/authority_prices_browser_proof.mjs --url http://127.0.0.1:5201 --out <dir>
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const origin = opt('--url', 'http://127.0.0.1:5201');
const out = opt('--out', 'C:/Pyrrhic/AWWV-worktrees/_logs/cl-l6-authority-20261115');
fs.mkdirSync(out, { recursive: true });

const SIZES = [{ width: 1280, height: 720 }, { width: 2293, height: 960 }];
const PROPOSAL_ID = 'PROP_L6_proof';
const CARD_ID = `command:review-proposal:${PROPOSAL_ID}`;

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
      window.__l6 = {
        store: (await import(find('/store/gameStore.ts'))).useGameStore,
        i18n: await import(find('/i18n/index.ts')),
        lens: await import(find('/utils/decisionRoomLensRequest.ts')),
      };
    });
  }

  // A known Authority account plus a pending APPROVE_OP proposal for the player's first
  // commanded corps (ready plan from its own brigades), reloaded through the real adapter.
  async function inject(current) {
    return page.evaluate(async ({ proposalId, current }) => {
      const { store } = window.__l6;
      const raw = structuredClone(store.getState().loadedGameState.rawGameState);
      const faction = raw.meta.player_faction;
      const officers = raw.military.named_officers ?? {};
      const formations = raw.military.formations ?? {};
      const corpsId = Object.keys(officers).sort()
        .map((id) => officers[id])
        .filter((o) => o && o.status === 'active' && o.assigned_corps_id && formations[o.assigned_corps_id]?.faction === faction)
        .map((o) => o.assigned_corps_id)[0];
      if (!corpsId) throw new Error('no commanded corps');
      const brigades = Object.keys(formations).sort()
        .filter((id) => formations[id]?.faction === faction && formations[id]?.kind === 'brigade').slice(0, 4);
      const control = raw.political?.political_controllers ?? {};
      const own = Object.keys(control).sort().filter((osid) => control[osid] === faction);
      const enemy = Object.keys(control).sort().filter((osid) => control[osid] && control[osid] !== faction);
      raw.military.corps_command = raw.military.corps_command ?? {};
      const cc = raw.military.corps_command[corpsId] ?? (raw.military.corps_command[corpsId] = {});
      cc.commander_state = {
        ...(cc.commander_state ?? {}),
        current_plan: {
          plan_id: 'plan_l6_proof', status: 'ready',
          objective_description: `offensive opportunity from zone:${corpsId}:${own[0]}`,
          staging_zone: `zone:${corpsId}:${own[0]}`, target_osids: enemy.slice(0, 2),
          assigned_brigades: brigades, viability_score: 0.56, concentration_progress: 1,
        },
      };
      raw.meta.pending_proposal_reviews = [
        ...(raw.meta.pending_proposal_reviews ?? []).filter((r) => r.id !== proposalId),
        { id: proposalId, turn: raw.meta.turn, faction, domain: 'ops', description: 'Operation approval', proposed_action: `APPROVE_OP:${corpsId}:plan_l6_proof` },
      ];
      const auth = raw.military.command_authority;
      auth.current = current;
      auth.last_recovery = 4.5;
      auth.last_recovery_source = 'international_standing';
      auth.last_recovery_breakdown = { recovery: 4.5, base: 3.25, political_bonus: 0.75, quiet_front_dividend: 0, friction_penalty: 0.5, top_source: 'international_standing' };
      await store.getState().loadSave(JSON.stringify(raw));
      const ca = store.getState().loadedGameState.commandAuthority;
      return { corpsId, current: ca?.current, breakdown: ca?.lastRecoveryBreakdown ?? null };
    }, { proposalId: PROPOSAL_ID, current });
  }

  async function openDesk() {
    await page.locator('[data-testid="warroom-toolbar-president-desk"]').click();
    await page.locator('[data-testid="desk-authority-header"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(600);
  }

  async function closeDesk() {
    const close = page.locator('[data-testid="desk-close-overlay"]');
    if (await close.isVisible().catch(() => false)) await close.click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
  }

  async function openProposal() {
    await page.evaluate((cardId) => window.__l6.lens.requestDecisionRoomLens('all', null, cardId), CARD_ID);
    const toolbar = page.locator('[data-testid="warroom-toolbar-command-surface"]');
    if (await toolbar.isVisible().catch(() => false)) await toolbar.click();
    await page.waitForTimeout(1500);
    const rail = page.locator(`[data-card-id="${CARD_ID}"]`).first();
    if (await rail.isVisible().catch(() => false)) await rail.click().catch(() => {});
    await page.locator(`[data-testid="decision-room-active-dossier"][data-card-id="${CARD_ID}"]`).waitFor({ timeout: 15000 });
    await page.waitForTimeout(600);
  }

  const deskFacts = () => page.evaluate(() => {
    const header = document.querySelector('[data-testid="desk-authority-header"]');
    return {
      nextWeek: document.querySelector('[data-testid="desk-authority-next-week"]')?.textContent ?? null,
      levers: [...document.querySelectorAll('[data-testid="desk-authority-lever"]')].map((row) => row.textContent.trim()),
      headerText: header?.innerText.split('\n').map((l) => l.trim()).filter(Boolean) ?? [],
    };
  });

  const footerFacts = () => page.evaluate((cardId) => {
    const panel = document.querySelector(`[data-testid="decision-room-active-dossier"][data-card-id="${cardId}"]`);
    const price = panel?.querySelector('[data-testid="directive-price-line"]');
    const buttons = [...(panel?.querySelectorAll('button') ?? [])]
      .map((b) => ({ text: b.textContent.trim(), disabled: b.disabled }))
      .filter((b) => b.text);
    return {
      priceLine: price?.textContent ?? null,
      text: panel?.innerText.split('\n').map((l) => l.trim()).filter(Boolean).slice(-12) ?? [],
      buttons: buttons.slice(-6),
      hasPercent: /\d\s*%/.test(panel?.innerText ?? ''),
    };
  }, CARD_ID);

  for (const size of SIZES) {
    for (const locale of ['en', 'bcs']) {
      await boot(size);
      await page.evaluate((l) => window.__l6.i18n.setLocale(l), locale);
      const tag = `${locale}_${size.width}x${size.height}`;
      const injected = await inject(34);
      await openDesk();
      const deskFile = path.join(out, `authority_desk_${tag}.png`);
      await page.screenshot({ path: deskFile });
      const desk = await deskFacts();
      await closeDesk();
      await openProposal();
      const priceFile = path.join(out, `authority_price_${tag}.png`);
      await page.screenshot({ path: priceFile });
      const affordable = await footerFacts();
      const row = { locale, size: `${size.width}x${size.height}`, injected, deskFile, desk, priceFile, affordable };
      if (size.width === 1280) {
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(600);
        await inject(8);
        await openProposal();
        const shortFile = path.join(out, `authority_price_short_${tag}.png`);
        await page.screenshot({ path: shortFile });
        row.shortFile = shortFile;
        row.unaffordable = await footerFacts();
      }
      report.push(row);
      console.log(JSON.stringify(row));
      await page.evaluate(() => window.__l6.i18n.setLocale('en'));
    }
  }
  report.push({ pageErrors: errors });
} finally {
  fs.writeFileSync(path.join(out, 'authority_browser_report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
