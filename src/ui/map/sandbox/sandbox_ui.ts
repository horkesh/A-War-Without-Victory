/**
 * Sandbox UI — HTML overlay panels for the tactical sandbox viewer.
 *
 * Dark NATO aesthetic matching the staff map info panel style.
 * All panels are positioned as HTML overlays on top of the Three.js canvas.
 */

import type { SandboxTurnReport } from './sandbox_engine.js';
import { SANDBOX_REGIONS } from './sandbox_scenarios.js';
import type { SliceFormation } from './sandbox_slice.js';

// ---------------------------------------------------------------------------
// Faction colors
// ---------------------------------------------------------------------------

const FACTION_COLORS: Record<string, string> = {
    RS: 'rgb(180, 50, 50)',
    RBiH: 'rgb(55, 140, 75)',
    HRHB: 'rgb(50, 110, 170)',
};

const POSTURE_COLORS: Record<string, string> = {
    defend: '#44aaff',
    probe: '#cccc44',
    attack: '#ff4444',
    elastic_defense: '#66ccaa',
    consolidation: '#aa88ff',
};

// ---------------------------------------------------------------------------
// Panel CSS (shared)
// ---------------------------------------------------------------------------

const PANEL_STYLE = [
    'background:rgba(10,10,22,0.92)',
    'border:1px solid rgba(0,255,136,0.25)',
    'border-left:3px solid #00ff88',
    'padding:10px 12px',
    'font:11px "Courier New", Courier, monospace',
    'color:#c0d8e0',
    'line-height:1.5',
    'pointer-events:all',
].join(';');

const BUTTON_STYLE = [
    'background:rgba(0,255,136,0.15)',
    'border:1px solid rgba(0,255,136,0.4)',
    'color:#00ff88',
    'padding:4px 10px',
    'font:11px "Courier New", Courier, monospace',
    'cursor:pointer',
    'margin:2px',
].join(';');

const BUTTON_RED_STYLE = BUTTON_STYLE.replace('0,255,136', '255,60,60').replace('#00ff88', '#ff4444');

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

export interface ToolbarCallbacks {
    onRegionChange: (regionId: string) => void;
    onAdvanceTurn: () => void;
    onSave: () => void;
    onLoad: () => void;
    onReset: () => void;
    onModeChange: (mode: 'select' | 'attack' | 'move') => void;
    onToggleAoR?: () => void;
}

