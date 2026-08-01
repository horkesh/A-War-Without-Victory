const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { _electron: electron } = require('playwright');

const repo = path.resolve(__dirname, '..', '..');
const outDir = path.join(repo, 'tmp-paradox-qa-20260710');
const screenshotsDir = path.join(outDir, 'screenshots');
const userDataRoot = path.join(outDir, 'user-data');

fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(userDataRoot, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const buttonSelector = 'button, [role="button"], input[type="button"], input[type="submit"], a[href]';
const args = new Set(process.argv.slice(2));
const maxTurns = Number(process.argv.find((arg) => arg.startsWith('--turns='))?.split('=')[1] ?? '10');
const runLabel = process.argv.find((arg) => arg.startsWith('--label='))?.split('=')[1] ?? 'run';
const skipInitialTour = args.has('--skip-initial-tour');
const skipCheckpointTour = args.has('--no-checkpoint-tour');
const lightCheckpointTour = args.has('--light-checkpoint-tour');
const writeLiveEvents = args.has('--live-events');
const strategicRun = args.has('--strategic');
const autoRecruit = args.has('--auto-recruit');
const requireRecruitment = args.has('--require-recruitment');
const contextChurnCycles = Number(process.argv.find((arg) => arg.startsWith('--context-churn='))?.split('=')[1] ?? '0');
const finalCheckpointTour = args.has('--final-checkpoint-tour');
const requiredMapOriginArg = process.argv.find((arg) => arg.startsWith('--require-map-origin='))?.slice('--require-map-origin='.length);
const requiredMapOrigin = requiredMapOriginArg ? new URL(requiredMapOriginArg).origin : null;
const resumeSavePathArg = process.argv.find((arg) => arg.startsWith('--resume-save='))?.slice('--resume-save='.length);
const resumeSavePath = resumeSavePathArg ? path.resolve(repo, resumeSavePathArg) : null;
const packagedExecutableArg = process.argv.find((arg) => arg.startsWith('--packaged-executable='))?.slice('--packaged-executable='.length);
const packagedExecutablePath = packagedExecutableArg ? path.resolve(repo, packagedExecutableArg) : null;
if (packagedExecutablePath && !fs.existsSync(packagedExecutablePath)) {
  throw new Error(`Packaged Electron executable not found: ${packagedExecutablePath}`);
}
const MAP_NAVIGATION_ABORT_WINDOW_MS = 45_000;
let activeMapNavigationAbortWindow = null;
let mapNavigationAbortWindowSequence = 0;

function beginMapNavigationAbortWindow(frame, label) {
  if (!packagedExecutablePath) return null;
  let frameUrl;
  try {
    frameUrl = new URL(frame.url());
  } catch {
    return null;
  }
  if (frameUrl.protocol !== 'http:' || frameUrl.hostname !== '127.0.0.1') return null;
  const token = `map-navigation:${++mapNavigationAbortWindowSequence}:${safeName(label)}`;
  const openedAtMs = Date.now();
  activeMapNavigationAbortWindow = {
    active: true,
    token,
    runtime: 'packaged-local',
    expectedOrigin: frameUrl.origin,
    openedAtMs,
    expiresAtMs: openedAtMs + MAP_NAVIGATION_ABORT_WINDOW_MS,
  };
  return token;
}

function getActiveMapNavigationAbortWindow(observedAtMs = Date.now()) {
  if (!activeMapNavigationAbortWindow) return null;
  if (observedAtMs > activeMapNavigationAbortWindow.expiresAtMs) {
    activeMapNavigationAbortWindow = null;
    return null;
  }
  return { ...activeMapNavigationAbortWindow };
}

function endMapNavigationAbortWindow(token) {
  if (token && activeMapNavigationAbortWindow?.token === token) activeMapNavigationAbortWindow = null;
}

async function withinMapNavigationAbortWindow(frame, label, action) {
  const token = beginMapNavigationAbortWindow(frame, label);
  try {
    return await action();
  } finally {
    endMapNavigationAbortWindow(token);
  }
}
const developmentCanonicalAutosavePath = path.join(repo, 'saves', 'autosave.json');
let canonicalAutosavePath = developmentCanonicalAutosavePath;
let canonicalAutosavePersistenceAtResumeLoad = null;
const factions = args.has('--all-factions')
  ? ['RS', 'RBiH', 'HRHB']
  : [process.argv.find((arg) => arg.startsWith('--faction='))?.split('=')[1] ?? 'RS'];

function requiredRsEventReceiptIds(faction, targetTurn, isResume) {
  if (faction !== 'RS' || targetTurn < 52 || isResume) return [];
  return [
    'rs_strategic_goals',
    'rs_paramilitary_policy_1992',
    'drina_cleansing_decision_1992',
    'concentration_camps_revealed_1992',
  ];
}

function assertHistoricalEventAnchors(faction, targetTurn, isResume, state) {
  if (faction !== 'RS' || targetTurn < 52 || isResume) return [];
  const anchors = [
    { eventId: 'jna_withdrawal_1992', latestTurn: 8 },
    { eventId: 'sarajevo_siege_begins_1992', latestTurn: 10 },
    { eventId: 'operation_corridor_1992', latestTurn: 16 },
    { eventId: 'srebrenica_enclave_forms_1992', latestTurn: 23 },
    { eventId: 'jajce_falls_1992', latestTurn: 32 },
  ];
  return anchors.map((anchor) => {
    const count = state?.eventFireCounts?.[anchor.eventId] ?? 0;
    const turn = state?.eventLastFiredTurns?.[anchor.eventId] ?? null;
    if (count !== 1) {
      throw new Error(`Historical event anchor ${anchor.eventId} expected one firing, observed ${count}`);
    }
    if (!Number.isInteger(turn) || turn > anchor.latestTurn) {
      throw new Error(`Historical event anchor ${anchor.eventId} expected by turn ${anchor.latestTurn}, observed ${turn ?? 'unavailable'}`);
    }
    return { ...anchor, count, turn, passed: true };
  });
}

function safeName(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

function strictAsciiCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function comparePendingEventDecisionPriority(left, right) {
  const leftRequired = left?.decision?.requires_player_response === true ? 0 : 1;
  const rightRequired = right?.decision?.requires_player_response === true ? 0 : 1;
  if (leftRequired !== rightRequired) return leftRequired - rightRequired;
  const leftTurn = Number(left?.decision?.turn_fired ?? 0);
  const rightTurn = Number(right?.decision?.turn_fired ?? 0);
  if (leftTurn !== rightTurn) return leftTurn - rightTurn;
  return strictAsciiCompare(String(left?.id ?? ''), String(right?.id ?? ''));
}

function resolveVisibleEventDecisionId(pendingEventId, visibleEventId) {
  return visibleEventId || pendingEventId || null;
}

function assessCounterVerificationCoverage(
  initialIds,
  attemptedIds,
  verifiedIds,
  requireFormationProof,
) {
  const initialTargetIds = [...new Set(initialIds)].slice(0, 12);
  const attempted = new Set(attemptedIds);
  const verified = new Set(verifiedIds);
  return {
    ok: !requireFormationProof || verified.size > 0,
    initialTargetCount: initialTargetIds.length,
    attemptedCount: attempted.size,
    verifiedCount: verified.size,
    unavailableInitialIds: initialTargetIds.filter((id) => !attempted.has(id)),
  };
}

function computeWorkingTreeContentFingerprint() {
  const excludedGeneratedPrefixes = [
    'tmp-paradox-qa-20260710/',
    'tmp-playtest-rs-10turn/',
    'tmp-zepa-trace/',
  ];
  const status = execFileSync(
    'git',
    [
      '-c', 'core.quotepath=false',
      'status', '--porcelain=v1', '-z', '--untracked-files=all',
      '--', '.',
      ...excludedGeneratedPrefixes.map((prefix) => `:(exclude)${prefix}**`),
    ],
    { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const records = status.split('\0').filter(Boolean);
  const entries = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const statusCode = record.slice(0, 2);
    const relativePath = record.slice(3).replaceAll('\\', '/');
    const paths = [relativePath];
    if (statusCode.includes('R') || statusCode.includes('C')) {
      const sourcePath = records[index + 1];
      if (sourcePath) paths.push(sourcePath.replaceAll('\\', '/'));
      index += 1;
    }
    for (const candidate of paths.sort(strictAsciiCompare)) {
      const absolutePath = path.resolve(repo, candidate);
      const insideRepo = absolutePath === repo || absolutePath.startsWith(`${repo}${path.sep}`);
      if (!insideRepo) throw new Error(`Worktree fingerprint path escaped repository: ${candidate}`);
      const stat = fs.existsSync(absolutePath) ? fs.statSync(absolutePath) : null;
      entries.push({
        status: statusCode,
        path: candidate,
        sha256: stat?.isFile() ? fileSha256(absolutePath) : null,
        bytes: stat?.isFile() ? stat.size : null,
      });
    }
  }
  entries.sort((left, right) => strictAsciiCompare(
    `${left.path}\0${left.status}`,
    `${right.path}\0${right.status}`,
  ));
  return {
    sha256: crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex'),
    fileCount: entries.length,
    excludedGeneratedPrefixes,
  };
}

function isUnresolvedPlayerProposal(proposal) {
  return Boolean(proposal)
    && proposal.accepted == null
    && proposal.opportunity_decision == null
    && proposal.resolved_turn == null;
}

function sortUnresolvedPlayerProposals(proposals) {
  return [...proposals]
    .filter(isUnresolvedPlayerProposal)
    .sort((left, right) => {
      const leftKey = `${left?.id ?? left?.proposal_id ?? ''}\u0000${left?.proposed_action ?? left?.action ?? ''}`;
      const rightKey = `${right?.id ?? right?.proposal_id ?? ''}\u0000${right?.proposed_action ?? right?.action ?? ''}`;
      return strictAsciiCompare(leftKey, rightKey);
    });
}

function selectProposalForQa(proposals, allowOrdinary) {
  const unresolved = sortUnresolvedPlayerProposals(proposals ?? []);
  const historical = unresolved.find((proposal) => {
    const action = proposal?.proposed_action ?? proposal?.action ?? '';
    return typeof action === 'string' && action.startsWith('HISTORICAL_OP:');
  });
  return historical ?? (allowOrdinary ? unresolved[0] ?? null : null);
}

function proposalDecisionRoomRoute(reviewId, proposedAction) {
  const opportunityProposalId = typeof proposedAction === 'string' && proposedAction.startsWith('OPPORTUNITY:')
    ? proposedAction.slice('OPPORTUNITY:'.length)
    : null;
  const historicalOperation = typeof proposedAction === 'string' && proposedAction.startsWith('HISTORICAL_OP:');
  return {
    categoryId: opportunityProposalId || historicalOperation ? 'war_direction' : 'command',
    priorityCardId: opportunityProposalId
      ? `opportunity:${opportunityProposalId}`
      : `command:review-proposal:${reviewId}`,
    actionLabel: opportunityProposalId ? 'Authorize' : 'Accept',
  };
}

function assertExactProposalResolution(proposalId, beforeRecords, afterRecords) {
  const before = beforeRecords.find((record) => record?.id === proposalId);
  if (!before || before.unresolved !== true) {
    throw new Error(`Exact proposal was not unresolved before response: ${proposalId}`);
  }
  const after = afterRecords.find((record) => record?.id === proposalId);
  if (!after) throw new Error(`Exact proposal disappeared without a resolution record: ${proposalId}`);
  if (after.unresolved === true) throw new Error(`Exact proposal remained unresolved after visible response: ${proposalId}`);
  return after;
}

function assertExactEventDecisionReceipt(eventId, beforeReceipts, afterReceipts) {
  const receiptKey = (receipt) => JSON.stringify([
    receipt?.eventId ?? null,
    receipt?.responseId ?? null,
    receipt?.decisionSource ?? null,
    receipt?.faction ?? null,
    receipt?.turn ?? null,
  ]);
  const prior = new Set(beforeReceipts.map(receiptKey));
  const exact = afterReceipts.find((receipt) => receipt?.eventId === eventId && !prior.has(receiptKey(receipt)));
  if (!exact) throw new Error(`No new exact event decision receipt was recorded for ${eventId}`);
  if (exact.decisionSource !== 'player' || typeof exact.responseId !== 'string' || exact.responseId.length === 0) {
    throw new Error(`Exact event ${eventId} did not record a complete player decision receipt`);
  }
  return exact;
}

function decisionReceiptKey(receipt) {
  return JSON.stringify(Object.keys(receipt ?? {})
    .sort(strictAsciiCompare)
    .map((key) => [key, receipt[key] ?? null]));
}

function assertNewExactDecisionReceipt(family, identityField, identity, beforeReceipts, afterReceipts, expected = {}) {
  const prior = new Set((beforeReceipts ?? []).map(decisionReceiptKey));
  const exact = (afterReceipts ?? []).find((receipt) =>
    receipt?.[identityField] === identity && !prior.has(decisionReceiptKey(receipt))
  );
  if (!exact) throw new Error(`No new exact ${family} decision receipt was recorded for ${identity}`);
  for (const key of Object.keys(expected).sort(strictAsciiCompare)) {
    if (exact[key] !== expected[key]) {
      throw new Error(`${family} receipt field ${key} mismatch for ${identity}: expected ${expected[key]}, received ${exact[key]}`);
    }
  }
  return exact;
}

async function waitForNewExactDecisionReceipt(
  frame,
  family,
  identityField,
  identity,
  beforeReceipts,
  expected = {},
  timeoutMs = 5000,
) {
  const deadline = Date.now() + timeoutMs;
  let after = null;
  do {
    after = await readState(frame);
    const prior = new Set((beforeReceipts ?? []).map(decisionReceiptKey));
    const exact = (after?.[`${family.replace('-', '')}DecisionReceipts`] ?? []).find((receipt) =>
      receipt?.[identityField] === identity && !prior.has(decisionReceiptKey(receipt))
    );
    if (exact) {
      return {
        after,
        receipt: assertNewExactDecisionReceipt(
          family,
          identityField,
          identity,
          beforeReceipts,
          after?.[`${family.replace('-', '')}DecisionReceipts`] ?? [],
          expected,
        ),
      };
    }
    if (Date.now() < deadline) await sleep(250);
  } while (Date.now() < deadline);

  return {
    after,
    receipt: assertNewExactDecisionReceipt(
      family,
      identityField,
      identity,
      beforeReceipts,
      after?.[`${family.replace('-', '')}DecisionReceipts`] ?? [],
      expected,
    ),
  };
}

function assertExactParamilitaryDecisionReceipts(requestIds, beforeReceipts, afterReceipts, faction, decision) {
  return [...requestIds].sort(strictAsciiCompare).map((targetOsid) => assertNewExactDecisionReceipt(
    'paramilitary',
    'targetOsid',
    targetOsid,
    beforeReceipts,
    afterReceipts,
    { faction, decision },
  ));
}

function normalizeOfficerSubject(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || null;
}

function officerEventDedupeKey(event) {
  const subject = normalizeOfficerSubject(event?.officer_id)
    ?? normalizeOfficerSubject(event?.current_commander_id)
    ?? normalizeOfficerSubject(event?.officer_name)
    ?? normalizeOfficerSubject(event?.current_commander_name)
    ?? normalizeOfficerSubject(event?.event_id)
    ?? 'unknown';
  return `${event?.type ?? 'officer_event'}:${subject}`;
}

function isPlayerVisibleCounterOffer(offer, playerFaction) {
  if (!offer) return false;
  if (!playerFaction) return true;
  const targetFaction = offer.targetFaction ?? offer.target_faction ?? offer.delta?.target_faction ?? null;
  return targetFaction === playerFaction || offer.author === playerFaction || offer.author === 'PLAYER';
}

function projectCanonicalDecisionReceipts(state, playerFaction) {
  const sortReceipts = (receipts) => [...receipts]
    .sort((left, right) => strictAsciiCompare(decisionReceiptKey(left), decisionReceiptKey(right)));
  const military = state?.military ?? {};
  return {
    peacePlanDecisionReceipts: sortReceipts(
      (Array.isArray(military.negotiation?.peace_plan_history) ? military.negotiation.peace_plan_history : [])
        .filter((receipt) => receipt && typeof receipt.plan_id === 'string')
        .map((receipt) => ({
          planId: receipt.plan_id,
          turn: receipt.turn_offered ?? null,
          response: playerFaction ? receipt.responses?.[playerFaction] ?? null : null,
          resolved: receipt.resolved === true,
        })),
    ),
    reserveDecisionReceipts: sortReceipts(
      (Array.isArray(military.reserve_request_history) ? military.reserve_request_history : [])
        .filter((receipt) => receipt && (!playerFaction || receipt.faction === playerFaction))
        .map((receipt) => ({
          requestId: receipt.request_id ?? null,
          turn: receipt.turn ?? null,
          faction: receipt.faction ?? null,
          brigadeId: receipt.brigade_id ?? null,
          outcome: receipt.outcome ?? null,
          decidedBy: receipt.decided_by ?? null,
        }))
        .filter((receipt) => typeof receipt.requestId === 'string' && receipt.requestId.length > 0),
    ),
    convoyDecisionReceipts: sortReceipts(
      (Array.isArray(military.convoy_decision_history) ? military.convoy_decision_history : [])
        .filter((receipt) => receipt && (!playerFaction || receipt.route_faction === playerFaction))
        .map((receipt) => ({
          id: receipt.id ?? null,
          turn: receipt.turn ?? null,
          routeFaction: receipt.route_faction ?? null,
          targetFaction: receipt.target_faction ?? null,
          decision: receipt.decision ?? null,
          decidedBy: receipt.decided_by ?? null,
        }))
        .filter((receipt) => typeof receipt.id === 'string' && receipt.id.length > 0),
    ),
    officerDecisionReceipts: sortReceipts(
      (Array.isArray(military.officer_decision_history) ? military.officer_decision_history : [])
        .filter((receipt) => receipt && (!playerFaction || receipt.faction === playerFaction))
        .map((receipt) => ({
          id: receipt.id ?? null,
          eventId: receipt.event_id ?? null,
          eventType: receipt.event_type ?? null,
          turn: receipt.turn ?? null,
          faction: receipt.faction ?? null,
          decision: receipt.decision ?? null,
        }))
        .filter((receipt) => typeof receipt.eventId === 'string' && receipt.eventId.length > 0),
    ),
    paramilitaryDecisionReceipts: sortReceipts(
      (Array.isArray(state?.paramilitary_decision_history) ? state.paramilitary_decision_history : [])
        .filter((receipt) => receipt && (!playerFaction || receipt.faction === playerFaction))
        .map((receipt) => ({
          id: receipt.id ?? null,
          targetOsid: receipt.target_osid ?? null,
          turn: receipt.turn ?? null,
          faction: receipt.faction ?? null,
          decision: receipt.decision ?? null,
        }))
        .filter((receipt) => typeof receipt.targetOsid === 'string' && receipt.targetOsid.length > 0),
    ),
  };
}

function readCanonicalDecisionReceiptsFromAutosave(autosavePath, playerFaction) {
  if (!fs.existsSync(autosavePath)) throw new Error(`Canonical autosave missing for decision receipt proof: ${autosavePath}`);
  return projectCanonicalDecisionReceipts(JSON.parse(fs.readFileSync(autosavePath, 'utf8')), playerFaction);
}

function resolveDecisionReceiptAutosavePath(
  canonicalPath,
  loadedResumePath,
  canonicalPersistenceAtLoad,
  currentCanonicalPersistence,
) {
  if (loadedResumePath && canonicalPersistenceAtLoad === currentCanonicalPersistence) return loadedResumePath;
  return canonicalPath;
}

function buildPlayerBlockerInventory(raw, playerFaction, known) {
  const military = raw?.military ?? {};
  const proposals = Array.isArray(raw?.meta?.pending_proposal_reviews) ? raw.meta.pending_proposal_reviews : [];
  const coveredOpportunityIds = new Set(proposals
    .filter((proposal) => proposal
      && (!playerFaction || proposal.faction === playerFaction)
      && proposal.accepted == null
      && proposal.opportunity_decision == null
      && proposal.resolved_turn == null
      && typeof proposal.proposed_action === 'string'
      && proposal.proposed_action.startsWith('OPPORTUNITY:'))
    .map((proposal) => proposal.proposed_action.slice('OPPORTUNITY:'.length)));
  const reserves = (Array.isArray(military.pending_reserve_requests) ? military.pending_reserve_requests : [])
    .filter((request) => request && (!playerFaction || request.faction === playerFaction)).length;
  const convoys = (Array.isArray(military.pending_convoy_decisions) ? military.pending_convoy_decisions : [])
    .filter((decision) => decision
      && (!playerFaction || decision.route_faction === playerFaction)
      && decision.decision == null).length;
  const officerEvents = (Array.isArray(military.pending_officer_events) ? military.pending_officer_events : [])
    .filter((event) => event
      && (!playerFaction || event.faction === playerFaction)
      && event.acknowledged !== true).length;
  const negotiation = military.negotiation ?? {};
  const counterOffers = (Array.isArray(negotiation.pending_counter_offers) ? negotiation.pending_counter_offers : [])
    .filter((offer) => isPlayerVisibleCounterOffer(offer, playerFaction)).length;
  const opportunities = (Array.isArray(military.operation_opportunities) ? military.operation_opportunities : [])
    .filter((opportunity) => opportunity
      && opportunity.status === 'eligible_pending_review'
      && (!playerFaction || opportunity.approver_faction === playerFaction)
      && !coveredOpportunityIds.has(opportunity.proposal_id)).length;
  return {
    eventDecisions: Number(known?.eventDecisions ?? 0),
    proposals: Number(known?.proposals ?? 0),
    paramilitary: Number(known?.paramilitary ?? 0),
    reserves,
    convoys,
    officerEvents,
    peacePlan: negotiation.pending_peace_plan ? 1 : 0,
    counterOffers,
    dayton: negotiation.pending_dayton && !negotiation.dayton_result ? 1 : 0,
    operationOpportunities: opportunities,
  };
}

function assertNoPlayerBlockers(label, state) {
  const blockers = state?.blockerInventory ?? {};
  if (Object.values(blockers).some((count) => Number(count) > 0)) {
    throw new Error(`Final blockers remain (${label}): ${JSON.stringify(blockers)}`);
  }
  return blockers;
}

const runSlug = safeName(runLabel);
const logPath = path.join(outDir, `paradox-local-qa-${runSlug}.json`);
const progressPath = path.join(outDir, `paradox-local-qa-progress-${runSlug}.json`);
const liveEventsPath = path.join(outDir, `paradox-local-qa-live-events-${runSlug}.json`);
const netLogPath = path.join(outDir, `paradox-local-qa-netlog-${runSlug}.json`);
const readabilityDiagnosticsPath = path.join(outDir, `paradox-local-qa-readability-${runSlug}.json`);
const harnessSnapshotsDir = path.join(outDir, 'harness-snapshots');
const evidenceDir = path.join(outDir, 'evidence', runSlug);

function cleanupRunArtifacts() {
  for (const filePath of [
    logPath,
    progressPath,
    liveEventsPath,
    netLogPath,
    readabilityDiagnosticsPath,
    path.join(outDir, `paradox-local-qa-error-${runSlug}.txt`),
  ]) fs.rmSync(filePath, { force: true });
  const screenshotPrefix = `${runSlug}-`;
  for (const name of fs.readdirSync(screenshotsDir)) {
    if (name.startsWith(screenshotPrefix) && name.endsWith('.png')) {
      fs.rmSync(path.join(screenshotsDir, name), { force: true });
    }
  }
}

function reserveEvidenceDirectory() {
  try {
    fs.mkdirSync(evidenceDir, { recursive: false });
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error(`Evidence archive already exists for run label ${runSlug}: ${evidenceDir}`);
    }
    throw error;
  }
}

fs.mkdirSync(path.dirname(evidenceDir), { recursive: true });
reserveEvidenceDirectory();
cleanupRunArtifacts();

function commandText(command, commandArgs) {
  return execFileSync(command, commandArgs, { cwd: repo, encoding: 'utf8' }).trim();
}

const harnessSha256 = fileSha256(__filename);
fs.mkdirSync(harnessSnapshotsDir, { recursive: true });
const harnessSnapshotPath = path.join(harnessSnapshotsDir, `${runSlug}-${harnessSha256}.cjs`);
fs.copyFileSync(__filename, harnessSnapshotPath);
const gitHead = commandText('git', ['rev-parse', 'HEAD']);
const workingTreeStatus = commandText('git', ['status', '--short', '--untracked-files=normal']);
const workingTreeStatusSha256 = crypto.createHash('sha256').update(workingTreeStatus).digest('hex');
const workingTreeContentFingerprint = computeWorkingTreeContentFingerprint();
const resumeSaveSha256 = resumeSavePath ? fileSha256(resumeSavePath) : null;
const provenance = {
  harnessSha256,
  harnessSnapshotPath,
  gitHead,
  workingTreeStatusSha256,
  workingTreeContentSha256: workingTreeContentFingerprint.sha256,
  workingTreeContentFileCount: workingTreeContentFingerprint.fileCount,
  workingTreeContentExcludedGeneratedPrefixes: workingTreeContentFingerprint.excludedGeneratedPrefixes,
  resumeSaveSha256,
  packagedExecutablePath,
  packagedExecutableSha256: packagedExecutablePath ? fileSha256(packagedExecutablePath) : null,
  requiredMapOrigin,
  electronMainSha256: fileSha256(path.join(repo, 'src', 'desktop', 'electron-main.cjs')),
  warroomIndexSha256: fileSha256(path.join(repo, 'dist', 'warroom', 'index.html')),
  tacticalMapIndexSha256: fileSha256(path.join(repo, 'dist', 'tactical-map', 'index.html')),
};

function compactText(text, limit = 2200) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function assertOrdinaryProposalDossierTruth(reviewId, dossierText) {
  const text = String(dossierText ?? '').replace(/\r\n/g, '\n');
  const requiredFields = [
    ['command', /\bCommand:[ \t]+\S/i],
    ['objective', /\bObjective:[ \t]+\S/i],
    ['targets', /\bTargets:[ \t]+\S/i],
    ['forces', /\bForces:[ \t]+\S/i],
    ['readiness', /\bConcentration\/readiness:[ \t]+\S/i],
    ['intel', /\b(?:Intelligence|Intel):[ \t]+\S/i],
    ['supply', /\bSupply:[ \t]+\S/i],
    ['risk', /\bRisk:[ \t]+\S/i],
    ['recommendation', /\bRecommendation:[ \t]+\S/i],
    ['deadline', /\bDeadline:[ \t]+\S/i],
    ['ratio', /\bForce ratio:[ \t]+\S/i],
    ['opportunityCost', /\bOpportunity cost:[ \t]+\S/i],
  ];
  const missingFields = requiredFields
    .filter(([, pattern]) => !pattern.test(text))
    .map(([field]) => field);
  const rawPatterns = [
    /\b(?:APPROVE_OP|SET_STANCE|OPPORTUNITY):\S+/gi,
    /\b(?:op|zone|corps|formation|sector|plan|cmd):[a-z0-9_:-]+\b/gi,
    /\b(?:arbih|rbih|vrs|rs|hrhb|hvo)_[a-z0-9_]*corps\b/gi,
    /\b(?:plan|op|zone|sector|formation|corps|cmd)[_-][a-z0-9_-]+\b/gi,
    /\b[a-z0-9]+(?:_[a-z0-9]+)+\b/gi,
  ];
  const rawTechnicalIds = [];
  for (const pattern of rawPatterns) {
    for (const match of text.matchAll(pattern)) {
      if (!rawTechnicalIds.includes(match[0])) rawTechnicalIds.push(match[0]);
    }
  }
  if (missingFields.length > 0 || rawTechnicalIds.length > 0) {
    const failures = [];
    if (missingFields.length > 0) failures.push(`missing dossier fields: ${missingFields.join(', ')}`);
    if (rawTechnicalIds.length > 0) failures.push(`raw technical IDs: ${rawTechnicalIds.join(', ')}`);
    throw new Error(`Ordinary proposal dossier truth gate failed for ${reviewId}: ${failures.join('; ')}`);
  }
  return {
    reviewId,
    visibleFields: requiredFields.map(([field]) => field),
    rawTechnicalIds,
  };
}

function regexPayload(pattern) {
  return {
    source: pattern.source,
    flags: pattern.flags.includes('i') ? pattern.flags : `${pattern.flags}i`,
  };
}

function replaceFileSync(tmpPath, filePath) {
  const waitBuffer = new Int32Array(new SharedArrayBuffer(4));
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      fs.renameSync(tmpPath, filePath);
      return;
    } catch (error) {
      if (error?.code !== 'EPERM' && error?.code !== 'EACCES') throw error;
      if (attempt === 19) throw error;
      // Preserve the prior valid JSON until an atomic rename succeeds.
      Atomics.wait(waitBuffer, 0, 0, 25);
    }
  }
}

function writeJsonAtomic(filePath, value) {
  const tmpPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2));
  replaceFileSync(tmpPath, filePath);
}

function writeTextAtomic(filePath, value) {
  const tmpPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, String(value));
  replaceFileSync(tmpPath, filePath);
}

function writeJsonExclusive(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), { flag: 'wx' });
}

function writeProgress(result) {
  writeJsonAtomic(progressPath, result);
}

async function optionalCleanup(label, cleanup) {
  try {
    await cleanup();
    return true;
  } catch (error) {
    if (error?.message === 'required-event-decision') throw error;
    return false;
  }
}

async function bodyText(surface) {
  return surface.locator('body').innerText({ timeout: 15000 });
}

async function visibleButtons(surface) {
  return surface.locator(buttonSelector).evaluateAll((nodes) => nodes.map((node, index) => {
    const el = node;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const visible = rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0.01;
    return {
      index,
      visible,
      disabled: Boolean(el.disabled) || el.getAttribute('aria-disabled') === 'true',
      text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
      aria: el.getAttribute('aria-label') ?? '',
      title: el.getAttribute('title') ?? '',
      testid: el.getAttribute('data-testid') ?? '',
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      },
    };
  }).filter((row) => row.visible));
}

async function waitForAdvanceTransition(frame) {
  await frame.locator('button')
    .filter({ hasText: /ADVANCING/i })
    .first()
    .waitFor({ state: 'hidden', timeout: 45000 })
    .catch(() => false);
  await sleep(300);
}

