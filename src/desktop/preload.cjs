'use strict';
const { contextBridge, ipcRenderer } = require('electron');
let replayLoadedCallback = null;
let gameStateUpdatedCallback = null;
let turnReportUpdatedCallback = null;
ipcRenderer.on('replay-loaded', (_event, data) => {
  if (replayLoadedCallback) replayLoadedCallback(data);
});
ipcRenderer.on('game-state-updated', (_event, stateJson) => {
  if (gameStateUpdatedCallback) gameStateUpdatedCallback(stateJson);
});
ipcRenderer.on('turn-report-updated', (_event, report) => {
  if (turnReportUpdatedCallback) turnReportUpdatedCallback(report);
});
contextBridge.exposeInMainWorld('awwv', {
  loadReplayDialog: () => ipcRenderer.invoke('load-replay-dialog'),
  getLastReplayContent: () => ipcRenderer.invoke('get-last-replay'),
  setReplayLoadedCallback: (cb) => { replayLoadedCallback = typeof cb === 'function' ? cb : null; },
  loadScenarioDialog: () => ipcRenderer.invoke('load-scenario-dialog'),
  startNewCampaign: (payload) => ipcRenderer.invoke('start-new-campaign', payload),
  loadStateDialog: () => ipcRenderer.invoke('load-state-dialog'),
  advanceTurn: (payload) => ipcRenderer.invoke('advance-turn', payload),
  setGameStateUpdatedCallback: (cb) => { gameStateUpdatedCallback = typeof cb === 'function' ? cb : null; },
  setTurnReportUpdatedCallback: (cb) => { turnReportUpdatedCallback = typeof cb === 'function' ? cb : null; },
  getCurrentGameState: () => ipcRenderer.invoke('get-current-game-state'),
  openTacticalMapWindow: (payload) => ipcRenderer.invoke('open-tactical-map-window', payload),
  getRecruitmentCatalog: () => ipcRenderer.invoke('get-recruitment-catalog'),
  applyRecruitment: (brigadeId, equipmentClass) => ipcRenderer.invoke('apply-recruitment', { brigadeId, equipmentClass }),
  stageAttackOrder: (brigadeId, targetSettlementId) => ipcRenderer.invoke('stage-attack-order', { brigadeId, targetSettlementId }),
  stagePostureOrder: (brigadeId, posture) => ipcRenderer.invoke('stage-posture-order', { brigadeId, posture }),
  stageMoveOrder: (brigadeId, targetMunicipalityId) => ipcRenderer.invoke('stage-move-order', { brigadeId, targetMunicipalityId }),
  stageDeployOrder: (brigadeId) => ipcRenderer.invoke('stage-deploy-order', { brigadeId }),
  stageUndeployOrder: (brigadeId) => ipcRenderer.invoke('stage-undeploy-order', { brigadeId }),
  assignBrigadeToFront: (brigadeId, frontId) => ipcRenderer.invoke('assign-brigade-to-front', { brigadeId, frontId }),
  renameFrontSegment: (frontId, name) => ipcRenderer.invoke('rename-front-segment', { frontId, name }),
  renameTheatre: (theatreId, name) => ipcRenderer.invoke('rename-theatre', { theatreId, name }),
  stageBrigadeAoROrder: (settlementId, fromBrigadeId, toBrigadeId) => ipcRenderer.invoke('stage-brigade-aor-order', { settlementId, fromBrigadeId, toBrigadeId }),
  stageCorpsFrontOrder: (corpsId, edgeIds) => ipcRenderer.invoke('stage-corps-front-order', { corpsId, edgeIds }),
  stageCorpsAttackAxisOrder: (corpsId, edgeIds) => ipcRenderer.invoke('stage-corps-attack-axis-order', { corpsId, edgeIds }),
  stageOgSubfrontOrder: (ogId, corpsId, edgeIds) => ipcRenderer.invoke('stage-og-subfront-order', { ogId, corpsId, edgeIds }),
  stageBrigadeMovementOrder: (brigadeId, targetSettlementIds) => ipcRenderer.invoke('stage-brigade-movement-order', { brigadeId, targetSettlementIds }),
  stageBrigadeRepositionOrder: (brigadeId, settlementIds) => ipcRenderer.invoke('stage-brigade-reposition-order', { brigadeId, settlementIds }),
  queryMovementRange: (brigadeId) => ipcRenderer.invoke('query-movement-range', { brigadeId }),
  queryMovementPath: (brigadeId, destinationSid) => ipcRenderer.invoke('query-movement-path', { brigadeId, destinationSid }),
  queryCombatEstimate: (brigadeId, targetSettlementId) => ipcRenderer.invoke('query-combat-estimate', { brigadeId, targetSettlementId }),
  querySupplyPaths: () => ipcRenderer.invoke('query-supply-paths'),
  queryCorpsSectors: () => ipcRenderer.invoke('query-corps-sectors'),
  queryBattleEvents: () => ipcRenderer.invoke('query-battle-events'),
  setBrigadeDesiredAoRCap: (brigadeId, cap) => ipcRenderer.invoke('set-brigade-desired-aor-cap', { brigadeId, cap }),
  clearOrders: (brigadeId) => ipcRenderer.invoke('clear-orders', { brigadeId }),
  stageCorpsStanceOrder: (corpsId, stance) => ipcRenderer.invoke('stage-corps-stance-order', { corpsId, stance }),
  focusWarroom: () => ipcRenderer.invoke('focus-warroom'),
  getMapServerUrl: () => ipcRenderer.invoke('get-map-server-url'),
});
