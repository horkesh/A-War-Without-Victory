import type { FactionId, GameState } from '../../state/game_state.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from '../../state/supply_state_derivation.js';
import { strictCompare } from '../../state/validateGameState.js';

const CONDITION_BY_STATE: Record<SupplyStateLevel, number> = {
    adequate: 100,
    strained: 50,
    critical: 0,
};

export type FactionSupplyCondition = Record<FactionId, number>;

function clampCondition(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
}

function normalizeSupplyState(value: unknown): SupplyStateLevel | null {
    return value === 'adequate' || value === 'strained' || value === 'critical'
        ? value
        : null;
}

function scoreStates(states: SupplyStateLevel[]): number | undefined {
    if (states.length === 0) return undefined;
    let total = 0;
    for (const state of states) {
        total += CONDITION_BY_STATE[state];
    }
    return Math.round(total / states.length);
}

export function deriveFactionSupplyConditionFromOsidReport(
    report: SupplyStateByOsidReport | null | undefined,
): FactionSupplyCondition | undefined {
    if (!report?.factions) return undefined;
    const out: FactionSupplyCondition = {};
    for (const factionEntry of [...report.factions].sort((a, b) => strictCompare(a.faction_id, b.faction_id))) {
        const states: SupplyStateLevel[] = [];
        for (const entry of [...(factionEntry.by_osid ?? [])].sort((a, b) => strictCompare(a.osid, b.osid))) {
            const state = normalizeSupplyState(entry.state);
            if (state) states.push(state);
        }
        const score = scoreStates(states);
        if (score !== undefined) {
            out[factionEntry.faction_id] = score;
        }
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

export function deriveFactionSupplyConditionFromFlatOsidState(
    supplyStateByOsid: Record<string, unknown> | null | undefined,
    controlByOsid: Record<string, string | null | undefined> | null | undefined,
): Record<string, number> | undefined {
    if (!supplyStateByOsid || !controlByOsid) return undefined;
    const statesByFaction = new Map<string, SupplyStateLevel[]>();
    for (const osid of Object.keys(supplyStateByOsid).sort(strictCompare)) {
        const state = normalizeSupplyState(supplyStateByOsid[osid]);
        if (!state) continue;
        const faction = controlByOsid[osid];
        if (!faction) continue;
        const states = statesByFaction.get(faction) ?? [];
        states.push(state);
        statesByFaction.set(faction, states);
    }

    const out: Record<string, number> = {};
    for (const faction of Array.from(statesByFaction.keys()).sort(strictCompare)) {
        const score = scoreStates(statesByFaction.get(faction) ?? []);
        if (score !== undefined) out[faction] = score;
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

export function getFactionLiveSupplyCondition(
    state: GameState,
    faction: FactionId,
): number | undefined {
    const live = state.political?.war_supply_condition?.[faction];
    if (typeof live === 'number' && Number.isFinite(live)) {
        return clampCondition(live);
    }

    const flat = state.political?.last_supply_state_by_osid;
    const control = state.political?.political_controllers as Record<string, string | null | undefined> | undefined;
    const derived = deriveFactionSupplyConditionFromFlatOsidState(flat, control);
    const fallback = derived?.[faction];
    return typeof fallback === 'number' && Number.isFinite(fallback) ? clampCondition(fallback) : undefined;
}

export function getFactionLiveSupplyPressure(
    state: GameState,
    faction: FactionId,
): number {
    const condition = getFactionLiveSupplyCondition(state, faction);
    if (condition !== undefined) {
        return clampCondition(100 - condition);
    }
    const legacy = state.political?.war_supply_pressure?.[faction];
    return typeof legacy === 'number' && Number.isFinite(legacy) ? clampCondition(legacy) : 0;
}
