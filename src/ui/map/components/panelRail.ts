import type { CSSProperties } from 'react';

export type PanelRailPanel = 'settlement' | 'army' | 'corps' | 'sector' | 'formation' | 'operation';

export interface PanelRailSelectionState {
  selectedOsid: string | null;
  selectedArmyId: string | null;
  selectedCorpsId: string | null;
  selectedCorpsFrontSectorId: string | null;
  selectedFormationId: string | null;
  selectedOperationKey: string | null;
}

export interface PanelRailState {
  primary: PanelRailPanel | null;
  secondary: PanelRailPanel | null;
}

/**
 * Shared inline style for all entity slide-out panels to the right of the OOBSidebar.
 * Width is specified per-panel: { ...DETAIL_PANEL_STYLE, width: '24rem' }
 */
export const DETAIL_PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  left: '19rem',
  top: '3.5rem',
  bottom: '2rem',
  zIndex: 50,
  overflow: 'hidden',
};

/**
 * Secondary panel — further right, for nested panels or detail-within-detail.
 */
export const SECONDARY_PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  left: '43rem',
  top: '3.5rem',
  bottom: '2rem',
  zIndex: 50,
  overflow: 'hidden',
};

export function derivePanelRailState(state: PanelRailSelectionState): PanelRailState {
  if (state.selectedFormationId) {
    if (state.selectedCorpsFrontSectorId) return { primary: 'sector', secondary: 'formation' };
    if (state.selectedCorpsId) return { primary: 'corps', secondary: 'formation' };
    if (state.selectedArmyId) return { primary: 'army', secondary: 'formation' };
    return { primary: 'formation', secondary: null };
  }

  if (state.selectedOperationKey) {
    if (state.selectedCorpsFrontSectorId) return { primary: 'sector', secondary: 'operation' };
    if (state.selectedCorpsId) return { primary: 'corps', secondary: 'operation' };
    return { primary: 'operation', secondary: null };
  }

  if (state.selectedCorpsFrontSectorId) {
    if (state.selectedCorpsId) return { primary: 'corps', secondary: 'sector' };
    return { primary: 'sector', secondary: null };
  }

  if (state.selectedCorpsId) {
    if (state.selectedArmyId) return { primary: 'army', secondary: 'corps' };
    return { primary: 'corps', secondary: null };
  }

  if (state.selectedArmyId) return { primary: 'army', secondary: null };
  if (state.selectedOsid) return { primary: 'settlement', secondary: null };
  return { primary: null, secondary: null };
}

export function getPanelRailStyle(slot: 'primary' | 'secondary', width: string): CSSProperties {
  return {
    ...(slot === 'secondary' ? SECONDARY_PANEL_STYLE : DETAIL_PANEL_STYLE),
    width,
  };
}