async function textDiagnostics(surface) {
  return surface.locator('body').evaluate(() => {
    const parseColor = (value) => {
      const match = String(value ?? '').match(/^rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
      if (!match) return null;
      return {
        r: Number(match[1]),
        g: Number(match[2]),
        b: Number(match[3]),
        a: match[4] == null ? 1 : Number(match[4]),
      };
    };
    const luminance = (color) => {
      const channel = (value) => {
        const normalized = value / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
    };
    const contrastRatio = (foreground, background) => {
      const high = Math.max(luminance(foreground), luminance(background));
      const low = Math.min(luminance(foreground), luminance(background));
      return (high + 0.05) / (low + 0.05);
    };
    const compositeForeground = (foreground, background) => {
      const alpha = Math.max(0, Math.min(1, foreground.a ?? 1));
      return {
        r: foreground.r * alpha + background.r * (1 - alpha),
        g: foreground.g * alpha + background.g * (1 - alpha),
        b: foreground.b * alpha + background.b * (1 - alpha),
        a: 1,
      };
    };
    const hasBitmapBackdrop = (node, rect) => {
      const x = Math.max(0, Math.min(window.innerWidth - 1, rect.left + rect.width / 2));
      const y = Math.max(0, Math.min(window.innerHeight - 1, rect.top + rect.height / 2));
      for (const candidate of document.elementsFromPoint(x, y)) {
        const style = window.getComputedStyle(candidate);
        if (['IMG', 'SVG', 'CANVAS', 'VIDEO'].includes(candidate.tagName)) return true;
        if (style.backgroundImage && style.backgroundImage !== 'none') return true;
        const background = parseColor(style.backgroundColor);
        if (background && background.a >= 0.98) return false;
      }
      return false;
    };
    const solidBackground = (node, rect) => {
      if (hasBitmapBackdrop(node, rect)) return null;
      let current = node;
      while (current) {
        const style = window.getComputedStyle(current);
        if (style.backgroundImage && style.backgroundImage !== 'none') return null;
        const parsed = parseColor(style.backgroundColor);
        if (parsed && parsed.a >= 0.98) return parsed;
        current = current.parentElement;
      }
      return null;
    };
    const clippedByAncestor = (node, rect) => {
      let current = node.parentElement;
      let scrollReachableX = false;
      let scrollReachableY = false;
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        const scrollableX = /(auto|scroll)/.test(`${style.overflow} ${style.overflowX}`)
          && current.scrollWidth > current.clientWidth + 2;
        const scrollableY = /(auto|scroll)/.test(`${style.overflow} ${style.overflowY}`)
          && current.scrollHeight > current.clientHeight + 2;
        scrollReachableX ||= scrollableX;
        scrollReachableY ||= scrollableY;
        if (/(hidden|clip)/.test(`${style.overflow} ${style.overflowX} ${style.overflowY}`)) {
          const ancestorRect = current.getBoundingClientRect();
          const clippedX = rect.left < ancestorRect.left - 2 || rect.right > ancestorRect.right + 2;
          const clippedY = rect.top < ancestorRect.top - 2 || rect.bottom > ancestorRect.bottom + 2;
          if ((clippedX && !scrollReachableX) || (clippedY && !scrollReachableY)) return true;
        }
        current = current.parentElement;
      }
      return false;
    };
    const outsideScrollableAncestor = (node, rect) => {
      let current = node.parentElement;
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        const ancestorRect = current.getBoundingClientRect();
        const outsideX = rect.left < ancestorRect.left - 2 || rect.right > ancestorRect.right + 2;
        const outsideY = rect.top < ancestorRect.top - 2 || rect.bottom > ancestorRect.bottom + 2;
        const scrollableX = /(auto|scroll)/.test(`${style.overflow} ${style.overflowX}`)
          && current.scrollWidth > current.clientWidth + 2;
        const scrollableY = /(auto|scroll)/.test(`${style.overflow} ${style.overflowY}`)
          && current.scrollHeight > current.clientHeight + 2;
        if ((outsideX && scrollableX) || (outsideY && scrollableY)) return true;
        current = current.parentElement;
      }
      return false;
    };
    const topHasVisibleFill = (top) => {
      const style = window.getComputedStyle(top);
      const background = parseColor(style.backgroundColor);
      return ['IMG', 'SVG', 'CANVAS', 'VIDEO'].includes(top.tagName)
        || (style.backgroundImage && style.backgroundImage !== 'none')
        || Boolean(background && background.a > 0.05);
    };
    const nearestInteractiveOwner = (node) => node?.closest(
      'button, a, label, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="radio"], [role="switch"]',
    ) ?? null;
    const textIsOccluded = (node, rect) => {
      if (outsideScrollableAncestor(node, rect)) return false;
      const points = [
        [rect.left + rect.width / 2, rect.top + rect.height / 2],
        [rect.left + Math.min(3, rect.width / 2), rect.top + rect.height / 2],
        [rect.right - Math.min(3, rect.width / 2), rect.top + rect.height / 2],
      ].filter(([x, y]) => x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight);
      if (points.length === 0) return false;
      const priorInlinePointerEvents = node.style.pointerEvents;
      const needsPointerHitTestOverride = window.getComputedStyle(node).pointerEvents === 'none';
      if (needsPointerHitTestOverride) node.style.pointerEvents = 'auto';
      try {
        return points.every(([x, y]) => {
          const top = document.elementFromPoint(x, y);
          const nodeOwner = nearestInteractiveOwner(node);
          const topOwner = nearestInteractiveOwner(top);
          if (nodeOwner && topOwner === nodeOwner) return false;
          return top
            && top !== node
            && !node.contains(top)
            && !top.contains(node)
            && topHasVisibleFill(top);
        });
      } finally {
        if (needsPointerHitTestOverride) node.style.pointerEvents = priorInlinePointerEvents;
      }
    };
    const isEffectivelyVisible = (node) => {
      let current = node;
      while (current && current !== document.documentElement) {
        const style = window.getComputedStyle(current);
        if (style.display === 'none'
          || style.visibility === 'hidden'
          || style.visibility === 'collapse'
          || Number(style.opacity || '1') <= 0.01) return false;
        current = current.parentElement;
      }
      return true;
    };
    const activeModalSurface = [...document.querySelectorAll(
      '[aria-modal="true"], [role="dialog"], [data-testid="codex-panel"], [data-testid="chronicle-overlay"], [data-testid="formation-detail-panel"]',
    )]
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return rect.width > 1 && rect.height > 1 && isEffectivelyVisible(node);
      })
      .sort((left, right) => {
        const leftZ = Number.parseInt(window.getComputedStyle(left).zIndex || '0', 10) || 0;
        const rightZ = Number.parseInt(window.getComputedStyle(right).zIndex || '0', 10) || 0;
        if (leftZ !== rightZ) return leftZ - rightZ;
        return left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      })
      .at(-1) ?? null;
    const diagnosticRoot = activeModalSurface ?? document.body;
    const rows = [];
    const walker = document.createTreeWalker(diagnosticRoot, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      const text = (textNode.nodeValue ?? '').replace(/\s+/g, ' ').trim();
      const parent = textNode.parentElement;
      if (text.length >= 3 && parent) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const rangeRect = range.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        const style = window.getComputedStyle(parent);
        const visible = rangeRect.width > 1 && rangeRect.height > 1 && parentRect.width > 1 && parentRect.height > 1
          && !parent.closest('[data-readability-ignore="true"]')
          && !parent.closest('details:not([open])')
          && isEffectivelyVisible(parent)
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity || '1') > 0.01
          && !outsideScrollableAncestor(parent, rangeRect)
          && (!activeModalSurface || activeModalSurface.contains(parent));
        if (visible) {
          const selfClippedX = parent.scrollWidth > parent.clientWidth + 2 && style.overflowX === 'hidden';
          const selfClippedY = parent.scrollHeight > parent.clientHeight + 2 && style.overflowY === 'hidden';
          const ancestorClipped = clippedByAncestor(parent, rangeRect);
          const accessibleText = parent.getAttribute('aria-label')
            || parent.getAttribute('title')
            || parent.closest('[aria-label], [title]')?.getAttribute('aria-label')
            || parent.closest('[aria-label], [title]')?.getAttribute('title')
            || '';
          const accessibleFullText = accessibleText.trim().length >= text.length;
          const foreground = parseColor(style.color);
          const background = solidBackground(parent, rangeRect);
          const ratio = foreground && background
            ? Math.round(contrastRatio(compositeForeground(foreground, background), background) * 100) / 100
            : null;
          rows.push({
            text: text.slice(0, 140),
            fontSize: Math.round(Number.parseFloat(style.fontSize || '0') * 10) / 10,
            color: style.color,
            backgroundColor: style.backgroundColor,
            contrastRatio: ratio,
            clippedX: selfClippedX,
            clippedY: selfClippedY,
            ancestorClipped,
            accessibleFullText,
            occluded: textIsOccluded(parent, rangeRect),
            rect: {
              x: Math.round(rangeRect.x),
              y: Math.round(rangeRect.y),
              w: Math.round(rangeRect.width),
              h: Math.round(rangeRect.height),
            },
            className: String(parent.className ?? '').slice(0, 120),
          });
        }
      }
      textNode = walker.nextNode();
    }
    const repeated = [...rows.reduce((map, row) => {
      const key = row.text.toLowerCase();
      if (key.length >= 14) map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map()).entries()]
      .filter(([, count]) => count >= 3)
      .slice(0, 25)
      .map(([text, count]) => ({ text, count }));
    const visibleAlerts = [...diagnosticRoot.querySelectorAll('[role="alert"], [aria-live="assertive"]')]
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        const visible = rect.width > 1 && rect.height > 1
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity || '1') > 0.01;
        return visible ? (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 500) : '';
      })
      .filter(Boolean);
    const undersizedInteractive = [...diagnosticRoot.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="radio"], [role="switch"]')]
      .map((control) => {
        const rect = control.getBoundingClientRect();
        const controlStyle = window.getComputedStyle(control);
        const visible = rect.width > 1 && rect.height > 1
          && controlStyle.display !== 'none'
          && controlStyle.visibility !== 'hidden'
          && Number(controlStyle.opacity || '1') > 0.01;
        if (!visible) return null;
        const labelNodes = [...control.querySelectorAll('*')]
          .filter((node) => {
            const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
            if (!/[A-Za-z\u00c0-\u024f]/.test(text)) return false;
            const childHasLabel = [...node.children].some((child) => /[A-Za-z\u00c0-\u024f]/.test(child.textContent ?? ''));
            if (childHasLabel) return false;
            const nodeRect = node.getBoundingClientRect();
            const style = window.getComputedStyle(node);
            return nodeRect.width > 1 && nodeRect.height > 1
              && style.display !== 'none'
              && style.visibility !== 'hidden'
              && Number(style.opacity || '1') > 0.01;
          });
        const directText = [...control.childNodes]
          .some((node) => node.nodeType === Node.TEXT_NODE && /[A-Za-z\u00c0-\u024f]/.test(node.nodeValue ?? ''));
        const labelFontSizes = labelNodes.map((node) => Number.parseFloat(window.getComputedStyle(node).fontSize || '0'));
        if (directText) labelFontSizes.push(Number.parseFloat(controlStyle.fontSize || '0'));
        const largestLabelFontSize = labelFontSizes.length > 0 ? Math.max(...labelFontSizes) : 0;
        if (largestLabelFontSize <= 0 || largestLabelFontSize >= 12) return null;
        return {
          text: (control.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 140),
          aria: control.getAttribute('aria-label') ?? '',
          tag: control.tagName.toLowerCase(),
          testid: control.getAttribute('data-testid') ?? '',
          largestLabelFontSize: Math.round(largestLabelFontSize * 10) / 10,
          className: String(control.className ?? '').slice(0, 160),
        };
      })
      .filter(Boolean)
      .slice(0, 60);
    const viewportOverflowXPixels = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
    const overflowingElements = [...diagnosticRoot.querySelectorAll('*')]
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        const visible = rect.width > 1 && rect.height > 1
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity || '1') > 0.01;
        const overflowRight = Math.max(0, rect.right - window.innerWidth);
        const overflowLeft = Math.max(0, -rect.left);
        return {
          visible,
          overflow: Math.round(Math.max(overflowRight, overflowLeft)),
          tag: node.tagName.toLowerCase(),
          id: node.id ?? '',
          testid: node.getAttribute('data-testid') ?? '',
          className: String(node.className ?? '').slice(0, 160),
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          },
        };
      })
      .filter((entry) => entry.visible && entry.overflow > 2)
      .sort((a, b) => b.overflow - a.overflow)
      .slice(0, 20);
    const sameRenderedText = (candidate, row) => candidate !== row
      && candidate.text === row.text
      && Math.abs(candidate.rect.x - row.rect.x) <= 2
      && Math.abs(candidate.rect.y - row.rect.y) <= 2
      && Math.abs(candidate.rect.w - row.rect.w) <= 2
      && Math.abs(candidate.rect.h - row.rect.h) <= 2;
    return {
      diagnosticScope: activeModalSurface ? 'active-modal' : 'document',
      count: rows.length,
      tiny: rows.filter((row) => row.fontSize > 0 && row.fontSize < 10).slice(0, 30),
      undersizedEssentialCandidates: rows.filter((row) => row.fontSize >= 10 && row.fontSize < 12).slice(0, 50),
      undersizedInteractive,
      clipped: rows.filter((row) => row.clippedX || row.clippedY).slice(0, 30),
      ancestorClipped: rows.filter((row) => row.ancestorClipped).slice(0, 30),
      inaccessibleTruncation: rows
        .filter((row) => (row.clippedX || row.clippedY || row.ancestorClipped) && !row.accessibleFullText)
        .slice(0, 30),
      lowContrast: rows.filter((row) => row.contrastRatio != null && row.contrastRatio < 4.5).slice(0, 30),
      occluded: rows
        .filter((row) => row.occluded && !rows.some((candidate) => !candidate.occluded && sameRenderedText(candidate, row)))
        .slice(0, 30),
      repeated,
      visibleAlerts,
      viewportOverflowX: viewportOverflowXPixels > 2,
      viewportOverflowXPixels,
      overflowingElements,
    };
  });
}

function collectReadabilityFailures(events) {
  return events.flatMap((event) => {
    const diagnostics = event.diagnostics ?? {};
    const withKind = (kind, entries) => (entries ?? []).map((entry) => ({ kind, label: event.label, ...entry }));
    const entryKey = (entry) => `${String(entry.text ?? '')}|${JSON.stringify(entry.rect ?? null)}`;
    const inaccessibleKeys = new Set((diagnostics.inaccessibleTruncation ?? []).map(entryKey));
    const clipping = (diagnostics.clipped ?? [])
      .filter((entry) => String(entry.text ?? '').trim() !== 'CO:' && entry.accessibleFullText !== true)
      .map((entry) => ({ kind: 'self-clipping', label: event.label, ...entry }));
    const overflow = Number(diagnostics.viewportOverflowXPixels ?? 0) > 16
      ? [{
        kind: 'viewport-overflow',
        label: event.label,
        viewportOverflowXPixels: diagnostics.viewportOverflowXPixels,
        overflowingElements: diagnostics.overflowingElements ?? [],
      }]
      : [];
    const undersizedInteractive = (diagnostics.undersizedInteractive ?? [])
      .filter((entry) => entry.largestLabelFontSize > 0 && entry.largestLabelFontSize < 12)
      .map((entry) => ({ kind: 'small-interactive-text', label: event.label, ...entry }));
    return [
      ...withKind('tiny-text', diagnostics.tiny),
      ...withKind('small-text', diagnostics.undersizedEssentialCandidates),
      ...clipping,
      ...withKind('ancestor-clipping', (diagnostics.ancestorClipped ?? [])
        .filter((entry) => entry.accessibleFullText !== true && !inaccessibleKeys.has(entryKey(entry)))),
      ...withKind('inaccessible-truncation', diagnostics.inaccessibleTruncation),
      ...withKind('low-contrast', diagnostics.lowContrast),
      ...withKind('occlusion', diagnostics.occluded),
      ...overflow,
      ...undersizedInteractive,
    ];
  });
}

async function clickMatch(surface, pattern, label, options = {}) {
  const payload = {
    include: regexPayload(pattern),
    excludeText: options.excludeText ? regexPayload(options.excludeText) : null,
  };
  const index = await surface.locator(buttonSelector).evaluateAll((nodes, input) => {
    const re = new RegExp(input.include.source, input.include.flags);
    const excludeTextRe = input.excludeText ? new RegExp(input.excludeText.source, input.excludeText.flags) : null;
    for (let i = 0; i < nodes.length; i += 1) {
      const el = nodes[i];
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const visible = rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0.01;
      const disabled = Boolean(el.disabled) || el.getAttribute('aria-disabled') === 'true';
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      const aria = el.getAttribute('aria-label') ?? '';
      const title = el.getAttribute('title') ?? '';
      const testid = el.getAttribute('data-testid') ?? '';
      const candidates = [text, aria, title, testid];
      if (visible && !disabled && candidates.some((candidate) => re.test(candidate)) && (!excludeTextRe || !excludeTextRe.test(text))) return i;
    }
    return -1;
  }, payload).catch(() => -1);
  if (index < 0) return false;
  const loc = surface.locator(buttonSelector).nth(index);
  if (options.scroll !== false) await loc.scrollIntoViewIfNeeded().catch(() => {});
  try {
    await loc.click({ timeout: options.timeout ?? 8000, force: options.force ?? false });
  } catch (error) {
    if (options.throwOnFailure) throw error;
    return false;
  }
  await sleep(options.afterMs ?? 750);
  return true;
}

async function clickTestId(surface, testid, label, options = {}) {
  const loc = surface.locator(`[data-testid="${testid}"]`).first();
  const count = await loc.count().catch(() => 0);
  if (!count) return false;
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  try {
    await loc.click({ timeout: options.timeout ?? 8000, force: options.force ?? false });
  } catch (error) {
    if (options.throwOnFailure) throw error;
    return false;
  }
  await sleep(options.afterMs ?? 750);
  return true;
}

async function selectDecisionRoomCard(surface, titlePattern, options = {}) {
  const card = surface
    .locator('[data-testid^="decision-room-priority-card-"]')
    .filter({ hasText: titlePattern })
    .first();
  if (!(await card.count().catch(() => 0))) return false;
  const dossierButton = card.locator('button').filter({ hasText: /Dossier/i }).first();
  if (!(await dossierButton.count().catch(() => 0))) return false;
  await dossierButton.scrollIntoViewIfNeeded().catch(() => {});
  try {
    await dossierButton.click({ timeout: options.timeout ?? 8000 });
  } catch {
    return false;
  }
  await sleep(options.afterMs ?? 900);
  return true;
}

async function openPendingEventDecisionFromDesk(frame, eventId) {
  if (!eventId) return false;
  const openedDesk = await openWarroomRoute(frame, 'president-desk', 'leadership event desk', { afterMs: 900 });
  if (!openedDesk) return false;
  const card = frame.locator(
    `[data-testid="desk-card-event_decision"][data-inbox-item-id="event:${eventId}"]`,
  ).first();
  if (!(await card.count().catch(() => 0))) return false;
  const action = card.locator('[data-testid="desk-card-action"]').first();
  if (!(await action.count().catch(() => 0))) return false;
  await action.scrollIntoViewIfNeeded().catch(() => {});
  try {
    await action.click({ timeout: 8000 });
  } catch {
    return false;
  }
  await sleep(900);
  return true;
}

async function openDeskInboxItem(frame, type, itemId = null) {
  const openedDesk = await openWarroomRoute(frame, 'president-desk', `${type} desk item`, { afterMs: 900 });
  if (!openedDesk) return false;
  const selector = itemId
    ? `[data-testid="desk-card-${type}"][data-inbox-item-id="${itemId}"]`
    : `[data-testid="desk-card-${type}"]`;
  const card = frame.locator(selector).first();
  if (!(await card.count().catch(() => 0)) || !await card.isVisible().catch(() => false)) return false;
  const action = card.locator('[data-testid="desk-card-action"]').first();
  if (!(await action.count().catch(() => 0))) return false;
  await action.scrollIntoViewIfNeeded();
  await action.click({ timeout: 8000 });
  await sleep(900);
  return true;
}

async function clickVisibleButtonText(surface, exactText, label, options = {}) {
  const clicked = await surface.locator(buttonSelector).evaluateAll((nodes, input) => {
    const target = String(input.text).toLowerCase();
    for (const node of nodes) {
      const el = node;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const visible = rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0.01;
      const disabled = Boolean(el.disabled) || el.getAttribute('aria-disabled') === 'true';
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!visible || disabled || text !== target) continue;
      el.click();
      return true;
    }
    return false;
  }, { text: exactText }).catch(() => false);
  if (clicked) await sleep(options.afterMs ?? 750);
  return clicked;
}

async function clickExactVisibleButton(surface, exactText, label, options = {}) {
  const candidates = surface.getByRole('button', { name: exactText, exact: true });
  const count = await candidates.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index);
    if (!await candidate.isVisible() || !await candidate.isEnabled()) continue;
    await candidate.scrollIntoViewIfNeeded();
    await candidate.click({ timeout: options.timeout ?? 8000 });
    await sleep(options.afterMs ?? 750);
    return true;
  }
  return false;
}

function officerResponseLabel(officerMatter) {
  if (officerMatter?.eventType === 'officer_available') return 'File availability notice';
  if (officerMatter?.eventType === 'replacement_suggested') return 'Keep current commander';
  return 'Acknowledge';
}

async function readState(frame) {
  const raw = await frame.evaluate(async () => {
    if (!window.awwv?.getCurrentGameState) return null;
    const state = await window.awwv.getCurrentGameState();
    return typeof state === 'string' ? JSON.parse(state) : state;
  });
  if (!raw) return null;
  const proposals = Array.isArray(raw.meta?.pending_proposal_reviews) ? raw.meta.pending_proposal_reviews : [];
  const playerFaction = raw.meta?.player_faction ?? null;
  const decisionReceiptAutosavePath = resolveDecisionReceiptAutosavePath(
    canonicalAutosavePath,
    resumeSavePath,
    canonicalAutosavePersistenceAtResumeLoad,
    filePersistenceFingerprint(canonicalAutosavePath),
  );
  const {
    peacePlanDecisionReceipts,
    reserveDecisionReceipts,
    convoyDecisionReceipts,
    officerDecisionReceipts,
    paramilitaryDecisionReceipts,
  } = readCanonicalDecisionReceiptsFromAutosave(decisionReceiptAutosavePath, playerFaction);
  const playerPendingParamilitaryRequests = (Array.isArray(raw.pending_paramilitary_requests)
    ? raw.pending_paramilitary_requests
    : Array.isArray(raw.pendingParamilitaryRequests)
      ? raw.pendingParamilitaryRequests
      : Array.isArray(raw.paramilitary?.pending_requests)
        ? raw.paramilitary.pending_requests
        : [])
    .filter((request) => request
      && (!playerFaction || request.faction === playerFaction)
      && request.decision !== 'allow'
      && request.decision !== 'deny'
      && request.decision !== 'regular');
  const playerPendingOfficerEvents = (Array.isArray(raw.military?.pending_officer_events)
    ? raw.military.pending_officer_events
    : [])
    .filter((event) => event
      && (!playerFaction || event.faction === playerFaction)
      && event.acknowledged !== true);
  const pendingOfficerMatterItems = (() => {
    const grouped = new Map();
    for (const event of playerPendingOfficerEvents) {
      const key = officerEventDedupeKey(event);
      if (grouped.has(key)) continue;
      grouped.set(key, {
        inboxItemId: `officer:${key}`,
        eventId: event.event_id ?? null,
        eventType: event.type ?? null,
        officerId: event.officer_id ?? null,
        overrideAction: event.override_action ?? null,
      });
    }
    return [...grouped.values()]
      .filter((item) => typeof item.eventId === 'string' && item.eventId.length > 0)
      .sort((left, right) => strictAsciiCompare(left.inboxItemId, right.inboxItemId));
  })();
  const playerPendingCounterOffers = (Array.isArray(raw.military?.negotiation?.pending_counter_offers)
    ? raw.military.negotiation.pending_counter_offers
    : [])
    .filter((offer) => isPlayerVisibleCounterOffer(offer, playerFaction))
    .sort((left, right) => strictAsciiCompare(String(left?.id ?? ''), String(right?.id ?? '')));
  const playerProposals = proposals.filter((proposal) => proposal && (!playerFaction || proposal.faction === playerFaction));
  const unresolvedPlayerProposals = sortUnresolvedPlayerProposals(playerProposals);
  const proposalRecords = playerProposals
    .map((proposal) => ({
      id: proposal.id ?? proposal.proposal_id ?? proposal.proposed_action ?? null,
      action: proposal.proposed_action ?? null,
      accepted: proposal.accepted ?? null,
      opportunityDecision: proposal.opportunity_decision ?? null,
      resolvedTurn: proposal.resolved_turn ?? null,
      unresolved: isUnresolvedPlayerProposal(proposal),
    }))
    .sort((left, right) => strictAsciiCompare(`${left.id ?? ''}\u0000${left.action ?? ''}`, `${right.id ?? ''}\u0000${right.action ?? ''}`));
  const formations = Object.values(raw.formations ?? raw.military?.formations ?? {});
  const owned = formations.filter((formation) => formation && formation.faction === playerFaction);
  const locatedOwned = owned.filter((formation) => typeof formation.location_osid === 'string' && formation.location_osid.length > 0);
  const activeLocatedFormations = formations.filter((formation) =>
    formation
    && formation.faction
    && formation.status !== 'destroyed'
    && formation.status !== 'dissolved'
    && typeof formation.location_osid === 'string'
    && formation.location_osid.length > 0
  );
  const countBy = (items, keyFn) => {
    const counts = {};
    for (const item of items) {
      const key = keyFn(item);
      if (!key) continue;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => strictAsciiCompare(a, b)));
  };
  const controlSource = raw.political?.political_controllers
    ?? raw.political_controllers
    ?? raw.political?.political_control
    ?? raw.political_control
    ?? raw.control?.political_controllers
    ?? null;
  const controlCounts = (() => {
    if (!controlSource || typeof controlSource !== 'object') return {};
    const counts = {};
    for (const value of Object.values(controlSource)) {
      const controller = typeof value === 'string'
        ? value
        : (value?.controller ?? value?.political_controller ?? value?.faction ?? null);
      if (!controller) continue;
      counts[controller] = (counts[controller] ?? 0) + 1;
    }
    return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => strictAsciiCompare(a, b)));
  })();
  const controlMapHash = (() => {
    if (!controlSource || typeof controlSource !== 'object') return null;
    const entries = Object.entries(controlSource)
      .map(([osid, value]) => [
        osid,
        typeof value === 'string'
          ? value
          : (value?.controller ?? value?.political_controller ?? value?.faction ?? null),
      ])
      .sort(([left], [right]) => strictAsciiCompare(left, right));
    return crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex');
  })();
  const pendingEventDecisions = (() => {
    const sources = [
      raw.pendingEventDecisions,
      raw.pending_event_decisions,
      raw.meta?.pending_event_decisions,
      raw.military?.pending_event_decisions,
    ];
    const source = sources.find((candidate) => candidate && (Array.isArray(candidate) || typeof candidate === 'object'));
    if (!source) return [];
    const entries = Array.isArray(source)
      ? source.map((decision) => ({ id: decision?.event_id ?? decision?.id ?? null, decision }))
      : Object.entries(source).map(([id, decision]) => ({ id: decision?.event_id ?? id, decision }));
    return entries.sort(comparePendingEventDecisionPriority);
  })();
  const eventDecisionReceipts = (Array.isArray(raw.military?.event_decision_log)
    ? raw.military.event_decision_log
    : [])
    .filter((receipt) => receipt && (!playerFaction || !receipt.faction || receipt.faction === playerFaction))
    .map((receipt) => ({
      eventId: receipt.event_id ?? null,
      responseId: receipt.response_id ?? null,
      decisionSource: receipt.decision_source ?? null,
      faction: receipt.faction ?? null,
      turn: receipt.turn ?? null,
    }))
    .filter((receipt) => typeof receipt.eventId === 'string' && receipt.eventId.length > 0)
    .sort((left, right) => strictAsciiCompare(
      JSON.stringify([left.eventId, left.turn, left.responseId, left.decisionSource]),
      JSON.stringify([right.eventId, right.turn, right.responseId, right.decisionSource]),
    ));
  const eventDecisionReceiptIds = eventDecisionReceipts.map((receipt) => receipt.eventId);
  const canonicalReserveRequests = raw.military?.pending_reserve_requests;
  const playerPendingEventDecisions = pendingEventDecisions
    .filter(({ decision }) => !playerFaction || !decision?.faction || decision.faction === playerFaction);
  const paramilitaryRequests = playerPendingParamilitaryRequests.length;
  const blockerInventory = buildPlayerBlockerInventory(raw, playerFaction, {
    eventDecisions: playerPendingEventDecisions.length,
    proposals: unresolvedPlayerProposals.length,
    paramilitary: paramilitaryRequests,
  });
  if (Array.isArray(canonicalReserveRequests)) {
    blockerInventory.reserves = canonicalReserveRequests
      .filter((request) => request && (!playerFaction || request.faction === playerFaction)).length;
  }
  return {
    schemaVersion: raw.schema_version ?? null,
    scenarioId: raw.meta?.scenario_id ?? raw.scenario_id ?? null,
    scenarioSeed: raw.meta?.seed ?? raw.seed ?? null,
    turn: raw.meta?.turn ?? raw.turn ?? null,
    date: raw.meta?.date ?? raw.date ?? null,
    phase: raw.meta?.phase ?? raw.phase ?? null,
    playerFaction,
    autonomyLevel: raw.meta?.autonomy_level ?? 0,
    autonomyLevelPending: raw.meta?.autonomy_level_pending ?? null,
    pendingEventDecisionIds: playerPendingEventDecisions
      .map(({ id }) => id)
      .filter(Boolean),
    eventDecisionReceiptIds,
    eventDecisionReceipts,
    eventFireCounts: Object.fromEntries(Object.entries(raw.military?.event_fire_counts ?? {})
      .sort(([left], [right]) => strictAsciiCompare(left, right))),
    eventLastFiredTurns: Object.fromEntries(Object.entries(raw.military?.event_last_fired_turn ?? {})
      .sort(([left], [right]) => strictAsciiCompare(left, right))),
    peacePlanDecisionReceipts,
    reserveDecisionReceipts,
    convoyDecisionReceipts,
    officerDecisionReceipts,
    paramilitaryDecisionReceipts,
    pendingProposalCount: unresolvedPlayerProposals.length,
    unresolvedProposalCount: unresolvedPlayerProposals.length,
    resolvedProposalCount: playerProposals.length - unresolvedPlayerProposals.length,
    pendingProposalIds: unresolvedPlayerProposals.map((proposal) => proposal.id ?? proposal.proposal_id ?? proposal.proposed_action).slice(0, 12),
    pendingProposals: unresolvedPlayerProposals
      .slice(0, 20)
      .map((proposal) => ({
        id: proposal.id ?? proposal.proposal_id ?? null,
        action: proposal.proposed_action ?? null,
        accepted: proposal.accepted ?? null,
        resolvedTurn: proposal.resolved_turn ?? null,
      })),
    proposalRecords,
    paramilitaryRequests,
    pendingParamilitaryRequestIds: playerPendingParamilitaryRequests
      .map((request) => request.target_osid ?? null)
      .filter(Boolean)
      .sort(strictAsciiCompare),
    reserveRequests: blockerInventory.reserves,
    pendingReserveRequestIds: (Array.isArray(raw.military?.pending_reserve_requests) ? raw.military.pending_reserve_requests : [])
      .filter((request) => request && (!playerFaction || request.faction === playerFaction))
      .map((request) => request.request_id ?? null)
      .filter(Boolean)
      .sort(strictAsciiCompare),
    convoyDecisions: blockerInventory.convoys,
    pendingConvoyDecisionIds: (Array.isArray(raw.military?.pending_convoy_decisions) ? raw.military.pending_convoy_decisions : [])
      .filter((decision) => decision && (!playerFaction || decision.route_faction === playerFaction) && decision.decision == null)
      .map((decision) => decision.id)
      .filter(Boolean)
      .sort(strictAsciiCompare),
    pendingOfficerEvents: blockerInventory.officerEvents,
    pendingOfficerEventIds: playerPendingOfficerEvents
      .map((event) => event.event_id)
      .filter(Boolean)
      .sort(strictAsciiCompare),
    pendingOfficerMatterItems,
    pendingCounterOffers: blockerInventory.counterOffers,
    pendingCounterOfferIds: playerPendingCounterOffers
      .map((offer) => offer.id ?? null)
      .filter(Boolean)
      .sort(strictAsciiCompare),
    pendingDayton: blockerInventory.dayton,
    pendingOperationOpportunities: blockerInventory.operationOpportunities,
    pendingOperationOpportunityIds: (Array.isArray(raw.military?.operation_opportunities) ? raw.military.operation_opportunities : [])
      .filter((opportunity) => opportunity
        && opportunity.status === 'eligible_pending_review'
        && (!playerFaction || opportunity.approver_faction === playerFaction))
      .map((opportunity) => opportunity.proposal_id)
      .filter(Boolean)
      .sort(strictAsciiCompare),
    blockerInventory,
    commandAuthority: raw.military?.command_authority ?? null,
    ownedFormationCount: owned.length,
    locatedOwnedFormationCount: locatedOwned.length,
    activeLocatedFormationCount: activeLocatedFormations.length,
    activeLocatedFormationsByFaction: countBy(activeLocatedFormations, (formation) => formation.faction),
    formationsByFaction: countBy(formations, (formation) => formation?.faction),
    controlCounts,
    controlMapHash,
    controlSourceCount: controlSource && typeof controlSource === 'object' ? Object.keys(controlSource).length : 0,
    paramilitaryPolicy: raw.paramilitary_policy ?? raw.paramilitary?.policy ?? null,
    paramilitaryDeploymentCount: raw.paramilitary_deployment_count ?? raw.paramilitary?.deployment_count ?? null,
    casualtyLedger: raw.military?.casualty_ledger ?? null,
    pendingPeacePlanId: raw.military?.negotiation?.pending_peace_plan?.plan_id ?? null,
  };
}

