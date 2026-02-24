/**
 * BattleLogPanel — scrollable turn-by-turn combat log for the 3D warmap.
 *
 * Adapted from sandbox's buildBattleLog() with warmap NATO blue-steel theme.
 */

import { WARMAP_PANEL_STYLE } from './WarMapPanelStack';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BattleEvent {
    turn: number;
    settlement_id: string;
    from: string | null;
    to: string | null;
    mechanism: string;
    mun_id: string | null;
}

// ---------------------------------------------------------------------------
// Build & Update
// ---------------------------------------------------------------------------

export function buildBattleLogPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'warmap-battlelog';
    panel.style.cssText = WARMAP_PANEL_STYLE + ';flex:1;min-height:100px;overflow-y:auto;max-height:300px';
    panel.innerHTML = '<div style="color:#8cb4d8;font-weight:bold;margin-bottom:4px">BATTLE LOG</div><div style="color:#556">No battles yet</div>';
    return panel;
}

export function appendBattleLogEntry(
    panel: HTMLElement,
    turn: number,
    events: BattleEvent[],
    movementProcessed?: boolean,
    postureApplied?: boolean,
): void {
    // Remove placeholder
    const placeholder = panel.querySelector('div[style*="color:#556"]');
    if (placeholder && placeholder.textContent === 'No battles yet') {
        placeholder.remove();
    }

    const entry = document.createElement('div');
    entry.style.cssText = 'border-top:1px solid rgba(74,106,144,0.2);padding-top:4px;margin-top:4px;font-size:10px';

    let html = `<div style="color:#4a8acc;font-weight:bold">\u2500\u2500 Turn ${turn} \u2500\u2500</div>`;

    const flips = events.filter(e => e.mechanism === 'control_flip' || e.to !== null);
    const battles = events.filter(e => e.mechanism === 'battle' || e.mechanism === 'attack');

    if (flips.length === 0 && battles.length === 0) {
        html += '<div style="color:#556">No battles this turn</div>';
    } else {
        for (const ev of flips) {
            const fromColor = FACTION_EVENT_COLORS[ev.from ?? ''] ?? '#888';
            const toColor = FACTION_EVENT_COLORS[ev.to ?? ''] ?? '#888';
            html += `<div>${ev.settlement_id}: <span style="color:${fromColor}">${ev.from ?? '?'}</span> \u2192 <span style="color:${toColor}">${ev.to ?? '?'}</span></div>`;
        }
        for (const ev of battles) {
            const color = ev.to ? '#66dd88' : '#ff6666';
            html += `<div style="color:${color};margin-left:8px">\u2694 ${ev.settlement_id} (${ev.mechanism})</div>`;
        }
    }

    if (movementProcessed) {
        html += '<div style="color:#4488cc">Movement orders processed</div>';
    }
    if (postureApplied) {
        html += '<div style="color:#cccc44">Posture orders applied</div>';
    }

    entry.innerHTML = html;
    panel.appendChild(entry);
    panel.scrollTop = panel.scrollHeight;
}

const FACTION_EVENT_COLORS: Record<string, string> = {
    RS: '#cc5555', RBiH: '#55aa66', HRHB: '#5588bb',
};
