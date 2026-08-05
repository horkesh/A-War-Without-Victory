import type { CSSProperties } from 'react';
import { Z } from '../../shared/zIndex';

export type PanelRailPanel =
  | 'inbox'
  | 'settlement'
  | 'formation'
  | 'corps'
  | 'army'
  | 'army_reserve'
  | 'sector'
  | 'operation'
  | 'orbat';

export interface PanelRailSelectionState {
  selectedOsid: string | null;
  selectedArmyId: string | null;
  selectedArmyHqId: string | null;
  selectedCorpsId: string | null;
  selectedCorpsFrontSectorId: string | null;
  selectedFormationId: string | null;
  selectedOperationKey: string | null;
  selectedOrbatCorpsId: string | null;
}

export interface BreadcrumbLevel {
  panel: PanelRailPanel;
  id: string;
}

export interface PanelRailState {
  panel: PanelRailPanel | null;
  trail: BreadcrumbLevel[];
}

/**
 * Shared inline style for all entity slide-out panels to the right of the OOBSidebar.
 * Width is specified per-panel: { ...DETAIL_PANEL_STYLE, width: '24rem' }
 */
export const DETAIL_PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  right: 0,
  // Toolbar-safe clearance is injected by App via CSS variable.
  top: 'var(--awwv-toolbar-clearance, 5.5rem)',
  bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)',
  zIndex: Z.PANEL_RAIL_PRIMARY,
  overflow: 'hidden',
};

/**
 * Nested panels anchored to the left Command sidebar.
 * Keep these offsets in sync with OOBSidebar's `w-[15.5rem]`.
 */
const LEFT_SIDEBAR_WIDTH = '15.5rem';
const PANEL_GAP = '0.5rem';
const LEFT_PRIMARY_OFFSET = `calc(${LEFT_SIDEBAR_WIDTH} + ${PANEL_GAP})`;

export const LEFT_DETAIL_PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  left: LEFT_PRIMARY_OFFSET,
  top: 'var(--awwv-toolbar-clearance, 5.5rem)',
  bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)',
  zIndex: Z.PANEL_RAIL_PRIMARY,
  overflow: 'hidden',
};

/**
 * Right-edge panel — flush to the right side of the screen (e.g. settlement info).
 */
export const RIGHT_PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 'var(--awwv-toolbar-clearance, 5.5rem)',
  bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)',
  zIndex: Z.PANEL_RAIL_TERTIARY,
  overflow: 'hidden',
};

export function derivePanelRailState(state: PanelRailSelectionState): PanelRailState {
  if (state.selectedOrbatCorpsId) return { panel: 'orbat', trail: [] };

  if (state.selectedArmyHqId) {
    if (state.selectedFormationId) {
      return {
        panel: 'formation',
        trail: [{ panel: 'army_reserve', id: state.selectedArmyHqId }],
      };
    }
    return { panel: 'army_reserve', trail: [] };
  }

  if (state.selectedFormationId) {
    const trail: BreadcrumbLevel[] = [];
    if (state.selectedArmyId) trail.push({ panel: 'army', id: state.selectedArmyId });
    if (state.selectedCorpsId) trail.push({ panel: 'corps', id: state.selectedCorpsId });
    if (state.selectedCorpsFrontSectorId) trail.push({ panel: 'sector', id: state.selectedCorpsFrontSectorId });
    return { panel: 'formation', trail };
  }

  if (state.selectedCorpsFrontSectorId) {
    return {
      panel: 'sector',
      trail: state.selectedCorpsId ? [{ panel: 'corps', id: state.selectedCorpsId }] : [],
    };
  }

  if (state.selectedCorpsId) {
    return {
      panel: 'corps',
      trail: state.selectedArmyId ? [{ panel: 'army', id: state.selectedArmyId }] : [],
    };
  }

  if (state.selectedArmyId) {
    return { panel: 'army', trail: [] };
  }

  if (state.selectedOsid) return { panel: 'settlement', trail: [] };

  return { panel: 'inbox', trail: [] };
}

export function shouldRenderInboxPanel(
  panel: PanelRailPanel | null,
  operationsPanelOpen: boolean,
): boolean {
  return panel === 'inbox' && !operationsPanelOpen;
}

/**
 * The compact map legend and left-anchored detail rails occupy the same map
 * corridor. Keep one visible owner so opening a sector/corps/unit dossier never
 * leaves readable legend content hidden underneath it.
 */
export function shouldRenderMapModeLegend(panel: PanelRailPanel | null): boolean {
  return panel === 'inbox' || panel === null;
}

export interface TacticalDetailRailOwnerState {
  operationsPanelOpen: boolean;
  armyHQOpen: boolean;
  codexOpen: boolean;
  chronicleOpen: boolean;
}

export function shouldRenderTacticalDetailRails(state: TacticalDetailRailOwnerState): boolean {
  return !state.operationsPanelOpen
    && !state.armyHQOpen
    && !state.codexOpen
    && !state.chronicleOpen;
}

export interface CommandBriefingOwnerState {
  panel: PanelRailPanel | null;
  operationsPanelOpen: boolean;
  armyHQOpen: boolean;
  recruitmentOpen: boolean;
  autonomyOpen: boolean;
  chronicleOpen: boolean;
  codexOpen: boolean;
  fullOverlayOpen: boolean;
}

export function shouldRenderCommandBriefing(state: CommandBriefingOwnerState): boolean {
  return state.panel === 'inbox'
    && !state.operationsPanelOpen
    && !state.armyHQOpen
    && !state.recruitmentOpen
    && !state.autonomyOpen
    && !state.chronicleOpen
    && !state.codexOpen
    && !state.fullOverlayOpen;
}

export function getPanelRailStyle(
  _slot: 'primary' | 'secondary',
  width: string,
  anchor: 'left' | 'right' = 'right'
): CSSProperties {
  if (anchor === 'left') {
    return {
      ...LEFT_DETAIL_PANEL_STYLE,
      width,
    };
  }
  return {
    ...DETAIL_PANEL_STYLE,
    width,
  };
}

/** Style for the settlement panel anchored to the right edge of the viewport. */
export function getRightPanelStyle(width: string): CSSProperties {
  return { ...RIGHT_PANEL_STYLE, width };
}
