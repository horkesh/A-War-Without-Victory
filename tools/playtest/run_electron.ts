/**
 * Electron playthrough driver — the UI half of the playtest lane.
 *
 * Launches the REAL packaged-shape Electron app and drives it with REAL DOM CLICKS.
 *
 * WHY CLICKS AND NOT `window.awwv.*`
 *   Driving the contextBridge is just slow headless: it exercises the same IPC the
 *   headless driver already covers and sees nothing about the interface. The
 *   2026-08-05 RS playthrough made exactly this mistake — its own report records that
 *   the window sat on the main menu for the entire automated run and the screenshots
 *   were worthless as UI evidence. If a human has to click it, this driver clicks it.
 *
 * SHAPE: shallow but real. The headless lane does depth (188 turns); this one does
 * breadth of surface — reach each screen, prove it renders, capture it, move on.
 *
 * PREREQUISITES (both verified by `preflight()` below, because both have bitten):
 *   1. `npm run desktop:release:check` must have run IN THIS WORKTREE — `dist/` is
 *      not shared between worktrees and `awwv://` serves Not Found without it.
 *   2. This worktree needs its OWN node_modules. Never junction it to another tree.
 *
 * RECORD-ONLY. Never edits engine or UI source.
 *
 * Usage:
 *   node node_modules/tsx/dist/cli.mjs tools/playtest/run_electron.ts --faction RBiH
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { _electron as electron, type ElectronApplication, type Frame, type Page } from 'playwright';
import { REPO_BASE_DIR } from '../ai_play/president_playthrough.js';
import { FindingsRecorder } from './findings.js';
import type { Finding, Severity } from './types.js';
import { runContentProbes } from './ui_content_probes.js';

const LEDGER_PATH = join(REPO_BASE_DIR, 'docs/40_reports/playtests/findings/FINDINGS.jsonl');
const APP_URL_PREFIX = 'awwv://';
/** A click that takes longer than this to produce a visible change is friction. */
const INTERACTION_BUDGET_MS = 1500;
/** Surfaces worth reading for CONTENT. The opening beats show no game data. */
const CONTENT_PROBE_SURFACES = new Set(['campaign_start', 'in_game', 'turn_loop']);

function arg(name: string, fallback?: string): string | undefined {
    const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
    if (!hit) return fallback;
    if (hit.includes('=')) return hit.slice(hit.indexOf('=') + 1);
    return process.argv[process.argv.indexOf(hit) + 1] ?? fallback;
}

// ── Preflight ────────────────────────────────────────────────────────────────

function preflight(): void {
    const problems: string[] = [];
    for (const d of ['dist/warroom', 'dist/tactical-map', 'dist/desktop']) {
        if (!existsSync(join(REPO_BASE_DIR, d))) problems.push(`missing ${d}/`);
    }
    if (!existsSync(join(REPO_BASE_DIR, 'node_modules/playwright/package.json'))) {
        problems.push('node_modules/playwright is not installed in THIS worktree');
    }
    if (problems.length) {
        console.error('Preflight failed:\n  - ' + problems.join('\n  - '));
        console.error('\nFix: cd into this worktree, then `npm install` and `npm run desktop:release:check`.');
        process.exit(1);
    }
}

// ── Window selection ─────────────────────────────────────────────────────────

/**
 * The app opens DevTools. `firstWindow()` returns THAT window — and its DOM has
 * buttons, so a naive probe looks like it succeeded while reporting on the wrong
 * window entirely. Always select by URL.
 */
async function appWindow(app: ElectronApplication, timeoutMs = 60_000): Promise<Page> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const win = app.windows().find((w) => w.url().startsWith(APP_URL_PREFIX));
        if (win) return win;
        await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(
        `No ${APP_URL_PREFIX} window after ${timeoutMs}ms. Saw: ${app.windows().map((w) => w.url().slice(0, 60)).join(', ')}`,
    );
}

// ── Surface capture ──────────────────────────────────────────────────────────

interface Control {
    text: string;
    disabled: boolean;
    visible: boolean;
    w: number;
    h: number;
}

/**
 * Read controls across the page AND every child frame.
 *
 * The tactical map renders inside `#tactical-map-iframe`, so a top-document-only
 * query reports an empty screen while the game is in fact running inside the frame.
 * That produced a false "renders no interactive controls" critical on the first run.
 */
async function readControls(win: Page): Promise<Control[]> {
    const perFrame = await Promise.all(win.frames().map((f) => readControlsIn(f).catch(() => [])));
    return perFrame.flat();
}