async function readRawStateHash(frame) {
  const serialized = await frame.evaluate(async () => {
    if (!window.awwv?.getCurrentGameState) return null;
    const state = await window.awwv.getCurrentGameState();
    return typeof state === 'string' ? state : JSON.stringify(state);
  });
  if (typeof serialized !== 'string') return null;
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

function fileSha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : null;
}

function filePersistenceFingerprint(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  return `${fileSha256(filePath)}:${stat.size}:${stat.mtimeMs}`;
}

function buildInitialScenarioProvenance(initialAutosaveEvidence, isResume) {
  const archivedAutosave = JSON.parse(fs.readFileSync(initialAutosaveEvidence.path, 'utf8'));
  const scenarioSourcePath = isResume
    ? null
    : path.join(repo, 'data', 'scenarios', 'apr1992_definitive_52w.json');
  const startupSnapshotPath = isResume
    ? null
    : path.join(repo, 'data', 'derived', 'startup', 'apr_1992_initial_save.json');
  const scenarioSource = scenarioSourcePath
    ? JSON.parse(fs.readFileSync(scenarioSourcePath, 'utf8'))
    : null;
  return {
    sourceKind: isResume ? 'resume_save' : 'new_campaign',
    scenarioKey: isResume ? null : 'apr_1992',
    scenarioId: archivedAutosave.meta?.scenario_id ?? scenarioSource?.scenario_id ?? null,
    scenarioSeed: archivedAutosave.meta?.seed ?? null,
    scenarioSourcePath: scenarioSourcePath ? path.relative(repo, scenarioSourcePath).replaceAll('\\', '/') : null,
    scenarioSourceSha256: scenarioSourcePath ? fileSha256(scenarioSourcePath) : null,
    startupSnapshotPath: startupSnapshotPath ? path.relative(repo, startupSnapshotPath).replaceAll('\\', '/') : null,
    startupSnapshotSha256: startupSnapshotPath ? fileSha256(startupSnapshotPath) : null,
    initialAutosaveSha256: initialAutosaveEvidence.sha256,
  };
}

function archiveAutosaveEvidence(sourcePath, destinationPath) {
  const sourceHash = fileSha256(sourcePath);
  if (!sourceHash) throw new Error(`Autosave evidence source is missing: ${sourcePath}`);
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath, fs.constants.COPYFILE_EXCL);
  const archivedHash = fileSha256(destinationPath);
  if (archivedHash !== sourceHash) {
    throw new Error(`Autosave evidence hash mismatch: ${sourceHash} != ${archivedHash}`);
  }
  return {
    path: destinationPath,
    sha256: archivedHash,
    bytes: fs.statSync(destinationPath).size,
  };
}

function verifyArchivedEvidence(record, label) {
  if (!record?.path || typeof record.sha256 !== 'string' || !Number.isInteger(record.bytes)) {
    throw new Error(`${label} archive record is incomplete`);
  }
  const observedHash = fileSha256(record.path);
  const observedBytes = fs.existsSync(record.path) ? fs.statSync(record.path).size : null;
  if (observedHash !== record.sha256 || observedBytes !== record.bytes) {
    throw new Error(`${label} archive changed after capture: ${JSON.stringify({
      expectedHash: record.sha256,
      observedHash,
      expectedBytes: record.bytes,
      observedBytes,
    })}`);
  }
  return { ...record, verifiedSha256: observedHash, verifiedBytes: observedBytes };
}

function finalizeEvidenceManifest(faction, initialEvidence, playtest) {
  const initial = verifyArchivedEvidence(initialEvidence?.initialAutosaveEvidence, `${faction} initial autosave`);
  const final = verifyArchivedEvidence(playtest?.finalAutosaveEvidence, `${faction} final autosave`);
  const manifest = {
    schemaVersion: 1,
    runSlug,
    faction,
    harnessSha256,
    gitHead,
    workingTreeContentSha256: provenance.workingTreeContentSha256,
    workingTreeContentFileCount: provenance.workingTreeContentFileCount,
    initialScenarioProvenance: initialEvidence?.initialScenarioProvenance ?? null,
    initialStateHash: initialEvidence?.initialStateHash ?? null,
    initialAutosaveHash: initialEvidence?.initialAutosaveHash ?? null,
    finalStateHash: playtest?.postEvidenceHashProof?.stateHash ?? null,
    finalAutosaveHash: playtest?.postEvidenceHashProof?.autosaveHash ?? null,
    initial,
    final,
  };
  const manifestPath = path.join(evidenceDir, safeName(faction), 'manifest.json');
  writeJsonExclusive(manifestPath, manifest);
  return {
    path: manifestPath,
    sha256: fileSha256(manifestPath),
    manifest,
  };
}

function assertStableProjectionAndAutosaveHashes(label, baselineStateHash, baselineAutosaveHash, stateHash, autosaveHash) {
  if ([baselineStateHash, baselineAutosaveHash, stateHash, autosaveHash]
    .some((hash) => typeof hash !== 'string' || hash.length === 0)) {
    throw new Error(`${label} requires non-null projection/autosave hashes`);
  }
  if (baselineStateHash !== stateHash) {
    throw new Error(`${label} player-visible projection changed after evidence capture: ${baselineStateHash} -> ${stateHash}`);
  }
  if (baselineAutosaveHash !== autosaveHash) {
    throw new Error(`${label} canonical autosave changed after evidence capture: ${baselineAutosaveHash} -> ${autosaveHash}`);
  }
  return {
    stateHash,
    autosaveHash,
    projectionMatchesCanonicalAutosave: stateHash === autosaveHash,
  };
}

function assertStrategicAutonomyState(label, state, expectedLevel, expectedPending) {
  const autonomyLevel = state?.autonomyLevel;
  const autonomyLevelPending = state?.autonomyLevelPending ?? null;
  if (autonomyLevel !== expectedLevel) {
    throw new Error(`${label} strategic autonomy expected level ${expectedLevel}, observed ${autonomyLevel ?? 'unavailable'}`);
  }
  if (autonomyLevelPending !== expectedPending) {
    throw new Error(`${label} strategic autonomy expected pending ${expectedPending ?? 'none'}, observed ${autonomyLevelPending ?? 'none'}`);
  }
  return { autonomyLevel, autonomyLevelPending };
}

async function configureStrategicRun(frame) {
  await clearOpenSurfaces(frame);
  const openedArmyHq = await openArmyHqFromCurrentSurface(frame, 'strategic army hq', { afterMs: 900 });
  if (!openedArmyHq) return { ok: false, error: 'army-hq-route-unavailable' };
  const openedPersonnel = await clickAndMeasure(frame, /^Personnel$|army-hq-tab-personnel/i, 'strategic personnel', { afterMs: 700 });
  const openedAutonomy = await clickTestId(frame, 'personnel-open-autonomy', 'strategic autonomy route', { afterMs: 700 });
  const selectedAssisted = openedAutonomy
    ? await clickTestId(frame, 'autonomy-level-1', 'strategic autonomy assisted', { afterMs: 900 })
    : false;
  const configuredState = selectedAssisted ? await readState(frame).catch(() => null) : null;
  const autonomyProof = selectedAssisted && !resumeSavePath
    ? assertStrategicAutonomyState('Strategic setup not staged', configuredState, 0, 1)
    : null;
  await closeOpenSurface(frame);
  return {
    ok: Boolean(openedPersonnel?.clicked && openedAutonomy && selectedAssisted),
    openedArmyHq,
    openedPersonnel,
    openedAutonomy,
    selectedAssisted,
    configuredState,
    autonomyProof,
  };
}

async function exerciseCommandAuthorityLevers(page, frame, faction, events) {
  const initial = await readState(frame).catch(() => null);
  const priorSpend = initial?.commandAuthority?.lifetime_spent ?? 0;
  const levers = priorSpend > 0
    ? [
        { id: 'address-nation', title: /Address the nation/i },
        { id: 'decorate-unit', title: /Decorate a unit/i },
      ]
    : [
        { id: 'front-visit', title: /Visit the front/i },
        { id: 'address-nation', title: /Address the nation/i },
      ];
  const results = [];

  for (const lever of levers) {
    await closeOpenSurface(frame);
    const openedCommandSurface = await openCommandSurfaceFromWarroom(frame, `${lever.id} command surface`);
    const openedCommandCategory = openedCommandSurface
      ? await clickTestId(frame, 'command-card-cat_command', `${lever.id} command category`, { afterMs: 900 })
      : false;
    const openedCard = openedCommandCategory
      ? await selectDecisionRoomCard(frame, lever.title, { afterMs: 1200 })
      : false;
    const before = await readState(frame).catch(() => null);
    await snapshot(page, frame, faction, events, `strategic-ca-${lever.id}-before`, { openedCommandSurface, openedCommandCategory, openedCard, before });
    const issued = openedCard
      ? await clickMatch(frame, /^Issue(?:\s*\(\d+\))?$/i, `${lever.id} issue`, { afterMs: 1400 })
      : false;
    const afterIssue = await readState(frame).catch(() => null);
    const beforeSpent = before?.commandAuthority?.lifetime_spent ?? 0;
    const afterSpent = afterIssue?.commandAuthority?.lifetime_spent ?? beforeSpent;
    const spent = afterSpent - beforeSpent;
    const beforePending = new Set(before?.pendingEventDecisionIds ?? []);
    const stagedEventId = (afterIssue?.pendingEventDecisionIds ?? [])
      .find((eventId) => !beforePending.has(eventId)) ?? null;
    await snapshot(page, frame, faction, events, `strategic-ca-${lever.id}-after`, { issued, spent, afterIssue });

    const responseControl = frame.locator('[data-testid="event-decision-response"]').first();
    let mountedResponse = issued && stagedEventId
      ? await responseControl.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)
      : false;
    if (issued && stagedEventId && !mountedResponse) {
      try {
        await closeOpenSurface(frame);
      } catch (error) {
        if (error?.message !== 'required-event-decision') throw error;
        mountedResponse = await responseControl.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
      }
      if (!mountedResponse) {
        await sleep(900);
        const openedPendingEvent = await openPendingEventDecisionFromDesk(frame, stagedEventId);
        if (!openedPendingEvent) throw new Error(`Required leadership event route failed: ${stagedEventId}`);
      }
    }
    const responsePresented = await responseControl.isVisible().catch(() => false);
    const responded = responsePresented
      ? await clickTestId(frame, 'event-decision-response', `${lever.id} event response`, { afterMs: 1200 })
      : false;
    if (responsePresented) {
      await snapshot(page, frame, faction, events, `strategic-ca-${lever.id}-response`, { responded });
    }
    results.push({ lever: lever.id, openedCommandSurface, openedCommandCategory, openedCard, issued, spent, stagedEventId, responsePresented, responded });
    await closeOpenSurface(frame);
  }

  return {
    ok: results.length === levers.length
      && results.every((result) => result.issued && result.spent > 0 && result.responsePresented && result.responded),
    priorSpend,
    results,
  };
}

async function attemptStrategicRecruitment(frame, faction) {
  const before = await readState(frame).catch(() => null);
  const openedArmyHq = await openArmyHqFromCurrentSurface(frame, 'recruitment army hq', { afterMs: 700 });
  const openedPersonnel = openedArmyHq
    ? await clickAndMeasure(frame, /^Personnel$|army-hq-tab-personnel/i, 'recruitment personnel', { afterMs: 600 })
    : { clicked: false };
  const openedRecruitment = openedPersonnel.clicked
    ? await clickTestId(frame, 'personnel-open-recruitment', 'recruitment modal route', { afterMs: 800 })
    : false;
  const catalog = openedRecruitment
    ? await frame.evaluate(async () => window.awwv?.getRecruitmentCatalog?.()).catch((error) => ({ error: error.message }))
    : null;
  const modalText = openedRecruitment ? compactText(await bodyText(frame), 1800) : '';
  const recruitAction = openedRecruitment
    ? {
        clicked: await clickTestId(frame, 'recruitment-apply', 'recruit selected eligible formation', {
          afterMs: 1400,
          timeout: 20000,
        }),
      }
    : { clicked: false };
  const after = await readState(frame).catch(() => null);
  await closeOpenSurface(frame);
  const beforeOwned = before?.ownedFormationCount ?? before?.locatedPlayerFormations ?? 0;
  const afterOwned = after?.ownedFormationCount ?? after?.locatedPlayerFormations ?? 0;
  const playerCatalog = Array.isArray(catalog?.brigades)
    ? catalog.brigades.filter((brigade) => brigade?.faction === faction)
    : [];
  return {
    handled: Boolean(recruitAction.clicked && afterOwned > beforeOwned),
    faction,
    openedArmyHq,
    openedPersonnel,
    openedRecruitment,
    recruitAction,
    beforeOwned,
    afterOwned,
    modalText,
    catalogSummary: {
      total: playerCatalog.length,
      eligible: playerCatalog.filter((brigade) => brigade.eligible !== false).length,
      reasons: playerCatalog.reduce((counts, brigade) => {
        for (const reason of Array.isArray(brigade.reason_codes) ? brigade.reason_codes : []) {
          counts[reason] = (counts[reason] ?? 0) + 1;
        }
        return counts;
      }, {}),
    },
  };
}

async function counterInfo(frame) {
  return frame.evaluate(() => {
    const overlay = document.querySelector('[data-awwv-dom-formation-counters="true"]');
    const counters = [...document.querySelectorAll('[data-awwv-formation-counter-id]')].map((node) => {
      const el = node;
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return {
        id: el.getAttribute('data-awwv-formation-counter-id') ?? '',
        title: el.getAttribute('title') ?? el.getAttribute('aria-label') ?? '',
        visible: rect.width > 1 && rect.height > 1 && (hit === el || el.contains(hit)),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      };
    }).filter((counter) => counter.visible);
    return {
      dataset: overlay ? { ...overlay.dataset } : null,
      rendered: counters.length,
      rsLikeRendered: counters.filter((counter) => /^(rs|vrs)_/i.test(counter.id)).length,
      rbihLikeRendered: counters.filter((counter) => /^(rbih|arbih)_/i.test(counter.id)).length,
      hrhbLikeRendered: counters.filter((counter) => /^(hrhb|hvo)_/i.test(counter.id)).length,
      enemyRendered: counters.filter((counter) => counter.id.startsWith('enemy_contact:')).length,
      krajinaRendered: counters.filter((counter) => /krajina|dubica|krupa|banja_luka|gradika|gradiska|prijedor|sanski|klju|mrkonji|kotor_varo/i.test(`${counter.id} ${counter.title}`)).length,
      ids: counters.map((counter) => counter.id),
      sample: counters.slice(0, 40),
      formationSample: counters.filter((counter) => !counter.id.startsWith('enemy_contact:')).slice(0, 40),
    };
  });
}

async function interactionDiagnostics(surface) {
  const buttons = await visibleButtons(surface);
  if (!Array.isArray(buttons)) return { error: 'button list unavailable' };
  return {
    unnamedButtons: buttons
      .filter((button) => !button.text && !button.aria && !button.title && !button.testid)
      .slice(0, 30),
    disabledWithoutReason: buttons
      .filter((button) => button.disabled && !button.title && !button.aria)
      .slice(0, 30),
    tinyTargets: buttons
      .filter((button) => button.rect.w < 24 || button.rect.h < 24)
      .slice(0, 30),
  };
}

function canonicalFormationAuditFromAutosave(autosavePath) {
  if (!fs.existsSync(autosavePath)) return { error: `Canonical autosave missing: ${autosavePath}` };
  const state = JSON.parse(fs.readFileSync(autosavePath, 'utf8'));
  const formations = Array.isArray(state?.formations)
    ? state.formations
    : Object.values(state?.formations ?? state?.military?.formations ?? {});
  const normalize = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const fieldedKinds = new Set([
    'brigade',
    'brigade_asset',
    'militia',
    'task_group',
    'unit',
    'regiment',
    'battalion',
  ]);
  const isPhysicalCombatFormation = (formation) => {
    const kind = normalize(formation?.kind);
    return fieldedKinds.has(kind)
      || kind.includes('brigade')
      || kind.includes('militia')
      || kind.includes('regiment')
      || kind.includes('battalion');
  };
  const isActive = (formation) => formation
    && !['destroyed', 'disbanded', 'inactive'].includes(normalize(formation.status));
  const summarize = (formation) => ({
    id: formation.id ?? null,
    faction: formation.faction ?? null,
    name: formation.name ?? formation.display_name ?? null,
    kind: formation.kind ?? null,
    status: formation.status ?? null,
    location_osid: formation.location_osid ?? null,
    corps_id: formation.corps_id ?? formation.parent_id ?? null,
  });
  const activeCombat = formations.filter((formation) => isActive(formation) && isPhysicalCombatFormation(formation));
  const byFaction = {};
  for (const formation of activeCombat) {
    const faction = String(formation.faction ?? 'unknown');
    byFaction[faction] = (byFaction[faction] ?? 0) + 1;
  }
  return {
    source: autosavePath,
    sha256: fileSha256(autosavePath),
    formationCount: formations.length,
    activeCombatFormationCount: activeCombat.length,
    activeCombatFormationsByFaction: byFaction,
    unlocatedActiveCombatFormationsAllFactions: activeCombat
      .filter((formation) => !formation.location_osid)
      .map(summarize),
  };
}

async function formationAudit(frame) {
  const playerVisibleAudit = await frame.evaluate(async () => {
    if (!window.awwv?.getCurrentGameState) return { error: 'getCurrentGameState unavailable' };
    const rawState = await window.awwv.getCurrentGameState();
    const state = typeof rawState === 'string' ? JSON.parse(rawState) : rawState;
    const formations = Array.isArray(state?.formations)
      ? state.formations
      : Object.values(state?.formations ?? state?.military?.formations ?? {});
    const playerFaction = state?.player_faction ?? state?.meta?.player_faction ?? state?.metadata?.player_faction ?? null;
    const normalize = (value) => String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const fieldedKinds = new Set([
      'brigade',
      'brigade_asset',
      'militia',
      'task_group',
      'unit',
      'regiment',
      'battalion',
    ]);
    const owned = formations.filter((formation) => formation && formation.faction === playerFaction);
    const locatedOwned = owned.filter((formation) => typeof formation.location_osid === 'string' && formation.location_osid.length > 0);
    const activeOwned = owned.filter((formation) => !['destroyed', 'disbanded', 'inactive'].includes(normalize(formation.status)));
    const activeFormations = formations.filter((formation) => formation
      && !['destroyed', 'disbanded', 'inactive'].includes(normalize(formation.status)));
    const isPhysicalCombatFormation = (formation) => {
      const kind = normalize(formation.kind);
      return fieldedKinds.has(kind)
        || kind.includes('brigade')
        || kind.includes('militia')
        || kind.includes('regiment')
        || kind.includes('battalion');
    };
    const fieldedOwned = locatedOwned.filter((formation) => {
      const kind = normalize(formation.kind);
      if (!kind) return true;
      return isPhysicalCombatFormation(formation);
    });
    const unlocatedActiveCombatFormations = activeOwned
      .filter((formation) => isPhysicalCombatFormation(formation) && !formation.location_osid);
    const unlocatedActiveCombatFormationsAllFactions = activeFormations
      .filter((formation) => isPhysicalCombatFormation(formation) && !formation.location_osid);
    const unlocatedActiveCommandRecords = activeOwned
      .filter((formation) => !isPhysicalCombatFormation(formation) && !formation.location_osid);
    const byKind = {};
    for (const formation of owned) {
      const kind = String(formation.kind ?? 'unknown');
      byKind[kind] = (byKind[kind] ?? 0) + 1;
    }
    const counters = [...document.querySelectorAll('[data-awwv-formation-counter-id]')]
      .map((node) => {
        const el = node;
        const rect = el.getBoundingClientRect();
        return {
          id: el.getAttribute('data-awwv-formation-counter-id') ?? '',
          title: el.getAttribute('title') ?? el.getAttribute('aria-label') ?? '',
          visible: rect.width > 1 && rect.height > 1,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        };
      })
      .filter((counter) => counter.visible);
    const counterIds = new Set(counters.map((counter) => counter.id));
    const overlay = document.querySelector('[data-awwv-dom-formation-counters="true"]');
    const isKrajinaLike = (formation) => {
      const haystack = normalize([
        formation.id,
        formation.name,
        formation.display_name,
        formation.location_osid,
        formation.location_name,
        formation.corps_id,
        formation.parent_id,
      ].join(' '));
      return /krajina|banja|prijedor|dubica|gradiska|gradiska|krupa|sans|kljuc|mrkonjic|kotor|novi/.test(haystack);
    };
    const summarize = (formation) => ({
      id: formation.id ?? null,
      name: formation.name ?? formation.display_name ?? null,
      kind: formation.kind ?? null,
      location_osid: formation.location_osid ?? null,
      corps_id: formation.corps_id ?? formation.parent_id ?? null,
    });
    const fieldedIds = fieldedOwned.map((formation) => String(formation.id ?? '')).filter(Boolean);
    return {
      playerFaction,
      ownedCount: owned.length,
      locatedOwnedCount: locatedOwned.length,
      fieldedOwnedCount: fieldedOwned.length,
      unlocatedActiveCombatFormations: unlocatedActiveCombatFormations.map(summarize),
      unlocatedActiveCombatFormationsAllFactions: unlocatedActiveCombatFormationsAllFactions.map((formation) => ({
        ...summarize(formation),
        faction: formation.faction ?? null,
      })),
      unlocatedActiveCommandRecords: unlocatedActiveCommandRecords.map(summarize),
      byKind,
      overlayDataset: overlay ? { ...overlay.dataset } : null,
      renderedCounterCount: counters.length,
      renderedCounterIds: counters.map((counter) => counter.id).slice(0, 80),
      fieldedOwnedNotInCurrentViewport: fieldedIds.filter((id) => !counterIds.has(id)).slice(0, 80),
      krajinaOwned: fieldedOwned.filter(isKrajinaLike).map(summarize).slice(0, 80),
      krajinaRendered: counters
        .filter((counter) => /krajina|banja|prijedor|dubica|gradiska|krupa|sans|kljuc|mrkonjic|kotor|novi/i.test(`${counter.id} ${counter.title}`))
        .slice(0, 80),
    };
  });
  const canonicalAutosave = canonicalFormationAuditFromAutosave(canonicalAutosavePath);
  return {
    ...playerVisibleAudit,
    playerVisibleUnlocatedActiveCombatFormationsAllFactions:
      playerVisibleAudit?.unlocatedActiveCombatFormationsAllFactions ?? [],
    unlocatedActiveCombatFormationsAllFactions:
      canonicalAutosave?.unlocatedActiveCombatFormationsAllFactions ?? [],
    canonicalAutosave,
  };
}

async function captureScreenshotBuffer(page, label) {
  const failures = [];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const screenshotBuffer = await page.screenshot({
        fullPage: false,
        timeout: 90000,
        animations: 'disabled',
        caret: 'hide',
      });
      return screenshotBuffer;
    } catch (error) {
      failures.push({ attempt, error: String(error?.message ?? error) });
      if (attempt < 2) await sleep(1500);
    }
  }
  throw new Error(`Screenshot capture failed after bounded retries (${label}): ${JSON.stringify(failures)}`);
}

async function snapshot(page, frame, faction, events, label, extra = {}) {
  const surface = frame ?? page;
  const screenshot = path.join(screenshotsDir, `${safeName(runLabel)}-${safeName(faction)}-${String(events.length).padStart(3, '0')}-${safeName(label)}.png`);
  fs.rmSync(screenshot, { force: true });
  const screenshotBuffer = await captureScreenshotBuffer(page, label);
  if (screenshotBuffer.length < 1000 || screenshotBuffer.subarray(1, 4).toString('ascii') !== 'PNG') {
    throw new Error(`Invalid screenshot buffer for ${label}`);
  }
  fs.writeFileSync(screenshot, screenshotBuffer);
  const screenshotHash = crypto.createHash('sha256').update(screenshotBuffer).digest('hex');
  const [text, buttons, diagnostics, state, interactions, formations] = await Promise.all([
    bodyText(surface),
    visibleButtons(surface),
    textDiagnostics(surface),
    frame ? readState(frame) : Promise.resolve(null),
    interactionDiagnostics(surface),
    frame ? formationAudit(frame) : Promise.resolve(null),
  ]);
  const event = {
    label,
    surfaceUrl: surface.url(),
    screenshot,
    screenshotHash,
    text: compactText(text),
    state,
    buttons: Array.isArray(buttons) ? buttons.slice(0, 80) : buttons,
    diagnostics,
    interactions,
    formations,
    ...extra,
  };
  events.push(event);
  if (writeLiveEvents) {
    writeJsonAtomic(liveEventsPath, {
      updatedAt: new Date().toISOString(),
      runLabel,
      faction,
      eventCount: events.length,
      lastEvent: event,
      recentEvents: events.slice(-80),
    });
  }
  return event;
}

async function waitForGamePage(app) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    for (const page of app.windows()) {
      const url = page.url();
      if (!url.startsWith('devtools://') && (url.includes('awwv://warroom') || url.includes('index.html'))) {
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        return page;
      }
    }
    await sleep(500);
  }
  throw new Error('Timed out waiting for Electron game window');
}

async function waitForEmbeddedFrame(page) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const frame = page.frames().find((candidate) => candidate.url().includes('/index.html')
      && candidate.url().includes('embedded=1')
      && (!requiredMapOrigin || new URL(candidate.url()).origin === requiredMapOrigin));
    if (frame) {
      await frame.waitForLoadState('domcontentloaded').catch(() => {});
      return frame;
    }
    await sleep(500);
  }
  const observed = page.frames().map((candidate) => candidate.url()).filter(Boolean);
  throw new Error(`Timed out waiting for embedded tactical frame${requiredMapOrigin ? ` from ${requiredMapOrigin}` : ''}; observed ${JSON.stringify(observed)}`);
}

async function startCampaign(page, faction, events) {
  await snapshot(page, null, faction, events, 'launch-screen');
  if (!await clickMatch(page, /New Campaign/i, 'new campaign')) throw new Error('Could not click New Campaign');
  await snapshot(page, null, faction, events, 'side-picker');
  const factionPattern = faction === 'RS'
    ? /Play as RS|RS \(VRS\)|RS\s+STANDARD/i
    : faction === 'RBiH'
      ? /Play as RBiH|RBiH|ARBiH|Bosnian Government/i
      : /Play as HRHB|HRHB|HVO|Croat/i;
  if (!await clickMatch(page, factionPattern, `play as ${faction}`, { afterMs: 1600 })) {
    throw new Error(`Could not click faction ${faction}`);
  }
  const frame = await waitForEmbeddedFrame(page);
  try {
    await frame.waitForLoadState('networkidle', { timeout: 120000 });
  } catch (error) {
    throw new Error(`intro frame did not reach network idle before dismissal: ${error.message}`);
  }
  await snapshot(page, frame, faction, events, 'intro-before-dismiss');
  for (let i = 0; i < 10; i += 1) {
    const text = await bodyText(frame);
    if (/WAR HAS STARTED|A\s*C\s*K\s*N\s*O\s*W\s*L\s*E\s*D\s*G\s*E|Acknowledge/i.test(text)) {
      await clickMatch(frame, /A\s*C\s*K\s*N\s*O\s*W\s*L\s*E\s*D\s*G\s*E|Acknowledge/i, 'acknowledge', { afterMs: 1000 });
      continue;
    }
    if (/WAR BEGINS|WHO YOU ARE|B\s*E\s*G\s*I\s*N|Begin/i.test(text)) {
      await clickMatch(frame, /B\s*E\s*G\s*I\s*N|Begin/i, 'begin', { afterMs: 1200 });
      continue;
    }
    break;
  }
  await snapshot(page, frame, faction, events, 'command-post-after-intro');
  return frame;
}

