// Command loop L5 render proof (2026-11-15): boots a real RBiH campaign in the dev map
// build, then gives one of the player's own corps a ready plan and a pending operation
// proposal in the raw state and reloads it, so the real adapter (buildOpProposalCards)
// and the real Decision Room build the dossier. Opens the Command Surface on the card,
// at 1280x720 and the wide desk size, in EN and BCS, screenshots it, records the dossier
// lines, checks there is no percentage or raw id, and tries "Show on map".
// Usage: node tools/ui/proposal_dossier_browser_proof.mjs --url http://127.0.0.1:5199 --out <dir>
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const origin = opt('--url', 'http://127.0.0.1:5199');
const out = opt('--out', 'C:/Pyrrhic/AWWV-worktrees/_logs/cl-l5-dossiers-20261115');
fs.mkdirSync(out, { recursive: true });

const SIZES = [{ width: 1280, height: 720 }, { width: 2293, height: 960 }];
const PROPOSAL_ID = 'PROP_L5_proof';
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
      window.__l5 = {
        store: (await import(find('/store/gameStore.ts'))).useGameStore,
        i18n: await import(find('/i18n/index.ts')),
        lens: await import(find('/utils/decisionRoomLensRequest.ts')),
      };
    });
  }

  // Give the player's first commanded corps a ready plan and a pending proposal, from its
  // own brigades and a nearby settlement, then reload the state through the real adapter.
  async function injectProposal() {
    return page.evaluate(async ({ proposalId }) => {
      const { store } = window.__l5;
      const loaded = store.getState().loadedGameState;
      const raw = structuredClone(loaded.rawGameState);
      const faction = raw.meta.player_faction;
      const officers = raw.military.named_officers ?? {};
      const formations = raw.military.formations ?? {};
      const corpsId = Object.keys(officers).sort()
        .map((id) => officers[id])
        .filter((o) => o && o.status === 'active' && o.assigned_corps_id && formations[o.assigned_corps_id]?.faction === faction)
        .map((o) => o.assigned_corps_id)[0];
      if (!corpsId) throw new Error('no commanded corps');
      const brigades = Object.keys(formations).sort()
        .filter((id) => formations[id]?.faction === faction && formations[id]?.kind === 'brigade' && (formations[id]?.corps_id === corpsId || formations[id]?.tags?.includes?.(`corps:${corpsId}`)))
        .slice(0, 4);
      const fallbackBrigades = brigades.length > 0 ? brigades : Object.keys(formations).sort()
        .filter((id) => formations[id]?.faction === faction && formations[id]?.kind === 'brigade').slice(0, 4);
      const control = raw.political?.political_controllers ?? {};
      const own = Object.keys(control).sort().filter((osid) => control[osid] === faction);
      const enemy = Object.keys(control).sort().filter((osid) => control[osid] && control[osid] !== faction);
      const staging = own[0];
      const targets = enemy.slice(0, 2);
      raw.military.corps_command = raw.military.corps_command ?? {};
      const cc = raw.military.corps_command[corpsId] ?? (raw.military.corps_command[corpsId] = {});
      cc.commander_state = {
        ...(cc.commander_state ?? {}),
        current_plan: {
          plan_id: 'plan_l5_proof',
          status: 'ready',
          objective_description: `offensive opportunity from zone:${corpsId}:${staging}`,
          staging_zone: `zone:${corpsId}:${staging}`,
          target_osids: targets,
          assigned_brigades: fallbackBrigades,
          viability_score: 0.56,
          concentration_progress: 1,
        },
        intel_picture: { ...(cc.commander_state?.intel_picture ?? {}), zone_confidence: { [`zone:${corpsId}:${staging}`]: 0.48 } },
        threat_assessment: { ...(cc.commander_state?.threat_assessment ?? {}), overall_pressure: 'heavy' },
      };
      raw.meta.pending_proposal_reviews = [
        ...(raw.meta.pending_proposal_reviews ?? []),
        { id: proposalId, turn: raw.meta.turn, faction, domain: 'ops', description: 'Operation approval', proposed_action: `APPROVE_OP:${corpsId}:plan_l5_proof` },
      ];
      await store.getState().loadSave(JSON.stringify(raw));
      const card = store.getState().loadedGameState.opProposalCards?.find((c) => c.proposal_id === proposalId);
      return { corpsId, brigades: fallbackBrigades.length, targets: targets.length, hasCard: Boolean(card), inputs: card?.dossier_inputs ?? null };
    }, { proposalId: PROPOSAL_ID });
  }

  async function openDossier() {
    await page.evaluate((cardId) => window.__l5.lens.requestDecisionRoomLens('all', null, cardId), CARD_ID);
    const toolbar = page.locator('[data-testid="warroom-toolbar-command-surface"]');
    if (await toolbar.isVisible().catch(() => false)) {
      await toolbar.click();
    } else {
      await page.getByRole('button', { name: /^desk$|^sto$/i }).first().click().catch(() => {});
      await page.waitForTimeout(1500);
      await page.locator('[data-testid="warroom-toolbar-command-surface"]').click();
    }
    await page.waitForTimeout(1500);
    const rail = page.locator(`[data-card-id="${CARD_ID}"]`).first();
    if (await rail.isVisible().catch(() => false)) await rail.click().catch(() => {});
    await page.locator(`[data-testid="decision-room-active-dossier"][data-card-id="${CARD_ID}"]`).waitFor({ timeout: 15000 });
    await page.waitForTimeout(600);
  }

  async function measure() {
    return page.evaluate((cardId) => {
      const panel = document.querySelector(`[data-testid="decision-room-active-dossier"][data-card-id="${cardId}"]`);
      if (!panel) return { error: 'dossier missing' };
      const text = panel.innerText;
      let min = Infinity;
      const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent.trim()) continue;
        const el = node.parentElement; const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
        if (cs.visibility === 'hidden' || cs.display === 'none' || r.width === 0 || r.height === 0) continue;
        min = Math.min(min, parseFloat(cs.fontSize));
      }
      const scroll = panel.querySelector('[data-testid="decision-room-dossier-scroll"]');
      return {
        lines: text.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 40),
        hasPercent: /\d\s*%/.test(text),
        hasRawId: /\bop:|zone:|plan_l5|arbih_|_corps\b/.test(text),
        hasUnreported: /Unreported|Nije prijavljeno/.test(text),
        showOnMap: Boolean(panel.querySelector('[data-testid="decision-room-dossier-show-on-map"]')),
        scrolls: scroll ? scroll.scrollHeight > scroll.clientHeight + 1 : null,
        minFontPx: min,
      };
    }, CARD_ID);
  }

  for (const size of SIZES) {
    for (const locale of ['en', 'bcs']) {
      await boot(size);
      await page.evaluate((l) => window.__l5.i18n.setLocale(l), locale);
      const injected = await injectProposal();
      await openDossier();
      const file = path.join(out, `dossier_${locale}_${size.width}x${size.height}.png`);
      await page.screenshot({ path: file });
      const m = await measure();
      // The detail column scrolls above the directive footer; photograph the facts too.
      await page.evaluate(() => {
        const scroll = document.querySelector('[data-testid="decision-room-dossier-scroll"]');
        const facts = scroll?.querySelector('ul');
        if (scroll && facts) scroll.scrollTop = Math.max(0, facts.offsetTop - 40);
      });
      await page.waitForTimeout(300);
      const factsFile = path.join(out, `dossier_facts_${locale}_${size.width}x${size.height}.png`);
      await page.screenshot({ path: factsFile });
      const row = { locale, size: `${size.width}x${size.height}`, file, factsFile, injected, ...m };
      if (locale === 'en' && size.width === 1280) {
        const show = page.locator('[data-testid="decision-room-dossier-show-on-map"]').first();
        if (await show.isVisible().catch(() => false)) {
          await show.click();
          await page.waitForTimeout(3000);
          const mapFile = path.join(out, `dossier_show_on_map_${size.width}x${size.height}.png`);
          await page.screenshot({ path: mapFile });
          row.showOnMapResult = await page.evaluate(() => ({
            warroomToolbarVisible: Boolean(document.querySelector('[data-testid="warroom-toolbar"]')?.getClientRects().length),
            fieldPlanFocus: document.querySelector('[data-field-operation-all-objectives-in-viewport]')?.getAttribute('data-field-operation-all-objectives-in-viewport') ?? null,
          }));
          row.showOnMapFile = mapFile;
        }
      }
      report.push(row);
      console.log(JSON.stringify(row));
      await page.evaluate(() => window.__l5.i18n.setLocale('en'));
    }
  }
  report.push({ pageErrors: errors });
} finally {
  fs.writeFileSync(path.join(out, 'dossier_browser_report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
