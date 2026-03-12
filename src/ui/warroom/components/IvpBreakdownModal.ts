/**
 * IvpBreakdownModal — Diplomatic Press Briefing (IVP).
 * War-only. Read-only breakdown of composite_ivp from existing state; no new mechanics.
 * Fixed iteration order — deterministic display.
 */

import type { FactionId, GameState } from '../../../state/game_state.js';
import {
    DRINA_BLOCKADE_THRESHOLD,
    INTERNATIONAL_SANCTIONS_THRESHOLD,
    NATO_INTERVENTION_THRESHOLD,
    getIvpComponentContributions,
    formatIvpConsequenceLabel,
    ivpComponentLabel,
    sortIvpConsequenceIds,
} from '../../../state/patron_pressure.js';
import { FACTION_COLORS, factionCssClass, getPlayerFaction, turnToWeekString } from './warroom_utils.js';

function pct(v: number): string {
    return `${(v * 100).toFixed(0)}%`;
}

export class IvpBreakdownModal {
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }

    render(): HTMLElement {
        const pf = getPlayerFaction(this.gameState) as FactionId;
        const ivp = this.gameState.political.international_visibility_pressure;
        const composite = ivp?.composite_ivp ?? 0;
        const active = Array.isArray(this.gameState.political.ivp_consequences_active)
            ? sortIvpConsequenceIds(this.gameState.political.ivp_consequences_active)
            : [];

        const modal = document.createElement('div');
        modal.className = `diplomacy-modal weathered-panel faction-${factionCssClass(pf)}`;
        const fc = FACTION_COLORS[pf] ?? FACTION_COLORS['RBiH'];
        modal.style.borderTop = `3px solid ${fc.primary}`;
        modal.style.width = '640px';
        modal.style.maxHeight = '85vh';
        modal.style.overflowY = 'auto';
        modal.style.background = '#10101e';
        modal.style.padding = '28px 32px';
        modal.style.color = '#d8d8e0';
        modal.style.fontFamily = "'IBM Plex Mono', 'Consolas', monospace";
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-label', 'Diplomatic press briefing — international visibility pressure');

        const header = document.createElement('div');
        header.className = 'faction-overview-header';
        header.innerHTML = `
            <h2 class="text-accent-gold">DIPLOMATIC PRESS BRIEFING</h2>
            <div class="meta">${turnToWeekString(this.gameState.meta.turn)}</div>
        `;
        modal.appendChild(header);

        const compositeRow = document.createElement('div');
        compositeRow.className = 'fo-stat-row';
        compositeRow.innerHTML = `<span class="fo-stat-label">Composite IVP</span><span class="fo-stat-value">${pct(composite)}</span>`;
        modal.appendChild(compositeRow);

        const section = document.createElement('div');
        section.className = 'faction-overview-section';
        section.innerHTML = '<h3 class="text-accent-gold">COMPONENT BREAKDOWN</h3>';
        const rows = getIvpComponentContributions(ivp);
        for (const row of rows) {
            const rowEl = document.createElement('div');
            rowEl.className = 'fo-stat-row';
            rowEl.style.margin = '4px 0';
            rowEl.innerHTML = `
                <span class="fo-stat-label" style="flex:1;">${ivpComponentLabel(row.key)}</span>
                <span class="fo-stat-value" style="font-size:11px;">${pct(row.raw)} × weight ${pct(row.weight)} → +${pct(row.contribution)}</span>
            `;
            section.appendChild(rowEl);
        }
        modal.appendChild(section);

        const thresh = document.createElement('div');
        thresh.className = 'faction-overview-section';
        thresh.innerHTML = `
            <h3 class="text-accent-gold">CONSEQUENCE THRESHOLDS</h3>
            <div class="fo-stat-row" style="font-size:11px;">
                <span class="fo-stat-label">${pct(DRINA_BLOCKADE_THRESHOLD)}+</span>
                <span class="fo-stat-value">Drina blockade pressure</span>
            </div>
            <div class="fo-stat-row" style="font-size:11px;">
                <span class="fo-stat-label">${pct(INTERNATIONAL_SANCTIONS_THRESHOLD)}+</span>
                <span class="fo-stat-value">International sanctions</span>
            </div>
            <div class="fo-stat-row" style="font-size:11px;">
                <span class="fo-stat-label">${pct(NATO_INTERVENTION_THRESHOLD)}+</span>
                <span class="fo-stat-value">NATO intervention threat</span>
            </div>
        `;
        modal.appendChild(thresh);

        const cons = document.createElement('div');
        cons.className = 'faction-overview-section';
        cons.innerHTML = '<h3 class="text-accent-gold">ACTIVE CONSEQUENCES</h3>';
        if (active.length === 0) {
            cons.innerHTML += '<div class="fo-stat-row"><span class="fo-stat-label" style="color:#555570;">None active.</span></div>';
        } else {
            for (const id of active) {
                const row = document.createElement('div');
                row.className = 'fo-stat-row';
                row.innerHTML = `<span class="fo-stat-value" style="color:#ffab00;">${formatIvpConsequenceLabel(id)}</span>`;
                cons.appendChild(row);
            }
        }
        modal.appendChild(cons);

        if (this.gameState.military.sarajevo_tunnel_operational) {
            const note = document.createElement('div');
            note.style.cssText = 'margin-top:12px;font-size:11px;color:#555570;';
            note.textContent = 'Sarajevo tunnel operational — siege visibility modifier applied in engine.';
            modal.appendChild(note);
        }

        if (ivp?.last_major_shift != null) {
            const shift = document.createElement('div');
            shift.style.cssText = 'margin-top:8px;font-size:11px;color:#555570;';
            shift.textContent = `Last major IVP shift: turn ${ivp.last_major_shift}.`;
            modal.appendChild(shift);
        }

        return modal;
    }
}