export function buildToolbar(currentRegion: string, turn: number, mode: string, callbacks: ToolbarCallbacks): HTMLElement {
    const bar = document.createElement('div');
    bar.id = 'sandbox-toolbar';
    bar.style.cssText = [
        'position:absolute', 'top:0', 'left:0', 'right:0', 'z-index:10',
        'display:flex', 'align-items:center', 'gap:8px', 'padding:6px 12px',
        'background:rgba(10,10,22,0.95)',
        'border-bottom:1px solid rgba(0,255,136,0.3)',
        'font:12px "Courier New", Courier, monospace', 'color:#c0d8e0',
        'pointer-events:all', 'flex-wrap:wrap',
    ].join(';');

    // Region selector
    const regionSelect = document.createElement('select');
    regionSelect.style.cssText = 'background:#12121f;color:#00ff88;border:1px solid rgba(0,255,136,0.4);padding:3px 6px;font:11px "Courier New",monospace';
    for (const r of SANDBOX_REGIONS) {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.name;
        if (r.id === currentRegion) opt.selected = true;
        regionSelect.appendChild(opt);
    }
    regionSelect.onchange = () => callbacks.onRegionChange(regionSelect.value);
    bar.appendChild(regionSelect);

    // Advance turn button
    const advBtn = document.createElement('button');
    advBtn.textContent = '\u25B6 ADVANCE TURN';
    advBtn.style.cssText = BUTTON_STYLE;
    advBtn.onclick = callbacks.onAdvanceTurn;
    bar.appendChild(advBtn);

    // Turn counter
    const turnLabel = document.createElement('span');
    turnLabel.id = 'sandbox-turn-label';
    turnLabel.textContent = `Turn: ${turn}`;
    turnLabel.style.cssText = 'color:#00ff88;margin:0 8px';
    bar.appendChild(turnLabel);

    // Mode buttons
    const modes: Array<{ id: 'select' | 'attack' | 'move'; label: string }> = [
        { id: 'select', label: 'SELECT' },
        { id: 'attack', label: 'ATTACK' },
        { id: 'move', label: 'MOVE' },
    ];
    for (const m of modes) {
        const btn = document.createElement('button');
        btn.textContent = m.label;
        btn.dataset.mode = m.id;
        btn.style.cssText = m.id === mode ? BUTTON_STYLE.replace('0.15', '0.35') : BUTTON_STYLE;
        btn.onclick = () => {
            callbacks.onModeChange(m.id);
            // Update active button styling
            bar.querySelectorAll('[data-mode]').forEach((el) => {
                (el as HTMLElement).style.cssText = (el as HTMLElement).dataset.mode === m.id
                    ? BUTTON_STYLE.replace('0.15', '0.35')
                    : BUTTON_STYLE;
            });
        };
        bar.appendChild(btn);
    }

    // AoR toggle button
    if (callbacks.onToggleAoR) {
        const aorBtn = document.createElement('button');
        aorBtn.textContent = 'AoR';
        aorBtn.id = 'sandbox-aor-toggle';
        aorBtn.style.cssText = BUTTON_STYLE;
        aorBtn.title = 'Toggle brigade AoR crosshatch overlay';
        aorBtn.onclick = () => {
            const active = aorBtn.dataset.active === '1';
            aorBtn.dataset.active = active ? '0' : '1';
            aorBtn.style.cssText = active ? BUTTON_STYLE : BUTTON_STYLE.replace('0.15', '0.35');
            callbacks.onToggleAoR!();
        };
        bar.appendChild(aorBtn);
    }

    // Spacer
    const spacer = document.createElement('span');
    spacer.style.cssText = 'flex:1';
    bar.appendChild(spacer);

    // Save / Load / Reset
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'SAVE';
    saveBtn.style.cssText = BUTTON_STYLE;
    saveBtn.onclick = callbacks.onSave;
    bar.appendChild(saveBtn);

    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'LOAD';
    loadBtn.style.cssText = BUTTON_STYLE;
    loadBtn.onclick = callbacks.onLoad;
    bar.appendChild(loadBtn);

    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'RESET';
    resetBtn.style.cssText = BUTTON_RED_STYLE;
    resetBtn.onclick = callbacks.onReset;
    bar.appendChild(resetBtn);

    return bar;
}

// ---------------------------------------------------------------------------
// Right side panel container
// ---------------------------------------------------------------------------

export function buildSidePanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'sandbox-sidepanel';
    panel.style.cssText = [
        'position:absolute', 'top:38px', 'right:0', 'bottom:0', 'width:280px',
        'z-index:10', 'overflow-y:auto',
        'display:flex', 'flex-direction:column', 'gap:4px', 'padding:4px',
        'pointer-events:all',
    ].join(';');
    return panel;
}

// ---------------------------------------------------------------------------
// Selection panel (selected formation info)
// ---------------------------------------------------------------------------

export function buildSelectionPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'sandbox-selection';
    panel.style.cssText = PANEL_STYLE;
    panel.innerHTML = '<div style="color:#00ff88;font-weight:bold;margin-bottom:4px">SELECTION</div><div style="color:#667">Click a formation to inspect</div>';
    return panel;
}

export interface SelectionPanelCallbacks {
    onPostureChange?: (posture: string) => void;
    onDeploy?: (formationId: string) => void;
    onUndeploy?: (formationId: string) => void;
}

