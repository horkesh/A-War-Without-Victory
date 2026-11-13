/**
 * Stance matters: posture model option 2.
 *
 * Plan: docs/plans/2026-11-12-posture-model-option2-stance-matters.md (rev 3).
 * Panel: docs/40_reports/governance/20261112_POSTURE_MODEL_OPTION2_PANEL.md.
 * Canon: Engine Invariants §14.10c (player stance-matter boundary).
 *
 * At autonomy 2 a player-army corps commander (or an OG) has already changed stance
 * under delegation when the bot pass ends. That change is reported to the president as
 * a matter he may Confirm, Countermand or Constrain before the next turn. Silence means
 * the commander's choice stands: an unanswered matter changes nothing but its own
 * record. Countermand / Constrain write a presidential stance hold
 * (stance_matter_holds.ts applies it).
 *
 * Writes only three fields: meta.stance_matters, meta.stance_matter_history and
 * military.stance_matter_state, and only on the live-president path
 * (player_faction set, not headless auto-control). Generation additionally requires
 * autonomy 2 and the war phase. Headless runs never reach any writer here.
 *
 * Deterministic: strictCompare ordering everywhere, ids derived from turn and corps,
 * FNV-1a fingerprints, no RNG, no wall clock.
 */

import type {
    CorpsFrontSector,
    CorpsStance,
    FactionId,
    FormationId,
    GameState,
    PresidentialStanceHold,
    SectorStance,
    StanceMatter,
    StanceMatterConstraint,
    StanceMatterReason,
    StanceMatterReceipt,
    StanceMatterState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getFactionCorps } from './bot_corps_helpers.js';
import type { CorpsStanceTrace } from './bot_corps_stance.js';
import { CORPS_STANCE_ALLOWED_SECTOR_STANCES } from './combat_math.js';
import { COMMAND_FRICTION_FACTION_WEIGHT, PATRON_OVERRIDE_FLOOR } from './command_lever_consequences.js';
import { applyDimensionShift } from '../events/strategic_dimensions.js';
import { getArmyCommander, getCorpsCommander } from './officer_system.js';
import { recordPresidentialStanceOverrule } from './order_interpretation.js';
import { getActivePatronDirective } from './patron_directive_scope.js';
import { applyCorpsHoldToStance, HOLD_STANCE_RANK } from './stance_matter_holds.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants (owner-adjustable; panel-signed 2026-11-12)
// ═══════════════════════════════════════════════════════════════════════════

export const MAX_STANCE_MATTERS_PER_TURN = 3;
export const STANCE_MATTER_COOLDOWN_TURNS = 4;
export const STANCE_HOLD_TURNS = 4;
/** Confirm-only window after an overrule, keyed to the corps (= COWED_OVERRIDE_WINDOW). */
export const STANCE_OVERRULE_WINDOW_TURNS = 8;
/** Main Staff resistance = faction friction weight × serving army commander stubbornness. */
export const MAIN_STAFF_DELAY_ONE_TURN = 4.0;
export const MAIN_STAFF_DELAY_TWO_TURNS = 5.0;
export const STANCE_MATTER_HISTORY_CAP = 200;
export const OG_MATCH_MIN_JACCARD = 0.5;

/** OG constraint sets (allowed sector stances). */
export const OG_CONSTRAINT_ALLOWED: Record<'no_active_defense' | 'hold_no_counterattacks', SectorStance[]> = {
    no_active_defense: ['defend', 'elastic', 'fortify', 'screening'],
    hold_no_counterattacks: ['defend', 'fortify', 'screening'],
};

/** Sector stance aggressiveness for deterministic narrowing. */
const SECTOR_STANCE_RANK: Record<SectorStance, number> = {
    screening: 0, fortify: 1, defend: 2, elastic: 3, active_defense: 4,
};

// ═══════════════════════════════════════════════════════════════════════════
// Gates
// ═══════════════════════════════════════════════════════════════════════════

/** A live president is present (player faction set, not headless auto-control). */
export function isLivePresident(state: GameState): boolean {
    return Boolean(state.meta?.player_faction) && state.meta?.headless_scenario_auto_control !== true;
}

