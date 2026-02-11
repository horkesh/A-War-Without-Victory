/**
 * FactionOverviewPanel — Displays faction statistics and strategic overview
 * Shown when clicking on the national crest
 */

import { GameState } from '../../../state/game_state.js';

interface FactionSnapshot {
    factionName: string;
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

export class FactionOverviewPanel {
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }

    /**
     * Generate faction snapshot from game state
     */
    private generateSnapshot(): FactionSnapshot {
        const faction = this.gameState.factions[0];
        const factionId = faction?.id || 'Unknown';

        // Count controlled settlements
        const politicalControllers = this.gameState.political_controllers || {};
        const controlledSettlements = Object.values(politicalControllers).filter(
            controller => controller === factionId
        ).length;
        const totalSettlements = Object.keys(politicalControllers).length || 1;
        const territoryPercent = (controlledSettlements / totalSettlements) * 100;

        // Extract faction profile data (with defaults for Phase 0)
        const profile = faction?.profile || {
            authority: 1,
            legitimacy: 1,
            control: 1,
            logistics: 1,
            exhaustion: 0
        };

        // Calculate personnel (placeholder for MVP)
        const personnel = controlledSettlements * 500; // Rough estimate

        // Calculate supply days (placeholder)
        const supplyDays = Math.floor(profile.logistics * 30);

        // Calculate population under control (placeholder)
        const avgPopulationPerSettlement = 4000;
        const populationUnderControl = controlledSettlements * avgPopulationPerSettlement;

        // Calculate displaced (placeholder for Phase 0 - no displacement yet)
        const totalDisplaced = 0;

        // Generate warnings (placeholder)
        const warnings: string[] = [];
        if (profile.exhaustion > 0.7) {
            warnings.push('Critical exhaustion levels detected');
        }
        if (profile.logistics < 0.3) {
            warnings.push('Supply situation critical');
        }
        if (profile.authority < 0.5) {
            warnings.push('Central authority weakened');
        }
        if (warnings.length === 0) {
            warnings.push('No strategic warnings at this time');
        }

        return {
            factionName: this.getFactionDisplayName(factionId),
            turn: this.gameState.meta.turn,
            phase: this.gameState.meta.phase ?? 'phase_0',
            territory: {
                settlementsControlled: controlledSettlements,
                settlementsTotal: totalSettlements,
                territoryPercent: territoryPercent
            },
            military: {
                personnel: personnel,
                exhaustion: profile.exhaustion * 100,
                supplyDays: supplyDays
            },
            authority: {
                centralAuthority: profile.authority,
                fragmentedMunicipalities: 0 // Placeholder for MVP
            },
            population: {
                underControl: populationUnderControl,
                totalDisplaced: totalDisplaced
            },
            warnings: warnings
        };
    }

    /**
     * Get display name for faction
     */
    private getFactionDisplayName(factionId: string): string {
        const names: Record<string, string> = {
            'RBiH': 'Republic of Bosnia and Herzegovina',
            'RS': 'Republika Srpska',
            'HRHB': 'Croatian Republic of Herzeg-Bosnia'
        };
        return names[factionId] || factionId;
    }

    /**
     * Format turn to date string
     */
    private turnToDateString(turn: number): string {
        // Starting date: September 1991 (Turn 0)
        // Each turn = 1 week
        const startDate = new Date(1991, 8, 1); // Month is 0-indexed
        const weeksToAdd = turn;
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + (weeksToAdd * 7));

        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
        const month = months[currentDate.getMonth()];
        const year = currentDate.getFullYear();
        const week = Math.floor((currentDate.getDate() - 1) / 7) + 1;

        return `Week ${week}, ${month} ${year}`;
    }

    /**
     * Render the faction overview panel as HTML element
     */
    render(): HTMLElement {
        const snapshot = this.generateSnapshot();

        const panel = document.createElement('div');
        panel.className = 'faction-overview-panel';

        // Header
        const header = document.createElement('div');
        header.className = 'faction-overview-header';
        header.innerHTML = `
            <h2>${snapshot.factionName}</h2>
            <div class="meta">${this.turnToDateString(snapshot.turn)}</div>
        `;
        panel.appendChild(header);

        // Quadrants
        const quadrants = document.createElement('div');
        quadrants.className = 'faction-overview-quadrants';

        // Territory Quadrant
        const territoryQuad = this.createQuadrant('TERRITORY', [
            { label: 'Settlements Controlled', value: `${snapshot.territory.settlementsControlled} / ${snapshot.territory.settlementsTotal}` },
            { label: 'Territory Control', value: `${snapshot.territory.territoryPercent.toFixed(1)}%` }
        ]);
        quadrants.appendChild(territoryQuad);

        // Military Quadrant
        const militaryQuad = this.createQuadrant('MILITARY', [
            { label: 'Personnel', value: `${snapshot.military.personnel.toLocaleString()}` },
            { label: 'Exhaustion', value: `${snapshot.military.exhaustion.toFixed(0)}%` },
            { label: 'Supply Days', value: `${snapshot.military.supplyDays}` }
        ]);
        quadrants.appendChild(militaryQuad);

        // Authority Quadrant
        const authorityQuad = this.createQuadrant('AUTHORITY', [
            { label: 'Central Authority', value: `${(snapshot.authority.centralAuthority * 100).toFixed(0)}%` },
            { label: 'Fragmented Areas', value: `${snapshot.authority.fragmentedMunicipalities}` }
        ]);
        quadrants.appendChild(authorityQuad);

        // Population Quadrant
        const populationQuad = this.createQuadrant('POPULATION', [
            { label: 'Under Control', value: `${(snapshot.population.underControl / 1000).toFixed(1)}K` },
            { label: 'Displaced', value: `${(snapshot.population.totalDisplaced / 1000).toFixed(1)}K` }
        ]);
        quadrants.appendChild(populationQuad);

        // Formations (Phase I+): count per faction and short list
        const formationsSection = this.renderFormationsSection();
        if (formationsSection) panel.appendChild(formationsSection);

        panel.appendChild(quadrants);

        // Warnings
        const warnings = document.createElement('div');
        warnings.className = 'faction-overview-warnings';
        warnings.innerHTML = `
            <h3>⚠ STRATEGIC WARNINGS</h3>
            <ul>
                ${snapshot.warnings.map(w => `<li>${w}</li>`).join('')}
            </ul>
        `;
        panel.appendChild(warnings);

        return panel;
    }

    /**
     * Formations section: count per faction and short list (id/name). Read-only from state.formations.
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
                li.textContent = `… +${list.length - maxList} more`;
                ul.appendChild(li);
            }
            sub.appendChild(ul);
            section.appendChild(sub);
        }
        return section;
    }

    /**
     * Create a quadrant div
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