export function updateSelectionPanel(
    panel: HTMLElement,
    formation: SliceFormation | null,
    callbacks?: SelectionPanelCallbacks,
    deploymentStatus?: string | null,
    movementRates?: { columnRate: number; combatRate: number },
): void {
    if (!formation) {
        panel.innerHTML = '<div style="color:#00ff88;font-weight:bold;margin-bottom:4px">SELECTION</div><div style="color:#667">Click a formation to inspect</div>';
        return;
    }

    const fc = FACTION_COLORS[formation.faction] ?? '#888';
    const pc = POSTURE_COLORS[formation.posture] ?? '#888';

    let html = `<div style="color:#00ff88;font-weight:bold;margin-bottom:4px">${formation.name || formation.id}</div>`;
    html += `<div style="color:${fc}">${formation.faction} &mdash; ${formation.kind}</div>`;
    html += `<div>PRS: <b>${formation.personnel}</b></div>`;
    html += `<div>PST: <b style="color:${pc}">${formation.posture}</b></div>`;

    if (formation.cohesion !== undefined) {
        html += `<div>COH: <b>${Math.round(formation.cohesion)}%</b></div>`;
    }
    if (formation.fatigue !== undefined) {
        html += `<div>FAT: <b>${Math.round(formation.fatigue)}%</b></div>`;
    }
    html += `<div>HQ: ${formation.hq_sid}</div>`;
    html += `<div>STS: ${formation.status}</div>`;

    // Deployment status display
    if (deploymentStatus) {
        const columnRate = movementRates?.columnRate ?? 12;
        const combatRate = movementRates?.combatRate ?? 3;
        const DEPLOY_COLORS: Record<string, string> = {
            undeployed: '#ffaa00',
            deploying: '#00cccc',
            undeploying: '#ff8844',
            deployed: '#00ff88',
        };
        const DEPLOY_LABELS: Record<string, string> = {
            undeployed: `UNDEPLOYED \u2014 Column march (${columnRate} sett/turn)`,
            deploying: 'DEPLOYING... (advance turn)',
            undeploying: 'UNDEPLOYING... (advance turn)',
            deployed: `DEPLOYED \u2014 Combat posture (${combatRate} sett/turn)`,
        };
        const statusColor = DEPLOY_COLORS[deploymentStatus] ?? '#888';
        const statusLabel = DEPLOY_LABELS[deploymentStatus] ?? deploymentStatus.toUpperCase();
        html += `<div style="color:${statusColor};font-weight:bold;margin-top:4px">\u25A0 ${statusLabel}</div>`;
    } else {
        // No deployment entry means deployed (implicit)
        const combatRate = movementRates?.combatRate ?? 3;
        html += `<div style="color:#00ff88;font-weight:bold;margin-top:4px">\u25A0 DEPLOYED \u2014 Combat posture (${combatRate} sett/turn)</div>`;
    }

    if (formation.composition) {
        const c = formation.composition;
        html += '<div style="margin-top:4px;border-top:1px solid rgba(0,255,136,0.2);padding-top:4px">';
        html += `<div>INF: ${c.infantry ?? 0} | TNK: ${c.tanks ?? 0}</div>`;
        html += `<div>ART: ${c.artillery ?? 0} | AA: ${c.aa_systems ?? 0}</div>`;
        html += '</div>';
    }

    // Posture selector
    html += '<div style="margin-top:6px" id="posture-select-container"></div>';

    // Deploy button: show when undeployed
    if (deploymentStatus === 'undeployed' && callbacks?.onDeploy) {
        html += '<div style="margin-top:6px" id="deploy-btn-container"></div>';
    }
    // Undeploy button: show when deployed (no entry = deployed, or explicit)
    if ((!deploymentStatus || deploymentStatus === 'deployed') && callbacks?.onUndeploy) {
        html += '<div style="margin-top:6px" id="undeploy-btn-container"></div>';
    }

    panel.innerHTML = html;

    // Add posture dropdown
    const container = panel.querySelector('#posture-select-container');
    if (container && callbacks?.onPostureChange) {
        const select = document.createElement('select');
        select.style.cssText = 'background:#12121f;color:#c0d8e0;border:1px solid rgba(0,255,136,0.3);padding:2px 4px;font:10px "Courier New",monospace;width:100%';
        const postures = ['defend', 'probe', 'attack', 'elastic_defense', 'consolidation'];
        for (const p of postures) {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p.toUpperCase();
            if (p === formation.posture) opt.selected = true;
            select.appendChild(opt);
        }
        select.onchange = () => callbacks.onPostureChange!(select.value);
        const label = document.createElement('span');
        label.textContent = 'SET POSTURE: ';
        label.style.cssText = 'color:#667;font-size:10px';
        container.appendChild(label);
        container.appendChild(select);
    }

    // Add DEPLOY button
    const deployContainer = panel.querySelector('#deploy-btn-container');
    if (deployContainer && callbacks?.onDeploy) {
        const btn = document.createElement('button');
        btn.textContent = '\u25BC DEPLOY (expand AoR, 1 turn)';
        btn.style.cssText = BUTTON_STYLE + ';width:100%';
        btn.title = 'Deploy battalions to combat posture (HQ + adjacent, up to personnel cap)';
        btn.onclick = () => callbacks.onDeploy!(formation.id);
        deployContainer.appendChild(btn);
    }

    // Add UNDEPLOY button
    const undeployContainer = panel.querySelector('#undeploy-btn-container');
    if (undeployContainer && callbacks?.onUndeploy) {
        const BUTTON_YELLOW_STYLE = BUTTON_STYLE.replace('0,255,136', '255,170,0').replace('#00ff88', '#ffaa00');
        const btn = document.createElement('button');
        btn.textContent = '\u25B2 UNDEPLOY (contract to HQ, 1 turn)';
        btn.style.cssText = BUTTON_YELLOW_STYLE + ';width:100%';
        btn.title = 'Contract to column march (1 settlement, moves faster)';
        btn.onclick = () => callbacks.onUndeploy!(formation.id);
        undeployContainer.appendChild(btn);
    }
}