async function readControlsIn(win: { $$eval: Page['$$eval'] }): Promise<Control[]> {
    return win.$$eval('button, [role="button"], a[href], [tabindex]:not([tabindex="-1"])', (els) =>
        els.map((e) => {
            const r = e.getBoundingClientRect();
            const cs = window.getComputedStyle(e);
            return {
                text: (e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
                disabled: e.hasAttribute('disabled') || e.getAttribute('aria-disabled') === 'true',
                visible: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0,
                w: Math.round(r.width),
                h: Math.round(r.height),
            };
        }),
    );
}

/** Elements whose text overflows their own box — the clipping class. */
async function readClipped(win: Page): Promise<string[]> {
    return win.$$eval('*', (els) =>
        els
            .filter((e) => {
                const cs = window.getComputedStyle(e);
                if (cs.overflow === 'visible' || cs.overflow === 'auto' || cs.overflow === 'scroll') return false;
                if (!(e.textContent ?? '').trim()) return false;
                return e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2;
            })
            .slice(0, 10)
            .map((e) => `${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ')[0]}: ${(e.textContent ?? '').trim().slice(0, 50)}`),
    );
}

// ── UI probes ────────────────────────────────────────────────────────────────

function finding(
    kind: Finding['kind'],
    severity: Severity,
    probe: string,
    title: string,
    detail: string,
    surface: string,
    evidence?: Record<string, unknown>,
): Finding {
    return { kind, severity, probe, title, detail, surface, turn: 0, faction: 'RBiH', evidence };
}

async function probeSurface(win: Page, surface: string, recorder: FindingsRecorder): Promise<void> {
    const controls = await readControls(win);
    const visible = controls.filter((c) => c.visible);

    if (visible.length === 0) {
        recorder.record(
            finding('bug', 'critical', 'ui-empty-surface', `Surface \`${surface}\` renders no interactive controls`,
                `The ${surface} screen mounted but exposes nothing clickable. A player reaching this screen cannot proceed.`,
                `ui:${surface}`),
        );
    }

    // A control with a zero-size box is present in the DOM and unclickable in fact.
    for (const c of controls.filter((c) => c.visible && (c.w === 0 || c.h === 0))) {
        recorder.record(
            finding('bug', 'high', 'ui-zero-size-control', `Control "${c.text}" has a zero-size hit box`,
                `On ${surface}, "${c.text}" reports visible but measures ${c.w}×${c.h}px. It cannot be clicked.`,
                `ui:${surface}`, { control: c.text, w: c.w, h: c.h }),
        );
    }

    // An unlabelled control is one the player cannot identify.
    for (const c of visible.filter((c) => !c.text)) {
        recorder.record(
            finding('friction', 'medium', 'ui-unlabelled-control', 'Interactive control with no accessible label',
                `A control on ${surface} has no text content and no accessible name — unreadable to a screen reader and ambiguous to everyone else.`,
                `ui:${surface}`, { size: `${c.w}x${c.h}` }),
        );
    }

    await probeErrorBanners(win, surface, recorder);

    // Content correctness: what the screen SAYS, not whether it rendered. Everything the
    // owner found on 2026-08-27 was in this category and the harness could not see it.
    // Opt-in per surface: these walk every element in every frame, and running them on
    // each of the opening beats both cost turn-loop timing and said nothing new.
    if (CONTENT_PROBE_SURFACES.has(surface)) {
        for (const f of await runContentProbes(win, surface)) recorder.record(f);
    }

    for (const clip of await readClipped(win)) {
        recorder.record(
            finding('friction', 'medium', 'ui-clipped-text', 'Text clipped by its own container',
                `On ${surface}, content overflows a non-scrolling box and is cut off: ${clip}`,
                `ui:${surface}`, { element: clip }),
        );
    }
}


/**
 * A visible error banner after a click is the highest-value UI finding there is: the
 * app is telling the player, on screen, that the thing they just tried did not work.
 * Headless can never see this — it calls the sim API directly and bypasses the IPC
 * validation layer that produces most of these messages.
 */
async function probeErrorBanners(win: Page, surface: string, recorder: FindingsRecorder): Promise<void> {
    const perFrame = await Promise.all(win.frames().map((f) => bannersIn(f).catch(() => [])));
    for (const b of perFrame.flat()) {
        recorder.record(
            finding('bug', 'critical', 'ui-error-banner', `Error shown to the player on ${surface}: "${b.text.slice(0, 70)}"`,
                `After a normal interaction on ${surface}, the app displayed an error to the player: "${b.text}". `
                + `The action the player attempted did not complete.`,
                `ui:${surface}`, { element_id: b.id, message: b.text }),
        );
    }
}

async function bannersIn(win: { $$eval: Page['$$eval'] }): Promise<Array<{ id: string; text: string }>> {
    const banners = await win.$$eval(
        '[id*="error"], [class*="error"], [role="alert"], [aria-live="assertive"]',
        (els) =>
            els
                .filter((e) => {
                    const cs = window.getComputedStyle(e);
                    const r = e.getBoundingClientRect();
                    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0
                        && !e.classList.contains('hidden') && (e.textContent ?? '').trim().length > 0;
                })
                .map((e) => ({ id: e.id, text: (e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) }))
                .slice(0, 5),
    );
    return banners;
}

// ── Interaction ──────────────────────────────────────────────────────────────

/**
 * Click a control by visible text and record how long the UI took to respond.
 * Returns false when nothing matched — the caller decides whether that is a finding.
 */
async function clickByText(
    win: Page,
    text: string,
    surface: string,
    recorder: FindingsRecorder,
): Promise<boolean> {
    const target = win.getByRole('button', { name: text, exact: false }).first();
    if ((await target.count()) === 0) return false;
    if (!(await target.isEnabled().catch(() => false))) return false;

    const before = await win.content().then((c) => c.length).catch(() => 0);
    const t0 = Date.now();
    await target.click({ timeout: 15_000 }).catch(() => undefined);
    // Wait for the DOM to actually change rather than a blind sleep.
    await win
        .waitForFunction((prev) => document.documentElement.outerHTML.length !== prev, before, { timeout: 10_000 })
        .catch(() => undefined);
    const elapsed = Date.now() - t0;

    if (elapsed > INTERACTION_BUDGET_MS) {
        recorder.record(
            finding('friction', elapsed > INTERACTION_BUDGET_MS * 4 ? 'high' : 'medium', 'ui-slow-interaction',
                `Clicking "${text}" takes over ${INTERACTION_BUDGET_MS}ms to show any change`,
                `On ${surface}, "${text}" took ${elapsed}ms before the DOM changed. Below ~100ms feels instant; above a second the player wonders whether the click registered.`,
                `ui:${surface}`, { control: text, elapsed_ms: elapsed, budget_ms: INTERACTION_BUDGET_MS }),
        );
    }
    return true;
}



/**
 * Wait for a POSITIVE signal that the campaign shell is live, instead of assuming a
 * fixed pause after Begin was long enough.
 *
 * Campaign construction is slow and variable. A fixed 16s wait made turn 1
 * non-deterministic: identical code advanced 8/8 turns on one run and stalled on the
 * next, because the driver started clearing blockers while the shell was still
 * assembling and consumed clicks that went nowhere.
 *
 * Ready means BOTH a dated turn readout and the in-game navigation are present.
 */
async function waitForCampaignReady(win: Page, frame: Frame, timeoutMs = 120_000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const f = gameFrame(win, frame);
        const ready = await f
            .evaluate(() => {
                const text = document.body.innerText || '';
                const dated = /\d+\s+\w+\s+\d{4}/.test(text);
                const nav = /WAR MAP/i.test(text) && /ARMY HQ/i.test(text);
                return dated && nav;
            })
            .catch(() => false);
        if (ready) {
            // One settle beat so late-mounting panels finish before anything is clicked.
            await win.waitForTimeout(2500);
            return true;
        }
        await win.waitForTimeout(1500);
    }
    return false;
}