async function clickAndMeasure(surface, pattern, label, options = {}) {
  const measureSurface = options.measureSurface ?? surface;
  const clickSurface = options.clickSurface ?? surface;
  const beforeText = compactText(await bodyText(measureSurface), 1200);
  const beforeButtons = await visibleButtons(measureSurface).catch(() => []);
  const clicked = await clickMatch(clickSurface, pattern, label, options);
  const afterText = compactText(await bodyText(measureSurface), 1200);
  const afterButtons = await visibleButtons(measureSurface).catch(() => []);
  const beforeButtonSig = Array.isArray(beforeButtons)
    ? beforeButtons.map((button) => `${button.text}|${button.aria}|${button.disabled}`).join('\n')
    : '';
  const afterButtonSig = Array.isArray(afterButtons)
    ? afterButtons.map((button) => `${button.text}|${button.aria}|${button.disabled}`).join('\n')
    : '';
  return {
    label,
    clicked,
    changed: clicked && (beforeText !== afterText || beforeButtonSig !== afterButtonSig),
    beforeText,
    afterText,
  };
}

async function clickExactVisibleButtonAndMeasure(surface, labels, label, options = {}) {
  const beforeText = compactText(await bodyText(surface), 1200);
  const beforeButtons = await visibleButtons(surface).catch(() => []);
  let clicked = false;
  for (const text of labels) {
    clicked = await clickVisibleButtonText(surface, text, `${label} ${text}`, { afterMs: 0 });
    if (clicked) break;
  }
  if (clicked) await sleep(options.afterMs ?? 750);
  const afterText = compactText(await bodyText(surface), 1200);
  const afterButtons = await visibleButtons(surface).catch(() => []);
  const beforeButtonSig = Array.isArray(beforeButtons)
    ? beforeButtons.map((button) => `${button.text}|${button.aria}|${button.disabled}`).join('\n')
    : '';
  const afterButtonSig = Array.isArray(afterButtons)
    ? afterButtons.map((button) => `${button.text}|${button.aria}|${button.disabled}`).join('\n')
    : '';
  return {
    label,
    clicked,
    changed: clicked && (beforeText !== afterText || beforeButtonSig !== afterButtonSig),
    beforeText,
    afterText,
  };
}

async function closeOpenSurface(frame) {
  if (await frame.locator('[data-testid="event-decision-response-rail"]').isVisible().catch(() => false)) {
    throw new Error('required-event-decision');
  }
  if (await clickMatch(frame, /Dismiss Expansion/i, 'dismiss stack expansion', { afterMs: 400 })) return true;
  if (await clickTestId(frame, 'warroom-decision-room-close', 'close decision room', { afterMs: 500 })) return true;
  if (await clickTestId(frame, 'command-card-strip-close', 'close command surface', { afterMs: 500 })) return true;
  if (await clickMatch(frame, /^Cancel$|Cancel/i, 'cancel modal', { afterMs: 500 })) return true;
  if (await clickMatch(frame, /^Close$|Close Decision Room|Close/i, 'close modal', { afterMs: 500 })) return true;
  if (await clickMatch(frame, /^FIELD$|FIELD/i, 'field return', { afterMs: 700 })) return true;
  return false;
}

async function clearOpenSurfaces(frame, maxSteps = 8) {
  let closed = 0;
  for (let i = 0; i < maxSteps; i += 1) {
    if (!await closeOpenSurface(frame)) break;
    closed += 1;
  }
  return closed;
}

