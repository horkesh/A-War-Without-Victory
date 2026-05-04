'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const gameStateUpdatedListeners = new Set();
const turnReportUpdatedListeners = new Set();

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
contextBridge.exposeInMainWorld('awwv', {
  loadScenarioDialog: () => ipcRenderer.invoke('load-scenario-dialog'),
  startNewCampaign: (payload) => ipcRenderer.invoke('start-new-campaign', payload),
  loadStateDialog: () => ipcRenderer.invoke('load-state-dialog'),
  saveGame: (payload) => ipcRenderer.invoke('save-game', payload),
  quickSave: () => ipcRenderer.invoke('quick-save'),
  advanceTurn: (payload) => ipcRenderer.invoke('advance-turn', payload),
  subscribeGameStateUpdated: (cb) => subscribe(gameStateUpdatedListeners, cb),
  subscribeTurnReportUpdated: (cb) => subscribe(turnReportUpdatedListeners, cb),
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
  stageBrigadeMovementOrder: (brigadeId, targetSettlementIds) => ipcRenderer.invoke('stage-brigade-movement-order', { brigadeId, targetSettlementIds }),
  queryMovementRange: (brigadeId) => ipcRenderer.invoke('query-movement-range', { brigadeId }),
  queryMovementPath: (brigadeId, destinationSid) => ipcRenderer.invoke('query-movement-path', { brigadeId, destinationSid }),
  queryCombatEstimate: (brigadeId, targetSettlementId) => ipcRenderer.invoke('query-combat-estimate', { brigadeId, targetSettlementId }),
  querySupplyPaths: () => ipcRenderer.invoke('query-supply-paths'),
  queryCorpsSectors: () => ipcRenderer.invoke('query-corps-sectors'),
  queryBattleEvents: () => ipcRenderer.invoke('query-battle-events'),
  clearOrders: (brigadeId) => ipcRenderer.invoke('clear-orders', { brigadeId }),
  stageCorpsStanceOrder: (corpsId, stance) => ipcRenderer.invoke('stage-corps-stance-order', { corpsId, stance }),
  stageSectorStanceOrder: (sectorId, stance) => ipcRenderer.invoke('stage-sector-stance-order', { sectorId, stance }),
  resetSectorStanceToBot: (sectorId) => ipcRenderer.invoke('reset-sector-stance-to-bot', { sectorId }),
  stageLogisticsPriority: (faction, sectorId, priority) => ipcRenderer.invoke('stage-logistics-priority', { faction, sectorId, priority }),
  stageCorpsOperationOrder: (payload) => ipcRenderer.invoke('stage-corps-operation-order', payload),
  queryOperationPrediction: (payload) => ipcRenderer.invoke('query-operation-prediction', payload),
  stageOperationHalt: (payload) => ipcRenderer.invoke('stage-operation-halt', payload),
  stageOperationForceLaunch: (payload) => ipcRenderer.invoke('stage-operation-force-launch', payload),
  stageOperationDecision: (payload) => ipcRenderer.invoke('stage-operation-decision', payload),
  stageAirdropAllocation: (allocations) => ipcRenderer.invoke('stage-airdrop-allocation', { allocations }),
  stageConvoyDecision: (convoyId, decision) => ipcRenderer.invoke('stage-convoy-decision', { convoyId, decision }),
  stageOpsecToggle: (sectorId, active) => ipcRenderer.invoke('stage-opsec-toggle', { sectorId, active }),
  stageMunicipalitySupportOrder: (payload) => ipcRenderer.invoke('stage-municipality-support-order', payload),
  focusWarroom: () => ipcRenderer.invoke('focus-warroom'),
  getMapServerUrl: () => ipcRenderer.invoke('get-map-server-url'),
  stageAssignOperationCommander: (payload) => ipcRenderer.invoke('stage-assign-operation-commander', payload),
  assignCommander: (officerId, corpsId) => ipcRenderer.invoke('assign-commander', { officerId, corpsId }),
  dismissOfficer: (officerId) => ipcRenderer.invoke('dismiss-officer', { officerId }),
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
  resolveDayton: (proposal) => ipcRenderer.invoke('resolve-dayton', proposal),
  acknowledgeFrictionEvent: (payload) => ipcRenderer.invoke('acknowledge-friction-event', payload),
  stabilizeCommandRelationship: (payload) => ipcRenderer.invoke('stabilize-command-relationship', payload),
  // v0.8.4 Phase B: Autonomy bridge
  getAutonomyState: () => ipcRenderer.invoke('get-autonomy-state'),
  setAutonomyLevel: (level) => ipcRenderer.invoke('set-autonomy-level', { level }),
  overrideAiDecision: (level, targetId, faction) => ipcRenderer.invoke('override-ai-decision', { level, target_id: targetId, faction }),
  // v0.8.4 Phase C: Proposal review
  acceptProposal: (proposalId) => ipcRenderer.invoke('accept-proposal', proposalId),
  rejectProposal: (proposalId) => ipcRenderer.invoke('reject-proposal', proposalId),
  resolveOperationOpportunityDecision: (payload) => ipcRenderer.invoke('resolve-operation-opportunity-decision', payload),
  // v0.9.2 tutorial onboarding (LANE-NIGHTSHIFT-ROUND2 + LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1)
  dismissTutorial: () => ipcRenderer.invoke('tutorial:dismiss'),
  advanceTutorialStep: (stepId) => ipcRenderer.invoke('tutorial:advance-step', { stepId }),
  restartTutorial: () => ipcRenderer.invoke('tutorial:restart'),
});