// ── The turn loop ────────────────────────────────────────────────────────────


/**
 * Re-resolve the embedded game frame on every use.
 *
 * A Frame handle captured once goes stale when the shell re-creates or re-navigates the
 * iframe, and a stale handle answers queries with ZERO MATCHES rather than throwing —
 * so the driver reported "0 decision cards" while the card was plainly on screen.
 */
function gameFrame(win: Page, fallback: Frame): Frame {
    return win.frames().find((f) => f.url().includes('embedded=1')) ?? fallback;
}

/** Read the in-game date readout. It is the only reliable "did the turn advance" signal. */
async function readDate(frame: Frame): Promise<string> {
    return frame
        .evaluate(() => (document.body.innerText.match(/\d+\s+\w+\s+\d{4}/) ?? [''])[0])
        .catch(() => '');
}

async function clickIfPresent(frame: Frame, name: RegExp, settleMs = 2000): Promise<boolean> {
    const el = frame.getByRole('button', { name }).first();
    if ((await el.count().catch(() => 0)) === 0) return false;
    if (!(await el.isEnabled().catch(() => false))) return false;
    await el.click({ timeout: 10_000 }).catch(() => undefined);
    await frame.page().waitForTimeout(settleMs);
    return true;
}


/** Walk back out of any deep surface to the main turn shell. */
async function returnToShell(frame: Frame): Promise<void> {
    // ONLY dismiss overlays and take the DESK nav. Earlier this also clicked
    // PRESIDENT'S DESK / WARROOM / BACK-TO-FIELD, which navigate INTO sub-scenes —
    // the Presidential Inbox was then absent and the driver reported "0 decision
    // cards" while the decision was sitting one screen away.
    await clickIfPresent(frame, /^Close$/i, 1000);
    await clickIfPresent(frame, /^DESK$/i, 1800);
}



/**
 * Close whatever overlay is open. A decision modal left up covers the top navigation,
 * so ADVANCE becomes unfindable and the turn looks stuck for a reason that is purely
 * the driver's own doing.
 */
async function dismissModal(frame: Frame): Promise<void> {
    // Close the button that belongs to the OPEN DIALOG, not the first "Close" anywhere
    // on the page. The Authority & Directives explainer stayed up for eight clearing
    // passes because a same-named control elsewhere was being clicked instead.
    const dialog = frame.locator('[role="dialog"], [aria-modal="true"]').last();
    if ((await dialog.count().catch(() => 0)) > 0) {
        for (const re of [/^Close$/i, /^[×✕✖]$/i, /^Dismiss$/i]) {
            const btn = dialog.getByRole('button', { name: re }).first();
            if ((await btn.count().catch(() => 0)) > 0) {
                await btn.click({ timeout: 6000 }).catch(() => undefined);
                await frame.page().waitForTimeout(1000);
                return;
            }
        }
    }
    for (const re of [/^Close$/i, /^[×✕✖]$/i, /^Dismiss$/i, /^Continue$/i]) {
        if (await clickIfPresent(frame, re, 1000)) return;
    }
    // DO NOT press Escape as a blind fallback. Escape TOGGLES the pause menu, so
    // pressing it when nothing needs dismissing PAUSES THE GAME — and the pause overlay
    // is not role="dialog", so hasOpenModal cannot see it. That is exactly what made
    // turn 1 fail on 2 of 3 runs: the driver paused the game and then reported that
    // ADVANCE TURN did nothing.
}


/**
 * What is actually on screen right now. Attached to every stuck-turn finding so a
 * stall is diagnosable from the ledger alone — repeatedly writing a throwaway recon
 * script per stall is how most of this driver's build time was spent.
 */