async function ensureWarroom(frame, label = 'warroom') {
  const warroomToolbar = frame.locator('[data-testid="warroom-toolbar"]').first();
  if (await warroomToolbar.isVisible().catch(() => false)) return true;
  const opened = await clickTestId(frame, 'toolbar-route-desk', `${label} desk route`, { afterMs: 1200 })
    || await clickMatch(frame, /^Desk$|President's Desk|toolbar-route-desk/i, `${label} desk route fallback`, { afterMs: 1200 });
  if (!opened) return false;
  return warroomToolbar.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
}

async function waitForTacticalMapReady(frame, expectedTurn, requireVisibleCounters, timeoutMs = 15000) {
  return frame.waitForFunction(({ turn, requireCounters }) => {
    const map = document.querySelector('[data-testid="tactical-map"]');
    if (!map || map.getAttribute('data-map-ready') !== 'true') return false;
    if (map.getAttribute('aria-hidden') === 'true') return false;
    if (turn != null && map.getAttribute('data-map-state-turn') !== String(turn)) return false;
    const mapRect = map.getBoundingClientRect();
    const mapStyle = window.getComputedStyle(map);
    if (mapRect.width <= 1 || mapRect.height <= 1) return false;
    if (mapStyle.display === 'none' || mapStyle.visibility === 'hidden' || Number(mapStyle.opacity || '1') <= 0.01) return false;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    if (mapRect.right <= 0 || mapRect.bottom <= 0 || mapRect.left >= viewportWidth || mapRect.top >= viewportHeight) return false;
    const hitPoints = [
      [0.5, 0.5],
      [0.25, 0.25],
      [0.75, 0.25],
      [0.25, 0.75],
      [0.75, 0.75],
    ];
    const hitTestable = hitPoints.some(([xRatio, yRatio]) => {
      const hit = document.elementFromPoint(
        mapRect.left + mapRect.width * xRatio,
        mapRect.top + mapRect.height * yRatio,
      );
      return hit === map || (hit != null && map.contains(hit));
    });
    if (!hitTestable) return false;
    const overlay = document.querySelector('[data-awwv-dom-formation-counters="true"]');
    if (!overlay || overlay.dataset.awwvFormationCounterSourceGate !== 'ready') return false;
    if (overlay.dataset.awwvFormationCounterNeedsUpdate !== 'false') return false;
    const sourceCount = Number(overlay.dataset.awwvFormationCounterSourceCount ?? '-1');
    const renderedCount = Number(overlay.dataset.awwvFormationCounterRenderedCount ?? '-1');
    if (sourceCount < 0 || renderedCount < 0) return false;
    return !requireCounters || renderedCount > 0;
  }, { turn: expectedTurn ?? null, requireCounters: Boolean(requireVisibleCounters) }, { timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);
}

async function tacticalMapReadinessDiagnostics(frame, expectedTurn, requireVisibleCounters) {
  return frame.evaluate(({ turn, requireCounters }) => {
    const map = document.querySelector('[data-testid="tactical-map"]');
    const overlay = document.querySelector('[data-awwv-dom-formation-counters="true"]');
    const describeNode = (node) => node ? {
      tag: node.tagName?.toLowerCase() ?? null,
      id: node.id || null,
      testId: node.getAttribute?.('data-testid') ?? null,
      className: typeof node.className === 'string' ? node.className.slice(0, 240) : null,
      insideMap: Boolean(map && (node === map || map.contains(node))),
    } : null;
    if (!map) {
      return {
        expectedTurn: turn,
        requireCounters,
        mapFound: false,
        overlayFound: Boolean(overlay),
        overlayDataset: overlay ? { ...overlay.dataset } : null,
      };
    }
    const rect = map.getBoundingClientRect();
    const style = window.getComputedStyle(map);
    const hitPoints = [
      [0.5, 0.5],
      [0.25, 0.25],
      [0.75, 0.25],
      [0.25, 0.75],
      [0.75, 0.75],
    ].map(([xRatio, yRatio]) => {
      const x = rect.left + rect.width * xRatio;
      const y = rect.top + rect.height * yRatio;
      return { x: Math.round(x), y: Math.round(y), hit: describeNode(document.elementFromPoint(x, y)) };
    });
    return {
      expectedTurn: turn,
      requireCounters,
      mapFound: true,
      mapReady: map.getAttribute('data-map-ready'),
      mapStateTurn: map.getAttribute('data-map-state-turn'),
      ariaHidden: map.getAttribute('aria-hidden'),
      rect: {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      style: { display: style.display, visibility: style.visibility, opacity: style.opacity },
      viewport: {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      },
      hitPoints,
      overlayFound: Boolean(overlay),
      overlayDataset: overlay ? { ...overlay.dataset } : null,
    };
  }, { turn: expectedTurn ?? null, requireCounters: Boolean(requireVisibleCounters) });
}

async function openWarroomRoute(frame, routeId, label, options = {}) {
  if (!await ensureWarroom(frame, `${label} ensure warroom`)) return false;
  return clickTestId(frame, `warroom-toolbar-${routeId}`, label, { afterMs: options.afterMs ?? 1000 });
}

async function openExactWarMapRoute(frame, label, options = {}) {
  const afterMs = options.afterMs ?? 1200;
  const warroomRoute = frame.locator('[data-testid="warroom-toolbar-war-map"]').first();
  if (await warroomRoute.isVisible().catch(() => false)) {
    return withinMapNavigationAbortWindow(frame, `${label} warroom route`, () => (
      clickTestId(frame, 'warroom-toolbar-war-map', `${label} warroom route`, { afterMs })
    ));
  }
  const fieldRoute = frame.locator('[data-testid="toolbar-route-war-map"]').first();
  if (await fieldRoute.isVisible().catch(() => false)) {
    return withinMapNavigationAbortWindow(frame, `${label} field route`, () => (
      clickTestId(frame, 'toolbar-route-war-map', `${label} field route`, { afterMs })
    ));
  }
  if (!await ensureWarroom(frame, `${label} ensure warroom`)) return false;
  return withinMapNavigationAbortWindow(frame, `${label} warroom route`, () => (
    clickTestId(frame, 'warroom-toolbar-war-map', `${label} warroom route`, { afterMs })
  ));
}

async function openArmyHqFromCurrentSurface(frame, label, options = {}) {
  const afterMs = options.afterMs ?? 900;
  const fieldRoute = frame.locator('[data-testid="toolbar-route-army-hq"]').first();
  if (await fieldRoute.isVisible().catch(() => false)) {
    return clickTestId(frame, 'toolbar-route-army-hq', `${label} field route`, { afterMs });
  }
  const warroomRoute = frame.locator('[data-testid="warroom-toolbar-staff"]').first();
  if (await warroomRoute.isVisible().catch(() => false)) {
    return clickTestId(frame, 'warroom-toolbar-staff', `${label} warroom route`, { afterMs });
  }
  return false;
}

async function openCommandSurfaceFromWarroom(frame, label = 'command surface') {
  await closeOpenSurface(frame);
  return await openWarroomRoute(frame, 'command-surface', label, { afterMs: 1000 });
}

async function openDecisionRoomFromWarroom(frame, label = 'decision room') {
  const openedCommandSurface = await openCommandSurfaceFromWarroom(frame, `${label} command surface`);
  if (!openedCommandSurface) throw new Error(`Decision Room route could not open command surface: ${label}`);
  const cardLocator = frame.locator('[data-testid^="command-card-cat_"]');
  const cardCount = await cardLocator.count();
  if (cardCount < 1) throw new Error(`Decision Room route exposed no command cards: ${label}`);
  const cardTestId = await cardLocator.nth(0).getAttribute('data-testid');
  if (!cardTestId) throw new Error(`Decision Room route command card had no identity: ${label}`);
  const clicked = await clickTestId(frame, cardTestId, label, { afterMs: 900 });
  if (!clicked) throw new Error(`Decision Room route command card did not open: ${cardTestId}`);
  const hosts = frame.locator('[data-testid="warroom-decision-room-host"]');
  if (await hosts.count() !== 1 || !await hosts.isVisible()) {
    throw new Error(`Decision Room route did not reach one visible host: ${label}`);
  }
  return true;
}

async function acceptStrategicProposalThroughUi(frame, proposal, options = {}) {
  const reviewId = proposal?.id ?? null;
  const proposedAction = proposal?.action ?? null;
  if (!reviewId) throw new Error('Required proposal UI resolution is missing its review id');
  const { categoryId, priorityCardId, actionLabel } = proposalDecisionRoomRoute(reviewId, proposedAction);

  await clearOpenSurfaces(frame);
  const openedCommandSurface = await openCommandSurfaceFromWarroom(frame, `proposal ${reviewId} command surface`);
  if (!openedCommandSurface) throw new Error(`Required proposal route failed: ${reviewId}`);
  const openedCategory = await clickTestId(frame, `command-card-cat_${categoryId}`, `proposal ${reviewId} category`, { afterMs: 900 });
  if (!openedCategory) throw new Error(`Required proposal category failed: ${reviewId}`);
  const card = frame.locator(`[data-testid="decision-room-priority-card-${priorityCardId}"]`).first();
  await card.waitFor({ state: 'visible', timeout: 5000 });
  const dossier = card.getByRole('button', { name: 'Dossier', exact: true }).first();
  await dossier.waitFor({ state: 'visible', timeout: 5000 });
  await dossier.click({ timeout: 5000 });
  const host = frame.locator('[data-testid="warroom-decision-room-host"]').first();
  await host.waitFor({ state: 'visible', timeout: 5000 });
  const ordinaryProposal = typeof proposedAction === 'string' && proposedAction.startsWith('APPROVE_OP:');
  const dossierPanel = host.locator(
    `[data-testid="decision-room-active-dossier"][data-card-id="${priorityCardId}"]`,
  ).first();
  await dossierPanel.waitFor({ state: 'visible', timeout: 5000 });
  const dossierReview = dossierPanel.locator('[data-testid="decision-room-dossier-review"]').first();
  await dossierReview.waitFor({ state: 'visible', timeout: 5000 });
  const dossierText = await dossierPanel.innerText({ timeout: 5000 });
  let dossierTruth = null;
  let dossierTruthError = null;
  if (ordinaryProposal && options.requireOrdinaryProposalDossierTruth === true) {
    try {
      dossierTruth = assertOrdinaryProposalDossierTruth(reviewId, dossierText);
    } catch (error) {
      dossierTruthError = error;
    }
  }
  if (typeof options.onDossierOpen === 'function') {
    await options.onDossierOpen({
      reviewId,
      proposedAction,
      ordinaryProposal,
      dossierTruth,
      dossierTruthError: dossierTruthError instanceof Error ? dossierTruthError.message : null,
      dossierText: compactText(dossierText, 4000),
    });
  }
  if (dossierTruthError) throw dossierTruthError;
  const fieldPlanProof = await exerciseHistoricalOperationMapHandoff(frame, {
    reviewId,
    proposedAction,
    priorityCardId,
    onFieldPlanOpen: options.onFieldPlanOpen,
    onFieldPlanReturn: options.onFieldPlanReturn,
  });
  const clicked = await clickExactVisibleButton(host, actionLabel, `proposal ${reviewId} ${actionLabel}`, { afterMs: 1200 });
  if (!clicked) throw new Error(`Required proposal action failed: ${reviewId} ${actionLabel}`);
  return { handled: true, proposalId: reviewId, proposedAction, priorityCardId, actionLabel, dossierTruth, fieldPlanProof };
}

const CERSKA_KAMENICA_OBJECTIVE_OSIDS = [
  'op:srebrenica:osmace_2',
  'op:srebrenica:radovcici',
  'op:srebrenica:sulice_2',
  'op:vlasenica:cerska_2',
];

async function exerciseHistoricalOperationMapHandoff(frame, options) {
  if (typeof options.proposedAction !== 'string' || !options.proposedAction.startsWith('HISTORICAL_OP:')) {
    return { exercised: false, reason: 'not-historical-operation' };
  }
  return withinMapNavigationAbortWindow(frame, `historical operation ${options.reviewId}`, () => (
    exerciseHistoricalOperationMapHandoffWithinNavigationWindow(frame, options)
  ));
}

async function exerciseHistoricalOperationMapHandoffWithinNavigationWindow(frame, options) {
  const dossierPanel = frame.locator(
    `[data-testid="decision-room-active-dossier"][data-card-id="${options.priorityCardId}"]`,
  ).first();
  const showOnMap = dossierPanel.locator('[data-testid="decision-room-dossier-show-on-map"]');
  if (await showOnMap.count() !== 1 || !await showOnMap.isVisible()) {
    throw new Error(`Historical operation dossier exposed no exact Show on map action: ${options.reviewId}`);
  }
  const map = frame.locator('[data-testid="tactical-map"]');
  const context = frame.locator('[data-testid="field-operation-plan-context"]');
  await showOnMap.click({ timeout: 5000 });
  await map.waitFor({ state: 'visible', timeout: 30000 });
  await frame.waitForFunction(() => document.querySelector('[data-testid="tactical-map"]')?.getAttribute('data-map-ready') === 'true');
  await context.waitFor({ state: 'visible', timeout: 10000 });
  const objectiveOsids = await context.locator('[data-testid="field-operation-objective"]').evaluateAll((nodes) => (
    nodes.map((node) => node.getAttribute('data-osid')).filter(Boolean)
  ));
  const stagingOsids = await context.locator('[data-testid="field-operation-staging"]').evaluateAll((nodes) => (
    nodes.map((node) => node.getAttribute('data-osid')).filter(Boolean)
  ));
  const focusOsids = [...objectiveOsids, ...stagingOsids];
  try {
    await frame.waitForFunction(() => {
      const tacticalMap = document.querySelector('[data-testid="tactical-map"]');
      return tacticalMap?.getAttribute('data-field-operation-all-objectives-in-viewport') === 'true'
        && tacticalMap.getAttribute('data-field-operation-all-focus-in-viewport') === 'true'
        && tacticalMap.getAttribute('data-field-operation-focus-status') === 'applied'
        && tacticalMap.getAttribute('data-field-operation-bounds-suspended') === 'true'
        && Boolean(tacticalMap.getAttribute('data-field-operation-focus-key'))
        && Boolean(tacticalMap.getAttribute('data-field-operation-focus-target'));
    });
  } catch (error) {
    const visibleOccluders = await frame.locator('[data-awwv-counter-occluder="true"]').evaluateAll((nodes) => (
      nodes.flatMap((node) => {
        const style = window.getComputedStyle(node);
        if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return [];
        const rect = node.getBoundingClientRect();
        return [{
          testId: node.getAttribute('data-testid'),
          rect: {
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        }];
      })
    ));
    const viewportDiagnostics = {
      objectiveOsids,
      missingObjectiveOsids: String(await map.getAttribute('data-field-operation-missing-objective-osids') ?? '').split('|').filter(Boolean),
      offscreenObjectiveOsids: String(await map.getAttribute('data-field-operation-offscreen-objective-osids') ?? '').split('|').filter(Boolean),
      objectiveViewportPositions: String(await map.getAttribute('data-field-operation-objective-viewport-positions') ?? ''),
      focusOsids,
      missingFocusOsids: String(await map.getAttribute('data-field-operation-missing-focus-osids') ?? '').split('|').filter(Boolean),
      offscreenFocusOsids: String(await map.getAttribute('data-field-operation-offscreen-focus-osids') ?? '').split('|').filter(Boolean),
      focusViewportPositions: String(await map.getAttribute('data-field-operation-focus-viewport-positions') ?? ''),
      camera: String(await map.getAttribute('data-field-operation-camera') ?? ''),
      focusKey: String(await map.getAttribute('data-field-operation-focus-key') ?? ''),
      focusStatus: String(await map.getAttribute('data-field-operation-focus-status') ?? ''),
      focusTarget: String(await map.getAttribute('data-field-operation-focus-target') ?? ''),
      focusRequestCount: Number(await map.getAttribute('data-field-operation-focus-request-count')),
      focusApplyCount: Number(await map.getAttribute('data-field-operation-focus-apply-count')),
      boundsSuspended: await map.getAttribute('data-field-operation-bounds-suspended') === 'true',
      visibleOccluders,
    };
    const failureProof = {
      exercised: true,
      reviewId: options.reviewId,
      priorityCardId: options.priorityCardId,
      viewportTimedOut: true,
      viewportDiagnostics,
    };
    if (typeof options.onFieldPlanOpen === 'function') await options.onFieldPlanOpen(failureProof);
    throw new Error(`Historical operation viewport proof timed out: ${JSON.stringify(failureProof)}`, { cause: error });
  }
  const diagnosticObjectiveOsids = String(await map.getAttribute('data-field-operation-objective-osids') ?? '')
    .split('|')
    .filter(Boolean);
  if (objectiveOsids.length === 0 || JSON.stringify(objectiveOsids) !== JSON.stringify(diagnosticObjectiveOsids)) {
    throw new Error(`Historical operation field objective identity mismatch: ${JSON.stringify({ objectiveOsids, diagnosticObjectiveOsids })}`);
  }
  const diagnosticFocusOsids = String(await map.getAttribute('data-field-operation-focus-osids') ?? '')
    .split('|')
    .filter(Boolean);
  if (focusOsids.length === 0 || JSON.stringify(focusOsids) !== JSON.stringify(diagnosticFocusOsids)) {
    throw new Error(`Historical operation exact focus identity mismatch: ${JSON.stringify({ focusOsids, diagnosticFocusOsids })}`);
  }
  const missingFocusOsids = String(await map.getAttribute('data-field-operation-missing-focus-osids') ?? '').split('|').filter(Boolean);
  const offscreenFocusOsids = String(await map.getAttribute('data-field-operation-offscreen-focus-osids') ?? '').split('|').filter(Boolean);
  const focusViewportPositions = JSON.parse(String(await map.getAttribute('data-field-operation-focus-viewport-positions') ?? '[]'));
  if (missingFocusOsids.length > 0 || offscreenFocusOsids.length > 0 || focusViewportPositions.length !== focusOsids.length) {
    throw new Error(`Historical operation exact objective/staging viewport proof failed: ${JSON.stringify({ focusOsids, missingFocusOsids, offscreenFocusOsids, focusViewportPositions })}`);
  }
  if (options.proposedAction.endsWith(':Operation Cerska-Kamenica')
    && JSON.stringify(objectiveOsids) !== JSON.stringify(CERSKA_KAMENICA_OBJECTIVE_OSIDS)) {
    throw new Error(`Cerska-Kamenica exact objective mismatch: ${JSON.stringify(objectiveOsids)}`);
  }
  const focusKey = String(await map.getAttribute('data-field-operation-focus-key') ?? '');
  const focusStatus = String(await map.getAttribute('data-field-operation-focus-status') ?? '');
  const focusTarget = String(await map.getAttribute('data-field-operation-focus-target') ?? '');
  const focusRequestCount = Number(await map.getAttribute('data-field-operation-focus-request-count'));
  const focusApplyCount = Number(await map.getAttribute('data-field-operation-focus-apply-count'));
  const boundsSuspended = await map.getAttribute('data-field-operation-bounds-suspended') === 'true';
  const expectedFocusKey = [options.reviewId, ...focusOsids].join('|');
  if (focusStatus !== 'applied' || focusKey !== expectedFocusKey || !focusTarget) {
    throw new Error(`Historical operation focus receipt was not applied to the exact dossier: ${JSON.stringify({ focusKey, focusStatus, focusTarget })}`);
  }
  if (focusRequestCount < 1 || focusApplyCount !== focusRequestCount || !boundsSuspended) {
    throw new Error(`Historical operation camera request/apply counts exposed hidden or failed focus calls: ${JSON.stringify({ focusRequestCount, focusApplyCount })}`);
  }
  const ownerIdentity = await frame.evaluate(() => ({
    retainedMainMapOwners: document.querySelectorAll('[data-retained-main-map-owner="true"]').length,
    retainedDeckOwners: document.querySelectorAll('[data-retained-deck-owner="true"]').length,
  }));
  if (ownerIdentity.retainedMainMapOwners !== 1 || ownerIdentity.retainedDeckOwners !== 1) {
    throw new Error(`Historical operation handoff replaced or duplicated retained graphics owners: ${JSON.stringify(ownerIdentity)}`);
  }
  const openProof = {
    exercised: true,
    reviewId: options.reviewId,
    priorityCardId: options.priorityCardId,
    objectiveOsids,
    stagingOsids,
    focusOsids,
    focusViewportPositions,
    objectiveCount: Number(await map.getAttribute('data-field-operation-objective-count')),
    allObjectivesInViewport: await map.getAttribute('data-field-operation-all-objectives-in-viewport') === 'true',
    allFocusInViewport: await map.getAttribute('data-field-operation-all-focus-in-viewport') === 'true',
    focusKey,
    focusStatus,
    focusTarget: JSON.parse(focusTarget),
    focusRequestCount,
    focusApplyCount,
    boundsSuspended,
    hiddenCameraCalls: focusRequestCount - focusApplyCount,
    ownerIdentity,
  };
  if (typeof options.onFieldPlanOpen === 'function') await options.onFieldPlanOpen(openProof);

  const selectedObjectiveOsid = objectiveOsids[0];
  await context.locator(`[data-testid="field-operation-objective"][data-osid="${selectedObjectiveOsid}"]`).click({ timeout: 5000 });
  await frame.waitForFunction((osid) => (
    document.querySelector('[data-testid="tactical-map"]')?.getAttribute('data-field-operation-selected-osid') === osid
  ), selectedObjectiveOsid);
  const returned = await clickTestId(context, 'field-operation-return-to-dossier', `proposal ${options.reviewId} return to dossier`, { afterMs: 900 });
  if (!returned) throw new Error(`Historical operation map could not return to dossier: ${options.reviewId}`);
  const returnedDossier = frame.locator(
    `[data-testid="decision-room-active-dossier"][data-card-id="${options.priorityCardId}"]`,
  ).first();
  await returnedDossier.waitFor({ state: 'visible', timeout: 10000 });
  await frame.waitForFunction(() => (
    document.querySelector('[data-testid="tactical-map"]')?.getAttribute('data-field-operation-bounds-suspended') === 'false'
  ));
  const returnProof = {
    ...openProof,
    selectedObjectiveOsid,
    returnedToSameDossier: await returnedDossier.getAttribute('data-card-id') === options.priorityCardId,
    boundsRestored: await map.getAttribute('data-field-operation-bounds-suspended') === 'false',
  };
  if (!returnProof.returnedToSameDossier || !returnProof.boundsRestored) {
    throw new Error(`Historical operation did not return to the same dossier after map return: ${options.reviewId}`);
  }
  if (typeof options.onFieldPlanReturn === 'function') await options.onFieldPlanReturn(returnProof);
  return returnProof;
}

async function decisionRoomDeepDive(page, frame, faction, events, labelPrefix = 'decision-room') {
  const decisionRoomHosts = frame.locator('[data-testid="warroom-decision-room-host"]');
  if (await decisionRoomHosts.count() !== 1) throw new Error('Decision Room host identity is not unique');
  const decisionRoomHost = decisionRoomHosts;
  if (!await decisionRoomHost.isVisible()) throw new Error('Decision Room host is not visible');
  const lensResults = [];
  const lensIds = await decisionRoomHost.locator('[data-testid^="decision-room-lens-"]').evaluateAll((nodes) => (
    nodes.map((node) => (node.getAttribute('data-testid') ?? '').replace('decision-room-lens-', '')).filter(Boolean)
  ));
  if (lensIds.length === 0) throw new Error('Decision Room exposed no lenses');
  for (const lensId of lensIds) {
    const clicked = await clickTestId(decisionRoomHost, `decision-room-lens-${lensId}`, `lens ${lensId}`, { afterMs: 650 });
    const active = await decisionRoomHost.locator(`[data-testid="decision-room-lens-${lensId}"]`).getAttribute('aria-pressed') === 'true';
    const result = { lensId, clicked, active };
    if (!clicked || !active) throw new Error(`Decision Room lens failed: ${JSON.stringify(result)}`);
    lensResults.push(result);
    await snapshot(page, frame, faction, events, `${labelPrefix}-lens-${safeName(lensId)}`, { lensResult: result });
  }

  const review = decisionRoomHost.locator('[data-testid="decision-room-dossier-review"]');
  if (await review.count() !== 1) throw new Error('Decision Room dossier review identity is not unique');
  const reviewDisabled = await review.isDisabled();
  const reviewText = compactText(await review.innerText(), 120);
  const navigationKind = await review.getAttribute('data-navigation-kind');
  let reviewClicked = false;
  let reviewVisualChanged = false;
  if (reviewDisabled) {
    if (!/Current dossier/i.test(reviewText)) {
      throw new Error(`Decision Room disabled review has no truthful reason: ${reviewText}`);
    }
  } else {
    const beforeReview = await page.screenshot({ fullPage: false });
    await review.click({ timeout: 5000 });
    await sleep(850);
    const afterReview = await page.screenshot({ fullPage: false });
    reviewClicked = true;
    reviewVisualChanged = !beforeReview.equals(afterReview);
    if (!reviewVisualChanged) throw new Error(`Decision Room review produced no visible result: ${navigationKind ?? 'unknown'}`);
  }
  const reviewResults = [{ reviewDisabled, reviewText, navigationKind, reviewClicked, reviewVisualChanged }];
  await snapshot(page, frame, faction, events, `${labelPrefix}-review-action`, { reviewResult: reviewResults[0] });
  await clearOpenSurfaces(frame);
  return { lensResults, reviewResults };
}

async function commandSurfaceDeepDive(page, frame, faction, events, options = {}) {
  const commandSurfaceOpened = await openCommandSurfaceFromWarroom(frame, 'command surface');
  if (!commandSurfaceOpened) throw new Error('Command surface failed to open');
  await snapshot(page, frame, faction, events, 'command-surface-start');
  const cardIds = await frame.locator('[data-testid^="command-card-cat_"]').evaluateAll((nodes) =>
    nodes
      .map((node) => node.getAttribute('data-testid') ?? '')
      .filter(Boolean)
      .slice(0, 12),
  );
  if (cardIds.length === 0) throw new Error('Command surface exposed no category cards');
  const cardResults = [];
  let emptyCommandCategoryProof = null;
  for (const cardId of cardIds) {
    const clicked = await clickTestId(frame, cardId, cardId, { afterMs: 900 });
    if (!clicked) throw new Error(`Command card failed to open: ${cardId}`);
    const expectedCommandCategoryId = cardId.replace('command-card-', '');
    const decisionRoom = frame.locator('[data-testid="presidential-decision-room"]');
    await decisionRoom.waitFor({ state: 'visible', timeout: 5000 });
    const observedCommandCategoryId = await decisionRoom.getAttribute('data-command-category-id');
    if (observedCommandCategoryId !== expectedCommandCategoryId) {
      throw new Error(`Command card opened the wrong Decision Room category: expected ${expectedCommandCategoryId}, observed ${observedCommandCategoryId ?? 'none'}`);
    }
    const priorityCardCount = await decisionRoom.locator('[data-testid^="decision-room-priority-card-"]').count();
    const decisionRoomText = compactText(await decisionRoom.innerText(), 2200);
    const dossierCount = await decisionRoom.locator('[data-testid="decision-room-dossier-review"]').count();
    const allLensPressed = await decisionRoom.locator('[data-testid="decision-room-lens-all"]').getAttribute('aria-pressed');
    if (priorityCardCount === 0) {
      if (!decisionRoomText.includes('No items in this command category.')) {
        throw new Error(`Empty command category has no explicit empty state: ${expectedCommandCategoryId}`);
      }
      if (dossierCount !== 0) {
        throw new Error(`Empty command category retained an unrelated dossier: ${expectedCommandCategoryId}`);
      }
      if (allLensPressed !== 'false') {
        throw new Error(`Empty command category left the All lens pressed: ${expectedCommandCategoryId}`);
      }
      if (expectedCommandCategoryId === 'cat_conscience') {
        const asideCount = await decisionRoom.locator('aside').count();
        if (asideCount !== 0) {
          throw new Error(`Empty command category retained a dossier container: ${expectedCommandCategoryId}`);
        }
        emptyCommandCategoryProof = {
          categoryId: expectedCommandCategoryId,
          emptyText: 'No items in this command category.',
          priorityCardCount,
          dossierCount,
          asideCount,
          allLensPressed,
        };
        await snapshot(page, frame, faction, events, `${options.proofLabelPrefix ?? 'command-surface'}-empty-cat_conscience`, {
          emptyCommandCategoryProof,
        });
      }
    }
    cardResults.push({ cardId, clicked, priorityCardCount, dossierCount, allLensPressed });
    await snapshot(page, frame, faction, events, `command-card-${safeName(cardId)}`, {
      cardId,
      clicked,
      expectedCommandCategoryId,
      observedCommandCategoryId,
      priorityCardCount,
      dossierCount,
      allLensPressed,
    });
    await clearOpenSurfaces(frame);
    const reopened = await openCommandSurfaceFromWarroom(frame, 'command surface return');
    if (!reopened) throw new Error(`Command surface failed to reopen after ${cardId}`);
  }
  if (options.requireEmptyCommandCategoryProof === true && !emptyCommandCategoryProof) {
    throw new Error('Final-state tour did not prove an empty cat_conscience command category');
  }
  return { cardResults, emptyCommandCategoryProof };
}

async function armyHqDeepDive(page, frame, faction, events) {
  const opened = await openArmyHqFromCurrentSurface(frame, 'army hq', { afterMs: 1200 })
    || await clickMatch(frame, /Army HQ|Visit Army HQ|toolbar-route-staff/i, 'army hq fallback', { afterMs: 1200 });
  await snapshot(page, frame, faction, events, 'army-hq-open', { opened });
  if (!opened) throw new Error('Army HQ failed to open');
  await frame.locator('[data-testid="army-hq-modal"]').waitFor({ state: 'visible', timeout: 5000 });
  const tabs = [
    { id: 'briefing', label: 'briefing' },
    { id: 'summary', label: 'summary' },
    { id: 'records', label: 'records' },
    { id: 'personnel', label: 'personnel' },
  ];
  const tabResults = [];
  for (const tab of tabs) {
    const tabButton = frame.locator(`#army-hq-tab-${tab.id}`).first();
    await tabButton.waitFor({ state: 'visible', timeout: 5000 });
    await tabButton.click({ timeout: 5000 });
    await sleep(900);
    const panel = frame.locator(`#army-hq-tabpanel-${tab.id}`).first();
    await panel.waitFor({ state: 'visible', timeout: 5000 });
    const result = {
      id: tab.id,
      clicked: true,
      selected: await tabButton.getAttribute('aria-selected') === 'true',
      panelVisible: await panel.isVisible(),
    };
    if (!result.selected || !result.panelVisible) throw new Error(`Army HQ tab failed: ${JSON.stringify(result)}`);
    tabResults.push(result);
    await snapshot(page, frame, faction, events, `army-hq-tab-${tab.label}`, { tabResult: result });
  }
  const openedRecruitment = await clickTestId(frame, 'personnel-open-recruitment', 'personnel recruitment route', { afterMs: 800 });
  await snapshot(page, frame, faction, events, 'army-hq-recruitment-route', { openedRecruitment });
  const closedRecruitment = await clickTestId(frame, 'recruitment-close', 'close recruitment route', { afterMs: 500 });
  if (!closedRecruitment) throw new Error('Recruitment modal did not expose its exact close action');
  if (await frame.locator('[data-testid="recruitment-close"]').isVisible().catch(() => false)) {
    throw new Error('Recruitment modal remained open after exact close');
  }
  const reopenedForAutonomy = await openArmyHqFromCurrentSurface(frame, 'army hq autonomy return', { afterMs: 800 });
  const autonomyArmyHq = frame.locator('[data-testid="army-hq-modal"]');
  if (!reopenedForAutonomy || await autonomyArmyHq.count() !== 1) {
    throw new Error('Army HQ did not reopen after Recruitment');
  }
  await autonomyArmyHq.waitFor({ state: 'visible', timeout: 5000 });
  const autonomyPersonnelTab = frame.locator('#army-hq-tab-personnel').first();
  await autonomyPersonnelTab.waitFor({ state: 'visible', timeout: 5000 });
  const personnelHit = await autonomyPersonnelTab.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const owner = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      owned: owner === element || element.contains(owner),
      ownerTag: owner?.tagName ?? null,
      ownerId: owner?.id ?? null,
      ownerTestId: owner?.getAttribute('data-testid') ?? null,
    };
  });
  await snapshot(page, frame, faction, events, 'army-hq-autonomy-return', { reopenedForAutonomy, personnelHit });
  if (!personnelHit.owned) {
    throw new Error(`Personnel tab is intercepted after Recruitment: ${JSON.stringify(personnelHit)}`);
  }
  await autonomyPersonnelTab.click({ timeout: 10000 });
  await frame.locator('#army-hq-tabpanel-personnel').first().waitFor({ state: 'visible', timeout: 5000 });
  const openedAutonomy = await clickTestId(frame, 'personnel-open-autonomy', 'personnel autonomy route', { afterMs: 800 });
  await snapshot(page, frame, faction, events, 'army-hq-autonomy-route', { reopenedForAutonomy, openedAutonomy });
  await closeOpenSurface(frame);
  const reopenedForDeepDive = await openArmyHqFromCurrentSurface(frame, 'army hq deep dive return', { afterMs: 800 });
  if (!reopenedForDeepDive) throw new Error('Army HQ failed to reopen for command deep dive');
  await frame.locator('[data-testid="army-hq-modal"]').waitFor({ state: 'visible', timeout: 5000 });
  const briefingTab = frame.locator('#army-hq-tab-briefing').first();
  await briefingTab.click({ timeout: 5000 });
  await frame.locator('#army-hq-tabpanel-briefing').first().waitFor({ state: 'visible', timeout: 5000 });
  const corpsButtons = await frame.locator('[data-testid="army-hq-corps-index"] button').count().catch(() => 0);
  if (corpsButtons < 1) throw new Error('Army HQ exposed no corps commands');
  const corpsResults = [];
  for (let i = 0; i < corpsButtons; i += 1) {
    const loc = frame.locator('[data-testid="army-hq-corps-index"] button').nth(i);
    const label = await loc.innerText({ timeout: 2000 }).catch(() => `corps-${i}`);
    const corpsId = await loc.getAttribute('data-corps-id');
    if (!corpsId) throw new Error(`Army HQ corps command ${i} has no exact identity`);
    let corpsClickError = null;
    try {
      await loc.click({ timeout: 5000 });
    } catch (error) {
      corpsClickError = error;
    }
    const expandedCorps = frame.locator(`[data-testid="army-hq-modal"][data-expanded-corps-id="${corpsId}"]`).first();
    const corpsExpanded = await expandedCorps.waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (corpsClickError && !corpsExpanded) throw corpsClickError;
    if (!corpsExpanded) throw new Error(`Army HQ corps command did not open: ${corpsId}`);
    await sleep(900);
    corpsResults.push({ index: i, corpsId, label: compactText(label, 120) });
    await snapshot(page, frame, faction, events, `army-hq-corps-${i + 1}`, { corpsId, corpsLabel: label });
    const returned = await clickTestId(frame, 'army-hq-corps-back', 'army hq back', { afterMs: 600 });
    if (!returned) throw new Error(`Army HQ failed to return from corps ${corpsId}`);
  }
  const handoffButton = frame.locator('[data-testid="army-hq-decision-room-open"]').first();
  await handoffButton.waitFor({ state: 'visible', timeout: 5000 });
  const handoffRoute = await handoffButton.getAttribute('data-handoff-route');
  if (handoffRoute !== 'decision_room' && handoffRoute !== 'desk') {
    throw new Error(`Army HQ handoff exposed an invalid route: ${handoffRoute ?? 'missing'}`);
  }
  const handoff = await clickTestId(frame, 'army-hq-decision-room-open', 'army hq decision room handoff', { afterMs: 900 });
  if (!handoff) throw new Error('Army HQ Decision Room handoff did not click');
  if (handoffRoute === 'decision_room') {
    const decisionRoomHost = frame.locator('[data-testid="warroom-decision-room-host"]').first();
    if (!await decisionRoomHost.isVisible().catch(() => false)) {
      throw new Error('army hq decision-room handoff did not open Decision Room');
    }
    await snapshot(page, frame, faction, events, 'army-hq-decision-room-handoff', { handoff, handoffRoute });
    await decisionRoomDeepDive(page, frame, faction, events, 'decision-room-from-army-hq');
    await closeOpenSurface(frame);
    await closeOpenSurface(frame);
  }
  if (handoffRoute === 'desk') {
    const deskShell = frame.locator('[data-testid="president-desk-shell"]').first();
    await deskShell.waitFor({ state: 'visible', timeout: 5000 });
    if (await frame.locator('[data-testid="army-hq-modal"]').isVisible().catch(() => false)) {
      throw new Error('army hq desk handoff left Army HQ open');
    }
    await snapshot(page, frame, faction, events, 'army-hq-desk-handoff', { handoff, handoffRoute });
    const closedDesk = await clickTestId(frame, 'desk-close-overlay', 'close desk after army hq handoff', { afterMs: 500 });
    if (!closedDesk) throw new Error('Army HQ desk handoff did not expose the Desk field return');
  }
  return { opened, tabResults, corpsResults, handoff, handoffRoute };
}

async function dismissCommandBriefing(frame) {
  const banner = frame.locator('[data-testid="command-briefing-banner"]').first();
  if (!await banner.isVisible().catch(() => false)) return false;
  const dismissed = await clickTestId(frame, 'command-briefing-dismiss', 'dismiss command briefing', { afterMs: 350 });
  if (!dismissed) throw new Error('Visible Command Briefing could not be dismissed before map interaction');
  await banner.waitFor({ state: 'hidden', timeout: 5000 });
  return true;
}

function assertNewEventNoticeIdentity(events, eventNoticeId, label) {
  if (!eventNoticeId) throw new Error(`Historical event notice has no exact event identity (${label})`);
  const previous = events.find((event) => event?.eventNoticeId === eventNoticeId);
  if (previous) {
    throw new Error(`Duplicate historical event notice ${eventNoticeId} (${label}); first recorded as ${previous.label ?? 'unknown'}`);
  }
  return eventNoticeId;
}

async function drainVisibleEventNotices(page, frame, faction, events, label, settleMs = 1200, maxNotices = 8) {
  await sleep(settleMs);
  const handled = [];
  for (let i = 0; i < maxNotices; i += 1) {
    const notice = frame.locator('[data-testid="event-notice-acknowledge"]').first();
    if (!await notice.isVisible().catch(() => false)) break;
    const eventNoticeId = await notice.getAttribute('data-event-id').catch(() => null);
    assertNewEventNoticeIdentity(events, eventNoticeId, `${label} delayed ${i + 1}`);
    const clicked = await clickTestId(
      frame,
      'event-notice-acknowledge',
      `${label} acknowledge delayed event notice ${i + 1}`,
      { afterMs: 700 },
    );
    if (!clicked) throw new Error(`Visible delayed event notice could not be acknowledged (${label})`);
    handled.push(i + 1);
    await snapshot(page, frame, faction, events, `${label}-event-notice-${i + 1}`, {
      handledAction: 'acknowledge-delayed-event-notice',
      eventNoticeId,
      noticeIndex: i + 1,
    });
  }
  if (handled.length === maxNotices
    && await frame.locator('[data-testid="event-notice-acknowledge"]').first().isVisible().catch(() => false)) {
    throw new Error(`Delayed event notice drain guard exhausted (${label})`);
  }
  return handled;
}

async function mapInteractionProbe(page, frame, faction, events, labelPrefix = 'map') {
  await clearOpenSurfaces(frame);
  const openedWarMap = await openExactWarMapRoute(frame, `${labelPrefix} exact War Map`, { afterMs: 2000 });
  if (!openedWarMap) throw new Error(`Required War Map route failed for ${labelPrefix}`);
  await drainVisibleEventNotices(page, frame, faction, events, `${labelPrefix}-map-settle`);
  await dismissCommandBriefing(frame);
  const mapState = await readState(frame).catch(() => null);
  const mapReady = await waitForTacticalMapReady(
    frame,
    mapState?.turn,
    (mapState?.locatedOwnedFormationCount ?? 0) > 0,
  );
  if (!mapReady) {
    const readiness = await tacticalMapReadinessDiagnostics(
      frame,
      mapState?.turn,
      (mapState?.locatedOwnedFormationCount ?? 0) > 0,
    );
    await snapshot(page, frame, faction, events, `${labelPrefix}-map-not-ready`, { readiness });
    throw new Error(`Tactical map did not render current-turn counters for ${labelPrefix}: ${JSON.stringify(readiness)}`);
  }
  const map = frame.locator('[data-testid="tactical-map"]').first();
  await map.press('Home');
  await sleep(1200);
  const canonicalMapReady = await waitForTacticalMapReady(
    frame,
    mapState?.turn,
    (mapState?.locatedOwnedFormationCount ?? 0) > 0,
  );
  if (!canonicalMapReady) throw new Error(`Tactical map did not restore the canonical campaign view for ${labelPrefix}`);
  const counters = await counterInfo(frame);
  await snapshot(page, frame, faction, events, `${labelPrefix}-overview`, {
    counters,
    formationAudit: await formationAudit(frame),
  });
  const clickResults = [];
  const verifiedCounterIds = new Set();
  const attemptedCounterIds = new Set();
  const initialCounterIds = (counters?.formationSample ?? []).map((counter) => counter.id).slice(0, 12);
  const targetCounterVerifications = initialCounterIds.length;
  if (targetCounterVerifications > 0) {
    for (
      let probeIndex = 0;
      probeIndex < Math.max(20, targetCounterVerifications * 3)
        && verifiedCounterIds.size < targetCounterVerifications;
      probeIndex += 1
    ) {
      const readyBeforeClick = await waitForTacticalMapReady(
        frame,
        mapState?.turn,
        (mapState?.locatedOwnedFormationCount ?? 0) > 0,
      );
      if (!readyBeforeClick) {
        const staleCounters = await counterInfo(frame).catch(() => null);
        const staleMap = await frame.locator('[data-testid="tactical-map"]').first().evaluate((node) => ({
          dataset: { ...node.dataset },
          rect: node.getBoundingClientRect().toJSON(),
        })).catch(() => null);
        throw new Error(`Tactical map counters became stale during ${labelPrefix}: ${JSON.stringify({ staleCounters, staleMap })}`);
      }
      const currentCounters = await counterInfo(frame);
      const currentFormationSample = currentCounters?.formationSample ?? [];
      const counter = currentFormationSample.find((candidate) => !attemptedCounterIds.has(candidate.id));
      if (!counter) break;
      attemptedCounterIds.add(counter.id);
      const counterLocator = frame.locator(`[data-awwv-formation-counter-id="${counter.id}"]`);
      if (await counterLocator.count() !== 1) {
        throw new Error(`Formation counter identity is not unique: ${counter.id}`);
      }
      await counterLocator.click({ timeout: 5000 });
      await sleep(550);
      const detail = frame.locator('[data-testid="formation-detail-panel"]');
      const detailVisible = await detail.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
      if (!detailVisible) {
        throw new Error(`Formation counter did not open detail: ${counter.id}`);
      }
      const openedFormationId = await detail.getAttribute('data-formation-id');
      if (openedFormationId !== counter.id) {
        throw new Error(`Formation counter opened the wrong detail: expected ${counter.id}, observed ${openedFormationId ?? 'none'}`);
      }
      clickResults.push({ id: counter.id, clicked: true, openedFormationId });
      verifiedCounterIds.add(counter.id);
      await snapshot(page, frame, faction, events, `${labelPrefix}-counter-${safeName(counter.id)}`, { counter });
      await clickTestId(frame, 'formation-detail-close', `close formation ${counter.id}`, { afterMs: 350 });
      await detail.waitFor({ state: 'hidden', timeout: 5000 });
      await sleep(1200);
    }
  }
  const counterCoverage = assessCounterVerificationCoverage(
    initialCounterIds,
    [...attemptedCounterIds],
    [...verifiedCounterIds],
    (mapState?.locatedOwnedFormationCount ?? 0) > 0,
  );
  await snapshot(page, frame, faction, events, `${labelPrefix}-counter-coverage`, { counterCoverage });
  if (!counterCoverage.ok) {
    throw new Error(`No exact formation counter could be verified: ${JSON.stringify(counterCoverage)}`);
  }
  const directionalMapBox = await map.boundingBox();
  if (!directionalMapBox) throw new Error(`Tactical map geometry unavailable for directional probes: ${labelPrefix}`);
  const positions = [
    { label: 'center', x: directionalMapBox.width * 0.50, y: directionalMapBox.height * 0.50 },
    { label: 'north-west', x: directionalMapBox.width * 0.28, y: directionalMapBox.height * 0.28 },
    { label: 'north-east', x: directionalMapBox.width * 0.72, y: directionalMapBox.height * 0.28 },
    { label: 'south-west', x: directionalMapBox.width * 0.28, y: directionalMapBox.height * 0.72 },
    { label: 'south-east', x: directionalMapBox.width * 0.72, y: directionalMapBox.height * 0.72 },
  ];
  const selectionPanel = frame.locator('[data-testid="selection-panel"]').first();
  const directionalFormationDetail = frame.locator('[data-testid="formation-detail-panel"]').first();
  const directionalSectorPanel = frame.locator('[data-testid="corps-front-panel"]').first();
  const directionalCorpsPanel = frame.locator('[data-testid="corps-detail-panel"]').first();
  let successfulDirectionalSelections = 0;
  for (const pos of positions) {
    if (await selectionPanel.isVisible().catch(() => false)) {
      await selectionPanel.locator('button').first().click({ timeout: 5000 });
      await selectionPanel.waitFor({ state: 'hidden', timeout: 5000 });
    }
    if (await directionalFormationDetail.isVisible().catch(() => false)) {
      await clickTestId(frame, 'formation-detail-close', `close directional formation before ${pos.label}`, { afterMs: 250 });
      await directionalFormationDetail.waitFor({ state: 'hidden', timeout: 5000 });
    }
    if (await directionalSectorPanel.isVisible().catch(() => false)) {
      await directionalSectorPanel.locator('button').first().click({ timeout: 5000 });
      await directionalSectorPanel.waitFor({ state: 'hidden', timeout: 5000 });
    }
    if (await directionalCorpsPanel.isVisible().catch(() => false)) {
      await directionalCorpsPanel.locator('button').first().click({ timeout: 5000 });
      await directionalCorpsPanel.waitFor({ state: 'hidden', timeout: 5000 });
    }
    await map.click({ position: { x: pos.x, y: pos.y }, timeout: 5000 });
    try {
      await selectionPanel.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      if (await directionalFormationDetail.isVisible().catch(() => false)) {
        const openedFormationId = await directionalFormationDetail.getAttribute('data-formation-id');
        clickResults.push({
          label: pos.label,
          clicked: true,
          selected: 'formation',
          openedFormationId,
        });
        await snapshot(page, frame, faction, events, `${labelPrefix}-map-click-${pos.label}-formation`, {
          mapClick: pos,
          selected: 'formation',
          openedFormationId,
        });
        await clickTestId(frame, 'formation-detail-close', `close directional formation ${pos.label}`, { afterMs: 250 });
        await directionalFormationDetail.waitFor({ state: 'hidden', timeout: 5000 });
        continue;
      }
      if (await directionalSectorPanel.isVisible().catch(() => false)) {
        const openedSectorId = await directionalSectorPanel.getAttribute('data-sector-id');
        clickResults.push({
          label: pos.label,
          clicked: true,
          selected: 'sector',
          openedSectorId,
        });
        await snapshot(page, frame, faction, events, `${labelPrefix}-map-click-${pos.label}-sector`, {
          mapClick: pos,
          selected: 'sector',
          openedSectorId,
        });
        await directionalSectorPanel.locator('button').first().click({ timeout: 5000 });
        await directionalSectorPanel.waitFor({ state: 'hidden', timeout: 5000 });
        continue;
      }
      if (await directionalCorpsPanel.isVisible().catch(() => false)) {
        const openedCorpsText = compactText(await directionalCorpsPanel.innerText({ timeout: 5000 }), 300);
        clickResults.push({
          label: pos.label,
          clicked: true,
          selected: 'corps',
          openedCorpsText,
        });
        await snapshot(page, frame, faction, events, `${labelPrefix}-map-click-${pos.label}-corps`, {
          mapClick: pos,
          selected: 'corps',
          openedCorpsText,
        });
        await directionalCorpsPanel.locator('button').first().click({ timeout: 5000 });
        await directionalCorpsPanel.waitFor({ state: 'hidden', timeout: 5000 });
        continue;
      }
      clickResults.push({ label: pos.label, clicked: true, selected: false });
      await snapshot(page, frame, faction, events, `${labelPrefix}-map-click-${pos.label}-empty`, {
        mapClick: pos,
        selected: false,
      });
      continue;
    }
    const selectedText = compactText(await selectionPanel.innerText({ timeout: 5000 }), 600);
    if (!selectedText) {
      clickResults.push({ label: pos.label, clicked: true, selected: false });
      await snapshot(page, frame, faction, events, `${labelPrefix}-map-click-${pos.label}-empty`, {
        mapClick: pos,
        selected: false,
      });
      continue;
    }
    successfulDirectionalSelections += 1;
    clickResults.push({ label: pos.label, clicked: true, selected: true, selectedText });
    await sleep(550);
    await snapshot(page, frame, faction, events, `${labelPrefix}-map-click-${pos.label}`, { mapClick: pos, selectedText });
  }
  if (successfulDirectionalSelections === 0) {
    throw new Error(`Directional map probe selected no settlements: ${labelPrefix}`);
  }
  return clickResults;
}

async function pollFrameEvaluation(frame, evaluator, arg, timeoutMs = 5000, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  let lastResult = null;
  while (Date.now() <= deadline) {
    lastResult = await frame.evaluate(evaluator, arg);
    if (lastResult) return lastResult;
    await sleep(intervalMs);
  }
  throw new Error(`Frame DOM condition timed out after ${timeoutMs}ms; last result: ${JSON.stringify(lastResult)}`);
}

async function readMapChromeGeometry(frame) {
  return frame.evaluate(() => {
    const rectOf = (node) => {
      if (!(node instanceof HTMLElement)) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: Math.round(rect.left * 10) / 10,
        top: Math.round(rect.top * 10) / 10,
        right: Math.round(rect.right * 10) / 10,
        bottom: Math.round(rect.bottom * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
      };
    };
    const visibleWidth = (node) => {
      if (!(node instanceof HTMLElement)) return 0;
      const ownRect = node.getBoundingClientRect();
      let left = Math.max(0, ownRect.left);
      let right = Math.min(window.innerWidth, ownRect.right);
      let parent = node.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX)) {
          const rect = parent.getBoundingClientRect();
          left = Math.max(left, rect.left);
          right = Math.min(right, rect.right);
        }
        parent = parent.parentElement;
      }
      return Math.max(0, Math.round((right - left) * 10) / 10);
    };
    const describeBranchNode = (node) => {
      const rect = rectOf(node);
      const visible = visibleWidth(node);
      return {
        text: node?.textContent?.trim() ?? '',
        title: node instanceof HTMLElement ? node.title : '',
        ariaLabel: node instanceof HTMLElement ? node.getAttribute('aria-label') ?? '' : '',
        rect,
        clientWidth: node instanceof HTMLElement ? node.clientWidth : 0,
        scrollWidth: node instanceof HTMLElement ? node.scrollWidth : 0,
        visibleWidth: visible,
        visibleRatio: rect && rect.width > 0 ? Math.round((visible / rect.width) * 1000) / 1000 : 0,
      };
    };

    const oob = document.querySelector('[data-testid="oob-sidebar-scroll-region"]');
    const oobStyle = oob instanceof HTMLElement ? getComputedStyle(oob) : null;
    const oobOverflowingDescendants = oob instanceof HTMLElement
      ? Array.from(oob.querySelectorAll('*'))
        .filter((node) => node instanceof HTMLElement)
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            tag: node.tagName.toLowerCase(),
            testId: node.dataset.testid ?? null,
            className: typeof node.className === 'string' ? node.className.slice(0, 320) : '',
            text: node.textContent?.trim().slice(0, 180) ?? '',
            rect: rectOf(node),
            clientWidth: node.clientWidth,
            scrollWidth: node.scrollWidth,
          };
        })
        .filter((node) => node.scrollWidth > node.clientWidth + 2
          || (node.rect?.right ?? 0) > oob.getBoundingClientRect().right + 2)
        .slice(0, 24)
      : [];
    const situationContent = document.querySelector('[data-testid="situation-tab-content"]');
    const oobCorpsCards = oob instanceof HTMLElement
      ? Array.from(oob.querySelectorAll('[data-testid="oob-corps-card"]')).map(describeBranchNode)
      : [];
    const situationProse = Array.from(document.querySelectorAll('[data-oob-wrapping-prose="true"]')).map((node) => {
      const style = node instanceof HTMLElement ? getComputedStyle(node) : null;
      const geometry = describeBranchNode(node);
      return {
        ...geometry,
        whiteSpace: style?.whiteSpace ?? null,
        overflowWrap: style?.overflowWrap ?? null,
      };
    });
    const bottomStatus = document.querySelector('[data-testid="bottom-status-strip"]');
    const branchRow = document.querySelector('[data-testid="branch-tag-badge-row"]');
    const chips = branchRow
      ? Array.from(branchRow.querySelectorAll('[data-testid="branch-tag-chip"]')).map(describeBranchNode)
      : [];
    const remainder = branchRow?.querySelector('[data-testid="branch-tag-remainder"]') ?? null;
    const compact = branchRow?.querySelector('[data-testid="branch-tag-compact"]') ?? null;
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      },
      bottomStatus: bottomStatus instanceof HTMLElement ? {
        present: true,
        ...describeBranchNode(bottomStatus),
      } : { present: false },
      oob: oob instanceof HTMLElement ? {
        present: true,
        rect: rectOf(oob),
        overflowX: oobStyle?.overflowX ?? null,
        overflowY: oobStyle?.overflowY ?? null,
        clientWidth: oob.clientWidth,
        scrollWidth: oob.scrollWidth,
        overflowingDescendants: oobOverflowingDescendants,
        oobCorpsCards,
        situationContent: situationContent instanceof HTMLElement ? {
          ...describeBranchNode(situationContent),
          clientWidth: situationContent.clientWidth,
          scrollWidth: situationContent.scrollWidth,
        } : null,
        situationProse,
      } : { present: false },
      branchPaths: branchRow instanceof HTMLElement ? {
        present: true,
        row: describeBranchNode(branchRow),
        chips,
        remainder: remainder ? describeBranchNode(remainder) : null,
        compact: compact ? describeBranchNode(compact) : null,
      } : { present: false },
    };
  });
}

function assertMapChromeGeometry(label, geometry) {
  if (geometry.document.scrollWidth > geometry.document.clientWidth + 2) {
    throw new Error(`Map document has horizontal overflow at ${label}: ${JSON.stringify(geometry.document)}`);
  }
  if (geometry.bottomStatus.present && (
    geometry.bottomStatus.scrollWidth > geometry.bottomStatus.clientWidth + 2
    || geometry.bottomStatus.visibleRatio < 0.98
  )) {
    throw new Error(`Bottom status strip has local or ancestor horizontal overflow at ${label}: ${JSON.stringify(geometry.bottomStatus)}`);
  }
  if (geometry.oob.present) {
    if (geometry.oob.overflowX !== 'hidden') {
      throw new Error(`Command OOB horizontal overflow is not suppressed at ${label}: ${JSON.stringify(geometry.oob)}`);
    }
    if (!geometry.oob.rect || geometry.oob.rect.width <= 0 || geometry.oob.clientWidth <= 0) {
      throw new Error(`Command OOB scroll region has no visible geometry at ${label}: ${JSON.stringify(geometry.oob)}`);
    }
    if (geometry.oob.scrollWidth > geometry.oob.clientWidth + 2) {
      throw new Error(`Command OOB content exceeds its horizontal owner at ${label}: ${JSON.stringify(geometry.oob)}`);
    }
    if (!geometry.oob.situationContent || geometry.oob.situationContent.visibleRatio < 0.98
      || geometry.oob.situationContent.scrollWidth > geometry.oob.situationContent.clientWidth + 2) {
      throw new Error(`Situation content is clipped instead of wrapped at ${label}: ${JSON.stringify(geometry.oob.situationContent)}`);
    }
    if (geometry.oob.situationProse.length < 1) {
      throw new Error(`Situation wrapping proof exposed no representative prose at ${label}`);
    }
    for (const prose of geometry.oob.situationProse) {
      if (prose.visibleRatio < 0.98 || prose.scrollWidth > prose.clientWidth + 2 || prose.overflowWrap !== 'anywhere') {
        throw new Error(`Situation prose was inaccessible or unwrapped at ${label}: ${JSON.stringify(prose)}`);
      }
    }
    for (const corpsCard of geometry.oob.oobCorpsCards) {
      if (!corpsCard.rect || corpsCard.rect.width <= 0 || corpsCard.visibleRatio < 0.98
        || corpsCard.scrollWidth > corpsCard.clientWidth + 2) {
        throw new Error(`OOB corps card content exceeds its rendered owner at ${label}: ${JSON.stringify(corpsCard)}`);
      }
    }
  }
  if (geometry.branchPaths.present) {
    const compact = geometry.branchPaths.compact;
    if (compact && geometry.branchPaths.chips.length !== 0) {
      throw new Error(`Branch-path compact control retained full chips at ${label}: ${JSON.stringify(geometry.branchPaths)}`);
    }
    if (!compact && (geometry.branchPaths.chips.length < 1 || geometry.branchPaths.chips.length > 2)) {
      throw new Error(`Branch-path bounded chip count failed at ${label}: ${JSON.stringify(geometry.branchPaths)}`);
    }
    for (const chip of geometry.branchPaths.chips) {
      if (!chip.text || chip.title !== chip.text) {
        throw new Error(`Branch-path semantic label/title mismatch at ${label}: ${JSON.stringify(chip)}`);
      }
      if (!chip.rect || chip.rect.width < 48 || chip.visibleRatio < 0.98 || chip.scrollWidth > chip.clientWidth + 1) {
        throw new Error(`Branch-path chip was visually clipped at ${label}: ${JSON.stringify(chip)}`);
      }
    }
    if (geometry.branchPaths.row.visibleRatio < 0.98
      || geometry.branchPaths.row.scrollWidth > geometry.branchPaths.row.clientWidth + 1) {
      throw new Error(`Branch-path row was clipped by an ancestor at ${label}: ${JSON.stringify(geometry.branchPaths.row)}`);
    }
    if (compact && (!compact.ariaLabel || !compact.title || !compact.rect || compact.rect.width < 24
      || compact.visibleRatio < 0.98 || compact.scrollWidth > compact.clientWidth + 1)) {
      throw new Error(`Branch-path compact control was visually clipped at ${label}: ${JSON.stringify(compact)}`);
    }
    const remainder = geometry.branchPaths.remainder;
    if (remainder && (!remainder.rect || remainder.rect.width < 24 || remainder.visibleRatio < 0.98)) {
      throw new Error(`Branch-path remainder control was visually clipped at ${label}: ${JSON.stringify(remainder)}`);
    }
  }
  return geometry;
}

