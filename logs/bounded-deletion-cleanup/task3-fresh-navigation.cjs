'use strict';

// Task 3 packaged-navigation evidence harness.
//
// The fixture is a disposable copy of the already isolated BC06 save. The only
// additions are five player-safe routing cards. All route calls use callbacks
// recovered from the packaged React tree; no replacement router or game-state
// mutation bridge is installed.

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const repo = path.resolve(__dirname, '../..');
const req = createRequire(path.join(repo, 'package.json'));
const executablePath = path.join(repo, 'dist-packaged', 'win-unpacked', 'A War Without Victory.exe');
const baseFixturePath = path.join(repo, 'logs', 'bc06', 'fixture-rbih-1.json');
const modalOnly = process.argv.includes('--modal-only');
const evidenceRoot = path.join(
  repo,
  'logs',
  'bounded-deletion-cleanup',
  modalOnly ? 'task3-fresh-navigation-modal-evidence' : 'task3-fresh-navigation-evidence',
);
const profileRoot = path.join(
  repo,
  'dist-packaged',
  'task3-validation-evidence',
  modalOnly ? 'task3-fresh-navigation-modal-profile' : 'task3-fresh-navigation-profile',
);
const fixtureFilename = 'task3-navigation-fixture.json';
const executeGate = '--execute-reviewed-proof';

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function requireFreshDirectory(target, allowedParent) {
  const relative = path.relative(path.resolve(allowedParent), path.resolve(target));
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), `Unsafe output path: ${target}`);
  assert(!fs.existsSync(target), `Fresh output required: ${target}`);
  fs.mkdirSync(target, { recursive: true });
}

function buildFixture() {
  const raw = fs.readFileSync(baseFixturePath);
  const state = JSON.parse(raw);
  const turn = state.meta.turn;
  state.military.last_briefing = {
    turn,
    faction: 'RBiH',
    headline: 'Task 3 route review',
    criticalCount: 1,
    warningCount: 2,
    items: [
      {
        id: 'task3-generic',
        section: 'military',
        severity: 'critical',
        title: 'Task 3 generic Army HQ route',
        detail: 'A player-safe staff summary prepared for isolated route verification.',
        actionLabel: 'Inspect Army HQ',
        target: { kind: 'summary', summaryFocus: 'overview' },
      },
      {
        id: 'hum-enclave-task3',
        section: 'humanitarian',
        severity: 'warning',
        title: 'Task 3 enclave route',
        detail: 'A player-safe enclave brief prepared for isolated route verification.',
        actionLabel: 'Review enclaves',
        target: { kind: 'enclaves', enclaveId: 'gorazde' },
      },
      {
        id: 'task3-inbox',
        section: 'diplomatic',
        severity: 'warning',
        title: 'Task 3 inbox route',
        detail: 'A player-safe presidential desk brief prepared for isolated route verification.',
        actionLabel: "Open President's Desk",
        target: { kind: 'peace_plan', peacePlanId: 'vance_owen' },
      },
    ],
  };
  state.military.negotiation.pending_counter_offers = [{
    id: 'task3_counter',
    author: 'RS',
    target_faction: 'RBiH',
    parent_offer_id: 'vance_owen',
    chain_depth: 1,
    created_turn: turn,
    delta: {
      plan_id: 'vance_owen',
      response: 'conditional_accept',
      proposed_split: { RBiH: 33, RS: 52, HRHB: 15 },
      institutional_model: '10_provinces',
      source_citation: 'Task 3 isolated fixture',
      rider: 'Review route only',
    },
  }];
  state.military.operation_opportunities = [{
    opportunity_id: 'task3_window',
    proposal_id: 'TASK3_OPPORTUNITY',
    eligibility_turn: turn,
    expires_turn: turn + 1,
    status: 'eligible_pending_review',
    approver_faction: 'RBiH',
    last_axis_evaluation: [],
  }];
  state.meta.pending_proposal_reviews = [{
    id: 'TASK3_REVIEW',
    turn,
    faction: 'RBiH',
    domain: 'ops',
    description: 'Task 3 Decision Room route',
    proposed_action: 'OPPORTUNITY:TASK3_OPPORTUNITY',
    current_value: 'pending_review',
    proposed_value: 'approve',
  }];
  return { baseHash: hash(raw), state };
}