async function screenState(frame: Frame): Promise<Record<string, unknown>> {
    // NOTE: no `const fn = () => {}` inside evaluate(). tsx/esbuild runs with keepNames,
    // which wraps named function expressions in a `__name(...)` helper that does not
    // exist in the page context — the call then dies with "__name is not defined".
    // Inline every predicate.
    return frame
        .evaluate(() => ({
            date: (document.body.innerText.match(/\d+\s+\w+\s+\d{4}/) ?? [''])[0],
            modals: [...document.querySelectorAll('[role="dialog"],[aria-modal="true"]')]
                .filter((e) => window.getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0)
                .map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 90)),
            buttons: [...document.querySelectorAll('button,[role="button"]')]
                .filter((e) => window.getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0)
                .map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim())
                .filter(Boolean)
                .slice(0, 30),
        }))
        .catch((e: unknown) => ({ error: String((e as Error)?.message ?? e).slice(0, 300) }));
}

/** Is any blocking overlay still on screen? */
async function hasOpenModal(frame: Frame): Promise<boolean> {
    return frame
        .evaluate(() =>
            [...document.querySelectorAll('[role="dialog"],[aria-modal="true"]')].some((e) => {
                const r = e.getBoundingClientRect();
                return window.getComputedStyle(e).display !== 'none' && r.width > 0 && r.height > 0;
            }),
        )
        .catch(() => false);
}


/**
 * Answer a decision that is presented DIRECTLY as a modal rather than through the
 * Presidential Inbox card (paramilitary authorization does this, and it blocks the turn
 * identically). Detected structurally: an open modal plus an option carrying the
 * HISTORICAL DEFAULT marker.
 */
async function resolveOpenDecisionModal(frame: Frame): Promise<boolean> {
    if (!(await hasOpenModal(frame))) return false;
    const preferred = frame.locator('button').filter({ hasText: /Historical default/i }).first();
    if ((await preferred.count().catch(() => 0)) === 0) return false;
    await preferred.click({ timeout: 8000 }).catch(() => undefined);
    await frame.page().waitForTimeout(2500);
    await dismissModal(frame);
    return true;
}


/**
 * Work the Decision Room review queue.
 *
 * Not every turn blocker is a decision or a modal: some turns block on a command-review
 * item that only exists behind REVIEW BLOCKERS, where each entry has its own REVIEW
 * button. With none of these actioned, ADVANCE TURN is simply absent from the shell and
 * the turn looks broken.
 */
async function clearReviewQueue(frame: Frame): Promise<boolean> {
    // A "COMMAND BRIEFING — N warnings need review" banner can sit over the shell with
    // its own REVIEW / x controls; clear it before opening the room.
    // Do NOT dismiss anything before checking whether the room is open. This used to
    // click a bare × to clear the "COMMAND BRIEFING - N warnings" banner, but the same
    // glyph CLOSES THE DECISION ROOM. On RS, which opens with six required decisions and
    // the room already up, every pass closed the room, reopened it via Command Surface,
    // and reset the list to ALL — so the queue could never be worked. Diagnosed from
    // `[queue-entry] review=3`: the room was open on entry and shut immediately after.
    const roomOpen = (await frame.getByRole('button', { name: /^Review$/i }).count().catch(() => 0)) > 0;
    if (!roomOpen) await clickIfPresent(frame, /^[×✕✖]$/i, 1200);

    // Work the queue whether the room is already open or still behind the badge.
    // Gating on a REVIEW BLOCKERS click meant that once the room WAS open — which is the
    // state at the turn-9 signature blocker — this returned false immediately and the
    // Review items were never touched.
    const alreadyOpen = (await frame.getByRole('button', { name: /^Review$/i }).count().catch(() => 0)) > 0;
    if (!alreadyOpen && !(await clickIfPresent(frame, /REVIEW BLOCKERS/i, 3000))) {
        // Turn-9 shape: an outstanding signature, the room CLOSED, and no REVIEW BLOCKERS
        // badge to open it — the only way in is the Desk's Command Surface nav.
        // Gated on SIGNATURE REQUIRED so this never fires on an ordinary turn: clicking
        // navigation unconditionally is what broke turn 1 twice before.
        const sigOutstanding = (await frame.getByRole('button', { name: /^SIGNATURE REQUIRED$/i }).count().catch(() => 0)) > 0;
        if (!sigOutstanding) return false;
        if (!(await clickIfPresent(frame, /^Command Surface$/i, 3000))) return false;
        if ((await frame.getByRole('button', { name: /^Review$/i }).count().catch(() => 0)) === 0) return false;
    }
    // Filter to what actually blocks the turn BEFORE touching any Review button.
    // The ALL tab lists optional leadership gestures (Visit the front, Address the
    // nation, Decorate a unit) above the blocking item, so a first-match Review click
    // opens a gesture and the blocker is never reached. "REVIEW BEFORE ADVANCE" and the
    // DECISION tab both narrow the list to the item that is holding the turn.
    // Select the DECISION tab UNCONDITIONALLY. It was previously only tried when
    // REVIEW BEFORE ADVANCE was absent — but that button IS present and does not filter
    // the list, so the tab was never reached and the ALL tab's optional leadership
    // gestures kept absorbing the first Review click.
    // Tab label has no separators: "Decision6 itemsREQ 6 · REC 0 · MON 0 · RECORD 0".
    const decisionTab = frame.getByRole('button', { name: /^Decision\s*\d+\s*items?/i }).first();
    if ((await decisionTab.count().catch(() => 0)) > 0) {
        await decisionTab.click({ timeout: 6000 }).catch(() => undefined);
        await frame.page().waitForTimeout(2000);
    }

    let acted = false;
    for (let i = 0; i < 6; i++) {
        const item = frame.getByRole('button', { name: /^REVIEW$/i }).first();
        if ((await item.count().catch(() => 0)) === 0) break;
        await item.click({ timeout: 8000 }).catch(() => undefined);
        await frame.page().waitForTimeout(2000);
        acted = true;
        // Whatever the review opened: historical option, else a signature/approval, else close.
        if (await resolveOpenDecisionModal(frame)) continue;
        let signed = false;
        for (const re of [/^Sign$/i, /Sign and authorize/i, /^Approve$/i, /Authorize/i, /Grant/i, /^Accept$/i]) {
            if (await clickIfPresent(frame, re, 2000)) { signed = true; break; }
        }
        if (!signed) {
            console.log('      [review-item] unresolved:', JSON.stringify((await screenState(frame)).buttons));
            await dismissModal(frame);
        }
    }
    await dismissModal(frame);
    return acted;
}