async function exerciseFormationStackPicker(page, frame, faction, events, labelPrefix = 'stack-picker') {
  await dismissCommandBriefing(frame);
  const tacticalMap = frame.locator('[data-testid="tactical-map"]').first();
  const expectedTurnRaw = await tacticalMap.getAttribute('data-map-state-turn');
  const expectedTurn = expectedTurnRaw == null ? null : Number(expectedTurnRaw);
  await waitForTacticalMapReady(frame, Number.isFinite(expectedTurn) ? expectedTurn : null, true, 10000);
  const badges = frame.locator('[data-awwv-dom-formation-counters="true"] [data-awwv-formation-stack-osid]:visible');
  const badgeRows = await badges.evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const inViewport = rect.width > 0
      && rect.height > 0
      && centerX >= 0
      && centerY >= 0
      && centerX < window.innerWidth
      && centerY < window.innerHeight;
    const topmost = inViewport ? document.elementFromPoint(centerX, centerY) : null;
    return {
      osid: node.getAttribute('data-awwv-formation-stack-osid') ?? '',
      ariaLabel: node.getAttribute('aria-label') ?? '',
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      inViewport,
      hitTestable: Boolean(topmost && (topmost === node || node.contains(topmost))),
      topmost: topmost instanceof HTMLElement
        ? {
            tag: topmost.tagName.toLowerCase(),
            testId: topmost.dataset.testid ?? null,
            stackOsid: topmost.dataset.awwvFormationStackOsid ?? null,
            className: topmost.className,
          }
        : null,
    };
  }).sort((left, right) => left.osid < right.osid ? -1 : left.osid > right.osid ? 1 : 0));
  const badgeCount = badgeRows.length;
  if (badgeCount < 1) {
    const notApplicableReceipt = {
      exercised: false,
      status: 'not-applicable',
      reason: 'no-visible-formation-stack-badge',
      badgeCount,
    };
    await snapshot(page, frame, faction, events, `${labelPrefix}-not-applicable`, { stackPickerProof: notApplicableReceipt });
    return notApplicableReceipt;
  }
  const selectedBadge = badgeRows.find((row) => row.hitTestable);
  if (!selectedBadge) {
    throw new Error(`No player-hit-testable formation stack badge was available for ${labelPrefix}: ${JSON.stringify(badgeRows)}`);
  }
  const stackOsid = selectedBadge.osid;
  if (!stackOsid) throw new Error(`Formation stack badge had no OSID for ${labelPrefix}`);
  const badge = frame.locator(
    `[data-awwv-dom-formation-counters="true"] [data-awwv-formation-stack-osid="${stackOsid}"]:visible`,
  );
  const currentBadgeCount = await badge.count();
  if (currentBadgeCount !== 1) {
    throw new Error(`Stack badge identity became unstable at ${stackOsid}: expected 1 visible badge, observed ${currentBadgeCount}`);
  }
  const readStackPickerClickDiagnostics = async () => frame.evaluate((expectedOsid) => {
    const node = document.querySelector(
      `[data-awwv-dom-formation-counters="true"] [data-awwv-formation-stack-osid="${CSS.escape(expectedOsid)}"]`,
    );
    const pickerPanel = document.querySelector('[data-stack-picker-panel="true"]');
    const rect = node?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : null;
    const centerY = rect ? rect.top + rect.height / 2 : null;
    const topmost = centerX != null && centerY != null ? document.elementFromPoint(centerX, centerY) : null;
    return {
      expandedStackOsid: pickerPanel ? expectedOsid : null,
      badgeConnected: node?.isConnected ?? false,
      badgeRect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      topmost: topmost instanceof HTMLElement
        ? {
            tag: topmost.tagName.toLowerCase(),
            testId: topmost.dataset.testid ?? null,
            stackOsid: topmost.dataset.awwvFormationStackOsid ?? null,
            className: topmost.className,
          }
        : null,
      pickerAttached: Boolean(pickerPanel),
      pickerVisible: Boolean(pickerPanel?.getClientRects().length),
      commandBriefingVisible: Boolean(document.querySelector('[data-testid="command-briefing-banner"]')?.getClientRects().length),
    };
  }, stackOsid);
  const stackPickerClickDiagnostics = {
    selectedBadge,
    before: await readStackPickerClickDiagnostics(),
    after: null,
  };
  await badge.click({ timeout: 5000 });
  try {
    await pollFrameEvaluation(frame, () => {
      const panel = document.querySelector('[data-stack-picker-panel="true"]');
      if (!(panel instanceof HTMLElement)) return false;
      const style = getComputedStyle(panel);
      const rect = panel.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) > 0
        && rect.width > 0
        && rect.height > 0
        && rect.right > 0
        && rect.bottom > 0
        && rect.left < window.innerWidth
        && rect.top < window.innerHeight;
    }, null);
  } catch (error) {
    stackPickerClickDiagnostics.after = await readStackPickerClickDiagnostics().catch((diagnosticError) => ({
      diagnosticError: String(diagnosticError?.message ?? diagnosticError),
    }));
    await snapshot(page, frame, faction, events, `${labelPrefix}-click-failed`, { stackPickerClickDiagnostics });
    throw new Error(`Formation stack badge click did not open ${stackOsid}: ${JSON.stringify(stackPickerClickDiagnostics)}; ${String(error?.message ?? error)}`);
  }
  stackPickerClickDiagnostics.after = await readStackPickerClickDiagnostics();
  const memberRows = await frame.evaluate(() => Array.from(document.querySelectorAll(
    '[data-stack-member-list="true"] button[data-stack-selection-id]:not([data-stack-selection-id^="enemy_contact:"])',
  )).map((node) => node.getAttribute('data-stack-selection-id') ?? '')
    .filter(Boolean)
    .sort((left, right) => left < right ? -1 : left > right ? 1 : 0));
  const memberCount = memberRows.length;
  if (memberCount < 1) throw new Error(`Formation stack picker exposed no exact friendly member at ${stackOsid}`);
  const expectedFormationId = memberRows[0];
  if (!expectedFormationId) throw new Error(`Formation stack member had no exact identity at ${stackOsid}`);
  const memberHitTest = await frame.evaluate((formationId) => {
    const node = document.querySelector(`[data-stack-selection-id="${CSS.escape(formationId)}"]`);
    if (!(node instanceof HTMLElement)) return null;
    const rect = node.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const topmost = document.elementFromPoint(centerX, centerY);
    return {
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      centerX,
      centerY,
      hitTestable: Boolean(topmost && (topmost === node || node.contains(topmost))),
      topmost: topmost instanceof HTMLElement
        ? {
            tag: topmost.tagName.toLowerCase(),
            selectionId: topmost.closest('[data-stack-selection-id]')?.getAttribute('data-stack-selection-id') ?? null,
          }
        : null,
    };
  }, expectedFormationId);
  if (!memberHitTest?.hitTestable) {
    throw new Error(`Exact stack member was not player-hit-testable: ${expectedFormationId}; ${JSON.stringify(memberHitTest)}`);
  }
  const frameElementForClick = await frame.frameElement();
  const frameElementRect = await frameElementForClick.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  await snapshot(page, frame, faction, events, `${labelPrefix}-open`, {
    stackOsid,
    badgeAriaLabel: selectedBadge.ariaLabel,
    badgeCount,
    memberCount,
    expectedFormationId,
    memberHitTest,
    frameElementRect,
    stackPickerClickDiagnostics,
  });
  await page.mouse.click(
    frameElementRect.x + memberHitTest.centerX,
    frameElementRect.y + memberHitTest.centerY,
  );
  const frameUrlBeforeTrace = frame.url();
  let stackFormationDetailTrace;
  try {
    stackFormationDetailTrace = await frame.evaluate(async ({ formationId, delays }) => {
      const startedAt = performance.now();
      const read = () => {
        const node = document.querySelector(
          `[data-testid="formation-detail-panel"][data-formation-id="${CSS.escape(formationId)}"]`,
        );
        const style = node ? getComputedStyle(node) : null;
        const rect = node?.getBoundingClientRect();
        return {
          elapsedMs: Math.round((performance.now() - startedAt) * 10) / 10,
          selectedFormationId: node?.getAttribute('data-formation-id') ?? null,
          expandedStackOsid: document.querySelector('[data-stack-picker-panel="true"]') ? 'open' : null,
          owners: {
            operations: Boolean(document.querySelector('[data-testid="operations-panel"]')),
            armyHQ: Boolean(document.querySelector('[data-testid="army-hq-modal"]')),
            codex: Boolean(document.querySelector('[data-testid="codex-modal"]')),
            chronicle: Boolean(document.querySelector('[data-testid="chronicle-modal"]')),
          },
          connected: node?.isConnected ?? false,
          rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
          style: style ? {
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            transform: style.transform,
            animationName: style.animationName,
            animationPlayState: style.animationPlayState,
          } : null,
          animations: node?.getAnimations().map((animation) => ({
            playState: animation.playState,
            currentTime: animation.currentTime,
          })) ?? [],
          offsetParent: node?.offsetParent?.tagName ?? null,
        };
      };
      const samples = [];
      for (const delay of delays) {
        const remaining = delay - (performance.now() - startedAt);
        if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
        samples.push(read());
      }
      return { performanceTimeOrigin: performance.timeOrigin, samples };
    }, { formationId: expectedFormationId, delays: [0, 16, 100, 350, 1000] });
  } catch (error) {
    throw new Error(`Stack picker frame became unstable after member selection: ${String(error?.message ?? error)}`);
  }
  const frameElement = await frame.frameElement();
  const embeddingFrame = await frameElement.evaluate((node) => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return {
      tag: node.tagName.toLowerCase(),
      src: node.getAttribute('src'),
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    };
  });
  const frameStability = {
    frameUrlBeforeTrace,
    frameUrlAfterTrace: frame.url(),
    detached: frame.isDetached(),
    embeddingFrame,
  };
  await pollFrameEvaluation(frame, (formationId) => Boolean(document.querySelector(
    `[data-testid="formation-detail-panel"][data-formation-id="${CSS.escape(formationId)}"]`,
  )), expectedFormationId);
  const detailVisible = await frame.evaluate((formationId) => {
    const node = document.querySelector(
      `[data-testid="formation-detail-panel"][data-formation-id="${CSS.escape(formationId)}"]`,
    );
    if (!(node instanceof HTMLElement)) return false;
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity) > 0
      && rect.width > 0
      && rect.height > 0;
  }, expectedFormationId);
  if (!detailVisible) {
    await sleep(4000);
    const finalTraceSample = await frame.evaluate((formationId) => {
      const node = document.querySelector(
        `[data-testid="formation-detail-panel"][data-formation-id="${CSS.escape(formationId)}"]`,
      );
      if (!(node instanceof HTMLElement)) return { elapsedMs: 5000, missing: true };
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return {
        elapsedMs: 5000,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        style: {
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          transform: style.transform,
          animationName: style.animationName,
          animationPlayState: style.animationPlayState,
        },
        animations: node.getAnimations().map((animation) => ({
          playState: animation.playState,
          currentTime: animation.currentTime,
        })),
      };
    }, expectedFormationId);
    stackFormationDetailTrace.samples.push(finalTraceSample);
    const stackFormationDetailVisibilityDiagnostics = await frame.evaluate((formationId) => {
      const node = document.querySelector(
        `[data-testid="formation-detail-panel"][data-formation-id="${CSS.escape(formationId)}"]`,
      );
      if (!(node instanceof HTMLElement)) return { detail: null, hiddenAncestors: [], ancestors: [], missing: true };
      const describe = (element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || null,
          className: typeof element.className === 'string' ? element.className : null,
          testId: element.getAttribute('data-testid'),
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          overflow: style.overflow,
          position: style.position,
          animationName: style.animationName,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        };
      };
      const ancestors = [];
      let current = node.parentElement;
      while (current) {
        ancestors.push(describe(current));
        current = current.parentElement;
      }
      return {
        detail: describe(node),
        hiddenAncestors: ancestors.filter((entry) =>
          entry.display === 'none'
          || entry.visibility === 'hidden'
          || Number(entry.opacity) === 0
          || entry.rect.width === 0
          || entry.rect.height === 0),
        ancestors,
      };
    }, expectedFormationId);
    await snapshot(page, frame, faction, events, `${labelPrefix}-detail-hidden`, {
      stackOsid,
      expectedFormationId,
      stackFormationDetailTrace,
      frameStability,
      stackFormationDetailVisibilityDiagnostics,
    });
    throw new Error(`Stack picker formation detail remained hidden: ${JSON.stringify(stackFormationDetailVisibilityDiagnostics)}`);
  }
  const openedFormationId = await frame.evaluate((formationId) => document.querySelector(
    `[data-testid="formation-detail-panel"][data-formation-id="${CSS.escape(formationId)}"]`,
  )?.getAttribute('data-formation-id') ?? null, expectedFormationId);
  if (openedFormationId !== expectedFormationId) {
    throw new Error(`Stack picker selected the wrong formation: expected ${expectedFormationId}, observed ${openedFormationId ?? 'none'}`);
  }
  await snapshot(page, frame, faction, events, `${labelPrefix}-exact-member`, {
    stackOsid,
    expectedFormationId,
    openedFormationId,
    stackFormationDetailTrace,
    frameStability,
  });
  const detailPanel = frame.locator(
    `[data-testid="formation-detail-panel"][data-formation-id="${expectedFormationId}"]`,
  ).first();
  const detailClose = detailPanel.locator('[data-testid="formation-detail-close"]').first();
  await detailClose.waitFor({ state: 'visible', timeout: 5000 });
  await detailClose.click({ timeout: 5000 });
  await detailPanel.waitFor({ state: 'detached', timeout: 5000 });
  return { stackOsid, badgeAriaLabel: selectedBadge.ariaLabel, badgeCount, memberCount, expectedFormationId, openedFormationId };
}

async function warroomRouteTour(page, frame, faction, events) {
  await clearOpenSurfaces(frame);
  await ensureWarroom(frame, 'route tour');
  const routes = [
    { label: 'president-desk', routeId: 'president-desk', expectedSelector: '[data-testid="president-desk-shell"]', drillTestId: 'desk-action-army-hq', drillExpectedSelector: '[data-testid="army-hq-modal"]' },
    { label: 'command-surface', routeId: 'command-surface', expectedSelector: '[data-testid="command-card-strip"]' },
    { label: 'diplomacy', routeId: 'diplomacy', expectedSelector: '[data-testid="diplomacy-panel"]' },
    { label: 'intelligence', routeId: 'intelligence', expectedSelector: '[data-testid="warroom-overlay-intelligence"]', drillTestId: 'warroom-overlay-intelligence-drill-in', drillExpectedSelector: '#army-hq-tabpanel-records' },
    { label: 'faction', routeId: 'faction', expectedSelector: '[data-testid="warroom-overlay-faction"]', drillTestId: 'warroom-overlay-faction-drill-in', drillExpectedSelector: '#army-hq-tabpanel-summary' },
    { label: 'chronicle-route', routeId: 'chronicle', expectedSelector: '[data-testid="chronicle-overlay"]' },
    { label: 'war-map-route', routeId: 'war-map', expectedSelector: '[data-testid="tactical-map"]' },
  ];
  const results = [];
  for (const route of routes) {
    await clearOpenSurfaces(frame);
    const beforeImage = await page.screenshot({ fullPage: false }).catch(() => null);
    const beforeHash = beforeImage
      ? crypto.createHash('sha256').update(beforeImage).digest('hex')
      : null;
    const result = route.routeId
      ? { label: `route ${route.label}`, clicked: await openWarroomRoute(frame, route.routeId, `route ${route.label}`, { afterMs: 900 }) }
      : await clickAndMeasure(frame, route.pattern, `route ${route.label}`, { afterMs: 900 });
    results.push(result);
    if (result?.clicked) {
      const expectedRoot = frame.locator(route.expectedSelector).first();
      const reachedExpectedSurface = await expectedRoot.isVisible().catch(() => false);
      result.expectedSelector = route.expectedSelector;
      result.reachedExpectedSurface = reachedExpectedSurface;
      if (!reachedExpectedSurface) {
        throw new Error(`Warroom route reached the wrong surface: ${JSON.stringify(result)}`);
      }
    }
    if (result?.clicked && route.routeId === 'war-map') {
      const routeState = await readState(frame).catch(() => null);
      const mapReady = await waitForTacticalMapReady(
        frame,
        routeState?.turn,
        (routeState?.locatedOwnedFormationCount ?? 0) > 0,
      );
      if (!mapReady) throw new Error('War Map route did not reach a ready tactical map');
    }
    const routeEvent = await snapshot(page, frame, faction, events, `route-${route.label}`, { routeResult: result });
    routeEvent.routeVisualChanged = beforeHash != null
      && routeEvent.screenshotHash != null
      && beforeHash !== routeEvent.screenshotHash;
    if (result?.clicked && !routeEvent.routeVisualChanged) {
      throw new Error(`Warroom route produced no visual change: ${route.label}`);
    }
    if (!result?.clicked) throw new Error(`Warroom route failed: ${route.label}`);
    if (route.drillTestId) {
      const drillClicked = await clickTestId(frame, route.drillTestId, `route ${route.label} drill`, { afterMs: 700 });
      if (!drillClicked) throw new Error(`Warroom route drill failed: ${route.label}`);
      const drillRoot = frame.locator(route.drillExpectedSelector).first();
      const drillReachedExpectedSurface = await drillRoot.isVisible().catch(() => false);
      if (!drillReachedExpectedSurface) {
        throw new Error(`Warroom route drill reached the wrong surface: ${route.label}`);
      }
      await snapshot(page, frame, faction, events, `route-${route.label}-drill`, {
        drillTestId: route.drillTestId,
        drillExpectedSelector: route.drillExpectedSelector,
        drillReachedExpectedSurface,
      });
    }
    await closeOpenSurface(frame);
  }
  return results;
}

async function advanceModalProbe(page, frame, faction, events) {
  const clicked = await clickMatch(frame, /Advance|warroom-toolbar-advance|toolbar-route-advance/i, 'advance probe', { afterMs: 900 });
  if (!clicked) throw new Error('Required advance probe route failed');
  await snapshot(page, frame, faction, events, 'advance-modal-probe', { clicked });
  const reviewClicked = await clickAndMeasure(frame, /Review Priorities|Review Blockers|Open Review|Review/i, 'advance modal review', { afterMs: 900 });
  if (!reviewClicked.clicked || !reviewClicked.changed) throw new Error(`Required advance review route failed: ${JSON.stringify(reviewClicked)}`);
  await snapshot(page, frame, faction, events, 'advance-modal-review-probe', { reviewClicked });
  await closeOpenSurface(frame);
  await closeOpenSurface(frame);
  return { clicked, reviewClicked };
}

async function surfaceTour(page, frame, faction, events, options = {}) {
  const openedWarMap = await openExactWarMapRoute(frame, 'surface tour exact War Map', { afterMs: 2800 });
  if (!openedWarMap) throw new Error('Required War Map route failed for surface tour');
  const initialMapState = await readState(frame).catch(() => null);
  const initialMapReady = await waitForTacticalMapReady(
    frame,
    initialMapState?.turn,
    (initialMapState?.locatedOwnedFormationCount ?? 0) > 0,
  );
  if (!initialMapReady) throw new Error('Initial tactical map did not render current-turn counters');
  await snapshot(page, frame, faction, events, 'war-map', {
    counters: await counterInfo(frame),
    mapChromeGeometry: assertMapChromeGeometry('war-map', await readMapChromeGeometry(frame)),
  });

  const stackPickerProof = options.requireStackPickerProof === true
    ? await exerciseFormationStackPicker(page, frame, faction, events, `${options.proofLabelPrefix ?? 'final'}-stack-picker`)
    : null;

  await mapInteractionProbe(page, frame, faction, events, 'initial-map-probe');
  await clearOpenSurfaces(frame);

  const routeResults = await warroomRouteTour(page, frame, faction, events);
  const failedRoutes = routeResults.filter((result) => !result?.clicked);
  if (failedRoutes.length > 0) {
    throw new Error(`Warroom route tour failed: ${JSON.stringify(failedRoutes)}`);
  }

  const deskOpened = await openWarroomRoute(frame, 'president-desk', 'desk exact route', { afterMs: 900 });
  if (!deskOpened) throw new Error('President Desk exact route failed');
  await snapshot(page, frame, faction, events, 'presidents-desk');

  const commandSurfaceResult = await commandSurfaceDeepDive(page, frame, faction, events, {
    requireEmptyCommandCategoryProof: options.requireEmptyCommandCategoryProof === true,
    proofLabelPrefix: options.proofLabelPrefix,
  });
  await snapshot(page, frame, faction, events, 'command-surface-after-deep-dive', { commandSurfaceResult });

  const openedWarDirection = await clickTestId(frame, 'command-card-cat_war_direction', 'war direction card', { afterMs: 1100 })
    || await clickMatch(frame, /War Direction/i, 'war direction card fallback', { afterMs: 1100 });
  if (!openedWarDirection) throw new Error('Required War Direction route failed');
  await snapshot(page, frame, faction, events, 'decision-room-war-direction', { openedWarDirection });

  await decisionRoomDeepDive(page, frame, faction, events, 'decision-room-direct');

  const armyHqResults = await armyHqDeepDive(page, frame, faction, events);
  await snapshot(page, frame, faction, events, 'army-hq-after-deep-dive', { armyHqResults });

  await clearOpenSurfaces(frame);
  const restoredMapAfterArmyHq = await openExactWarMapRoute(
    frame,
    'restore exact War Map after Army HQ handoff',
    { afterMs: 1200 },
  );
  if (!restoredMapAfterArmyHq) {
    throw new Error(`Could not restore the field route after Army HQ ${armyHqResults.handoffRoute} handoff`);
  }
  const restoredMapState = await readState(frame).catch(() => null);
  const restoredMapReady = await waitForTacticalMapReady(
    frame,
    restoredMapState?.turn,
    (restoredMapState?.locatedOwnedFormationCount ?? 0) > 0,
  );
  if (!restoredMapReady) {
    throw new Error(`War Map was not ready after Army HQ ${armyHqResults.handoffRoute} handoff`);
  }
  await frame.locator('[data-testid="toolbar-route-records"]').waitFor({ state: 'visible', timeout: 5000 });
  const recordsArmyHq = await clickTestId(frame, 'toolbar-route-records', 'direct Records route', { afterMs: 1100 });
  if (!recordsArmyHq) throw new Error('Direct Records route could not open Army HQ Records');
  await frame.locator('[data-testid="army-hq-modal"]').waitFor({ state: 'visible', timeout: 5000 });
  await frame.locator('#army-hq-tabpanel-records').waitFor({ state: 'visible', timeout: 5000 });
  await snapshot(page, frame, faction, events, 'records', { recordsArmyHq, expectedSelector: '#army-hq-tabpanel-records' });
  const closedRecordsArmyHq = await clickTestId(frame, 'army-hq-field-return', 'close records Army HQ', { afterMs: 600 });
  if (!closedRecordsArmyHq || await frame.locator('[data-testid="army-hq-modal"]').isVisible().catch(() => false)) {
    throw new Error('Records Army HQ did not close through its exact field return');
  }

  await frame.locator('[data-testid="toolbar-route-chronicle"]').waitFor({ state: 'visible', timeout: 5000 });
  const chronicleOpened = await clickTestId(frame, 'toolbar-route-chronicle', 'chronicle exact field route', { afterMs: 1100 });
  if (!chronicleOpened) throw new Error('Chronicle exact route did not click');
  await frame.locator('[data-testid="chronicle-overlay"]').waitFor({ state: 'visible', timeout: 5000 });
  await snapshot(page, frame, faction, events, 'chronicle', { chronicleOpened, expectedSelector: '[data-testid="chronicle-overlay"]' });
  await clickTestId(frame, 'chronicle-close', 'close chronicle', { afterMs: 400 });

  const codexOpened = await clickTestId(frame, 'toolbar-route-codex', 'codex exact route', { afterMs: 1100 });
  if (!codexOpened) throw new Error('Codex exact route did not click');
  await frame.locator('[data-testid="codex-panel"]').waitFor({ state: 'visible', timeout: 5000 });
  await snapshot(page, frame, faction, events, 'codex', { codexOpened, expectedSelector: '[data-testid="codex-panel"]' });
  await clickTestId(frame, 'codex-close', 'close codex', { afterMs: 400 });

  if (options.allowAdvanceProbe === true) {
    await advanceModalProbe(page, frame, faction, events);
  } else {
    await snapshot(page, frame, faction, events, 'advance-probe-skipped-final-state', {
      reason: 'final-state tour must not mutate the exact target turn',
    });
  }

  const returnedToDesk = await openWarroomRoute(frame, 'president-desk', 'desk return', { afterMs: 800 });
  if (!returnedToDesk) throw new Error('Required desk return route failed after surface tour');
  await clearOpenSurfaces(frame);
  const returnedToWarroom = await ensureWarroom(frame, 'surface tour return');
  if (!returnedToWarroom) throw new Error('Required Warroom return failed after surface tour');
  return { routeResults, commandSurfaceResult, armyHqResults, stackPickerProof };
}

function selectHistoricalPeacePlanResponse(planId, faction) {
  const historicalRejectingFaction = {
    vance_owen: 'RS',
    owen_stoltenberg: 'RBiH',
    contact_group: 'RS',
  }[planId];
  return historicalRejectingFaction === faction ? 'Reject Plan' : 'Accept Plan';
}

function shouldOpenAdvanceBlockerReview(text, pendingState) {
  const blockerCount = Object.values(pendingState?.blockerInventory ?? {})
    .reduce((sum, value) => sum + (Number.isFinite(value) ? Number(value) : 0), 0);
  return blockerCount > 0
    && /Advance blocked|Resolve .*pending|Resolve Before Advancing|Review Before Advance|Review Blockers/i.test(text);
}