function visiblePages(app) {
  return app.windows().filter((page) => !page.url().startsWith('devtools:'));
}

async function findVisible(app, spec) {
  for (const page of visiblePages(app)) {
    for (const frame of page.frames()) {
      let locator;
      if (spec.selector) locator = frame.locator(spec.selector);
      else locator = frame.getByRole(spec.role || 'button', {
        name: spec.name instanceof RegExp ? spec.name : String(spec.name),
        exact: spec.exact !== false && !(spec.name instanceof RegExp),
      });
      for (const candidate of await locator.all()) {
        if (await candidate.isVisible().catch(() => false)) return { page, frame, locator: candidate };
      }
    }
  }
  return null;
}

async function waitVisible(app, spec, timeout = 45000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const found = await findVisible(app, spec);
    if (found) return found;
    await delay(150);
  }
  throw new Error(`Visible target absent: ${JSON.stringify(spec)}`);
}

async function waitAbsent(app, spec, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (!await findVisible(app, spec)) return;
    await delay(100);
  }
  throw new Error(`Target remained visible: ${JSON.stringify(spec)}`);
}

async function click(app, spec) {
  const found = await waitVisible(app, spec);
  assert(await found.locator.isEnabled(), `Target disabled: ${JSON.stringify(spec)}`);
  await found.locator.click();
  return found;
}

async function snapshot(app, outputDir, id, observations) {
  const pages = visiblePages(app);
  const frames = [];
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    await page.screenshot({ path: path.join(outputDir, `${id}-window-${pageIndex}.png`) });
    for (let frameIndex = 0; frameIndex < page.frames().length; frameIndex++) {
      const frame = page.frames()[frameIndex];
      const body = await frame.locator('body').innerText().catch(() => '');
      frames.push({ pageIndex, frameIndex, url: frame.url(), body });
    }
  }
  fs.writeFileSync(path.join(outputDir, `${id}.json`), JSON.stringify({ id, frames }, null, 2));
  observations.push({ id, frames: frames.map(({ pageIndex, frameIndex, url }) => ({ pageIndex, frameIndex, url })) });
  return frames;
}

async function assertPlayerSafe(app) {
  const forbidden = ['task3_counter', 'TASK3_OPPORTUNITY', 'TASK3_REVIEW', 'hum-enclave-task3', 'vance_owen'];
  const visibleText = [];
  for (const page of visiblePages(app)) {
    for (const frame of page.frames()) visibleText.push(await frame.locator('body').innerText().catch(() => ''));
  }
  const combined = visibleText.join('\n');
  for (const internal of forbidden) assert(!combined.includes(internal), `Internal fixture id leaked into player text: ${internal}`);
}

async function invokeActualCallback(app, anchorSelector, propName, argument) {
  const { frame } = await waitVisible(app, { selector: anchorSelector });
  return frame.evaluate(({ anchorSelector, propName, argument }) => {
    const anchor = [...document.querySelectorAll(anchorSelector)].find((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    });
    if (!anchor) throw new Error(`Visible callback anchor absent: ${anchorSelector}`);
    const fiberKey = Object.keys(anchor).find((key) => key.startsWith('__reactFiber$'));
    if (!fiberKey) throw new Error(`React fiber absent on ${anchorSelector}`);
    let fiber = anchor[fiberKey];
    while (fiber) {
      const callback = fiber.memoizedProps && fiber.memoizedProps[propName];
      if (typeof callback === 'function') {
        const result = callback(argument);
        return {
          foundOn: fiber.elementType?.displayName || fiber.elementType?.name || fiber.type?.name || String(fiber.elementType || fiber.type),
          returnType: typeof result,
          returnValue: result === undefined ? '__undefined__' : result,
        };
      }
      fiber = fiber.return;
    }
    throw new Error(`Compiled callback ${propName} was not found from ${anchorSelector}`);
  }, { anchorSelector, propName, argument });
}

