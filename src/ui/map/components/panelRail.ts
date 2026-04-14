import type { CSSProperties } from 'react';

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
  right: '1rem',
  // Toolbar-safe clearance is injected by App via CSS variable.
  top: 'var(--awwv-toolbar-clearance, 5.5rem)',
  bottom: '2.5rem',
  zIndex: 100,
  overflow: 'hidden',
};

/**
 * Nested panel anchored to the LEFT sidebar (width 18rem/w-72).
 * Slides out immediately to the right of the Command sidebar.
 */
export const LEFT_DETAIL_PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  left: '18rem', // Width of OOBSidebar (w-72 = 18rem)
  top: 'var(--awwv-toolbar-clearance, 5.5rem)',
  bottom: '2.5rem',
  zIndex: 100,
  overflow: 'hidden',
};

/**
 * Secondary panel — slides out to the LEFT of the primary panel.
 */
export const SECONDARY_PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  right: '25.5rem', // Offset by primary panel width (24rem + 1rem padding + 0.5rem gap)
  top: 'var(--awwv-toolbar-clearance, 5.5rem)',
  bottom: '2.5rem',
  zIndex: 90, // Slightly behind primary
  overflow: 'hidden',
};

/**
 * Secondary nested panel anchored to the LEFT.
 * Appears to the right of LEFT_DETAIL_PANEL_STYLE.
 */
export const LEFT_SECONDARY_PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  left: '42.5rem', // 18rem (sidebar) + 24rem (primary) + 0.5rem (gap)
  top: 'var(--awwv-toolbar-clearance, 5.5rem)',
  bottom: '2.5rem',
  zIndex: 90,
  overflow: 'hidden',
};

/**
 * Right-edge panel — flush to the right side of the screen (e.g. settlement info).
 */
export const RIGHT_PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 'var(--awwv-toolbar-clearance, 5.5rem)',
  bottom: '2.5rem',
  zIndex: 50,
  overflow: 'hidden',
};

export function derivePanelRailState(state: PanelRailSelectionState): PanelRailState {
  if (state.selectedOrbatCorpsId) return { primary: 'orbat', secondary: null };

  // Army HQ reserve panel (elite brigades) — drill-down to brigade as secondary
  if (state.selectedArmyHqId) {
    if (state.selectedFormationId) return { primary: 'army_reserve', secondary: 'formation' };
    return { primary: 'army_reserve', secondary: null };
  }

  // Priority 1: Selection with Parent context (Drill-down)
  if (state.selectedFormationId) {
    if (state.selectedCorpsFrontSectorId) return { primary: 'sector', secondary: 'formation' };
    if (state.selectedCorpsId) return { primary: 'corps', secondary: 'formation' };
    if (state.selectedArmyId) return { primary: 'army', secondary: 'formation' };

    // Formation + Settlement
    if (state.selectedOsid) return { primary: 'formation', secondary: 'settlement' };
    return { primary: 'formation', secondary: null };
  }

  if (state.selectedCorpsFrontSectorId) {
    if (state.selectedCorpsId) return { primary: 'corps', secondary: 'sector' };

    // Sector + Settlement
    if (state.selectedOsid) return { primary: 'sector', secondary: 'settlement' };
    return { primary: 'sector', secondary: null };
  }

  if (state.selectedCorpsId) {
    if (state.selectedArmyId) return { primary: 'army', secondary: 'corps' };

    // Corps + Settlement
    if (state.selectedOsid) return { primary: 'corps', secondary: 'settlement' };
    return { primary: 'corps', secondary: null };
  }

  if (state.selectedArmyId) {
    if (state.selectedOsid) return { primary: 'army', secondary: 'settlement' };
    return { primary: 'army', secondary: null };
  }

  // Priority 2: Pure Settlement Selection (No parent context)
  // FIX: Assign to primary instead of secondary to avoid starting with a gap
  if (state.selectedOsid) return { primary: 'settlement', secondary: null };

  // Default: Presidential Inbox when nothing is selected
  return { primary: 'inbox', secondary: null };
}

export function getPanelRailStyle(
  slot: 'primary' | 'secondary',
  width: string,
  anchor: 'left' | 'right' = 'right'
): CSSProperties {
  if (anchor === 'left') {
    return {
      ...(slot === 'secondary' ? LEFT_SECONDARY_PANEL_STYLE : LEFT_DETAIL_PANEL_STYLE),
      width,
    };
  }
  return {
    ...(slot === 'secondary' ? SECONDARY_PANEL_STYLE : DETAIL_PANEL_STYLE),
    width,
  };
}

/** Style for the settlement panel anchored to the right edge of the viewport. */
export function getRightPanelStyle(width: string): CSSProperties {
  return { ...RIGHT_PANEL_STYLE, width };
}