async function handleCurrentSurface(page, frame, faction, events, options = {}) {
  const text = await bodyText(frame);
  const pendingState = await readState(frame).catch(() => null);
  const pendingEventId = pendingState?.pendingEventDecisionIds?.[0] ?? null;
  const aftermathClose = frame.locator('[data-testid="turn-aftermath-close"]').first();
  if (await aftermathClose.isVisible().catch(() => false)) {
    const clicked = await clickTestId(frame, 'turn-aftermath-close', 'close aftermath report', { afterMs: 1000 });
    await snapshot(page, frame, faction, events, 'handled-turn-aftermath', { handledAction: 'close-aftermath-report', clicked });
    return { handled: clicked, action: 'close-aftermath-report' };
  }
  const visibleEventNotice = frame.locator('[data-testid="event-notice-acknowledge"]').first();
  if (await visibleEventNotice.isVisible().catch(() => false)) {
    const eventNoticeId = await visibleEventNotice.getAttribute('data-event-id').catch(() => null);
    assertNewEventNoticeIdentity(events, eventNoticeId, 'current surface');
    const clicked = await clickTestId(frame, 'event-notice-acknowledge', 'acknowledge visible event notice', { afterMs: 900 });
    await snapshot(page, frame, faction, events, 'handled-event-notice', {
      handledAction: 'acknowledge-visible-event-notice',
      eventNoticeId,
      clicked,
    });
    return { handled: clicked, action: 'acknowledge-visible-event-notice' };
  }
  if (pendingState?.pendingPeacePlanId != null) {
    if (!/International Peace Proposal/i.test(await bodyText(frame))) {
      await clearOpenSurfaces(frame);
      const opened = await openDeskInboxItem(frame, 'peace_plan');
      if (!opened) throw new Error(`Pending peace plan did not open from Presidential Desk: ${pendingState.pendingPeacePlanId}`);
    }
    const before = await readState(frame);
    const responseLabel = selectHistoricalPeacePlanResponse(before?.pendingPeacePlanId, faction);
    await snapshot(page, frame, faction, events, 'peace-plan-before-response', { before, responseLabel });
    const clicked = await clickExactVisibleButton(frame, responseLabel, `${responseLabel.toLowerCase()} peace plan`, { afterMs: 1600 });
    if (!clicked) throw new Error(`Required peace plan ${responseLabel} control failed`);
    const after = await readState(frame);
    const cleared = before?.pendingPeacePlanId != null && after?.pendingPeacePlanId !== before.pendingPeacePlanId;
    const peacePlanReceipt = assertNewExactDecisionReceipt(
      'peace-plan',
      'planId',
      before.pendingPeacePlanId,
      before?.peacePlanDecisionReceipts ?? [],
      after?.peacePlanDecisionReceipts ?? [],
      { response: responseLabel === 'Reject Plan' ? 'rejected' : 'accepted', resolved: true },
    );
    await snapshot(page, frame, faction, events, 'peace-plan-after-response', {
      clicked,
      responseLabel,
      peacePlanReceipt,
      before,
      after,
      cleared,
    });
    if (!cleared) throw new Error(`Required peace plan remained pending after visible response: ${before?.pendingPeacePlanId ?? 'unknown'}`);
    if (responseLabel === 'Reject Plan' && after?.phase !== 'war') {
      throw new Error(`Rejected peace plan ended the campaign unexpectedly: ${before?.pendingPeacePlanId ?? 'unknown'}`);
    }
    return { handled: true, action: responseLabel === 'Reject Plan' ? 'peace-plan-reject' : 'peace-plan-accept' };
  }
  if ((pendingState?.pendingDayton ?? 0) > 0) {
    if (!await frame.getByRole('button', { name: 'Decline Talks', exact: true }).first().isVisible().catch(() => false)) {
      await clearOpenSurfaces(frame);
      await openDeskInboxItem(frame, 'dayton_negotiation');
    }
    await snapshot(page, frame, faction, events, 'dayton-before-response', { before: pendingState });
    const clicked = await clickExactVisibleButton(frame, 'Decline Talks', 'decline Dayton talks', { afterMs: 1600 });
    if (!clicked) throw new Error('Pending Dayton negotiation exposed no visible Decline Talks escape action');
    const after = await readState(frame);
    const cleared = (after?.pendingDayton ?? Number.POSITIVE_INFINITY) < pendingState.pendingDayton;
    await snapshot(page, frame, faction, events, 'dayton-after-response', { clicked, cleared, after });
    if (!cleared) throw new Error('Pending Dayton negotiation remained after visible response');
    return { handled: true, action: 'dayton-decline-talks' };
  }
  if (pendingEventId) {
    const responseRail = frame.locator('[data-testid="event-decision-response-rail"]').first();
    const responseControl = frame.locator('[data-testid="event-decision-response"]').first();
    let responsePresented = await responseControl.isVisible().catch(() => false)
      ? await frame.locator('[data-testid="event-decision-response"]').count().catch(() => 0)
      : 0;
    if (responsePresented === 0) {
      const openedFromAftermath = await clickTestId(
        frame,
        `turn-aftermath-action-event:${pendingEventId}`,
        `pending event ${pendingEventId} aftermath action`,
        { afterMs: 900 },
      );
      if (openedFromAftermath) {
        responsePresented = await responseControl
          .waitFor({ state: 'visible', timeout: 5000 })
          .then(() => frame.locator('[data-testid="event-decision-response"]').count())
          .catch(() => 0);
      }
    }
    const responseRailMounted = responsePresented === 0
      ? await responseRail.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)
      : false;
    if (responsePresented === 0 && responseRailMounted) {
      await responseControl.waitFor({ state: 'visible', timeout: 5000 });
      responsePresented = await frame.locator('[data-testid="event-decision-response"]').count().catch(() => 0);
    }
    if (responsePresented === 0) {
      let eventMountedDuringClose = false;
      try {
        await clearOpenSurfaces(frame);
      } catch (error) {
        if (error?.message !== 'required-event-decision') throw error;
        eventMountedDuringClose = true;
        await responseControl.waitFor({ state: 'visible', timeout: 5000 });
      }
      if (!eventMountedDuringClose) {
        const openedPendingEvent = await openPendingEventDecisionFromDesk(frame, pendingEventId);
        if (!openedPendingEvent) throw new Error(`Required event decision route failed: ${pendingEventId}`);
        await responseControl.waitFor({ state: 'visible', timeout: 5000 });
      }
      responsePresented = await frame.locator('[data-testid="event-decision-response"]').count().catch(() => 0);
    }
    if (responsePresented === 0) throw new Error(`Required event decision control was not visible: ${pendingEventId}`);
    const responseEventId = resolveVisibleEventDecisionId(
      pendingEventId,
      await responseRail.getAttribute('data-event-id').catch(() => null),
    );
    if (!responseEventId) throw new Error('Visible event decision has no exact identity');
    if (!(pendingState?.pendingEventDecisionIds ?? []).includes(responseEventId)) {
      throw new Error(`Visible event decision identity is not pending: ${responseEventId}`);
    }
    const responseLabel = (await responseControl.getAttribute('aria-label').catch(() => null))
      || (await responseControl.getAttribute('title').catch(() => null))
      || (await responseControl.innerText({ timeout: 5000 }).catch(() => ''));
    await snapshot(page, frame, faction, events, 'strategic-pending-event-before-response', {
      pendingEventId: responseEventId,
      responsePresented,
      responseLabel,
    });
    const responded = responsePresented > 0
      ? await clickTestId(frame, 'event-decision-response', `pending event ${responseEventId} response`, { afterMs: 1200 })
      : false;
    if (!responded) throw new Error(`Required event decision response failed: ${responseEventId}`);
    const after = await readState(frame).catch(() => null);
    const cleared = responded && !(after?.pendingEventDecisionIds ?? []).includes(responseEventId);
    const decisionReceipt = assertExactEventDecisionReceipt(
      responseEventId,
      pendingState?.eventDecisionReceipts ?? [],
      after?.eventDecisionReceipts ?? [],
    );
    await snapshot(page, frame, faction, events, 'strategic-pending-event-after-response', {
      pendingEventId: responseEventId,
      responseLabel,
      responded,
      cleared,
      decisionReceipt,
      after,
    });
    if (!cleared) throw new Error(`Required event decision remained pending after visible response: ${responseEventId}`);
    return { handled: cleared, action: `event-ui:${responseEventId}` };
  }
  if ((pendingState?.pendingCounterOffers ?? 0) > 0) {
    const counterOfferId = pendingState.pendingCounterOfferIds?.[0] ?? null;
    if (!counterOfferId) throw new Error('Pending counter-offer has no exact identity');
    await clearOpenSurfaces(frame);
    const openedCommandSurface = await openCommandSurfaceFromWarroom(frame, `counter-offer ${counterOfferId}`);
    if (!openedCommandSurface) throw new Error(`Pending counter-offer could not open Decision Room: ${counterOfferId}`);
    const openedCategory = await clickTestId(
      frame,
      'command-card-cat_diplomacy',
      `counter-offer ${counterOfferId} diplomacy category`,
      { afterMs: 800 },
    );
    if (!openedCategory) throw new Error(`Pending counter-offer diplomacy category did not open: ${counterOfferId}`);
    const card = frame.locator(
      `[data-testid="decision-room-priority-card-counter-offer:${counterOfferId}"]`,
    ).first();
    await card.waitFor({ state: 'visible', timeout: 5000 });
    const dossier = card.getByRole('button', { name: 'Dossier', exact: true }).first();
    await dossier.click({ timeout: 5000 });
    await sleep(700);
    await snapshot(page, frame, faction, events, 'counter-offer-before-response', {
      counterOfferId,
      before: pendingState,
    });
    const submitted = await clickExactVisibleButton(
      frame,
      'Submit as counter-proposal',
      `submit counter-offer response ${counterOfferId}`,
      { afterMs: 1200 },
    );
    if (!submitted) throw new Error(`Pending counter-offer exposed no exact submit action: ${counterOfferId}`);
    const after = await readState(frame);
    const cleared = !(after?.pendingCounterOfferIds ?? []).includes(counterOfferId);
    await snapshot(page, frame, faction, events, 'counter-offer-after-response', {
      counterOfferId,
      submitted,
      cleared,
      after,
    });
    if (!cleared) throw new Error(`Pending counter-offer remained pending after visible response: ${counterOfferId}`);
    return { handled: true, action: `counter-offer-submit:${counterOfferId}` };
  }
  const qaProposal = selectProposalForQa(pendingState?.pendingProposals ?? [], strategicRun);
  if (qaProposal) {
    await snapshot(page, frame, faction, events, 'strategic-proposal-before-accept', { before: pendingState });
    const proposal = await acceptStrategicProposalThroughUi(frame, qaProposal, {
      requireOrdinaryProposalDossierTruth: faction === 'RS',
      onDossierOpen: (details) => snapshot(
        page,
        frame,
        faction,
        events,
        'strategic-proposal-dossier-open',
        { before: pendingState, ...details },
      ),
      onFieldPlanOpen: (details) => snapshot(page, frame, faction, events, 'historical-operation-map-focus', details),
      onFieldPlanReturn: (details) => snapshot(page, frame, faction, events, 'historical-operation-dossier-return', details),
    });
    await sleep(1200);
    const after = await readState(frame).catch(() => null);
    const cleared = proposal.handled
      && (after?.unresolvedProposalCount ?? Number.POSITIVE_INFINITY)
        < (pendingState?.unresolvedProposalCount ?? 0);
    const proposalReceipt = assertExactProposalResolution(
      proposal.proposalId,
      pendingState?.proposalRecords ?? [],
      after?.proposalRecords ?? [],
    );
    await snapshot(page, frame, faction, events, 'strategic-proposal-after-accept', { proposal, proposalReceipt, after, cleared });
    if (!cleared) throw new Error(`Required proposal remained pending after visible response: ${proposal.proposalId}`);
    return { handled: cleared, action: `strategic-proposal:${proposal.proposedAction ?? 'unknown'}` };
  }
  if ((pendingState?.reserveRequests ?? 0) > 0) {
    const requestId = pendingState.pendingReserveRequestIds?.[0] ?? null;
    if (!requestId) throw new Error('Pending reserve request has no exact identity');
    await snapshot(page, frame, faction, events, 'reserve-request-before-route', {
      requestId,
      pendingState,
      startingSurfaceText: compactText(text, 2600),
    });
    const aftermathActionTestId = `turn-aftermath-action-reserve:${requestId}`;
    const reserveModal = frame.locator('[data-testid="reserve-request-modal"]').first();
    let routedThroughVisibleRequest = await reserveModal.isVisible().catch(() => false);
    if (!routedThroughVisibleRequest) {
      const openedFromAftermath = await clickTestId(
        frame,
        aftermathActionTestId,
        `reserve request ${requestId} aftermath action`,
        { afterMs: 700 },
      );
      if (openedFromAftermath) {
        routedThroughVisibleRequest = await reserveModal
          .waitFor({ state: 'visible', timeout: 5000 })
          .then(() => true)
          .catch(() => false);
      }
    }
    if (!routedThroughVisibleRequest) {
      await clearOpenSurfaces(frame);
      const openedFromDesk = await openDeskInboxItem(
        frame,
        'reserve_request',
        `reserve:${requestId}`,
      );
      if (openedFromDesk) {
        routedThroughVisibleRequest = await reserveModal
          .waitFor({ state: 'visible', timeout: 5000 })
          .then(() => true)
          .catch(() => false);
      }
    }
    if (routedThroughVisibleRequest) {
      const modalRequestId = await reserveModal.getAttribute('data-request-id');
      if (modalRequestId !== requestId) {
        throw new Error(`Reserve request modal identity mismatch: expected ${requestId}, received ${modalRequestId ?? 'none'}`);
      }
      await snapshot(page, frame, faction, events, 'reserve-request-modal', { requestId, before: pendingState });
      const reviewedSuggested = await clickTestId(
        frame,
        'reserve-request-review-suggested',
        `reserve request ${requestId} suggested formation`,
        { afterMs: 900 },
      );
      if (!reviewedSuggested) {
        const declined = await clickTestId(frame, 'reserve-request-decline', `decline reserve request ${requestId}`, { afterMs: 1200 });
        if (!declined) throw new Error(`Reserve request exposed neither a suggested formation nor a decline action: ${requestId}`);
        const afterDecline = await readState(frame);
        const clearedByDecline = !(afterDecline?.pendingReserveRequestIds ?? []).includes(requestId);
        const reserveReceipt = assertNewExactDecisionReceipt(
          'reserve',
          'requestId',
          requestId,
          pendingState?.reserveDecisionReceipts ?? [],
          afterDecline?.reserveDecisionReceipts ?? [],
          { faction, outcome: 'declined', decidedBy: 'player' },
        );
        await snapshot(page, frame, faction, events, 'reserve-request-after-decline', {
          requestId,
          declined,
          cleared: clearedByDecline,
          reserveReceipt,
          after: afterDecline,
        });
        if (!clearedByDecline) throw new Error(`Declined reserve request remained pending: ${requestId}`);
        return { handled: true, action: `reserve-decline:${requestId}` };
      }
      const host = frame.locator('[data-testid="warroom-decision-room-host"]').first();
      await host.waitFor({ state: 'visible', timeout: 5000 });
    } else {
      await clearOpenSurfaces(frame);
      const openedCommandSurface = await openCommandSurfaceFromWarroom(frame, `reserve request ${requestId}`);
      if (!openedCommandSurface) throw new Error(`Pending reserve request could not open Decision Room: ${requestId}`);
      const openedCategory = await clickTestId(frame, 'command-card-cat_command', `reserve request ${requestId} category`, { afterMs: 800 });
      if (!openedCategory) throw new Error(`Pending reserve request command category did not open: ${requestId}`);
    }
    const card = frame.locator(`[data-testid="decision-room-priority-card-command:elite-deploy:${requestId}"]`).first();
    await card.waitFor({ state: 'visible', timeout: 5000 });
    const dossier = card.getByRole('button', { name: 'Dossier', exact: true }).first();
    await dossier.click({ timeout: 5000 });
    await sleep(700);
    await snapshot(page, frame, faction, events, 'reserve-request-before-response', { requestId, before: pendingState });
    const host = frame.locator('[data-testid="warroom-decision-room-host"]').first();
    const issued = await clickMatch(host, /^Issue\b|^Authorize\b/i, `reserve request ${requestId} issue`, { afterMs: 1200 });
    if (!issued) throw new Error(`Pending reserve request exposed no usable Issue action: ${requestId}`);
    const after = await readState(frame);
    const cleared = !(after?.pendingReserveRequestIds ?? []).includes(requestId);
    const reserveReceipt = assertNewExactDecisionReceipt(
      'reserve',
      'requestId',
      requestId,
      pendingState?.reserveDecisionReceipts ?? [],
      after?.reserveDecisionReceipts ?? [],
      { faction, outcome: 'accepted', decidedBy: 'player' },
    );
    await snapshot(page, frame, faction, events, 'reserve-request-after-response', {
      requestId,
      issued,
      cleared,
      reserveReceipt,
      after,
    });
    if (!cleared) throw new Error(`Pending reserve request remained after visible response: ${requestId}`);
    return { handled: true, action: `reserve-issue:${requestId}` };
  }
  if ((pendingState?.convoyDecisions ?? 0) > 0) {
    const convoyId = pendingState.pendingConvoyDecisionIds?.[0] ?? null;
    if (!convoyId) throw new Error('Pending convoy decision has no exact identity');
    const opened = await openDeskInboxItem(frame, 'convoy_decision', `convoy:${convoyId}`);
    if (!opened) throw new Error(`Pending convoy decision did not open from the Presidential Desk: ${convoyId}`);
    await snapshot(page, frame, faction, events, 'convoy-before-response', { convoyId, before: pendingState });
    const clicked = await clickExactVisibleButton(frame, 'Allow Convoy', `allow convoy ${convoyId}`, { afterMs: 1200 });
    if (!clicked) throw new Error(`Pending convoy decision exposed no exact Allow Convoy action: ${convoyId}`);
    const after = await readState(frame);
    const cleared = !(after?.pendingConvoyDecisionIds ?? []).includes(convoyId);
    const convoyReceipt = assertNewExactDecisionReceipt(
      'convoy',
      'id',
      convoyId,
      pendingState?.convoyDecisionReceipts ?? [],
      after?.convoyDecisionReceipts ?? [],
      { routeFaction: faction, decision: 'allow', decidedBy: 'player' },
    );
    await snapshot(page, frame, faction, events, 'convoy-after-response', {
      convoyId,
      clicked,
      cleared,
      convoyReceipt,
      after,
    });
    if (!cleared) throw new Error(`Pending convoy decision remained after visible response: ${convoyId}`);
    return { handled: true, action: `convoy-allow:${convoyId}` };
  }
  if ((pendingState?.pendingOfficerEvents ?? 0) > 0) {
    const officerMatter = pendingState.pendingOfficerMatterItems?.[0] ?? null;
    const officerEventId = officerMatter?.eventId ?? null;
    if (!officerEventId) throw new Error('Pending officer event has no exact identity');
    await clearOpenSurfaces(frame);
    const openedDeskItem = await openDeskInboxItem(frame, 'officer_event', officerMatter.inboxItemId);
    if (!openedDeskItem) {
      throw new Error(`Pending officer event exact desk item did not open: ${officerEventId} (${officerMatter.inboxItemId})`);
    }
    const responseLabel = officerResponseLabel(officerMatter);
    await snapshot(page, frame, faction, events, 'officer-event-before-acknowledge', {
      officerEventId,
      officerMatter,
      responseLabel,
      before: pendingState,
    });
    const responded = await clickExactVisibleButton(
      frame,
      responseLabel,
      `officer event ${officerEventId} ${responseLabel}`,
      { afterMs: 1200 },
    );
    if (!responded) throw new Error(`Pending officer event exposed no exact visible response: ${officerEventId}`);
    const expectedOfficerDecision = officerMatter.overrideAction === 'override-officer-interpretation'
      ? 'override_confirmed'
      : 'acknowledged';
    const { after, receipt: officerReceipt } = await waitForNewExactDecisionReceipt(
      frame,
      'officer',
      'eventId',
      officerEventId,
      pendingState?.officerDecisionReceipts ?? [],
      { faction, decision: expectedOfficerDecision },
    );
    const cleared = !(after?.pendingOfficerEventIds ?? []).includes(officerEventId)
      || (after?.pendingOfficerEvents ?? Number.POSITIVE_INFINITY) < pendingState.pendingOfficerEvents;
    await snapshot(page, frame, faction, events, 'officer-event-after-acknowledge', {
      officerEventId,
      responseLabel,
      responded,
      officerReceipt,
      cleared,
      after,
    });
    if (!cleared) throw new Error(`Pending officer event remained after visible acknowledgment: ${officerEventId}`);
    return { handled: true, action: `officer-acknowledge:${officerEventId}` };
  }
  const eventResponseCount = await frame.locator('[data-testid="event-decision-response"]').count().catch(() => 0);
  if (eventResponseCount > 0 || (/DECISION REQUIRED/i.test(text) && /PRESIDENTIAL RESPONSE/i.test(text))) {
    const responseRail = frame.locator('[data-testid="event-decision-response-rail"]').first();
    const responseEventId = resolveVisibleEventDecisionId(
      pendingEventId,
      await responseRail.getAttribute('data-event-id').catch(() => null),
    );
    if (!responseEventId) throw new Error('Visible event decision has no exact pending event identity');
    const responseControl = frame.locator('[data-testid="event-decision-response"]').first();
    const responseLabel = (await responseControl.getAttribute('aria-label').catch(() => null))
      || (await responseControl.getAttribute('title').catch(() => null))
      || (await responseControl.innerText({ timeout: 5000 }).catch(() => ''));
    const clicked = await clickTestId(frame, 'event-decision-response', 'required event response', { afterMs: 1400 });
    if (!clicked) throw new Error('Required event decision response control failed');
    const after = await readState(frame);
    const decisionReceipt = assertExactEventDecisionReceipt(
      responseEventId,
      pendingState?.eventDecisionReceipts ?? [],
      after?.eventDecisionReceipts ?? [],
    );
    await snapshot(page, frame, faction, events, 'handled-event-decision', {
      handledAction: 'event-decision-first-response',
      clicked,
      pendingEventId: responseEventId,
      responseLabel,
      decisionReceipt,
    });
    return { handled: true, action: 'event-decision-first-response' };
  }
  if (/Dismiss Expansion/i.test(text)) {
    const clicked = await clickMatch(frame, /Dismiss Expansion/i, 'dismiss stack expansion', { afterMs: 500 });
    await snapshot(page, frame, faction, events, 'handled-stack-expansion', { handledAction: 'dismiss-stack-expansion', clicked });
    return { handled: clicked, action: 'dismiss-stack-expansion' };
  }
  const paramilitarySubmitCount = await frame.locator('[data-testid="paramilitary-submit-decisions"]').count().catch(() => 0);
  if (paramilitarySubmitCount > 0 || (/Paramilitary Authorization/i.test(text) && /Deny Packet|Allow Packet|Submit Decisions/i.test(text))) {
    const requestIds = pendingState?.pendingParamilitaryRequestIds ?? [];
    if (requestIds.length === 0) throw new Error('Visible paramilitary review has no exact pending request identities');
    const denied = await clickTestId(frame, 'paramilitary-always-deny', 'paramilitary standing deny', { afterMs: 500 })
      || await clickMatch(frame, /Always Deny|Deny All|Deny Packet/i, 'paramilitary standing deny', { afterMs: 500 });
    await sleep(250);
    const submitted = await clickTestId(frame, 'paramilitary-submit-decisions', 'paramilitary submit', { afterMs: 1000 })
      || await clickMatch(frame, /Submit Decisions/i, 'paramilitary submit', { afterMs: 1000 });
    if (!submitted) throw new Error(`Paramilitary decisions were not submitted for ${JSON.stringify(requestIds)}`);
    const after = await readState(frame);
    const unclearedIds = requestIds.filter((targetOsid) => (after?.pendingParamilitaryRequestIds ?? []).includes(targetOsid));
    if (unclearedIds.length > 0) throw new Error(`Paramilitary requests remained pending after submit: ${JSON.stringify(unclearedIds)}`);
    const paramilitaryReceipts = assertExactParamilitaryDecisionReceipts(
      requestIds,
      pendingState?.paramilitaryDecisionReceipts ?? [],
      after?.paramilitaryDecisionReceipts ?? [],
      faction,
      'deny',
    );
    await snapshot(page, frame, faction, events, 'handled-paramilitary', {
      handledAction: 'paramilitary-standing-deny-submit',
      requestIds,
      denied,
      submitted,
      paramilitaryReceipts,
      after,
    });
    return { handled: true, action: 'paramilitary-standing-deny-submit' };
  }
  const reserveModalOpen = /Reserve Request|Review Reserve/i.test(text)
    && /PRESIDENTIAL DECISION REQUIRED|ARMY HQ REQUEST|Review requested reserve|Open Reserve Pool|Decline/i.test(text);
  if (reserveModalOpen) {
    const clicked = await clickMatch(frame, /Decline|Deny|Withhold|Close|Submit/i, 'reserve cautious action', { afterMs: 1000 });
    await snapshot(page, frame, faction, events, 'handled-reserve-request', { handledAction: 'reserve-cautious-action', clicked });
    return { handled: clicked, action: 'reserve-cautious-action' };
  }
  if (shouldOpenAdvanceBlockerReview(text, pendingState)) {
    const before = await readState(frame).catch(() => null);
    const qaProposal = selectProposalForQa(before?.pendingProposals ?? [], strategicRun);
    if (qaProposal) {
        await snapshot(page, frame, faction, events, 'strategic-proposal-before-accept', { before });
        const proposal = await acceptStrategicProposalThroughUi(frame, qaProposal, {
          requireOrdinaryProposalDossierTruth: faction === 'RS',
          onDossierOpen: (details) => snapshot(
            page,
            frame,
            faction,
            events,
            'strategic-proposal-dossier-open',
            { before, ...details },
          ),
          onFieldPlanOpen: (details) => snapshot(page, frame, faction, events, 'historical-operation-map-focus', details),
          onFieldPlanReturn: (details) => snapshot(page, frame, faction, events, 'historical-operation-dossier-return', details),
        });
        await sleep(1200);
        const after = await readState(frame);
        const cleared = proposal.handled
          && (after?.unresolvedProposalCount ?? Number.POSITIVE_INFINITY) < before.unresolvedProposalCount;
        const proposalReceipt = assertExactProposalResolution(
          proposal.proposalId,
          before?.proposalRecords ?? [],
          after?.proposalRecords ?? [],
        );
        await snapshot(page, frame, faction, events, 'strategic-proposal-after-accept', { proposal, proposalReceipt, after, cleared });
        if (!cleared) throw new Error(`Required proposal remained pending after visible response: ${proposal.proposalId}`);
        return { handled: true, action: `strategic-proposal:${proposal.proposedAction}` };
    }
    const clicked = await clickMatch(
      frame,
      /Review paramilitary|Review deployment|Review reserve|Review Blockers|Open Review|Review Priorities|Review Before Advance|Open Decision Room|Review/i,
      'advance blocker review',
      { afterMs: 1000 },
    );
    await snapshot(page, frame, faction, events, 'handled-advance-blocker-review', { handledAction: 'advance-blocker-review', clicked });
    return { handled: clicked, action: 'advance-blocker-review' };
  }
  if (/ADVANCE TURN/i.test(text)) {
    if (options.allowAdvanceModal === false) {
      return { handled: false, action: 'advance-turn-modal-held-for-checkpoint', text: compactText(text, 1600) };
    }
    const clicked = await clickMatch(frame, /Advance Turn/i, 'advance modal', { afterMs: 1500 });
    if (clicked) await waitForAdvanceTransition(frame);
    await snapshot(page, frame, faction, events, 'handled-advance-modal', { handledAction: 'advance-turn-modal', clicked });
    return { handled: clicked, action: 'advance-turn-modal' };
  }
  return { handled: false, action: 'none', text: compactText(text, 2600) };
}

async function drainTransientSurfaces(page, frame, faction, events, label, maxSteps = 12, options = {}) {
  const drained = [];
  for (let i = 0; i < maxSteps; i += 1) {
    const before = await readState(frame).catch(() => null);
    const handled = await handleCurrentSurface(page, frame, faction, events, options);
    drained.push({ step: i + 1, handled: handled.handled, action: handled.action, before });
    if (!handled.handled) break;
    await sleep(400);
  }
  if (drained.length === maxSteps && drained.at(-1)?.handled) {
    const remaining = await readState(frame).catch(() => null);
    throw new Error(`Transient-surface drain guard exhausted (${label}): ${JSON.stringify(remaining?.blockerInventory ?? {})}`);
  }
  await snapshot(page, frame, faction, events, `${label}-after-drain`, { drained });
  return drained;
}

async function resolvePendingEventDecisionsBeforeFreeNavigation(page, frame, faction, events, maxDecisions = 8) {
  const resolved = [];
  for (let i = 0; i < maxDecisions; i += 1) {
    let noticeCount = 0;
    while (await frame.locator('[data-testid="event-notice-acknowledge"]').first().isVisible().catch(() => false)) {
      noticeCount += 1;
      if (noticeCount > 8) throw new Error('Pre-tour visible event notice guard exhausted');
      const eventNoticeId = await frame.locator('[data-testid="event-notice-acknowledge"]').first()
        .getAttribute('data-event-id')
        .catch(() => null);
      assertNewEventNoticeIdentity(events, eventNoticeId, `pre-tour ${noticeCount}`);
      const acknowledged = await clickTestId(
        frame,
        'event-notice-acknowledge',
        'pre-tour acknowledge visible event notice',
        { afterMs: 900 },
      );
      await snapshot(page, frame, faction, events, 'pre-tour-event-notice-acknowledged', {
        handledAction: 'pre-tour-acknowledge-visible-event-notice',
        eventNoticeId,
        acknowledged,
      });
      if (!acknowledged) throw new Error('Pre-tour visible event notice could not be acknowledged');
    }
    const before = await readState(frame);
    const pendingEventId = before?.pendingEventDecisionIds?.[0] ?? null;
    if (!pendingEventId) return resolved;

    let response = frame.locator('[data-testid="event-decision-response"]').first();
    if (!await response.isVisible().catch(() => false)) {
      const openedFromAftermath = await clickTestId(
        frame,
        `turn-aftermath-action-event:${pendingEventId}`,
        `pre-tour event ${pendingEventId} aftermath action`,
        { afterMs: 900 },
      );
      if (openedFromAftermath) {
        response = frame.locator('[data-testid="event-decision-response"]').first();
      }
    }
    if (!await response.isVisible().catch(() => false)) {
      const responseRail = frame.locator('[data-testid="event-decision-response-rail"]').first();
      const responseRailMounted = await responseRail
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (responseRailMounted && await response.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
        // Response is ready on the current surface.
      } else {
        let eventMountedDuringClose = false;
        try {
          await clearOpenSurfaces(frame);
        } catch (error) {
          if (error?.message !== 'required-event-decision') throw error;
          eventMountedDuringClose = true;
        }
        if (!eventMountedDuringClose) {
          const opened = await openPendingEventDecisionFromDesk(frame, pendingEventId);
          if (!opened) throw new Error(`Pre-tour event decision route failed: ${pendingEventId}`);
          response = frame.locator('[data-testid="event-decision-response"]').first();
        }
      }
    }
    await response.waitFor({ state: 'visible', timeout: 5000 });
    const responseRail = frame.locator('[data-testid="event-decision-response-rail"]').first();
    const responseEventId = resolveVisibleEventDecisionId(
      pendingEventId,
      await responseRail.getAttribute('data-event-id').catch(() => null),
    );
    if (!responseEventId) throw new Error('Pre-tour visible event decision has no exact identity');
    if (!(before?.pendingEventDecisionIds ?? []).includes(responseEventId)) {
      throw new Error(`Pre-tour visible event decision identity is not pending: ${responseEventId}`);
    }
    const responseLabel = (await response.getAttribute('aria-label').catch(() => null))
      || (await response.getAttribute('title').catch(() => null))
      || (await response.innerText({ timeout: 5000 }).catch(() => ''));
    await snapshot(page, frame, faction, events, 'pre-tour-event-before-response', { pendingEventId: responseEventId, responseLabel, before });
    const responded = await clickTestId(frame, 'event-decision-response', `pre-tour event ${responseEventId} response`, { afterMs: 1200 });
    if (!responded) throw new Error(`Pre-tour event decision response failed: ${responseEventId}`);

    const after = await readState(frame);
    if ((after?.pendingEventDecisionIds ?? []).includes(responseEventId)) {
      throw new Error(`Pre-tour event decision remained pending after response: ${responseEventId}`);
    }
    const decisionReceipt = assertExactEventDecisionReceipt(
      responseEventId,
      before?.eventDecisionReceipts ?? [],
      after?.eventDecisionReceipts ?? [],
    );
    resolved.push({ pendingEventId: responseEventId, responseLabel, decisionReceipt, before, after });
    await snapshot(page, frame, faction, events, 'pre-tour-event-after-response', {
      pendingEventId: responseEventId,
      responseLabel,
      decisionReceipt,
      responded,
      after,
    });
  }

  const remaining = await readState(frame);
  if ((remaining?.pendingEventDecisionIds?.length ?? 0) > 0) {
    throw new Error(`Pre-tour event decision guard exhausted: ${JSON.stringify(remaining.pendingEventDecisionIds)}`);
  }
  return resolved;
}

async function turnCheckpointTour(page, frame, faction, events, turn) {
  await drainTransientSurfaces(page, frame, faction, events, `turn-${turn}-pre-checkpoint`, 40, { allowAdvanceModal: false });
  await mapInteractionProbe(page, frame, faction, events, `turn-${turn}-map-probe`);
  await drainTransientSurfaces(page, frame, faction, events, `turn-${turn}-post-map-probe`, 40, { allowAdvanceModal: false });
  const openedCommandSurface = await openCommandSurfaceFromWarroom(frame, `turn ${turn} command surface`);
  if (!openedCommandSurface) throw new Error(`Checkpoint command surface failed at turn ${turn}`);
  await snapshot(page, frame, faction, events, `turn-${turn}-command-surface`);
  const openedDecisionRoom = await openDecisionRoomFromWarroom(frame, `turn ${turn} decision room`);
  if (!openedDecisionRoom) throw new Error(`Checkpoint Decision Room failed at turn ${turn}`);
  await snapshot(page, frame, faction, events, `turn-${turn}-decision-room`, { openedDecisionRoom });
  await decisionRoomDeepDive(page, frame, faction, events, `turn-${turn}-decision-room-deep`);
  await closeOpenSurface(frame);
  await armyHqDeepDive(page, frame, faction, events);
}

