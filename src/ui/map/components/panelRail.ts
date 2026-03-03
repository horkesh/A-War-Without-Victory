import type { CSSProperties } from 'react';

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
