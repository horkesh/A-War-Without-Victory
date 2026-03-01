/**
 * ForcesSummaryPanel — per-faction brigade count + personnel for the 3D warmap.
 *
 * Adapted from sandbox's buildResourcePanel() with warmap NATO blue-steel theme.
 */

import { WARMAP_PANEL_STYLE } from './WarMapPanelStack';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FactionForceSummary {
    id: string;
    brigadeCount: number;
    totalPersonnel: number;
}

const FACTION_COLORS: Record<string, string> = {
    RS: '#cc5555', RBiH: '#55aa66', HRHB: '#5588bb',
};

// ---------------------------------------------------------------------------
// Build & Update
// ---------------------------------------------------------------------------

export function buildForcesPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'warmap-forces';
    panel.style.cssText = WARMAP_PANEL_STYLE;
    panel.innerHTML = '<div style="color:#8cb4d8;font-weight:bold;margin-bottom:4px">FORCES</div><div style="color:#556">No data</div>';
    return panel;
}

export function updateForcesPanel(
    panel: HTMLElement,
    factions: FactionForceSummary[],
): void {
    let html = '<div style="color:#8cb4d8;font-weight:bold;margin-bottom:4px">FORCES</div>';
    if (factions.length === 0) {
        html += '<div style="color:#556">No data</div>';
    } else {
        for (const f of factions) {
            const fc = FACTION_COLORS[f.id] ?? '#888';
            const persStr = f.totalPersonnel >= 1000
                ? `${(f.totalPersonnel / 1000).toFixed(1)}k`
                : `${f.totalPersonnel}`;
            html += `<div style="color:${fc};margin:2px 0"><b>${f.id}</b>: ${f.brigadeCount} bdes, ${persStr} pers</div>`;
        }
    }
    panel.innerHTML = html;
}
