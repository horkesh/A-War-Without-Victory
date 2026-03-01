/**
 * SelectionPanel — formation stats, posture, deploy/undeploy for the 3D warmap.
 *
 * Adapted from sandbox's buildSelectionPanel() with warmap NATO blue-steel theme.
 */

import { WARMAP_PANEL_STYLE, WARMAP_BUTTON_STYLE, WARMAP_BUTTON_YELLOW_STYLE, WARMAP_BUTTON_GREEN_STYLE } from './WarMapPanelStack';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WarMapFormationInfo {
    id: string;
    name: string;
    faction: string;
    kind: string;
    personnel: number;
    posture: string;
    cohesion?: number;
    fatigue?: number;
    hq_sid?: string;
    status: string;
    movement_stance?: string;
    movement_status?: string;
    composition?: {
        infantry?: number;
        tanks?: number;
        artillery?: number;
        aa_systems?: number;
    };
}

export interface SelectionPanelCallbacks {
    onPostureChange?: (brigadeId: string, posture: string) => void;
    onDeploy?: (brigadeId: string) => void;
    onUndeploy?: (brigadeId: string) => void;
}

const FACTION_COLORS: Record<string, string> = {
    RS: '#b05050', RBiH: '#50a060', HRHB: '#5080b0',
};

const POSTURE_COLORS: Record<string, string> = {
    defend: '#4a8acc', probe: '#cccc44', attack: '#ff5555',
    elastic_defense: '#7a6acc', consolidation: '#66ccaa',
};

// ---------------------------------------------------------------------------
// Build & Update
// ---------------------------------------------------------------------------

export function buildSelectionPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'warmap-selection';
    panel.style.cssText = WARMAP_PANEL_STYLE;
    panel.innerHTML = '<div style="color:#8cb4d8;font-weight:bold;margin-bottom:4px">SELECTION</div><div style="color:#556">Click a formation to inspect</div>';
    return panel;
}