// ---------------------------------------------------------------------------
// Orders panel (queued orders)
// ---------------------------------------------------------------------------

export interface OrderEntry {
    type: 'attack' | 'move';
    brigadeId: string;
    brigadeName: string;
    targetSid?: string;
    destinationSids?: string[];
}

export function buildOrdersPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'sandbox-orders';
    panel.style.cssText = PANEL_STYLE;
    panel.innerHTML = '<div style="color:#00ff88;font-weight:bold;margin-bottom:4px">ORDERS</div><div style="color:#667">No orders queued</div>';
    return panel;
}

export function updateOrdersPanel(panel: HTMLElement, orders: OrderEntry[], onRemove: (idx: number) => void): void {
    let html = '<div style="color:#00ff88;font-weight:bold;margin-bottom:4px">ORDERS</div>';
    if (orders.length === 0) {
        html += '<div style="color:#667">No orders queued</div>';
    } else {
        for (let i = 0; i < orders.length; i++) {
            const o = orders[i]!;
            const color = o.type === 'attack' ? '#ff4444' : '#3388ff';
            const icon = o.type === 'attack' ? '\u2694' : '\u2192';
            const target = o.type === 'attack' ? o.targetSid : o.destinationSids?.join(', ');
            html += `<div style="display:flex;align-items:center;gap:4px;margin:2px 0">`;
            html += `<span style="color:${color}">${icon}</span>`;
            html += `<span style="flex:1;font-size:10px">${o.brigadeName} \u2192 ${target}</span>`;
            html += `<button data-remove="${i}" style="${BUTTON_RED_STYLE};padding:1px 5px;font-size:9px">X</button>`;
            html += `</div>`;
        }
    }
    panel.innerHTML = html;

    // Wire up remove buttons
    panel.querySelectorAll('[data-remove]').forEach((btn) => {
        (btn as HTMLElement).onclick = () => {
            const idx = parseInt((btn as HTMLElement).dataset.remove ?? '0', 10);
            onRemove(idx);
        };
    });
}

// ---------------------------------------------------------------------------
// Battle log panel
// ---------------------------------------------------------------------------

export function buildBattleLog(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'sandbox-battlelog';
    panel.style.cssText = PANEL_STYLE + ';flex:1;min-height:100px;overflow-y:auto;max-height:300px';
    panel.innerHTML = '<div style="color:#00ff88;font-weight:bold;margin-bottom:4px">BATTLE LOG</div><div style="color:#667">No battles yet</div>';
    return panel;
}