/**
 * The President's Desk surface has its own blockers, distinct from the shell's:
 * an "Open required signature" route for proposals awaiting a signature, and
 * "Acknowledge" buttons on staff notices. Neither is a modal, neither appears on the
 * map shell, and ADVANCE (labelled "Advance" here, not "ADVANCE TURN") stays inert
 * until the signature is given.
 */
async function clearDeskBlockers(frame: Frame): Promise<boolean> {
    let acted = false;
    // NOTE: do NOT add a "click the SIGNATURE REQUIRED badge" route here. The badge is
    // present from turn 1 (it sits in the status bar), so clicking it derails the very
    // first decision and the campaign never starts. Two attempts at this each took a
    // working 8-turn driver to 0 turns. The turn-9 Operation Circle signature needs a
    // route that is scoped to the inbox card, not the global badge.
    if (await clickIfPresent(frame, /Open required signature/i, 2500)) {
        acted = true;
        console.log('      [signature] opened:', JSON.stringify((await screenState(frame)).buttons));
        for (const re of [/^Sign$/i, /Sign and authorize/i, /^Approve$/i, /Authorize/i, /Grant/i, /Confirm/i]) {
            if (await clickIfPresent(frame, re, 2500)) break;
        }
        await dismissModal(frame);
    }
    for (let i = 0; i < 6; i++) {
        if (!(await clickIfPresent(frame, /^Acknowledge$/i, 1200))) break;
        acted = true;
    }
    return acted;
}


/**
 * Clear the pause overlay if it is up.
 *
 * It is NOT role="dialog" and NOT aria-modal, so `hasOpenModal` returns false while it
 * covers the screen. Detected by its own copy instead.
 */
async function clearPauseMenu(frame: Frame): Promise<boolean> {
    const paused = await frame
        .evaluate(() => /PAUSED/.test(document.body.innerText || '')
            && /Command paused/i.test(document.body.innerText || ''))
        .catch(() => false);
    if (!paused) return false;
    if (await clickIfPresent(frame, /^RESUME$/i, 1500)) return true;
    await frame.page().keyboard.press('Escape').catch(() => undefined); // toggles back off
    await frame.page().waitForTimeout(1000);
    return true;
}

/**
 * Clear everything standing between the player and ADVANCE.
 *
 * A single turn can stack several surfaces: a required presidential decision, then a
 * diplomatic peace plan, then one or more narrative event modals. Each one covers the
 * navigation, so any of them left up makes ADVANCE unfindable — which reads from the
 * outside as a missing control rather than an unread modal.
 */
async function clearBlockingOverlays(frame: Frame, recorder: FindingsRecorder): Promise<void> {
    const win = frame.page();
    for (let pass = 0; pass < 20; pass++) {
        frame = gameFrame(win, frame);
        const didPause = await clearPauseMenu(frame);
        const didOpen = await resolveOpenDecisionModal(frame);
        const didDecision = await resolveOneDecision(frame);
        const didPeace = await resolvePeacePlan(frame, recorder);
        let didModal = false;
        if (!didPause && !didOpen && !didDecision && !didPeace && (await hasOpenModal(frame))) {
            await dismissModal(frame);
            // Only count it as progress if the modal ACTUALLY closed; otherwise an
            // un-closable overlay burns every pass and the desk/review routes never run.
            didModal = !(await hasOpenModal(frame));
        }
        if (didPause) continue;
        if (!didOpen && !didDecision && !didPeace && !didModal) {
            // Run BOTH, and do not let the first short-circuit the second. Desk blockers
            // used to `continue` on success, and its Acknowledge loop can succeed every
            // pass on fresh staff notices — so the review queue was never reached. RS
            // opens with SIX required decisions of which only two appear as inbox cards;
            // the rest live solely in the Decision Room, so that path is not optional.
            const desk = await clearDeskBlockers(frame);
            const queue = await clearReviewQueue(frame);
            if (desk || queue) continue;
            return;
        }
    }
}


/**
 * Answer a diplomatic peace-plan modal (Cutileiro, Vance-Owen, Owen-Stoltenberg,
 * Contact Group). These block the turn the same way a required decision does, but they
 * are a DIFFERENT surface: a modal with Accept / Review Later / Reject and — unlike an
 * event decision — no "HISTORICAL DEFAULT" marker and no per-option stakes. The driver
 * therefore cannot choose historically here; it takes `--peace` and records the choice
 * so a diary says what was picked rather than implying history picked it.
 *
 * "Review Later" is deliberately never used: it defers without clearing the block.
 */
