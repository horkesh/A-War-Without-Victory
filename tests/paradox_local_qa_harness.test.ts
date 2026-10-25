import assert from 'node:assert';
import * as nodeFs from 'node:fs';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import * as nodePath from 'node:path';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { test, vi } from 'vitest';
import { deriveInboxItems } from '../src/ui/map/data/inboxItems.js';
import type { LoadedGameState } from '../src/ui/map/data/types.js';

const harnessPath = join(process.cwd(), 'tools', 'ui', 'paradox_local_qa.cjs');
const nodeRequire = createRequire(import.meta.url);
const { JSDOM } = nodeRequire('jsdom') as { JSDOM: new (html?: string) => { window: Window & typeof globalThis } };

function readHarness(): string {
    return readFileSync(harnessPath, 'utf8');
}

function extractFunctionSource(source: string, name: string): string {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `missing function ${name}`);
    const paramsStart = source.indexOf('(', start);
    let paramsDepth = 0;
    let paramsEnd = -1;
    for (let index = paramsStart; index < source.length; index += 1) {
        if (source[index] === '(') paramsDepth += 1;
        if (source[index] === ')') paramsDepth -= 1;
        if (paramsDepth === 0) {
            paramsEnd = index;
            break;
        }
    }
    assert.notEqual(paramsEnd, -1, `unterminated parameters for function ${name}`);
    const bodyStart = source.indexOf('{', paramsEnd);
    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
        if (source[index] === '{') depth += 1;
        if (source[index] === '}') depth -= 1;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`unterminated function ${name}`);
}

function loadFunction<T>(source: string, name: string, context: Record<string, unknown> = {}): T {
    return runInNewContext(`(${extractFunctionSource(source, name)})`, context) as T;
}

function loadAsyncFunction<T>(source: string, name: string, context: Record<string, unknown> = {}): T {
    return runInNewContext(`(async ${extractFunctionSource(source, name)})`, context) as T;
}

test('explicit shakedown checkpoints preserve required visits and reject incomplete or disabled schedules', () => {
    const select = loadFunction<(raw: string | null, target: number, skip: boolean) => Set<number>>(
        readHarness(), 'selectCheckpointTurns',
    );
    assert.deepEqual(Array.from(select(null, 24, false)), [1, 2, 5, 10, 15, 20, 30, 40, 24]);
    assert.deepEqual(Array.from(select(null, 24, true)), []);
    assert.deepEqual(Array.from(select('24,1,4,8,12,16,20,4', 24, false)), [1, 4, 8, 12, 16, 20, 24]);
    for (const invalid of ['', '0,24', '1.5,24', '25,24', '1,4', 'one,24']) {
        assert.throws(() => select(invalid, 24, false), /checkpoint/i, invalid);
    }
    assert.throws(() => select('1,24', 24, true), /checkpoint/i);
});

test('historical choice uses explicit provenance instead of first option and stops on ambiguity', () => {
    const select = loadFunction<(decision: any) => { id: string; basis: string }>(readHarness(), 'selectHistoricalEventChoice');
    const options = [{ id: 'first', label: 'First' }, { id: 'historical', label: 'Historical' }, { id: 'staff', label: 'Staff' }];
    assert.equal(select({ response_options: options, historical_default_response_id: 'historical', staff_recommended_response_id: 'staff' }).id, 'historical');
    assert.equal(select({ response_options: [...options].reverse(), historical_default_response_id: 'historical' }).id, 'historical');
    assert.equal(select({ response_options: options, staff_recommended_response_id: 'staff' }).basis, 'staff_recommendation');
    assert.equal(select({ response_options: [{ ...options[1], historical_marker: 'historical_default' }] }).basis, 'authored_historical_default');
    assert.throws(() => select({ response_options: options }), /ranked/i);
    assert.throws(() => select({ response_options: [{}] }), /ranked/i);
    assert.throws(() => select({ response_options: options, historical_default_response_id: 'missing' }), /missing/i);
    assert.throws(() => select({ response_options: options.map(o => ({ ...o, historical_marker: 'historical_default' })) }), /ambiguous/i);
    assert.throws(() => select({ response_options: [{ ...options[0], historical_marker: 'historical_default' }, options[1]], historical_default_response_id: 'historical' }), /ambiguous/i);
});

type HistoricalPolicySurfaceOptions = {
    basis?: 'authored_historical_default' | 'staff_recommendation';
    tooltip?: string | null;
    dossiers?: Array<{ text: string; visible: boolean }>;
    foreignDossiers?: Array<{ text: string; visible: boolean }>;
};

function historicalPolicySurface({
    basis = 'authored_historical_default',
    tooltip = null,
    dossiers = [],
    foreignDossiers = [],
}: HistoricalPolicySurfaceOptions = {}) {
    const eventId = 'event-a';
    const response = { id: basis === 'staff_recommendation' ? 'staff' : 'historical', label: basis === 'staff_recommendation' ? 'Staff' : 'Historical' };
    const decision = {
        event_id: eventId,
        faction: 'RBiH',
        response_options: [
            { id: 'historical', label: 'Historical', historical_marker: 'historical_default' },
            { id: 'staff', label: 'Staff' },
        ],
        ...(basis === 'staff_recommendation'
            ? { staff_recommended_response_id: 'staff', response_options: [{ id: 'first', label: 'First' }, { id: 'staff', label: 'Staff' }] }
            : {}),
    };
    const titleList = {
        first: () => ({ getAttribute: async (name: string) => name === 'title' ? tooltip : null }),
    };
    const dossierScrolls: number[] = [];
    const responseItems = [response].map((item) => ({
        ...item,
        locator: (selector: string) => selector === '[title]' ? titleList : emptyList,
    }));
    const responseList = {
        first: () => responseItems[0],
        nth: (index: number) => responseItems[index],
        evaluateAll: async (callback: (nodes: any[]) => unknown) => callback(responseItems.map((item) => ({
            firstElementChild: { firstElementChild: { textContent: item.label } },
        }))),
    };
    const dossierList = (rows: Array<{ text: string; visible: boolean }>) => ({
        count: async () => rows.length,
        nth: (index: number) => ({
            isVisible: async () => rows[index]?.visible ?? false,
            scrollIntoViewIfNeeded: async () => { dossierScrolls.push(index); },
            innerText: async () => rows[index]?.text ?? '',
        }),
    });
    const rail = { getAttribute: async (name: string) => name === 'data-event-id' ? eventId : null };
    const modal = {
        locator: (selector: string) => {
            if (selector === '[data-testid="event-decision-response-rail"]') return { count: async () => 1, first: () => rail };
            if (selector === '[data-testid="event-decision-response"]') return responseList;
            if (selector === '[data-testid="decision-context-dossier"]') return dossierList(dossiers);
            return emptyList;
        },
    };
    const modalList = { count: async () => 1, first: () => modal };
    const emptyList = { count: async () => 0, first: () => ({ getAttribute: async () => null }) };
    return {
        locator: (selector: string) => {
            if (selector === '[role="dialog"][aria-labelledby="event-decision-title"]:visible') return modalList;
            if (selector === '[data-testid="event-decision-response-rail"]') return rail;
            if (selector === '[data-testid="event-decision-response"]') return responseList;
            if (selector === '[data-testid="decision-context-dossier"]') return dossierList(foreignDossiers);
            return emptyList;
        },
        evaluate: async () => ({
            meta: { player_faction: 'RBiH', turn: 4 },
            military: { pending_event_decisions: [decision] },
        }),
        dossierScrolls,
    };
}

test('historical event policy accepts exact visible tooltip or same-modal dossier provenance and records its location', async () => {
    const harness = readHarness();
    const selectHistoricalEventChoice = loadFunction<(decision: any) => any>(harness, 'selectHistoricalEventChoice');
    const hasMeaningfulSourceContent = loadFunction<(value: unknown, prefix: string) => boolean>(harness, 'hasMeaningfulSourceContent');
    const policy = loadAsyncFunction<(surface: any) => Promise<any>>(harness, 'policyEventResponseControl', {
        historicalChoice: true,
        rbihParamilitaryPolicyOverride: null,
        selectHistoricalEventChoice,
        hasMeaningfulSourceContent,
    });

    const tooltip = await policy(historicalPolicySurface({ tooltip: 'Historical default. Source: Archive volume 1' }));
    assert.equal(tooltip.choice.source, 'Historical default. Source: Archive volume 1');
    assert.equal(tooltip.choice.sourceLocation, 'response_tooltip');

    const dossierSurface = historicalPolicySurface({ dossiers: [{ text: 'Source dossier: Archive volume 2', visible: true }] });
    const dossier = await policy(dossierSurface);
    assert.equal(dossier.choice.source, 'Source dossier: Archive volume 2');
    assert.equal(dossier.choice.sourceLocation, 'decision_context_dossier');
    assert.deepEqual(dossierSurface.dossierScrolls, [0]);

    const staff = await policy(historicalPolicySurface({ basis: 'staff_recommendation' }));
    assert.equal(staff.choice.source, 'none');
    assert.equal(staff.choice.sourceLocation, 'not_required');
});

test('historical event policy rejects absent, empty, hidden, foreign, or ambiguous modal provenance', async () => {
    const harness = readHarness();
    const selectHistoricalEventChoice = loadFunction<(decision: any) => any>(harness, 'selectHistoricalEventChoice');
    const hasMeaningfulSourceContent = loadFunction<(value: unknown, prefix: string) => boolean>(harness, 'hasMeaningfulSourceContent');
    const policy = loadAsyncFunction<(surface: any) => Promise<any>>(harness, 'policyEventResponseControl', {
        historicalChoice: true,
        rbihParamilitaryPolicyOverride: null,
        selectHistoricalEventChoice,
        hasMeaningfulSourceContent,
    });

    await assert.rejects(policy(historicalPolicySurface()), /source note unavailable/i);
    await assert.rejects(policy(historicalPolicySurface({ tooltip: 'Historical default. Source:   ' })), /source note unavailable/i);
    await assert.rejects(policy(historicalPolicySurface({ tooltip: 'Historical default. Source: ...' })), /source note unavailable/i);
    await assert.rejects(policy(historicalPolicySurface({ dossiers: [{ text: '   ', visible: true }] })), /source note unavailable/i);
    await assert.rejects(policy(historicalPolicySurface({ dossiers: [{ text: 'Source dossier:   ', visible: true }] })), /source note unavailable/i);
    await assert.rejects(policy(historicalPolicySurface({ dossiers: [{ text: 'Source dossier: --', visible: true }] })), /source note unavailable/i);
    await assert.rejects(policy(historicalPolicySurface({ dossiers: [{ text: 'Source dossier: Hidden', visible: false }] })), /source note unavailable/i);
    await assert.rejects(policy(historicalPolicySurface({ foreignDossiers: [{ text: 'Source dossier: Foreign modal', visible: true }] })), /source note unavailable/i);
    await assert.rejects(policy(historicalPolicySurface({ dossiers: [
        { text: 'Source dossier: First', visible: true },
        { text: 'Source dossier: Second', visible: true },
    ] })), /ambiguous/i);

    const policySource = extractFunctionSource(harness, 'policyEventResponseControl');
    assert.match(policySource, /\[role="dialog"\]\[aria-labelledby="event-decision-title"\]:visible/);
    assert.match(policySource, /decision-context-dossier/);
});

