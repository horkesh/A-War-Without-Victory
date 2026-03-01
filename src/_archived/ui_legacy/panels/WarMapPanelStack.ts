/**
 * WarMapPanelStack — right-side panel container for the 3D operational warmap.
 *
 * Blue-steel NATO aesthetic (distinct from sandbox green CRT).
 * Contains: SelectionPanel, OrdersPanel, BattleLogPanel, ForcesSummaryPanel.
 */

// ---------------------------------------------------------------------------
// Shared panel styles (warmap NATO palette)
// ---------------------------------------------------------------------------

export const WARMAP_PANEL_STYLE = [
    'background:rgba(4,4,12,0.92)',
    'border:1px solid rgba(26,42,62,0.8)',
    'border-left:3px solid #4a6a90',
    'padding:10px 12px',
    'font:11px "IBM Plex Mono", monospace',
    'color:#8090a0',
    'line-height:1.5',
    'pointer-events:all',
].join(';');

export const WARMAP_BUTTON_STYLE = [
    'background:rgba(74,106,144,0.20)',
    'border:1px solid rgba(74,106,144,0.5)',
    'color:#8cb4d8',
    'padding:4px 10px',
    'font:11px "IBM Plex Mono", monospace',
    'cursor:pointer',
    'margin:2px',
].join(';');

export const WARMAP_BUTTON_RED_STYLE = WARMAP_BUTTON_STYLE
    .replace('74,106,144', '200,60,60')
    .replace('#8cb4d8', '#ff6666');

export const WARMAP_BUTTON_GREEN_STYLE = WARMAP_BUTTON_STYLE
    .replace('74,106,144', '60,160,80')
    .replace('#8cb4d8', '#66dd88');

export const WARMAP_BUTTON_YELLOW_STYLE = WARMAP_BUTTON_STYLE
    .replace('74,106,144', '200,160,40')
    .replace('#8cb4d8', '#ffcc44');

// ---------------------------------------------------------------------------
// Panel container
// ---------------------------------------------------------------------------

export function buildPanelStack(): HTMLElement {
    const stack = document.createElement('div');
    stack.id = 'warmap-panel-stack';
    stack.style.cssText = [
        'position:absolute', 'top:44px', 'right:12px', 'bottom:36px', 'width:280px',
        'z-index:10', 'display:flex', 'flex-direction:column', 'gap:4px',
        'overflow-y:auto', 'pointer-events:all',
    ].join(';');
    return stack;
}