async function resolvePeacePlan(frame: Frame, recorder: FindingsRecorder): Promise<boolean> {
    const accept = (arg('peace', 'reject') ?? 'reject').toLowerCase() === 'accept';
    const target = accept ? /Accept Plan/i : /Reject Plan/i;
    const btn = frame.getByRole('button', { name: target }).first();
    if ((await btn.count().catch(() => 0)) === 0) return false;

    recorder.record(
        finding('friction', 'medium', 'ui-peace-plan-unmarked',
            'Peace-plan modal offers no historical default and no per-option stakes',
            'The diplomatic peace-plan modal presents Accept / Review Later / Reject with no '
            + 'HISTORICAL DEFAULT marker and no dimension shifts, unlike event decisions which show both. '
            + 'The player cannot tell what history did or what any choice costs. '
            + `Driver policy for this run: ${accept ? 'accept' : 'reject'}.`,
            'ui:peace_plan_modal', { policy: accept ? 'accept' : 'reject' }),
    );
    await btn.click({ timeout: 10_000 }).catch(() => undefined);
    await frame.page().waitForTimeout(3000);
    await dismissModal(frame);
    return true;
}

/**
 * Open and answer one pending presidential decision. Returns false when none is open.
 *
 * Matched structurally rather than by title: the card carries "Pending since <date>",
 * and options carry a "Historical default" marker. Hardcoding the event name would
 * make the driver work for exactly one turn of one campaign.
 */
async function resolveOneDecision(frame: Frame): Promise<boolean> {
    // The Presidential Inbox card reads "Required DECISION <title> ...". Matched on the
    // Required/DECISION badge pair rather than a title, so it works for any event.
    // The inbox carries at least two blocking card types: "Required DECISION" (an event
    // decision) and "Required PROPOSAL" (an operation awaiting presidential signature,
    // e.g. Operation Circle). Both state "required before advance"; matching only
    // DECISION left proposal turns permanently stuck.
    const card = frame.getByRole('button', { name: /Required\s*(DECISION|PROPOSAL)/i }).first();
    const nCards = await card.count().catch(() => 0);
    console.log(`      [decision] inbox cards matching Required/DECISION: ${nCards}`);
    if (nCards === 0) return false;
    await card.click({ timeout: 10_000 }).catch(() => undefined);
    await frame.page().waitForTimeout(2500);

    // The modal contains exactly the response options and NO confirm button — clicking
    // an option IS the decision. Prefer the authored historical default; else take the
    // first option. (Verified by dumping the modal: three buttons, no confirm.)
    // hasText matches textContent; getByRole matches the ACCESSIBLE NAME, which for
    // these option cards is not the same string and matched nothing.
    // A proposal is signed/approved rather than chosen between; try that first.
    for (const re of [/^Sign$/i, /^Approve$/i, /Sign and authorize/i, /Authorize/i, /Approve operation/i]) {
        if (await clickIfPresent(frame, re, 2500)) {
            await dismissModal(frame);
            return true;
        }
    }
    const preferred = frame.locator('button').filter({ hasText: /Historical default/i }).first();
    const nPref = await preferred.count().catch(() => 0);
    console.log(`      [decision] historical-default options visible: ${nPref}`);
    if (nPref > 0) {
        await preferred.click({ timeout: 8000 }).catch(() => undefined);
        await frame.page().waitForTimeout(2500);
        await dismissModal(frame);
        return true;
    }
    const anyOption = frame.locator('button.w-full.text-left').first();
    if ((await anyOption.count().catch(() => 0)) > 0) {
        await anyOption.click({ timeout: 8000 }).catch(() => undefined);
        await frame.page().waitForTimeout(2500);
        await dismissModal(frame);
        return true;
    }
    await clickIfPresent(frame, /^Close$/i, 1200);
    return false;
}

/**
 * Clear whatever is blocking the turn, then advance.
 *
 * The gate is real and layered: ADVANCE is not directly available while a required
 * decision is outstanding. The player must go REVIEW BLOCKERS -> Decision Room ->
 * OPEN PRESIDENT'S DESK -> answer the decision, and only then can the turn move.
 * Each step here mirrors a click a human makes.
 */
async function advanceOneTurn(
    win: Page, frame: Frame, turn: number, recorder: FindingsRecorder,
): Promise<{ advanced: boolean; from: string; to: string }> {
    frame = gameFrame(win, frame);
    const from = await readDate(frame);
    console.log(`    [turn ${turn}] at ${from}`);

    // RETRY, do not single-shot. Blockers arrive asynchronously — a decision, a peace
    // plan, an event, a signature, a staff notice — and clearing one can reveal another
    // a beat later. A single clear-then-click races that and reports a stuck turn on
    // what is really a timing gap; this was the driver's main source of flakiness.
    for (let attempt = 1; attempt <= 4; attempt++) {
        await clearBlockingOverlays(frame, recorder);
        const clicked = await clickIfPresent(frame, /ADVANCE\s*TURN|^ADVANCE/i, 5000);
        console.log(`    [turn ${turn}] attempt ${attempt} advance clicked: ${clicked}`);

        if (clicked) {
            let to = from;
            for (let i = 0; i < 24 && to === from; i++) {
                await win.waitForTimeout(2500);
                to = await readDate(frame);
                if (to === from && i % 6 === 5) await clearBlockingOverlays(frame, recorder);
            }
            if (to !== from) {
                await clearBlockingOverlays(frame, recorder);
                return { advanced: true, from, to };
            }
        }
        await win.waitForTimeout(2000);
    }

    const screen = await screenState(frame);
    recorder.record(
        finding('bug', 'critical', 'ui-turn-blocked', 'Turn cannot be advanced after four attempts',
            `At ${from} the driver cleared every known blocker four times and the date never moved. `
            + `Either a blocker type is unhandled or ADVANCE is genuinely inert. Screen state attached.`,
            'ui:turn_loop', { turn, date: from, screen }),
    );
    return { advanced: false, from, to: from };
}