/** New matters are raised only at autonomy 2 in the war phase, for a live president. */
export function isStanceMatterGenerationActive(state: GameState): boolean {
    return isLivePresident(state) && state.meta.phase === 'war' && state.meta.autonomy_level === 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// OG fingerprints
// ═══════════════════════════════════════════════════════════════════════════

/** FNV-1a 32-bit over the UTF-8 bytes of `text`, as 8-digit lower-case hex. */
export function fnv1a32Hex(text: string): string {
    const bytes = new TextEncoder().encode(text);
    let hash = 0x811c9dc5;
    for (const byte of bytes) {
        hash ^= byte;
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

/** Sorted, de-duplicated fixed-width hashes of a sector's front edges (lexical = numeric). */
export function sectorFingerprint(sector: Pick<CorpsFrontSector, 'edge_ids'>): string[] {
    const hashes = new Set<string>();
    for (const edgeId of sector.edge_ids ?? []) hashes.add(fnv1a32Hex(edgeId));
    return [...hashes].sort(strictCompare);
}

export function jaccard(a: readonly string[], b: readonly string[]): number {
    if (a.length === 0 && b.length === 0) return 0;
    const setB = new Set(b);
    let inter = 0;
    for (const x of a) if (setB.has(x)) inter += 1;
    const union = a.length + b.length - inter;
    return union === 0 ? 0 : inter / union;
}

/**
 * One-to-one greedy matching of current sectors to recorded fingerprints of the same
 * corps: highest Jaccard first, ties by recorded fingerprint key then sector id.
 * Returns currentSectorId → recorded index. Pure; reads copies only.
 */
export function matchSectorsToRecorded(
    current: ReadonlyArray<{ sector_id: string; corps_id: string; fingerprint: string[] }>,
    recorded: ReadonlyArray<{ corps_id: string; fingerprint: string[] }>,
): Map<string, number> {
    const pairs: Array<{ sectorId: string; index: number; score: number; key: string }> = [];
    for (const cur of current) {
        recorded.forEach((rec, index) => {
            if (rec.corps_id !== cur.corps_id) return;
            const score = jaccard(cur.fingerprint, rec.fingerprint);
            if (score >= OG_MATCH_MIN_JACCARD) {
                pairs.push({ sectorId: cur.sector_id, index, score, key: rec.fingerprint.join(',') });
            }
        });
    }
    pairs.sort((a, b) => (b.score - a.score)
        || strictCompare(a.key, b.key)
        || strictCompare(a.sectorId, b.sectorId)
        || a.index - b.index);
    const usedSectors = new Set<string>();
    const usedRecorded = new Set<number>();
    const out = new Map<string, number>();
    for (const pair of pairs) {
        if (usedSectors.has(pair.sectorId) || usedRecorded.has(pair.index)) continue;
        usedSectors.add(pair.sectorId);
        usedRecorded.add(pair.index);
        out.set(pair.sectorId, pair.index);
    }
    return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// State helpers
// ═══════════════════════════════════════════════════════════════════════════

function ensureMatterState(state: GameState): StanceMatterState {
    if (!state.military.stance_matter_state) {
        state.military.stance_matter_state = {
            last_corps_stance: {},
            last_og: [],
            cooldown_until_by_corps: {},
            last_overrule_turn_by_corps: {},
            holds: [],
        };
    }
    return state.military.stance_matter_state;
}

function sortReceipts(receipts: StanceMatterReceipt[]): StanceMatterReceipt[] {
    return receipts.sort((a, b) => (a.resolved_turn - b.resolved_turn) || strictCompare(a.id, b.id) || strictCompare(a.outcome, b.outcome));
}

function appendReceipts(state: GameState, receipts: StanceMatterReceipt[]): void {
    if (receipts.length === 0) return;
    const history = [...(state.meta.stance_matter_history ?? []), ...receipts];
    sortReceipts(history);
    state.meta.stance_matter_history = history.length > STANCE_MATTER_HISTORY_CAP
        ? history.slice(history.length - STANCE_MATTER_HISTORY_CAP)
        : history;
}

function sortHolds(holds: PresidentialStanceHold[]): PresidentialStanceHold[] {
    return holds.sort((a, b) => strictCompare(a.corps_id, b.corps_id)
        || strictCompare(a.scope, b.scope)
        || strictCompare(a.matter_id, b.matter_id));
}

function sortedRecord<T>(record: Record<string, T>): Record<string, T> {
    const out: Record<string, T> = {};
    for (const key of Object.keys(record).sort(strictCompare)) out[key] = record[key]!;
    return out;
}

function round2(value: number): number {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

/** Turn of the last overrule of this corps (window keyed to the corps, red-team 7). */
function lastOverruleTurn(state: GameState, corpsId: string): number | undefined {
    return state.military.stance_matter_state?.last_overrule_turn_by_corps?.[corpsId];
}

export function isWithinOverruleWindow(state: GameState, corpsId: string, turn: number): boolean {
    const last = lastOverruleTurn(state, corpsId);
    return last !== undefined && turn - last < STANCE_OVERRULE_WINDOW_TURNS;
}

/**
 * Main Staff delay for an overrule: faction friction weight × serving army commander's
 * stubbornness (live state; missing data counts as 0 = followed). Bounded at 2 turns,
 * never a refusal.
 */
export function computeMainStaffDelayTurns(state: GameState, faction: FactionId): number {
    const weight = COMMAND_FRICTION_FACTION_WEIGHT[faction] ?? 0;
    const commander = getArmyCommander(faction, state);
    const stubbornness = typeof commander?.data.stubbornness === 'number' ? commander.data.stubbornness : 0;
    const resistance = weight * stubbornness;
    if (resistance >= MAIN_STAFF_DELAY_TWO_TURNS) return 2;
    if (resistance >= MAIN_STAFF_DELAY_ONE_TURN) return 1;
    return 0;
}

function patronCeilingFor(state: GameState, faction: FactionId, corpsId: string, turn: number): CorpsStance | undefined {
    const ceiling = getActivePatronDirective(faction, turn, state, corpsId)?.stance_ceiling;
    return ceiling === 'reorganize' || ceiling === 'defensive' || ceiling === 'balanced' || ceiling === 'offensive'
        ? ceiling
        : undefined;
}

function isCorpsStance(value: unknown): value is CorpsStance {
    return value === 'reorganize' || value === 'defensive' || value === 'balanced' || value === 'offensive';
}

function isSectorStance(value: unknown): value is SectorStance {
    return value === 'fortify' || value === 'defend' || value === 'elastic' || value === 'active_defense' || value === 'screening';
}

/** Corps constraint options that actually narrow `to` (computed after the patron ceiling). */
export function corpsConstraintOptions(to: CorpsStance): StanceMatterConstraint[] {
    const out: StanceMatterConstraint[] = [];
    if (HOLD_STANCE_RANK[to] > HOLD_STANCE_RANK.balanced) out.push('ceiling_balanced');
    if (HOLD_STANCE_RANK[to] > HOLD_STANCE_RANK.defensive && to !== 'reorganize') out.push('ceiling_defensive');
    return out;
}

/** OG constraint options that narrow `to` given the corps-allowed set. */
export function ogConstraintOptions(to: SectorStance, corpsStance: string): StanceMatterConstraint[] {
    const allowed = CORPS_STANCE_ALLOWED_SECTOR_STANCES[corpsStance] ?? CORPS_STANCE_ALLOWED_SECTOR_STANCES.balanced!;
    const out: StanceMatterConstraint[] = [];
    for (const key of ['no_active_defense', 'hold_no_counterattacks'] as const) {
        const set = OG_CONSTRAINT_ALLOWED[key].filter((s) => allowed.includes(s));
        if (!set.includes(to) && set.length > 0) out.push(key);
    }
    // Drop a second option that yields the same effective set as the first.
    if (out.length === 2) {
        const a = OG_CONSTRAINT_ALLOWED.no_active_defense.filter((s) => allowed.includes(s)).join(',');
        const b = OG_CONSTRAINT_ALLOWED.hold_no_counterattacks.filter((s) => allowed.includes(s)).join(',');
        if (a === b) out.pop();
    }
    return out;
}

/** Narrow a sector stance into `allowedSet` (highest aggressiveness not above the current; else the least aggressive). */
export function narrowSectorStance(current: SectorStance, allowedSet: readonly SectorStance[]): SectorStance {
    if (allowedSet.length === 0) return 'defend';
    if (allowedSet.includes(current)) return current;
    const sorted = [...allowedSet].sort((a, b) => (SECTOR_STANCE_RANK[a] - SECTOR_STANCE_RANK[b]) || strictCompare(a, b));
    const below = sorted.filter((s) => SECTOR_STANCE_RANK[s] <= SECTOR_STANCE_RANK[current]);
    return below.length > 0 ? below[below.length - 1]! : sorted[0]!;
}

// ═══════════════════════════════════════════════════════════════════════════
// OG clamp (end of the faction pass, after the commander loop)
// ═══════════════════════════════════════════════════════════════════════════

function sectorHostsLiveOperation(state: GameState, sector: CorpsFrontSector): boolean {
    const cmd = state.military.corps_command?.[sector.corps_id];
    if (!cmd) return false;
    return cmd.active_operations.some((op) => op.sector_id === sector.sector_id
        && (op.phase === 'planning' || op.phase === 'execution'));
}

function factionSectorsSorted(state: GameState, faction: FactionId): CorpsFrontSector[] {
    const sectors = state.military.corps_front_sectors ?? {};
    return Object.keys(sectors).sort(strictCompare)
        .map((id) => sectors[id]!)
        .filter((sector) => sector && sector.faction === faction);
}

/**
 * Apply active OG holds for `faction`. Follows each OG by fingerprint (one-to-one);
 * a hold whose OG cannot be matched lapses with a receipt. An OG hosting a live
 * operation is not clamped that turn (the operation wins; the hold records it).
 * Inert without holds.
 */
export function clampHeldOgStances(state: GameState, faction: FactionId): void {
    const matterState = state.military.stance_matter_state;
    if (!matterState?.holds?.length) return;
    const turn = state.meta?.turn ?? 0;
    const ogHolds = matterState.holds.filter((h) => h.scope === 'og' && h.faction === faction
        && h.effective_from_turn <= turn && turn <= h.until_turn && h.sector_fingerprint);
    if (ogHolds.length === 0) return;

    const sectors = factionSectorsSorted(state, faction).filter((s) => s.stance_source !== 'player');
    const current = sectors.map((s) => ({ sector_id: s.sector_id, corps_id: s.corps_id, fingerprint: sectorFingerprint(s) }));
    const recorded = ogHolds.map((h) => ({ corps_id: h.corps_id, fingerprint: [...(h.sector_fingerprint ?? [])] }));
    const matches = matchSectorsToRecorded(current, recorded);
    const sectorByIndex = new Map<number, string>();
    for (const [sectorId, index] of matches) sectorByIndex.set(index, sectorId);

    const lapsed: PresidentialStanceHold[] = [];
    ogHolds.forEach((hold, index) => {
        const sectorId = sectorByIndex.get(index);
        const sector = sectorId ? state.military.corps_front_sectors?.[sectorId] : undefined;
        if (!sector) {
            lapsed.push(hold);
            return;
        }
        hold.sector_fingerprint = current.find((c) => c.sector_id === sector.sector_id)?.fingerprint ?? hold.sector_fingerprint;
        hold.sector_id = sector.sector_id;
        if (sectorHostsLiveOperation(state, sector)) {
            hold.suspended_turn = turn;
            return;
        }
        const corpsStance = state.military.corps_command?.[sector.corps_id]?.stance ?? 'balanced';
        const corpsAllowed = CORPS_STANCE_ALLOWED_SECTOR_STANCES[corpsStance] ?? CORPS_STANCE_ALLOWED_SECTOR_STANCES.balanced!;
        const holdSet = hold.mode === 'fixed' && isSectorStance(hold.stance)
            ? [hold.stance]
            : (hold.allowed ?? []);
        const allowed = holdSet.filter((s) => corpsAllowed.includes(s));
        sector.sector_stance = allowed.length === 0 ? 'defend' : narrowSectorStance(sector.sector_stance, allowed);
    });

    if (lapsed.length > 0) {
        const lapsedIds = new Set(lapsed.map((h) => h.matter_id));
        matterState.holds = sortHolds(matterState.holds.filter((h) => !lapsedIds.has(h.matter_id)));
        appendReceipts(state, lapsed.map((hold) => holdLapseReceipt(hold, turn, 'og_dissolved')));
    }
}

function holdLapseReceipt(
    hold: PresidentialStanceHold,
    turn: number,
    reason: NonNullable<StanceMatterReceipt['lapse_reason']>,
): StanceMatterReceipt {
    return {
        id: `${hold.matter_id}:lapse`,
        turn: hold.effective_from_turn,
        faction: hold.faction,
        scope: hold.scope,
        corps_id: hold.corps_id,
        from_stance: hold.stance ?? (hold.allowed ?? []).join('|'),
        to_stance: hold.stance ?? (hold.allowed ?? []).join('|'),
        outcome: 'hold_lapsed',
        resolved_turn: turn,
        lapse_reason: reason,
    };
}

/**
 * The president's own operation order supersedes his hold on that corps
 * (inject-op-directive / inject-authored-operations). Inert without a hold.
 */
export function clearCorpsHoldsForPresidentialOperation(state: GameState, corpsId: string, turn: number): void {
    const matterState = state.military.stance_matter_state;
    if (!matterState?.holds?.length) return;
    const cleared = matterState.holds.filter((h) => h.corps_id === corpsId && turn <= h.until_turn);
    if (cleared.length === 0) return;
    const clearedIds = new Set(cleared.map((h) => h.matter_id));
    matterState.holds = sortHolds(matterState.holds.filter((h) => !clearedIds.has(h.matter_id)));
    appendReceipts(state, cleared.map((hold) => holdLapseReceipt(hold, turn, 'presidential_operation')));
}

// ═══════════════════════════════════════════════════════════════════════════
// Generation (after the player faction's bot pass)
// ═══════════════════════════════════════════════════════════════════════════

function reasonFromTrace(trace: CorpsStanceTrace | undefined, finalStance: CorpsStance): StanceMatterReason {
    if (!trace) return 'other';
    if (trace.stance !== finalStance) {
        // A later writer in the pass changed it: corridor breach (offensive) or
        // bilateral-war reassignment.
        return finalStance === 'offensive' ? 'opportunity' : 'alliance_front';
    }
    switch (trace.driver) {
        case 'reorganize_critical': return 'reorganize_critical';
        case 'threat_high': return 'threat_high';
        case 'opportunity': return 'opportunity';
        case 'doctrine': return 'doctrine';
        case 'campaign_plan': return 'campaign_plan';
        case 'readiness_low': return 'readiness_low';
        case 'faction_rule': return 'doctrine';
        case 'patron_ceiling': return 'patron_ceiling';
        case 'army_directive': return 'army_directive';
        case 'alliance_front': return 'alliance_front';
        default: return 'other';
    }
}

function presidentCausedCorps(state: GameState, corpsIds: readonly string[], turn: number): Set<string> {
    const out = new Set<string>();
    for (const corpsId of corpsIds) {
        const cmd = state.military.corps_command?.[corpsId];
        if (!cmd) continue;
        const caused = cmd.active_operations.some((op) => op.started_turn === turn
            && (op.authored_by_player === true || op.requested_by_president === true));
        if (caused) out.add(corpsId);
    }
    return out;
}

interface Candidate {
    matter: Omit<StanceMatter, 'constraint_options' | 'countermand_allowed' | 'main_staff_delay_turns' | 'patron_shift' | 'deadline_turn'>;
    rankDelta: number;
}

/**
 * Raise stance matters for the player faction after its bot pass, then refresh the
 * baselines. Call only for the player faction. Writes only the three stance-matter
 * fields. `trace` is the read-only formula trace from generateCorpsStanceOrders.
 */
export function generateStanceMatters(
    state: GameState,
    faction: FactionId,
    trace: ReadonlyMap<string, CorpsStanceTrace>,
): void {
    if (!isStanceMatterGenerationActive(state) || state.meta.player_faction !== faction) {
        refreshStanceBaselines(state, faction);
        return;
    }
    const turn = state.meta.turn;
    const matterState = ensureMatterState(state);
    const corpsIds = getFactionCorps(state, faction).map((c) => c.id).sort(strictCompare);
    const formations = state.military.formations ?? {};
    const caused = presidentCausedCorps(state, corpsIds, turn);
    const armyStance = state.military.army_stance?.[faction];
    const armyOverrides = Boolean(armyStance && armyStance !== 'balanced');

    const candidates: Candidate[] = [];
    const notPut: StanceMatterReceipt[] = [];

    // Corps candidates.
    for (const corpsId of corpsIds) {
        const cmd = state.military.corps_command?.[corpsId];
        if (!cmd) continue;
        const prev = matterState.last_corps_stance[corpsId];
        const next = cmd.stance;
        if (prev === undefined || prev === next) continue;
        if (cmd.player_ordered_stance != null) continue;
        if (caused.has(corpsId)) continue;
        const t = trace.get(corpsId);
        const id = `STANCE_${turn}_${corpsId}`;
        if (armyOverrides) {
            notPut.push({
                id, turn, faction, scope: 'corps', corps_id: corpsId,
                from_stance: prev, to_stance: next, outcome: 'not_put', resolved_turn: turn,
                not_put_reason: 'army_stance',
            });
            continue;
        }
        const commander = getCorpsCommander(corpsId, state);
        const hasFigures = t !== undefined && Number.isFinite(t.avg_cohesion) && Number.isFinite(t.avg_strength);
        const ceiling = patronCeilingFor(state, faction, corpsId, turn);
        candidates.push({
            rankDelta: Math.abs(HOLD_STANCE_RANK[next] - HOLD_STANCE_RANK[prev]),
            matter: {
                id, turn, faction, scope: 'corps', corps_id: corpsId,
                from_stance: prev, to_stance: next,
                ...(commander ? { commander_officer_id: commander.data.id } : {}),
                reason: reasonFromTrace(t, next),
                ...(hasFigures && t ? {
                    avg_cohesion: round2(t.avg_cohesion),
                    avg_strength: round2(t.avg_strength),
                    sector_threat: round2(t.sector_threat),
                } : {}),
                ...(ceiling ? { patron_ceiling: ceiling } : {}),
            },
        });
    }

    // OG candidates (into or out of Active Defense), matched one-to-one by fingerprint.
    const sectors = factionSectorsSorted(state, faction).filter((s) => s.stance_source !== 'player');
    const current = sectors.map((s) => ({ sector_id: s.sector_id, corps_id: s.corps_id, fingerprint: sectorFingerprint(s), stance: s.sector_stance }));
    const recorded = matterState.last_og.map((r) => ({ corps_id: r.corps_id, fingerprint: [...r.fingerprint], stance: r.stance }));
    const matches = matchSectorsToRecorded(current, recorded);
    const ogSeqByCorps = new Map<string, number>();
    for (const cur of current) {
        const index = matches.get(cur.sector_id);
        const previous = index === undefined ? undefined : recorded[index];
        if (!previous) continue;
        const prev = previous.stance;
        const crossed = (prev === 'active_defense') !== (cur.stance === 'active_defense');
        if (!crossed || caused.has(cur.corps_id)) continue;
        const seq = ogSeqByCorps.get(cur.corps_id) ?? 0;
        ogSeqByCorps.set(cur.corps_id, seq + 1);
        const commander = getCorpsCommander(cur.corps_id, state);
        const sector = state.military.corps_front_sectors?.[cur.sector_id];
        candidates.push({
            rankDelta: Math.abs(SECTOR_STANCE_RANK[cur.stance] - SECTOR_STANCE_RANK[prev]) / 4,
            matter: {
                id: `STANCE_${turn}_${cur.corps_id}_og${seq}`,
                turn, faction, scope: 'og', corps_id: cur.corps_id as FormationId,
                sector_id: cur.sector_id,
                sector_fingerprint: cur.fingerprint,
                from_stance: prev, to_stance: cur.stance,
                ...(commander ? { commander_officer_id: commander.data.id } : {}),
                reason: cur.stance === 'active_defense' ? 'enemy_massing' : 'situation_eased',
                ...(sector && Number.isFinite(sector.threat_ratio) ? { sector_threat: round2(sector.threat_ratio) } : {}),
            },
        });
    }

    // Priority: corps before OG; larger change first; then id.
    candidates.sort((a, b) => (a.matter.scope === b.matter.scope ? 0 : a.matter.scope === 'corps' ? -1 : 1)
        || (b.rankDelta - a.rankDelta)
        || strictCompare(a.matter.id, b.matter.id));

    const raised: StanceMatter[] = [];
    for (const { matter } of candidates) {
        const corpsId = matter.corps_id;
        const held = (matterState.holds ?? []).some((h) => h.corps_id === corpsId && turn <= h.until_turn);
        const cooling = (matterState.cooldown_until_by_corps[corpsId] ?? -Infinity) > turn;
        const reason: StanceMatterReceipt['not_put_reason'] | null = held
            ? 'held'
            : cooling ? 'cooldown'
                : raised.length >= MAX_STANCE_MATTERS_PER_TURN ? 'cap' : null;
        if (reason) {
            notPut.push({
                id: matter.id, turn, faction, scope: matter.scope, corps_id: corpsId,
                ...(matter.sector_id ? { sector_id: matter.sector_id } : {}),
                from_stance: matter.from_stance, to_stance: matter.to_stance,
                outcome: 'not_put', resolved_turn: turn, not_put_reason: reason,
            });
            continue;
        }
        const windowClosed = isWithinOverruleWindow(state, corpsId, turn);
        const corpsStance = state.military.corps_command?.[corpsId]?.stance ?? 'balanced';
        const options = windowClosed
            ? []
            : matter.scope === 'corps'
                ? (isCorpsStance(matter.to_stance) ? corpsConstraintOptions(matter.to_stance) : [])
                : (isSectorStance(matter.to_stance) ? ogConstraintOptions(matter.to_stance, corpsStance) : []);
        const delay = computeMainStaffDelayTurns(state, faction);
        const patronFloor = PATRON_OVERRIDE_FLOOR[faction] ?? 0;
        const patronShift = patronCeilingFor(state, faction, corpsId, turn) !== undefined ? patronFloor : 0;
        raised.push({
            ...matter,
            deadline_turn: turn + 1,
            constraint_options: options,
            countermand_allowed: !windowClosed,
            main_staff_delay_turns: delay,
            patron_shift: patronShift,
        });
        matterState.cooldown_until_by_corps[corpsId] = turn + STANCE_MATTER_COOLDOWN_TURNS;
    }

    if (raised.length > 0) {
        const raisedIds = new Set(raised.map((m) => m.id));
        const kept = (state.meta.stance_matters ?? []).filter((m) => !(m.turn === turn && raisedIds.has(m.id)));
        state.meta.stance_matters = [...kept, ...raised]
            .sort((a, b) => (a.turn - b.turn) || strictCompare(a.id, b.id));
    }
    if (notPut.length > 0) {
        // One Records line per (corps, scope, reason) per turn, with a count: OG stances can
        // flip most weeks, and a line per flip would bury the president's own decisions.
        const grouped = new Map<string, StanceMatterReceipt>();
        for (const receipt of [...notPut].sort((a, b) => strictCompare(a.id, b.id))) {
            const key = `${receipt.corps_id}|${receipt.scope}|${receipt.not_put_reason}`;
            const first = grouped.get(key);
            if (first) {
                first.not_put_count = (first.not_put_count ?? 1) + 1;
            } else {
                grouped.set(key, { ...receipt });
            }
        }
        const existing = new Set((state.meta.stance_matter_history ?? []).map((r) => `${r.id}|${r.outcome}`));
        appendReceipts(state, [...grouped.values()].filter((r) => !existing.has(`${r.id}|${r.outcome}`)));
    }
    matterState.cooldown_until_by_corps = sortedRecord(matterState.cooldown_until_by_corps);
    refreshStanceBaselines(state, faction);
}

/**
 * Record this turn's final player corps and OG stances as the next turn's baseline.
 * Runs every live turn at any autonomy level (red-team 10), after the final clamp.
 * Inert in headless (no live president).
 */
export function refreshStanceBaselines(state: GameState, faction: FactionId): void {
    if (!isLivePresident(state) || state.meta.player_faction !== faction) return;
    const lastCorps: Record<string, CorpsStance> = {};
    for (const corps of getFactionCorps(state, faction)) {
        const stance = state.military.corps_command?.[corps.id]?.stance;
        if (isCorpsStance(stance)) lastCorps[corps.id] = stance;
    }
    const lastOg = factionSectorsSorted(state, faction)
        .filter((s) => s.stance_source !== 'player' && isSectorStance(s.sector_stance))
        .map((s) => ({ corps_id: s.corps_id, stance: s.sector_stance, fingerprint: sectorFingerprint(s) }))
        .sort((a, b) => strictCompare(a.corps_id, b.corps_id) || strictCompare(a.fingerprint.join(','), b.fingerprint.join(',')));
    // Nothing to record and no bookkeeping yet: write nothing (no empty state object).
    if (!state.military.stance_matter_state && Object.keys(lastCorps).length === 0 && lastOg.length === 0) return;
    const matterState = ensureMatterState(state);
    matterState.last_corps_stance = sortedRecord(lastCorps);
    matterState.last_og = lastOg;
}

// ═══════════════════════════════════════════════════════════════════════════
// Resolution (pipeline step resolve-stance-matters, before the bot pass)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve every matter raised in an earlier turn: answers become holds and costs;
 * silence lapses as 'stood'. Off autonomy 2, open matters lapse ('stood', or
 * 'answered_lapsed' when an answer had been recorded) and active holds end.
 * Expired holds and cooldowns are pruned. Inert when no stance-matter data exists.
 */
export function resolveStanceMatters(state: GameState): void {
    if (!isLivePresident(state)) return;
    const matters = state.meta.stance_matters ?? [];
    const matterState = state.military.stance_matter_state;
    if (matters.length === 0 && !matterState) return;

    const turn = state.meta.turn;
    const levelOk = state.meta.autonomy_level === 2;
    const receipts: StanceMatterReceipt[] = [];
    const due = matters.filter((m) => m.turn < turn).sort((a, b) => strictCompare(a.id, b.id));
    const remaining = matters.filter((m) => m.turn >= turn);

    for (const matter of due) {
        const base = {
            id: matter.id, turn: matter.turn, faction: matter.faction, scope: matter.scope,
            corps_id: matter.corps_id,
            ...(matter.sector_id ? { sector_id: matter.sector_id } : {}),
            from_stance: matter.from_stance, to_stance: matter.to_stance,
            resolved_turn: turn,
        };
        if (!levelOk) {
            receipts.push({ ...base, outcome: matter.answer ? 'answered_lapsed' : 'stood' });
            continue;
        }
        if (!matter.answer) {
            receipts.push({ ...base, outcome: 'stood' });
            continue;
        }
        if (matter.answer === 'confirm') {
            receipts.push({ ...base, outcome: 'confirmed' });
            continue;
        }
        const ms = ensureMatterState(state);
        const overruleBlocked = !matter.countermand_allowed || isWithinOverruleWindow(state, matter.corps_id, turn);
        const constraint = matter.answer === 'constrain' ? matter.constraint : undefined;
        const validConstraint = constraint !== undefined && matter.constraint_options.includes(constraint);
        if (overruleBlocked || (matter.answer === 'constrain' && !validConstraint)) {
            // A malformed or out-of-window answer counts as no answer.
            receipts.push({ ...base, outcome: 'stood' });
            continue;
        }

        // The president's own operation order for this corps, injected earlier this turn,
        // supersedes the overrule: no hold, no cost.
        if (presidentCausedCorps(state, [matter.corps_id], turn).size > 0) {
            receipts.push({ ...base, outcome: 'hold_lapsed', lapse_reason: 'presidential_operation' });
            continue;
        }
        const delay = computeMainStaffDelayTurns(state, matter.faction);
        const effectiveFrom = turn + delay;
        const until = effectiveFrom + STANCE_HOLD_TURNS - 1;
        let hold: PresidentialStanceHold;
        if (matter.scope === 'corps') {
            const stance = matter.answer === 'countermand'
                ? matter.from_stance
                : constraint === 'ceiling_defensive' ? 'defensive' : 'balanced';
            hold = {
                matter_id: matter.id, faction: matter.faction, scope: 'corps', corps_id: matter.corps_id,
                mode: matter.answer === 'countermand' ? 'fixed' : 'ceiling',
                stance, effective_from_turn: effectiveFrom, until_turn: until,
            };
        } else {
            hold = {
                matter_id: matter.id, faction: matter.faction, scope: 'og', corps_id: matter.corps_id,
                sector_fingerprint: [...(matter.sector_fingerprint ?? [])],
                ...(matter.sector_id ? { sector_id: matter.sector_id } : {}),
                mode: matter.answer === 'countermand' ? 'fixed' : 'ceiling',
                ...(matter.answer === 'countermand'
                    ? { stance: matter.from_stance }
                    : { allowed: [...OG_CONSTRAINT_ALLOWED[constraint as 'no_active_defense' | 'hold_no_counterattacks']] }),
                effective_from_turn: effectiveFrom, until_turn: until,
            };
        }
        // Replace any earlier hold on the same corps (corps scope) or the same OG.
        ms.holds = sortHolds([
            ...ms.holds.filter((h) => !(h.corps_id === hold.corps_id && h.scope === hold.scope
                && (h.scope === 'corps' || (h.sector_fingerprint ?? []).join(',') === (hold.sector_fingerprint ?? []).join(',')))),
            hold,
        ]);

        // Costs: resentment record, overrule window, Zagreb (only when the hold differs from what the directive forces).
        recordPresidentialStanceOverrule(state, matter.corps_id, turn);
        ms.last_overrule_turn_by_corps = sortedRecord({ ...ms.last_overrule_turn_by_corps, [matter.corps_id]: turn });
        let patronShift = 0;
        const ceiling = patronCeilingFor(state, matter.faction, matter.corps_id, turn);
        const floor = PATRON_OVERRIDE_FLOOR[matter.faction] ?? 0;
        if (ceiling !== undefined && floor !== 0 && matter.scope === 'corps' && isCorpsStance(matter.to_stance)) {
            const held = applyCorpsHoldToStance(state, matter.faction, matter.corps_id, matter.to_stance, effectiveFrom);
            const forced = HOLD_STANCE_RANK[matter.to_stance] > HOLD_STANCE_RANK[ceiling] ? ceiling : matter.to_stance;
            if (held !== forced) {
                const dims = state.military.negotiation?.strategic_dimensions;
                if (dims) applyDimensionShift(dims, matter.faction, 'patron_confidence', floor);
                patronShift = floor;
            }
        }
        receipts.push({
            ...base,
            outcome: matter.answer === 'countermand' ? 'countermanded' : 'constrained',
            ...(constraint ? { constraint } : {}),
            effective_from_turn: effectiveFrom,
            until_turn: until,
            main_staff_delay_turns: delay,
            patron_shift: patronShift,
        });
    }

    if (due.length > 0) {
        state.meta.stance_matters = remaining.length > 0 ? remaining : undefined;
    }

    if (matterState || state.military.stance_matter_state) {
        const ms = state.military.stance_matter_state!;
        if (!levelOk && ms.holds.length > 0) {
            receipts.push(...ms.holds.map((hold) => holdLapseReceipt(hold, turn, 'autonomy_changed')));
            ms.holds = [];
        }
        ms.holds = sortHolds(ms.holds.filter((h) => h.until_turn >= turn));
        // A hold delayed by the Main Staff that takes effect this turn gets its own receipt,
        // so Records state the stance in force only once it is (Codex #580). Holds created
        // this turn start now without a delay and are covered by their resolution receipt.
        const createdThisTurn = new Set(receipts.filter((r) => r.outcome === 'countermanded' || r.outcome === 'constrained').map((r) => r.id));
        for (const hold of ms.holds) {
            if (hold.effective_from_turn !== turn || createdThisTurn.has(hold.matter_id)) continue;
            const ordered = (state.meta.stance_matter_history ?? []).find((r) => r.id === hold.matter_id
                && (r.outcome === 'countermanded' || r.outcome === 'constrained'));
            const holdStance = hold.stance ?? (hold.allowed ?? []).join('|');
            receipts.push({
                id: `${hold.matter_id}:in_force`,
                turn: hold.effective_from_turn,
                faction: hold.faction,
                scope: hold.scope,
                corps_id: hold.corps_id,
                ...(hold.sector_id ? { sector_id: hold.sector_id } : {}),
                from_stance: ordered?.from_stance ?? holdStance,
                to_stance: ordered?.to_stance ?? holdStance,
                outcome: 'hold_in_force',
                resolved_turn: turn,
                ...(ordered?.constraint ? { constraint: ordered.constraint } : {}),
                effective_from_turn: hold.effective_from_turn,
                until_turn: hold.until_turn,
                main_staff_delay_turns: ordered?.main_staff_delay_turns ?? 0,
            });
        }
        const cooldowns: Record<string, number> = {};
        for (const key of Object.keys(ms.cooldown_until_by_corps).sort(strictCompare)) {
            const until = ms.cooldown_until_by_corps[key]!;
            if (until > turn) cooldowns[key] = until;
        }
        ms.cooldown_until_by_corps = cooldowns;
        const windows: Record<string, number> = {};
        for (const key of Object.keys(ms.last_overrule_turn_by_corps).sort(strictCompare)) {
            const last = ms.last_overrule_turn_by_corps[key]!;
            if (turn - last < STANCE_OVERRULE_WINDOW_TURNS) windows[key] = last;
        }
        ms.last_overrule_turn_by_corps = windows;
    }
    appendReceipts(state, receipts);
}
