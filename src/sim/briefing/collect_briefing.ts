/**
 * Sim-side command briefing collector — deterministic, save-compatible.
 *
 * Produces structured briefing items from GameState for the player's faction.
 * Items are classified by severity (critical > warning > info) and section.
 *
 * Open registry pattern: downstream milestones call registerBriefingCollector()
 * to add new sections (e.g. v0.5.4 AAR, v0.6.2 milestones) without modifying
 * this file.
 *
 * Deterministic: sorted iteration, no randomness.
 */

import type { GameState, FactionId, FormationId, FormationState, EnclaveResilienceEntry } from '../../state/game_state.js';
import type { PendingOfficerEvent, OfficerEventType } from '../../state/officer_types.js';
import type { PatronRelationship } from '../../state/negotiation_types.js';
import { strictCompare } from '../../state/validateGameState.js';

export type BriefingSeverity = 'critical' | 'warning' | 'info';

export interface BriefingItem {
    id: string;
    section: string;
    severity: BriefingSeverity;
    title: string;
    detail: string;
    actionLabel?: string;
    target?: {
        kind?: string;
        osid?: string;
        corpsId?: string;
        enclaveId?: string;
        label?: string;
        summaryFocus?: string;
        operationKey?: string;
        sectorId?: string;
        peacePlanId?: string;
        officerFocus?: string;
    };
}

export interface CommandBriefing {
    turn: number;
    faction: FactionId;
    items: BriefingItem[];
    criticalCount: number;
    warningCount: number;
    headline: string;
}

export type BriefingCollectorFn = (state: GameState, faction: FactionId) => BriefingItem[];

const collectors: Array<{ name: string; fn: BriefingCollectorFn }> = [];

type SupplyStateLevel = 'adequate' | 'strained' | 'critical';
type CorridorStateLevel = 'open' | 'brittle' | 'cut';

interface SupplyStateByOsidBriefingReport {
    factions?: Array<{
        faction_id?: string;
        by_osid?: Array<{ osid?: string; state?: string }>;
    }>;
}

interface SupplyCorridorsOsidBriefingReport {
    corridors?: Array<{
        faction_id?: string;
        edge_id?: string;
        state?: string;
    }>;
}

type GameStateWithSupplyReports = GameState & {
    supply_state_by_osid?: SupplyStateByOsidBriefingReport;
    supply_corridors_osid?: SupplyCorridorsOsidBriefingReport;
};

function getCorpsCommandFaction(
    formations: Record<FormationId, FormationState>,
    corpsId: FormationId,
): FactionId | null {
    const corps = formations[corpsId];
    if (!corps) return null;
    if (corps.kind !== 'corps' && corps.kind !== 'corps_asset' && corps.kind !== 'army_hq') {
        return null;
    }
    return corps.faction;
}

function normalizeEnclaveResilienceEntry(
    entry: number | EnclaveResilienceEntry,
): { resilience: number; isolation_turns: number } {
    if (typeof entry === 'number') {
        return { resilience: entry, isolation_turns: 0 };
    }
    return {
        resilience: entry.resilience,
        isolation_turns: entry.isolation_turns,
    };
}

function normalizeSupplyState(value: string | undefined): SupplyStateLevel | null {
    return value === 'adequate' || value === 'strained' || value === 'critical' ? value : null;
}

function normalizeCorridorState(value: string | undefined): CorridorStateLevel | null {
    return value === 'open' || value === 'brittle' || value === 'cut' ? value : null;
}

function formatCount(count: number, singular: string, plural = `${singular}s`): string {
    return `${count} ${count === 1 ? singular : plural}`;
}

