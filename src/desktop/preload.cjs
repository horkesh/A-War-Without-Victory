'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const gameStateUpdatedListeners = new Set();
const turnReportUpdatedListeners = new Set();
// LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: optional sidecar broadcast.
const replaySequenceUpdatedListeners = new Set();
const replayManifestUpdatedListeners = new Set();

function emitToListeners(listeners, payload) {
  for (const listener of Array.from(listeners)) {
    try {
      listener(payload);
    } catch (error) {
      console.error('[awwv preload] desktop bridge listener failed', error);
    }
  }
}

function subscribe(listeners, cb) {
  if (typeof cb !== 'function') {
    return () => {};
  }
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

ipcRenderer.on('game-state-updated', (_event, stateJson) => {
  emitToListeners(gameStateUpdatedListeners, stateJson);
});
ipcRenderer.on('turn-report-updated', (_event, report) => {
  emitToListeners(turnReportUpdatedListeners, report);
});
// LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: optional sidecar from
// readReplaySaveSequenceSidecar(); raw JSON string of GameState[].
ipcRenderer.on('replay-sequence-updated', (_event, sequenceJson) => {
  emitToListeners(replaySequenceUpdatedListeners, sequenceJson);
});
ipcRenderer.on('replay-manifest-updated', (_event, manifestJson) => {
  emitToListeners(replayManifestUpdatedListeners, manifestJson);
});
contextBridge.exposeInMainWorld('awwv', {
  loadScenarioDialog: () => ipcRenderer.invoke('load-scenario-dialog'),
  startNewCampaign: (payload) => ipcRenderer.invoke('start-new-campaign', payload),
  loadStateDialog: () => ipcRenderer.invoke('load-state-dialog'),
  saveGame: (payload) => ipcRenderer.invoke('save-game', payload),
  quickSave: () => ipcRenderer.invoke('quick-save'),
  advanceTurn: (payload) => ipcRenderer.invoke('advance-turn', payload),
  subscribeGameStateUpdated: (cb) => subscribe(gameStateUpdatedListeners, cb),
  subscribeTurnReportUpdated: (cb) => subscribe(turnReportUpdatedListeners, cb),
  // LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER
  subscribeReplaySequenceUpdated: (cb) => subscribe(replaySequenceUpdatedListeners, cb),
  subscribeReplayManifestUpdated: (cb) => subscribe(replayManifestUpdatedListeners, cb),
  getCurrentGameState: () => ipcRenderer.invoke('get-current-game-state'),
  openTacticalMapWindow: (payload) => ipcRenderer.invoke('open-tactical-map-window', payload),
  getRecruitmentCatalog: () => ipcRenderer.invoke('get-recruitment-catalog'),
  applyRecruitment: (brigadeId, equipmentClass) => ipcRenderer.invoke('apply-recruitment', { brigadeId, equipmentClass }),
  stageAttackOrder: (brigadeId, targetSettlementId) => ipcRenderer.invoke('stage-attack-order', { brigadeId, targetSettlementId }),
  stagePostureOrder: (brigadeId, posture) => ipcRenderer.invoke('stage-posture-order', { brigadeId, posture }),
  stageMoveOrder: (brigadeId, targetMunicipalityId) => ipcRenderer.invoke('stage-move-order', { brigadeId, targetMunicipalityId }),
  stageDeployOrder: (brigadeId) => ipcRenderer.invoke('stage-deploy-order', { brigadeId }),
  stageUndeployOrder: (brigadeId) => ipcRenderer.invoke('stage-undeploy-order', { brigadeId }),
  assignBrigadeToSector: (brigadeId, sectorId) => ipcRenderer.invoke('assign-brigade-to-sector', { brigadeId, sectorId }),
  queryMovementRange: (brigadeId) => ipcRenderer.invoke('query-movement-range', { brigadeId }),
  queryMovementPath: (brigadeId, destinationSid) => ipcRenderer.invoke('query-movement-path', { brigadeId, destinationSid }),
  queryCombatEstimate: (brigadeId, targetSettlementId) => ipcRenderer.invoke('query-combat-estimate', { brigadeId, targetSettlementId }),
  querySupplyPaths: () => ipcRenderer.invoke('query-supply-paths'),
  queryCorpsSectors: () => ipcRenderer.invoke('query-corps-sectors'),
  queryBattleEvents: () => ipcRenderer.invoke('query-battle-events'),
  clearOrders: (brigadeId) => ipcRenderer.invoke('clear-orders', { brigadeId }),
  stageLogisticsPriority: (faction, sectorId, priority) => ipcRenderer.invoke('stage-logistics-priority', { faction, sectorId, priority }),
  stageCorpsOperationOrder: (payload) => ipcRenderer.invoke('stage-corps-operation-order', payload),
  queryOperationPrediction: (payload) => ipcRenderer.invoke('query-operation-prediction', payload),
  // Force-op pushback OBJECTION query: read-only candidate plan + commander go/no-go for
  // a REQUEST-OP target ({ forceRatio, estimatedCasualties, recommendedAction, rejectionReason? }).
  queryDirectiveObjection: (payload) => ipcRenderer.invoke('query-directive-objection', payload),
  // STOP-OP presidential lever: CA-costed staged halt (op_halt.cjs → apply-op-halts).
  // Supersedes the legacy stage-operation-halt (officer-compliance, no CA cost), which
  // was removed — the player Stand Down button now routes through this path.
  stageOpHaltOrder: (payload) => ipcRenderer.invoke('stage-op-halt-order', payload),
  // REQUEST-OP presidential lever: CA-costed staged objective directive
  // (op_directive_staging.cjs → inject-op-directive). The president names a target OSID;
  // the engine auto-selects the force + axis and builds the op (requested_by_president).
  stageOpDirectiveOrder: (payload) => ipcRenderer.invoke('stage-op-directive-order', payload),
  stageOperationForceLaunch: (payload) => ipcRenderer.invoke('stage-operation-force-launch', payload),
  stageOperationDecision: (payload) => ipcRenderer.invoke('stage-operation-decision', payload),
  stageAirdropAllocation: (allocations) => ipcRenderer.invoke('stage-airdrop-allocation', { allocations }),
  stageConvoyDecision: (convoyId, decision) => ipcRenderer.invoke('stage-convoy-decision', { convoyId, decision }),
  stageOpsecToggle: (sectorId, active) => ipcRenderer.invoke('stage-opsec-toggle', { sectorId, active }),
  stageMunicipalitySupportOrder: (payload) => ipcRenderer.invoke('stage-municipality-support-order', payload),
  focusWarroom: () => ipcRenderer.invoke('focus-warroom'),
  getMapServerUrl: () => ipcRenderer.invoke('get-map-server-url'),
  stageAssignOperationCommander: (payload) => ipcRenderer.invoke('stage-assign-operation-commander', payload),
  // REPLACE-CO presidential lever (Presidential Command Model slice 3/N): costed sack +
  // install. Supersedes the removed broken assign-commander / dismiss-officer handlers
  // (which read the stale state.named_officers path and applied no cost).
  stageCoReplacementOrder: (payload) => ipcRenderer.invoke('stage-co-replacement-order', payload),
  dismissEventNotification: (notificationId) => ipcRenderer.invoke('dismiss-event-notification', { notificationId }),
  respondToEventDecision: (eventId, responseId) => ipcRenderer.invoke('respond-to-event-decision', { eventId, responseId }),
  approveReserveRequest: (requestId, brigadeId, reason) => ipcRenderer.invoke('approve-reserve-request', { requestId, brigadeId, reason }),
  declineReserveRequest: (requestId, reason) => ipcRenderer.invoke('decline-reserve-request', { requestId, reason }),
  recallEliteBrigade: (brigadeId, reason) => ipcRenderer.invoke('recall-elite-brigade', { brigadeId, reason }),
  redirectReserveLoan: (brigadeId, newCorpsId) => ipcRenderer.invoke('redirect-reserve-loan', { brigadeId, newCorpsId }),
  acknowledgeOfficerEvent: (eventId) => ipcRenderer.invoke('acknowledge-officer-event', { eventId }),
  acceptOfficerReplacement: (payload) => ipcRenderer.invoke('accept-officer-replacement', payload),
  setAiCommanderConfig: (payload) => ipcRenderer.invoke('set-ai-commander-config', payload),
  getAiCommanderConfig: () => ipcRenderer.invoke('get-ai-commander-config'),
  getAdvisorRecommendation: (payload) => ipcRenderer.invoke('get-advisor-recommendation', payload),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  resolvePeacePlan: (planId, response) => ipcRenderer.invoke('resolve-peace-plan', { planId, response }),
  submitCounterOffer: (payload) => ipcRenderer.invoke('submit-counter-offer', payload),
  resolveParamilitaryRequests: (decisions) => ipcRenderer.invoke('resolve-paramilitary-requests', { decisions }),
  resolveDayton: (proposal) => ipcRenderer.invoke('resolve-dayton', proposal),
  acknowledgeFrictionEvent: (payload) => ipcRenderer.invoke('acknowledge-friction-event', payload),
  stabilizeCommandRelationship: (payload) => ipcRenderer.invoke('stabilize-command-relationship', payload),
  // Presidential FRONT VISIT (Command Surface §10): read-only availability + initiate.
  getFrontVisitAvailability: () => ipcRenderer.invoke('get-front-visit-availability'),
  initiateFrontVisit: () => ipcRenderer.invoke('initiate-front-visit'),
  // v0.8.4 Phase B: Autonomy bridge
  getAutonomyState: () => ipcRenderer.invoke('get-autonomy-state'),
  setAutonomyLevel: (level) => ipcRenderer.invoke('set-autonomy-level', { level }),
  overrideAiDecision: (level, targetId, faction) => ipcRenderer.invoke('override-ai-decision', { level, target_id: targetId, faction }),
  // v0.8.4 Phase C: Proposal review
  acceptProposal: (proposalId) => ipcRenderer.invoke('accept-proposal', proposalId),
  rejectProposal: (proposalId) => ipcRenderer.invoke('reject-proposal', proposalId),
  // Phase 2 slice 1 "Back the Officer": Level 3 Direct Intervention on an op proposal.
  forceLaunchProposal: (proposalId) => ipcRenderer.invoke('force-launch-proposal', proposalId),
  // "Override without proposal": proactively force-launch a corps plan the officer
  // holds at 'ready' but never surfaced as a proposal.
  proactiveForceLaunchOp: (corpsId, planId) => ipcRenderer.invoke('proactive-force-launch-op', { corpsId, planId }),
  resolveOperationOpportunityDecision: (payload) => ipcRenderer.invoke('resolve-operation-opportunity-decision', payload),
  // v0.9.2 tutorial onboarding (LANE-NIGHTSHIFT-ROUND2 + LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1)
  dismissTutorial: () => ipcRenderer.invoke('tutorial:dismiss'),
  advanceTutorialStep: (stepId) => ipcRenderer.invoke('tutorial:advance-step', { stepId }),
  restartTutorial: () => ipcRenderer.invoke('tutorial:restart'),
});
