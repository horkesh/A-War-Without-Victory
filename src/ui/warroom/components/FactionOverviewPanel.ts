/**
 * FactionOverviewPanel — Displays faction statistics and strategic overview
 * Shown when clicking on the national crest.
 *
 * Phase 0: shows pre-war capital, organizational coverage, declaration pressure,
 * investment counts, and stability overview.
 * Peace phase+: shows territory, military (real data), casualties, authority/supply,
 * formations with personnel/posture, and data-driven strategic warnings.
 */

/** @deprecated Phase 0 removed. Stubs for prewar capital display. */
function getPrewarCapital(_s: unknown, _f: unknown): number { return 0; }
const PREWAR_CAPITAL_INITIAL: Record<string, number> = {};
import type { FactionId, GameState } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { extractWarData, type OfficerListEntry, type WarDataSnapshot } from '../data/war_data_extractor.js';
import {
    FACTION_COLORS,
    FACTION_DISPLAY_NAMES,
    exhaustionLabel,
    factionCssClass,
    getFactionPartyPen,
    getPlayerFaction,
    hasFactionPresence,
    STABILITY_CONTESTED_MIN,
    STABILITY_SECURE_MIN,
    trendArrow,
    turnToWeekString
} from './warroom_utils.js';
import { getWarroomFactionIdentity } from './warroom_identity.js';

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
    private modalManager: any; // Using any for simplicity or import ModalManager if possible

    constructor(gameState: GameState, modalManager: any) {
        this.gameState = gameState;
        this.modalManager = modalManager;
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

        if (this.gameState.political.municipalities) {
            const munIds = Object.keys(this.gameState.political.municipalities).sort(strictCompare);
            for (const munId of munIds) {
                const mun = this.gameState.political.municipalities[munId];
                if (!mun) continue;
                const op = mun.organizational_penetration;
                if (!op) continue;

                const ownPen = getFactionPartyPen(op, factionId);
                const controller = this.gameState.political.political_controllers?.[munId];
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

        const totalMuns = this.gameState.political.municipalities ? Object.keys(this.gameState.political.municipalities).length : 0;
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
        if (warCountdown !== null && warCountdown <= 4) warnings.push(`War in ${warCountdown} weeks \u2014 prepare for Peace phase`);
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
            rbihHrhbRelationship: this.gameState.political.phase0_relationships?.rbih_hrhb ?? null,
            referendumHeld: this.gameState.meta.referendum_held ?? false,
            warCountdown,
            warnings,
        };
    }

    /**
     * Render the panel — dispatches to Phase 0 or Peace phase+ layout.
     */
    render(): HTMLElement {
        const phase = this.gameState.meta.phase ?? 'peace';
        if (phase === 'peace') {
            return this.renderPhase0();
        }
        return this.renderPhaseIPlus();
    }

    /**
     * Phase 0 layout: capital, investments, org coverage, declaration pressure.
     */
    private renderPhase0(): HTMLElement {
        const snap = this.generatePhase0Snapshot();
        const identity = getWarroomFactionIdentity(snap.factionId);

        const panel = document.createElement('div');
        panel.className = `panel-power-on weathered-panel faction-overview-panel faction-${factionCssClass(snap.factionId as FactionId)}`;
        const fc = FACTION_COLORS[snap.factionId] ?? FACTION_COLORS['RBiH'];
        panel.style.borderTop = `3px solid ${fc.primary}`;

        // Header
        const header = document.createElement('div');
        header.className = 'faction-overview-header';
        header.innerHTML = `
            <div class="fo-faction-badge text-accent-gold" style="color:${fc.primary}">${snap.factionId}</div>
            <h2 class="text-accent-gold">${snap.factionName}</h2>
            <div class="meta">${turnToWeekString(snap.turn)} \u2014 PRE-WAR PHASE</div>
            <div class="meta">${identity.ceremonialLine}</div>
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
            <h3>${identity.archiveLabel.toUpperCase()} WARNINGS</h3>
            <ul>${snap.warnings.map(w => `<li>${w}</li>`).join('')}</ul>
        `;
        panel.appendChild(warningsSection);

        return panel;
    }

    /**
     * Peace phase+ layout: territory, military, casualties, authority/supply, formations, warnings.
     * Uses extractWarData() for real GameState data instead of fake placeholders.
     */
    private renderPhaseIPlus(): HTMLElement {
        const pf = getPlayerFaction(this.gameState);
        const identity = getWarroomFactionIdentity(pf);
        const snap = extractWarData(this.gameState, pf);
        const fc = FACTION_COLORS[pf] ?? FACTION_COLORS['RBiH'];

        const panel = document.createElement('div');
        panel.className = `panel-power-on weathered-panel faction-overview-panel faction-${factionCssClass(pf)}`;
        panel.style.borderTop = `3px solid ${fc.primary}`;

        // Header
        const header = document.createElement('div');
        header.className = 'faction-overview-header';
        header.innerHTML = `
            <div class="fo-faction-badge text-accent-gold" style="color:${fc.primary}">${pf}</div>
            <h2 class="text-accent-gold">${this.getFactionDisplayName(pf)}</h2>
            <div class="meta">${turnToWeekString(snap.turn)}</div>
            <div class="meta">${identity.ceremonialLine}</div>
        `;
        panel.appendChild(header);

        // Quadrants
        const quadrants = document.createElement('div');
        quadrants.className = 'faction-overview-quadrants';

        // TERRITORY — area-weighted primary, settlement count secondary
        const territoryStats: Array<{ label: string; value: string }> = [
            { label: 'Territory Control', value: `${snap.ownTerritory.territoryPercent.toFixed(1)}%` },
            { label: 'Settlements Controlled', value: `${snap.ownTerritory.settlementsControlled} / ${snap.ownTerritory.settlementsTotal}` },
        ];
        if (snap.ownTerritory.areaControlledKm2 != null && snap.ownTerritory.areaTotalKm2 != null) {
            territoryStats.push({ label: 'Area Controlled', value: `${snap.ownTerritory.areaControlledKm2.toFixed(0)} / ${snap.ownTerritory.areaTotalKm2.toFixed(0)} km²` });
        }
        quadrants.appendChild(this.createQuadrant('TERRITORY', territoryStats));

        // MILITARY — real data from formations
        const inTransitCount = snap.brigadeMovement.inTransit.length;
        const militaryStats: Array<{ label: string; value: string }> = [
            { label: 'Personnel', value: snap.ownForces.totalPersonnel.toLocaleString() },
            { label: 'Active Brigades', value: `${snap.ownForces.activeBrigades} / ${snap.ownForces.totalBrigades}` },
            { label: 'Corps', value: `${snap.ownForces.corpsCount}` },
            { label: 'Avg. Cohesion', value: `${snap.ownForces.avgCohesion.toFixed(0)}` },
            { label: 'Exhaustion', value: `${exhaustionLabel(snap.ownExhaustion.level)} ${trendArrow(snap.ownExhaustion.trend)}` },
        ];
        if (inTransitCount > 0) {
            militaryStats.push({ label: 'In Transit', value: `${inTransitCount}` });
        }
        quadrants.appendChild(this.createQuadrant('MILITARY', militaryStats));

        // CASUALTIES — real data from casualty_ledger
        const cas = snap.ownCasualties;
        quadrants.appendChild(this.createQuadrant('CASUALTIES', [
            { label: 'KIA', value: cas.killed.toLocaleString() },
            { label: 'WIA', value: cas.wounded.toLocaleString() },
            { label: 'MIA/Captured', value: cas.missingCaptured.toLocaleString() },
            { label: 'Civilian Killed', value: snap.ownDisplacement.civilianKilled.toLocaleString() },
            { label: 'Equipment Lost', value: `T:${cas.equipmentLost.tanks} A:${cas.equipmentLost.artillery} AA:${cas.equipmentLost.aa}` },
            { label: 'WIA Pending Return', value: cas.woundedPendingReturn.toLocaleString() },
        ]));

        // AUTHORITY & SUPPLY — real data, authority displayed directly (no double multiplication)
        const authPct = (snap.ownAuthority.authority * 100).toFixed(0);
        quadrants.appendChild(this.createQuadrant('AUTHORITY & SUPPLY', [
            { label: 'Authority', value: `${authPct}%` },
            { label: 'Legitimacy', value: `${(snap.ownAuthority.legitimacy * 100).toFixed(0)}%` },
            { label: 'Supply: Adequate', value: `${snap.ownSupply.adequateCount}` },
            { label: 'Supply: Strained', value: `${snap.ownSupply.strainedCount}` },
            { label: 'Supply: Critical', value: `${snap.ownSupply.criticalCount}` },
            { label: 'Collapsed Municipalities', value: `${snap.ownSupply.collapsedMunicipalities.length}` },
        ]));

        panel.appendChild(quadrants);

        // Formations — own faction only, with personnel and posture
        const formationsSection = this.renderOwnFormationsSection(snap);
        if (formationsSection) panel.appendChild(formationsSection);

        // Officers (Phase E) — own faction only
        const officersSection = this.renderOfficersSection(snap);
        if (officersSection) panel.appendChild(officersSection);

        // Strategic Warnings — data-driven from real state
        const warnings = this.generateWarPhaseWarnings(snap);
        const warningsDiv = document.createElement('div');
        warningsDiv.className = 'faction-overview-warnings';
        warningsDiv.innerHTML = `
            <h3>${identity.archiveLabel.toUpperCase()} WARNINGS</h3>
            <ul>${warnings.map(w => `<li>${w}</li>`).join('')}</ul>
        `;
        panel.appendChild(warningsDiv);

        return panel;
    }

    /**
     * Formations section for Peace phase+: own faction formations with personnel, posture, kind.
     */
    private renderOwnFormationsSection(snap: WarDataSnapshot): HTMLElement | null {
        const ownFormations = snap.ownForces.formationDetails;
        if (ownFormations.length === 0) return null;

        const section = document.createElement('div');
        section.className = 'faction-overview-formations';
        section.innerHTML = `<h3>FORMATIONS (${ownFormations.length})</h3>`;

        const maxList = 10;
        const ul = document.createElement('ul');
        for (const f of ownFormations.slice(0, maxList)) {
            const li = document.createElement('li');
            const kindLabel = f.kind === 'brigade' ? '' : ` [${f.kind}]`;
            const personnelLabel = f.personnel > 0 ? ` \u2014 ${f.personnel.toLocaleString()} pers.` : '';
            const postureLabel = f.kind === 'brigade' || f.kind === 'operational_group'
                ? ` (${f.posture})`
                : '';
            const movementLabel = f.movementStatus !== 'deployed'
                ? ` [${f.movementStatus.toUpperCase()}]`
                : '';
            li.textContent = `${f.name}${kindLabel}${personnelLabel}${postureLabel}${movementLabel}`;
            ul.appendChild(li);
        }
        if (ownFormations.length > maxList) {
            const li = document.createElement('li');
            li.textContent = `\u2026 +${ownFormations.length - maxList} more`;
            ul.appendChild(li);
        }
        section.appendChild(ul);
        return section;
    }

    /**
     * Officers section for Peace phase+ (Phase E): list commanders for player faction.
     */
    private renderOfficersSection(snap: WarDataSnapshot): HTMLElement | null {
        const pf = snap.playerFaction;
        const list = snap.officersByFaction?.[pf];
        if (!list || list.length === 0) return null;

        const section = document.createElement('div');
        section.className = 'faction-overview-section';
        section.innerHTML = `<h3>COMMAND (${list.length})</h3>`;

        const ul = document.createElement('ul');
        const statusLabel = (s: string): string => {
            switch (s) {
                case 'active': return 'Active';
                case 'reserve': return 'Reserve';
                case 'killed': return 'Killed';
                case 'retired': return 'Retired';
                case 'captured': return 'Captured';
                case 'defected': return 'Defected';
                default: return s;
            }
        };
        for (const o of list) {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.marginBottom = '4px';

            const info = document.createElement('span');
            const corpsLabel = o.assigned_corps_id ? ` \u2014 ${o.assigned_corps_id}` : ' \u2014 \u2014';
            const actingLabel = o.acting_commander ? ' (Acting)' : '';
            info.textContent = `${o.name} [${o.rank}] ${statusLabel(o.status)}${actingLabel}${corpsLabel}`;
            li.appendChild(info);

            if (o.status === 'active' && o.assigned_corps_id) {
                const changeBtn = document.createElement('button');
                changeBtn.className = 'commander-change-btn';
                changeBtn.textContent = 'CHANGE';
                changeBtn.style.fontSize = '10px';
                changeBtn.style.padding = '2px 6px';
                changeBtn.style.marginLeft = '8px';
                changeBtn.onclick = () => {
                    this.showOfficerSelectionDialog(o.assigned_corps_id!, snap);
                };
                li.appendChild(changeBtn);
            }

            ul.appendChild(li);
        }
        section.appendChild(ul);
        return section;
    }

    /**
     * Show a sub-dialog to select a new commander from the reserve pool.
     */
    private showOfficerSelectionDialog(corpsId: string, snap: WarDataSnapshot): void {
        const pf = snap.playerFaction;
        const allOfficers = snap.officersByFaction?.[pf] || [];
        const reserves = allOfficers.filter(o => o.status === 'reserve');

        const dialog = document.createElement('div');
        dialog.className = 'wr-dialog weathered-panel';
        dialog.style.maxWidth = '400px';

        let reservesHtml = '';
        if (reserves.length === 0) {
            reservesHtml = '<div class="wr-dialog-notice">No officers currently in reserve pool.</div>';
        } else {
            reservesHtml = `
                <div class="officer-selection-list" style="max-height: 300px; overflow-y: auto; margin-top: 10px;">
                    ${reserves.map(o => `
                        <div class="officer-option" style="display: flex; justify-content: space-between; align-items: center; padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: pointer;" 
                             onclick="this.dispatchEvent(new CustomEvent('select-officer', { detail: { id: '${o.id}' }, bubbles: true }))">
                            <span>${o.name} [${o.rank}]</span>
                            <span style="font-size: 10px; color: #aaa;">Comp: ${o.competence}/5</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        dialog.innerHTML = `
            <h2 class="text-accent-gold">ASSIGN COMMANDER</h2>
            <div class="wr-dialog-body">
                <div style="margin-bottom: 10px; font-size: 12px; color: #ccc;">Select a new commander for <strong>${corpsId}</strong></div>
                ${reservesHtml}
            </div>
            <div class="wr-dialog-actions" style="margin-top: 15px;">
                <button id="assign-cancel-btn" class="wr-btn wr-btn-secondary">CANCEL</button>
            </div>
        `;

        this.modalManager.showModal(dialog);

        // Handle selection
        dialog.addEventListener('select-officer', async (e: any) => {
            const officerId = e.detail.id;
            const bridge = (window as any).awwv;
            if (bridge?.assignCommander) {
                try {
                    const res = await bridge.assignCommander(officerId, corpsId);
                    if (res.ok) {
                        this.modalManager.hideModal();
                        // The bridge will trigger a game-state-updated which will refresh the UI
                    } else {
                        alert(`Assignment failed: ${res.error}`);
                    }
                } catch (err) {
                    console.error('Failed to assign commander:', err);
                }
            }
        });

        document.getElementById('assign-cancel-btn')!.onclick = () => {
            // Re-show the faction overview panel
            this.modalManager.showModal(this.render());
        };
    }

    /**
     * Generate war-phase strategic warnings from real state data.
     */
    private generateWarPhaseWarnings(snap: WarDataSnapshot): string[] {
        const warnings: string[] = [];
        const state = this.gameState;
        const pf = snap.playerFaction;

        // Sustainability collapses
        if (snap.ownSupply.collapsedMunicipalities.length > 0) {
            warnings.push(`Sustainability collapsed in ${snap.ownSupply.collapsedMunicipalities.length} municipality(s)`);
        }

        // Exhaustion worsening
        const trends = state.political.loss_of_control_trends?.by_faction?.[pf];
        if (trends?.exhaustion_increasing) {
            warnings.push('Exhaustion trend worsening');
        }
        if (trends?.collapse_eligible) {
            warnings.push('Faction is collapse-eligible');
        }

        // Authority critically low
        if (snap.ownAuthority.authority < 0.30) {
            warnings.push('Central authority critically low');
        }

        // Alliance strained (RBiH/HRHB only)
        if ((pf === 'RBiH' || pf === 'HRHB') && snap.ownDiplomacy.rbihHrhbState) {
            if (snap.ownDiplomacy.rbihHrhbState.allianceValue < 0.20) {
                warnings.push('Alliance with partner faction severely strained');
            }
        }

        // Exposed front gaps
        if (snap.exposedFrontSettlements.length > 0) {
            warnings.push(`EXPOSED FRONT: ${snap.exposedFrontSettlements.length} settlement(s) undefended`);
        }

        // Encircled brigades
        if (snap.brigadeMovement.encircled.length > 0) {
            warnings.push(`${snap.brigadeMovement.encircled.length} brigade(s) encircled`);
        }

        // Brigades in transit (front gaps opening)
        if (snap.brigadeMovement.packing.length > 0) {
            warnings.push(`${snap.brigadeMovement.packing.length} brigade(s) packing \u2014 front gaps opening`);
        }

        if (warnings.length === 0) warnings.push('No strategic warnings at this time');
        return warnings;
    }

    /**
     * Create a quadrant div (Peace phase+)
     */
    private createQuadrant(title: string, stats: Array<{ label: string; value: string }>): HTMLElement {
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