export function appendBattleLog(panel: HTMLElement, report: SandboxTurnReport): void {
    // Remove placeholder
    const placeholder = panel.querySelector('div[style*="color:#667"]');
    if (placeholder && placeholder.textContent === 'No battles yet') {
        placeholder.remove();
    }

    const entry = document.createElement('div');
    entry.style.cssText = 'border-top:1px solid rgba(0,255,136,0.15);padding-top:4px;margin-top:4px;font-size:10px';

    let html = `<div style="color:#00ff88;font-weight:bold">\u2500\u2500 Turn ${report.turn} \u2500\u2500</div>`;

    const atk = report.attackReport;
    if (atk.orders_processed === 0) {
        html += '<div style="color:#667">No battles this turn</div>';
    } else {
        html += `<div>Orders: ${atk.orders_processed} | Flips: ${atk.flips_applied}</div>`;
        html += `<div style="color:#ff6644">ATK casualties: ${atk.casualty_attacker}</div>`;
        html += `<div style="color:#4488ff">DEF casualties: ${atk.casualty_defender}</div>`;

        // Per-battle details
        if (atk.details) {
            for (const d of atk.details) {
                const icon = d.attacker_won ? '\u2714' : '\u2718';
                const color = d.attacker_won ? '#00ff88' : '#ff4444';
                html += `<div style="color:${color};margin-left:8px">${icon} ${d.brigade_id} \u2192 ${d.target_sid}</div>`;
            }
        }
    }

    if (report.movementProcessed) {
        html += '<div style="color:#3388ff">Movement orders processed</div>';
    }
    if (report.postureApplied) {
        html += '<div style="color:#cccc44">Posture orders applied</div>';
    }
    if (report.loadUpLogs && report.loadUpLogs.length > 0) {
        for (const log of report.loadUpLogs) {
            html += `<div style="color:#ffaa00">\u25B2 ${log}</div>`;
        }
    }

    entry.innerHTML = html;
    panel.appendChild(entry);
    panel.scrollTop = panel.scrollHeight;
}

// ---------------------------------------------------------------------------
// Resource display
// ---------------------------------------------------------------------------

export function buildResourcePanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'sandbox-resources';
    panel.style.cssText = PANEL_STYLE;
    panel.innerHTML = '<div style="color:#00ff88;font-weight:bold;margin-bottom:4px">RESOURCES</div>';
    return panel;
}

export function updateResourcePanel(
    panel: HTMLElement,
    factions: Array<{ id: string; brigadeCount: number; totalPersonnel: number }>,
): void {
    let html = '<div style="color:#00ff88;font-weight:bold;margin-bottom:4px">FORCES</div>';
    for (const f of factions) {
        const fc = FACTION_COLORS[f.id] ?? '#888';
        html += `<div style="color:${fc};margin:2px 0"><b>${f.id}</b>: ${f.brigadeCount} bdes, ${f.totalPersonnel} pers</div>`;
    }
    panel.innerHTML = html;
}

// ---------------------------------------------------------------------------
// Spawn brigade panel
// ---------------------------------------------------------------------------

/** Equipment class template (mirrored from recruitment_types for display). */
export interface SpawnTemplate {
    infantry: number;
    tanks: number;
    artillery: number;
    aa_systems: number;
}

export interface SpawnCallbacks {
    onSpawn: (faction: string, equipClass: string, name: string, hqSid: string) => void;
}

export function buildSpawnPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'sandbox-spawn';
    panel.style.cssText = PANEL_STYLE;
    panel.innerHTML = '<div style="color:#00ff88;font-weight:bold;margin-bottom:4px">SPAWN BRIGADE</div><div style="color:#667">Loading...</div>';
    return panel;
}

/**
 * Update the spawn panel with current faction-controlled settlements and equipment templates.
 */
