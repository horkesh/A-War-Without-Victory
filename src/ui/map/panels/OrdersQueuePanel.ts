/**
 * OrdersQueuePanel — pending orders with cancel buttons for the 3D warmap.
 *
 * Adapted from sandbox's buildOrdersPanel() with warmap NATO blue-steel theme.
 */

import { WARMAP_PANEL_STYLE, WARMAP_BUTTON_RED_STYLE } from './WarMapPanelStack';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WarMapOrderEntry {
    type: 'attack' | 'move' | 'deploy' | 'undeploy' | 'posture';
    brigadeId: string;
    brigadeName: string;
    targetSid?: string;
    destinationSids?: string[];
    posture?: string;
}

// ---------------------------------------------------------------------------
// Build & Update
// ---------------------------------------------------------------------------

export function buildOrdersPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'warmap-orders';
    panel.style.cssText = WARMAP_PANEL_STYLE;
    panel.innerHTML = '<div style="color:#8cb4d8;font-weight:bold;margin-bottom:4px">ORDERS</div><div style="color:#556">No orders queued</div>';
    return panel;
}

export function updateOrdersPanel(
    panel: HTMLElement,
    orders: WarMapOrderEntry[],
    onRemove: (idx: number) => void,
): void {
    let html = `<div style="color:#8cb4d8;font-weight:bold;margin-bottom:4px">ORDERS (${orders.length})</div>`;
    if (orders.length === 0) {
        html += '<div style="color:#556">No orders queued</div>';
    } else {
        for (let i = 0; i < orders.length; i++) {
            const o = orders[i]!;
            let color: string, icon: string, target: string;
            switch (o.type) {
                case 'attack':
                    color = '#ff5555'; icon = '\u2694'; target = o.targetSid ?? '?';
                    break;
                case 'move':
                    color = '#4488cc'; icon = '\u2192'; target = o.destinationSids?.join(', ') ?? '?';
                    break;
                case 'deploy':
                    color = '#66dd88'; icon = '\u25BC'; target = 'DEPLOY';
                    break;
                case 'undeploy':
                    color = '#ffcc44'; icon = '\u25B2'; target = 'UNDEPLOY';
                    break;
                case 'posture':
                    color = '#aa88cc'; icon = '\u25C6'; target = `PST: ${o.posture?.toUpperCase() ?? '?'}`;
                    break;
                default:
                    color = '#888'; icon = '?'; target = '?';
            }
            html += `<div style="display:flex;align-items:center;gap:4px;margin:2px 0">`;
            html += `<span style="color:${color}">${icon}</span>`;
            html += `<span style="flex:1;font-size:10px">${o.brigadeName} \u2192 ${target}</span>`;
            html += `<button data-wm-remove="${i}" style="${WARMAP_BUTTON_RED_STYLE};padding:1px 5px;font-size:9px">X</button>`;
            html += `</div>`;
        }
    }
    panel.innerHTML = html;

    // Wire up remove buttons
    panel.querySelectorAll('[data-wm-remove]').forEach((btn) => {
        (btn as HTMLElement).onclick = () => {
            const idx = parseInt((btn as HTMLElement).dataset.wmRemove ?? '0', 10);
            onRemove(idx);
        };
    });
}