/** Visit each top-level surface once and probe it. Breadth, not depth. */
async function tourSurfaces(win: Page, frame: Frame, recorder: FindingsRecorder,
                            capture: (w: Page, n: string) => Promise<void>): Promise<void> {
    for (const [label, re] of [
        ['war_map', /^WAR MAP$/i], ['army_hq', /^ARMY HQ$/i], ['records', /^RECORDS$/i],
        ['chronicle', /^CHRONICLE$/i], ['codex', /^CODEX$/i], ['desk', /^DESK$/i],
    ] as Array<[string, RegExp]>) {
        if (!(await clickIfPresent(frame, re, 3500))) {
            recorder.record(
                finding('friction', 'medium', 'ui-surface-unreachable', `Surface "${label}" has no reachable control`,
                    `The top-level "${label}" navigation control was absent or disabled during normal play.`,
                    `ui:${label}`),
            );
            continue;
        }
        await capture(win, `tour_${label}`);
        await probeSurface(win, label, recorder);
    }
}


/**
 * Write a contact sheet of every screenshot the run captured.
 *
 * Aesthetic quality is the one finding category no probe will ever cover — "screams AI
 * slop design" is a judgement, not a predicate. The only mechanism that catches it is a
 * human looking at the screen, and the owner found eight defects in ONE screenshot the
 * harness had already captured and nobody had looked at. This makes looking cheap:
 * one page, every surface, in order.
 */
