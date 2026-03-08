/**
 * DiplomacyModal -- Faction-specific diplomacy modal for Peace/War phase.
 *
 * Replaces the Peace phase+ placeholder in ClickableRegionManager.ts.
 * Each faction gets a tailored view:
 *   RS   -> "Belgrade Channel" (patron status, negotiation momentum)
 *   RBiH -> "Alliance & International" (alliance, ceasefire/Washington trackers, embargo)
 *   HRHB -> "Zagreb Line" (patron/constraint, alliance, reversed-fog trackers, capability outlook)
 *
 * Fog-of-war tiers:
 *   Tier 1 = exact (own data)
 *   Tier 2 = approximate ("~" prefix)
 *   Tier 3 = unknown ("UNKNOWN")
 *
 * No Math.random(), no Date.now(). All iteration sorted for determinism.
 */

import type { FactionId, GameState } from '../../../state/game_state.js';
import { extractWarData, type WarDataSnapshot } from '../data/war_data_extractor.js';
import { FACTION_COLORS, factionCssClass, getPlayerFaction, trendArrow, turnToWeekString } from './warroom_utils.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a 0-1 number as a percentage string: "42.0%". */
function pct(v: number): string {
    return `${(v * 100).toFixed(1)}%`;
}

/** Format a number as a two-decimal string: "0.35". */
function dec2(v: number): string {
    return v.toFixed(2);
}

/** Color for alliance value thresholds. */
function allianceColor(value: number): string {
    if (value >= 0.3) return '#00e878';
    if (value >= 0) return '#ffab00';
    return '#ff3d00';
}

/** Checklist icon by status. */
function checkIcon(status: 'met' | 'unmet' | 'unknown'): string {
    switch (status) {
        case 'met': return '<span style="color:#00e878;">\u2713</span>';     // green checkmark
        case 'unmet': return '<span style="color:#ff3d00;">\u2717</span>';   // red X
        case 'unknown': return '<span style="color:#555570;">?</span>';      // gray ?
    }
}

/** Build a stat row (fo-stat-row). */
function statRow(label: string, value: string, valueColor?: string): string {
    const style = valueColor ? ` style="color:${valueColor}"` : '';
    return `<div class="fo-stat-row"><span class="fo-stat-label">${label}</span><span class="fo-stat-value"${style}>${value}</span></div>`;
}

/** Build a condition checklist row. */
function conditionRow(
    code: string,
    description: string,
    status: 'met' | 'unmet' | 'unknown',
    detail: string,
): string {
    return `<div class="fo-stat-row" style="margin:3px 0;">
        <span class="fo-stat-label" style="flex:0 0 auto;margin-right:6px;">${checkIcon(status)}</span>
        <span class="fo-stat-label" style="flex:1;font-size:11px;">${code}: ${description}</span>
        <span class="fo-stat-value" style="flex:0 0 auto;font-size:11px;">${detail}</span>
    </div>`;
}

// ---------------------------------------------------------------------------
// DiplomacyModal
// ---------------------------------------------------------------------------

