import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { test } from 'vitest';

const harnessPath = join(process.cwd(), 'tools', 'ui', 'paradox_local_qa.cjs');

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
    assert.match(harness, /mapNavigationWindow: diagnostics\.getMapNavigationAbortWindow\(observedAtMs\)/);
    assert.match(harness, /expectedNavigationAborts/);
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
        observedAtMs: 2_000,
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
    assert.equal(classifyExpectedRequestAbort({
        failure: { errorText: 'net::ERR_ABORTED' },
        method: 'GET',
        url: 'http://127.0.0.1:3002/data/derived/tiles/osm.pmtiles',
        resourceType: 'fetch',
        isMainFrame: false,
        eventCount: 22,
        teardownStarted: false,
        observedAtMs: 46_001,
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
        mapNavigationWindow: activePackagedMapNavigation,
    }), null);
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

test('strategic runs prove Assisted autonomy is pending at setup and active after the first turn', () => {
    const harness = readHarness();
    const assertStrategicAutonomyState = loadFunction<(
        label: string,
        state: { autonomyLevel?: number; autonomyLevelPending?: number | null } | null,
        expectedLevel: number,
        expectedPending: number | null,
    ) => Record<string, number | null>>(harness, 'assertStrategicAutonomyState');

    assert.deepEqual(
        { ...assertStrategicAutonomyState('configured', { autonomyLevel: 0, autonomyLevelPending: 1 }, 0, 1) },
        { autonomyLevel: 0, autonomyLevelPending: 1 },
    );
    assert.throws(
        () => assertStrategicAutonomyState('not staged', { autonomyLevel: 0, autonomyLevelPending: null }, 0, 1),
        /not staged.*pending 1/i,
    );
    assert.throws(
        () => assertStrategicAutonomyState('not applied', { autonomyLevel: 0, autonomyLevelPending: 1 }, 1, null),
        /not applied.*level 1/i,
    );
    assert.match(extractFunctionSource(harness, 'configureStrategicRun'), /assertStrategicAutonomyState/);
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
    assert.match(readState, /officerEventDedupeKey/);
    assert.match(handler, /pendingOfficerMatterItems\?\.\[0\]/);
    assert.match(handler, /openDeskInboxItem\(frame, 'officer_event', officerMatter\.inboxItemId\)/);
    assert.equal(officerResponseLabel({ eventType: 'officer_available' }), 'File availability notice');
    assert.equal(officerResponseLabel({ eventType: 'replacement_suggested' }), 'Keep current commander');
    assert.equal(officerResponseLabel({ eventType: 'order_pushback' }), 'Acknowledge');
    assert.match(handler, /const responseLabel = officerResponseLabel\(officerMatter\)/);
    assert.match(handler, /waitForNewExactDecisionReceipt\([\s\S]*?'officer'[\s\S]*?'eventId'[\s\S]*?officerEventId/);
    assert.match(extractFunctionSource(harness, 'waitForNewExactDecisionReceipt'), /readState\(frame\)/);
    assert.doesNotMatch(
        handler.slice(handler.indexOf("if ((pendingState?.pendingOfficerEvents ?? 0) > 0)")),
        /openDeskInboxItem\(frame, 'officer_event'\)/,
        'officer routing must never fall back to the first family-level card',
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
    const advanceClickIndex = playSource.indexOf("'advance toolbar'");
    assert.ok(ensureAdvanceSurfaceIndex >= 0, 'unblocked turns must return from drill-down surfaces before advancing');
    assert.ok(advanceClickIndex > ensureAdvanceSurfaceIndex, 'Warroom recovery must precede the advance click');
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
    assert.match(harness, /scenarioSourceSha256/);
    assert.match(harness, /startupSnapshotSha256/);
    assert.match(harness, /workingTreeContentSha256/);
    assert.match(harness, /initialAutosaveSha256/);
    assert.match(extractFunctionSource(harness, 'buildInitialScenarioProvenance'), /apr1992_definitive_52w\.json/);
    assert.match(extractFunctionSource(harness, 'buildInitialScenarioProvenance'), /apr_1992_initial_save\.json/);
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