export function updateSelectionPanel(
    panel: HTMLElement,
    formation: WarMapFormationInfo | null,
    callbacks?: SelectionPanelCallbacks,
    deploymentStatus?: string | null,
): void {
    if (!formation) {
        panel.innerHTML = '<div style="color:#8cb4d8;font-weight:bold;margin-bottom:4px">SELECTION</div><div style="color:#556">Click a formation to inspect</div>';
        return;
    }

    const fc = FACTION_COLORS[formation.faction] ?? '#888';
    const pc = POSTURE_COLORS[formation.posture] ?? '#888';

    let html = `<div style="color:#8cb4d8;font-weight:bold;margin-bottom:4px">${formation.name || formation.id}</div>`;
    html += `<div style="color:${fc}">${formation.faction} &mdash; ${formation.kind}</div>`;
    html += `<div>PRS: <b style="color:#c0d0e0">${formation.personnel}</b></div>`;
    html += `<div>PST: <b style="color:${pc}">${formation.posture}</b></div>`;

    if (formation.cohesion !== undefined) {
        const cohColor = formation.cohesion >= 55 ? '#66cc88' : formation.cohesion >= 35 ? '#cccc44' : '#ff6666';
        html += `<div>COH: <b style="color:${cohColor}">${Math.round(formation.cohesion)}%</b></div>`;
    }
    if (formation.fatigue !== undefined) {
        const fatColor = formation.fatigue <= 20 ? '#66cc88' : formation.fatigue <= 45 ? '#cccc44' : '#ff6666';
        html += `<div>FAT: <b style="color:${fatColor}">${Math.round(formation.fatigue)}%</b></div>`;
    }
    if (formation.hq_sid) html += `<div>HQ: ${formation.hq_sid}</div>`;
    html += `<div>STS: ${formation.status}</div>`;

    // Deployment status
    const effectiveStatus = deploymentStatus ?? 'deployed';
    const DEPLOY_COLORS: Record<string, string> = {
        undeployed: '#ffaa00', deploying: '#44cccc', undeploying: '#ff8844', deployed: '#66dd88',
    };
    const DEPLOY_LABELS: Record<string, string> = {
        undeployed: 'UNDEPLOYED \u2014 Column march',
        deploying: 'DEPLOYING... (advance turn)',
        undeploying: 'UNDEPLOYING... (advance turn)',
        deployed: 'DEPLOYED \u2014 Combat posture',
    };
    const statusColor = DEPLOY_COLORS[effectiveStatus] ?? '#888';
    const statusLabel = DEPLOY_LABELS[effectiveStatus] ?? effectiveStatus.toUpperCase();
    html += `<div style="color:${statusColor};font-weight:bold;margin-top:4px">\u25A0 ${statusLabel}</div>`;

    // Equipment composition
    if (formation.composition) {
        const c = formation.composition;
        html += '<div style="margin-top:4px;border-top:1px solid rgba(74,106,144,0.3);padding-top:4px">';
        html += `<div>INF: ${c.infantry ?? 0} | TNK: ${c.tanks ?? 0}</div>`;
        html += `<div>ART: ${c.artillery ?? 0} | AA: ${c.aa_systems ?? 0}</div>`;
        html += '</div>';
    }

    // Posture selector
    if (formation.kind === 'brigade' && callbacks?.onPostureChange) {
        html += '<div style="margin-top:6px" id="wm-posture-select-container"></div>';
    }

    // Deploy/Undeploy buttons
    if (formation.kind === 'brigade') {
        if (effectiveStatus === 'undeployed' && callbacks?.onDeploy) {
            html += '<div style="margin-top:6px" id="wm-deploy-btn-container"></div>';
        }
        if ((effectiveStatus === 'deployed' || !deploymentStatus) && callbacks?.onUndeploy) {
            html += '<div style="margin-top:6px" id="wm-undeploy-btn-container"></div>';
        }
    }

    panel.innerHTML = html;

    // Wire posture dropdown
    const postureContainer = panel.querySelector('#wm-posture-select-container');
    if (postureContainer && callbacks?.onPostureChange) {
        const select = document.createElement('select');
        select.style.cssText = 'background:#0a0a16;color:#8090a0;border:1px solid rgba(74,106,144,0.4);padding:2px 4px;font:10px "IBM Plex Mono",monospace;width:100%';
        for (const p of ['defend', 'probe', 'attack', 'elastic_defense', 'consolidation']) {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p.toUpperCase();
            if (p === formation.posture) opt.selected = true;
            select.appendChild(opt);
        }
        select.onchange = () => callbacks.onPostureChange!(formation.id, select.value);
        const label = document.createElement('span');
        label.textContent = 'SET POSTURE: ';
        label.style.cssText = 'color:#556;font-size:10px';
        postureContainer.appendChild(label);
        postureContainer.appendChild(select);
    }

    // Wire deploy button
    const deployContainer = panel.querySelector('#wm-deploy-btn-container');
    if (deployContainer && callbacks?.onDeploy) {
        const btn = document.createElement('button');
        btn.textContent = '\u25BC DEPLOY (expand AoR, 1 turn)';
        btn.style.cssText = WARMAP_BUTTON_GREEN_STYLE + ';width:100%';
        btn.onclick = () => callbacks.onDeploy!(formation.id);
        deployContainer.appendChild(btn);
    }

    // Wire undeploy button
    const undeployContainer = panel.querySelector('#wm-undeploy-btn-container');
    if (undeployContainer && callbacks?.onUndeploy) {
        const btn = document.createElement('button');
        btn.textContent = '\u25B2 UNDEPLOY (contract to HQ, 1 turn)';
        btn.style.cssText = WARMAP_BUTTON_YELLOW_STYLE + ';width:100%';
        btn.onclick = () => callbacks.onUndeploy!(formation.id);
        undeployContainer.appendChild(btn);
    }
}
