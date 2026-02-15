'use strict';
const { contextBridge, ipcRenderer } = require('electron');
let replayLoadedCallback = null;
let gameStateUpdatedCallback = null;
ipcRenderer.on('replay-loaded', (_event, data) => {
  if (replayLoadedCallback) replayLoadedCallback(data);
});
ipcRenderer.on('game-state-updated', (_event, stateJson) => {
  if (gameStateUpdatedCallback) gameStateUpdatedCallback(stateJson);
});
contextBridge.exposeInMainWorld('awwv', {
  loadReplayDialog: () => ipcRenderer.invoke('load-replay-dialog'),
  getLastReplayContent: () => ipcRenderer.invoke('get-last-replay'),
  setReplayLoadedCallback: (cb) => { replayLoadedCallback = typeof cb === 'function' ? cb : null; },
  loadScenarioDialog: () => ipcRenderer.invoke('load-scenario-dialog'),
  startNewCampaign: (payload) => ipcRenderer.invoke('start-new-campaign', payload),
  loadStateDialog: () => ipcRenderer.invoke('load-state-dialog'),
  advanceTurn: () => ipcRenderer.invoke('advance-turn'),
  setGameStateUpdatedCallback: (cb) => { gameStateUpdatedCallback = typeof cb === 'function' ? cb : null; },
  getRecruitmentCatalog: () => ipcRenderer.invoke('get-recruitment-catalog'),
  applyRecruitment: (brigadeId, equipmentClass) => ipcRenderer.invoke('apply-recruitment', { brigadeId, equipmentClass }),
  stageAttackOrder: (brigadeId, targetSettlementId) => ipcRenderer.invoke('stage-attack-order', { brigadeId, targetSettlementId }),
  stagePostureOrder: (brigadeId, posture) => ipcRenderer.invoke('stage-posture-order', { brigadeId, posture }),
  stageMoveOrder: (brigadeId, targetMunicipalityId) => ipcRenderer.invoke('stage-move-order', { brigadeId, targetMunicipalityId }),
  clearOrders: (brigadeId) => ipcRenderer.invoke('clear-orders', { brigadeId }),
});