async function lightTurnCheckpointTour(page, frame, faction, events, turn) {
  await drainTransientSurfaces(page, frame, faction, events, `light-turn-${turn}-pre-checkpoint`, 40, { allowAdvanceModal: false });
  await closeOpenSurface(frame);
  const openedWarMap = await openExactWarMapRoute(frame, `light turn ${turn} exact War Map`, { afterMs: 900 });
  if (!openedWarMap) throw new Error(`Required War Map route failed for light checkpoint turn ${turn}`);
  await drainVisibleEventNotices(page, frame, faction, events, `light-turn-${turn}-map-settle`);
  await dismissCommandBriefing(frame);
  const mapState = await readState(frame);
  const mapReady = await waitForTacticalMapReady(
    frame,
    mapState?.turn,
    (mapState?.locatedOwnedFormationCount ?? 0) > 0,
  );
  if (!mapReady) {
    const readiness = await tacticalMapReadinessDiagnostics(
      frame,
      mapState?.turn,
      (mapState?.locatedOwnedFormationCount ?? 0) > 0,
    );
    await snapshot(page, frame, faction, events, `light-turn-${turn}-map-not-ready`, { readiness });
    throw new Error(`Light checkpoint map did not render current-turn counters at turn ${turn}: ${JSON.stringify(readiness)}`);
  }
  await snapshot(page, frame, faction, events, `light-turn-${turn}-map`, {
    counters: await counterInfo(frame),
    mapChromeGeometry: assertMapChromeGeometry(`light-turn-${turn}-map`, await readMapChromeGeometry(frame)),
  });

  const openedCommandSurface = await openCommandSurfaceFromWarroom(frame, `light turn ${turn} command surface`);
  if (!openedCommandSurface || !await frame.locator('[data-testid="command-card-strip"]').isVisible()) {
    throw new Error(`Light checkpoint command surface failed at turn ${turn}`);
  }
  await snapshot(page, frame, faction, events, `light-turn-${turn}-command-surface`, { openedCommandSurface });

  const openedDecisionRoom = await openDecisionRoomFromWarroom(frame, `light turn ${turn} decision room`);
  if (!openedDecisionRoom || !await frame.locator('[data-testid="warroom-decision-room-host"]').isVisible()) {
    throw new Error(`Light checkpoint Decision Room failed at turn ${turn}`);
  }
  await snapshot(page, frame, faction, events, `light-turn-${turn}-decision-room`, { openedDecisionRoom });
  await closeOpenSurface(frame);

  const openedArmyHq = await openArmyHqFromCurrentSurface(frame, `light turn ${turn} army hq`, { afterMs: 700 });
  if (!openedArmyHq || !await frame.locator('[data-testid="army-hq-modal"]').isVisible()) {
    throw new Error(`Light checkpoint Army HQ failed at turn ${turn}`);
  }
  await snapshot(page, frame, faction, events, `light-turn-${turn}-army-hq`, { openedArmyHq });
  await closeOpenSurface(frame);
}

async function fullFinalStateTour(page, frame, faction, events, turn) {
  await drainTransientSurfaces(page, frame, faction, events, `final-turn-${turn}-pre-tour`, 40, { allowAdvanceModal: false });
  const beforeState = await readState(frame);
  assertNoPlayerBlockers(`before final-state tour turn ${turn}`, beforeState);
  const beforeStateHash = await readRawStateHash(frame);
  const beforeCommandAuthority = JSON.stringify(beforeState?.commandAuthority ?? null);
  const autosavePath = canonicalAutosavePath;
  const beforeAutosaveHash = fileSha256(autosavePath);
  const baselineHashProof = assertStableProjectionAndAutosaveHashes(
    `Final-state tour turn ${turn} baseline`,
    beforeStateHash,
    beforeAutosaveHash,
    beforeStateHash,
    beforeAutosaveHash,
  );
  const finalTourProof = await surfaceTour(page, frame, faction, events, {
    allowAdvanceProbe: false,
    requireStackPickerProof: true,
    requireEmptyCommandCategoryProof: true,
    proofLabelPrefix: `final-turn-${turn}`,
  });
  const afterState = await readState(frame);
  assertNoPlayerBlockers(`after final-state tour turn ${turn}`, afterState);
  const afterStateHash = await readRawStateHash(frame);
  const afterAutosaveHash = fileSha256(autosavePath);
  const tourHashProof = assertStableProjectionAndAutosaveHashes(
    `Final-state tour turn ${turn}`,
    beforeStateHash,
    beforeAutosaveHash,
    afterStateHash,
    afterAutosaveHash,
  );
  if (beforeStateHash !== afterStateHash) throw new Error(`Final-state tour mutated serialized game state: ${beforeStateHash} -> ${afterStateHash}`);
  if (beforeCommandAuthority !== JSON.stringify(afterState?.commandAuthority ?? null)) throw new Error('Final-state tour mutated Command Authority');
  if (beforeAutosaveHash !== afterAutosaveHash) throw new Error(`Final-state tour mutated autosave: ${beforeAutosaveHash} -> ${afterAutosaveHash}`);
  await snapshot(page, frame, faction, events, `final-turn-${turn}-full-tour-complete`, {
    formationAudit: await formationAudit(frame),
    beforeStateHash,
    afterStateHash,
    beforeAutosaveHash,
    afterAutosaveHash,
    baselineHashProof,
    tourHashProof,
    finalTourProof,
  });
  const postSnapshotStateHash = await readRawStateHash(frame);
  const postSnapshotAutosaveHash = fileSha256(autosavePath);
  const postSnapshotHashProof = assertStableProjectionAndAutosaveHashes(
    `Final-state tour turn ${turn} completion snapshot`,
    beforeStateHash,
    beforeAutosaveHash,
    postSnapshotStateHash,
    postSnapshotAutosaveHash,
  );
  return { ...finalTourProof, baselineHashProof, tourHashProof, postSnapshotHashProof };
}

async function exerciseContextChurn(page, frame, faction, events, cycles) {
  const results = [];
  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    const openedWarroom = await ensureWarroom(frame, `context churn ${cycle} warroom`);
    const openedMap = openedWarroom
      ? await openWarroomRoute(frame, 'war-map', `context churn ${cycle} map`, { afterMs: 350 })
      : false;
    results.push({ cycle, openedWarroom, openedMap });
    if (!openedWarroom || !openedMap) {
      throw new Error(`Context churn route failed: ${JSON.stringify(results.at(-1))}`);
    }
    if (cycle % 4 === 0 || cycle === cycles) {
      await snapshot(page, frame, faction, events, `context-churn-${cycle}`, { contextChurn: results.slice(-4) });
    }
  }
  return results;
}

async function playTurns(page, frame, faction, events, targetTurn) {
  const turnEvents = [];
  const recruitmentAttemptTurns = new Set();
  let recruitmentSucceeded = !autoRecruit;
  let lastTurn = (await readState(frame))?.turn ?? 0;
  let maxObservedTurn = lastTurn;
  let stagnantSteps = 0;
  let guard = 0;
  const guardLimit = Math.max(120, targetTurn * 8 + 60);
  const checkpointTurns = skipCheckpointTour ? new Set() : new Set([1, 2, 5, 10, 15, 20, 30, 40, targetTurn]);
  const checkpointTour = lightCheckpointTour ? lightTurnCheckpointTour : turnCheckpointTour;
  while (lastTurn < targetTurn && guard < guardLimit) {
    guard += 1;
    const before = await readState(frame).catch(() => null);
    const surfaceBefore = await bodyText(frame);
    const unresolvedStateBlocker = Object.values(before?.blockerInventory ?? {})
      .some((count) => Number(count) > 0);
    const recruitmentWindow = !unresolvedStateBlocker
      && !/TURN AFTERMATH|DECISION REQUIRED|PRESIDENTIAL RESPONSE|Paramilitary Authorization|Review Before Advance|Advance blocked/i.test(surfaceBefore);
    if (
      strategicRun
      && autoRecruit
      && !recruitmentSucceeded
      && !recruitmentAttemptTurns.has(before?.turn)
      && recruitmentWindow
    ) {
      recruitmentAttemptTurns.add(before?.turn);
      const recruitment = await attemptStrategicRecruitment(frame, faction);
      turnEvents.push({ guard, step: 'strategic-recruitment', before, recruitment });
      await sleep(900);
      await snapshot(page, frame, faction, events, `turn-${before?.turn}-strategic-recruitment`, { recruitment });
      if (recruitment.handled) {
        recruitmentSucceeded = true;
        continue;
      }
    }
    const handled = await handleCurrentSurface(page, frame, faction, events);
    if (handled.handled) {
      const afterHandle = await readState(frame).catch(() => null);
      if (strategicRun && !resumeSavePath && afterHandle?.turn === 1) {
        assertStrategicAutonomyState('Strategic autonomy not applied after first turn', afterHandle, 1, null);
      }
      maxObservedTurn = Math.max(maxObservedTurn, afterHandle?.turn ?? maxObservedTurn);
      stagnantSteps = 0;
      turnEvents.push({ guard, step: 'handled', action: handled.action, before, after: afterHandle });
      if (afterHandle?.turn > (before?.turn ?? -1) && checkpointTurns.has(afterHandle.turn)) {
        await checkpointTour(page, frame, faction, events, afterHandle.turn);
      }
      lastTurn = afterHandle?.turn ?? lastTurn;
      continue;
    }
    if (!unresolvedStateBlocker) {
      const advanceSurfaceReady = await ensureWarroom(
        frame,
        `turn ${before?.turn ?? lastTurn} campaign advance surface`,
      );
      if (!advanceSurfaceReady) {
        throw new Error(`Campaign advance surface was unreachable at turn ${before?.turn ?? lastTurn}`);
      }
    }
    const advanced = await clickMatch(frame, /warroom-toolbar-advance|^Advance$|Advance|Review Blockers|Review Before Advance|Review paramilitary/i, 'advance toolbar', { afterMs: 1500 });
    await sleep(2200);
    const after = await readState(frame).catch(() => null);
    if (strategicRun && !resumeSavePath && after?.turn === 1) {
      assertStrategicAutonomyState('Strategic autonomy not applied after first turn', after, 1, null);
    }
    maxObservedTurn = Math.max(maxObservedTurn, after?.turn ?? maxObservedTurn);
    if ((after?.turn ?? lastTurn) > (before?.turn ?? lastTurn)) stagnantSteps = 0;
    else stagnantSteps += 1;
    turnEvents.push({ guard, step: 'advance-click', advanced, before, after, surface: handled.text });
    await snapshot(page, frame, faction, events, `turn-loop-${guard}`, { turnLoopTail: turnEvents.slice(-6), advanced });
    if (after?.turn > (before?.turn ?? -1) && checkpointTurns.has(after.turn)) {
      await checkpointTour(page, frame, faction, events, after.turn);
    }
    if (stagnantSteps >= 4) {
      throw new Error(`Campaign progress stalled at turn ${after?.turn ?? lastTurn} after ${stagnantSteps} unproductive advance attempts`);
    }
    lastTurn = after?.turn ?? lastTurn;
  }
  const preFinalState = await readState(frame).catch(() => null);
  if (preFinalState?.turn !== targetTurn) {
    throw new Error(`Exact-turn assertion failed before final tour: expected ${targetTurn}, observed ${preFinalState?.turn ?? 'unavailable'}`);
  }
  await drainTransientSurfaces(page, frame, faction, events, `turn-${targetTurn}-pre-final-tour-drain`, 40, {
    allowAdvanceModal: false,
  });
  const finalTourProof = finalCheckpointTour
    ? await fullFinalStateTour(page, frame, faction, events, targetTurn)
    : null;
  await drainTransientSurfaces(page, frame, faction, events, `turn-${targetTurn}-final-drain`, 40, {
    allowAdvanceModal: false,
  });
  const finalState = await readState(frame);
  const finalFormationAudit = await formationAudit(frame);
  const autosavePath = canonicalAutosavePath;
  const endStateHash = await readRawStateHash(frame);
  const endAutosaveHash = fileSha256(autosavePath);
  const endBaselineStateHash = finalTourProof?.postSnapshotHashProof?.stateHash ?? endStateHash;
  const endBaselineAutosaveHash = finalTourProof?.postSnapshotHashProof?.autosaveHash ?? endAutosaveHash;
  const endHashProof = assertStableProjectionAndAutosaveHashes(
    `End-of-run turn ${targetTurn} after final drains`,
    endBaselineStateHash,
    endBaselineAutosaveHash,
    endStateHash,
    endAutosaveHash,
  );
  await snapshot(page, frame, faction, events, 'playthrough-final', {
    finalState,
    finalFormationAudit,
    finalTourProof,
    endHashProof,
    turnEvents: turnEvents.slice(-35),
  });
  const postEvidenceStateHash = await readRawStateHash(frame);
  const postEvidenceAutosaveHash = fileSha256(autosavePath);
  const postEvidenceHashProof = assertStableProjectionAndAutosaveHashes(
    `End-of-run turn ${targetTurn} after playthrough-final snapshot`,
    endStateHash,
    endAutosaveHash,
    postEvidenceStateHash,
    postEvidenceAutosaveHash,
  );
  const finalAutosaveEvidence = archiveAutosaveEvidence(
    autosavePath,
    path.join(evidenceDir, safeName(faction), 'final-autosave.json'),
  );
  if (finalAutosaveEvidence.sha256 !== postEvidenceAutosaveHash) {
    throw new Error(`Final autosave evidence changed during archival: ${postEvidenceAutosaveHash} -> ${finalAutosaveEvidence.sha256}`);
  }
  if (finalState?.turn !== targetTurn) {
    throw new Error(`Exact-turn assertion failed: expected ${targetTurn}, observed ${finalState?.turn ?? 'unavailable'}`);
  }
  if (maxObservedTurn > targetTurn) {
    throw new Error(`Turn overrun: target ${targetTurn}, observed ${maxObservedTurn}`);
  }
  if (strategicRun && autoRecruit && requireRecruitment && !recruitmentSucceeded) {
    throw new Error('Strategic recruitment did not complete through the Army HQ Personnel route');
  }
  assertNoPlayerBlockers(`end of turn ${targetTurn}`, finalState);
  const requiredEventReceiptIds = requiredRsEventReceiptIds(faction, targetTurn, Boolean(resumeSavePath));
  const observedEventReceiptIds = new Set(finalState?.eventDecisionReceiptIds ?? []);
  const missingRequiredEventReceiptIds = requiredEventReceiptIds.filter((eventId) => !observedEventReceiptIds.has(eventId));
  if (missingRequiredEventReceiptIds.length > 0) {
    throw new Error(`Missing required RS event receipts: ${JSON.stringify(missingRequiredEventReceiptIds)}`);
  }
  const historicalEventAnchorResults = assertHistoricalEventAnchors(
    faction,
    targetTurn,
    Boolean(resumeSavePath),
    finalState,
  );
  if ((finalFormationAudit?.unlocatedActiveCombatFormationsAllFactions?.length ?? 0) > 0) {
    throw new Error(`Unlocated active combat formations remain: ${JSON.stringify(finalFormationAudit.unlocatedActiveCombatFormationsAllFactions)}`);
  }
  const readabilityDiagnostics = collectReadabilityFailures(events);
  if (readabilityDiagnostics.length > 0) {
    writeJsonAtomic(readabilityDiagnosticsPath, readabilityDiagnostics);
    throw new Error(`Readability diagnostics detected: ${JSON.stringify(readabilityDiagnostics.slice(0, 40))}`);
  }
  return {
    finalState,
    finalFormationAudit,
    turnEvents,
    guard,
    guardLimit,
    maxObservedTurn,
    recruitmentSucceeded,
    finalTourProof,
    endHashProof,
    postEvidenceHashProof,
    finalAutosaveEvidence,
    requiredEventReceiptIds,
    historicalEventAnchorResults,
  };
}

function classifyExpectedRequestAbort({
  failure,
  method,
  url,
  resourceType,
  isMainFrame,
  eventCount,
  teardownStarted,
  observedAtMs,
  mapNavigationWindow,
}) {
  if (failure?.errorText !== 'net::ERR_ABORTED' || method !== 'GET') return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const navigationAbortAllowlist = new Map([
    ['/data/derived/tiles/hillshade.pmtiles', 'map-hillshade-navigation'],
    ['/data/derived/tiles/osm.pmtiles', 'map-osm-navigation'],
  ]);
  const exactPackagedLocalNavigationWindow = mapNavigationWindow?.active === true
    && typeof mapNavigationWindow.token === 'string'
    && mapNavigationWindow.token.startsWith('map-navigation:')
    && mapNavigationWindow.runtime === 'packaged-local'
    && Number.isFinite(mapNavigationWindow.openedAtMs)
    && Number.isFinite(mapNavigationWindow.expiresAtMs)
    && Number.isFinite(observedAtMs)
    && observedAtMs >= mapNavigationWindow.openedAtMs
    && observedAtMs <= mapNavigationWindow.expiresAtMs
    && parsed.protocol === 'http:'
    && parsed.hostname === '127.0.0.1'
    && parsed.origin === mapNavigationWindow.expectedOrigin
    && parsed.search === ''
    && parsed.hash === '';
  const canceledMapSourceOnNavigation = !teardownStarted
    && eventCount > 0
    && !isMainFrame
    && resourceType === 'fetch'
    && exactPackagedLocalNavigationWindow
    && navigationAbortAllowlist.has(parsed.pathname);
  if (canceledMapSourceOnNavigation) return navigationAbortAllowlist.get(parsed.pathname);
  if (resourceType !== 'document') return null;
  const embeddedWarroomDocument = parsed.origin === 'http://127.0.0.1:3002'
    && parsed.pathname === '/index.html'
    && parsed.searchParams.get('embedded') === '1'
    && parsed.searchParams.get('view') === 'warroom';
  if (!teardownStarted && eventCount === 0 && !isMainFrame && embeddedWarroomDocument) {
    return 'startup-embedded-warroom-document';
  }
  const mainWarroomDocument = parsed.protocol === 'awwv:'
    && parsed.hostname === 'warroom'
    && (parsed.pathname === '' || parsed.pathname === '/' || parsed.pathname === '/index.html');
  if (teardownStarted && ((isMainFrame && mainWarroomDocument) || (!isMainFrame && embeddedWarroomDocument))) {
    return 'teardown-game-document';
  }
  return null;
}

function isExpectedStartupEmbeddedDocumentAbort(record) {
  if (record.eventCount !== 0 || record.resourceType !== 'document' || record.isMainFrame) return false;
  return classifyExpectedRequestAbort({ ...record, teardownStarted: false }) === 'startup-embedded-warroom-document';
}

function isExpectedInspectorTeardownLine(line) {
  return /^Debugger ending on ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+$/i.test(line)
    || line === 'For help, see: https://nodejs.org/en/docs/inspector';
}

function attachPageDiagnostics(page, diagnostics) {
  if (diagnostics.attachedPages.has(page)) return;
  diagnostics.attachedPages.add(page);
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      const location = message.location();
      if (location.url.startsWith('devtools://')) return;
      diagnostics.consoleMessages.push({
        type: message.type(),
        text: message.text().slice(0, 1400),
        location,
        eventCount: diagnostics.events.length,
      });
    }
  });
  page.on('pageerror', (error) => {
    diagnostics.pageErrors.push({ message: String(error?.message ?? error), stack: error?.stack ?? null });
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    const observedAtMs = Date.now();
    const record = {
      kind: 'requestfailed',
      method: request.method(),
      url: request.url(),
      resourceType: request.resourceType(),
      isMainFrame: request.frame() === page.mainFrame(),
      failure,
      eventCount: diagnostics.events.length,
      teardownStarted: diagnostics.isTeardownStarted(),
      observedAtMs,
      mapNavigationWindow: diagnostics.getMapNavigationAbortWindow(observedAtMs),
    };
    const expectedAbort = classifyExpectedRequestAbort(record);
    if (expectedAbort === 'startup-embedded-warroom-document') {
      diagnostics.expectedStartupAborts.push({ ...record, allowlist: expectedAbort });
      return;
    }
    if (expectedAbort === 'teardown-game-document') {
      diagnostics.expectedTeardownAborts.push({ ...record, allowlist: expectedAbort });
      return;
    }
    if (expectedAbort === 'map-hillshade-navigation' || expectedAbort === 'map-osm-navigation') {
      diagnostics.expectedNavigationAborts.push({ ...record, allowlist: expectedAbort });
      return;
    }
    diagnostics.networkFailures.push(record);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      diagnostics.networkFailures.push({ kind: 'http-error', status: response.status(), url: response.url() });
    }
  });
}

async function runFaction(faction, result) {
  canonicalAutosavePersistenceAtResumeLoad = null;
  activeMapNavigationAbortWindow = null;
  const userDataDir = path.join(userDataRoot, safeName(`${runSlug}-${faction}`));
  canonicalAutosavePath = packagedExecutablePath
    ? path.join(userDataDir, 'saves', 'autosave.json')
    : developmentCanonicalAutosavePath;
  if (!resumeSavePath) fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.mkdirSync(userDataDir, { recursive: true });
  const events = [];
  const consoleMessages = [];
  const networkFailures = [];
  const expectedStartupAborts = [];
  const expectedTeardownAborts = [];
  const expectedNavigationAborts = [];
  const pageErrors = [];
  const mainProcessStdout = [];
  const mainProcessStderr = [];
  const attachedPages = new WeakSet();
  let teardownStarted = false;
  const app = await electron.launch({
    cwd: repo,
    ...(packagedExecutablePath ? { executablePath: packagedExecutablePath } : {}),
    args: packagedExecutablePath
      ? [`--user-data-dir=${userDataDir}`, `--log-net-log=${netLogPath}`]
      : ['.', `--user-data-dir=${userDataDir}`, `--log-net-log=${netLogPath}`],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
    timeout: 90000,
  });
  const captureMainProcessOutput = (target) => (chunk) => {
    for (const line of String(chunk ?? '').split(/\r?\n/).map((value) => value.trim()).filter(Boolean)) {
      target.push(line.slice(0, 2000));
      if (target.length > 500) target.shift();
    }
  };
  const electronProcess = app.process();
  electronProcess.stdout?.on('data', captureMainProcessOutput(mainProcessStdout));
  electronProcess.stderr?.on('data', captureMainProcessOutput(mainProcessStderr));
  const diagnostics = {
    events,
    consoleMessages,
    pageErrors,
    networkFailures,
    expectedStartupAborts,
    expectedTeardownAborts,
    expectedNavigationAborts,
    attachedPages,
    isTeardownStarted: () => teardownStarted,
    getMapNavigationAbortWindow: getActiveMapNavigationAbortWindow,
  };
  const attachDiagnostics = (page) => attachPageDiagnostics(page, diagnostics);
  app.on('window', attachDiagnostics);
  for (const existingPage of app.windows()) attachDiagnostics(existingPage);
  let entry = null;
  let initialEvidence = null;
  try {
    const page = await waitForGamePage(app);
    attachDiagnostics(page);
    let frame;
    if (resumeSavePath) {
      if (!fs.existsSync(resumeSavePath)) throw new Error(`Resume save not found: ${resumeSavePath}`);
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] });
      }, resumeSavePath);
      const loadSaveButton = page.getByRole('button', { name: /Load Save/i }).first();
      await loadSaveButton.waitFor({ state: 'visible', timeout: 30000 });
      await loadSaveButton.click({ timeout: 10000 });
      const loaded = true;
      await sleep(1800);
      frame = await waitForEmbeddedFrame(page);
      canonicalAutosavePersistenceAtResumeLoad = filePersistenceFingerprint(canonicalAutosavePath);
      await snapshot(page, frame, faction, events, 'resume-save-loaded', { resumeSavePath, loaded });
    } else {
      frame = await startCampaign(page, faction, events);
    }
    const initialAutosavePath = resolveDecisionReceiptAutosavePath(
      canonicalAutosavePath,
      resumeSavePath,
      canonicalAutosavePersistenceAtResumeLoad,
      filePersistenceFingerprint(canonicalAutosavePath),
    );
    const initialState = await readState(frame);
    const initialStateHash = await readRawStateHash(frame);
    const initialAutosaveHash = fileSha256(initialAutosavePath);
    const initialHashProof = assertStableProjectionAndAutosaveHashes(
      `Initial ${faction} campaign evidence`,
      initialStateHash,
      initialAutosaveHash,
      initialStateHash,
      initialAutosaveHash,
    );
    const initialAutosaveEvidence = archiveAutosaveEvidence(
      initialAutosavePath,
      path.join(evidenceDir, safeName(faction), 'initial-autosave.json'),
    );
    initialEvidence = {
      state: initialState,
      initialStateHash,
      initialAutosaveHash,
      initialHashProof,
    initialAutosaveEvidence,
      initialScenarioProvenance: buildInitialScenarioProvenance(initialAutosaveEvidence, Boolean(resumeSavePath)),
      scenarioId: initialState?.scenarioId ?? null,
      scenarioSeed: initialState?.scenarioSeed ?? null,
      controlMapHash: initialState?.controlMapHash ?? null,
    };
    initialEvidence.scenarioId ??= initialEvidence.initialScenarioProvenance.scenarioId;
    initialEvidence.scenarioSeed ??= initialEvidence.initialScenarioProvenance.scenarioSeed;
    await snapshot(page, frame, faction, events, 'initial-state-evidence', { initialEvidence });
    let strategicConfiguration = null;
    let strategicCommandAuthority = null;
    await resolvePendingEventDecisionsBeforeFreeNavigation(page, frame, faction, events);
    if (resumeSavePath) {
      await drainTransientSurfaces(
        page,
        frame,
        faction,
        events,
        'resume-pre-free-navigation',
        40,
        { allowAdvanceModal: false },
      );
    }
    if (!skipInitialTour) {
      await surfaceTour(page, frame, faction, events);
    } else {
      await mapInteractionProbe(page, frame, faction, events, 'initial-map-probe');
      await drainTransientSurfaces(page, frame, faction, events, 'initial-post-map-probe', 40, { allowAdvanceModal: false });
    }
    if (contextChurnCycles > 0) {
      await exerciseContextChurn(page, frame, faction, events, contextChurnCycles);
    }
    if (strategicRun) {
      strategicConfiguration = await configureStrategicRun(frame);
      await snapshot(page, frame, faction, events, 'strategic-run-configured', { strategicConfiguration });
      if (!strategicConfiguration.ok) {
        throw new Error(`Strategic configuration failed: ${JSON.stringify(strategicConfiguration)}`);
      }
      await drainTransientSurfaces(page, frame, faction, events, 'strategic-setup', 8, { allowAdvanceModal: false });
      strategicCommandAuthority = resumeSavePath
        ? { ok: true, skipped: true, reason: 'resume-save-preserves-prior-command-authority' }
        : await exerciseCommandAuthorityLevers(page, frame, faction, events);
      await snapshot(page, frame, faction, events, 'strategic-ca-complete', { strategicCommandAuthority });
      if (!strategicCommandAuthority.ok) {
        throw new Error(`Command Authority lever exercise failed: ${JSON.stringify(strategicCommandAuthority)}`);
      }
    }
    const playtest = await playTurns(page, frame, faction, events, maxTurns);
    if (strategicRun && maxTurns > 0 && playtest.finalState?.autonomyLevel !== 1) {
      throw new Error(`Strategic autonomy did not apply: expected level 1, observed ${playtest.finalState?.autonomyLevel}`);
    }
    const evidenceManifest = finalizeEvidenceManifest(faction, initialEvidence, playtest);
    entry = {
      faction,
      userDataDir,
      consoleMessages,
      pageErrors,
      networkFailures,
      expectedStartupAborts,
      expectedTeardownAborts,
      expectedNavigationAborts,
      mainProcessStdout,
      mainProcessStderr,
      initialEvidence,
      strategicConfiguration,
      strategicCommandAuthority,
      evidenceManifest,
      events,
      playtest,
    };
    result.factions.push(entry);
    writeProgress(result);
  } catch (error) {
    result.factions.push({
      faction,
      failed: true,
      userDataDir,
      error: String(error?.stack ?? error),
      initialEvidence,
      consoleMessages,
      pageErrors,
      networkFailures,
      expectedStartupAborts,
      expectedTeardownAborts,
      expectedNavigationAborts,
      mainProcessStdout,
      mainProcessStderr,
      events,
    });
    writeProgress(result);
    throw error;
  } finally {
    teardownStarted = true;
    await optionalCleanup('electron application teardown', () => app.close());
  }
  const expectedMainProcessStderr = mainProcessStderr.filter(isExpectedInspectorTeardownLine);
  const unexpectedMainProcessStderr = mainProcessStderr.filter((line) => !isExpectedInspectorTeardownLine(line));
  if (entry) {
    entry.expectedMainProcessStderr = expectedMainProcessStderr;
    entry.unexpectedMainProcessStderr = unexpectedMainProcessStderr;
  }
  const runtimeDiagnostics = {
    consoleMessages: consoleMessages.length,
    pageErrors: pageErrors.length,
    networkFailures: networkFailures.length,
    mainProcessStderr: unexpectedMainProcessStderr.length,
    mainProcessErrors: unexpectedMainProcessStderr.filter((line) => /\b(error|fatal|uncaught|unhandled|exception|failed)\b/i.test(line)).length,
  };
  if (Object.values(runtimeDiagnostics).some((count) => count > 0)) {
    throw new Error(`Runtime diagnostics detected: ${JSON.stringify(runtimeDiagnostics)}`);
  }
  return entry;
}

(async () => {
  const result = { startedAt: new Date().toISOString(), command: process.argv.slice(2), provenance, factions: [] };
  for (const faction of factions) {
    await runFaction(faction, result);
  }
  result.completedAt = new Date().toISOString();
  writeJsonAtomic(logPath, result);
  console.log(JSON.stringify({
    logPath,
    factions: result.factions.map((entry) => ({
      faction: entry.faction,
      eventCount: entry.events.length,
      screenshots: entry.events.length,
      finalState: entry.playtest.finalState,
      consoleMessages: entry.consoleMessages.length,
    })),
  }, null, 2));
})().catch((error) => {
  writeTextAtomic(path.join(outDir, `paradox-local-qa-error-${runSlug}.txt`), String(error?.stack ?? error));
  console.error(error);
  process.exitCode = 1;
});