test('packaged startup waits for the embedded React owner and follows its complete campaign controls', async () => {
    const harness = readHarness();
    const startReactCampaign = runInNewContext(
        `(async ${extractFunctionSource(harness, 'startReactCampaign')})`,
        { historicalChoice: true },
    ) as (surface: any, faction: string, onStep?: (step: string) => Promise<void>) => Promise<{ requested: string; ariaChecked: string } | null>;
    const actions: string[] = [];
    const steps: string[] = [];
    const productionRadioNames = ['Let it run from here', 'Let history run as it did'];
    const control = (name: string) => ({
        waitFor: async ({ state }: { state: string }) => actions.push(`wait:${name}:${state}`),
        click: async () => actions.push(`click:${name}`),
        getAttribute: async (attribute: string) => attribute === 'aria-checked' && name === '/^Let history run as it did$/i' ? 'true' : null,
        first() { return this; },
    });
    const surface = {
        getByTestId: (testid: string) => testid === 'opening-splash-art'
            ? { isVisible: async () => true }
            : control(testid),
        getByRole: (role: string, options: { name: RegExp }) => {
            if (role === 'radio' && !productionRadioNames.some((name) => options.name.test(name))) {
                throw new Error(`No production radio has accessible name ${String(options.name)}`);
            }
            return { first: () => control(String(options.name)) };
        },
        locator: (selector: string) => control(selector),
    };

    const modeSelection = await startReactCampaign(surface, 'RBiH', async (step: string) => { steps.push(step); });

    assert.deepEqual(actions, [
        'wait:[aria-labelledby="opening-splash-title"] button:visible',
        'click:[aria-labelledby="opening-splash-title"] button',
        'wait:/^New War$/i:visible',
        'click:/^New War$/i',
        'wait:main-menu-faction-RBiH:visible',
        'click:main-menu-faction-RBiH',
        'wait:/^Take command$/i:visible',
        'click:/^Take command$/i',
        'wait:/^Let history run as it did$/i:visible',
        'click:/^Let history run as it did$/i',
        'wait:/^Begin$/i:visible',
        'click:/^Begin$/i',
        'wait:/^Begin$/i:hidden',
    ]);
    assert.deepEqual(modeSelection, { requested: 'historical', ariaChecked: 'true' });
    assert.deepEqual(steps, ['side-picker', 'faction-dossier', 'command-mode', 'command-mode-historical-selected']);
    const startCampaign = extractFunctionSource(harness, 'startCampaign');
    assert.match(startCampaign, /waitForCampaignOpeningOwner/);
    assert.match(startCampaign, /opening\.kind === 'react'/);
    assert.match(startCampaign, /startReactCampaign\(opening\.surface, faction,/);
    assert.match(startCampaign, /waitForCampaignCommandReady\(frame, faction\)/);
    assert.doesNotMatch(startCampaign, /const text = await bodyText\(frame\)/);
    assert.match(startCampaign, /getByRole\('button', \{ name: \/\^Acknowledge\$\/i \}\)/);
    assert.match(startCampaign, /getByRole\('button', \{ name: \/\^Begin\$\/i \}\)/);
    assert.ok(
        startCampaign.indexOf('waitForCampaignCommandReady(frame, faction)')
            < startCampaign.indexOf("name: /^Acknowledge$/i"),
        'campaign state and a real command surface must settle before late intro controls are dismissed',
    );

    const commandSurfaceVisible = runInNewContext(
        `(async ${extractFunctionSource(harness, 'isCampaignCommandSurfaceVisible')})`,
    ) as (frame: any) => Promise<boolean>;
    const commandFrame = (visibleTestId: string | null) => ({
        getByTestId: (testid: string) => ({ isVisible: async () => testid === visibleTestId }),
    });
    assert.equal(await commandSurfaceVisible(commandFrame('warroom-toolbar')), true);
    assert.equal(await commandSurfaceVisible(commandFrame('toolbar-route-desk')), true);
    assert.equal(await commandSurfaceVisible(commandFrame(null)), false);

    const saveLoad = extractFunctionSource(harness, 'exerciseFinalSaveLoad');
    assert.match(saveLoad, /completeObservedSaveLoadRoute/);
    assert.match(extractFunctionSource(harness, 'completeObservedSaveLoadRoute'), /waitForCampaignCommandReady\(restoredFrame, faction/);
    assert.doesNotMatch(saveLoad, /getByTestId\('toolbar-route-desk'\)\.waitFor/);
});

test('52-week Electron QA supports bounded major-surface checkpoint tours', () => {
    const harness = readHarness();

    assert.doesNotMatch(harness, /localeCompare/, 'QA evidence ordering must not depend on the host locale');
    assert.match(harness, /function strictAsciiCompare\(/);
    assert.match(harness, /innerText\(\{ timeout: 15000 \}\)/);
    assert.match(harness, /const lightCheckpointTour = args\.has\('--light-checkpoint-tour'\)/);
    assert.match(harness, /const requireRecruitment = args\.has\('--require-recruitment'\)/);
    assert.match(harness, /const contextChurnCycles = Number/);
    assert.match(harness, /const finalCheckpointTour = args\.has\('--final-checkpoint-tour'\)/);
    assert.match(harness, /const requiredMapOrigin =/);
    assert.match(harness, /surfaceUrl: surface\.url\(\)/);
    assert.match(harness, /new URL\(candidate\.url\(\)\)\.origin === requiredMapOrigin/);
    assert.match(harness, /async function lightTurnCheckpointTour\(/);
    assert.match(
        harness,
        /lightCheckpointTour\s*\?\s*lightTurnCheckpointTour\s*:\s*turnCheckpointTour/,
        'required checkpoint weeks must choose the bounded tour without disabling checkpoints',
    );
    assert.match(harness, /light-turn-\$\{turn\}-map/);
    assert.match(harness, /light-turn-\$\{turn\}-decision-room/);
    assert.match(harness, /light-turn-\$\{turn\}-army-hq/);
    assert.match(
        harness,
        /const candidates = \[text, aria, title, testid\]/,
        'anchored route labels must be matched against each button field without synthetic trailing spaces',
    );
    assert.doesNotMatch(harness, /clickTestId\(frame, 'ops-planning-close'/);
    assert.match(harness, /async function clearOpenSurfaces\(/);
    assert.match(harness, /async function openArmyHqFromCurrentSurface\(/);
    assert.match(harness, /fieldRoute\.isVisible/);
    assert.match(harness, /warroomRoute\.isVisible/);
    assert.doesNotMatch(harness, /openWarroomRoute\(frame, 'staff'/);
    assert.match(harness, /warroomToolbar\.isVisible/);
    assert.match(harness, /if \(!await ensureWarroom\(frame/);
    assert.match(harness, /async function readRawStateHash\(/);
    assert.match(harness, /event-decision-response-rail/);
    assert.match(
        harness,
        /await frame\.waitForLoadState\('networkidle', \{ timeout: 120000 \}\)/,
        'cold Vite module graphs must receive the measured two-minute startup allowance',
    );
    assert.match(harness, /intro frame did not reach network idle before dismissal/);
    assert.match(harness, /required-event-decision/);
    assert.match(
        harness,
        /openDeskInboxItem\(\s*frame,\s*'reserve_request',\s*`reserve:\$\{requestId\}`,?\s*\)/,
        'reserve requests without a visible aftermath action must reopen their exact President Desk modal',
    );
    assert.match(harness, /decision-room-lens-\$\{lensId\}/);
    assert.doesNotMatch(harness, /\/Command\\s\+\\d\*\/i/);
    assert.match(harness, /Final-state tour mutated serialized game state/);
    assert.match(harness, /Final-state tour mutated Command Authority/);
    assert.match(harness, /Final-state tour mutated autosave/);
    assert.match(harness, /readabilityDiagnosticsPath/);
    assert.match(harness, /async function waitForTacticalMapReady\(/);
    assert.match(harness, /async function tacticalMapReadinessDiagnostics\(/);
    assert.match(harness, /light-turn-\$\{turn\}-map-not-ready/);
    assert.match(harness, /map-not-ready/);
    assert.match(harness, /data-map-ready/);
    assert.match(harness, /data-map-state-turn/);
    assert.match(harness, /awwvFormationCounterRenderedCount/);
    assert.match(harness, /awwvFormationCounterNeedsUpdate/);
    assert.match(harness, /document\.elementFromPoint/);
    assert.match(harness, /const isEffectivelyVisible = \(node\) =>/);
    assert.match(harness, /&& isEffectivelyVisible\(parent\)/);
    assert.match(
        extractFunctionSource(harness, 'textDiagnostics'),
        /\[role="dialog"\]:not\(\[aria-modal="false"\]\)/,
        'non-modal desk regions must not displace the real active modal diagnostic root',
    );
    assert.match(
        extractFunctionSource(harness, 'textDiagnostics'),
        /current\.getAttribute\('aria-hidden'\) === 'true'/,
        'decorative aria-hidden scene labels must not become readability or occlusion failures behind overlays',
    );
    assert.match(harness, /activeLocatedFormationCount/);
    assert.match(harness, /locatedOwnedFormationCount/);
    assert.match(
        harness,
        /route\.routeId === 'war-map'[\s\S]*waitForTacticalMapReady/,
        'the War Map route must settle on a ready tactical map before evidence is captured',
    );
    assert.match(
        harness,
        /async function mapInteractionProbe[\s\S]*waitForTacticalMapReady/,
        'every map probe must wait for current-turn paint and formation-counter completion',
    );
    assert.match(harness, /async function dismissCommandBriefing/);
    assert.match(harness, /async function drainVisibleEventNotices/);
    assert.match(harness, /clickTestId\(frame, 'command-briefing-dismiss'/);
    assert.match(harness, /async function mapInteractionProbe[\s\S]*drainVisibleEventNotices[\s\S]*dismissCommandBriefing/);
    assert.match(harness, /async function lightTurnCheckpointTour[\s\S]*drainVisibleEventNotices[\s\S]*waitForTacticalMapReady/);
    assert.doesNotMatch(
        harness,
        /await mapInteractionProbe\([^\n]*\)\.catch\(/,
        'map readiness failures must propagate to the run result',
    );
    assert.match(harness, /Dismiss Expansion/);
    assert.match(harness, /Warroom route tour failed/);
    assert.match(harness, /expectedSelector/);
    assert.match(harness, /Warroom route reached the wrong surface/);
    assert.match(harness, /#army-hq-tab-\$\{tab\.id\}/);
    assert.match(harness, /#army-hq-tabpanel-\$\{tab\.id\}/);
    assert.match(harness, /#army-hq-tab-briefing/);
    assert.match(harness, /#army-hq-tabpanel-briefing/);
    assert.match(harness, /Army HQ did not reopen after Recruitment/);
    assert.match(harness, /army-hq-autonomy-return/);
    assert.match(harness, /Personnel tab is intercepted after Recruitment/);
    assert.match(harness, /Records Army HQ did not close through its exact field return/);
    assert.match(harness, /clickTestId\(frame, 'toolbar-route-chronicle'/);
    assert.match(harness, /Army HQ exposed no corps commands/);
    assert.match(harness, /clickTestId\(frame, 'army-hq-decision-room-open'/);
    assert.match(harness, /getAttribute\('data-handoff-route'\)/);
    assert.match(harness, /handoffRoute === 'decision_room'/);
    assert.match(harness, /handoffRoute === 'desk'/);
    assert.match(harness, /president-desk-shell/);
    assert.doesNotMatch(harness, /decisionRoomDeepDive\(page, frame, faction, events, 'decision-room-from-army-hq'\)\.catch/);
    assert.match(harness, /drillTestId/);
    assert.match(harness, /drillExpectedSelector/);
    assert.doesNotMatch(harness, /\/Open \|Drill\|Review\|Call Army HQ\|Open Codex\|Open Chronicle\|Advance Clearance\/i/);
    assert.match(harness, /Formation counter opened the wrong detail/);
    assert.match(harness, /Formation counter did not open detail/);
    assert.match(harness, /locator\(`\[data-awwv-formation-counter-id=/);
    assert.doesNotMatch(harness, /counter-miss-/);
    assert.doesNotMatch(harness, /verifiedCounterIds\.size < 3/);
    assert.doesNotMatch(
        extractFunctionSource(harness, 'mapInteractionProbe'),
        /overlapsAnotherCounter/,
        'center-hit-tested counters must not be rejected merely because their rectangles partially overlap',
    );
    assert.match(harness, /formationSample: counters\.filter/);
    assert.doesNotMatch(
        extractFunctionSource(harness, 'mapInteractionProbe'),
        /verifiedCounterIds\.size !== requiredCounterVerifications/,
        'viewport churn must not turn the first counter sample into a fixed exact-cardinality quota',
    );
    assert.match(harness, /assessCounterVerificationCoverage/);
    assert.match(
        extractFunctionSource(harness, 'mapInteractionProbe'),
        /const currentFormationSample = currentCounters\?\.formationSample \?\? \[\]/,
        'enemy-marker sample churn must not displace formation identities during exact counter exploration',
    );
    assert.match(
        extractFunctionSource(harness, 'mapInteractionProbe'),
        /const map[\s\S]*map\.press\('Home'[\s\S]*const counters = await counterInfo/,
        'the exact counter exploration must begin from the canonical campaign view',
    );
    assert.match(harness, /data-formation-id/);
    assert.match(harness, /const currentCounters = await counterInfo\(frame\)/);
    assert.match(harness, /formation-detail-close/);
    assert.match(harness, /async function exerciseFormationStackPicker\(/);
    assert.match(harness, /async function readMapChromeGeometry\(/);
    assert.match(harness, /data-testid="oob-sidebar-scroll-region"/);
    assert.match(harness, /data-testid="branch-tag-badge-row"/);
    assert.match(harness, /visibleRatio/);
    assert.match(harness, /overflowX !== 'hidden'/);
    assert.match(harness, /Branch-path chip was visually clipped/);
    assert.match(harness, /mapChromeGeometry: assertMapChromeGeometry/);
    assert.match(harness, /data-awwv-formation-stack-osid/);
    assert.match(harness, /data-stack-picker-panel/);
    assert.match(harness, /data-stack-selection-id/);
    assert.match(harness, /stackFormationDetailVisibilityDiagnostics/);
    assert.match(harness, /formation detail remained hidden/);
    assert.match(harness, /hiddenAncestors/);
    assert.match(harness, /stackFormationDetailTrace/);
    assert.match(harness, /animationPlayState/);
    assert.match(harness, /embeddingFrame/);
    assert.match(harness, /performanceTimeOrigin/);
    assert.match(harness, /Stack badge identity became unstable/);
    assert.match(harness, /await dismissCommandBriefing\(frame\)/);
    assert.match(harness, /elementFromPoint/);
    assert.match(harness, /stackPickerClickDiagnostics/);
    assert.match(harness, /expandedStackOsid/);
    assert.doesNotMatch(
        extractFunctionSource(harness, 'exerciseFormationStackPicker'),
        /import\([^)]*gameStore/,
        'stack proof must observe the rendered player surface rather than instantiate a second HMR store module',
    );
    assert.match(harness, /getComputedStyle\(panel\)/);
    assert.match(harness, /rect\.width > 0/);
    assert.match(harness, /memberHitTest/);
    assert.match(harness, /page\.mouse\.click/);
    assert.match(harness, /frameElementRect/);
    assert.match(harness, /async function pollFrameEvaluation\(/);
    assert.match(extractFunctionSource(harness, 'exerciseFormationStackPicker'), /pollFrameEvaluation/);
    assert.doesNotMatch(
        extractFunctionSource(harness, 'exerciseFormationStackPicker'),
        /waitForFunction/,
        'embedded stack waits must sample the same frame DOM world used by screenshots and diagnostics',
    );
    assert.doesNotMatch(
        extractFunctionSource(harness, 'exerciseFormationStackPicker'),
        /picker\.waitFor\(\{ state: 'visible'/,
        'transformed stack panels use explicit computed-style and geometry visibility proof',
    );
    assert.match(
        extractFunctionSource(harness, 'exerciseFormationStackPicker'),
        /waitForTacticalMapReady[\s\S]*data-awwv-dom-formation-counters="true"[\s\S]*:visible/,
        'the stack proof must revalidate map readiness and target one current visible badge under the live counter root',
    );
    assert.match(harness, /Stack picker selected the wrong formation/);
    assert.match(harness, /\$\{labelPrefix\}-exact-member/);
    assert.match(harness, /requireStackPickerProof/);
    assert.doesNotMatch(harness, /exerciseFormationStackPicker\([^\n]+\.catch/);
    assert.match(harness, /async function exerciseCommandAuthorityLevers\(/);
    assert.match(harness, /async function selectDecisionRoomCard\(/);
    assert.match(harness, /async function openPendingEventDecisionFromDesk\(/);
    assert.match(harness, /decision-room-priority-card-/);
    assert.match(harness, /desk-card-event_decision/);
    assert.match(harness, /data-inbox-item-id/);
    assert.match(harness, /strategic-pending-event-before-response/);
    assert.match(harness, /openPendingEventDecisionFromDesk\(frame, pendingEventId\)/);
    assert.match(
        harness,
        /mountedResponse[\s\S]*event-decision-response[\s\S]*openPendingEventDecisionFromDesk/,
        'leadership actions must answer an auto-mounted decision before falling back to the Desk route',
    );
    assert.doesNotMatch(
        extractFunctionSource(harness, 'exerciseCommandAuthorityLevers'),
        /if \(issued\) \{\s*await closeOpenSurface/,
        'a required event modal must not be dismissed as though it were its parent Decision Room',
    );
    assert.match(harness, /Visit the front/);
    assert.match(harness, /Address the nation/);
    assert.match(harness, /Decorate a unit/);
    assert.match(harness, /Strategic configuration failed/);
    assert.match(harness, /Command Authority lever exercise failed/);
    assert.match(harness, /resume-save-preserves-prior-command-authority/);
    assert.match(
        harness,
        /strategicCommandAuthority = resumeSavePath[\s\S]*exerciseCommandAuthorityLevers/,
        'resume checkpoints must not replay fresh-campaign Command Authority levers through persisted cooldowns',
    );
    assert.match(harness, /Strategic recruitment did not complete/);
    assert.match(harness, /recruitment-apply/);
    assert.match(harness, /clickTestId\(frame, 'recruitment-close'/);
    assert.match(harness, /Recruitment modal remained open after exact close/);
    assert.match(harness, /!recruitmentAttemptTurns\.has\(before\?\.turn\)/);
    assert.match(harness, /Runtime diagnostics detected/);
    assert.match(harness, /if \(location\.url\.startsWith\('devtools:\/\/'\)\) return;/);
    assert.match(harness, /async function exerciseContextChurn\(/);
    assert.match(harness, /Context churn route failed/);
    assert.match(harness, /const finalTourProof = finalCheckpointTour/);
    assert.match(harness, /async function fullFinalStateTour\(/);
    assert.match(harness, /const finalTourProof = await surfaceTour\(page, frame, faction, events/);
    assert.match(harness, /if \(options\.allowAdvanceProbe === true\)/);
    assert.match(harness, /Final blockers remain/);
    assert.match(harness, /unlocatedActiveCombatFormations/);
    assert.match(harness, /unlocatedActiveCombatFormationsAllFactions/);
    assert.match(harness, /Unlocated active combat formations remain/);
    assert.match(harness, /Readability diagnostics detected/);
    assert.match(harness, /viewportOverflowXPixels/);
    assert.match(harness, /undersizedInteractive/);
    assert.match(harness, /largestLabelFontSize/);
    assert.match(harness, /largestLabelFontSize < 12/);
    assert.doesNotMatch(
        harness,
        /clickResults\.push\(\{ formationId: counter\.formationId, clicked: true \}\);/,
        'formation probes must not record success unconditionally after a failed click',
    );
    assert.match(harness, /consoleMessages: consoleMessages\.length/);
    assert.match(harness, /pageErrors: pageErrors\.length/);
    assert.match(harness, /networkFailures: networkFailures\.length/);
    assert.doesNotMatch(harness, /expectedStartupAborts\.length < 2/);
    assert.match(harness, /isExpectedStartupEmbeddedDocumentAbort/);
    assert.match(harness, /eventCount !== 0/);
    assert.match(harness, /resourceType !== 'document'/);
    assert.match(harness, /parsed\.pathname === '\/index\.html'/);
    assert.match(harness, /expectedStartupAborts/);
    assert.match(harness, /path\.join\(userDataRoot, safeName\(`\$\{runSlug\}-\$\{faction\}`\)\)/);
    assert.match(harness, /eventCount: events\.length/);
    assert.match(harness, /function replaceFileSync\(/);
    assert.match(harness, /Atomics\.wait\(/);
    assert.match(harness, /for \(let attempt = 0; attempt < 20; attempt \+= 1\)/);
    assert.doesNotMatch(harness, /fs\.copyFileSync\(tmpPath, filePath\)/);
    assert.match(
        harness,
        /error\?\.code !== 'EPERM' && error\?\.code !== 'EACCES'/,
        'Windows destination-file contention must use the bounded overwrite fallback',
    );
    assert.match(harness, /harnessSha256/);
    assert.match(harness, /harnessSnapshotPath/);
    assert.match(harness, /gitHead/);
    assert.match(harness, /workingTreeStatusSha256/);
    assert.match(harness, /resumeSaveSha256/);
    assert.match(harness, /packagedExecutablePath/);
    assert.match(harness, /executablePath: packagedExecutablePath/);
    assert.match(harness, /packagedExecutableSha256/);
    assert.match(
        harness,
        /canonicalAutosavePath = packagedExecutablePath[\s\S]{0,180}path\.join\(userDataDir, 'saves', 'autosave\.json'\)/,
        'packaged Electron receipt and hash evidence must read its isolated userData autosave',
    );
    assert.match(harness, /const screenshotBuffer = await page\.screenshot/);
    assert.match(harness, /update\(screenshotBuffer\)/);
    assert.doesNotMatch(harness, /page\.screenshot\(\{ path: screenshot, fullPage: false \}\)\.catch/);
    assert.match(harness, /async function captureScreenshotBuffer\(/);
    assert.match(harness, /timeout: 90000/);
    assert.match(harness, /for \(let attempt = 1; attempt <= 2; attempt \+= 1\)/);
    assert.match(harness, /Warroom route produced no visual change/);
    assert.match(harness, /data-command-category-id/);
    assert.match(harness, /No items in this command category\./);
    assert.match(harness, /decision-room-lens-all/);
    assert.match(harness, /Empty command category retained an unrelated dossier/);
    assert.match(harness, /Empty command category left the All lens pressed/);
    assert.match(harness, /Empty command category retained a dossier container/);
    assert.match(harness, /Final-state tour did not prove an empty cat_conscience command category/);
    assert.match(harness, /requireEmptyCommandCategoryProof/);
    assert.match(harness, /proofLabelPrefix: `final-turn-\$\{turn\}`/);
    assert.match(harness, /finalTourProof/);
    assert.match(harness, /Decision Room exposed no lenses/);
    assert.match(harness, /async function exerciseHistoricalOperationMapHandoff\(/);
    assert.match(
        harness,
        /exerciseHistoricalOperationMapHandoff\([\s\S]*withinMapNavigationAbortWindow\([\s\S]*exerciseHistoricalOperationMapHandoffWithinNavigationWindow/s,
        'the abort window must span the complete map-focus and same-dossier return transaction',
    );
    assert.match(harness, /decision-room-dossier-show-on-map/);
    assert.match(harness, /data-field-operation-all-objectives-in-viewport/);
    assert.match(harness, /data-field-operation-all-focus-in-viewport/);
    assert.match(harness, /Historical operation viewport proof timed out/);
    assert.match(harness, /data-field-operation-offscreen-objective-osids/);
    assert.match(harness, /data-field-operation-offscreen-focus-osids/);
    assert.match(harness, /Historical operation exact objective\/staging viewport proof failed/);
    assert.match(harness, /data-field-operation-focus-status/);
    assert.match(harness, /data-field-operation-focus-key/);
    assert.match(harness, /data-field-operation-focus-target/);
    assert.match(harness, /data-field-operation-bounds-suspended/);
    assert.match(harness, /focusKey !== expectedFocusKey/);
    assert.match(harness, /focusApplyCount !== focusRequestCount/);
    assert.match(harness, /retainedMainMapOwners !== 1 \|\| ownerIdentity\.retainedDeckOwners !== 1/);
    assert.match(harness, /field-operation-return-to-dossier/);
    assert.match(harness, /same dossier after map return/);
    assert.match(harness, /boundsRestored/);
    assert.doesNotMatch(harness, /commandSurfaceDeepDive\([^\n]+\.catch/);
    assert.doesNotMatch(harness, /armyHqDeepDive\([^\n]+\.catch/);
    assert.doesNotMatch(harness, /decisionRoomDeepDive\([^\n]+\.catch/);
    assert.doesNotMatch(harness, /failure\?\.errorText === 'net::ERR_ABORTED'\) return/);
});

test('map readiness rejects hidden or intercepted mounted telemetry and requires the exact route', async () => {
    const harness = readHarness();
    const map = {
        getAttribute: (name: string) => ({
            'data-map-ready': 'true',
            'data-map-state-turn': '12',
            'aria-hidden': 'true',
        })[name] ?? null,
        getBoundingClientRect: () => ({ left: 0, top: 0, right: 1000, bottom: 700, width: 1000, height: 700 }),
        contains: () => false,
    };
    const overlay = {
        dataset: {
            awwvFormationCounterSourceGate: 'ready',
            awwvFormationCounterNeedsUpdate: 'false',
            awwvFormationCounterSourceCount: '10',
            awwvFormationCounterRenderedCount: '10',
        },
    };
    const document = {
        documentElement: { clientWidth: 1000, clientHeight: 700 },
        querySelector: (selector: string) => selector === '[data-testid="tactical-map"]' ? map : overlay,
        elementFromPoint: () => ({ id: 'intercepting-hidden-shell' }),
    };
    const waitForTacticalMapReady = loadFunction<(
        frame: { waitForFunction: (predicate: (input: unknown) => boolean, input: unknown) => Promise<void> },
        turn: number,
        requireCounters: boolean,
    ) => Promise<boolean>>(harness, 'waitForTacticalMapReady', {
        document,
        window: { getComputedStyle: () => ({ display: 'none', visibility: 'hidden', opacity: '0' }) },
    });
    const frame = {
        waitForFunction: async (predicate: (input: unknown) => boolean, input: unknown) => {
            if (!predicate(input)) throw new Error('not ready');
        },
    };

    assert.equal(await waitForTacticalMapReady(frame, 12, true), false);
    assert.match(harness, /async function openExactWarMapRoute/);
    assert.match(harness, /if \(!openedWarMap\) throw new Error\(`Required War Map route failed/);
    assert.doesNotMatch(harness, /async function mapInteractionProbe[\s\S]*?war map[^\n]*\.catch/);
});

test('required decision and route failures are not converted into optional false results', () => {
    const harness = readHarness();
    const handleCurrentSurface = extractFunctionSource(harness, 'handleCurrentSurface');
    const clearOpenSurfaces = extractFunctionSource(harness, 'clearOpenSurfaces');
    const openCommandSurface = extractFunctionSource(harness, 'openCommandSurfaceFromWarroom');
    const commandSurfaceDeepDive = extractFunctionSource(harness, 'commandSurfaceDeepDive');
    const advanceModalProbe = extractFunctionSource(harness, 'advanceModalProbe');
    const surfaceTour = extractFunctionSource(harness, 'surfaceTour');

    assert.doesNotMatch(clearOpenSurfaces, /closeOpenSurface\(frame\)\.catch/);
    assert.doesNotMatch(openCommandSurface, /closeOpenSurface\(frame\)\.catch/);
    assert.doesNotMatch(commandSurfaceDeepDive, /evaluateAll[\s\S]*?\.catch/);
    assert.match(commandSurfaceDeepDive, /Command surface exposed no category cards/);
    assert.doesNotMatch(surfaceTour, /advanceModalProbe[\s\S]*?\.catch/);
    assert.doesNotMatch(surfaceTour, /desk return[^\n]*\.catch/);
    assert.doesNotMatch(surfaceTour, /const reviewClicked = await clickMatch/);
    assert.match(advanceModalProbe, /if \(!clicked\) throw new Error/);
    assert.match(advanceModalProbe, /if \(!reviewClicked\.clicked \|\| !reviewClicked\.changed\) throw new Error/);
    assert.match(surfaceTour, /if \(!openedWarDirection\) throw new Error/);
    assert.match(surfaceTour, /if \(!returnedToWarroom\) throw new Error/);
    assert.match(harness, /if \(error\?\.message === 'required-event-decision'\) throw error/);
    assert.match(handleCurrentSurface, /event-decision-response-rail[\s\S]*waitFor\(\{ state: 'visible'/);
    assert.match(handleCurrentSurface, /if \(responsePresented === 0\)[\s\S]*openPendingEventDecisionFromDesk/);
    assert.match(handleCurrentSurface, /catch \(error\)[\s\S]*required-event-decision[\s\S]*responseControl\.waitFor/);
});

test('directional map probes record empty terrain but require at least one visible settlement selection', () => {
    const mapProbe = extractFunctionSource(readHarness(), 'mapInteractionProbe');

    assert.doesNotMatch(mapProbe, /map\.click\([^;]*force:\s*true/);
    assert.match(mapProbe, /await map\.click\([^;]+;/);
    assert.doesNotMatch(mapProbe, /map\.click\([^\n]*\)\.catch/);
    assert.match(mapProbe, /selection-panel/);
    assert.match(mapProbe, /formation-detail-panel/);
    assert.match(mapProbe, /corps-front-panel/);
    assert.match(mapProbe, /corps-detail-panel/);
    assert.match(mapProbe, /selected:\s*'formation'/);
    assert.match(mapProbe, /selected:\s*'sector'/);
    assert.match(mapProbe, /selected:\s*'corps'/);
    assert.match(mapProbe, /selected:\s*false/);
    assert.match(mapProbe, /successfulDirectionalSelections === 0/);
    assert.match(mapProbe, /Directional map probe selected no settlements/);
    assert.doesNotMatch(mapProbe, /Directional map probe did not select a settlement/);
});

test('diagnostics attach before game-page waiting and abort allowlisting is named and narrow', () => {
    const harness = readHarness();
    const listenerIndex = harness.indexOf("app.on('window'");
    const waitIndex = harness.indexOf('const page = await waitForGamePage(app)');
    assert.ok(listenerIndex >= 0 && listenerIndex < waitIndex, 'window diagnostics must be registered before waiting for the game page');
    assert.match(harness, /startup-embedded-warroom-document/);
    assert.match(harness, /teardown-game-document/);
    assert.match(harness, /map-hillshade-navigation/);
    assert.match(harness, /map-osm-navigation/);
    assert.match(harness, /MAP_NAVIGATION_ABORT_WINDOW_MS = 45_000/);
    assert.match(harness, /withinMapNavigationAbortWindow/);
    assert.match(harness, /mapNavigationWindow: navigationAttribution/);
    assert.match(harness, /expectedNavigationAborts/);
    assert.match(harness, /expectedAmbientLifecycleAborts/);
    assert.doesNotMatch(harness, /expectedStartupAborts\.length < 2/);

    const classifyExpectedRequestAbort = loadFunction<(record: Record<string, unknown>) => string | null>(
        harness,
        'classifyExpectedRequestAbort',
        { URL },
    );
    const activePackagedMapNavigation = {
        active: true,
        token: 'map-navigation:7:historical-operation',
        runtime: 'packaged-local',
        expectedOrigin: 'http://127.0.0.1:3002',
        openedAtMs: 1_000,
        expiresAtMs: 46_000,
    };
    assert.equal(classifyExpectedRequestAbort({
        failure: { errorText: 'net::ERR_ABORTED' },
        method: 'GET',
        url: 'http://127.0.0.1:3002/index.html?embedded=1&view=warroom',
        resourceType: 'document',
        isMainFrame: false,
        eventCount: 0,
        teardownStarted: false,
    }), 'startup-embedded-warroom-document');
    assert.equal(classifyExpectedRequestAbort({
        failure: { errorText: 'net::ERR_ABORTED' },
        method: 'GET',
        url: 'http://127.0.0.1:3002/assets/main.js',
        resourceType: 'script',
        isMainFrame: false,
        eventCount: 0,
        teardownStarted: false,
    }), null);
    assert.equal(classifyExpectedRequestAbort({
        failure: { errorText: 'net::ERR_ABORTED' },
        method: 'GET',
        url: 'http://127.0.0.1:3002/data/derived/tiles/hillshade.pmtiles',
        resourceType: 'fetch',
        isMainFrame: false,
        eventCount: 22,
        teardownStarted: false,
        observedAtMs: 60_000,
        requestInitiatedAtMs: 2_000,
        mapNavigationWindow: activePackagedMapNavigation,
    }), 'map-hillshade-navigation');
    assert.equal(classifyExpectedRequestAbort({
        failure: { errorText: 'net::ERR_ABORTED' },
        method: 'GET',
        url: 'http://127.0.0.1:3002/data/derived/tiles/osm.pmtiles',
        resourceType: 'fetch',
        isMainFrame: false,
        eventCount: 22,
        teardownStarted: false,
        observedAtMs: 2_000,
        requestInitiatedAtMs: 2_000,
        mapNavigationWindow: activePackagedMapNavigation,
    }), 'map-osm-navigation');
    assert.equal(classifyExpectedRequestAbort({
        failure: { errorText: 'net::ERR_ABORTED' },
        method: 'GET',
        url: 'https://example.invalid/data/derived/tiles/osm.pmtiles',
        resourceType: 'fetch',
        isMainFrame: false,
        eventCount: 22,
        teardownStarted: false,
        observedAtMs: 2_000,
        mapNavigationWindow: activePackagedMapNavigation,
    }), null, 'a remote origin must not inherit the packaged map abort allowance');
    assert.equal(classifyExpectedRequestAbort({
        failure: { errorText: 'net::ERR_ABORTED' },
        method: 'GET',
        url: 'http://127.0.0.1:3002/data/derived/tiles/osm.pmtiles',
        resourceType: 'fetch',
        isMainFrame: false,
        eventCount: 22,
        teardownStarted: false,
        observedAtMs: 2_000,
        mapNavigationWindow: null,
    }), null, 'an exact local tile abort outside the bounded navigation window must fail');
    const ambientFieldUrl = 'http://127.0.0.1:3002/assets/ambient_field-D4f9a2.ogg';
    assert.equal(classifyExpectedRequestAbort({
        failure: { errorText: 'net::ERR_ABORTED' },
        method: 'GET',
        url: ambientFieldUrl,
        resourceType: 'media',
        isMainFrame: false,
        eventCount: 22,
        teardownStarted: false,
        ambientLifecycleStop: { url: ambientFieldUrl, observedAtMs: 1_900 },
        observedAtMs: 2_000,
    }), null, 'a pause alone must never clear an ambient request failure');
    assert.equal(classifyExpectedRequestAbort({
        failure: { errorText: 'net::ERR_ABORTED' },
        method: 'GET',
        url: 'http://127.0.0.1:3002/assets/ui_click-D4f9a2.ogg',
        resourceType: 'media',
        isMainFrame: false,
        eventCount: 22,
        teardownStarted: false,
    }), null, 'non-ambient media must remain a failure');
    assert.equal(classifyExpectedRequestAbort({
        failure: { errorText: 'net::ERR_ABORTED' },
        method: 'GET',
        url: 'https://example.invalid/assets/ambient_field-D4f9a2.ogg',
        resourceType: 'media',
        isMainFrame: false,
        eventCount: 22,
        teardownStarted: false,
    }), null, 'remote ambient media must remain a failure');
    assert.equal(classifyExpectedRequestAbort({
        failure: { errorText: 'net::ERR_ABORTED' },
        method: 'GET',
        url: 'http://127.0.0.1:3002/data/derived/tiles/osm.pmtiles',
        resourceType: 'fetch',
        isMainFrame: false,
        eventCount: 22,
        teardownStarted: false,
        observedAtMs: 46_001,
        requestInitiatedAtMs: 46_001,
        mapNavigationWindow: activePackagedMapNavigation,
    }), null, 'an exact local tile abort after the bounded navigation deadline must fail');
    assert.equal(classifyExpectedRequestAbort({
        failure: { errorText: 'net::ERR_ABORTED' },
        method: 'GET',
        url: 'http://127.0.0.1:3002/data/derived/tiles/terrain.pmtiles',
        resourceType: 'fetch',
        isMainFrame: false,
        eventCount: 22,
        teardownStarted: false,
        observedAtMs: 2_000,
        requestInitiatedAtMs: 2_000,
        mapNavigationWindow: activePackagedMapNavigation,
    }), null);
});

test('delayed map aborts use request-initiation attribution and the action window still closes immediately', () => {
    const harness = readHarness();
    const endSource = extractFunctionSource(harness, 'endMapNavigationAbortWindow');
    assert.match(endSource, /activeMapNavigationAbortWindow\s*=\s*null/);
    assert.match(harness, /page\.on\('request'/);
    assert.match(harness, /requestNavigationWindows\.set\(request/);
    assert.match(harness, /requestInitiatedAtMs/);
});

test('sector warnings remain fatal when final serialized state cannot prove same-turn resolution', () => {
    const harness = readHarness();
    assert.doesNotMatch(harness, /classifyResolvedSectorLifecycleWarning/);
    assert.doesNotMatch(harness, /expectedResolvedSectorLifecycleWarnings/);
    assert.match(harness, /unexpectedMainProcessStderr = mainProcessStderr\.filter\(\(line\) => !isExpectedInspectorTeardownLine\(line\)\)/);
});

test('ambient abort attribution requires one exact element/source epoch and consumes it once', () => {
    const harness = readHarness();
    const classifySource = extractFunctionSource(harness, 'classifyExpectedAmbientLifecycleAbort');
    const attributeSource = extractFunctionSource(harness, 'attributeAmbientLifecycleAborts');
    const attribute = runInNewContext(
        `(() => { const classifyExpectedAmbientLifecycleAbort = ${classifySource}; return (${attributeSource}); })()`,
        { URL },
    ) as (failures: Array<Record<string, unknown>>, stops: Array<Record<string, unknown>>, expected: Array<Record<string, unknown>>) => void;
    const url = 'http://127.0.0.1:3002/assets/ambient_field-D4f9a2.ogg';
    const failure = (observedAtMs: number, requestInitiatedAtMs = 1_000, failureUrl = url) => ({
        failure: { errorText: 'net::ERR_ABORTED' }, method: 'GET', url: failureUrl,
        resourceType: 'media', isMainFrame: false, eventCount: 22,
        teardownStarted: false, observedAtMs, requestInitiatedAtMs,
    });
    const start = (elementId = 'media:1', sourceEpoch = 1, signalUrl = url, observedAtMs = 1_050) => ({
        kind: 'request-start', elementId, sourceEpoch, url: signalUrl, origin: 'http://127.0.0.1:3002', observedAtMs,
    });
    const abort = (elementId = 'media:1', sourceEpoch = 1, signalUrl = url, observedAtMs = 1_950) => ({
        kind: 'browser-abort', elementId, sourceEpoch, url: signalUrl, origin: 'http://127.0.0.1:3002', observedAtMs,
    });
    const failures = [failure(2_000), failure(2_100)];
    const expected: Array<Record<string, unknown>> = [];
    attribute(failures, [start(), abort()], expected);
    assert.equal(expected.length, 1);
    assert.equal(failures.length, 1);
    assert.equal(failures[0]?.observedAtMs, 2_100);

    for (const signals of [
        [start()],
        [start(), abort('media:2')],
        [start(), abort('media:1', 2)],
        [start(), abort('media:1', 1, 'http://127.0.0.1:3002/assets/ambient_warroom-D4f9a2.ogg')],
        [start(), start('media:1', 1, url, 1_100), abort()],
        [start('media:1'), start('media:2'), abort('media:1')],
        [start('media:1', 1, url, 4_001), abort('media:1', 1, url, 4_100)],
        [start(), abort('media:1', 1, url, 4_001)],
    ]) {
        const rejectedFailures = [failure(2_000)];
        const rejectedExpected: Array<Record<string, unknown>> = [];
        attribute(rejectedFailures, signals, rejectedExpected);
        assert.equal(rejectedExpected.length, 0);
        assert.equal(rejectedFailures.length, 1);
    }
    const wrongOrigin = 'http://127.0.0.1:3003/assets/ambient_field-D4f9a2.ogg';
    const wrongOriginFailures = [failure(2_000, 1_000, wrongOrigin)];
    const wrongOriginExpected: Array<Record<string, unknown>> = [];
    attribute(wrongOriginFailures, [start('media:1', 1, wrongOrigin), abort('media:1', 1, wrongOrigin)], wrongOriginExpected);
    assert.equal(wrongOriginExpected.length, 0);
});

test('ambient lifecycle observer records browser media progress with exact element state and ignores other audio', () => {
    const dom = new JSDOM(`
        <audio id="ambient" src="http://127.0.0.1:3002/assets/ambient_field-D4f9a2.ogg"></audio>
        <audio id="ui" src="http://127.0.0.1:3002/assets/ui_click-D4f9a2.ogg"></audio>
    `);
    const { window } = dom;
    const ambient = window.document.querySelector<HTMLAudioElement>('#ambient')!;
    const ui = window.document.querySelector<HTMLAudioElement>('#ui')!;
    Object.defineProperties(ambient, {
        currentSrc: { configurable: true, value: ambient.src },
        networkState: { configurable: true, value: 2 },
        readyState: { configurable: true, value: 3 },
        paused: { configurable: true, value: false },
        ended: { configurable: true, value: false },
        seeking: { configurable: true, value: false },
        currentTime: { configurable: true, value: 12.5 },
        duration: { configurable: true, value: 88 },
        loop: { configurable: true, value: true },
    });
    let now = 1_000;
    const install = loadFunction<() => void>(readHarness(), 'installAmbientLifecycleObserver', {
        window,
        document: window.document,
        HTMLMediaElement: window.HTMLMediaElement,
        Date: { now: () => ++now },
    });

    install();
    install();
    ambient.dispatchEvent(new window.Event('progress'));
    ambient.dispatchEvent(new window.Event('suspend'));
    ambient.dispatchEvent(new window.Event('seeking'));
    ambient.dispatchEvent(new window.Event('seeked'));
    Object.defineProperties(ambient, {
        currentTime: { configurable: true, get: () => { throw new Error('currentTime blocked'); } },
        seeking: { configurable: true, value: undefined },
        error: { configurable: true, value: { code: 3, message: 'decode failed' } },
    });
    ambient.dispatchEvent(new window.Event('error'));
    ui.dispatchEvent(new window.Event('suspend'));

    const signals = (window as any).__AWWV_QA_AMBIENT_LIFECYCLE_SIGNALS__;
    assert.deepEqual(signals.map((signal: any) => signal.kind), ['progress', 'suspend', 'seeking', 'seeked', 'error']);
    assert.deepEqual(signals.map((signal: any) => signal.signalSequence), [1, 2, 3, 4, 5]);
    assert.equal(signals[0].elementId, 'media:1');
    assert.equal(signals[0].sourceEpoch, 1);
    assert.deepEqual(signals[0].mediaState, {
        networkState: 2,
        readyState: 3,
        paused: false,
        ended: false,
        seeking: false,
        currentTime: 12.5,
        duration: 88,
        loop: true,
        mediaError: null,
    });
    assert.deepEqual(signals[0].mediaStateUnavailable, ['mediaError']);
    assert.deepEqual(signals[0].mediaStateReadErrors, {});
    assert.equal(signals[4].mediaState.currentTime, null);
    assert.equal(signals[4].mediaState.seeking, null);
    assert.deepEqual(signals[4].mediaState.mediaError, { code: 3, message: 'decode failed' });
    assert.deepEqual(signals[4].mediaStateUnavailable, ['seeking']);
    assert.match(signals[4].mediaStateReadErrors.currentTime, /currentTime blocked/);
});

test('ambient lifecycle observer follows detached Audio elements created by the production audio bus exactly once', async () => {
    const dom = new (JSDOM as any)('', { url: 'http://127.0.0.1:3002/index.html?embedded=1' });
    const { window } = dom;
    const playReturn = Promise.resolve('played');
    const loadReturn = { loaded: true };
    const pauseError = new Error('pause identity');
    Object.defineProperties(window.HTMLMediaElement.prototype, {
        play: { configurable: true, writable: true, value: () => playReturn },
        pause: { configurable: true, writable: true, value: () => { throw pauseError; } },
        load: { configurable: true, writable: true, value: () => loadReturn },
    });
    let now = 2_000;
    const install = loadFunction<() => void>(readHarness(), 'installAmbientLifecycleObserver', {
        window,
        document: window.document,
        HTMLMediaElement: window.HTMLMediaElement,
        Date: { now: () => ++now },
    });
    install();
    install();

    const fixtureUrl = 'http://127.0.0.1:3002/assets/ambient_field-ProductionPath.ogg';
    const created: HTMLAudioElement[] = [];
    const productConstructorUrls: string[] = [];
    const NativeAudio = window.Audio;
    function CapturingAudio(src?: string) {
        productConstructorUrls.push(src ?? '');
        const element = new NativeAudio(fixtureUrl);
        created.push(element);
        return element;
    }
    CapturingAudio.prototype = NativeAudio.prototype;
    Object.setPrototypeOf(CapturingAudio, NativeAudio);
    vi.stubGlobal('Audio', CapturingAudio);
    const audioBus = await import('../src/ui/map/audio/audio_engine.js');
    audioBus.resetAudioForTests();
    audioBus.setEnabled(true);
    audioBus.unlockAudioForUserGesture();
    await audioBus.playAmbientBed('ambient_field');

    try {
        assert.equal(created.length, 1);
        assert.match(productConstructorUrls[0], /ambient_field.*\.ogg/u);
        const detached = created[0];
        assert.equal(detached.isConnected, false);
        assert.equal(detached.preload, 'auto');
        assert.equal(detached.play(), playReturn, 'the wrapper must preserve the original play return identity');
        assert.throws(
            () => detached.pause(),
            (error: unknown) => error === pauseError,
            'the wrapper must preserve the original pause error identity',
        );
        for (const kind of ['loadstart', 'progress', 'seeking', 'seeked', 'abort', 'error']) {
            detached.dispatchEvent(new window.Event(kind));
        }

        const firstUrl = detached.src;
        const firstSignals = (window as any).__AWWV_QA_AMBIENT_LIFECYCLE_SIGNALS__
            .filter((signal: any) => signal.url === firstUrl);
        assert.deepEqual(
            firstSignals.filter((signal: any) => ['request-start', 'progress', 'seeking', 'seeked', 'browser-abort', 'error'].includes(signal.kind))
                .map((signal: any) => signal.kind),
            ['request-start', 'progress', 'seeking', 'seeked', 'browser-abort', 'error'],
        );
        assert.equal(firstSignals.find((signal: any) => signal.kind === 'seeking').mediaState.loop, true);
        const requestStart = firstSignals.find((signal: any) => signal.kind === 'request-start');
        const browserAbort = firstSignals.find((signal: any) => signal.kind === 'browser-abort');
        assert.equal(requestStart.elementId, browserAbort.elementId);
        assert.equal(requestStart.sourceEpoch, browserAbort.sourceEpoch);

        const classify = loadFunction<(record: Record<string, any>, signals: Array<Record<string, any>>) => any>(
            readHarness(),
            'classifyExpectedAmbientLifecycleAbort',
            { URL },
        );
        const failure = {
            failure: { errorText: 'net::ERR_ABORTED' },
            method: 'GET',
            url: firstUrl,
            resourceType: 'media',
            isMainFrame: false,
            requestInitiatedAtMs: requestStart.observedAtMs,
            observedAtMs: browserAbort.observedAtMs,
        };
        assert.ok(classify(failure, firstSignals.filter((signal: any) => signal.kind !== 'error')));
        assert.equal(classify(failure, [requestStart]), null);
        assert.equal(classify(failure, [requestStart, { ...browserAbort, sourceEpoch: browserAbort.sourceEpoch + 1 }]), null);

        const connected = new NativeAudio(firstUrl);
        window.document.body.append(connected);
        connected.play();
        connected.dispatchEvent(new window.Event('loadstart', { bubbles: false }));
        const connectedSeeking = new window.Event('seeking');
        connected.dispatchEvent(connectedSeeking);
        const connectedStarts = (window as any).__AWWV_QA_AMBIENT_LIFECYCLE_SIGNALS__
            .filter((signal: any) => signal.kind === 'request-start' && signal.elementId !== requestStart.elementId);
        assert.equal(connectedStarts.length, 1, 'document and element listeners must deduplicate the same connected event');
        const connectedSeekingSignals = (window as any).__AWWV_QA_AMBIENT_LIFECYCLE_SIGNALS__
            .filter((signal: any) => signal.kind === 'seeking' && signal.elementId !== requestStart.elementId);
        assert.equal(connectedSeekingSignals.length, 1, 'connected seeking must be observed once');

        const nextUrl = 'http://127.0.0.1:3002/assets/ambient_warroom-NextEpoch.ogg';
        detached.src = nextUrl;
        assert.equal(detached.load(), loadReturn, 'the wrapper must preserve the original load return identity');
        detached.dispatchEvent(new window.Event('loadstart'));
        detached.dispatchEvent(new window.Event('abort'));
        const nextSignals = (window as any).__AWWV_QA_AMBIENT_LIFECYCLE_SIGNALS__
            .filter((signal: any) => signal.url === nextUrl);
        assert.equal(nextSignals.find((signal: any) => signal.kind === 'load').sourceEpoch, requestStart.sourceEpoch + 1);
        assert.deepEqual(
            nextSignals.filter((signal: any) => ['request-start', 'browser-abort'].includes(signal.kind))
                .map((signal: any) => signal.sourceEpoch),
            [requestStart.sourceEpoch + 1, requestStart.sourceEpoch + 1],
        );
    } finally {
        audioBus.resetAudioForTests();
        vi.unstubAllGlobals();
    }
});

test('request failure diagnostics retain only Range metadata with explicit absent and read-error states', () => {
    const attach = loadFunction<(page: any, diagnostics: any) => void>(readHarness(), 'attachPageDiagnostics', {
        Date: { now: () => 5_000 },
        URL,
        classifyExpectedRequestAbort: () => null,
    });
    const handlers = new Map<string, (value: any) => void>();
    const mainFrame = {};
    const page = {
        on: (kind: string, handler: (value: any) => void) => handlers.set(kind, handler),
        mainFrame: () => mainFrame,
    };
    const diagnostics = {
        attachedPages: new Set(),
        consoleMessages: [],
        pageErrors: [],
        events: [],
        requestStartTimes: new WeakMap(),
        requestNavigationWindows: new WeakMap(),
        getMapNavigationAbortWindow: () => null,
        isTeardownStarted: () => false,
        expectedStartupAborts: [],
        expectedTeardownAborts: [],
        expectedNavigationAborts: [],
        expectedAmbientLifecycleAborts: [],
        networkFailures: [] as any[],
    };
    attach(page, diagnostics);
    const request = (headers: () => Record<string, string>) => ({
        failure: () => ({ errorText: 'net::ERR_ABORTED' }),
        headers,
        frame: () => ({}),
        method: () => 'GET',
        url: () => 'http://127.0.0.1:3002/assets/ambient_field-D4f9a2.ogg',
        resourceType: () => 'media',
    });
    const present = request(() => ({ Range: 'bytes=0-', authorization: 'secret-must-not-be-retained' }));
    handlers.get('request')!(present);
    handlers.get('requestfailed')!(present);
    const absent = request(() => ({ accept: '*/*' }));
    handlers.get('request')!(absent);
    handlers.get('requestfailed')!(absent);
    const failed = request(() => { throw new Error('header read blocked'); });
    handlers.get('request')!(failed);
    handlers.get('requestfailed')!(failed);

    assert.deepEqual(diagnostics.networkFailures.map((record) => record.requestRange), [
        { status: 'present', value: 'bytes=0-' },
        { status: 'absent', value: null },
        { status: 'read-error', value: null, error: 'header read blocked' },
    ]);
    assert.equal(JSON.stringify(diagnostics.networkFailures).includes('secret-must-not-be-retained'), false);
    assert.equal(diagnostics.networkFailures.every((record) => record.failure.errorText === 'net::ERR_ABORTED'), true);
});

test('CDP collection lifecycle writes the settled sidecar before returning an incomplete fatal result', async () => {
    const createLifecycle = loadFunction<(options: any) => any>(
        readHarness(),
        'createCdpNetworkCollectionLifecycle',
        { Error, Promise },
    );
    const order: string[] = [];
    let resolveClose: (value: any) => void = () => {};
    const collector = {
        awaitReady: async () => { order.push('ready'); },
        closeAndFlush: () => new Promise((resolve) => {
            order.push('close-start');
            resolveClose = resolve;
        }),
    };
    const lifecycle = createLifecycle({
        enabled: true,
        startCollector: () => collector,
        collectorOptions: {},
        sidecarPath: 'evidence/cdp-network-collection-v3.json',
        writeSidecar: (_path: string, artifact: any) => order.push(`write:${artifact.status}`),
        digestSidecar: () => 'a'.repeat(64),
    });
    await lifecycle.awaitReady();
    const pending = lifecycle.finalize().then((value: any) => {
        order.push('finalize-return');
        return value;
    });
    await Promise.resolve();
    assert.deepEqual(order, ['ready', 'close-start']);
    resolveClose({
        schema: 'awwv.r8-warroom.cdp-network-collection.v3',
        status: 'flush-timeout',
        summary: { pending_at_flush: 1 },
    });
    const result = await pending;
    assert.deepEqual(order, ['ready', 'close-start', 'write:flush-timeout', 'finalize-return']);
    assert.equal(result.receipt.status, 'flush-timeout');
    assert.match(result.error, /incomplete.*flush-timeout/i);
    assert.deepEqual(await lifecycle.finalize(), result, 'finalization must be idempotent');
});

test('disabled CDP collection lifecycle is inert and the harness wiring is opt-in', async () => {
    const harness = readHarness();
    const createLifecycle = loadFunction<(options: any) => any>(
        harness,
        'createCdpNetworkCollectionLifecycle',
        { Error, Promise },
    );
    let starts = 0;
    const lifecycle = createLifecycle({
        enabled: false,
        startCollector: () => { starts += 1; throw new Error('must not start'); },
        collectorOptions: {},
        sidecarPath: 'unused.json',
        writeSidecar: () => { throw new Error('must not write'); },
        digestSidecar: () => { throw new Error('must not digest'); },
    });
    await lifecycle.awaitReady();
    assert.deepEqual(await lifecycle.finalize(), { receipt: null, error: null });
    assert.equal(starts, 0);
    assert.match(harness, /args\.has\('--cdp-network-collection-v3'\)/);
    assert.match(harness, /newCDPSession\(page\)/);
    assert.match(harness, /await cdpCollectionLifecycle\.finalize\(\)/);
});

test.each(['write', 'digest'])('CDP collection lifecycle makes a %s sidecar failure independently fatal', async (failurePoint) => {
    const createLifecycle = loadFunction<(options: any) => any>(
        readHarness(),
        'createCdpNetworkCollectionLifecycle',
        { Error, Promise },
    );
    const lifecycle = createLifecycle({
        enabled: true,
        startCollector: () => ({
            awaitReady: async () => {},
            closeAndFlush: async () => ({ schema: 'v3', status: 'complete', summary: {} }),
        }),
        collectorOptions: {},
        sidecarPath: 'evidence/cdp-network-collection-v3.json',
        writeSidecar: () => { if (failurePoint === 'write') throw new Error('write-secret'); },
        digestSidecar: () => {
            if (failurePoint === 'digest') throw new Error('digest-secret');
            return 'a'.repeat(64);
        },
    });
    await lifecycle.awaitReady();
    const result = await lifecycle.finalize();
    assert.equal(result.receipt, null);
    assert.match(result.error, /sidecar failed/i);
    assert.equal(result.error.includes(`${failurePoint}-secret`), false);
});

test('failure wiring preserves the original harness error and an independently fatal collector result', () => {
    const harness = readHarness();
    assert.match(harness, /cdpNetworkCollection = cdpNetworkCollection \?\? cdpFinalization\.receipt/);
    assert.match(harness, /cdpNetworkCollectionError = cdpNetworkCollectionError \?\? cdpFinalization\.error/);
    assert.match(harness, /error: String\(error\?\.stack \?\? error\)/);
    assert.match(harness, /\{ cdpNetworkCollection, cdpNetworkCollectionError \}/);
    assert.match(harness, /throw error;/);
});

test('main-process evidence preserves ordered output beyond the bounded progress tail and rejects collisions', () => {
    const captureFactory = loadFunction<(path: string, now: () => number) => {
        handler: (stream: string, target: string[]) => (chunk: string) => void;
        flush: () => void;
    }>(
            readHarness(), 'createMainProcessOutputCapture', { fs: nodeFs, Date, JSON, String },
        );
    const root = mkdtempSync(join(tmpdir(), 'awwv-main-output-'));
    try {
        const evidencePath = join(root, 'ordered.jsonl');
        let clock = 10_000;
        const capture = captureFactory(evidencePath, () => ++clock);
        const stdout: string[] = [];
        const stderr: string[] = [];
        const onStdout = capture.handler('stdout', stdout);
        const onStderr = capture.handler('stderr', stderr);
        onStdout('out-0 split');
        onStderr('warning-0\n');
        onStdout('-complete\nout-1\n');
        for (let index = 2; index < 501; index += 1) onStdout(`out-${index}\n`);
        onStdout('stdout-final-tail');
        onStderr('stderr-final-tail');
        capture.flush();
        const records = readFileSync(evidencePath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
        assert.equal(records.length, 504);
        assert.deepEqual(records.map((record) => record.sequence), Array.from({ length: 504 }, (_, index) => index + 1));
        assert.deepEqual(records.slice(0, 3).map((record) => [record.stream, record.line]), [
            ['stderr', 'warning-0'],
            ['stdout', 'out-0 split-complete'],
            ['stdout', 'out-1'],
        ]);
        assert.deepEqual(records.slice(-2).map((record) => [record.stream, record.line]), [
            ['stdout', 'stdout-final-tail'],
            ['stderr', 'stderr-final-tail'],
        ]);
        assert.equal(stdout.length, 500);
        assert.equal(stdout[0], 'out-2');
        assert.deepEqual(stderr, ['warning-0', 'stderr-final-tail']);
        assert.equal(records.some((record) => record.line === 'out-0 split'), false, 'split chunks must not invent lines');
        assert.throws(() => captureFactory(evidencePath, () => 1), /exist|EEXIST/i);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('user-data setup rejects every existing profile without deleting retained bytes', () => {
    const prepare = loadFunction<(profilePath: string, isResume: boolean) => void>(
        readHarness(), 'prepareFreshUserDataDirectory', { fs: nodeFs },
    );
    const root = mkdtempSync(join(tmpdir(), 'awwv-user-data-'));
    try {
        const existing = join(root, 'retained-profile');
        nodeFs.mkdirSync(join(existing, 'nested'), { recursive: true });
        const sentinel = join(existing, 'nested', 'sentinel.bin');
        writeFileSync(sentinel, Buffer.from([0, 1, 2, 255]));
        for (const isResume of [false, true]) {
            assert.throws(() => prepare(existing, isResume), /already exists.*refusing/i);
            assert.deepEqual(readFileSync(sentinel), Buffer.from([0, 1, 2, 255]));
        }
        const fresh = join(root, 'fresh-profile');
        prepare(fresh, false);
        assert.equal(nodeFs.statSync(fresh).isDirectory(), true);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('run faction uses fresh-profile setup and flushes buffered process tails after teardown', () => {
    const runFactionSource = extractFunctionSource(readHarness(), 'runFaction');
    assert.match(runFactionSource, /prepareFreshUserDataDirectory\(userDataDir, Boolean\(resumeSavePath\)\)/);
    assert.doesNotMatch(runFactionSource, /rmSync\(userDataDir/);
    const closeIndex = runFactionSource.indexOf("optionalCleanup('electron application teardown'");
    const flushIndex = runFactionSource.indexOf('mainProcessOutputCapture.flush()');
    const finalProgressIndex = runFactionSource.indexOf('writeProgress(result)', flushIndex);
    assert.ok(closeIndex >= 0 && flushIndex > closeIndex, 'buffered tails must flush after process teardown');
    assert.ok(finalProgressIndex > flushIndex, 'failure and success progress must be rewritten after tail flush');
});

test('turn autosave evidence keeps provisional bytes separate from one immutable settled archive', () => {
    const harness = readHarness();
    const archiveSource = extractFunctionSource(harness, 'archiveAutosaveEvidence');
    const turnSource = extractFunctionSource(harness, 'archiveTurnAutosaveSnapshot');
    const archiveTurn = runInNewContext(
        `(() => { const archiveAutosaveEvidence = ${archiveSource}; return (${turnSource}); })()`,
        { fs: nodeFs, path: nodePath, fileSha256: (filePath: string) => nodeRequire('node:crypto').createHash('sha256').update(readFileSync(filePath)).digest('hex') },
    ) as (sourcePath: string, evidenceRoot: string, faction: string, turn: number, records: Map<number, unknown>, kind: string) => any;
    const root = mkdtempSync(join(tmpdir(), 'awwv-turn-autosaves-'));
    try {
        const sourcePath = join(root, 'autosave.json');
        writeFileSync(sourcePath, JSON.stringify({ meta: { turn: 16 }, military: { formations: { ajnie: { assignment: null } } } }));
        const provisionalRecords = new Map<number, unknown>();
        const settledRecords = new Map<number, unknown>();
        const provisional = archiveTurn(sourcePath, join(root, 'evidence'), 'RBiH', 16, provisionalRecords, 'provisional');
        assert.equal(provisional.turn, 16);
        assert.equal(provisional.kind, 'provisional');
        assert.match(provisional.path, /turn-autosaves-pre-settlement/);
        writeFileSync(sourcePath, JSON.stringify({ meta: { turn: 16 }, receipts: ['post-advance-decision'] }));
        const settled = archiveTurn(sourcePath, join(root, 'evidence'), 'RBiH', 16, settledRecords, 'settled');
        assert.equal(settled.kind, 'settled');
        assert.match(settled.path, /turn-autosaves[\\/]turn-016\.json$/);
        assert.notEqual(settled.sha256, provisional.sha256, 'a same-turn receipt may change only the settled snapshot');
        assert.deepEqual(JSON.parse(readFileSync(provisional.path, 'utf8')).military.formations.ajnie.assignment, null);
        assert.deepEqual(JSON.parse(readFileSync(settled.path, 'utf8')).receipts, ['post-advance-decision']);
        assert.equal(archiveTurn(sourcePath, join(root, 'evidence'), 'RBiH', 16, settledRecords, 'settled'), settled);
        writeFileSync(sourcePath, JSON.stringify({ meta: { turn: 17 } }));
        assert.throws(() => archiveTurn(sourcePath, join(root, 'evidence'), 'RBiH', 16, new Map(), 'settled'), /turn mismatch/i);
        writeFileSync(sourcePath, JSON.stringify({ meta: { turn: 16 } }));
        assert.throws(() => archiveTurn(sourcePath, join(root, 'evidence'), 'RBiH', 16, new Map(), 'settled'), /exist|EEXIST/i);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('settled turn readiness fails closed for blockers, exact owned modals, wrong turn, and unstable autosave identity', async () => {
    const harness = readHarness();
    const validate = loadFunction<(beforeState: any, afterState: any, beforeInventory: any, afterInventory: any, turn: number, before: string, after: string) => unknown>(
        harness,
        'validateSettledTurnArchiveReadiness',
    );
    const ready = { turn: 16, blockerInventory: { decisions: 0, aftermath: 0 } };
    const clearInventory = { turnAftermath: 0, eventDecision: 0, paramilitary: 0, reserveRequest: 0, decisionRoom: 0 };
    assert.doesNotThrow(() => validate(ready, ready, clearInventory, clearInventory, 16, 'hash:10:20', 'hash:10:20'));
    assert.throws(() => validate({ ...ready, blockerInventory: { decisions: 1 } }, ready, clearInventory, clearInventory, 16, 'same', 'same'), /blocker/i);
    assert.throws(() => validate(ready, ready, { ...clearInventory, decisionRoom: 1 }, clearInventory, 16, 'same', 'same'), /modal|surface/i);
    assert.throws(() => validate(ready, { ...ready, turn: 17 }, clearInventory, clearInventory, 16, 'same', 'same'), /turn mismatch/i);
    assert.throws(() => validate(ready, ready, clearInventory, clearInventory, 16, 'before', 'after'), /stable/i);
    assert.doesNotThrow(
        () => validate(ready, ready, clearInventory, clearInventory, 16, 'same', 'same'),
        'footer-only REVIEW BEFORE ADVANCE 1 / REQ 0 text is deliberately outside exact modal inventory',
    );
    const inventorySource = extractFunctionSource(harness, 'readOwnedModalInventory');
    assert.match(inventorySource, /turn-aftermath-close/);
    assert.match(inventorySource, /event-decision-response-rail/);
    assert.match(inventorySource, /paramilitary-submit-decisions/);
    assert.match(inventorySource, /reserve-request-modal/);
    assert.match(inventorySource, /warroom-decision-room-host/);
    assert.doesNotMatch(inventorySource, /advance-turn-title/, 'expected pre-dispatch Advance confirmation is not an owned blocker modal');
    const readInventory = runInNewContext(
        `(async ${inventorySource})`,
    ) as (frame: any) => Promise<Record<string, number>>;
    const queried: string[] = [];
    const decisionRoomSelector = '[data-testid="warroom-decision-room-host"]';
    const observedInventory = await readInventory({
        locator: (selector: string) => {
            queried.push(selector);
            return {
                count: async () => 1,
                nth: () => ({ isVisible: async () => selector === decisionRoomSelector }),
            };
        },
    });
    assert.equal(observedInventory.decisionRoom, 1);
    assert.equal(Object.values(observedInventory).reduce((sum, count) => sum + count, 0), 1);
    assert.equal(queried.some((selector) => selector.includes('advance-turn-title')), false);
    assert.throws(() => validate(ready, ready, observedInventory, clearInventory, 16, 'same', 'same'), /modal|surface/i);
    await assert.rejects(
        () => readInventory({ locator: () => ({ count: async () => { throw new Error('detached frame'); } }) }),
        /detached frame/,
        'owner-query errors must prevent settlement instead of becoming a zero count',
    );
    await assert.rejects(
        () => readInventory({ locator: () => ({ count: async () => 1, nth: () => ({ isVisible: async () => { throw new Error('destroyed execution context'); } }) }) }),
        /destroyed execution context/,
        'owner-visibility errors must prevent settlement instead of becoming hidden',
    );
});

test('turn loop captures provisional increments but settles only before the next Advance or after terminal drain', () => {
    const source = extractFunctionSource(readHarness(), 'playTurns');
    assert.match(source, /handleCurrentSurface\(page, frame, faction, events, \{ allowAdvanceModal: false \}\)/);
    assert.match(source, /afterHandle[\s\S]*archiveProvisionalTurn\(afterHandle\.turn\)/);
    assert.match(source, /advance-click[\s\S]*archiveProvisionalTurn\(after\.turn\)/);
    const prepareAdvance = source.indexOf('await prepareAdvanceDispatch(');
    const advanceDispatch = source.indexOf('await dispatchAdvanceAfterSettlement(', prepareAdvance);
    assert.ok(prepareAdvance >= 0 && advanceDispatch > prepareAdvance);
    assert.match(source.slice(advanceDispatch, advanceDispatch + 240), /handled\.action/);
    const prepareSource = extractFunctionSource(readHarness(), 'prepareAdvanceDispatch');
    const settleBeforeAdvance = prepareSource.indexOf('await archiveSettledTurn(before.turn)');
    const prerequisiteBeforeAdvance = prepareSource.indexOf('assertAdvanceDispatchPrerequisites(');
    assert.ok(settleBeforeAdvance >= 0 && prerequisiteBeforeAdvance > settleBeforeAdvance);
    const terminalDrain = source.indexOf(`turn-${'${targetTurn}'}-pre-final-tour-drain`);
    const terminalSettle = source.indexOf('await archiveSettledTurn(targetTurn)', terminalDrain);
    const terminalCheckpoint = source.indexOf('await runCheckpointTourAfterSettlement(targetTurn)', terminalSettle);
    assert.ok(terminalDrain >= 0 && terminalSettle > terminalDrain && terminalCheckpoint > terminalSettle);
    assert.doesNotMatch(source, /archiveCompletedTurnAutosave/);
});

test('advance dispatch prerequisites reject unresolved blockers and missing settled evidence', async () => {
    const assertReady = loadFunction<(state: any, archivesRequired: boolean, settledTurns: Map<number, unknown>) => unknown>(
        readHarness(),
        'assertAdvanceDispatchPrerequisites',
    );
    const settled = new Map<number, unknown>([[15, { turn: 15, kind: 'settled' }]]);
    assert.throws(
        () => assertReady({ turn: 15, blockerInventory: { decisions: 1 } }, true, settled),
        /blocker/i,
    );
    assert.throws(
        () => assertReady({ turn: 15, blockerInventory: { decisions: 0 } }, true, new Map()),
        /settled/i,
    );
    assert.doesNotThrow(() => assertReady({ turn: 15, blockerInventory: { decisions: 0 } }, true, settled));
    assert.doesNotThrow(
        () => assertReady({ turn: 0, blockerInventory: { decisions: 0 } }, true, new Map()),
        'turn zero is the separately captured canonical initial boundary',
    );
    assert.throws(() => assertReady(null, true, settled), /turn/i);

    const prepareSource = extractFunctionSource(readHarness(), 'prepareAdvanceDispatch');
    let archiveCalls = 0;
    let surfaceCalls = 0;
    let readStateResult = { turn: 15, blockerInventory: { decisions: 1 } };
    const prepare = runInNewContext(
        `(async ${prepareSource})`,
        {
            readState: async () => readStateResult,
            assertAdvanceDispatchPrerequisites: assertReady,
        },
    ) as (input: Record<string, unknown>) => Promise<unknown>;
    await assert.rejects(() => prepare({
        frame: {},
        before: { turn: 15, blockerInventory: { decisions: 1 } },
        handledAction: 'none',
        unresolvedStateBlocker: true,
        archiveTurnAutosaves: true,
        turnAutosaveEvidenceByTurn: settled,
        ensureAdvanceSurface: async () => { surfaceCalls += 1; return true; },
        archiveSettledTurn: async () => { archiveCalls += 1; },
        runCheckpointTourAfterSettlement: async () => {},
    }), /blocker/i);
    assert.equal(surfaceCalls, 0);
    assert.equal(archiveCalls, 0, 'a missed blocker surface must never archive or reach dispatch preparation');

    const order: string[] = [];
    const normalSettled = new Map<number, unknown>();
    readStateResult = { turn: 15, blockerInventory: { decisions: 0 } };
    const prepared: any = await prepare({
        frame: {},
        before: readStateResult,
        handledAction: 'none',
        unresolvedStateBlocker: false,
        archiveTurnAutosaves: true,
        turnAutosaveEvidenceByTurn: normalSettled,
        ensureAdvanceSurface: async () => { order.push('surface'); return true; },
        archiveSettledTurn: async (turn: number) => {
            order.push(`archive:${turn}`);
            normalSettled.set(turn, { turn, kind: 'settled' });
        },
        runCheckpointTourAfterSettlement: async (turn: number) => { order.push(`checkpoint:${turn}`); },
    });
    assert.deepEqual(order, ['surface', 'archive:15', 'checkpoint:15']);
    assert.equal(prepared.prerequisites.boundary, 'settled-turn');
    assert.equal(prepared.state.turn, 15);

    const playSource = extractFunctionSource(readHarness(), 'playTurns');
    const prerequisiteIndex = playSource.indexOf('await prepareAdvanceDispatch(');
    const dispatchIndex = playSource.indexOf('await dispatchAdvanceAfterSettlement(');
    assert.ok(prerequisiteIndex >= 0 && dispatchIndex > prerequisiteIndex);
});

test('advance confirmation classification requires one exact visible owner and fails closed on ambiguity', async () => {
    const source = readHarness();
    const reader = runInNewContext(
        `(async ${extractFunctionSource(source, 'readAdvanceConfirmation')})`,
    ) as (frame: any) => Promise<Record<string, unknown>>;
    const exactModalSelector = '[aria-labelledby="advance-turn-title"]';
    const frame = (ownerCount: number, visible = true) => ({
        locator: (selector: string) => {
            assert.equal(selector, exactModalSelector);
            return {
                count: async () => ownerCount,
                first: () => ({
                    isVisible: async () => visible,
                    getByRole: () => ({
                        count: async () => 1,
                        first: () => ({ isVisible: async () => true, isEnabled: async () => true }),
                    }),
                }),
            };
        },
    });
    assert.deepEqual(await reader(frame(0)), { present: false });
    assert.equal((await reader(frame(1))).present, true);
    await assert.rejects(() => reader(frame(2)), /exactly one|found 2/i);
    await assert.rejects(() => reader(frame(1, false)), /not visible/i);
    await assert.rejects(
        () => reader({ locator: () => ({ count: async () => { throw new Error('query failed'); } }) }),
        /query failed/,
    );
});

test('toolbar advance outcome accepts exactly direct transition or exact confirmation and rejects neither or both', async () => {
    const outcomeSource = extractFunctionSource(readHarness(), 'waitForToolbarAdvanceOutcome');
    let stateTurn = 1;
    let modalPresent = false;
    const outcome = runInNewContext(
        `(async ${outcomeSource})`,
        {
            readState: async () => ({ turn: stateTurn }),
            readAdvanceConfirmation: async () => ({ present: modalPresent }),
            sleep: async () => {},
        },
    ) as (frame: any, turn: number, attempts?: number) => Promise<Record<string, unknown>>;
    assert.deepEqual(await outcome({}, 0, 1), { kind: 'direct-turn-transition', turn: 1 });
    stateTurn = 0;
    modalPresent = true;
    assert.deepEqual(await outcome({}, 0, 1), { kind: 'confirmation-opened', turn: 0 });
    stateTurn = 1;
    await assert.rejects(() => outcome({}, 0, 1), /ambiguous/i);
    stateTurn = 0;
    modalPresent = false;
    await assert.rejects(() => outcome({}, 0, 2), /neither|outcome/i);
});

test('settled advance dispatch follows the production direct-or-confirmation bifurcation', async () => {
    const source = readHarness();
    const dispatchSource = extractFunctionSource(source, 'dispatchAdvanceAfterSettlement');
    const exactModalSelector = '[aria-labelledby="advance-turn-title"]';
    const exactToolbarSelector = '[data-testid="warroom-toolbar-advance"]';
    const clicks: string[] = [];
    const button = (name: string) => ({
        count: async () => 1,
        first: () => ({ isVisible: async () => true, isEnabled: async () => true, click: async () => { clicks.push(name); } }),
    });
    const frame = {
        locator: (selector: string) => {
            if (selector === exactToolbarSelector) {
                return button('toolbar');
            }
            assert.equal(selector, exactModalSelector);
            return {
                count: async () => 1,
                first: () => ({
                    isVisible: async () => true,
                    getByRole: (_role: string, options: { name: RegExp }) => {
                        assert.match('Advance while holding present policy', options.name);
                        return button('modal-confirm');
                    },
                }),
            };
        },
    };
    const waits: string[] = [];
    let toolbarOutcome = { kind: 'direct-turn-transition', turn: 1 };
    const dispatch = runInNewContext(
        `(async ${dispatchSource})`,
        {
            waitForAdvanceTransition: async () => { waits.push('transition'); },
            readAdvanceConfirmation: async () => {
                const modal: any = frame.locator(exactModalSelector).first();
                return {
                    present: true,
                    buttonVisible: true,
                    buttonEnabled: true,
                    button: modal.getByRole('button', { name: /^Advance while holding present policy$/i }).first(),
                };
            },
            readState: async () => ({ turn: 1 }),
            waitForToolbarAdvanceOutcome: async () => toolbarOutcome,
        },
    ) as (frame: any, heldAction: string, beforeTurn: number) => Promise<Record<string, unknown>>;

    const held = await dispatch(frame, 'advance-turn-modal-held-for-checkpoint', 0);
    assert.deepEqual(clicks, ['modal-confirm'], 'DOM-earlier toolbar must remain untouched');
    assert.deepEqual(waits, ['transition']);
    assert.equal(held.action, 'advance-confirmation-dispatched');
    assert.equal(held.turn, 1);

    clicks.length = 0;
    waits.length = 0;
    const direct = await dispatch(frame, 'none', 0);
    assert.deepEqual(clicks, ['toolbar']);
    assert.equal(direct.action, 'advance-direct-transition');
    toolbarOutcome = { kind: 'confirmation-opened', turn: 0 };
    clicks.length = 0;
    const opened = await dispatch(frame, 'none', 0);
    assert.deepEqual(clicks, ['toolbar']);
    assert.equal(opened.action, 'advance-confirmation-opened');
});

test('current-surface held classification uses exact modal ownership instead of persistent toolbar text', () => {
    const source = extractFunctionSource(readHarness(), 'handleCurrentSurface');
    assert.match(source, /readAdvanceConfirmation\(frame\)/);
    assert.doesNotMatch(source, /\/ADVANCE TURN\/i\.test\(text\)/);
    assert.match(source, /advance-turn-modal-held-for-checkpoint/);
});

test('tile fetch abort attribution requires and consumes an exact renderer AbortSignal identity', () => {
    const harness = readHarness();
    const classifySource = extractFunctionSource(harness, 'classifyExpectedTileFetchAbort');
    const attributeSource = extractFunctionSource(harness, 'attributeTileFetchAborts');
    const attribute = runInNewContext(
        `(() => { const classifyExpectedTileFetchAbort = ${classifySource}; return (${attributeSource}); })()`,
        { URL },
    ) as (failures: Array<Record<string, unknown>>, signals: Array<Record<string, unknown>>, expected: Array<Record<string, unknown>>) => void;
    const url = 'http://127.0.0.1:3002/data/derived/tiles/hillshade.pmtiles';
    const failure = (id: string, observedAtMs: number, failureUrl = url) => ({
        failure: { errorText: 'net::ERR_ABORTED' }, method: 'GET', url: failureUrl,
        resourceType: 'fetch', isMainFrame: false, observedAtMs,
        tileFetchIdentity: { id, url: failureUrl, method: 'GET', range: 'bytes=0-16383', origin: 'http://127.0.0.1:3002' },
    });
    const signal = (id: string, observedAtMs: number, signalUrl = url) => ({
        id, url: signalUrl, method: 'GET', range: 'bytes=0-16383', origin: 'http://127.0.0.1:3002', observedAtMs,
    });

    const failures = [failure('tile-1', 2_000), failure('tile-1', 2_100)];
    const expected: Array<Record<string, unknown>> = [];
    attribute(failures, [signal('tile-1', 1_900)], expected);
    assert.equal(expected.length, 1, 'one signal must classify at most one request failure');
    assert.equal(failures.length, 1);
    assert.equal(failures[0]?.observedAtMs, 2_100);

    for (const badSignal of [
        signal('other-id', 1_900),
        signal('tile-1', 1_900, 'https://example.invalid/data/derived/tiles/hillshade.pmtiles'),
        signal('tile-1', -4_001),
        { ...signal('tile-1', 1_900), range: 'bytes=16384-32767' },
        signal('tile-1', 1_900, 'http://127.0.0.1:3003/data/derived/tiles/hillshade.pmtiles'),
    ]) {
        const rejectedFailures = [failure('tile-1', 2_000)];
        const rejectedExpected: Array<Record<string, unknown>> = [];
        attribute(rejectedFailures, [badSignal], rejectedExpected);
        assert.equal(rejectedExpected.length, 0);
        assert.equal(rejectedFailures.length, 1);
    }
    const wrongPortUrl = 'http://127.0.0.1:3003/data/derived/tiles/hillshade.pmtiles';
    const wrongPortFailures = [failure('tile-1', 2_000, wrongPortUrl)];
    const wrongPortExpected: Array<Record<string, unknown>> = [];
    attribute(wrongPortFailures, [signal('tile-1', 1_900, wrongPortUrl)], wrongPortExpected);
    assert.equal(wrongPortExpected.length, 0, 'a different localhost origin must not inherit the tile allowance');
    assert.equal(wrongPortFailures.length, 1);
});

test('tile AbortSignal observer is installed as an init script and attributed after Save/load', () => {
    const harness = readHarness();
    assert.match(harness, /page\.addInitScript\(installTileFetchAbortObserver/);
    assert.match(harness, /x-awwv-qa-tile-request-id/);
    const diagnosticsSource = extractFunctionSource(harness, 'attachPageDiagnostics');
    assert.match(diagnosticsSource, /headerValue\('x-awwv-qa-tile-request-id'\)/);
    assert.match(diagnosticsSource, /headerValue\('range'\)/);
    const playIndex = harness.indexOf('const playtest = await playTurns(');
    const saveLoadIndex = harness.indexOf('playtest.saveLoadProof = await exerciseFinalSaveLoad(', playIndex);
    const tileReadIndex = harness.indexOf('await readTileFetchAbortSignals(frame)', playIndex);
    const tileAttributeIndex = harness.indexOf('attributeTileFetchAborts(', tileReadIndex);
    assert.ok(saveLoadIndex > playIndex && tileReadIndex > saveLoadIndex && tileAttributeIndex > tileReadIndex);
});

test('ambient lifecycle observer starts before campaign and attribution runs after optional Save/load transitions', () => {
    const harness = readHarness();
    assert.match(harness, /page\.addInitScript\(installAmbientLifecycleObserver/);
    assert.match(harness, /\['abort', 'browser-abort'\]/);
    assert.match(harness, /document\.addEventListener\(binding\.eventKind, binding\.listener, true\)/);
    const playIndex = harness.indexOf('const playtest = await playTurns(');
    const saveLoadIndex = harness.indexOf('playtest.saveLoadProof = await exerciseFinalSaveLoad(', playIndex);
    const readSignalsIndex = harness.indexOf('await readAmbientLifecycleSignals(frame)', playIndex);
    assert.ok(playIndex >= 0 && saveLoadIndex > playIndex);
    assert.ok(readSignalsIndex > saveLoadIndex);
});

test('final Save/load enters the tactical map through the visible War Map route before pressing Escape', () => {
    const harness = readHarness();
    const openPause = extractFunctionSource(harness, 'openSaveLoadPause');

    assert.match(openPause, /clickByTestId\(frame, 'warroom-toolbar-war-map', 'save-load war map route'/);
    assert.match(openPause, /waitForMap\(frame, expectedTurn, false/);
    assert.ok(
        openPause.indexOf("clickByTestId(frame, 'warroom-toolbar-war-map'")
            < openPause.indexOf("tacticalMap.press('Escape')"),
        'the user-visible War Map click must precede Escape',
    );
});

test('final Save/load pins the post-save close and current tactical owner before one second Escape', () => {
    const harness = readHarness();
    const saveLoad = extractFunctionSource(harness, 'exerciseFinalSaveLoad');
    const openPause = extractFunctionSource(harness, 'openSaveLoadPause');
    const saveClickIndex = saveLoad.indexOf('saveButton.click()');
    const saveHiddenIndex = saveLoad.indexOf("saveButton.waitFor({ state: 'hidden'", saveClickIndex);
    const secondPauseIndex = saveLoad.indexOf("await openSaveLoadPause(frame, expectedTurn, 'post-save')", saveHiddenIndex);
    assert.ok(saveClickIndex >= 0 && saveHiddenIndex > saveClickIndex && secondPauseIndex > saveHiddenIndex);
    assert.match(openPause, /waitForMap\(frame, expectedTurn, false/);
    assert.match(openPause, /tacticalMap\.press\('Escape'\)/);
    assert.doesNotMatch(openPause, /for \(let attempt = 0; attempt < 5/);
});

test('save-load-only is a bounded zero-turn diagnostic and failure paths retain raw lifecycle signals', () => {
    const harness = readHarness();
    assert.match(harness, /const saveLoadOnly = args\.has\('--save-load-only'\)/);
    assert.match(harness, /--save-load-only requires --turns=0 and --save-load-proof/);
    assert.match(harness, /resolvePendingEventDecisionsBeforeFreeNavigation[\s\S]*if \(saveLoadOnly\)/);
    assert.match(harness, /if \(saveLoadOnly\)[\s\S]*else if \(!skipInitialTour\)[\s\S]*mapInteractionProbe/);
    assert.match(harness, /failureTileFetchAbortSignals/);
    assert.match(harness, /failureAmbientLifecycleSignals/);
    assert.match(harness, /catch \(error\)[\s\S]*readTileFetchAbortSignals\(frame\)[\s\S]*readAmbientLifecycleSignals\(frame\)/);
    const catchIndex = harness.indexOf('} catch (error) {', harness.indexOf('async function runFaction'));
    const catchSource = harness.slice(catchIndex, harness.indexOf('} finally {', catchIndex));
    assert.match(catchSource, /attributeTileFetchAborts\(networkFailures, failureTileFetchAbortSignals, expectedTileFetchAborts\)/);
    assert.ok(catchSource.indexOf('attributeTileFetchAborts(') < catchSource.indexOf('result.factions.push('));
    assert.match(catchSource, /failureTileFetchAbortSignals/);
    assert.match(catchSource, /failureRawNetworkFailures/);
    assert.match(catchSource, /expectedTileFetchAborts/);
});

test('save menu route retains every owner boundary without a temporary inspection flag', () => {
    const harness = readHarness();
    assert.doesNotMatch(harness, /--inspect-save-load-menu-route/);
    const inspect = extractFunctionSource(harness, 'completeObservedSaveLoadRoute');
    for (const boundary of [
        'before-main-menu-click',
        'after-main-menu-click',
        'after-main-menu-entry',
        'after-field-records-click',
        'resume-quicksave-visible',
        'after-resume-click',
    ]) {
        assert.match(inspect, new RegExp(boundary));
    }
    assert.match(inspect, /captureSaveLoadSurfaceInventory/);
    assert.match(extractFunctionSource(harness, 'inspectFrameSurface'), /opening-splash-art/);
    assert.match(extractFunctionSource(harness, 'inspectFrameSurface'), /accessibleLabel/);
    assert.match(extractFunctionSource(harness, 'inspectFrameSurface'), /\[aria-hidden="true"\]/);
    assert.match(inspect, /Assume responsibility/);
    assert.match(inspect, /Field Records/);
    assert.match(inspect, /chooseObservedQuicksaveControl/);
    assert.doesNotMatch(extractFunctionSource(harness, 'resolveObservedFrame'), /frameIndex/);
    assert.match(harness, /saveLoadMenuInspectionPath/);
});

test('resume-save follows unique observed Main Menu owners and fails closed before import or Advance', async () => {
    const harness = readHarness();
    const exactCount = loadFunction<(record: any, label: string) => number>(harness, 'frameVisibleExactControlCount');
    const resume = loadAsyncFunction<(
        page: unknown,
        faction: string,
        savePath: string,
        dependencies: Record<string, unknown>,
    ) => Promise<any>>(harness, 'resumeThroughObservedMainMenu', {
        frameVisibleExactControlCount: exactCount,
        compactText: (value: unknown) => String(value),
        canonicalAutosavePath: 'canonical-autosave.json',
    });
    const selectOwner = loadFunction<(observation: any, predicate: (record: any) => boolean, label: string) => any>(
        harness,
        'chooseObservedOwner',
    );
    const clicked: string[] = [];
    const frames = new Map<string, any>();
    for (const frameId of ['opening', 'landing', 'records', 'restored']) {
        frames.set(frameId, {
            getByRole: (_role: string, options: { name: string }) => ({
                count: async () => 1,
                isVisible: async () => true,
                isEnabled: async () => true,
                click: async () => { clicked.push(options.name); },
            }),
        });
    }
    const observation = (frameId: string, controls: string[], markers: Record<string, boolean>) => ({
        boundary: frameId,
        chosenOwnerFrameId: null,
        pages: [{ pageIndex: 0, frames: [{
            frameId,
            url: `https://example.invalid/${frameId}`,
            detached: false,
            controls: controls.map((accessibleLabel) => ({ accessibleLabel, disabled: false })),
            markers,
        }] }],
    });
    const routeObservations = () => [
        observation('opening', ['Assume responsibility'], { openingSplash: true }),
        observation('landing', ['Field Records'], { mainMenuOpening: true }),
        observation('records', ['Import file…'], { mainMenuOpening: true }),
        observation('restored', [], { tacticalMap: true }),
    ];
    const invoke = async (observations: any[], diagnostics: any[], overrides: Record<string, unknown> = {}) => resume(
        {},
        'RBiH',
        'C:\\evidence\\turn-39.json',
        {
            captureSaveLoadSurfaceInventory: async () => observations.shift(),
            chooseObservedOwner: selectOwner,
            markSaveLoadObservationOwner: (item: any, owner: any) => { item.chosenOwnerFrameId = owner.frameRecord.frameId; },
            resolveObservedFrame: (_page: unknown, owner: any) => frames.get(owner.frameRecord.frameId),
            sleep: async () => {},
            waitForCampaignCommandReady: async () => {},
            readState: async () => ({ turn: 39, playerFaction: 'RBiH' }),
            readResumeIdentity: () => ({ turn: 39, playerFaction: 'RBiH' }),
            assertCanonicalResumeAutosave: () => 'autosave-hash:1:2',
            readAmbientLifecycleSignals: async () => [{ kind: 'playing' }],
            failureEvidence: {
                consoleMessages: [{ type: 'error', text: 'renderer-error' }],
                pageErrors: [{ message: 'page-error' }],
                networkFailures: [{ kind: 'request-failed', url: 'https://example.invalid/fail' }],
                mainProcessStdout: ['main-out'],
                mainProcessStderr: ['main-err'],
                mainProcessOutputEvidencePath: 'C:\\evidence\\main.jsonl',
            },
            writeResumeRouteDiagnostics: (value: unknown) => { diagnostics.push(value); },
            ...overrides,
        },
    );

    const successDiagnostics: any[] = [];
    const success = await invoke(routeObservations(), successDiagnostics);
    assert.equal(success.frame, frames.get('restored'));
    assert.deepEqual(clicked, ['Assume responsibility', 'Field Records', 'Import file…']);
    assert.equal(successDiagnostics.at(-1)?.status, 'loaded');
    assert.equal(successDiagnostics.at(-1)?.canonicalAutosaveIdentity, 'autosave-hash:1:2');

    for (const controls of [[], ['Assume responsibility', 'Assume responsibility']]) {
        clicked.length = 0;
        const failureDiagnostics: any[] = [];
        await assert.rejects(
            () => invoke([observation('opening', controls, { openingSplash: true })], failureDiagnostics),
            /observed 0/,
        );
        assert.deepEqual(clicked, []);
        assert.equal(failureDiagnostics.at(-1)?.status, 'failed');
        assert.deepEqual(failureDiagnostics.at(-1)?.failureEvidence.consoleMessages, [{ type: 'error', text: 'renderer-error' }]);
        assert.deepEqual(failureDiagnostics.at(-1)?.failureEvidence.rawNetworkFailures, [{ kind: 'request-failed', url: 'https://example.invalid/fail' }]);
        assert.equal(failureDiagnostics.at(-1)?.failureEvidence.mainProcessOutputEvidencePath, 'C:\\evidence\\main.jsonl');
        assert.equal(failureDiagnostics.at(-1)?.failureEvidence.ambientLifecycleSignals.available, false);
    }

    clicked.length = 0;
    const ambiguousImportDiagnostics: any[] = [];
    await assert.rejects(
        () => invoke([
            observation('opening', ['Assume responsibility'], { openingSplash: true }),
            observation('landing', ['Field Records'], { mainMenuOpening: true }),
            observation('records', ['Import file…', 'Import file…'], { mainMenuOpening: true }),
        ], ambiguousImportDiagnostics),
        /observed 0/,
    );
    assert.deepEqual(clicked, ['Assume responsibility', 'Field Records']);
    assert.equal(ambiguousImportDiagnostics.at(-1)?.status, 'failed');

    clicked.length = 0;
    const wrongIdentityDiagnostics: any[] = [];
    await assert.rejects(
        () => invoke(routeObservations(), wrongIdentityDiagnostics, {
            readState: async () => ({ turn: 40, playerFaction: 'RS' }),
        }),
        /loaded identity mismatch/,
    );
    assert.deepEqual(clicked, ['Assume responsibility', 'Field Records', 'Import file…']);
    assert.equal(wrongIdentityDiagnostics.at(-1)?.status, 'failed');

    clicked.length = 0;
    const enrichmentDiagnostics: any[] = [];
    await assert.rejects(
        () => invoke(routeObservations(), enrichmentDiagnostics, {
            waitForCampaignCommandReady: async () => { throw new Error('enrichment-failed'); },
        }),
        /enrichment-failed/,
    );
    assert.deepEqual(clicked, ['Assume responsibility', 'Field Records', 'Import file…']);
    assert.equal(enrichmentDiagnostics.at(-1)?.status, 'failed');
    assert.match(enrichmentDiagnostics.at(-1)?.error, /enrichment-failed/);

    const helper = extractFunctionSource(harness, 'resumeThroughObservedMainMenu');
    assert.doesNotMatch(helper, /Advance|advanceTurn|setInputFiles|loadStateDialog/);
    const runFaction = extractFunctionSource(harness, 'runFaction');
    assert.match(runFaction, /resumeThroughObservedMainMenu\(page, faction, resumeSavePath/);
    assert.doesNotMatch(runFaction, /getByRole\('button', \{ name: \/Load Save\/i \}\)/);
});

test('save menu inspection emits deterministic exact projected-state and canonical-save payload evidence', () => {
    const harness = readHarness();
    const diff = loadFunction<(before: unknown, after: unknown) => Array<{ path: string }>>(
        harness,
        'deterministicStructuralDiff',
    );
    assert.deepEqual(
        diff({ z: 1, nested: { b: 2, a: 1 } }, { z: 3, nested: { b: 4, a: 1 }, added: true })
            .map((entry) => entry.path),
        ['added', 'nested.b', 'z'],
    );
    const inspect = extractFunctionSource(harness, 'completeObservedSaveLoadRoute');
    assert.match(inspect, /before-projected\.json/);
    assert.match(inspect, /after-projected\.json/);
    assert.match(inspect, /before-canonical-autosave\.json/);
    assert.match(inspect, /after-canonical-autosave\.json/);
    assert.match(inspect, /structural-diff\.json/);
});

test('save menu payload directory creates a missing parent and refuses to overwrite a retained attempt', () => {
    const harness = readHarness();
    const create = loadFunction<(parent: string, child: string) => string>(
        harness,
        'createFreshNestedEvidenceDirectory',
        { fs: nodeFs, path: nodePath },
    );
    const root = mkdtempSync(join(tmpdir(), 'awwv-save-menu-payload-'));
    try {
        const created = create(join(root, 'missing-parent'), 'attempt-01');
        const sentinel = join(created, 'sentinel.txt');
        writeFileSync(sentinel, 'retain');
        assert.throws(() => create(join(root, 'missing-parent'), 'attempt-01'), /EEXIST/);
        assert.equal(readFileSync(sentinel, 'utf8'), 'retain');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('Save/load hydration permits only cache removal and owned-sector rating recomputation', () => {
    const harness = readHarness();
    const validateDelta = loadFunction<(
        before: string,
        expected: string,
        faction: string,
        turn: number,
    ) => unknown>(harness, 'validateExpectedLoadHydrationDelta', {
        deterministicStructuralDiff: loadFunction(harness, 'deterministicStructuralDiff'),
    });
    const assertExpected = loadFunction<(actual: string, expected: string) => unknown>(
        harness,
        'assertExactExpectedLoadedProjection',
        { crypto: nodeRequire('node:crypto') },
    );
    const rating = (sectorId: string, personnel: number, strengthClass: string) => ({
        sector_id: sectorId,
        faction: 'RBiH',
        offensive_power: 100,
        defensive_power: 200,
        defense_per_edge: 100,
        personnel,
        morale_avg: 60,
        cohesion_avg: 70,
        fatigue_avg: 0,
        edge_count: 2,
        brigade_count: 1,
        strength_class: strengthClass,
    });
    const base = {
        meta: { player_faction: 'RBiH', turn: 4 },
        military: {
            home_distance_cache: { brigade_a: 3, brigade_b: 0 },
            corps_front_sectors: {
                own: { sector_id: 'own', faction: 'RBiH' },
                own_new: { sector_id: 'own_new', faction: 'RBiH' },
                enemy: { sector_id: 'enemy', faction: 'RS' },
            },
            // Live transient ratings may be a subset before authoritative load hydration.
            sector_combat_ratings: { own: rating('own', 9, 'thin') },
        },
    };
    const hydrated = structuredClone(base) as any;
    hydrated.military.home_distance_cache = {};
    hydrated.military.sector_combat_ratings = {
        own: rating('own', 10, 'adequate'),
        own_new: rating('own_new', 5, 'critical'),
    };
    const receipt = validateDelta(JSON.stringify(base), JSON.stringify(hydrated), 'RBiH', 4) as any;
    assert.deepEqual(receipt.allowedPrefixes, ['military.home_distance_cache', 'military.sector_combat_ratings']);
    assert.equal(receipt.changeClasses.homeDistanceCacheRemovals > 0, true);
    assert.equal(receipt.changeClasses.sectorCombatRatingChanges > 0, true);
    const emptyTransient = structuredClone(base) as any;
    emptyTransient.military.home_distance_cache = {};
    emptyTransient.military.sector_combat_ratings = {};
    assert.doesNotThrow(() => validateDelta(JSON.stringify(emptyTransient), JSON.stringify(hydrated), 'RBiH', 4));
    assert.throws(
        () => validateDelta(JSON.stringify(base), JSON.stringify({ ...hydrated, unrelated: true }), 'RBiH', 4),
        /outside declared hydration fields/,
    );
    const populatedAfterCache = structuredClone(hydrated);
    populatedAfterCache.military.home_distance_cache = { brigade_a: 4 };
    assert.throws(() => validateDelta(JSON.stringify(base), JSON.stringify(populatedAfterCache), 'RBiH', 4), /cache.*empty/i);
    const missingAfterCache = structuredClone(hydrated);
    delete missingAfterCache.military.home_distance_cache;
    assert.throws(() => validateDelta(JSON.stringify(base), JSON.stringify(missingAfterCache), 'RBiH', 4), /cache.*own.*plain/i);
    const replacedAfterCache = structuredClone(hydrated);
    replacedAfterCache.military.home_distance_cache = [];
    assert.throws(() => validateDelta(JSON.stringify(base), JSON.stringify(replacedAfterCache), 'RBiH', 4), /cache.*own.*plain/i);
    const invalidBeforeCache = structuredClone(base);
    invalidBeforeCache.military.home_distance_cache.brigade_a = Number.POSITIVE_INFINITY;
    assert.throws(() => validateDelta(JSON.stringify(invalidBeforeCache), JSON.stringify(hydrated), 'RBiH', 4), /cache.*finite.*non-negative/i);
    const negativeBeforeCache = structuredClone(base);
    negativeBeforeCache.military.home_distance_cache.brigade_a = -1;
    assert.throws(() => validateDelta(JSON.stringify(negativeBeforeCache), JSON.stringify(hydrated), 'RBiH', 4), /cache.*finite.*non-negative/i);
    const nestedBeforeCache = structuredClone(base) as any;
    nestedBeforeCache.military.home_distance_cache = { brigade_a: { hops: 3 } };
    assert.throws(() => validateDelta(JSON.stringify(nestedBeforeCache), JSON.stringify(hydrated), 'RBiH', 4), /cache.*flat/i);
    const thirdTransient = structuredClone(hydrated);
    thirdTransient.military.militia_garrison = { own: 1 };
    assert.throws(() => validateDelta(JSON.stringify(base), JSON.stringify(thirdTransient), 'RBiH', 4), /outside declared hydration fields/);
    const missingRating = structuredClone(hydrated);
    missingRating.military.sector_combat_ratings = {};
    assert.throws(() => validateDelta(JSON.stringify(base), JSON.stringify(missingRating), 'RBiH', 4), /rating ids.*player-owned sectors/i);
    const extraRating = structuredClone(hydrated);
    extraRating.military.sector_combat_ratings.enemy = rating('enemy', 5, 'thin');
    assert.throws(() => validateDelta(JSON.stringify(base), JSON.stringify(extraRating), 'RBiH', 4), /rating ids.*player-owned sectors/i);
    const nonnumericRating = structuredClone(hydrated);
    nonnumericRating.military.sector_combat_ratings.own.personnel = 'ten';
    assert.throws(() => validateDelta(JSON.stringify(base), JSON.stringify(nonnumericRating), 'RBiH', 4), /rating.*(schema|numeric)/i);
    const arbitraryStringBefore = structuredClone(base);
    const arbitraryStringAfter = structuredClone(hydrated);
    (arbitraryStringBefore.military.sector_combat_ratings.own as any).note = 'before';
    arbitraryStringAfter.military.sector_combat_ratings.own.note = 'after';
    assert.throws(() => validateDelta(JSON.stringify(arbitraryStringBefore), JSON.stringify(arbitraryStringAfter), 'RBiH', 4), /rating.*(schema|numeric|strength_class)/i);
    const invalidBeforeEnum = structuredClone(base);
    invalidBeforeEnum.military.sector_combat_ratings.own.strength_class = 'invalid';
    assert.throws(() => validateDelta(JSON.stringify(invalidBeforeEnum), JSON.stringify(hydrated), 'RBiH', 4), /rating.*(schema|strength_class)/i);
    const invalidAfterEnum = structuredClone(hydrated);
    invalidAfterEnum.military.sector_combat_ratings.own.strength_class = 'invalid';
    assert.throws(() => validateDelta(JSON.stringify(base), JSON.stringify(invalidAfterEnum), 'RBiH', 4), /rating.*(schema|strength_class)/i);
    const nestedBefore = structuredClone(base);
    const nestedAfter = structuredClone(hydrated);
    (nestedBefore.military.sector_combat_ratings.own as any).nested = { strength_class: 'thin' };
    nestedAfter.military.sector_combat_ratings.own.nested = { strength_class: 'adequate' };
    assert.throws(() => validateDelta(JSON.stringify(nestedBefore), JSON.stringify(nestedAfter), 'RBiH', 4), /rating.*(schema|strength_class)/i);
    assert.throws(
        () => validateDelta(JSON.stringify(base), JSON.stringify({ ...hydrated, military: { ...hydrated.military, sector_combat_ratings: { enemy: {} } } }), 'RBiH', 4),
        /player-owned sectors/,
    );
    assert.doesNotThrow(() => assertExpected(JSON.stringify(hydrated), JSON.stringify(hydrated)));
    assert.throws(() => assertExpected(JSON.stringify({ ...hydrated, extra: 1 }), JSON.stringify(hydrated)), /exact authoritative/);
    assert.throws(() => assertExpected(JSON.stringify(base), JSON.stringify(hydrated)), /exact authoritative/);
    const wrongRating = structuredClone(hydrated);
    wrongRating.military.sector_combat_ratings.own.personnel = 11;
    assert.throws(() => assertExpected(JSON.stringify(wrongRating), JSON.stringify(hydrated)), /exact authoritative/);

    const route = extractFunctionSource(harness, 'completeObservedSaveLoadRoute');
    assert.match(route, /expectedHydrationAllowedPrefixes/);
    assert.match(route, /expectedHydrationChangeClasses/);
    const expectedIndex = route.indexOf('buildAuthoritativeExpectedLoadedProjection');
    const resumeIndex = route.indexOf("getByRole('button', { name: owner.label, exact: true }).click()", expectedIndex);
    const exactIndex = route.indexOf('assertExactExpectedLoadedProjection', resumeIndex);
    assert.ok(expectedIndex >= 0 && resumeIndex > expectedIndex && exactIndex > resumeIndex);
    const exercise = extractFunctionSource(harness, 'exerciseFinalSaveLoad');
    assert.match(exercise, /return completeObservedSaveLoadRoute\(/);
});

test('Save/load owner selection rejects stale, ambiguous, hidden, and wrong restored identities', () => {
    const harness = readHarness();
    const select = loadFunction<(observation: any, predicate: (record: any) => boolean, label: string) => any>(
        harness,
        'chooseObservedOwner',
    );
    const chooseQuicksave = loadFunction<(observation: any) => any>(harness, 'chooseObservedQuicksaveControl');
    const frame = (overrides: Record<string, unknown> = {}) => ({
        detached: false,
        controls: [],
        markers: {},
        frameId: 'frame-1',
        url: 'http://127.0.0.1/index.html?embedded=1',
        ...overrides,
    });
    const observation = (frames: any[]) => ({ pages: [{ pageIndex: 0, frames }] });
    assert.throws(() => select(observation([]), () => true, 'owner'), /observed 0/);
    assert.throws(() => select(observation([frame(), frame({ frameId: 'frame-2' })]), () => true, 'owner'), /observed 2/);
    assert.equal(
        select(observation([frame({ detached: true }), frame({ frameId: 'frame-2' })]), () => true, 'owner').frameRecord.frameId,
        'frame-2',
    );
    assert.throws(
        () => chooseQuicksave(observation([frame({ controls: [{ ariaLabel: 'Resume quicksave', disabled: true }] })])),
        /observed 0/,
    );
    assert.throws(
        () => chooseQuicksave(observation([frame({ controls: [{ ariaLabel: 'Resume QuickSave', disabled: false }] })])),
        /observed 0/,
    );
    assert.throws(
        () => chooseQuicksave(observation([
            frame({ controls: [{ ariaLabel: 'Resume quicksave', disabled: false }] }),
            frame({ frameId: 'frame-2', controls: [{ ariaLabel: 'Resume quicksave', disabled: false }] }),
        ])),
        /observed 2/,
    );
    const route = extractFunctionSource(harness, 'completeObservedSaveLoadRoute');
    assert.match(route, /Diagnostic Save\/load restored identity mismatch/);
});

test('Save/load pause route fails closed for absent owners, failed route, stale readiness, and second-pause failure', async () => {
    const harness = readHarness();
    const openPause = runInNewContext(
        `(async ${extractFunctionSource(harness, 'openSaveLoadPause')})`,
    ) as (frame: unknown, turn: number, stage: string, deps: Record<string, unknown>) => Promise<void>;
    const makeFrame = ({ warroom = false, tactical = true, saveVisible = false, waitFails = false } = {}) => {
        const saveButton = {
            isVisible: async () => saveVisible,
            waitFor: async () => { if (waitFails) throw new Error('not visible'); },
        };
        return {
            locator: (selector: string) => ({
                first() { return this; },
                isVisible: async () => selector.includes('warroom-shell') ? warroom : tactical,
                press: async () => {},
            }),
            getByRole: () => saveButton,
        };
    };
    const deps = (overrides: Record<string, unknown> = {}) => ({
        clearOpenSurfaces: async () => 0,
        clickTestId: async () => true,
        waitForTacticalMapReady: async () => true,
        tacticalMapReadinessDiagnostics: async () => ({}),
        ...overrides,
    });

    await assert.rejects(() => openPause(makeFrame({ tactical: false }), 1, 'initial', deps()), /absent or hidden/);
    await assert.rejects(() => openPause(makeFrame({ warroom: true }), 1, 'initial', deps({ clickTestId: async () => false })), /could not click/);
    await assert.rejects(() => openPause(makeFrame(), 1, 'initial', deps({ waitForTacticalMapReady: async () => false })), /did not become interaction-ready/);
    await assert.rejects(() => openPause(makeFrame({ waitFails: true }), 1, 'post-save', deps()), /Second pause did not open/);
});

test('events proposals and peace plans resolve only through exact visible UI controls', () => {
    const harness = readHarness();

    assert.doesNotMatch(harness, /window\.awwv\?\.respondToEventDecision|window\.awwv\.respondToEventDecision/);
    assert.doesNotMatch(harness, /window\.awwv\?\.acceptProposal|window\.awwv\.acceptProposal/);
    assert.doesNotMatch(harness, /window\.awwv\?\.resolvePeacePlan|window\.awwv\.resolvePeacePlan/);
    assert.match(harness, /async function acceptStrategicProposalThroughUi/);
    assert.match(harness, /const playerProposals = proposals\.filter/);
    assert.match(harness, /unresolvedProposalCount: unresolvedPlayerProposals\.length/);
    assert.match(harness, /command:review-proposal:\$\{reviewId\}/);
    assert.match(harness, /event-decision-response/);
    assert.match(harness, /clickExactVisibleButton\(frame, responseLabel/);
});

test('historical operation proposals route through the blocking Decision category without changing their stable card id', () => {
    const harness = readHarness();
    const proposalDecisionRoomRoute = loadFunction<(
        reviewId: string,
        proposedAction: string | null,
    ) => { categoryId: string; priorityCardId: string; actionLabel: string }>(
        harness,
        'proposalDecisionRoomRoute',
    );

    assert.deepEqual(
        proposalDecisionRoomRoute(
            'PROP_JACKAL',
            'HISTORICAL_OP:preplanned:hvo_southeast_herzegovina:Operation Jackal',
        ),
        {
            categoryId: 'war_direction',
            priorityCardId: 'command:review-proposal:PROP_JACKAL',
            actionLabel: 'Accept',
        },
    );
    assert.deepEqual(
        proposalDecisionRoomRoute('PROP_ORDINARY', 'APPROVE_OP:hvo_central_bosnia:plan_1'),
        {
            categoryId: 'command',
            priorityCardId: 'command:review-proposal:PROP_ORDINARY',
            actionLabel: 'Accept',
        },
    );
    assert.deepEqual(
        proposalDecisionRoomRoute('review-opportunity', 'OPPORTUNITY:opportunity-1'),
        {
            categoryId: 'war_direction',
            priorityCardId: 'opportunity:opportunity-1',
            actionLabel: 'Authorize',
        },
    );
});

test('stack-picker proof closes formation detail through a bounded exact UI control', () => {
    const harness = readHarness();
    const stackPickerSource = extractFunctionSource(harness, 'exerciseFormationStackPicker');

    assert.match(stackPickerSource, /formation-detail-close/);
    assert.match(stackPickerSource, /detailClose\.click\(\{ timeout: 5000 \}\)/);
    assert.match(stackPickerSource, /detailPanel\.waitFor\(\{ state: 'detached', timeout: 5000 \}\)/);
    assert.doesNotMatch(stackPickerSource, /close\.click\(\)/);
});

test('stack-picker proof records an explicit not-applicable receipt when no visible stack exists', () => {
    const harness = readHarness();
    const stackPickerSource = extractFunctionSource(harness, 'exerciseFormationStackPicker');

    assert.match(stackPickerSource, /if \(badgeCount < 1\) \{/);
    assert.match(stackPickerSource, /status:\s*'not-applicable'/);
    assert.match(stackPickerSource, /reason:\s*'no-visible-formation-stack-badge'/);
    assert.match(stackPickerSource, /`\$\{labelPrefix\}-not-applicable`/);
    assert.match(stackPickerSource, /return notApplicableReceipt/);
    assert.doesNotMatch(stackPickerSource, /if \(badgeCount < 1\) throw/);
    assert.match(stackPickerSource, /No player-hit-testable formation stack badge was available/);
});

test('fresh RS ordinary proposal acceptance requires every visible ready-plan dossier field', () => {
    const harness = readHarness();
    const assertOrdinaryProposalDossierTruth = loadFunction<(
        reviewId: string,
        dossierText: string,
    ) => { reviewId: string; visibleFields: string[]; rawTechnicalIds: string[] }>(
        harness,
        'assertOrdinaryProposalDossierTruth',
    );
    const dossierLines = [
        'Command: Drina Corps',
        'Objective: Relieve Zvornik',
        'Targets: Zvornik',
        'Forces: 1st Guards Brigade, 2nd Infantry Brigade',
        'Concentration/readiness: 100% concentrated; ready',
        'Intelligence: 72% confidence',
        'Supply: 80% continuity confidence',
        'Risk: High pressure; 65% plan viability',
        'Recommendation: Authorize launch',
        'Deadline: Before the next turn advances',
        'Force ratio: Unreported',
        'Opportunity cost: Unreported',
    ];

    const valid = assertOrdinaryProposalDossierTruth('PROP_RS_ordinary', dossierLines.join('\n'));
    assert.equal(valid.reviewId, 'PROP_RS_ordinary');
    assert.deepEqual([...valid.visibleFields], [
        'command',
        'objective',
        'targets',
        'forces',
        'readiness',
        'intel',
        'supply',
        'risk',
        'recommendation',
        'deadline',
        'ratio',
        'opportunityCost',
    ]);
    assert.deepEqual([...valid.rawTechnicalIds], []);

    for (const [index, field] of valid.visibleFields.entries()) {
        const incomplete = dossierLines.filter((_, lineIndex) => lineIndex !== index).join('\n');
        assert.throws(
            () => assertOrdinaryProposalDossierTruth('PROP_RS_incomplete', incomplete),
            new RegExp(`missing dossier fields: .*${field}`, 'i'),
        );
    }
});

test('fresh RS ordinary proposal acceptance rejects raw IDs before clicking Accept', () => {
    const harness = readHarness();
    const assertOrdinaryProposalDossierTruth = loadFunction<(
        reviewId: string,
        dossierText: string,
    ) => unknown>(harness, 'assertOrdinaryProposalDossierTruth');
    const baseLines = [
        'Command: Drina Corps',
        'Objective: Relieve Zvornik',
        'Targets: Zvornik',
        'Forces: 1st Guards Brigade',
        'Concentration/readiness: 100% concentrated; ready',
        'Intelligence: 72% confidence',
        'Supply: 80% continuity confidence',
        'Risk: High pressure; 65% plan viability',
        'Recommendation: Authorize launch',
        'Deadline: Before the next turn advances',
        'Force ratio: Unreported',
        'Opportunity cost: Unreported',
    ];
    const rawCases = [
        'Command: vrs_drina_corps',
        'Command: 1st_corps',
        'Objective: op:zvornik:zvornik_1',
        'Objective: plan-internal-30',
        'Forces: elite_internal_brigade',
        'Recommendation: APPROVE_OP:vrs_drina_corps:plan_internal_30',
    ];

    for (const rawLine of rawCases) {
        const field = rawLine.slice(0, rawLine.indexOf(':'));
        const dossier = baseLines
            .map((line) => line.startsWith(`${field}:`) ? rawLine : line)
            .join('\n');
        assert.throws(
            () => assertOrdinaryProposalDossierTruth('PROP_RS_raw', dossier),
            /raw technical IDs/i,
        );
    }

    const acceptSource = extractFunctionSource(harness, 'acceptStrategicProposalThroughUi');
    const surfaceSource = extractFunctionSource(harness, 'handleCurrentSurface');
    assert.match(acceptSource, /proposedAction\.startsWith\('APPROVE_OP:'\)/);
    assert.match(
        acceptSource,
        /assertOrdinaryProposalDossierTruth[\s\S]*clickExactVisibleButton\(host, actionLabel/,
        'the dossier gate must run before the visible Accept action',
    );
    assert.match(acceptSource, /decision-room-active-dossier/);
    assert.match(acceptSource, /data-card-id="\$\{priorityCardId\}"/);
    assert.equal(
        (surfaceSource.match(/requireOrdinaryProposalDossierTruth:\s*faction === 'RS'/g) ?? []).length,
        2,
        'both proposal acceptance paths must enforce dossier truth on fresh and resumed RS runs',
    );
    assert.doesNotMatch(surfaceSource, /requireOrdinaryProposalDossierTruth:\s*faction === 'RS' && !resumeSavePath/);
    assert.match(acceptSource, /options\.onDossierOpen/);
});

test('player projection and canonical autosave hashes stay independently non-null and unchanged through final evidence', () => {
    const harness = readHarness();
    const assertStableProjectionAndAutosaveHashes = loadFunction<(
        label: string,
        baselineStateHash: string | null,
        baselineAutosaveHash: string | null,
        stateHash: string | null,
        autosaveHash: string | null,
    ) => Record<string, string | boolean>>(harness, 'assertStableProjectionAndAutosaveHashes');

    assert.throws(
        () => assertStableProjectionAndAutosaveHashes('null hash', null, 'a', 'a', 'a'),
        /non-null projection\/autosave hashes/,
    );
    assert.throws(
        () => assertStableProjectionAndAutosaveHashes('projection mutation', 'a', 'b', 'c', 'b'),
        /player-visible projection changed/,
    );
    assert.throws(
        () => assertStableProjectionAndAutosaveHashes('autosave mutation', 'a', 'b', 'a', 'c'),
        /canonical autosave changed/,
    );
    assert.deepEqual(
        { ...assertStableProjectionAndAutosaveHashes('stable hashes', 'a', 'b', 'a', 'b') },
        { stateHash: 'a', autosaveHash: 'b', projectionMatchesCanonicalAutosave: false },
    );
    assert.match(harness, /postEvidenceHashProof/);
    assert.match(harness, /playthrough-final[\s\S]*assertStableProjectionAndAutosaveHashes/);
});

test('final evidence exercises every exposed corps and the direct Records route', () => {
    const harness = readHarness();
    const armyHqDeepDive = extractFunctionSource(harness, 'armyHqDeepDive');
    const surfaceTour = extractFunctionSource(harness, 'surfaceTour');

    assert.match(armyHqDeepDive, /i < corpsButtons/);
    assert.doesNotMatch(armyHqDeepDive, /Math\.min\(3, corpsButtons\)/);
    assert.match(armyHqDeepDive, /let corpsClickError = null/);
    assert.match(armyHqDeepDive, /data-expanded-corps-id="\$\{corpsId\}"/);
    assert.match(armyHqDeepDive, /if \(corpsClickError && !corpsExpanded\) throw corpsClickError/);
    assert.match(surfaceTour, /restore exact War Map after Army HQ handoff/);
    assert.match(surfaceTour, /waitForTacticalMapReady/);
    assert.ok(
        surfaceTour.indexOf('restore exact War Map after Army HQ handoff')
        < surfaceTour.indexOf("toolbar-route-records"),
        'surface tour must restore the field route before waiting for its Records control',
    );
    assert.match(surfaceTour, /clickTestId\(frame, 'toolbar-route-records'/);
    assert.match(surfaceTour, /Direct Records route/);
});

test('all runs clear mandatory event decisions before any initial free navigation', () => {
    const harness = readHarness();
    const preflight = extractFunctionSource(harness, 'resolvePendingEventDecisionsBeforeFreeNavigation');
    const preflightCallIndex = harness.indexOf('await resolvePendingEventDecisionsBeforeFreeNavigation(page, frame, faction, events);');
    const freeNavigationBranchIndex = harness.indexOf('if (!skipInitialTour)', preflightCallIndex);

    assert.match(preflight, /pendingEventDecisionIds/);
    assert.match(preflight, /openPendingEventDecisionFromDesk/);
    assert.match(preflight, /event-decision-response/);
    assert.doesNotMatch(preflight, /unresolvedProposalCount|acceptStrategicProposalThroughUi/);
    assert.ok(preflightCallIndex >= 0);
    assert.ok(freeNavigationBranchIndex > preflightCallIndex);
    assert.match(harness.slice(preflightCallIndex), /surfaceTour\(page, frame, faction, events\)/);
});

test('strategic proposal selection excludes proposals already resolved through the UI', () => {
    const harness = readHarness();
    const isUnresolvedPlayerProposal = loadFunction<(proposal: Record<string, unknown>) => boolean>(
        harness,
        'isUnresolvedPlayerProposal',
    );
    const readState = extractFunctionSource(harness, 'readState');

    assert.equal(isUnresolvedPlayerProposal({ accepted: null, opportunity_decision: null, resolved_turn: null }), true);
    assert.equal(isUnresolvedPlayerProposal({ accepted: true, opportunity_decision: null, resolved_turn: 0 }), false);
    assert.equal(isUnresolvedPlayerProposal({ accepted: false, opportunity_decision: null, resolved_turn: 0 }), false);
    assert.equal(isUnresolvedPlayerProposal({ accepted: null, opportunity_decision: 'authorize', resolved_turn: 0 }), false);
    assert.match(readState, /const unresolvedPlayerProposals = sortUnresolvedPlayerProposals\(playerProposals\)/);
    assert.match(readState, /pendingProposals: unresolvedPlayerProposals/);
    assert.match(readState, /pendingProposalIds: unresolvedPlayerProposals/);
});

test('turn-zero strategic smoke does not claim staged autonomy should already be applied', () => {
    const harness = readHarness();

    assert.match(
        harness,
        /if \(strategicRun && maxTurns > 0 && playtest\.finalState\?\.autonomyLevel !== 1\)/,
    );
});

test('strategic setup predicts the Assisted transition from validated pre-click state', () => {
    const harness = readHarness();
    const predictStrategicAutonomySelection = loadFunction<(
        priorLevel: unknown,
        targetLevel: unknown,
    ) => { autonomyLevel: number; autonomyLevelPending: number | null }>(harness, 'predictStrategicAutonomySelection');
    const assertStrategicAutonomyState = loadFunction<(
        label: string,
        state: { autonomyLevel?: number; autonomyLevelPending?: number | null } | null,
        expectedLevel: number,
        expectedPending: number | null,
    ) => Record<string, number | null>>(harness, 'assertStrategicAutonomyState');

    assert.deepEqual({ ...predictStrategicAutonomySelection(2, 1) }, { autonomyLevel: 1, autonomyLevelPending: null });
    assert.deepEqual({ ...predictStrategicAutonomySelection(1, 1) }, { autonomyLevel: 1, autonomyLevelPending: null });
    assert.deepEqual({ ...predictStrategicAutonomySelection(0, 1) }, { autonomyLevel: 0, autonomyLevelPending: 1 });
    for (const invalidPrior of [undefined, null, Number.NaN, 1.5, -1, 4, '2']) {
        assert.throws(() => predictStrategicAutonomySelection(invalidPrior, 1), /prior autonomy level.*invalid/i);
    }
    assert.throws(
        () => assertStrategicAutonomyState('wrong active', { autonomyLevel: 2, autonomyLevelPending: null }, 1, null),
        /wrong active.*level 1/i,
    );
    assert.throws(
        () => assertStrategicAutonomyState('wrong pending', { autonomyLevel: 1, autonomyLevelPending: 1 }, 1, null),
        /wrong pending.*pending none/i,
    );
    const readState = extractFunctionSource(harness, 'readState');
    assert.match(readState, /autonomyLevel: raw\.meta\?\.autonomy_level \?\? null/);
    const configureStrategicRun = extractFunctionSource(harness, 'configureStrategicRun');
    const priorRead = configureStrategicRun.indexOf('const autonomyBeforeSelection');
    const prediction = configureStrategicRun.indexOf('const autonomyExpectation');
    const click = configureStrategicRun.indexOf("clickTestId(frame, 'autonomy-level-1'");
    const observedRead = configureStrategicRun.indexOf('const configuredState');
    assert.ok(priorRead >= 0 && priorRead < prediction && prediction < click && click < observedRead);
    assert.match(configureStrategicRun, /assertStrategicAutonomyState/);
    assert.match(extractFunctionSource(harness, 'playTurns'), /after\?\.turn === 1[\s\S]*assertStrategicAutonomyState/);
});

test('fresh RS 52-week runs require all eligible event decision receipts', () => {
    const harness = readHarness();
    const requiredRsEventReceiptIds = loadFunction<(
        faction: string,
        targetTurn: number,
        isResume: boolean,
    ) => string[]>(harness, 'requiredRsEventReceiptIds');

    assert.deepEqual([...requiredRsEventReceiptIds('RS', 52, false)], [
        'rs_strategic_goals',
        'rs_paramilitary_policy_1992',
        'drina_cleansing_decision_1992',
        'concentration_camps_revealed_1992',
    ]);
    assert.deepEqual([...requiredRsEventReceiptIds('RS', 51, false)], []);
    assert.deepEqual([...requiredRsEventReceiptIds('RS', 52, true)], []);
    assert.match(harness, /eventDecisionReceiptIds/);
    assert.match(harness, /Missing required RS event receipts/);
});

test('player proposals are selected in stable identity order and exact resolution is proven', () => {
    const harness = readHarness();
    const strictAsciiCompare = loadFunction<(left: string, right: string) => number>(harness, 'strictAsciiCompare');
    const isUnresolvedPlayerProposal = loadFunction<(proposal: Record<string, unknown>) => boolean>(
        harness,
        'isUnresolvedPlayerProposal',
    );
    const sortUnresolvedPlayerProposals = loadFunction<(
        proposals: Array<Record<string, unknown>>,
    ) => Array<Record<string, unknown>>>(harness, 'sortUnresolvedPlayerProposals', {
        strictAsciiCompare,
        isUnresolvedPlayerProposal,
    });
    const assertExactProposalResolution = loadFunction<(
        proposalId: string,
        before: Array<Record<string, unknown>>,
        after: Array<Record<string, unknown>>,
    ) => Record<string, unknown>>(harness, 'assertExactProposalResolution');

    const sorted = sortUnresolvedPlayerProposals([
        { id: 'z', proposed_action: 'APPROVE_OP:z', accepted: null, resolved_turn: null },
        { id: 'a', proposed_action: 'APPROVE_OP:a', accepted: null, resolved_turn: null },
        { id: 'm', proposed_action: 'APPROVE_OP:m', accepted: true, resolved_turn: 2 },
    ]);
    assert.deepEqual(sorted.map((proposal) => proposal.id), ['a', 'z']);

    const before = [{ id: 'a', action: 'APPROVE_OP:a', unresolved: true }];
    const receipt = assertExactProposalResolution('a', before, [{ id: 'a', action: 'APPROVE_OP:a', unresolved: false, accepted: true }]);
    assert.equal(receipt.id, 'a');
    assert.throws(
        () => assertExactProposalResolution('a', before, [{ id: 'a', action: 'APPROVE_OP:a', unresolved: true }]),
        /Exact proposal remained unresolved/,
    );
    assert.throws(
        () => assertExactProposalResolution('a', before, [{ id: 'b', action: 'APPROVE_OP:b', unresolved: false }]),
        /Exact proposal disappeared without a resolution record/,
    );
    assert.match(extractFunctionSource(harness, 'handleCurrentSurface'), /assertExactProposalResolution/);
});

test('historical operation authorization is handled in every run mode without inventing ordinary proposal decisions', () => {
    const harness = readHarness();
    const strictAsciiCompare = loadFunction<(left: string, right: string) => number>(harness, 'strictAsciiCompare');
    const isUnresolvedPlayerProposal = loadFunction<(proposal: Record<string, unknown>) => boolean>(
        harness,
        'isUnresolvedPlayerProposal',
    );
    const sortUnresolvedPlayerProposals = loadFunction<(
        proposals: Array<Record<string, unknown>>,
    ) => Array<Record<string, unknown>>>(harness, 'sortUnresolvedPlayerProposals', {
        strictAsciiCompare,
        isUnresolvedPlayerProposal,
    });
    const selectProposalForQa = loadFunction<(
        proposals: Array<Record<string, unknown>>,
        allowOrdinary: boolean,
    ) => Record<string, unknown> | null>(harness, 'selectProposalForQa', {
        sortUnresolvedPlayerProposals,
    });
    const proposals = [
        { id: 'a-ordinary', proposed_action: 'APPROVE_OP:a', accepted: null, resolved_turn: null },
        { id: 'z-historical', proposed_action: 'HISTORICAL_OP:triggered:hvo_corps:Operation Jackal', accepted: null, resolved_turn: null },
    ];

    assert.equal(selectProposalForQa(proposals, false)?.id, 'z-historical');
    assert.equal(selectProposalForQa([proposals[0]], false), null);
    assert.equal(selectProposalForQa([proposals[0]], true)?.id, 'a-ordinary');
    assert.match(extractFunctionSource(harness, 'handleCurrentSurface'), /selectProposalForQa/);
});

test('visible event response is bound to a new exact player receipt', () => {
    const harness = readHarness();
    const assertExactEventDecisionReceipt = loadFunction<(
        eventId: string,
        before: Array<Record<string, unknown>>,
        after: Array<Record<string, unknown>>,
    ) => Record<string, unknown>>(harness, 'assertExactEventDecisionReceipt');

    const receipt = assertExactEventDecisionReceipt('event-a', [], [{
        eventId: 'event-a',
        responseId: 'response-1',
        decisionSource: 'player',
        faction: 'RS',
        turn: 3,
    }]);
    assert.equal(receipt.responseId, 'response-1');
    assert.throws(
        () => assertExactEventDecisionReceipt('event-a', [], [{
            eventId: 'event-a', responseId: 'response-1', decisionSource: 'bot', turn: 3,
        }]),
        /player decision receipt/,
    );
    assert.throws(
        () => assertExactEventDecisionReceipt('event-a', [], [{
            eventId: 'event-b', responseId: 'response-1', decisionSource: 'player', turn: 3,
        }]),
        /exact event decision receipt/,
    );
    assert.match(extractFunctionSource(harness, 'handleCurrentSurface'), /responseLabel/);
    assert.match(extractFunctionSource(harness, 'handleCurrentSurface'), /assertExactEventDecisionReceipt/);
});

test('durable decision histories require a new exact identity and expected player outcome', () => {
    const harness = readHarness();
    const strictAsciiCompare = loadFunction<(left: string, right: string) => number>(harness, 'strictAsciiCompare');
    const decisionReceiptKey = loadFunction<(receipt: Record<string, unknown>) => string>(
        harness,
        'decisionReceiptKey',
        { strictAsciiCompare },
    );
    const assertNewExactDecisionReceipt = loadFunction<(
        family: string,
        identityField: string,
        identity: string,
        before: Array<Record<string, unknown>>,
        after: Array<Record<string, unknown>>,
        expected: Record<string, unknown>,
    ) => Record<string, unknown>>(harness, 'assertNewExactDecisionReceipt', { decisionReceiptKey, strictAsciiCompare });

    const receipt = assertNewExactDecisionReceipt(
        'convoy',
        'id',
        'convoy-a',
        [],
        [{ id: 'convoy-a', decision: 'allow', decidedBy: 'player', turn: 4 }],
        { decision: 'allow', decidedBy: 'player' },
    );
    assert.equal(receipt.id, 'convoy-a');
    assert.throws(
        () => assertNewExactDecisionReceipt(
            'convoy',
            'id',
            'convoy-a',
            [{ id: 'convoy-a', decision: 'allow', decidedBy: 'player', turn: 4 }],
            [{ id: 'convoy-a', decision: 'allow', decidedBy: 'player', turn: 4 }],
            { decision: 'allow', decidedBy: 'player' },
        ),
        /No new exact convoy decision receipt/,
    );
    assert.throws(
        () => assertNewExactDecisionReceipt(
            'officer',
            'eventId',
            'officer-a',
            [],
            [{ eventId: 'officer-b', decision: 'acknowledged', faction: 'RS', turn: 4 }],
            { decision: 'acknowledged', faction: 'RS' },
        ),
        /No new exact officer decision receipt/,
    );
    assert.throws(
        () => assertNewExactDecisionReceipt(
            'reserve',
            'requestId',
            'reserve-a',
            [],
            [{ requestId: 'reserve-a', outcome: 'accepted', decidedBy: 'army_ai', turn: 4 }],
            { outcome: 'accepted', decidedBy: 'player' },
        ),
        /receipt field decidedBy mismatch/,
    );

    const readState = extractFunctionSource(harness, 'readState');
    assert.match(readState, /peacePlanDecisionReceipts/);
    assert.match(readState, /reserveDecisionReceipts/);
    assert.match(readState, /convoyDecisionReceipts/);
    assert.match(readState, /officerDecisionReceipts/);
    assert.match(readState, /paramilitaryDecisionReceipts/);
});

test('canonical autosave receipt projection exposes only the player decision ledgers', () => {
    const harness = readHarness();
    const strictAsciiCompare = loadFunction<(left: string, right: string) => number>(harness, 'strictAsciiCompare');
    const decisionReceiptKey = loadFunction<(receipt: Record<string, unknown>) => string>(
        harness,
        'decisionReceiptKey',
        { strictAsciiCompare },
    );
    const projectCanonicalDecisionReceipts = loadFunction<(
        state: Record<string, any>,
        faction: string,
    ) => Record<string, Array<Record<string, unknown>>>>(
        harness,
        'projectCanonicalDecisionReceipts',
        { decisionReceiptKey, strictAsciiCompare },
    );

    const receipts = projectCanonicalDecisionReceipts({
        military: {
            negotiation: {
                peace_plan_history: [{
                    plan_id: 'vance_owen',
                    turn_offered: 40,
                    responses: { RS: 'rejected', RBiH: 'accepted' },
                    resolved: true,
                }],
            },
            reserve_request_history: [
                { request_id: 'reserve-rs', faction: 'RS', outcome: 'accepted', decided_by: 'player', turn: 7 },
                { request_id: 'reserve-rbih', faction: 'RBiH', outcome: 'accepted', decided_by: 'player', turn: 7 },
            ],
            convoy_decision_history: [
                { id: 'convoy-rs', route_faction: 'RS', target_faction: 'RBiH', decision: 'allow', decided_by: 'player', turn: 8 },
                { id: 'convoy-rbih', route_faction: 'RBiH', target_faction: 'RS', decision: 'block', decided_by: 'player', turn: 8 },
            ],
            officer_decision_history: [
                { id: 'officer-rs', event_id: 'event-rs', faction: 'RS', decision: 'acknowledged', turn: 9 },
                { id: 'officer-rbih', event_id: 'event-rbih', faction: 'RBiH', decision: 'acknowledged', turn: 9 },
            ],
        },
        paramilitary_decision_history: [
            { id: 'para-rs', target_osid: 'target-rs', faction: 'RS', decision: 'deny', turn: 2 },
            { id: 'para-rbih', target_osid: 'target-rbih', faction: 'RBiH', decision: 'deny', turn: 2 },
        ],
    }, 'RS');

    assert.deepEqual(receipts.peacePlanDecisionReceipts.map((row) => row.planId), ['vance_owen']);
    assert.deepEqual(receipts.reserveDecisionReceipts.map((row) => row.requestId), ['reserve-rs']);
    assert.deepEqual(receipts.convoyDecisionReceipts.map((row) => row.id), ['convoy-rs']);
    assert.deepEqual(receipts.officerDecisionReceipts.map((row) => row.eventId), ['event-rs']);
    assert.deepEqual(receipts.paramilitaryDecisionReceipts.map((row) => row.targetOsid), ['target-rs']);
    assert.match(extractFunctionSource(harness, 'readState'), /readCanonicalDecisionReceiptsFromAutosave/);
});

test('officer handling opens the exact grouped matter and attributes its durable receipt', () => {
    const harness = readHarness();
    const handler = extractFunctionSource(harness, 'handleCurrentSurface');
    const readState = extractFunctionSource(harness, 'readState');
    const officerResponseLabel = loadFunction<(matter: { eventType?: string | null }) => string>(
        harness,
        'officerResponseLabel',
    );

    assert.match(readState, /pendingOfficerMatterItems/);
    assert.match(readState, /projectPendingOfficerMatterItems/);
    assert.match(handler, /pendingOfficerMatterItems\?\.\[0\]/);
    assert.match(handler, /openDeskInboxItem\(frame, 'officer_event', officerMatter\.inboxItemId\)/);
    assert.equal(officerResponseLabel({ eventType: 'officer_available' }), 'File availability notice');
    assert.equal(officerResponseLabel({ eventType: 'replacement_suggested' }), 'Keep current commander');
    assert.equal(officerResponseLabel({ eventType: 'order_pushback' }), 'Acknowledge');
    assert.match(handler, /const officerResponse = selectOfficerSuccessionResponse\(officerMatter, officerSuccessionPolicy\)/);
    assert.match(handler, /const responseLabel = officerResponse\.responseLabel/);
    assert.match(handler, /waitForNewExactDecisionReceipt\([\s\S]*?'officer'[\s\S]*?'eventId'[\s\S]*?officerEventId/);
    assert.match(extractFunctionSource(harness, 'waitForNewExactDecisionReceipt'), /readState\(frame\)/);
    assert.doesNotMatch(
        handler.slice(handler.indexOf("if ((pendingState?.pendingOfficerEvents ?? 0) > 0)")),
        /openDeskInboxItem\(frame, 'officer_event'\)/,
        'officer routing must never fall back to the first family-level card',
    );
});

test('officer succession policy is explicit, versioned, defaults to keep, and rejects unknown values', () => {
    const parse = loadFunction<(argv: string[]) => { requested: string; version: number; explicit: boolean }>(
        readHarness(),
        'parseOfficerSuccessionPolicy',
    );

    assert.deepEqual(parse(['node', 'harness']), { requested: 'keep', version: 1, explicit: false });
    assert.deepEqual(
        parse(['node', 'harness', '--officer-succession-policy=historical']),
        { requested: 'historical', version: 1, explicit: true },
    );
    assert.deepEqual(
        parse(['node', 'harness', '--officer-succession-policy=keep']),
        { requested: 'keep', version: 1, explicit: true },
    );
    assert.throws(
        () => parse(['node', 'harness', '--officer-succession-policy=automatic']),
        /Unknown officer succession policy: automatic/,
    );
    assert.throws(
        () => parse(['node', 'harness', '--officer-succession-policy=keep', '--officer-succession-policy=historical']),
        /exactly once/,
    );
});

test('historical officer succession strategy accepts only the exact live player offer and preserves default keep', () => {
    const harness = readHarness();
    const fixture = JSON.parse(readFileSync(join(
        process.cwd(),
        'tmp',
        'player-bot-capability-parity-20261024',
        'native104-failure-inventory-02',
        'failure-state44.json',
    ), 'utf8'));
    const events = fixture.military.pending_officer_events;
    const officerData = fixture.military.named_officer_data;
    const projected = projectHarnessOfficerMatters(harness, events, fixture.meta.player_faction, officerData);
    const matter = projected.find((item) => item.eventId === 'replacement:arbih_knez:arbih_2nd_corps:arbih_sadic');
    assert.ok(matter);
    assert.deepEqual(matter, {
        inboxItemId: 'officer:replacement_suggested:arbih_knez',
        eventId: 'replacement:arbih_knez:arbih_2nd_corps:arbih_sadic',
        eventType: 'replacement_suggested',
        officerId: 'arbih_sadic',
        officerName: 'Hazim Šadić',
        currentCommanderId: 'arbih_knez',
        currentCommanderName: 'Željko Knez',
        corpsId: 'arbih_2nd_corps',
        overrideAction: null,
    });

    const choose = loadFunction<(
        officerMatter: Record<string, unknown>,
        policy: { requested: string; version: number },
    ) => Record<string, unknown>>(harness, 'selectOfficerSuccessionResponse');
    assert.deepEqual(choose(matter, { requested: 'keep', version: 1 }), {
        responseLabel: 'Keep current commander',
        expectedDecision: 'acknowledged',
        route: 'desk',
        policy: 'keep',
        policyVersion: 1,
        candidateOfficerId: 'arbih_sadic',
    });
    assert.deepEqual(choose(matter, { requested: 'historical', version: 1 }), {
        responseLabel: 'Appoint Historical Successor',
        expectedDecision: 'replacement_accepted',
        route: 'personnel',
        policy: 'historical',
        policyVersion: 1,
        candidateOfficerId: 'arbih_sadic',
    });

    const exactEvent = events.find((event: Record<string, unknown>) => event.event_id === matter.eventId);
    assert.ok(exactEvent);
    const foreign = { ...exactEvent, event_id: 'foreign-replacement', faction: 'RS' };
    assert.equal(projectHarnessOfficerMatters(harness, [foreign], 'RBiH', officerData).length, 0);
    assert.equal(projectHarnessOfficerMatters(harness, [{ ...exactEvent, acknowledged: true }], 'RBiH', officerData).length, 0);
    assert.throws(
        () => choose({ ...matter, officerId: null }, { requested: 'historical', version: 1 }),
        /exact proposed officer/,
    );
});

test('historical officer succession handler uses the owned personnel surface and exact durable appointment receipt', () => {
    const harness = readHarness();
    const handler = extractFunctionSource(harness, 'handleCurrentSurface');
    const clickOffer = extractFunctionSource(harness, 'clickHistoricalOfficerSuccessionOffer');
    assert.match(clickOffer, /Open personnel/);
    assert.match(clickOffer, /Appoint Historical Successor/);
    assert.match(clickOffer, /officerMatter\.officerName/);
    assert.match(clickOffer, /officerMatter\.currentCommanderName/);
    assert.match(handler, /clickHistoricalOfficerSuccessionOffer/);
    assert.match(handler, /replacement_accepted/);
    assert.match(handler, /newOfficerId: officerMatter\.officerId/);
    assert.match(handler, /outgoingOfficerId: officerMatter\.currentCommanderId/);
    assert.match(handler, /officerSuccessionChoiceTranscript\.push/);
    assert.match(handler, /waitForNewExactDecisionReceipt/);
});

test('historical officer succession receipt carries exact candidate and incumbent and rejects a stale replay', () => {
    const harness = readHarness();
    const strictAsciiCompare = loadFunction<(left: string, right: string) => number>(harness, 'strictAsciiCompare');
    const decisionReceiptKey = loadFunction<(receipt: Record<string, unknown>) => string>(
        harness,
        'decisionReceiptKey',
        { strictAsciiCompare },
    );
    const project = loadFunction<(
        state: Record<string, unknown>,
        faction: string,
    ) => Record<string, Array<Record<string, unknown>>>>(
        harness,
        'projectCanonicalDecisionReceipts',
        { decisionReceiptKey, strictAsciiCompare },
    );
    const assertReceipt = loadFunction<(
        family: string,
        identityField: string,
        identity: string,
        before: Array<Record<string, unknown>>,
        after: Array<Record<string, unknown>>,
        expected: Record<string, unknown>,
    ) => Record<string, unknown>>(
        harness,
        'assertNewExactDecisionReceipt',
        { decisionReceiptKey, strictAsciiCompare },
    );
    const eventId = 'replacement:arbih_knez:arbih_2nd_corps:arbih_sadic';
    const receipt = project({
        military: {
            officer_decision_history: [{
                id: `officer-decision:${eventId}`,
                event_id: eventId,
                event_type: 'replacement_suggested',
                faction: 'RBiH',
                decision: 'replacement_accepted',
                new_officer_id: 'arbih_sadic',
                outgoing_officer_id: 'arbih_knez',
                turn: 44,
            }],
        },
    }, 'RBiH').officerDecisionReceipts[0];
    const expected = {
        faction: 'RBiH',
        decision: 'replacement_accepted',
        newOfficerId: 'arbih_sadic',
        outgoingOfficerId: 'arbih_knez',
    };
    assert.deepEqual(assertReceipt('officer', 'eventId', eventId, [], [receipt], expected), receipt);
    assert.throws(
        () => assertReceipt('officer', 'eventId', eventId, [receipt], [receipt], expected),
        /No new exact officer decision receipt/,
    );
});

function projectHarnessOfficerMatters(
    harness: string,
    events: Array<Record<string, unknown>>,
    playerFaction: string,
    officerData: Array<Record<string, unknown>> = [],
) {
    const normalizeOfficerSubject = loadFunction<(value: unknown) => string | null>(harness, 'normalizeOfficerSubject');
    const officerEventDedupeKey = loadFunction<(event: Record<string, unknown>) => string>(
        harness,
        'officerEventDedupeKey',
        { normalizeOfficerSubject },
    );
    const strictAsciiCompare = loadFunction<(left: string, right: string) => number>(harness, 'strictAsciiCompare');
    const project = loadFunction<(
        input: Array<Record<string, unknown>>,
        faction: string,
        officerData?: Array<Record<string, unknown>>,
    ) => Array<Record<string, unknown>>>(
        harness,
        'projectPendingOfficerMatterItems',
        { officerEventDedupeKey, strictAsciiCompare },
    );
    return project(events, playerFaction, officerData);
}

function productionOfficerItems(events: Array<Record<string, unknown>>, playerFaction = 'RBiH') {
    return deriveInboxItems({
        label: `${playerFaction} officer fixture`,
        turn: 44,
        phase: 'war',
        player_faction: playerFaction,
        formations: [],
        militiaPools: [],
        controlBySettlement: {},
        statusBySettlement: {},
        brigadeAorByFormationId: {},
        attackOrders: [],
        aorOrders: [],
        recentControlEvents: [],
        allControlEvents: [],
        displacementEventLog: [],
        battlesByOsid: {},
        movementsByOsid: {},
        supplyTransitionsByOsid: {},
        historicalEventsByTurn: [],
        pressureWarning: false,
        latestTurnSummary: null,
        turnSummaries: [],
        pendingOfficerEvents: events,
    } as unknown as LoadedGameState, null).filter((item) => item.type === 'officer_event');
}

test('officer harness projects the exact turn-44 replacement card and event identity from production input', () => {
    const events = [{
        acknowledged: false,
        corps_id: 'arbih_2nd_corps',
        current_commander_id: 'arbih_knez',
        event_id: 'replacement:arbih_knez:arbih_2nd_corps:arbih_sadic',
        faction: 'RBiH',
        officer_id: 'arbih_sadic',
        turn: 44,
        type: 'replacement_suggested',
    }];
    const production = productionOfficerItems(events);
    const harness = readHarness();
    const normalizeOfficerSubject = loadFunction<(value: unknown) => string | null>(harness, 'normalizeOfficerSubject');
    const officerEventDedupeKey = loadFunction<(event: Record<string, unknown>) => string>(
        harness,
        'officerEventDedupeKey',
        { normalizeOfficerSubject },
    );

    assert.equal(production.length, 1);
    assert.equal(`officer:${officerEventDedupeKey(events[0])}`, production[0].id);
    const projected = projectHarnessOfficerMatters(harness, events, 'RBiH');
    assert.deepEqual(projected, [{
        inboxItemId: production[0].id,
        eventId: events[0].event_id,
        eventType: events[0].type,
        officerId: events[0].officer_id,
        officerName: null,
        currentCommanderId: events[0].current_commander_id,
        currentCommanderName: null,
        corpsId: events[0].corps_id,
        overrideAction: null,
    }]);
    assert.equal(production[0].id, 'officer:replacement_suggested:arbih_knez');
});

test('officer harness matches production identity fallbacks and chooses the newest replacement with a stable tie break', () => {
    const events = [
        { event_id: 'replacement-old', type: 'replacement_suggested', faction: 'RBiH', turn: 42, acknowledged: false, current_commander_id: 'incumbent-alpha', officer_id: 'candidate-old' },
        { event_id: 'replacement-z', type: 'replacement_suggested', faction: 'RBiH', turn: 44, acknowledged: false, current_commander_id: 'incumbent-alpha', officer_id: 'candidate-z' },
        { event_id: 'replacement-a', type: 'replacement_suggested', faction: 'RBiH', turn: 44, acknowledged: false, current_commander_id: 'incumbent-alpha', officer_id: 'candidate-a' },
        { event_id: 'replacement-name', type: 'replacement_suggested', faction: 'RBiH', turn: 44, acknowledged: false, current_commander_name: 'Incumbent Name', officer_id: 'candidate-name' },
        { event_id: 'replacement-candidate', type: 'replacement_suggested', faction: 'RBiH', turn: 44, acknowledged: false, officer_id: 'candidate-only' },
        { event_id: 'replacement-corps', type: 'replacement_suggested', faction: 'RBiH', turn: 44, acknowledged: false, corps_id: 'RBiH 3rd Corps' },
        { event_id: 'pushback-current', type: 'order_pushback', faction: 'RBiH', turn: 44, acknowledged: false, current_commander_id: 'current-only' },
    ];
    const production = productionOfficerItems(events);
    const projected = projectHarnessOfficerMatters(readHarness(), [...events].reverse(), 'RBiH');

    assert.deepEqual(
        projected.map((item) => item.inboxItemId),
        production.map((item) => item.id).sort(),
    );
    assert.equal(
        projected.find((item) => item.inboxItemId === 'officer:replacement_suggested:incumbent_alpha')?.eventId,
        'replacement-a',
    );
    assert.ok(projected.some((item) => item.inboxItemId === 'officer:replacement_suggested:incumbent_name'));
    assert.ok(projected.some((item) => item.inboxItemId === 'officer:replacement_suggested:candidate_only'));
    assert.ok(projected.some((item) => item.inboxItemId === 'officer:replacement_suggested:rbih_3rd_corps'));
    assert.ok(projected.some((item) => item.inboxItemId === 'officer:order_pushback:current_only'));
});

test('officer harness excludes foreign and resolved events and exact receipt validation rejects a stale identity', () => {
    const events = [
        { event_id: 'live-player', type: 'officer_available', faction: 'RBiH', turn: 44, acknowledged: false, officer_id: 'player-officer' },
        { event_id: 'resolved-player', type: 'officer_available', faction: 'RBiH', turn: 44, acknowledged: true, officer_id: 'resolved-officer' },
        { event_id: 'foreign-live', type: 'officer_available', faction: 'RS', turn: 44, acknowledged: false, officer_id: 'foreign-officer' },
    ];
    const harness = readHarness();
    const projected = projectHarnessOfficerMatters(harness, events, 'RBiH');
    assert.deepEqual(projected.map((item) => item.eventId), ['live-player']);

    const strictAsciiCompare = loadFunction<(left: string, right: string) => number>(harness, 'strictAsciiCompare');
    const decisionReceiptKey = loadFunction<(receipt: Record<string, unknown>) => string>(
        harness,
        'decisionReceiptKey',
        { strictAsciiCompare },
    );
    const assertReceipt = loadFunction<(
        family: string,
        identityField: string,
        identity: string,
        before: Array<Record<string, unknown>>,
        after: Array<Record<string, unknown>>,
        expected: Record<string, unknown>,
    ) => Record<string, unknown>>(
        harness,
        'assertNewExactDecisionReceipt',
        { decisionReceiptKey, strictAsciiCompare },
    );
    const receipt = { eventId: 'live-player', faction: 'RBiH', decision: 'acknowledged' };
    assert.deepEqual(assertReceipt('officer', 'eventId', 'live-player', [], [receipt], {
        faction: 'RBiH',
        decision: 'acknowledged',
    }), receipt);
    assert.throws(
        () => assertReceipt('officer', 'eventId', 'resolved-player', [], [receipt], { faction: 'RBiH' }),
        /No new exact officer decision receipt/,
    );
});

test('resume receipt baselines use the loaded save until canonical autosave persistence changes', () => {
    const harness = readHarness();
    const resolveDecisionReceiptAutosavePath = loadFunction<(
        canonicalPath: string,
        resumePath: string | null,
        canonicalHashAtLoad: string | null,
        currentCanonicalHash: string | null,
    ) => string>(harness, 'resolveDecisionReceiptAutosavePath');

    assert.equal(
        resolveDecisionReceiptAutosavePath('canonical.json', 'resume.json', 'stale-hash', 'stale-hash'),
        'resume.json',
    );
    assert.equal(
        resolveDecisionReceiptAutosavePath('canonical.json', 'resume.json', 'stale-hash', 'persisted-hash'),
        'canonical.json',
    );
    assert.equal(
        resolveDecisionReceiptAutosavePath('canonical.json', null, 'stale-hash', 'stale-hash'),
        'canonical.json',
    );
    const readState = extractFunctionSource(harness, 'readState');
    assert.match(readState, /resolveDecisionReceiptAutosavePath/);
    assert.match(readState, /filePersistenceFingerprint/);
    const runFaction = extractFunctionSource(harness, 'runFaction');
    assert.match(
        runFaction,
        /const initialAutosavePath = resolveDecisionReceiptAutosavePath/,
        'resume initial evidence must hash and archive the loaded save before canonical autosave persistence changes',
    );
});

test('final blocker inventory covers every canonical player decision queue', () => {
    const harness = readHarness();
    const isPlayerVisibleCounterOffer = loadFunction<(offer: Record<string, unknown>, faction: string) => boolean>(
        harness,
        'isPlayerVisibleCounterOffer',
    );
    const buildPlayerBlockerInventory = loadFunction<(
        raw: Record<string, any>,
        playerFaction: string,
        known: Record<string, number>,
    ) => Record<string, number>>(harness, 'buildPlayerBlockerInventory', { isPlayerVisibleCounterOffer });
    const inventory = buildPlayerBlockerInventory({
        military: {
            pending_reserve_requests: [{ faction: 'RS' }, { faction: 'RBiH' }],
            pending_convoy_decisions: [{ route_faction: 'RS' }, { route_faction: 'RS', decision: 'allow' }],
            pending_officer_events: [{ faction: 'RS', acknowledged: false }, { faction: 'RS', acknowledged: true }],
            operation_opportunities: [
                { approver_faction: 'RS', status: 'eligible_pending_review', proposal_id: 'covered' },
                { approver_faction: 'RS', status: 'eligible_pending_review', proposal_id: 'fallback' },
            ],
            negotiation: {
                pending_peace_plan: { plan_id: 'peace' },
                pending_dayton: { id: 'dayton' },
                pending_counter_offers: [
                    { id: 'counter-rs', target_faction: 'RS' },
                    { id: 'counter-rbih', target_faction: 'RBiH' },
                ],
            },
        },
        meta: {
            pending_proposal_reviews: [{ faction: 'RS', proposed_action: 'OPPORTUNITY:covered', accepted: null, resolved_turn: null }],
        },
    }, 'RS', { eventDecisions: 1, proposals: 1, paramilitary: 1 });

    assert.deepEqual({ ...inventory }, {
        eventDecisions: 1,
        proposals: 1,
        paramilitary: 1,
        reserves: 1,
        convoys: 1,
        officerEvents: 1,
        peacePlan: 1,
        counterOffers: 1,
        dayton: 1,
        operationOpportunities: 1,
    });
    assert.match(harness, /raw\.military\?\.pending_reserve_requests/);
    assert.match(harness, /pendingCounterOfferIds/);
    assert.match(harness, /blockerInventory/);
    assert.match(extractFunctionSource(harness, 'fullFinalStateTour'), /assertNoPlayerBlockers/);
    assert.match(extractFunctionSource(harness, 'playTurns'), /assertNoPlayerBlockers/);
});

test('zero-count Review Before Advance telemetry cannot masquerade as a blocking surface', () => {
    const harness = readHarness();
    const shouldOpenAdvanceBlockerReview = loadFunction<(
        text: string,
        pendingState: { blockerInventory?: Record<string, number> } | null,
    ) => boolean>(harness, 'shouldOpenAdvanceBlockerReview');

    const emptyInventory = {
        eventDecisions: 0,
        proposals: 0,
        paramilitary: 0,
        reserves: 0,
        convoys: 0,
        officerEvents: 0,
        peacePlan: 0,
        counterOffers: 0,
        dayton: 0,
        operationOpportunities: 0,
    };
    assert.equal(shouldOpenAdvanceBlockerReview('REVIEW BEFORE ADVANCE 0', { blockerInventory: emptyInventory }), false);
    assert.equal(shouldOpenAdvanceBlockerReview('Advance blocked — Review Before Advance', {
        blockerInventory: { ...emptyInventory, proposals: 1 },
    }), true);
    assert.match(extractFunctionSource(harness, 'handleCurrentSurface'), /shouldOpenAdvanceBlockerReview\(text, pendingState\)/);
});

test('counter-offer handler targets an exact player-visible offer and requires source queue clearance', () => {
    const harness = readHarness();
    const handler = extractFunctionSource(harness, 'handleCurrentSurface');
    const counterIndex = handler.indexOf('pendingCounterOffers');
    const peaceIndex = handler.indexOf('pendingPeacePlanId');
    const proposalIndex = handler.indexOf('unresolvedProposalCount');
    const counterBranch = handler.slice(counterIndex, proposalIndex);

    assert.ok(counterIndex >= 0, 'counter-offer branch is required');
    assert.ok(counterIndex > peaceIndex, 'peace-plan modal remains the higher-priority negotiation surface');
    assert.ok(counterIndex < proposalIndex, 'counter-offers must be drained before ordinary proposals');
    assert.match(counterBranch, /pendingCounterOfferIds\?\.\[0\]/);
    assert.match(counterBranch, /decision-room-priority-card-counter-offer:\$\{counterOfferId\}/);
    assert.match(counterBranch, /Submit as counter-proposal/);
    assert.match(counterBranch, /includes\(counterOfferId\)/);
    assert.match(counterBranch, /remained pending after visible response/);
});

test('peace reserve convoy officer and paramilitary UI decisions prove durable exact receipts', () => {
    const harness = readHarness();
    const handler = extractFunctionSource(harness, 'handleCurrentSurface');

    const peaceBranch = handler.slice(
        handler.indexOf('if (pendingState?.pendingPeacePlanId != null)'),
        handler.indexOf('if ((pendingState?.pendingDayton ?? 0) > 0)'),
    );
    const reserveBranch = handler.slice(
        handler.indexOf('if ((pendingState?.reserveRequests ?? 0) > 0)'),
        handler.indexOf('if ((pendingState?.convoyDecisions ?? 0) > 0)'),
    );
    const convoyBranch = handler.slice(
        handler.indexOf('if ((pendingState?.convoyDecisions ?? 0) > 0)'),
        handler.indexOf('if ((pendingState?.pendingOfficerEvents ?? 0) > 0)'),
    );
    const officerBranch = handler.slice(
        handler.indexOf('if ((pendingState?.pendingOfficerEvents ?? 0) > 0)'),
        handler.indexOf("const eventResponseCount = await frame.locator"),
    );
    const paramilitaryBranch = handler.slice(
        handler.indexOf("const paramilitarySubmitCount = await frame.locator"),
        handler.indexOf('const reserveModalOpen'),
    );

    assert.match(peaceBranch, /assertNewExactDecisionReceipt\([\s\S]*?'peace-plan'/);
    assert.match(reserveBranch, /assertNewExactDecisionReceipt\([\s\S]*?'reserve'/);
    assert.match(convoyBranch, /assertNewExactDecisionReceipt\([\s\S]*?'convoy'/);
    assert.match(officerBranch, /waitForNewExactDecisionReceipt\([\s\S]*?'officer'/);
    assert.match(paramilitaryBranch, /assertExactParamilitaryDecisionReceipts/);
    assert.match(paramilitaryBranch, /pendingParamilitaryRequestIds/);
});

test('reserve request handling captures the blocking surface before attempting navigation', () => {
    const harness = readHarness();
    const source = extractFunctionSource(harness, 'handleCurrentSurface');
    const requestBranch = source.slice(source.indexOf("if ((pendingState?.reserveRequests ?? 0) > 0)"));
    const snapshotIndex = requestBranch.indexOf("'reserve-request-before-route'");
    const aftermathActionIndex = requestBranch.indexOf('turn-aftermath-action-reserve:');
    const reserveModalIndex = requestBranch.indexOf('reserve-request-modal');
    const suggestedReviewIndex = requestBranch.indexOf('reserve-request-review-suggested');
    const routeIndex = requestBranch.indexOf('openCommandSurfaceFromWarroom');

    assert.ok(snapshotIndex >= 0, 'reserve request route must capture its starting surface');
    assert.ok(aftermathActionIndex > snapshotIndex, 'reserve request route must prefer the exact Turn Aftermath action');
    assert.ok(reserveModalIndex > aftermathActionIndex, 'reserve request route must verify the exact modal identity');
    assert.ok(suggestedReviewIndex > reserveModalIndex, 'reserve request route must use the visible suggested-force review');
    assert.ok(routeIndex > suggestedReviewIndex, 'direct command-surface navigation must remain a fallback');
    assert.match(requestBranch, /decision-room-active-dossier/);
    assert.match(requestBranch, /command:elite-deploy:\$\{requestId\}/);
    assert.match(requestBranch, /activeDossier[\s\S]*clickMatch\(/, 'Issue must be scoped to the exact active reserve dossier');
    const receiptIndex = requestBranch.indexOf("assertNewExactDecisionReceipt(");
    const closeIndex = requestBranch.indexOf("'warroom-decision-room-close'", receiptIndex);
    const hiddenIndex = requestBranch.indexOf("waitFor({ state: 'hidden'", closeIndex);
    assert.ok(receiptIndex >= 0 && closeIndex > receiptIndex && hiddenIndex > closeIndex, 'exact receipt must precede exact Decision Room close and hidden proof');
});

test('campaign runner closes aftermath by stable identity and proves the exact turn before the final tour', () => {
    const harness = readHarness();
    const surfaceSource = extractFunctionSource(harness, 'handleCurrentSurface');
    const playSource = extractFunctionSource(harness, 'playTurns');
    const lightCheckpointSource = extractFunctionSource(harness, 'lightTurnCheckpointTour');
    const turnCheckpointSource = extractFunctionSource(harness, 'turnCheckpointTour');

    assert.match(surfaceSource, /turn-aftermath-close/);
    assert.match(surfaceSource, /close-aftermath-report/);
    assert.doesNotMatch(
        surfaceSource,
        /ACKNOWLEDGED[\s\S]*HISTORICAL EVENT\|EVENT/,
        'historical notices must use their stable test id, not broad page text',
    );
    const ensureAdvanceSurfaceIndex = playSource.indexOf('campaign advance surface');
    const advanceClickIndex = playSource.indexOf('await dispatchAdvanceAfterSettlement(');
    assert.ok(ensureAdvanceSurfaceIndex >= 0, 'unblocked turns must return from drill-down surfaces before advancing');
    assert.ok(advanceClickIndex > ensureAdvanceSurfaceIndex, 'Warroom recovery must precede the exact advance dispatch');
    assert.match(
        lightCheckpointSource,
        /`light-turn-\$\{turn\}-pre-checkpoint`, 40, \{ allowAdvanceModal: false \}/,
        'checkpoint drain must cover stacked aftermath, historical notices, and canonical blockers',
    );
    assert.match(
        turnCheckpointSource,
        /`turn-\$\{turn\}-pre-checkpoint`, 40, \{ allowAdvanceModal: false \}/,
        'full checkpoints must cover the same stacked turn backlog as light checkpoints',
    );
    const exactTurnIndex = playSource.indexOf('Exact-turn assertion failed before final tour');
    const finalTourIndex = playSource.indexOf('fullFinalStateTour');
    assert.ok(exactTurnIndex >= 0, 'exact target turn must be checked before final evidence navigation');
    assert.ok(finalTourIndex > exactTurnIndex, 'final tour must run only after exact target turn is proven');
    assert.match(playSource, /Campaign progress stalled/);
    assert.doesNotMatch(playSource, /if \(!advanced\) break/);
    assert.match(playSource, /stagnantSteps >= 4/);
});

test('resume saves drain presidential blockers before any free-navigation probe', () => {
    const harness = readHarness();
    const runSource = extractFunctionSource(harness, 'runFaction');
    const surfaceSource = extractFunctionSource(harness, 'handleCurrentSurface');
    const eventDecisionDrainIndex = runSource.indexOf('resolvePendingEventDecisionsBeforeFreeNavigation');
    const resumeDrainIndex = runSource.indexOf("'resume-pre-free-navigation'");
    const initialTourIndex = runSource.indexOf('if (!skipInitialTour)');
    const peacePlanIndex = surfaceSource.indexOf('if (pendingState?.pendingPeacePlanId != null)');
    const daytonIndex = surfaceSource.indexOf('if ((pendingState?.pendingDayton ?? 0) > 0)');
    const proposalIndex = surfaceSource.indexOf('const qaProposal = selectProposalForQa');

    assert.ok(eventDecisionDrainIndex >= 0, 'resume setup must first resolve required event decisions');
    assert.ok(resumeDrainIndex > eventDecisionDrainIndex, 'resume setup must then drain every presidential blocker');
    assert.ok(initialTourIndex > resumeDrainIndex, 'free-navigation probes must wait for the resume blocker drain');
    assert.ok(peacePlanIndex >= 0 && peacePlanIndex < proposalIndex, 'visible peace plans must precede proposal routing');
    assert.ok(daytonIndex >= 0 && daytonIndex < proposalIndex, 'visible Dayton negotiations must precede proposal routing');
});

test('historical peace-plan policy preserves canonical rejection factions', () => {
    const harness = readHarness();
    const selectResponse = loadFunction<(planId: string, faction: string) => string>(
        harness,
        'selectHistoricalPeacePlanResponse',
    );

    assert.equal(selectResponse('vance_owen', 'RS'), 'Reject Plan');
    assert.equal(selectResponse('vance_owen', 'RBiH'), 'Accept Plan');
    assert.equal(selectResponse('vance_owen', 'HRHB'), 'Accept Plan');
    assert.equal(selectResponse('owen_stoltenberg', 'RBiH'), 'Reject Plan');
    assert.equal(selectResponse('contact_group', 'RS'), 'Reject Plan');
});

test('visible historical notices are acknowledged before routing state-backed event decisions', () => {
    const harness = readHarness();
    const source = extractFunctionSource(harness, 'handleCurrentSurface');
    const preTourSource = extractFunctionSource(harness, 'resolvePendingEventDecisionsBeforeFreeNavigation');
    const aftermathIndex = source.indexOf("frame.locator('[data-testid=\"turn-aftermath-close\"]')");
    const noticeIndex = source.indexOf('acknowledge-visible-event-notice');
    const pendingEventIndex = source.indexOf('if (pendingEventId)');
    const reserveIndex = source.indexOf("if ((pendingState?.reserveRequests ?? 0) > 0)");

    assert.ok(aftermathIndex >= 0, 'topmost turn aftermath needs an exact close action');
    assert.ok(noticeIndex > aftermathIndex, 'turn aftermath must be handled before notices obscured behind it');
    assert.ok(noticeIndex >= 0, 'topmost historical notice needs an exact visible action');
    assert.ok(pendingEventIndex > noticeIndex, 'visible modal stack order must precede state-backed routing');
    assert.ok(reserveIndex > pendingEventIndex, 'required event decisions must resolve before reserve requests in every run mode');
    assert.doesNotMatch(source, /if \(strategicRun && pendingEventId\)/);
    assert.match(source, /getAttribute\('data-event-id'\)/);
    assert.match(source, /eventNoticeId/);
    assert.match(preTourSource, /event-notice-acknowledge/);
    assert.match(preTourSource, /pre-tour-acknowledge-visible-event-notice/);
    assert.match(source, /turn-aftermath-action-event:\$\{pendingEventId\}/);
    assert.match(preTourSource, /turn-aftermath-action-event:\$\{pendingEventId\}/);
});

test('counter proof reports adaptive reachability without weakening exact identity', () => {
    const harness = readHarness();
    const assess = loadFunction<(
        initialIds: string[],
        attemptedIds: string[],
        verifiedIds: string[],
        requireFormationProof: boolean,
    ) => {
        ok: boolean;
        initialTargetCount: number;
        attemptedCount: number;
        verifiedCount: number;
        unavailableInitialIds: string[];
    }>(harness, 'assessCounterVerificationCoverage');

    assert.deepEqual(
        JSON.parse(JSON.stringify(assess(
            Array.from({ length: 12 }, (_, index) => `formation-${index + 1}`),
            ['formation-1', 'formation-2', 'formation-3', 'formation-4', 'formation-5'],
            ['formation-1', 'formation-2', 'formation-3', 'formation-4', 'formation-5'],
            true,
        ))),
        {
            ok: true,
            initialTargetCount: 12,
            attemptedCount: 5,
            verifiedCount: 5,
            unavailableInitialIds: [
                'formation-6',
                'formation-7',
                'formation-8',
                'formation-9',
                'formation-10',
                'formation-11',
                'formation-12',
            ],
        },
    );
    assert.equal(assess(['formation-1'], [], [], true).ok, false);
    assert.equal(assess([], [], [], false).ok, true);
});

test('counter proof never substitutes newly visible counters for its declared initial targets', () => {
    const harness = readHarness();
    const selectNext = loadFunction<(
        initialIds: string[],
        currentFormationSample: Array<{ id: string }>,
        attemptedIds: string[],
    ) => { id: string } | null>(harness, 'selectNextCounterVerificationCandidate');

    assert.deepEqual(
        selectNext(
            ['formation-1', 'formation-2', 'formation-3'],
            [{ id: 'newly-visible' }, { id: 'formation-2' }, { id: 'formation-1' }],
            ['formation-1'],
        ),
        { id: 'formation-2' },
    );
    assert.equal(
        selectNext(
            ['formation-1', 'formation-2'],
            [{ id: 'newly-visible' }],
            ['formation-1'],
        ),
        null,
    );
});

test('stable counter activation resolves an overlay replacement and clicks the replacement once', async () => {
    const dom = new JSDOM('<div data-awwv-dom-formation-counters="true"></div>');
    const { document } = dom.window;
    const overlay = document.querySelector<HTMLElement>('[data-awwv-dom-formation-counters="true"]')!;
    Object.assign(overlay.dataset, {
        awwvFormationCounterSourceGate: 'ready',
        awwvFormationCounterNeedsUpdate: 'false',
        awwvFormationCounterSourceCount: '1',
        awwvFormationCounterRenderedCount: '1',
    });
    const clicks = new Map<HTMLElement, number>();
    const makeCounter = (label: string) => {
        const node = document.createElement('button');
        node.setAttribute('data-awwv-formation-counter-id', 'formation-1');
        node.setAttribute('aria-label', label);
        node.getBoundingClientRect = () => ({
            x: 100, y: 120, left: 100, top: 120, right: 144, bottom: 144, width: 44, height: 24,
            toJSON: () => ({}),
        });
        node.addEventListener('click', () => clicks.set(node, (clicks.get(node) ?? 0) + 1));
        return node;
    };
    const original = makeCounter('Original');
    overlay.append(original);
    let replacement: HTMLElement | null = null;
    let lateReplacement: HTMLElement | null = null;
    let settles = 0;
    let samples = 0;
    let lateReplacementArmed = false;
    const documentWithHitTest = document as Document & { elementFromPoint: (x: number, y: number) => Element | null };
    documentWithHitTest.elementFromPoint = () => document.querySelector('[data-awwv-formation-counter-id="formation-1"]');
    const sample = <T,>(predicate: (...args: any[]) => T, ...args: any[]) => {
        const result = predicate(...args);
        samples += 1;
        if (samples === 2) lateReplacementArmed = true;
        return result;
    };
    const frame = {
        evaluate: async (predicate: (arg: string) => unknown, arg: string) => sample(predicate, arg),
        locator: (selector: string) => ({
            count: async () => {
                if (lateReplacementArmed) {
                    lateReplacement = makeCounter('Late replacement');
                    document.querySelector('[data-awwv-formation-counter-id="formation-1"]')?.replaceWith(lateReplacement);
                    lateReplacementArmed = false;
                }
                return document.querySelectorAll(selector).length;
            },
            elementHandle: async () => {
                const bound = document.querySelector(selector) as HTMLElement | null;
                if (!bound) return null;
                return {
                    evaluate: async (predicate: (node: HTMLElement, id: string) => unknown, id: string) => sample(predicate, bound, id),
                    click: async () => bound.click(),
                };
            },
            click: async () => (document.querySelector(selector) as HTMLElement | null)?.click(),
        }),
    };
    const activate = loadAsyncFunction<(frame: any, id: string) => Promise<any>>(
        readHarness(),
        'activateStableFormationCounter',
        {
            document,
            sleep: async () => {
                settles += 1;
                if (settles === 1) {
                    replacement = makeCounter('Replacement');
                    original.replaceWith(replacement);
                }
            },
        },
    );

    const stable = await activate(frame, 'formation-1');

    assert.ok(replacement, 'fixture must replace the original counter');
    assert.ok(lateReplacement, 'fixture must replace again after the second sample');
    assert.notEqual(stable.first.nodeGeneration, 1, 'activation must not retain the replaced node generation');
    assert.equal(stable.first.matchCount, 1);
    assert.equal(stable.second.matchCount, 1);
    assert.equal(stable.first.nodeGeneration, stable.second.nodeGeneration);
    assert.equal(stable.second.outerIdentity.ariaLabel, 'Late replacement');
    assert.equal(clicks.get(original) ?? 0, 0);
    assert.equal(clicks.get(replacement!) ?? 0, 0);
    assert.equal(clicks.get(lateReplacement!) ?? 0, 1);
    assert.equal(Array.from(clicks.values()).reduce((sum, count) => sum + count, 0), 1);
});

test('counter detail wait is identity-bound and rejects wrong or missing detail rails', async () => {
    const dom = new JSDOM('<section data-testid="formation-detail-panel" data-formation-id="formation-other"></section>');
    const { document } = dom.window;
    const frame = {
        locator: (selector: string) => ({
            waitFor: async () => {
                if (!document.querySelector(selector)) throw new Error('not visible');
            },
        }),
    };
    const waitForExactDetail = loadAsyncFunction<(frame: any, id: string, timeout?: number) => Promise<boolean>>(
        readHarness(),
        'waitForExactFormationDetail',
    );

    assert.equal(await waitForExactDetail(frame, 'formation-1', 1), false);
    document.body.innerHTML = '<section data-testid="formation-detail-panel" data-formation-id="formation-1"></section>';
    assert.equal(await waitForExactDetail(frame, 'formation-1', 1), true);
    document.body.innerHTML = '';
    assert.equal(await waitForExactDetail(frame, 'formation-1', 1), false);
});

test('counter selection failure diagnostics retain immediate DOM and selected rail identities', async () => {
    const dom = new JSDOM(`
        <div data-awwv-dom-formation-counters="true"
            data-awwv-formation-counter-source-gate="ready"
            data-awwv-formation-counter-needs-update="false"
            data-awwv-formation-counter-rendered-count="1">
            <button data-awwv-formation-counter-id="formation-1" aria-label="Formation 1"></button>
        </div>
        <section data-testid="formation-detail-panel" data-formation-id="formation-other"></section>
        <section data-testid="corps-front-panel" data-sector-id="sector-7" data-corps-id="corps-2"></section>
        <section data-testid="corps-detail-panel" data-corps-id="corps-3"></section>
    `);
    const { document } = dom.window;
    const counter = document.querySelector<HTMLElement>('[data-awwv-formation-counter-id="formation-1"]')!;
    counter.getBoundingClientRect = () => ({
        x: 100, y: 120, left: 100, top: 120, right: 144, bottom: 144, width: 44, height: 24,
        toJSON: () => ({}),
    });
    for (const rail of document.querySelectorAll<HTMLElement>('[data-testid$="-panel"]')) {
        rail.getBoundingClientRect = () => ({
            x: 200, y: 100, left: 200, top: 100, right: 500, bottom: 600, width: 300, height: 500,
            toJSON: () => ({}),
        });
    }
    const documentWithHitTest = document as Document & { elementFromPoint: (x: number, y: number) => Element | null };
    documentWithHitTest.elementFromPoint = () => counter;
    const frame = {
        evaluate: async (predicate: (arg: string) => unknown, arg: string) => predicate(arg),
    };
    const diagnostics = loadAsyncFunction<(frame: any, id: string) => Promise<any>>(
        readHarness(),
        'formationCounterSelectionFailureDiagnostics',
        { document, HTMLElement: dom.window.HTMLElement, getComputedStyle: dom.window.getComputedStyle },
    );

    const result = await diagnostics(frame, 'formation-1');

    assert.deepEqual(JSON.parse(JSON.stringify(result.counter.rect)), { x: 100, y: 120, width: 44, height: 24 });
    assert.equal(result.counter.outerIdentity.formationCounterId, 'formation-1');
    assert.equal(result.hitOwner.formationCounterId, 'formation-1');
    assert.equal(result.rawElementFromPoint.formationCounterId, 'formation-1');
    assert.equal(result.overlayDataset.awwvFormationCounterSourceGate, 'ready');
    assert.deepEqual(JSON.parse(JSON.stringify(result.visibleRailIds)), [
        'formation-detail-panel:formation-other',
        'corps-front-panel:sector-7:corps-2',
        'corps-detail-panel:corps-3',
    ]);
    assert.deepEqual(JSON.parse(JSON.stringify(result.railDerivedSelection)), {
        formationId: 'formation-other',
        sectorId: 'sector-7',
        corpsId: 'corps-2',
        corpsIds: ['corps-2', 'corps-3'],
    });
    assert.deepEqual(JSON.parse(JSON.stringify(result.storeSelection)), {
        status: 'unavailable',
        reason: 'No supported player-visible UI selection-state API is exposed to the harness.',
    });
});

test('counter selection orchestration snapshots activation and detail failures once while preserving failure identity', async () => {
    const events: any[] = [];
    const snapshots: any[] = [];
    const primary = new Error('stable counter activation failed');
    const diagnostics: any = {
        targetId: 'formation-1',
        railDerivedSelection: { formationId: null, sectorId: null, corpsId: null, corpsIds: [] },
        storeSelection: {
            status: 'unavailable',
            reason: 'No supported player-visible UI selection-state API is exposed to the harness.',
        },
    };
    const loadVerify = (activation: () => Promise<any>, exactDetail: () => Promise<boolean>, currentDiagnostics = diagnostics) => (
        loadAsyncFunction<(...args: any[]) => Promise<any>>(
            readHarness(),
            'verifyExactFormationCounterSelection',
            {
                activateStableFormationCounter: activation,
                waitForExactFormationDetail: exactDetail,
                formationCounterSelectionFailureDiagnostics: async () => currentDiagnostics,
                writeCounterSelectionFailureSidecar: () => ({ path: 'counter-selection-failure.json', sha256: 'sidecar-sha' }),
                snapshot: async (...args: any[]) => snapshots.push(args.at(-1)),
                safeName: (value: string) => value,
                sleep: async () => {},
            },
        )
    );
    const args = [{}, {}, 'RBiH', events, 'initial-map-probe', { id: 'formation-1' }];

    const activationFailure = loadVerify(async () => { throw primary; }, async () => false);
    await assert.rejects(
        () => activationFailure(...args),
        (error: unknown) => error === primary,
    );
    assert.equal(snapshots.length, 1);
    assert.equal(snapshots[0].selectionFailure, diagnostics);
    assert.equal(snapshots[0].selectionError, 'stable counter activation failed');

    snapshots.length = 0;
    const wrongDetailDiagnostics = {
        ...diagnostics,
        railDerivedSelection: { formationId: 'formation-other', sectorId: null, corpsId: null, corpsIds: [] },
    };
    const detailFailure = loadVerify(
        async () => ({ first: { nodeGeneration: 3 }, second: { nodeGeneration: 3 } }),
        async () => false,
        wrongDetailDiagnostics,
    );
    await assert.rejects(() => detailFailure(...args), /opened the wrong detail: expected formation-1, observed formation-other/);
    assert.equal(snapshots.length, 1);
    assert.equal(snapshots[0].selectionFailure, wrongDetailDiagnostics);
});

test('duplicate exact counter during settled reads clicks nothing and persists diagnostics before throwing enrichment', async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'awwv-counter-selection-'));
    try {
        const dom = new JSDOM('<div data-awwv-dom-formation-counters="true"></div>');
        const { document } = dom.window;
        const overlay = document.querySelector<HTMLElement>('[data-awwv-dom-formation-counters="true"]')!;
        Object.assign(overlay.dataset, {
            awwvFormationCounterSourceGate: 'ready',
            awwvFormationCounterNeedsUpdate: 'false',
            awwvFormationCounterSourceCount: '1',
            awwvFormationCounterRenderedCount: '1',
        });
        let clicks = 0;
        const makeCounter = (label: string) => {
            const node = document.createElement('button');
            node.setAttribute('data-awwv-formation-counter-id', 'formation-duplicate');
            node.setAttribute('aria-label', label);
            node.getBoundingClientRect = () => ({
                x: 100, y: 120, left: 100, top: 120, right: 144, bottom: 144, width: 44, height: 24,
                toJSON: () => ({}),
            });
            node.addEventListener('click', () => { clicks += 1; });
            return node;
        };
        const original = makeCounter('Original');
        overlay.append(original);
        let duplicateAdded = false;
        const documentWithHitTest = document as Document & { elementFromPoint: (x: number, y: number) => Element | null };
        documentWithHitTest.elementFromPoint = () => original;
        const frame = {
            evaluate: async (predicate: (arg: string) => unknown, arg: string) => predicate(arg),
            locator: (selector: string) => ({
                count: async () => document.querySelectorAll(selector).length,
                elementHandle: async () => {
                    const bound = document.querySelector(selector) as HTMLElement | null;
                    if (!bound) return null;
                    if (!duplicateAdded) {
                        overlay.append(makeCounter('Duplicate'));
                        duplicateAdded = true;
                    }
                    return {
                        evaluate: async (predicate: (node: HTMLElement, id: string) => unknown, id: string) => predicate(bound, id),
                        click: async () => bound.click(),
                    };
                },
            }),
        };
        const activate = loadAsyncFunction<(frame: any, id: string) => Promise<any>>(
            readHarness(),
            'activateStableFormationCounter',
            { document, sleep: async () => {} },
        );
        const diagnostics = loadAsyncFunction<(frame: any, id: string) => Promise<any>>(
            readHarness(),
            'formationCounterSelectionFailureDiagnostics',
            { document, getComputedStyle: dom.window.getComputedStyle },
        );
        const sidecar = loadFunction<(...args: any[]) => any>(
            readHarness(),
            'writeCounterSelectionFailureSidecar',
            {
                Buffer,
                crypto: nodeRequire('node:crypto'),
                evidenceDir: tempRoot,
                fs: nodeFs,
                path: nodePath,
                process,
                runLabel: 'fixture-run',
                safeName: (value: string) => value.replace(/[^a-z0-9-]+/gi, '-'),
            },
        );
        const verify = loadAsyncFunction<(...args: any[]) => Promise<any>>(
            readHarness(),
            'verifyExactFormationCounterSelection',
            {
                activateStableFormationCounter: activate,
                waitForExactFormationDetail: async () => false,
                formationCounterSelectionFailureDiagnostics: diagnostics,
                writeCounterSelectionFailureSidecar: sidecar,
                snapshot: async () => { throw new Error('rich snapshot failed'); },
                safeName: (value: string) => value.replace(/[^a-z0-9-]+/gi, '-'),
                sleep: async () => {},
            },
        );

        await assert.rejects(
            () => verify({}, frame, 'RBiH', [], 'initial-map-probe', { id: 'formation-duplicate' }),
            /identity is not unique during stable resolution/,
        );

        assert.equal(clicks, 0);
        const factionDir = join(tempRoot, 'RBiH');
        const files = nodeFs.readdirSync(factionDir).sort();
        assert.deepEqual(files, ['initial-map-probe-counter-formation-duplicate-selection-failure.json']);
        const persisted = JSON.parse(readFileSync(join(factionDir, files[0]), 'utf8'));
        assert.equal(persisted.schema, 'awwv.counter-selection-failure.v1');
        assert.match(persisted.selectionError, /identity is not unique during stable resolution/);
        assert.equal(persisted.selectionFailure.matchCount, 2);
        assert.equal(persisted.richSnapshot.status, 'pending');
        assert.equal(nodeFs.readdirSync(factionDir).some((name) => name.includes('.tmp-')), false);
    } finally {
        rmSync(tempRoot, { recursive: true, force: true });
    }
});

test('pending event order and visible modal identity match the app selector', () => {
    const harness = readHarness();
    const compare = loadFunction<(left: any, right: any) => number>(
        harness,
        'comparePendingEventDecisionPriority',
        { strictAsciiCompare: (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0 },
    );
    const resolveIdentity = loadFunction<(pendingId: string | null, visibleId: string | null) => string | null>(
        harness,
        'resolveVisibleEventDecisionId',
    );
    const ordered = [
        { id: 'evt-advisory', decision: { event_id: 'evt-advisory', turn_fired: 1, requires_player_response: false } },
        { id: 'evt-required-new', decision: { event_id: 'evt-required-new', turn_fired: 9, requires_player_response: true } },
        { id: 'evt-required-b', decision: { event_id: 'evt-required-b', turn_fired: 5, requires_player_response: true } },
        { id: 'evt-required-a', decision: { event_id: 'evt-required-a', turn_fired: 5, requires_player_response: true } },
    ].sort(compare);

    assert.deepEqual(ordered.map((entry) => entry.id), [
        'evt-required-a',
        'evt-required-b',
        'evt-required-new',
        'evt-advisory',
    ]);
    assert.equal(resolveIdentity('evt-required-a', 'evt-required-b'), 'evt-required-b');
    assert.equal(resolveIdentity('evt-required-a', null), 'evt-required-a');
});

test('historical notice evidence rejects duplicate event identities', () => {
    const harness = readHarness();
    const assertNewEventNoticeIdentity = loadFunction<(
        events: Array<Record<string, unknown>>,
        eventNoticeId: string | null,
        label: string,
    ) => string>(harness, 'assertNewEventNoticeIdentity');

    assert.equal(assertNewEventNoticeIdentity([], 'event-a', 'first'), 'event-a');
    assert.throws(
        () => assertNewEventNoticeIdentity([
            { eventNoticeId: 'event-a', label: 'prior acknowledgement' },
        ], 'event-a', 'repeat'),
        /Duplicate historical event notice event-a/,
    );
    assert.throws(() => assertNewEventNoticeIdentity([], null, 'missing'), /no exact event identity/i);
    assert.match(extractFunctionSource(harness, 'handleCurrentSurface'), /assertNewEventNoticeIdentity/);
    assert.match(extractFunctionSource(harness, 'drainVisibleEventNotices'), /assertNewEventNoticeIdentity/);
    assert.match(extractFunctionSource(harness, 'resolvePendingEventDecisionsBeforeFreeNavigation'), /assertNewEventNoticeIdentity/);
});

test('run evidence is isolated, archived, and binds initial and final state', () => {
    const harness = readHarness();

    assert.match(harness, /cleanupRunArtifacts\(/);
    assert.match(harness, /evidenceDir/);
    assert.match(harness, /reserveEvidenceDirectory\(/);
    assert.ok(
        harness.indexOf('reserveEvidenceDirectory();') < harness.indexOf('cleanupRunArtifacts();'),
        'exclusive evidence reservation must fail before any same-label mutable artifacts are removed',
    );
    assert.match(extractFunctionSource(harness, 'reserveEvidenceDirectory'), /recursive: false/);
    assert.match(extractFunctionSource(harness, 'archiveAutosaveEvidence'), /COPYFILE_EXCL/);
    assert.doesNotMatch(extractFunctionSource(harness, 'cleanupRunArtifacts'), /rmSync\(evidenceDir/);
    assert.match(harness, /initial-autosave\.json/);
    assert.match(harness, /final-autosave\.json/);
    assert.match(harness, /initialStateHash/);
    assert.match(harness, /initialAutosaveHash/);
    assert.match(harness, /controlMapHash/);
    assert.match(harness, /scenarioId/);
    assert.match(harness, /scenarioSeed/);
    assert.match(harness, /initialScenarioProvenance/);
    assert.match(harness, /campaignModeSelectionEvidence/);
    assert.match(harness, /scenarioSourceSha256/);
    assert.match(harness, /startupSnapshotSha256/);
    assert.match(harness, /workingTreeContentSha256/);
    assert.match(harness, /initialAutosaveSha256/);
    assert.match(extractFunctionSource(harness, 'buildInitialScenarioProvenance'), /apr1992_definitive_188w\.json/);
    assert.doesNotMatch(extractFunctionSource(harness, 'buildInitialScenarioProvenance'), /apr1992_definitive_52w\.json/);
    assert.match(extractFunctionSource(harness, 'buildInitialScenarioProvenance'), /apr_1992_initial_save\.json/);
    assert.match(extractFunctionSource(harness, 'buildInitialScenarioProvenance'), /requestedFaction/);
    assert.match(extractFunctionSource(harness, 'buildInitialScenarioProvenance'), /calibrationScenario/);
    assert.match(extractFunctionSource(harness, 'buildInitialScenarioProvenance'), /decisionMode/);
    assert.match(extractFunctionSource(harness, 'buildInitialScenarioProvenance'), /autonomyLevel/);
    assert.match(extractFunctionSource(harness, 'buildInitialScenarioProvenance'), /headless/);
    assert.match(extractFunctionSource(harness, 'readState'), /decisionMode/);
    assert.match(extractFunctionSource(harness, 'computeWorkingTreeContentFingerprint'), /untracked-files=all/);
    assert.match(harness, /historicalEventAnchorResults/);
    assert.match(harness, /operation_corridor_1992/);
    assert.match(extractFunctionSource(harness, 'assertHistoricalEventAnchors'), /count !== 1/);
    assert.match(extractFunctionSource(harness, 'assertHistoricalEventAnchors'), /turn > anchor\.latestTurn/);
    assert.match(harness, /archiveAutosaveEvidence/);
    assert.match(harness, /finalAutosaveEvidence/);
    assert.match(harness, /finalizeEvidenceManifest/);
    assert.match(extractFunctionSource(harness, 'finalizeEvidenceManifest'), /verifyArchivedEvidence/);
    assert.match(extractFunctionSource(harness, 'finalizeEvidenceManifest'), /manifest\.json/);
    assert.match(extractFunctionSource(harness, 'writeJsonExclusive'), /flag: 'wx'/);
    assert.match(harness, /mainProcessStdout/);
    assert.match(harness, /mainProcessStderr/);
    assert.match(harness, /mainProcessStderr: unexpectedMainProcessStderr\.length/);
});

test('runtime diagnostics ignore only the Playwright inspector teardown footer', () => {
    const harness = readHarness();
    const isExpectedInspectorTeardownLine = loadFunction<(line: string) => boolean>(
        harness,
        'isExpectedInspectorTeardownLine',
    );

    assert.equal(
        isExpectedInspectorTeardownLine('Debugger ending on ws://127.0.0.1:52483/fe7102ba-d96e-4624-b43c-3f024d6f9053'),
        true,
    );
    assert.equal(isExpectedInspectorTeardownLine('For help, see: https://nodejs.org/en/docs/inspector'), true);
    assert.equal(
        isExpectedInspectorTeardownLine('[brigade_assignment] UNRESOLVED rs_ajnie_brigade: fell through sector pipeline'),
        false,
    );
    assert.equal(isExpectedInspectorTeardownLine('Error: renderer failed'), false);
});

test('top-level failure finalization preserves the exact in-memory result without success metadata', () => {
    const harness = readHarness();
    const finalizeFailedRunResult = loadFunction<(
        result: Record<string, any>,
        error: Error,
        failedAt: string,
    ) => Record<string, any>>(harness, 'finalizeFailedRunResult');
    const faction = {
        faction: 'RBiH',
        failed: false,
        events: [{ turn: 39, label: 'save-load-post-save/end' }],
        playtest: { finalState: { meta: { turn: 39 } } },
    };
    const result = {
        startedAt: '2026-10-25T04:05:22.697Z',
        completedAt: 'must-not-survive',
        command: ['--turns=39'],
        provenance: { harnessSha256: 'abc' },
        factions: [faction],
    };
    const error = new Error('Runtime diagnostics detected: {"networkFailures":1}');

    const finalized = finalizeFailedRunResult(result, error, '2026-10-25T04:17:45.886Z');

    assert.equal(finalized, result, 'failure finalization must retain the exact in-memory object');
    assert.equal(finalized.factions[0], faction, 'nested evidence must not be reconstructed');
    assert.equal(finalized.failed, true);
    assert.equal(finalized.error, String(error.stack));
    assert.equal(finalized.failedAt, '2026-10-25T04:17:45.886Z');
    assert.equal(Object.prototype.hasOwnProperty.call(finalized, 'completedAt'), false);
    assert.match(harness, /let result = null;/);
    assert.match(harness, /writeJsonAtomic\(logPath, finalizeFailedRunResult\(result, error,/);
    assert.match(harness, /writeTextAtomic\(path\.join\(outDir, `paradox-local-qa-error-\$\{runSlug\}\.txt`\), String\(error\?\.stack \?\? error\)\)/);
});

test('RBiH paramilitary override accepts only an explicit Historical RBiH always-allow request', () => {
    const harness = readHarness();
    const parse = loadFunction<(
        argv: string[],
        historical: boolean,
        factions: string[],
    ) => Record<string, unknown> | null>(harness, 'parseRbihParamilitaryPolicyOverride');

    assert.equal(parse(['node', 'qa.cjs', '--historical-choice', '--faction=RBiH'], true, ['RBiH']), null);
    assert.deepEqual(JSON.parse(JSON.stringify(parse([
        'node',
        'qa.cjs',
        '--historical-choice',
        '--faction=RBiH',
        '--rbih-paramilitary-policy=always_allow',
    ], true, ['RBiH']))), {
        requested: 'always_allow',
        version: 1,
        provenance: 'explicit_visible_player_policy_selector',
        eventId: 'rbih_paramilitary_policy_1992',
    });
    assert.throws(() => parse([
        '--rbih-paramilitary-policy=always_allow',
        '--rbih-paramilitary-policy=always_allow',
    ], true, ['RBiH']), /exactly once/i);
    assert.throws(() => parse(['--rbih-paramilitary-policy'], true, ['RBiH']), /unknown.*empty/i);
    assert.throws(() => parse(['--rbih-paramilitary-policy='], true, ['RBiH']), /unknown.*empty/i);
    assert.throws(() => parse(['--rbih-paramilitary-policy=always_deny'], true, ['RBiH']), /unknown.*always_deny/i);
    assert.throws(() => parse(['--rbih-paramilitary-policy=always_allow'], false, ['RBiH']), /historical-choice/i);
    assert.throws(() => parse(['--rbih-paramilitary-policy=always_allow'], true, ['RS']), /RBiH only/i);
    assert.throws(() => parse(['--rbih-paramilitary-policy=always_allow'], true, ['RBiH', 'RS']), /RBiH only/i);
    assert.ok(
        harness.indexOf('const rbihParamilitaryPolicyOverride = parseRbihParamilitaryPolicyOverride(')
            < harness.indexOf('reserveEvidenceDirectory();'),
        'invalid selector requests must fail before any native launch preparation',
    );
    assert.match(
        harness,
        /\.\.\.\(rbihParamilitaryPolicyOverride \? \{ rbihParamilitaryPolicyOverride \} : \{\}\)/,
        'default Historical provenance shape must remain unchanged when no override was requested',
    );
});

test('RBiH paramilitary override chooses only the existing visible counterfactual control and canonical receipt path', async () => {
    const harness = readHarness();
    const selectHistoricalEventChoice = loadFunction<(decision: any) => any>(harness, 'selectHistoricalEventChoice');
    const policyEventResponseControl = loadAsyncFunction<(surface: any) => Promise<any>>(
        harness,
        'policyEventResponseControl',
        {
            historicalChoice: true,
            rbihParamilitaryPolicyOverride: {
                requested: 'always_allow',
                version: 1,
                provenance: 'explicit_visible_player_policy_selector',
                eventId: 'rbih_paramilitary_policy_1992',
            },
            selectHistoricalEventChoice,
            hasMeaningfulSourceContent: () => false,
        },
    );
    const controls = [
        { id: 'deny-control', label: 'Refuse paramilitary deployment' },
        { id: 'allow-control', label: 'Authorize paramilitary standing orders' },
    ];
    const responseList = {
        nth: (index: number) => controls[index],
        evaluateAll: async (callback: (nodes: any[]) => unknown) => callback(controls.map((control) => ({
            firstElementChild: { firstElementChild: { textContent: control.label } },
        }))),
    };
    const rail = { getAttribute: async () => 'rbih_paramilitary_policy_1992' };
    const modal = { locator: (selector: string) => selector.includes('rail')
        ? { count: async () => 1, first: () => rail }
        : responseList };
    const surface = (playerFaction = 'RBiH', options = [
        { id: 'always_deny', label: controls[0].label, historical_marker: 'historical_default' },
        { id: 'always_allow', label: controls[1].label, historical_marker: 'counterfactual' },
    ]) => ({
        locator: () => ({ count: async () => 1, first: () => modal }),
        evaluate: async () => ({
            meta: { turn: 0, player_faction: playerFaction },
            military: {
                pending_event_decisions: [{
                    event_id: 'rbih_paramilitary_policy_1992',
                    faction: 'RBiH',
                    response_options: options,
                }],
            },
        }),
    });

    const selected = await policyEventResponseControl(surface());
    assert.equal(selected.loc.id, 'allow-control');
    assert.equal(selected.choice.responseId, 'always_allow');
    assert.equal(selected.choice.basis, 'player_selected_counterfactual');
    assert.equal(selected.choice.historicityClaim, 'none_counterfactual_player_choice');
    assert.deepEqual(JSON.parse(JSON.stringify(selected.choice.requestedOverride)), {
        requested: 'always_allow',
        version: 1,
        provenance: 'explicit_visible_player_policy_selector',
        eventId: 'rbih_paramilitary_policy_1992',
    });
    await assert.rejects(policyEventResponseControl(surface('HRHB')), /exact player event/i);
    await assert.rejects(policyEventResponseControl(surface('RBiH', [
        { id: 'always_deny', label: controls[0].label, historical_marker: 'historical_default' },
    ])), /missing.*always_allow/i);
    await assert.rejects(policyEventResponseControl(surface('RBiH', [
        { id: 'always_deny', label: controls[0].label, historical_marker: 'historical_default' },
        { id: 'always_allow', label: controls[1].label, historical_marker: 'counterfactual' },
        { id: 'always_allow', label: controls[1].label, historical_marker: 'counterfactual' },
    ])), /ambiguous.*always_allow/i);

    const clickSource = extractFunctionSource(harness, 'clickTestId');
    assert.match(clickSource, /policyEventResponseControl/);
    assert.match(clickSource, /assertExactEventDecisionReceipt/);
    assert.match(clickSource, /receipt\.responseId !== transcriptRow\.responseId/);
});

test('readability gate includes tiny text, ancestor clipping, inaccessible truncation, contrast, and occlusion', () => {
    const harness = readHarness();
    const collectReadabilityFailures = loadFunction<(
        events: Array<Record<string, any>>,
    ) => Array<Record<string, unknown>>>(harness, 'collectReadabilityFailures');
    const failures = collectReadabilityFailures([{ label: 'surface', diagnostics: {
        tiny: [{ text: 'tiny', fontSize: 9 }],
        undersizedEssentialCandidates: [{ text: 'small', fontSize: 11 }],
        clipped: [{ text: 'truncated but named', className: 'truncate', accessibleFullText: true }],
        ancestorClipped: [{ text: 'ancestor clipped' }],
        inaccessibleTruncation: [{ text: 'lost' }],
        lowContrast: [{ text: 'faint', contrastRatio: 2 }],
        occluded: [{ text: 'covered' }],
        viewportOverflowXPixels: 0,
        undersizedInteractive: [],
    } }]);
    assert.deepEqual(failures.map((failure) => failure.kind), [
        'tiny-text',
        'small-text',
        'ancestor-clipping',
        'inaccessible-truncation',
        'low-contrast',
        'occlusion',
    ]);
    assert.match(extractFunctionSource(harness, 'textDiagnostics'), /ancestorClipped/);
    assert.match(extractFunctionSource(harness, 'textDiagnostics'), /inaccessibleTruncation/);
    assert.match(extractFunctionSource(harness, 'textDiagnostics'), /lowContrast/);
    assert.match(extractFunctionSource(harness, 'textDiagnostics'), /occluded/);
});

test('readability diagnostics ignore recoverable scroll overflow and inactive content below a modal', () => {
    const harness = readHarness();
    const source = extractFunctionSource(harness, 'textDiagnostics');

    assert.match(source, /\(hidden\|clip\)/);
    assert.doesNotMatch(source, /hidden\|clip\|scroll\|auto/);
    assert.match(source, /activeModalSurface/);
    assert.match(source, /diagnosticRoot = activeModalSurface \?\? document\.body/);
    assert.match(source, /document\.createTreeWalker\(diagnosticRoot/);
    assert.match(source, /diagnosticRoot\.querySelectorAll/);
    assert.match(source, /activeModalSurface\.contains\(parent\)/);
    assert.match(source, /scrollReachableX/);
    assert.match(source, /scrollReachableY/);
    assert.match(source, /sameRenderedText/);
    assert.match(source, /outsideScrollableAncestor/);
    assert.match(source, /!outsideScrollableAncestor\(parent, rangeRect\)/);
    assert.match(source, /\[data-testid="formation-detail-panel"\]/);
    assert.match(source, /topHasVisibleFill/);
    assert.match(source, /nearestInteractiveOwner/);
    assert.match(source, /topOwner === nodeOwner/);
    assert.match(source, /occlusionHits/);
    assert.match(source, /data-testid/);
    assert.match(source, /compositeForeground/);
    assert.match(source, /hasBitmapBackdrop/);
    assert.match(source, /document\.elementsFromPoint/);
    assert.match(source, /data-readability-ignore/);
    assert.match(source, /details:not\(\[open\]\)/);
    assert.doesNotMatch(source, /rangeRect\.top < -2/);
});

test('active-modal readability remains contrast-gated while background occlusion is excluded', () => {
    const harness = readHarness();
    const source = extractFunctionSource(harness, 'textDiagnostics');
    const failures = extractFunctionSource(harness, 'collectReadabilityFailures');

    assert.match(source, /diagnosticScope: activeModalSurface \? 'active-modal' : 'document'/);
    assert.match(source, /lowContrast: rows\.filter/);
    assert.match(source, /occluded: rows/);
    assert.match(failures, /low-contrast/);
    assert.match(failures, /occlusion/);
});

test('advance-modal handling waits for the busy overlay to clear before readability capture', () => {
    const harness = readHarness();
    const handler = extractFunctionSource(harness, 'handleCurrentSurface');
    const waitCall = handler.indexOf('await waitForAdvanceTransition(frame)');
    const handledSnapshot = handler.indexOf("'handled-advance-modal'");

    assert.match(harness, /async function waitForAdvanceTransition\(frame\)/);
    assert.ok(waitCall >= 0);
    assert.ok(handledSnapshot > waitCall);
});

test('readability failure collection does not report accessible ancestor clipping twice', () => {
    const harness = readHarness();
    const collectReadabilityFailures = loadFunction<(
        events: Array<Record<string, any>>,
    ) => Array<Record<string, unknown>>>(harness, 'collectReadabilityFailures');
    const failures = collectReadabilityFailures([{ label: 'surface', diagnostics: {
        ancestorClipped: [{ text: 'named clipping', accessibleFullText: true }],
        inaccessibleTruncation: [],
    } }]);

    assert.deepEqual(failures, []);
});

test('short-tour setup can drain the full RS opening decision inventory', () => {
    const harness = readHarness();

    assert.match(harness, /'initial-post-map-probe', 40/);
});