async function invokeVisibleReviewItemCallback(app, navigationTarget) {
  for (const page of visiblePages(app)) {
    for (const frame of page.frames()) {
      const receipt = await frame.evaluate((target) => {
        for (const button of document.querySelectorAll('button')) {
          const rect = button.getBoundingClientRect();
          const style = getComputedStyle(button);
          if (rect.width <= 0 || rect.height <= 0 || style.visibility === 'hidden' || style.display === 'none') continue;
          const fiberKey = Object.keys(button).find((key) => key.startsWith('__reactFiber$'));
          if (!fiberKey) continue;
          let fiber = button[fiberKey];
          while (fiber) {
            const props = fiber.memoizedProps;
            if (typeof props?.onReview === 'function' && props.item?.navigationTarget) {
              const syntheticItem = { ...props.item, navigationTarget: target };
              const result = props.onReview(syntheticItem);
              return {
                foundOn: fiber.elementType?.displayName || fiber.elementType?.name || fiber.type?.name || String(fiber.elementType || fiber.type),
                sourceItemId: props.item.id,
                sourceNavigationKind: props.item.navigationTarget.kind,
                invokedNavigationKind: target.kind,
                returnType: typeof result,
                returnValue: result === undefined ? '__undefined__' : result,
              };
            }
            fiber = fiber.return;
          }
        }
        return null;
      }, navigationTarget).catch(() => null);
      if (receipt) return receipt;
    }
  }
  throw new Error('Visible AdvanceTurnModal ReviewItemRow callback was not found');
}

async function openWarroomFromGame(app) {
  await click(app, { selector: '[data-testid="toolbar-route-desk"]' });
  await waitVisible(app, { selector: '[data-testid="warroom-shell"]' });
  await waitVisible(app, { selector: 'button[aria-controls="warroom-priority-docket-panel"]' });
}

async function closeEnclave(app) {
  await click(app, { name: /close humanitarian & siege ledger/i, exact: false });
  await waitAbsent(app, { name: /close humanitarian & siege ledger/i, exact: false });
}

