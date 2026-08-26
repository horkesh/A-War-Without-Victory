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

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright';
import { REPO_BASE_DIR } from '../ai_play/president_playthrough.js';
import { FindingsRecorder } from './findings.js';
import type { Finding, Severity } from './types.js';

const LEDGER_PATH = join(REPO_BASE_DIR, 'docs/40_reports/playtests/findings/FINDINGS.jsonl');
const APP_URL_PREFIX = 'awwv://';
/** A click that takes longer than this to produce a visible change is friction. */
const INTERACTION_BUDGET_MS = 1500;

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

    const app = await electron.launch({ args: ['.'], cwd: REPO_BASE_DIR, timeout: 120_000 });
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

        // ── Surface 2: new campaign / faction select ──
        if (!(await clickByText(win, 'New Campaign', 'main_menu', recorder))) {
            recorder.record(
                finding('bug', 'critical', 'ui-missing-control', 'No enabled "New Campaign" control on the main menu',
                    'The primary entry point into the game is absent or disabled on a fresh launch.', 'ui:main_menu'),
            );
        } else {
            await capture(win, 'faction_select');
            await probeSurface(win, 'faction_select', recorder);

            // ── Surface 3: in-campaign ──
            const factionLabels: Record<string, string> = {
                RBiH: 'Republic of Bosnia and Herzegovina',
                RS: 'Republika Srpska',
                HRHB: 'Croatian Republic of Herzeg-Bosnia',
            };
            if (await clickByText(win, factionLabels[faction] ?? faction, 'faction_select', recorder)) {
                await win.waitForTimeout(8000); // campaign construction; not a DOM-diff event
                await capture(win, 'campaign_start');
                await probeSurface(win, 'campaign_start', recorder);
                // Did the campaign actually start, or are we still staring at the picker?
                const stillPicking = await win
                    .$$eval('#side-picker', (els) => els.some((e) => window.getComputedStyle(e).display !== 'none'))
                    .catch(() => false);
                if (stillPicking) {
                    recorder.record(
                        finding('bug', 'critical', 'ui-campaign-start-blocked',
                            'Selecting a faction does not start a campaign',
                            'The faction was clicked on the side picker and the picker is still on screen afterwards. '
                            + 'The player cannot begin a game from the desktop UI.',
                            'ui:side_picker', { faction }),
                    );
                }
            } else {
                recorder.record(
                    finding('bug', 'critical', 'ui-missing-control', `No enabled control to select faction ${faction}`,
                        `"${factionLabels[faction] ?? faction}" was not clickable on the faction-select surface.`,
                        'ui:faction_select', { faction }),
                );
            }
        }

        console.log(`\n■ ${recorder.count} findings, ${recorder.distinctCount} distinct`);
        console.log(`  screenshots: ${shotDir}`);
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
