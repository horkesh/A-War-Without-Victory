/**
 * FactionOverviewPanel — Displays faction statistics and strategic overview
 * Shown when clicking on the national crest.
 *
 * Phase 0: shows pre-war capital, organizational coverage, declaration pressure,
 * investment counts, and stability overview.
 * Phase I+: shows territory, military, authority, population, formations.
 */

import type { GameState, FactionId } from '../../../state/game_state.js';
import { getPrewarCapital, PREWAR_CAPITAL_INITIAL } from '../../../phase0/capital.js';
import { strictCompare } from '../../../state/validateGameState.js';
import {
    turnToWeekString, getPlayerFaction, getFactionPartyPen,
    hasFactionParamilitary, hasFactionPresence,
    FACTION_DISPLAY_NAMES, FACTION_COLORS, factionCssClass,
    STABILITY_SECURE_MIN, STABILITY_CONTESTED_MIN,
} from './warroom_utils.js';

interface FactionSnapshot {
    factionName: string;
    factionId: string;
    turn: number;
    phase: string;
    territory: {
        settlementsControlled: number;
        settlementsTotal: number;
        territoryPercent: number;
    };
    military: {
        personnel: number;
        exhaustion: number;
        supplyDays: number;
    };
    authority: {
        centralAuthority: number;
        fragmentedMunicipalities: number;
    };
    population: {
        underControl: number;
        totalDisplaced: number;
    };
    warnings: string[];
}

interface Phase0Snapshot {
    factionId: FactionId;
    factionName: string;
    turn: number;
    capitalRemaining: number;
    capitalInitial: number;
    capitalPercent: number;
    investmentsByType: { police: number; to: number; party: number; paramilitary: number };
    orgCoverage: number;       // % of own-ethnic municipalities with any investment
    totalMunsWithPresence: number;
    avgStability: number;
    controlCounts: { secure: number; contested: number; highlyContested: number };
    rsPressure: number;
    hrhbPressure: number;
    rsHasDeclared: boolean;
    hrhbHasDeclared: boolean;
    rbihHrhbRelationship: number | null;
    referendumHeld: boolean;
    warCountdown: number | null;
    warnings: string[];
}