export function updateSpawnPanel(
    panel: HTMLElement,
    templates: Record<string, SpawnTemplate>,
    controlledSettlements: Record<string, Array<{ sid: string; name: string }>>,
    callbacks: SpawnCallbacks,
): void {
    const SELECT_STYLE = 'background:#12121f;color:#c0d8e0;border:1px solid rgba(0,255,136,0.3);padding:2px 4px;font:10px "Courier New",monospace;width:100%';
    const INPUT_STYLE = 'background:#12121f;color:#c0d8e0;border:1px solid rgba(0,255,136,0.3);padding:2px 4px;font:10px "Courier New",monospace;width:100%;box-sizing:border-box';

    let html = '<div style="color:#00ff88;font-weight:bold;margin-bottom:6px">SPAWN BRIGADE</div>';

    // Faction row
    html += '<div style="margin:3px 0"><span style="color:#667;font-size:10px">FACTION: </span>';
    html += '<select id="spawn-faction" style="' + SELECT_STYLE + '">';
    for (const fid of ['RS', 'RBiH', 'HRHB']) {
        html += `<option value="${fid}">${fid}</option>`;
    }
    html += '</select></div>';

    // Equipment class row
    html += '<div style="margin:3px 0"><span style="color:#667;font-size:10px">CLASS: </span>';
    html += '<select id="spawn-class" style="' + SELECT_STYLE + '">';
    for (const cls of Object.keys(templates)) {
        html += `<option value="${cls}">${cls.toUpperCase()}</option>`;
    }
    html += '</select></div>';

    // Name row
    html += '<div style="margin:3px 0"><span style="color:#667;font-size:10px">NAME: </span>';
    html += '<input id="spawn-name" type="text" placeholder="auto" style="' + INPUT_STYLE + '" /></div>';

    // HQ settlement row (populated dynamically)
    html += '<div style="margin:3px 0"><span style="color:#667;font-size:10px">HQ: </span>';
    html += '<select id="spawn-hq" style="' + SELECT_STYLE + '"></select></div>';

    // Preview (updated when class changes)
    html += '<div id="spawn-preview" style="margin:4px 0;color:#8aa;font-size:10px"></div>';

    // Spawn button
    html += `<button id="spawn-btn" style="${BUTTON_STYLE};width:100%;margin-top:4px">SPAWN</button>`;

    panel.innerHTML = html;

    // --- Wire up dynamic elements ---
    const factionSel = panel.querySelector('#spawn-faction') as HTMLSelectElement;
    const classSel = panel.querySelector('#spawn-class') as HTMLSelectElement;
    const nameInput = panel.querySelector('#spawn-name') as HTMLInputElement;
    const hqSel = panel.querySelector('#spawn-hq') as HTMLSelectElement;
    const previewDiv = panel.querySelector('#spawn-preview') as HTMLElement;
    const spawnBtn = panel.querySelector('#spawn-btn') as HTMLButtonElement;

    function updateHQOptions(): void {
        const faction = factionSel.value;
        const settlements = controlledSettlements[faction] ?? [];
        hqSel.innerHTML = '';
        for (const s of settlements) {
            const opt = document.createElement('option');
            opt.value = s.sid;
            opt.textContent = `${s.name} (${s.sid})`;
            hqSel.appendChild(opt);
        }
        if (settlements.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '(no settlements)';
            hqSel.appendChild(opt);
        }
    }

    function updatePreview(): void {
        const cls = classSel.value;
        const t = templates[cls];
        if (!t) { previewDiv.textContent = ''; return; }
        previewDiv.textContent = `PRS: ${t.infantry} | TNK: ${t.tanks} | ART: ${t.artillery} | AA: ${t.aa_systems}`;
    }

    factionSel.onchange = () => { updateHQOptions(); };
    classSel.onchange = () => { updatePreview(); };

    spawnBtn.onclick = () => {
        const faction = factionSel.value;
        const equipClass = classSel.value;
        const name = nameInput.value.trim();
        const hqSid = hqSel.value;
        if (!hqSid) return;
        callbacks.onSpawn(faction, equipClass, name, hqSid);
    };

    // Initial population
    updateHQOptions();
    updatePreview();
}