function writeContactSheet(outDir: string, shotDir: string, runId: string, shots: string[]): string {
    const cards = shots
        .map((name) => `    <figure><img src="screenshots/${name}" alt="${name}" loading="lazy"><figcaption>${name}</figcaption></figure>`)
        .join('\n');
    const html = `<!doctype html>
<meta charset="utf-8">
<title>Playtest contact sheet — ${runId}</title>
<style>
  :root { color-scheme: dark; }
  body { background:#12141a; color:#e8e6df; font:14px/1.5 ui-monospace,Consolas,monospace; margin:0; padding:24px; }
  h1 { font-size:18px; letter-spacing:.14em; text-transform:uppercase; color:#d9c27a; margin:0 0 4px; }
  p.sub { color:#8b8f9a; margin:0 0 24px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(460px,1fr)); gap:20px; }
  figure { margin:0; background:#1a1d25; border:1px solid #2b2f3a; border-radius:6px; overflow:hidden; }
  img { width:100%; display:block; border-bottom:1px solid #2b2f3a; }
  figcaption { padding:8px 10px; color:#a8adb8; font-size:12px; letter-spacing:.06em; }
</style>
<h1>Playtest contact sheet — ${runId}</h1>
<p class="sub">${shots.length} surfaces, in capture order. Look for what is WRONG, not what is broken —
the probes already cover broken. Wrong content rendered correctly is the category they miss.</p>
<div class="grid">
${cards}
</div>
`;
    const path = join(outDir, 'contact_sheet.html');
    writeFileSync(path, html, 'utf8');
    return path;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    preflight();

    const faction = arg('faction', 'RBiH')!;
    const runId = arg('run-id') ?? `ui-${faction}`;
    const outDir = arg('out') ?? join(REPO_BASE_DIR, 'tmp-playtest', runId);
    const shotDir = join(outDir, 'screenshots');
    mkdirSync(shotDir, { recursive: true });

    const recorder = new FindingsRecorder(runId, join(outDir, 'findings.jsonl'));
    console.log(`▶ ${runId} — real Electron UI, faction ${faction}`);

    // FRESH PROFILE PER RUN. Electron otherwise reuses one persistent userData
    // directory, so every run inherits the previous run's saves and settings — a
    // playtest is supposed to be a new player, and accumulated state silently changes
    // the launch path and turn behaviour between otherwise identical runs.
    const userDataDir = join(outDir, 'user-data');
    mkdirSync(userDataDir, { recursive: true });
    const app = await electron.launch({
        args: [`--user-data-dir=${userDataDir}`, '.'],
        cwd: REPO_BASE_DIR,
        timeout: 120_000,
    });
    let shot = 0;
    const capture = async (win: Page, name: string): Promise<void> => {
        await win.screenshot({ path: join(shotDir, `${String(++shot).padStart(2, '0')}_${name}.png`) }).catch(() => undefined);
    };

    try {
        const win = await appWindow(app);

        // Console and page errors are findings wherever they occur.
        win.on('pageerror', (e) =>
            recorder.record(
                finding('bug', 'high', 'ui-page-error', `Uncaught page error: ${e.message.slice(0, 80)}`,
                    `The renderer threw during normal play: ${e.message.slice(0, 300)}`, 'ui:renderer'),
            ),
        );
        win.on('console', (m) => {
            if (m.type() !== 'error') return;
            const t = m.text();
            if (/Autofill\.(enable|setAddresses)/.test(t)) return; // DevTools protocol noise, not the app
            recorder.record(
                finding('bug', 'medium', 'ui-console-error', `Console error: ${t.slice(0, 80)}`,
                    `The renderer logged an error during normal play: ${t.slice(0, 300)}`, 'ui:renderer'),
            );
        });

        await win.waitForLoadState('domcontentloaded');
        await win.waitForSelector('button, [role="button"]', { timeout: 60_000 }).catch(() => undefined);

        // ── Surface 1: main menu ──
        await capture(win, 'main_menu');
        await probeSurface(win, 'main_menu', recorder);

        // ── The case-file opening, which lives INSIDE the shell iframe ──
        // (Desktop launch has routed here since 2026-08-27; the warroom's own static
        // Command Post + side picker is now the browser/dev opening only.)
        const frame = win.frames().find((f) => f.url().includes('embedded=1'));
        if (!frame) {
            recorder.record(
                finding('bug', 'critical', 'ui-no-game-frame', 'No embedded shell frame at launch',
                    'The iframe hosting the case-file opening was not created, so the game cannot be entered.',
                    'ui:main_menu'),
            );
        } else {
            const factionLabels: Record<string, RegExp> = {
                RBiH: /Republic of Bosnia/i, RS: /Republika Srpska/i, HRHB: /Herzeg-Bosnia/i,
            };
            // landing -> factions -> dossier -> mode -> Begin. Each is a click a human makes.
            const beats: Array<[string, RegExp, number]> = [
                ['factions', /New War/i, 3000],
                ['dossier', factionLabels[faction] ?? new RegExp(faction, 'i'), 3000],
                ['mode', /Take command/i, 3000],
                ['campaign_start', /^Begin$/i, 1000],
            ];
            let reached = true;
            for (const [label, re, settle] of beats) {
                if (!(await clickIfPresent(frame, re, settle))) {
                    recorder.record(
                        finding('bug', 'critical', 'ui-opening-beat-unreachable',
                            `Case-file opening stalls before "${label}"`,
                            `No enabled control matching ${re} on the preceding beat, so the opening cannot proceed to ${label}.`,
                            'ui:case_file_opening', { beat: label, faction }),
                    );
                    reached = false;
                    break;
                }
                await capture(win, label);
                await probeSurface(win, label, recorder);
            }

            if (reached && !(await waitForCampaignReady(win, frame))) {
                recorder.record(
                    finding('bug', 'critical', 'ui-campaign-never-ready',
                        'Campaign shell never becomes ready after Begin',
                        'Begin was clicked and neither a dated turn readout nor the in-game navigation '
                        + 'appeared within 120s. The player is left on a screen that never finishes loading.',
                        'ui:campaign_start', { faction }),
                );
                reached = false;
            }

            if (reached) {
                // ── Play. This is the part that makes it a playtest rather than a launch check.
                const turnsWanted = Number(arg('turns', '0'));
                if (turnsWanted > 0) {
                    let played = 0;
                    for (let t = 1; t <= turnsWanted; t++) {
                        const r = await advanceOneTurn(win, frame, t, recorder);
                        if (!r.advanced) {
                            console.log(`  turn ${t}: STUCK at ${r.from}`);
                            await capture(win, `stuck_turn_${t}`);
                            break;
                        }
                        played++;
                        console.log(`  turn ${t}: ${r.from} -> ${r.to}`);
                        if (t % 5 === 0 || t === turnsWanted) {
                            await capture(win, `turn_${String(t).padStart(3, '0')}`);
                            await probeSurface(win, 'in_game', recorder);
                        }
                    }
                    console.log(`  turns advanced through the UI: ${played}/${turnsWanted}`);
                    // Tour LAST: it navigates into deep surfaces, and doing it before the
                    // turn loop left the shell somewhere the Presidential Inbox is absent.
                    await tourSurfaces(win, frame, recorder, capture);
                }
            }
        }

        console.log(`\n■ ${recorder.count} findings, ${recorder.distinctCount} distinct`);
        const shots = readdirSync(shotDir).filter((f) => f.endsWith('.png')).sort();
        console.log(`  screenshots: ${shotDir} (${shots.length})`);
        console.log(`  contact sheet: ${writeContactSheet(outDir, shotDir, runId, shots)}`);

        // Documentation is part of the run, not an afterthought. On 2026-08-27 three real
        // findings lived only in commit messages because "I wrote it down" felt true.
        try {
            const { checkCoverage } = await import('./diary_check.js');
            const cov = checkCoverage();
            if (!cov.diaryPath) {
                console.log('  DIARY: none found — findings have nowhere to be documented.');
            } else if (cov.undocumented.length > 0) {
                console.log(`  DIARY: ${cov.undocumented.length} finding(s) NOT in the diary:`);
                for (const f of cov.undocumented.slice(0, 8)) {
                    console.log(`    ! ${f.fingerprint} [${f.severity}] ${f.title.slice(0, 76)}`);
                }
                if (cov.undocumented.length > 8) console.log(`    ! … and ${cov.undocumented.length - 8} more`);
                console.log('    Write them up in the diary, then: diary_check.ts --update');
            } else {
                console.log(`  DIARY: all ${cov.documented.length} open findings documented.`);
            }
        } catch (e) {
            console.log(`  DIARY: coverage check failed — ${String((e as Error)?.message ?? e).slice(0, 120)}`);
        }

    } finally {
        // Merge in `finally` — a driver that crashes mid-run must still contribute
        // everything it found up to that point.
        const { added, repeated } = recorder.mergeIntoLedger(LEDGER_PATH);
        console.log(`  ledger: ${added.length} NEW, ${repeated.length} already known`);
        for (const f of added) console.log(`    + [${f.severity}] ${f.title}  (${f.surface})`);
        await app.close().catch(() => undefined);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