export class DiplomacyModal {
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }

    /** Main entry: dispatch to faction-specific renderer. */
    render(): HTMLElement {
        const pf = getPlayerFaction(this.gameState);
        const snap = extractWarData(this.gameState, pf);

        switch (pf) {
            case 'RS': return this.renderRS(snap);
            case 'HRHB': return this.renderHRHB(snap);
            case 'RBiH':
            default:
                return this.renderRBiH(snap);
        }
    }

    // -----------------------------------------------------------------------
    // Shared outer shell
    // -----------------------------------------------------------------------

    private createModalShell(pf: FactionId): HTMLElement {
        const modal = document.createElement('div');
        modal.className = `diplomacy-modal weathered-panel faction-${factionCssClass(pf)}`;
        const fc = FACTION_COLORS[pf] ?? FACTION_COLORS['RBiH'];
        modal.style.borderTop = `3px solid ${fc.primary}`;
        modal.style.width = '700px';
        modal.style.maxHeight = '900px';
        modal.style.overflowY = 'auto';
        modal.style.background = '#10101e';
        modal.style.padding = '28px 32px';
        modal.style.color = '#d8d8e0';
        modal.style.fontFamily = "'IBM Plex Mono', 'Consolas', monospace";
        return modal;
    }

    private appendTitle(modal: HTMLElement, title: string, turn: number): void {
        const header = document.createElement('div');
        header.className = 'faction-overview-header';
        header.innerHTML = `
            <h2 class="text-accent-gold">${title}</h2>
            <div class="meta">${turnToWeekString(turn)}</div>
        `;
        modal.appendChild(header);
    }

    private createSection(title: string, contentHtml: string): HTMLElement {
        const section = document.createElement('div');
        section.className = 'faction-overview-section';
        section.innerHTML = `<h3 class="text-accent-gold">${title}</h3>${contentHtml}`;
        return section;
    }

    // -----------------------------------------------------------------------
    // RS -- "Belgrade Channel"
    // -----------------------------------------------------------------------

    private renderRS(snap: WarDataSnapshot): HTMLElement {
        const pf = snap.playerFaction;
        const modal = this.createModalShell(pf);
        this.appendTitle(modal, 'BELGRADE CHANNEL', snap.turn);

        // PATRON STATUS
        const patron = snap.ownDiplomacy.patronState;
        if (patron) {
            modal.appendChild(this.createSection('PATRON STATUS', [
                statRow('Patron Commitment', pct(patron.patronCommitment)),
                statRow('Material Support', pct(patron.materialSupport)),
                statRow('Diplomatic Isolation', pct(patron.diplomaticIsolation)),
            ].join('')));
        } else {
            modal.appendChild(this.createSection('PATRON STATUS',
                '<div class="fo-stat-row"><span class="fo-stat-label" style="color:#555570;">No patron data available.</span></div>'
            ));
        }

        // NEGOTIATION
        const negMomentum = snap.ownDiplomacy.negotiationMomentum;
        modal.appendChild(this.createSection('NEGOTIATION', [
            statRow('Negotiation Momentum', pct(negMomentum)),
        ].join('')));

        // Allied channels note
        const note = document.createElement('div');
        note.style.cssText = 'text-align:center;font-size:11px;color:#555570;margin-top:16px;font-style:italic;';
        note.textContent = 'No allied channels active \u2014 RS fights with patron backing';
        modal.appendChild(note);

        return modal;
    }

    // -----------------------------------------------------------------------
    // RBiH -- "Alliance & International"
    // -----------------------------------------------------------------------

    private renderRBiH(snap: WarDataSnapshot): HTMLElement {
        const pf = snap.playerFaction;
        const modal = this.createModalShell(pf);
        this.appendTitle(modal, 'ALLIANCE & INTERNATIONAL', snap.turn);

        // ALLIANCE STATUS
        const alliance = snap.ownDiplomacy.rbihHrhbState;
        if (alliance) {
            const ac = allianceColor(alliance.allianceValue);
            modal.appendChild(this.createSection('ALLIANCE STATUS', [
                statRow('Alliance Value', dec2(alliance.allianceValue), ac),
                statRow('Bilateral Flips (this turn)', `${alliance.bilateralFlipsThisTurn}`),
                statRow('Stalemate Turns', `${alliance.stalemateTurns}`),
                statRow('Total Bilateral Flips', `${alliance.totalBilateralFlips}`),
            ].join('')));
        }

        // CEASEFIRE TRACKER
        modal.appendChild(this.renderCeasefireTracker(snap, 'RBiH'));

        // WASHINGTON TRACKER
        modal.appendChild(this.renderWashingtonTracker(snap, 'RBiH'));

        // ARMS EMBARGO
        const embargo = snap.ownDiplomacy.embargoProfile;
        if (embargo) {
            modal.appendChild(this.createSection('ARMS EMBARGO', [
                statRow('Heavy Equipment Access', pct(embargo.heavyEquipmentAccess)),
                statRow('Ammunition Resupply', pct(embargo.ammunitionResupplyRate)),
                statRow('Maintenance Capacity', pct(embargo.maintenanceCapacity)),
                statRow('Smuggling Efficiency', pct(embargo.smugglingEfficiency)),
                statRow('External Pipeline', pct(embargo.externalPipelineStatus)),
            ].join('')));
        } else {
            modal.appendChild(this.createSection('ARMS EMBARGO',
                '<div class="fo-stat-row"><span class="fo-stat-label" style="color:#555570;">No embargo data.</span></div>'
            ));
        }

        return modal;
    }

    // -----------------------------------------------------------------------
    // HRHB -- "Zagreb Line"
    // -----------------------------------------------------------------------

    private renderHRHB(snap: WarDataSnapshot): HTMLElement {
        const pf = snap.playerFaction;
        const modal = this.createModalShell(pf);
        this.appendTitle(modal, 'ZAGREB LINE', snap.turn);

        // PATRON STATUS
        const patron = snap.ownDiplomacy.patronState;
        const constraintSev = snap.ownDiplomacy.constraintSeverity;
        if (patron) {
            modal.appendChild(this.createSection('PATRON STATUS', [
                statRow('Patron Commitment', pct(patron.patronCommitment)),
                statRow('Constraint Severity', constraintSev != null ? pct(constraintSev) : 'N/A'),
                statRow('Material Support', pct(patron.materialSupport)),
            ].join('')));
        }

        // ALLIANCE STATUS
        const alliance = snap.ownDiplomacy.rbihHrhbState;
        if (alliance) {
            const ac = allianceColor(alliance.allianceValue);
            let allianceHtml = [
                statRow('Alliance Value', dec2(alliance.allianceValue), ac),
                statRow('Bilateral Flips (this turn)', `${alliance.bilateralFlipsThisTurn}`),
                statRow('Stalemate Turns', `${alliance.stalemateTurns}`),
                statRow('Total Bilateral Flips', `${alliance.totalBilateralFlips}`),
            ].join('');

            // Conditional warning
            if (constraintSev != null && constraintSev > 0.3 && alliance.allianceValue < 0.20) {
                allianceHtml += '<div style="margin-top:8px;font-size:11px;color:#ffab00;font-style:italic;">Croatian pressure is straining the alliance.</div>';
            }

            modal.appendChild(this.createSection('ALLIANCE STATUS', allianceHtml));
        }

        // CEASEFIRE TRACKER (fog reversed for HRHB)
        modal.appendChild(this.renderCeasefireTracker(snap, 'HRHB'));

        // WASHINGTON TRACKER (fog reversed for HRHB)
        modal.appendChild(this.renderWashingtonTracker(snap, 'HRHB'));

        // CAPABILITY OUTLOOK
        const capProfile = this.gameState.factions.find(f => f.id === 'HRHB')?.capability_profile;
        const currentEquipAccess = capProfile?.equipment_access ?? 0;
        const currentCroatianSupport = capProfile?.croatian_support ?? 0;

        modal.appendChild(this.createSection('CAPABILITY OUTLOOK', `
            <div style="margin-bottom:6px;font-size:11px;color:#8888a0;font-style:italic;">If Washington Agreement signed:</div>
            ${statRow('Equipment Access', `${pct(currentEquipAccess)} \u2192 65.0%`)}
            ${statRow('Croatian Support', `${pct(currentCroatianSupport)} \u2192 90.0%`)}
            ${statRow('Joint Pressure Bonus vs RS', '1.15x')}
        `));

        return modal;
    }

    // -----------------------------------------------------------------------
    // Ceasefire Tracker (shared: RBiH / HRHB with fog reversal)
    // -----------------------------------------------------------------------

    private renderCeasefireTracker(snap: WarDataSnapshot, viewer: 'RBiH' | 'HRHB'): HTMLElement {
        const gs = this.gameState;
        const alliance = snap.ownDiplomacy.rbihHrhbState;
        const turn = snap.turn;
        const warStartTurn = gs.meta.war_start_turn ?? 0;
        const ownExhaustion = snap.ownExhaustion.level;
        const ivpMomentum = snap.ownDiplomacy.negotiationMomentum;
        const stalemateTurns = alliance?.stalemateTurns ?? 0;

        // C1: War duration >= 20 turns (Tier 1 both sides)
        const warDuration = turn - warStartTurn;
        const c1Met = warDuration >= 20;
        const c1Detail = `${warDuration} turns`;

        // C2: HRHB exhaustion > 35 -- Tier depends on viewer
        let c2Status: 'met' | 'unmet' | 'unknown';
        let c2Detail: string;
        if (viewer === 'HRHB') {
            // HRHB sees own exhaustion exactly (Tier 1)
            const hrhbExh = ownExhaustion;
            c2Status = hrhbExh > 35 ? 'met' : 'unmet';
            c2Detail = `${hrhbExh.toFixed(1)}`;
        } else {
            // RBiH cannot see HRHB exhaustion (Tier 3)
            c2Status = 'unknown';
            c2Detail = 'UNKNOWN';
        }

        // C3: Own exhaustion > 30 -- for RBiH: exact; for HRHB: this is RBiH exhaustion = Tier 3
        let c3Status: 'met' | 'unmet' | 'unknown';
        let c3Detail: string;
        if (viewer === 'RBiH') {
            c3Status = ownExhaustion > 30 ? 'met' : 'unmet';
            c3Detail = `${ownExhaustion.toFixed(1)}`;
        } else {
            // HRHB sees RBiH exhaustion as Tier 3
            c3Status = 'unknown';
            c3Detail = 'UNKNOWN';
        }

        // C4: Stalemate >= 4 turns (Tier 1)
        const c4Met = stalemateTurns >= 4;
        const c4Detail = `${stalemateTurns} turns`;

        // C5: IVP momentum > 0.40 (Tier 2)
        const c5Met = ivpMomentum > 0.40;
        const c5Detail = `~${(ivpMomentum * 100).toFixed(0)}%`;

        // C6: HRHB patron constraint > 0.45
        let c6Status: 'met' | 'unmet' | 'unknown';
        let c6Detail: string;
        if (viewer === 'HRHB') {
            // HRHB sees own patron constraint exactly (Tier 1)
            const cs = snap.ownDiplomacy.constraintSeverity ?? 0;
            c6Status = cs > 0.45 ? 'met' : 'unmet';
            c6Detail = pct(cs);
        } else {
            // RBiH cannot see HRHB patron constraint (Tier 3)
            c6Status = 'unknown';
            c6Detail = 'UNKNOWN';
        }

        const ceasefireActive = alliance?.ceasefireActive ?? false;
        const statusLabel = ceasefireActive
            ? '<div style="text-align:center;color:#00e878;font-size:11px;font-weight:600;margin-bottom:8px;">CEASEFIRE ACTIVE</div>'
            : '';

        return this.createSection('CEASEFIRE TRACKER', `
            ${statusLabel}
            ${conditionRow('C1', 'War duration \u2265 20 turns', c1Met ? 'met' : 'unmet', c1Detail)}
            ${conditionRow('C2', 'HRHB exhaustion > 35', c2Status, c2Detail)}
            ${conditionRow('C3', `${viewer === 'RBiH' ? 'Own' : 'RBiH'} exhaustion > 30`, c3Status, c3Detail)}
            ${conditionRow('C4', 'Stalemate \u2265 4 turns', c4Met ? 'met' : 'unmet', c4Detail)}
            ${conditionRow('C5', 'IVP momentum > 40%', c5Met ? 'met' : 'unmet', c5Detail)}
            ${conditionRow('C6', 'HRHB patron constraint > 45%', c6Status, c6Detail)}
        `);
    }

    // -----------------------------------------------------------------------
    // Washington Tracker (shared: RBiH / HRHB with fog reversal)
    // -----------------------------------------------------------------------

    private renderWashingtonTracker(snap: WarDataSnapshot, viewer: 'RBiH' | 'HRHB'): HTMLElement {
        const alliance = snap.ownDiplomacy.rbihHrhbState;
        const ceasefireActive = alliance?.ceasefireActive ?? false;
        const ceasefireSince = alliance?.ceasefireSinceTurn ?? null;
        const turn = snap.turn;
        const ivpMomentum = snap.ownDiplomacy.negotiationMomentum;
        const ownExhaustion = snap.ownExhaustion.level;

        // W1: Ceasefire active (Tier 1)
        const w1Status: 'met' | 'unmet' = ceasefireActive ? 'met' : 'unmet';
        const w1Detail = ceasefireActive ? 'Yes' : 'No';

        // W2: Ceasefire >= 4 turns (Tier 1)
        let w2Status: 'met' | 'unmet' = 'unmet';
        let w2Detail = 'N/A';
        if (ceasefireActive && ceasefireSince != null) {
            const ceasefireDuration = turn - ceasefireSince;
            w2Status = ceasefireDuration >= 4 ? 'met' : 'unmet';
            w2Detail = `${ceasefireDuration} turns`;
        }

        // W3: IVP momentum > 0.50 (Tier 2)
        const w3Met = ivpMomentum > 0.50;
        const w3Detail = `~${(ivpMomentum * 100).toFixed(0)}%`;

        // W4: HRHB patron constraint > 0.55
        let w4Status: 'met' | 'unmet' | 'unknown';
        let w4Detail: string;
        if (viewer === 'HRHB') {
            const cs = snap.ownDiplomacy.constraintSeverity ?? 0;
            w4Status = cs > 0.55 ? 'met' : 'unmet';
            w4Detail = pct(cs);
        } else {
            w4Status = 'unknown';
            w4Detail = 'UNKNOWN';
        }

        // W5: RS territory > 40% (Tier 2)
        // We compute RS territory from political_controllers
        const controllers = this.gameState.political_controllers ?? {};
        const sids = Object.keys(controllers).sort();
        const total = sids.length || 1;
        let rsCount = 0;
        for (const sid of sids) {
            if (controllers[sid] === 'RS') rsCount++;
        }
        const rsTerrPct = (rsCount / total) * 100;
        const w5Met = rsTerrPct > 40;
        const w5Detail = `~${rsTerrPct.toFixed(0)}%`;

        // W6: Combined exhaustion > 55
        // Own exhaustion is known (Tier 1), partner exhaustion depends on viewer
        let w6Status: 'met' | 'unmet' | 'unknown';
        let w6Detail: string;
        if (viewer === 'RBiH') {
            // RBiH knows own exhaustion; HRHB exhaustion = Tier 3
            w6Status = 'unknown';
            w6Detail = `Own: ${ownExhaustion.toFixed(1)} + HRHB: UNKNOWN`;
        } else {
            // HRHB knows own exhaustion; RBiH exhaustion = Tier 3
            w6Status = 'unknown';
            w6Detail = `Own: ${ownExhaustion.toFixed(1)} + RBiH: UNKNOWN`;
        }

        const washingtonSigned = alliance?.washingtonSigned ?? false;
        const statusLabel = washingtonSigned
            ? '<div style="text-align:center;color:#00e878;font-size:11px;font-weight:600;margin-bottom:8px;">WASHINGTON AGREEMENT SIGNED</div>'
            : '';

        return this.createSection('WASHINGTON TRACKER', `
            ${statusLabel}
            ${conditionRow('W1', 'Ceasefire active', w1Status, w1Detail)}
            ${conditionRow('W2', 'Ceasefire \u2265 4 turns', w2Status, w2Detail)}
            ${conditionRow('W3', 'IVP momentum > 50%', w3Met ? 'met' : 'unmet', w3Detail)}
            ${conditionRow('W4', 'HRHB patron constraint > 55%', w4Status, w4Detail)}
            ${conditionRow('W5', 'RS territory > 40%', w5Met ? 'met' : 'unmet', w5Detail)}
            ${conditionRow('W6', 'Combined exhaustion > 55', w6Status, w6Detail)}
        `);
    }
}