function formatIdLabel(id: string): string {
    return id
        .split(/[_:-]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

/**
 * Register a briefing collector. Collectors are called in registration order.
 * Each returns BriefingItem[] which are merged and sorted by severity.
 */
export function registerBriefingCollector(name: string, fn: BriefingCollectorFn): void {
    collectors.push({ name, fn });
}

/**
 * Assemble the full command briefing for a faction.
 * Called at end of turn pipeline; result stored in state.military.last_briefing.
 */
export function assembleCommandBriefing(state: GameState, faction: FactionId): CommandBriefing {
    const items: BriefingItem[] = [];
    for (const { fn } of collectors) {
        try {
            items.push(...fn(state, faction));
        } catch {
            // Non-fatal — skip broken collector
        }
    }

    // Sort: critical first, then warning, then info; within severity by id
    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    items.sort((a, b) =>
        (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2) ||
        strictCompare(a.id, b.id)
    );

    const criticalCount = items.filter(i => i.severity === 'critical').length;
    const warningCount = items.filter(i => i.severity === 'warning').length;

    let headline = 'No significant activity to report.';
    if (criticalCount > 0) {
        headline = `${criticalCount} critical item${criticalCount > 1 ? 's' : ''} require${criticalCount === 1 ? 's' : ''} attention.`;
    } else if (warningCount > 0) {
        headline = `${warningCount} item${warningCount > 1 ? 's' : ''} of note.`;
    } else if (items.length > 0) {
        headline = `${items.length} item${items.length > 1 ? 's' : ''} for your review.`;
    }

    return {
        turn: state.meta?.turn ?? 0,
        faction,
        items,
        criticalCount,
        warningCount,
        headline,
    };
}

// ── Built-in collectors ─────────────────────────────────────────────────────

// Section 1: Military situation
registerBriefingCollector('military', (state, faction) => {
    const items: BriefingItem[] = [];
    const formations = state.military?.formations ?? {};

    // Count active operations
    const ops = Object.entries(state.military?.corps_command ?? {})
        .filter(([corpsId]) => getCorpsCommandFaction(formations, corpsId) === faction)
        .flatMap(([, cc]) => cc.active_operations ?? []);

    if (ops.length > 0) {
        items.push({
            id: 'mil-active-ops',
            section: 'military',
            severity: 'info',
            title: `${ops.length} active operation${ops.length > 1 ? 's' : ''}`,
            detail: `${ops.length} corps-level operation${ops.length > 1 ? 's' : ''} in progress.`,
        });
    }

    // Count disrupted brigades
    const disrupted = Object.values(formations).filter((f: FormationState) =>
        f.faction === faction && f.kind === 'brigade' && f.status === 'active' && (f.disrupted_turns ?? 0) > 0
    );
    if (disrupted.length >= 3) {
        items.push({
            id: 'mil-disrupted',
            section: 'military',
            severity: 'warning',
            title: `${disrupted.length} brigades disrupted`,
            detail: `${disrupted.length} brigade${disrupted.length > 1 ? 's' : ''} are disrupted and combat-ineffective.`,
        });
    }

    // Low-cohesion corps warning
    const corpsFormations = Object.entries(formations).filter(([, f]: [string, FormationState]) =>
        f.faction === faction && (f.kind === 'corps' || f.kind === 'corps_asset') && f.status === 'active'
    );
    for (const [corpsId, cf] of corpsFormations) {
        const subs = Object.values(formations).filter((f: FormationState) =>
            f.corps_id === corpsId && f.kind === 'brigade' && f.status === 'active'
        );
        if (subs.length === 0) continue;
        const avgCohesion = subs.reduce((sum: number, f: FormationState) => sum + (f.cohesion ?? 60), 0) / subs.length;
        if (avgCohesion < 40) {
            items.push({
                id: `mil-cohesion-${corpsId}`,
                section: 'military',
                severity: 'warning',
                title: `${(cf as FormationState).name ?? corpsId}: low cohesion`,
                detail: `Average cohesion ${Math.round(avgCohesion)}% — combat effectiveness degraded.`,
                target: { corpsId },
            });
        }
    }

    return items;
});

// Section 1b: Logistics / supply
registerBriefingCollector('logistics', (state, faction) => {
    const supplyState = (state as GameStateWithSupplyReports).supply_state_by_osid;
    const corridors = (state as GameStateWithSupplyReports).supply_corridors_osid;
    const factionSupply = supplyState?.factions
        ?.filter(entry => entry.faction_id === faction)
        .flatMap(entry => entry.by_osid ?? []) ?? [];
    const factionCorridors = corridors?.corridors
        ?.filter(entry => entry.faction_id === faction) ?? [];

    let adequate = 0;
    let strained = 0;
    let critical = 0;
    for (const entry of [...factionSupply].sort((a, b) => strictCompare(String(a.osid ?? ''), String(b.osid ?? '')))) {
        const stateLevel = normalizeSupplyState(entry.state);
        if (stateLevel === 'adequate') adequate++;
        else if (stateLevel === 'strained') strained++;
        else if (stateLevel === 'critical') critical++;
    }

    let brittle = 0;
    let cut = 0;
    for (const entry of [...factionCorridors].sort((a, b) => strictCompare(String(a.edge_id ?? ''), String(b.edge_id ?? '')))) {
        const stateLevel = normalizeCorridorState(entry.state);
        if (stateLevel === 'brittle') brittle++;
        else if (stateLevel === 'cut') cut++;
    }

    if (adequate + strained + critical + brittle + cut === 0) return [];

    const severity: BriefingSeverity = critical > 0 || cut > 0
        ? 'critical'
        : strained > 0 || brittle > 0
            ? 'warning'
            : 'info';
    const title = severity === 'critical'
        ? 'Supply lines critically exposed'
        : severity === 'warning'
            ? 'Supply lines under strain'
            : 'Supply lines holding';
    const supplyParts = [
        formatCount(adequate, 'adequate'),
        formatCount(strained, 'strained'),
        formatCount(critical, 'critical'),
    ];
    const corridorParts = [
        formatCount(cut, 'cut corridor'),
        formatCount(brittle, 'brittle corridor'),
    ];

    return [{
        id: 'log-supply',
        section: 'logistics',
        severity,
        title,
        detail: `${supplyParts.join(', ')}; ${corridorParts.join(', ')}.`,
        actionLabel: 'Review Supply',
        target: { kind: 'summary', summaryFocus: 'support', label: 'Supply ledger' },
    }];
});

// Section 2: Diplomatic
registerBriefingCollector('diplomatic', (state, faction) => {
    const items: BriefingItem[] = [];
    const neg = state.military?.negotiation;

    // Pending peace plan
    if (neg?.pending_peace_plan) {
        items.push({
            id: 'dip-peace-plan',
            section: 'diplomatic',
            severity: 'critical',
            title: 'Peace plan requires response',
            detail: `A peace plan has been proposed. Your response is required.`,
            actionLabel: 'Review Plan',
            target: {
                kind: 'peace_plan',
                peacePlanId: String((neg.pending_peace_plan as { plan_id?: string; planId?: string }).plan_id ?? (neg.pending_peace_plan as { planId?: string }).planId ?? 'pending'),
                label: 'Peace plan',
            },
        });
    }

    // Patron pressure threshold
    const patronRel = neg?.patron_relationships?.[faction];
    if (patronRel && typeof patronRel === 'object') {
        const override = (patronRel as PatronRelationship).override_authority ?? 0;
        if (override >= 75) {
            items.push({
                id: 'dip-patron-override',
                section: 'diplomatic',
                severity: 'critical',
                title: 'Patron override imminent',
                detail: `Patron authority at ${Math.round(override)}% — forced concessions likely at Dayton.`,
            });
        } else if (override >= 50) {
            items.push({
                id: 'dip-patron-pressure',
                section: 'diplomatic',
                severity: 'warning',
                title: 'Patron pressure increasing',
                detail: `Patron authority at ${Math.round(override)}%.`,
            });
        }
    }

    return items;
});

// Section 3: Humanitarian
registerBriefingCollector('humanitarian', (state, faction) => {
    const items: BriefingItem[] = [];

    // Enclave status lives on PoliticalState; old saves may still carry a
    // bare resilience number, which has no isolation duration and stays silent.
    const enclaveRes = state.political?.enclave_resilience;
    if (enclaveRes && typeof enclaveRes === 'object') {
        for (const [enclaveId, entry] of Object.entries(enclaveRes).sort((a, b) => strictCompare(a[0], b[0]))) {
            const e = normalizeEnclaveResilienceEntry(entry);
            if (e.isolation_turns >= 8) {
                items.push({
                    id: `hum-enclave-${enclaveId}`,
                    section: 'humanitarian',
                    severity: e.isolation_turns >= 16 ? 'critical' : 'warning',
                    title: `${formatIdLabel(enclaveId)} under prolonged siege`,
                    detail: `Isolated for ${e.isolation_turns} turns. Resilience: ${Math.round(e.resilience)}.`,
                    target: { kind: 'enclaves', enclaveId, label: formatIdLabel(enclaveId) },
                });
            }
        }
    }

    return items;
});

// Section 4: Field Reports (AARs)
registerBriefingCollector('field_reports', (state, _faction) => {
    const items: BriefingItem[] = [];
    const aars = state.military?.battle_narratives;
    if (!aars || aars.length === 0) return items;
    const currentTurn = state.meta?.turn ?? 0;
    const thisTurnAars = aars.filter(a => a.turn === currentTurn);
    for (const aar of thisTurnAars.slice(0, 3)) {
        items.push({
            id: `aar-${aar.target_osid}-${aar.turn}`,
            section: 'field_reports',
            severity: 'info',
            title: `Field Report: ${aar.officer_name}`,
            detail: aar.narrative.slice(0, 200) + (aar.narrative.length > 200 ? '...' : ''),
        });
    }
    return items;
});

// Section 5: Officer/Command
registerBriefingCollector('command', (state, faction) => {
    const items: BriefingItem[] = [];
    const pending = state.military?.pending_officer_events;
    if (Array.isArray(pending)) {
        const factionEvents = (pending as PendingOfficerEvent[]).filter(e => e.faction === faction && !e.acknowledged);

        // Phase 3 interpretation events (order deviations)
        const INTERP_TYPES = new Set<OfficerEventType>([
            'order_modified',
            'order_pushback',
            'order_refused',
            'order_exceeded',
            'army_directive_pushback',
            'army_co_proposes_op',
        ]);
        const interpEvents = factionEvents.filter(e => INTERP_TYPES.has(e.type));
        if (interpEvents.length > 0) {
            const hasRefusal = interpEvents.some(e => e.type === 'order_refused');
            const hasOperationProposal = interpEvents.some(e => e.type === 'army_co_proposes_op');
            items.push({
                id: 'cmd-order-interpretations',
                section: 'command',
                severity: hasRefusal ? 'critical' : 'warning',
                title: `${interpEvents.length} order interpretation${interpEvents.length > 1 ? 's' : ''} pending`,
                detail: hasRefusal
                    ? 'One or more officers have refused orders. Review required.'
                    : hasOperationProposal
                        ? 'Army command has proposed an autonomous operation. Review before advancing.'
                    : 'Officers have modified or pushed back on orders.',
                actionLabel: 'Review Interpretations',
                target: { kind: 'officer_events', officerFocus: 'interpretations', label: 'Officer interpretations' },
            });
        }

        // Personnel events (officer available, replacement suggested, or unknown type)
        const personnelEvents = factionEvents.filter(e => !INTERP_TYPES.has(e.type));
        if (personnelEvents.length > 0) {
            items.push({
                id: 'cmd-officer-events',
                section: 'command',
                severity: 'warning',
                title: `${personnelEvents.length} officer event${personnelEvents.length > 1 ? 's' : ''} pending`,
                detail: 'Officer replacement or succession events require your attention.',
                actionLabel: 'Review Officers',
                target: { kind: 'officer_events', officerFocus: 'personnel', label: 'Personnel' },
            });
        }
    }
    return items;
});