async function main() {
  assert.equal(process.argv[2], executeGate, `Launch gate requires ${executeGate}`);
  assert(fs.existsSync(executablePath), `Packaged executable missing: ${executablePath}`);
  assert(fs.existsSync(baseFixturePath), `Base fixture missing: ${baseFixturePath}`);
  requireFreshDirectory(evidenceRoot, path.join(repo, 'logs', 'bounded-deletion-cleanup'));
  requireFreshDirectory(profileRoot, path.join(repo, 'dist-packaged', 'task3-validation-evidence'));
  const saveDir = path.join(profileRoot, 'saves');
  fs.mkdirSync(saveDir);

  const { baseHash, state } = buildFixture();
  const fixtureText = `${JSON.stringify(state, null, 2)}\n`;
  const evidenceFixture = path.join(evidenceRoot, fixtureFilename);
  const profileFixture = path.join(saveDir, fixtureFilename);
  fs.writeFileSync(evidenceFixture, fixtureText);
  fs.writeFileSync(profileFixture, fixtureText);
  const fixtureHash = hash(fixtureText);
  fs.writeFileSync(path.join(evidenceRoot, 'provenance.json'), JSON.stringify({
    proofKind: 'packaged Electron; visible entrypoints plus actual compiled React callback invocation',
    executablePath,
    executableSha256: hash(fs.readFileSync(executablePath)),
    baseFixturePath,
    baseFixtureSha256: baseHash,
    fixtureSha256: fixtureHash,
    profileRoot,
    limits: [
      'Synthetic isolated fixture proves route wiring and player-safe presentation, not natural campaign frequency.',
      'Briefing-category enclave, inbox, and generic cards are excluded by the current pre-advance read-model filter, so those reviewPreAdvanceTarget branches are invoked through the actual packaged callback recovered from React fiber.',
    ],
  }, null, 2));

  const { _electron: electron } = req('playwright');
  const app = await electron.launch({
    executablePath,
    args: [`--user-data-dir=${profileRoot}`],
    cwd: repo,
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
    timeout: 90000,
  });
  const diagnostics = [];
  const observations = [];
  const callbackReceipts = [];
  const resumeAfterCounter = process.argv.includes('--resume-after-counter');
  const observe = (page) => {
    page.on('pageerror', (error) => diagnostics.push({ kind: 'pageerror', message: String(error) }));
    page.on('console', (message) => {
      if (message.type() === 'error') diagnostics.push({ kind: 'console-error', message: message.text() });
    });
    page.on('requestfailed', (request) => diagnostics.push({ kind: 'requestfailed', url: request.url(), error: request.failure() }));
    page.on('response', (response) => {
      if (response.status() >= 400) diagnostics.push({ kind: 'http', url: response.url(), status: response.status() });
    });
  };
  app.windows().forEach(observe);
  app.on('window', observe);
  app.process().stdout?.on('data', (chunk) => fs.appendFileSync(path.join(evidenceRoot, 'main.stdout.log'), chunk));
  app.process().stderr?.on('data', (chunk) => fs.appendFileSync(path.join(evidenceRoot, 'main.stderr.log'), chunk));

  try {
    await click(app, { name: 'Assume responsibility' });
    await click(app, { name: 'Field Records' });
    await click(app, { name: `Resume ${path.basename(fixtureFilename, '.json')}` });
    await waitVisible(app, { selector: '[data-testid="toolbar-route-desk"]' }, 60000);
    await snapshot(app, evidenceRoot, '00-loaded-fixture', observations);
    await assertPlayerSafe(app);

    if (process.argv.includes('--pause-for-inspection')) {
      process.stdout.write(`TASK3_WINDOW_READY ${JSON.stringify({ evidenceRoot, profileRoot })}\n`);
      process.stdout.write('Press Enter to continue automated route checks.\n');
      await new Promise((resolve) => process.stdin.once('data', resolve));
    }

    if (modalOnly) {
      await openWarroomFromGame(app);
      const modalCases = [
        { id: 'decision-room', target: { kind: 'decision-room', lens: 'opportunity', cardId: 'opportunity:TASK3_OPPORTUNITY' } },
        { id: 'counter-offer', target: { kind: 'counter-offer', counterOfferId: 'task3_counter' } },
        { id: 'enclave-dashboard', target: { kind: 'enclave-dashboard' } },
        { id: 'inbox', target: { kind: 'inbox' } },
        { id: 'generic-army-hq', target: { kind: 'army-hq-tab', tab: 'summary' } },
      ];
      for (const route of modalCases) {
        await click(app, { selector: '[data-testid="warroom-toolbar-advance"]' });
        await waitVisible(app, { selector: '#advance-turn-title' });
        const receipt = await invokeVisibleReviewItemCallback(app, route.target);
        callbackReceipts.push({ owner: 'AdvanceTurnModal.handleReviewItem', route: route.id, ...receipt });
        assert.deepEqual([receipt.returnType, receipt.returnValue], ['undefined', '__undefined__']);
        await waitAbsent(app, { selector: '#advance-turn-title' });

        if (route.id === 'decision-room') {
          await waitVisible(app, { selector: '[data-testid="warroom-decision-room-host"]' });
          await waitVisible(app, { selector: '[data-testid="warroom-shell"]' });
          const frames = await snapshot(app, evidenceRoot, `modal-${route.id}-destination`, observations);
          assert(frames.some((entry) => entry.body.includes('Task 3 Decision Room route')));
          await click(app, { selector: '[data-testid="warroom-decision-room-close"]' });
          await waitAbsent(app, { selector: '[data-testid="warroom-decision-room-host"]' });
        } else if (route.id === 'counter-offer') {
          await waitVisible(app, { selector: '#counter-offer-modal-title' });
          await waitAbsent(app, { selector: '[data-testid="warroom-shell"]' });
          const frames = await snapshot(app, evidenceRoot, `modal-${route.id}-destination`, observations);
          assert(frames.some((entry) => entry.body.includes('Task 3 isolated fixture')));
          await click(app, { name: /review later/i, exact: false });
          await waitAbsent(app, { selector: '#counter-offer-modal-title' });
          await openWarroomFromGame(app);
        } else if (route.id === 'enclave-dashboard') {
          await waitVisible(app, { name: /close humanitarian & siege ledger/i, exact: false });
          await waitAbsent(app, { selector: '[data-testid="warroom-shell"]' });
          const frames = await snapshot(app, evidenceRoot, `modal-${route.id}-destination`, observations);
          assert(frames.some((entry) => entry.body.includes('HUMANITARIAN & SIEGE LEDGER')));
          await closeEnclave(app);
          await openWarroomFromGame(app);
        } else if (route.id === 'inbox') {
          await waitVisible(app, { selector: '[data-testid="president-desk-shell"]' });
          await waitVisible(app, { selector: '[data-testid="warroom-shell"]' });
          const frames = await snapshot(app, evidenceRoot, `modal-${route.id}-destination`, observations);
          assert(frames.some((entry) => entry.body.includes("PRESIDENT'S DESK")));
          await click(app, { selector: '[data-testid="desk-close-overlay"]' });
          await waitAbsent(app, { selector: '[data-testid="president-desk-shell"]' });
        } else {
          await waitVisible(app, { selector: '[data-testid="army-hq-modal"]' });
          await waitVisible(app, { selector: '[data-testid="army-hq-tab-summary"][aria-selected="true"]' });
          await waitAbsent(app, { selector: '[data-testid="warroom-shell"]' });
          await waitVisible(app, { selector: '[data-testid="army-hq-desk-return"]' });
          const frames = await snapshot(app, evidenceRoot, `modal-${route.id}-destination`, observations);
          assert(frames.some((entry) => entry.body.includes('MAIN STAFF')));
          await click(app, { selector: '[data-testid="army-hq-desk-return"]' });
          await waitVisible(app, { selector: '[data-testid="warroom-shell"]' });
          await waitAbsent(app, { selector: '[data-testid="army-hq-modal"]' });
        }
        await assertPlayerSafe(app);
        observations.push({ id: `modal-${route.id}-return-complete`, modalAbsent: true, returnControlWorked: true });
      }

      assert.equal(hash(fs.readFileSync(evidenceFixture)), fixtureHash, 'Evidence fixture changed during proof');
      assert.equal(hash(fs.readFileSync(profileFixture)), fixtureHash, 'Loaded fixture changed during proof');
      const disallowedDiagnostics = diagnostics.filter((entry) => {
        const url = String(entry.url || '');
        if (entry.kind === 'requestfailed' && /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\//.test(url)) return false;
        if (url.includes('favicon.ico') || url.startsWith('data:') || url.startsWith('blob:')) return false;
        return true;
      });
      assert.deepEqual(disallowedDiagnostics, [], `Packaged renderer errors: ${JSON.stringify(disallowedDiagnostics)}`);
      fs.writeFileSync(path.join(evidenceRoot, 'result.json'), JSON.stringify({
        pass: true,
        mode: 'modal-only',
        fixtureHash,
        callbackReceipts,
        observations,
        diagnostics,
        disallowedDiagnostics,
      }, null, 2));
      return;
    }

    if (!resumeAfterCounter) {
      // Natural pre-advance entrypoint -> Decision Room.
      await click(app, { selector: '[data-tutorial-step="advance-turn-button"]' });
      await waitVisible(app, { selector: '#advance-turn-title' });
      await click(app, { name: 'Review Dossier' });
      await waitVisible(app, { selector: '[data-testid="warroom-decision-room-host"]' });
      await waitAbsent(app, { selector: '#advance-turn-title' });
      await snapshot(app, evidenceRoot, '01-natural-pre-advance-decision-room', observations);
      await click(app, { selector: '[data-testid="warroom-decision-room-close"]' });

      // Natural docket entrypoint -> Decision Room.
      await click(app, { selector: 'button[aria-controls="warroom-priority-docket-panel"]' });
      await waitVisible(app, { selector: '[data-testid="warroom-priority-docket-panel"]' });
      await snapshot(app, evidenceRoot, '02-natural-docket', observations);
      await click(app, { name: 'Open Decision Room' });
      await waitVisible(app, { selector: '[data-testid="warroom-decision-room-host"]' });
      await snapshot(app, evidenceRoot, '03-natural-docket-decision-room', observations);
      await click(app, { selector: '[data-testid="warroom-decision-room-close"]' });
    } else {
      await openWarroomFromGame(app);
    }

    const reviewAnchor = 'button[aria-controls="warroom-priority-docket-panel"]';
    const reviewCases = [
      { id: 'decision-room', target: { kind: 'decision-room', lens: 'opportunity', cardId: 'opportunity:TASK3_OPPORTUNITY' } },
      { id: 'counter-offer', target: { kind: 'counter-offer', counterOfferId: 'task3_counter' } },
      { id: 'enclave-dashboard', target: { kind: 'enclave-dashboard' } },
      { id: 'inbox', target: { kind: 'inbox' } },
      { id: 'generic-army-hq', target: { kind: 'army-hq-tab', tab: 'summary' } },
    ];

    for (const route of resumeAfterCounter ? reviewCases.slice(2) : reviewCases) {
      const receipt = await invokeActualCallback(app, reviewAnchor, 'onReviewTarget', route.target);
      callbackReceipts.push({ owner: 'reviewPreAdvanceTarget', route: route.id, ...receipt });
      assert.equal(receipt.returnType, 'undefined');
      assert.equal(receipt.returnValue, '__undefined__');
      if (route.id === 'decision-room') {
        await waitVisible(app, { selector: '[data-testid="warroom-decision-room-host"]' });
        await waitVisible(app, { selector: '[data-testid="warroom-shell"]' });
        await click(app, { selector: '[data-testid="warroom-decision-room-close"]' });
      } else if (route.id === 'counter-offer') {
        await waitVisible(app, { selector: '#counter-offer-modal-title' });
        await waitAbsent(app, { selector: '[data-testid="warroom-shell"]' });
        const frames = await snapshot(app, evidenceRoot, '04-review-counter-offer', observations);
        assert(frames.some((entry) => entry.body.includes('Task 3 isolated fixture')));
        await click(app, { name: /review later/i, exact: false });
        await openWarroomFromGame(app);
      } else if (route.id === 'enclave-dashboard') {
        await waitVisible(app, { name: /close humanitarian & siege ledger/i, exact: false });
        await waitAbsent(app, { selector: '[data-testid="warroom-shell"]' });
        await closeEnclave(app);
        await openWarroomFromGame(app);
      } else if (route.id === 'inbox') {
        await waitVisible(app, { selector: '[data-testid="president-desk-shell"]' });
        await waitVisible(app, { selector: '[data-testid="warroom-shell"]' });
        await click(app, { selector: '[data-testid="desk-close-overlay"]' });
      } else {
        await waitVisible(app, { selector: '[data-testid="army-hq-modal"]' });
        await waitVisible(app, { selector: '[data-testid="army-hq-tab-summary"][aria-selected="true"]' });
        await waitAbsent(app, { selector: '[data-testid="warroom-shell"]' });
        await waitVisible(app, { selector: '[data-testid="army-hq-desk-return"]' });
        await click(app, { selector: '[data-testid="army-hq-desk-return"]' });
        await waitVisible(app, { selector: '[data-testid="warroom-shell"]' });
      }
      await snapshot(app, evidenceRoot, `review-${route.id}`, observations);
      await assertPlayerSafe(app);
    }

    // Enter Army HQ through the visible shell, then invoke its packaged
    // openDecisionRoomTarget callback. This handler intentionally returns a
    // boolean and differs in which shell it closes.
    await click(app, { selector: '[data-testid="warroom-toolbar-staff"]' });
    await waitVisible(app, { selector: '[data-testid="army-hq-modal"]' });
    const decisionAnchor = '[data-testid="army-hq-modal"]';

    let receipt = await invokeActualCallback(app, decisionAnchor, 'onDecisionRoomNavigateTarget', { kind: 'army-hq-tab', tab: 'briefing' });
    callbackReceipts.push({ owner: 'openDecisionRoomTarget', route: 'generic-army-hq', ...receipt });
    assert.deepEqual([receipt.returnType, receipt.returnValue], ['boolean', true]);
    await waitVisible(app, { selector: '[data-testid="army-hq-modal"]' });
    await waitVisible(app, { selector: '[data-testid="army-hq-tab-briefing"][aria-selected="true"]' });

    receipt = await invokeActualCallback(app, decisionAnchor, 'onDecisionRoomNavigateTarget', { kind: 'counter-offer', counterOfferId: 'task3_counter' });
    callbackReceipts.push({ owner: 'openDecisionRoomTarget', route: 'counter-offer', ...receipt });
    assert.deepEqual([receipt.returnType, receipt.returnValue], ['boolean', true]);
    await waitVisible(app, { selector: '#counter-offer-modal-title' });
    await waitVisible(app, { selector: '[data-testid="army-hq-modal"]' });
    await click(app, { name: /review later/i, exact: false });

    receipt = await invokeActualCallback(app, decisionAnchor, 'onDecisionRoomNavigateTarget', { kind: 'enclave-dashboard' });
    callbackReceipts.push({ owner: 'openDecisionRoomTarget', route: 'enclave-dashboard', ...receipt });
    assert.deepEqual([receipt.returnType, receipt.returnValue], ['boolean', true]);
    await waitVisible(app, { name: /close humanitarian & siege ledger/i, exact: false });
    await waitAbsent(app, { selector: '[data-testid="army-hq-modal"]' });
    await closeEnclave(app);
    await click(app, { selector: '[data-testid="toolbar-route-army-hq"]' });
    await waitVisible(app, { selector: '[data-testid="army-hq-modal"]' });

    receipt = await invokeActualCallback(app, decisionAnchor, 'onDecisionRoomNavigateTarget', { kind: 'inbox' });
    callbackReceipts.push({ owner: 'openDecisionRoomTarget', route: 'inbox', ...receipt });
    assert.deepEqual([receipt.returnType, receipt.returnValue], ['boolean', true]);
    await waitVisible(app, { selector: '[data-testid="president-desk-shell"]' });
    await waitAbsent(app, { selector: '[data-testid="army-hq-modal"]' });
    await click(app, { selector: '[data-testid="warroom-toolbar-staff"]' });
    await waitVisible(app, { selector: '[data-testid="army-hq-modal"]' });

    receipt = await invokeActualCallback(app, decisionAnchor, 'onDecisionRoomNavigateTarget', { kind: 'decision-room', lens: 'all' });
    callbackReceipts.push({ owner: 'openDecisionRoomTarget', route: 'decision-room', ...receipt });
    assert.deepEqual([receipt.returnType, receipt.returnValue], ['boolean', true]);
    await waitVisible(app, { selector: '[data-testid="warroom-decision-room-host"]' });
    await waitVisible(app, { selector: '[data-testid="warroom-shell"]' });
    await waitAbsent(app, { selector: '[data-testid="army-hq-modal"]' });

    await snapshot(app, evidenceRoot, '10-open-decision-room-target-final', observations);
    await assertPlayerSafe(app);
    assert.equal(hash(fs.readFileSync(evidenceFixture)), fixtureHash, 'Evidence fixture changed during proof');
    assert.equal(hash(fs.readFileSync(profileFixture)), fixtureHash, 'Loaded fixture changed during proof');

    const disallowedDiagnostics = diagnostics.filter((entry) => {
      const url = String(entry.url || '');
      if (entry.kind === 'requestfailed' && /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\//.test(url)) return false;
      if (url.includes('favicon.ico') || url.startsWith('data:') || url.startsWith('blob:')) return false;
      return true;
    });
    assert.deepEqual(disallowedDiagnostics, [], `Packaged renderer errors: ${JSON.stringify(disallowedDiagnostics)}`);
    fs.writeFileSync(path.join(evidenceRoot, 'result.json'), JSON.stringify({
      pass: true,
      fixtureHash,
      callbackReceipts,
      observations,
      diagnostics,
      disallowedDiagnostics,
    }, null, 2));
  } catch (error) {
    await snapshot(app, evidenceRoot, 'failure', observations).catch(() => {});
    fs.writeFileSync(path.join(evidenceRoot, 'result.json'), JSON.stringify({
      pass: false,
      error: String(error?.stack || error),
      callbackReceipts,
      observations,
      diagnostics,
    }, null, 2));
    throw error;
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