export class FactionOverviewPanel {
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }

    /**
     * Get display name for faction.
     */
    private getFactionDisplayName(factionId: string): string {
        return FACTION_DISPLAY_NAMES[factionId] || factionId;
    }

    /**
     * Generate Phase 0 specific data snapshot.
     */
    private generatePhase0Snapshot(): Phase0Snapshot {
        const factionId = getPlayerFaction(this.gameState);
        const factionName = this.getFactionDisplayName(factionId);
        const turn = this.gameState.meta.turn;

        // Capital
        const capitalRemaining = getPrewarCapital(this.gameState, factionId);
        const capitalInitial = PREWAR_CAPITAL_INITIAL[factionId] ?? 0;
        const capitalPercent = capitalInitial > 0 ? (capitalRemaining / capitalInitial) * 100 : 0;

        // Investment counts and coverage
        const investmentsByType = { police: 0, to: 0, party: 0, paramilitary: 0 };
        let totalMunsWithPresence = 0;
        let stabilitySum = 0;
        let stabilityCount = 0;
        const controlCounts = { secure: 0, contested: 0, highlyContested: 0 };

        if (this.gameState.municipalities) {
            const munIds = Object.keys(this.gameState.municipalities).sort(strictCompare);
            for (const munId of munIds) {
                const mun = this.gameState.municipalities[munId];
                if (!mun) continue;
                const op = mun.organizational_penetration;
                if (!op) continue;

                const ownPen = getFactionPartyPen(op, factionId);
                const controller = this.gameState.political_controllers?.[munId];
                const isControlled = controller === factionId;

                // Count investments
                if (factionId === 'RBiH') {
                    if (op.police_loyalty === 'loyal' && isControlled) investmentsByType.police++;
                    if (op.to_control === 'controlled') investmentsByType.to++;
                    if ((op.sda_penetration ?? 0) > 0) investmentsByType.party++;
                    if ((op.patriotska_liga ?? 0) > 0) investmentsByType.paramilitary++;
                } else if (factionId === 'RS') {
                    if (op.police_loyalty === 'loyal' && isControlled) investmentsByType.police++;
                    if ((op.sds_penetration ?? 0) > 0) investmentsByType.party++;
                    if ((op.paramilitary_rs ?? 0) > 0) investmentsByType.paramilitary++;
                } else {
                    if (op.police_loyalty === 'loyal' && isControlled) investmentsByType.police++;
                    if ((op.hdz_penetration ?? 0) > 0) investmentsByType.party++;
                    if ((op.paramilitary_hrhb ?? 0) > 0) investmentsByType.paramilitary++;
                }

                // Presence check
                if (hasFactionPresence(op, factionId, isControlled)) {
                    totalMunsWithPresence++;
                }

                // Stability
                const stability = mun.stability_score ?? 50;
                if (isControlled || ownPen > 0) {
                    stabilitySum += stability;
                    stabilityCount++;
                    if (stability >= STABILITY_SECURE_MIN) controlCounts.secure++;
                    else if (stability >= STABILITY_CONTESTED_MIN) controlCounts.contested++;
                    else controlCounts.highlyContested++;
                }
            }
        }

        const totalMuns = this.gameState.municipalities ? Object.keys(this.gameState.municipalities).length : 0;
        const orgCoverage = totalMuns > 0 ? (totalMunsWithPresence / totalMuns) * 100 : 0;
        const avgStability = stabilityCount > 0 ? stabilitySum / stabilityCount : 50;

        // Declaration pressure
        const rs = this.gameState.factions.find(f => f.id === 'RS');
        const hrhb = this.gameState.factions.find(f => f.id === 'HRHB');
        const rsPressure = rs?.declaration_pressure ?? 0;
        const hrhbPressure = hrhb?.declaration_pressure ?? 0;

        // War countdown
        let warCountdown: number | null = null;
        if (this.gameState.meta.war_start_turn !== undefined && this.gameState.meta.war_start_turn !== null) {
            warCountdown = this.gameState.meta.war_start_turn - turn;
        }

        // Warnings
        const warnings: string[] = [];
        if (capitalPercent < 25) warnings.push('Capital reserves critically low');
        if (controlCounts.highlyContested > 2) warnings.push('Multiple municipalities at risk of destabilization');
        if (rsPressure >= 80 && !rs?.declared) warnings.push('RS declaration imminent');
        if (hrhbPressure >= 80 && !hrhb?.declared) warnings.push('HRHB declaration imminent');
        if (warCountdown !== null && warCountdown <= 4) warnings.push(`War in ${warCountdown} weeks — prepare for Phase I`);
        if (warnings.length === 0) warnings.push('No strategic warnings at this time');

        return {
            factionId,
            factionName,
            turn,
            capitalRemaining,
            capitalInitial,
            capitalPercent,
            investmentsByType,
            orgCoverage,
            totalMunsWithPresence,
            avgStability,
            controlCounts,
            rsPressure,
            hrhbPressure,
            rsHasDeclared: rs?.declared ?? false,
            hrhbHasDeclared: hrhb?.declared ?? false,
            rbihHrhbRelationship: this.gameState.phase0_relationships?.rbih_hrhb ?? null,
            referendumHeld: this.gameState.meta.referendum_held ?? false,
            warCountdown,
            warnings,
        };
    }

    /**
     * Generate faction snapshot from game state (Phase I+)
     */
    private generateSnapshot(): FactionSnapshot {
        const factionId = getPlayerFaction(this.gameState);
        const faction = this.gameState.factions.find(f => f.id === factionId) ?? this.gameState.factions[0];

        const politicalControllers = this.gameState.political_controllers || {};
        const controlledSettlements = Object.values(politicalControllers).filter(
            controller => controller === factionId
        ).length;
        const totalSettlements = Object.keys(politicalControllers).length || 1;
        const territoryPercent = (controlledSettlements / totalSettlements) * 100;

        const profile = faction?.profile || {
            authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0
        };

        const personnel = controlledSettlements * 500;
        const supplyDays = Math.floor(profile.logistics * 30);
        const avgPopulationPerSettlement = 4000;
        const populationUnderControl = controlledSettlements * avgPopulationPerSettlement;
        const totalDisplaced = 0;

        const warnings: string[] = [];
        if (profile.exhaustion > 0.7) warnings.push('Critical exhaustion levels detected');
        if (profile.logistics < 0.3) warnings.push('Supply situation critical');
        if (profile.authority < 0.5) warnings.push('Central authority weakened');
        if (warnings.length === 0) warnings.push('No strategic warnings at this time');

        return {
            factionName: this.getFactionDisplayName(factionId),
            factionId,
            turn: this.gameState.meta.turn,
            phase: this.gameState.meta.phase ?? 'phase_0',
            territory: { settlementsControlled: controlledSettlements, settlementsTotal: totalSettlements, territoryPercent },
            military: { personnel, exhaustion: profile.exhaustion * 100, supplyDays },
            authority: { centralAuthority: profile.authority, fragmentedMunicipalities: 0 },
            population: { underControl: populationUnderControl, totalDisplaced },
            warnings
        };
    }

    /**
     * Render the panel — dispatches to Phase 0 or Phase I+ layout.
     */
    render(): HTMLElement {
        const phase = this.gameState.meta.phase ?? 'phase_0';
        if (phase === 'phase_0') {
            return this.renderPhase0();
        }
        return this.renderPhaseIPlus();
    }

    /**
     * Phase 0 layout: capital, investments, org coverage, declaration pressure.
     */
    private renderPhase0(): HTMLElement {
        const snap = this.generatePhase0Snapshot();

        const panel = document.createElement('div');
        panel.className = `faction-overview-panel faction-${factionCssClass(snap.factionId as FactionId)}`;
        const fc = FACTION_COLORS[snap.factionId] ?? FACTION_COLORS['RBiH'];
        panel.style.borderTop = `3px solid ${fc.primary}`;

        // Header
        const header = document.createElement('div');
        header.className = 'faction-overview-header';
        header.innerHTML = `
            <div class="fo-faction-badge" style="color:${fc.primary}">${snap.factionId}</div>
            <h2>${snap.factionName}</h2>
            <div class="meta">${turnToWeekString(snap.turn)} — PRE-WAR PHASE</div>
        `;
        panel.appendChild(header);

        // Capital section
        const capitalSection = document.createElement('div');
        capitalSection.className = 'faction-overview-section';
        const capitalColor = snap.capitalPercent > 50 ? '#00e878' : snap.capitalPercent > 25 ? '#ffab00' : '#ff3d00';
        capitalSection.innerHTML = `
            <h3>PRE-WAR CAPITAL</h3>
            <div class="fo-stat-row"><span class="fo-stat-label">Remaining</span><span class="fo-stat-value" style="color: ${capitalColor}">${snap.capitalRemaining} / ${snap.capitalInitial}</span></div>
            <div class="wr-bar-track"><div class="wr-bar-fill" style="background: ${capitalColor}; width: ${snap.capitalPercent}%;"></div></div>
            ${snap.capitalRemaining > 0 ? '<div class="wr-dialog-info wr-info-green" style="margin-top: 8px;">Click <strong>Allocate Capital</strong> in the toolbar to invest.</div>' : ''}
        `;
        panel.appendChild(capitalSection);

        // Investments section
        const investSection = document.createElement('div');
        investSection.className = 'faction-overview-section';
        const investTotal = snap.investmentsByType.police + snap.investmentsByType.to +
                           snap.investmentsByType.party + snap.investmentsByType.paramilitary;
        let investRows = `
            <div class="fo-stat-row"><span class="fo-stat-label">Police Loyalty</span><span class="fo-stat-value">${snap.investmentsByType.police}</span></div>
            <div class="fo-stat-row"><span class="fo-stat-label">Party Penetration</span><span class="fo-stat-value">${snap.investmentsByType.party}</span></div>
            <div class="fo-stat-row"><span class="fo-stat-label">Paramilitary</span><span class="fo-stat-value">${snap.investmentsByType.paramilitary}</span></div>
        `;
        if (snap.factionId === 'RBiH') {
            investRows += `
                <div class="fo-stat-row"><span class="fo-stat-label">TO Control</span><span class="fo-stat-value">${snap.investmentsByType.to}</span></div>
            `;
        }
        investSection.innerHTML = `
            <h3>INVESTMENTS (${investTotal} total)</h3>
            ${investRows}
        `;
        panel.appendChild(investSection);

        // Organizational Coverage section
        const orgSection = document.createElement('div');
        orgSection.className = 'faction-overview-section';
        orgSection.innerHTML = `
            <h3>ORGANIZATIONAL COVERAGE</h3>
            <div class="fo-stat-row"><span class="fo-stat-label">Municipalities with presence</span><span class="fo-stat-value">${snap.totalMunsWithPresence}</span></div>
            <div class="fo-stat-row"><span class="fo-stat-label">Coverage</span><span class="fo-stat-value">${snap.orgCoverage.toFixed(1)}%</span></div>
            <div class="fo-stat-row"><span class="fo-stat-label">Avg. Stability (invested)</span><span class="fo-stat-value">${snap.avgStability.toFixed(0)}</span></div>
        `;
        panel.appendChild(orgSection);

        // Control Status
        const controlSection = document.createElement('div');
        controlSection.className = 'faction-overview-section';
        controlSection.innerHTML = `
            <h3>CONTROL STATUS</h3>
            <div class="fo-stat-row"><span class="fo-stat-label" style="color: #00e878;">Secure (60+)</span><span class="fo-stat-value">${snap.controlCounts.secure}</span></div>
            <div class="fo-stat-row"><span class="fo-stat-label" style="color: #ffab00;">Contested (40-59)</span><span class="fo-stat-value">${snap.controlCounts.contested}</span></div>
            <div class="fo-stat-row"><span class="fo-stat-label" style="color: #ff3d00;">Highly Contested (&lt;40)</span><span class="fo-stat-value">${snap.controlCounts.highlyContested}</span></div>
        `;
        panel.appendChild(controlSection);

        // Declaration Watch (intelligence-gated: only show pressure for own intelligence)
        const declSection = document.createElement('div');
        declSection.className = 'faction-overview-section';
        const rsPressurePct = Math.min(100, snap.rsPressure);
        const hrhbPressurePct = Math.min(100, snap.hrhbPressure);
        const rsBarColor = snap.rsHasDeclared ? '#555570' : rsPressurePct >= 80 ? '#ff3d00' : rsPressurePct >= 50 ? '#ffab00' : '#00e878';
        const hrhbBarColor = snap.hrhbHasDeclared ? '#555570' : hrhbPressurePct >= 80 ? '#ff3d00' : hrhbPressurePct >= 50 ? '#ffab00' : '#00e878';
        declSection.innerHTML = `
            <h3>DECLARATION WATCH</h3>
            <div style="margin-bottom: 8px;">
                <div class="fo-stat-row"><span class="fo-stat-label">Republika Srpska</span><span class="fo-stat-value">${snap.rsHasDeclared ? 'DECLARED' : rsPressurePct.toFixed(0) + '%'}</span></div>
                <div class="wr-bar-track wr-bar-thin"><div class="wr-bar-fill" style="background: ${rsBarColor}; width: ${snap.rsHasDeclared ? 100 : rsPressurePct}%;"></div></div>
            </div>
            <div>
                <div class="fo-stat-row"><span class="fo-stat-label">Herceg-Bosna</span><span class="fo-stat-value">${snap.hrhbHasDeclared ? 'DECLARED' : hrhbPressurePct.toFixed(0) + '%'}</span></div>
                <div class="wr-bar-track wr-bar-thin"><div class="wr-bar-fill" style="background: ${hrhbBarColor}; width: ${snap.hrhbHasDeclared ? 100 : hrhbPressurePct}%;"></div></div>
            </div>
            ${snap.referendumHeld ? '<div class="wr-dialog-info wr-info-amber" style="margin-top: 8px; font-weight: 600;">REFERENDUM HELD</div>' : ''}
            ${snap.warCountdown !== null ? `<div class="wr-dialog-info wr-info-red" style="margin-top: 8px; font-weight: 600;">WAR IN ${snap.warCountdown} WEEKS</div>` : ''}
        `;
        panel.appendChild(declSection);

        if (snap.rbihHrhbRelationship !== null) {
            const relationshipPct = Math.round((snap.rbihHrhbRelationship + 1) * 50);
            const relationColor = snap.rbihHrhbRelationship >= 0.3 ? '#00e878'
                : snap.rbihHrhbRelationship >= 0.0 ? '#ffab00'
                    : '#ff3d00';
            const allianceSection = document.createElement('div');
            allianceSection.className = 'faction-overview-section';
            allianceSection.innerHTML = `
                <h3>ALLIANCE STATUS</h3>
                <div class="fo-stat-row"><span class="fo-stat-label">RBiH-HRHB relationship</span><span class="fo-stat-value" style="color:${relationColor}">${snap.rbihHrhbRelationship.toFixed(2)}</span></div>
                <div class="wr-bar-track wr-bar-thin"><div class="wr-bar-fill" style="background:${relationColor}; width:${relationshipPct}%;"></div></div>
                <div class="wr-dialog-info wr-info-muted" style="margin-top: 6px;">Coordinated investments preserve alliance cohesion; unilateral actions degrade it.</div>
            `;
            panel.appendChild(allianceSection);
        }

        // Warnings
        const warningsSection = document.createElement('div');
        warningsSection.className = 'faction-overview-warnings';
        warningsSection.innerHTML = `
            <h3>STRATEGIC WARNINGS</h3>
            <ul>${snap.warnings.map(w => `<li>${w}</li>`).join('')}</ul>
        `;
        panel.appendChild(warningsSection);

        return panel;
    }

    /**
     * Phase I+ layout: territory, military, authority, population, formations.
     */
    private renderPhaseIPlus(): HTMLElement {
        const snapshot = this.generateSnapshot();

        const panel = document.createElement('div');
        panel.className = `faction-overview-panel faction-${factionCssClass(snapshot.factionId as FactionId)}`;
        const fc = FACTION_COLORS[snapshot.factionId] ?? FACTION_COLORS['RBiH'];
        panel.style.borderTop = `3px solid ${fc.primary}`;

        // Header
        const header = document.createElement('div');
        header.className = 'faction-overview-header';
        header.innerHTML = `
            <div class="fo-faction-badge" style="color:${fc.primary}">${snapshot.factionId}</div>
            <h2>${snapshot.factionName}</h2>
            <div class="meta">${turnToWeekString(snapshot.turn)}</div>
        `;
        panel.appendChild(header);

        // Quadrants
        const quadrants = document.createElement('div');
        quadrants.className = 'faction-overview-quadrants';

        quadrants.appendChild(this.createQuadrant('TERRITORY', [
            { label: 'Settlements Controlled', value: `${snapshot.territory.settlementsControlled} / ${snapshot.territory.settlementsTotal}` },
            { label: 'Territory Control', value: `${snapshot.territory.territoryPercent.toFixed(1)}%` }
        ]));

        quadrants.appendChild(this.createQuadrant('MILITARY', [
            { label: 'Personnel', value: `${snapshot.military.personnel.toLocaleString()}` },
            { label: 'Exhaustion', value: `${snapshot.military.exhaustion.toFixed(0)}%` },
            { label: 'Supply Days', value: `${snapshot.military.supplyDays}` }
        ]));

        quadrants.appendChild(this.createQuadrant('AUTHORITY', [
            { label: 'Central Authority', value: `${(snapshot.authority.centralAuthority * 100).toFixed(0)}%` },
            { label: 'Fragmented Areas', value: `${snapshot.authority.fragmentedMunicipalities}` }
        ]));

        quadrants.appendChild(this.createQuadrant('POPULATION', [
            { label: 'Under Control', value: `${(snapshot.population.underControl / 1000).toFixed(1)}K` },
            { label: 'Displaced', value: `${(snapshot.population.totalDisplaced / 1000).toFixed(1)}K` }
        ]));

        // Formations (Phase I+)
        const formationsSection = this.renderFormationsSection();
        if (formationsSection) panel.appendChild(formationsSection);

        panel.appendChild(quadrants);

        // Warnings
        const warnings = document.createElement('div');
        warnings.className = 'faction-overview-warnings';
        warnings.innerHTML = `
            <h3>STRATEGIC WARNINGS</h3>
            <ul>${snapshot.warnings.map(w => `<li>${w}</li>`).join('')}</ul>
        `;
        panel.appendChild(warnings);

        return panel;
    }

    /**
     * Formations section: count per faction and short list (Phase I+).
     */
    private renderFormationsSection(): HTMLElement | null {
        const formations = this.gameState.formations;
        if (!formations || typeof formations !== 'object') return null;
        const entries = Object.entries(formations);
        if (entries.length === 0) return null;

        const byFaction = new Map<string, Array<{ id: string; name: string }>>();
        for (const [id, f] of entries) {
            if (!f || typeof f !== 'object' || !f.faction) continue;
            const list = byFaction.get(f.faction) ?? [];
            list.push({ id, name: (f as { name?: string }).name ?? id });
            byFaction.set(f.faction, list);
        }
        for (const list of byFaction.values()) {
            list.sort((a, b) => a.id.localeCompare(b.id));
        }

        const section = document.createElement('div');
        section.className = 'faction-overview-formations';
        section.innerHTML = '<h3>FORMATIONS</h3>';
        const factionIds = Array.from(byFaction.keys()).sort((a, b) => a.localeCompare(b));
        const maxList = 5;
        for (const fid of factionIds) {
            const list = byFaction.get(fid) ?? [];
            const name = this.getFactionDisplayName(fid);
            const sub = document.createElement('div');
            sub.className = 'formations-by-faction';
            sub.innerHTML = `<strong>${name}</strong>: ${list.length} formation(s)`;
            const ul = document.createElement('ul');
            for (const item of list.slice(0, maxList)) {
                const li = document.createElement('li');
                li.textContent = item.name || item.id;
                ul.appendChild(li);
            }
            if (list.length > maxList) {
                const li = document.createElement('li');
                li.textContent = `\u2026 +${list.length - maxList} more`;
                ul.appendChild(li);
            }
            sub.appendChild(ul);
            section.appendChild(sub);
        }
        return section;
    }

    /**
     * Create a quadrant div (Phase I+)
     */
    private createQuadrant(title: string, stats: Array<{label: string; value: string}>): HTMLElement {
        const quad = document.createElement('div');
        quad.className = 'quadrant';

        const heading = document.createElement('h3');
        heading.textContent = title;
        quad.appendChild(heading);

        stats.forEach(stat => {
            const statDiv = document.createElement('div');
            statDiv.className = 'stat';
            statDiv.innerHTML = `
                <div class="stat-label">${stat.label}</div>
                <div class="stat-value">${stat.value}</div>
            `;
            quad.appendChild(statDiv);
        });

        return quad;
    }
}
