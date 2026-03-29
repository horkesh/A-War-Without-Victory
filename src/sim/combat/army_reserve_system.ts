/**
 * Army Reserve System — elite brigade loan management.
 *
 * Corps commanders request army-level elite brigades each turn.
 * Army AI evaluates geographic feasibility + request priority, then auto-assigns.
 * Unresolved requests surface to the player panel.
 *
 * Loan lifecycle: op-tied (no hard timer). Brigade stays until:
 *   - Op concludes + need evaporates  → 'op_complete' or 'need_expired'
 *   - Player manually recalls         → 'player_recall'
 *   - Force-recall conditions         → 'casualty_threshold' | 'morale_collapse' | 'permanent_degradation'
 *
 * Per-brigade EliteLoanEpisode records accumulate in elite_brigade_tracker.
 *
 * Determinism: all iteration sorted via strictCompare; no Math.random(), no Date.now().
 */

import type { GameState, FormationState, FactionId, FormationId } from '../../state/game_state.js';
import type { Osid } from './osid_adjacency.js';
import {
    ELITE_LOAN_MIN_DURATION,
    ELITE_LOAN_COOLDOWN,
    ELITE_CASUALTY_THRESHOLD,
    ELITE_MORALE_RECALL,
    ELITE_COHESION_RECALL,
    ELITE_DEGRADATION_THRESHOLD,
    MAX_AUTO_DEPLOY_HOPS,
    createEliteBrigadeTracker,
    type ArmyReserveRequest,
    type ArmyReserveDecisionRecord,
    type ReserveRequestReason,
    type ReserveRequestPurpose,
    type EliteRecallReason,
} from '../../state/elite_loan_types.js';
import { EXEMPT_CORPS_IDS } from './corps_front_sectors_constants.js';
import { computeOsidGraphDistance } from './home_distance.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getPrimaryOperation } from './corps_operation_helpers.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a reference OSID for a corps — used to compute travel distance.
 * Prefers the corps formation's location_osid, then falls back to home_osid,
 * then falls back to the first active brigade in that corps.
 */
function getCorpsReferenceOsid(state: GameState, corpsId: string): string | null {
    const formations = state.military.formations ?? {};
    // Direct corps formation lookup — only use if it has a real location
    const corpsFormation = formations[corpsId];
    const corpsOsid = corpsFormation ? (corpsFormation.location_osid ?? corpsFormation.home_osid) ?? null : null;
    if (corpsOsid) return corpsOsid;
    // Fall back to first active brigade in this corps (sorted for determinism)
    const brigadeIds = Object.keys(formations).sort(strictCompare);
    for (const bid of brigadeIds) {
        const f = formations[bid];
        if (f.corps_id === corpsId && f.status === 'active') {
            const brigOsid = (f.location_osid ?? f.home_osid) ?? null;
            if (brigOsid) return brigOsid;
        }
    }
    return null;
}

/**
 * Applies geographic penalty to a raw priority score.
 * Returns -1 when hops exceed MAX_AUTO_DEPLOY_HOPS (bot AI rejects).
 */
export function computeDeployPriority(rawPriority: number, hops: number): number {
    if (hops > MAX_AUTO_DEPLOY_HOPS) return -1;
    if (hops <= 3) return rawPriority;
    if (hops <= 6) return rawPriority * 0.6;
    return rawPriority * 0.3; // 7–8 hops
}

/**
 * Returns true if the formation is an elite brigade available for loan
 * (not already on loan, not in cooldown, not permanently degraded).
 */
function isEliteAvailable(f: FormationState, turn: number): boolean {
    // Elite brigades are identified by presence of elite_loan_state (set on OOB load for is_elite=true)
    const ls = f.elite_loan_state;
    if (!ls) return false;
    if (ls.permanently_degraded) return false;
    if (ls.on_loan) return false;
    if (ls.last_recall_turn != null && turn - ls.last_recall_turn < ELITE_LOAN_COOLDOWN) return false;
    return true;
}

/**
 * Returns all elite brigade IDs for a faction that are currently available,
 * sorted by formation ID for determinism.
 */
function getAvailableElites(state: GameState, faction: string, turn: number): FormationId[] {
    const formations = state.military.formations ?? {};
    return Object.keys(formations)
        .filter(fid => {
            const f = formations[fid];
            return f.faction === faction && isEliteAvailable(f, turn);
        })
        .sort(strictCompare);
}

/**
 * Returns true if a corps already has an elite brigade loaned to it this turn.
 */
function corpsHasLoanedElite(state: GameState, corpsId: string): boolean {
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (f.elite_loan_state?.on_loan && f.elite_loan_state.loaned_to_corps === corpsId) return true;
    }
    return false;
}

function describeCorpsNeed(
    reason: ReserveRequestReason,
    corpsId: string,
    description: string
): { purpose: ReserveRequestPurpose; whyNeeded: string; howToUse: string } {
    switch (reason) {
        case 'offensive_support':
            return {
                purpose: 'offensive',
                whyNeeded: `Corps ${corpsId} requests elite reinforcement to sustain offensive momentum. ${description}`,
                howToUse: 'Attach as assault reserve on the main axis, then consolidate captured front OSIDs.',
            };
        case 'exploitation':
            return {
                purpose: 'offensive',
                whyNeeded: `Corps ${corpsId} requests elite reinforcement to exploit a local breakthrough. ${description}`,
                howToUse: 'Push the exploitation axis, secure flanks, and prevent enemy re-closure of the breach.',
            };
        case 'enclave_relief':
            return {
                purpose: 'defensive',
                whyNeeded: `Corps ${corpsId} requests elite reinforcement for enclave relief. ${description}`,
                howToUse: 'Open/hold a supply corridor and rotate exhausted defenders off the most threatened edge.',
            };
        case 'defensive_gap':
        default:
            return {
                purpose: 'defensive',
                whyNeeded: `Corps ${corpsId} requests elite reinforcement due to critical defensive weakness. ${description}`,
                howToUse: 'Anchor the thinnest sector-front sub-segment and stabilize local defensive depth.',
            };
    }
}

function appendReserveDecision(
    state: GameState,
    entry: ArmyReserveDecisionRecord
): void {
    if (!state.military.reserve_request_history) state.military.reserve_request_history = [];
    state.military.reserve_request_history.push(entry);
}

// ─── Request generation ───────────────────────────────────────────────────────

/**
 * Scans all non-exempt corps and generates the highest-priority reserve request
 * per corps. Writes to state.military.pending_reserve_requests (replaces previous).
 */
export function generateArmyReserveRequests(
    state: GameState,
    adjacency: Map<Osid, Osid[]>
): void {
    const formations = state.military.formations ?? {};
    const corpsCommand = state.military.corps_command ?? {};
    const corpsSectors = state.military.corps_front_sectors ?? {};
    const turn = state.meta.turn;

    const requests: ArmyReserveRequest[] = [];

    const allCorpsIds = Object.keys(corpsCommand).sort(strictCompare);

    for (const corpsId of allCorpsIds) {
        // Only eligible (non-exempt) corps
        if (EXEMPT_CORPS_IDS.has(corpsId)) continue;

        // Determine faction from any active brigade in this corps
        let corpsFaction: string | null = null;
        for (const fid of Object.keys(formations).sort(strictCompare)) {
            const f = formations[fid];
            if (f.corps_id === corpsId && f.status === 'active') {
                corpsFaction = f.faction;
                break;
            }
        }
        if (!corpsFaction) continue;

        // Skip if already has a loaned elite
        if (corpsHasLoanedElite(state, corpsId)) continue;

        const cmd = corpsCommand[corpsId];
        const sector = Object.keys(corpsSectors).sort(strictCompare).map(k => corpsSectors[k]).find(s => s.corps_id === corpsId);
        const op = getPrimaryOperation(cmd);

        let bestReason: ReserveRequestReason | null = null;
        let bestRawPriority = 0;
        let bestDescription = '';

        // 1. Offensive support — active op in any committed phase (force_staging through execution)
        // Elites create momentum — they don't wait for it. Deploy during preparation so they arrive by execution.
        if (op && (op.phase === 'execution' || (op.phase === 'planning' && op.preparation_sub_phase && op.preparation_sub_phase !== 'intel_gathering'))) {
            const momentum = op.momentum ?? (op.axes ? Math.max(...op.axes.map(a => a.momentum ?? 0)) : 0);
            // Scale priority by phase: execution > ready/assessment > force_staging/supply_check
            let phaseBase: number;
            if (op.phase === 'execution') {
                phaseBase = 80 + Math.min(20, momentum * 8); // 80-100
            } else if (op.preparation_sub_phase === 'ready' || op.preparation_sub_phase === 'assessment') {
                phaseBase = 70;
            } else {
                phaseBase = 55; // force_staging, supply_check
            }
            const rawPriority = Math.min(100, phaseBase);
            if (rawPriority > bestRawPriority) {
                bestReason = 'offensive_support';
                bestRawPriority = rawPriority;
                bestDescription = `Op "${op.name}" (${op.phase === 'execution' ? 'execution' : op.preparation_sub_phase}) — elite deployment for offensive`;
            }
        }

        // 2. Defensive gap — any sector with threat_ratio > 2.0 and ≤ 1 brigade
        if (sector && sector.threat_ratio > 2.0 && sector.assigned_brigade_ids.length <= 1) {
            const rawPriority = Math.min(85, 50 + (sector.threat_ratio - 2.0) * 10);
            if (rawPriority > bestRawPriority) {
                bestReason = 'defensive_gap';
                bestRawPriority = rawPriority;
                bestDescription = `Sector threat ratio ${sector.threat_ratio.toFixed(1)} with only ${sector.assigned_brigade_ids.length} brigade(s) — line is thin`;
            }
        }

        // 3. Exploitation — op captured OSIDs last turn, no reserve yet
        if (op && op.phase === 'execution') {
            const capturedRecently = (op.objective_capture_count ?? (op.axes ? op.axes.reduce((s, a) => s + a.objective_capture_count, 0) : 0)) > 0;
            if (capturedRecently && bestRawPriority < 65) {
                const rawPriority = 65;
                if (rawPriority > bestRawPriority) {
                    bestReason = 'exploitation';
                    bestRawPriority = rawPriority;
                    bestDescription = `Op "${op.name}" captured objectives — elite needed to exploit gains`;
                }
            }
        }

        if (!bestReason) continue;

        // Find best available elite brigade (same faction, nearest)
        const availableElites = getAvailableElites(state, corpsFaction, turn);
        if (availableElites.length === 0) continue;

        const corpsRefOsid = getCorpsReferenceOsid(state, corpsId);
        if (!corpsRefOsid) continue;

        let bestBrigadeId: string | null = null;
        let bestHops = Infinity;

        for (const bid of availableElites) {
            const f = formations[bid];
            const brigadeOsid = f.location_osid ?? f.home_osid;
            if (!brigadeOsid) continue;
            const hops = computeOsidGraphDistance(brigadeOsid as Osid, corpsRefOsid as Osid, adjacency);
            if (hops < bestHops) {
                bestHops = hops;
                bestBrigadeId = bid;
            }
        }

        if (bestBrigadeId === null || bestHops === Infinity) continue;

        const priority = computeDeployPriority(bestRawPriority, bestHops);
        if (priority < 0) continue; // too far for bot AI

        requests.push({
            request_id: `req:${turn}:${corpsId}:${bestReason}`,
            corps_id: corpsId,
            faction: corpsFaction,
            reason: bestReason,
            purpose: describeCorpsNeed(bestReason, corpsId, bestDescription).purpose,
            why_needed: describeCorpsNeed(bestReason, corpsId, bestDescription).whyNeeded,
            how_to_use: describeCorpsNeed(bestReason, corpsId, bestDescription).howToUse,
            priority,
            raw_priority: bestRawPriority,
            travel_hops: bestHops,
            turn_requested: turn,
            description: bestDescription,
            suggested_brigade_id: bestBrigadeId,
        });
    }

    // Sort descending by priority, tiebreak by corps_id ascending (determinism)
    requests.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return strictCompare(a.corps_id, b.corps_id);
    });

    state.military.pending_reserve_requests = requests;
}

// ─── Loan lifecycle ───────────────────────────────────────────────────────────

/**
 * Deploy an elite brigade on loan to a corps.
 * Creates an EliteLoanEpisode and updates the brigade tracker.
 */
export function deployEliteLoan(
    state: GameState,
    brigadeId: FormationId,
    corpsId: string,
    reason: ReserveRequestReason,
    travelHops: number,
    turn: number,
    requestDialogue?: { purpose: ReserveRequestPurpose; why_needed: string; how_to_use: string },
    approvalReason?: string,
    approvalBy: 'army_ai' | 'player' = 'army_ai'
): void {
    const f = state.military.formations?.[brigadeId];
    if (!f?.elite_loan_state) return;

    const ls = f.elite_loan_state;
    ls.on_loan = true;
    ls.loaned_to_corps = corpsId;
    ls.loan_start_turn = turn;
    ls.loan_start_personnel = f.personnel ?? 0;
    if (!f.base_osid) {
        f.base_osid = f.location_osid ?? f.home_osid;
    }

    // Ensure tracker exists
    if (!state.military.elite_brigade_tracker) state.military.elite_brigade_tracker = {};
    if (!state.military.elite_brigade_tracker[brigadeId]) {
        state.military.elite_brigade_tracker[brigadeId] = createEliteBrigadeTracker(brigadeId);
    }
    const tracker = state.military.elite_brigade_tracker[brigadeId]!;
    const episodeId = tracker.episodes.length;

    tracker.episodes.push({
        episode_id: episodeId,
        corps_id: corpsId,
        reason,
        loan_start_turn: turn,
        loan_end_turn: null,
        recall_reason: null,
        travel_hops: travelHops,
        personnel_start: f.personnel ?? 0,
        personnel_end: null,
        casualties_taken: 0,
        battles_fought: 0,
        osids_captured: 0,
        kia_inflicted_est: 0,
        request_dialogue: requestDialogue ? {
            purpose: requestDialogue.purpose,
            why_needed: requestDialogue.why_needed,
            how_to_use: requestDialogue.how_to_use,
        } : undefined,
        approval_dialogue: approvalReason ? {
            decided_by: approvalBy,
            reason: approvalReason,
        } : undefined,
    });

    tracker.total_loans++;
    ls.current_episode_id = episodeId;

    // ── Auto-join target corps's active operation ──
    // If deployed for offensive reasons and the corps has an active operation,
    // add the elite to participating_brigades so march-first logic moves it to the front.
    if (reason === 'offensive_support' || reason === 'exploitation') {
        const cmd = state.military.corps_command?.[corpsId];
        const activeOp = cmd?.active_operations?.find(op => op.phase === 'execution') ?? null;
        if (activeOp && !activeOp.participating_brigades.includes(brigadeId)) {
            activeOp.participating_brigades.push(brigadeId);
            activeOp.participating_brigades.sort(strictCompare);
        }
    }
}

/**
 * Recall an elite brigade from loan.
 * Closes the current episode and updates tracker totals.
 */
export function recallEliteLoan(
    state: GameState,
    brigadeId: FormationId,
    reason: EliteRecallReason,
    turn: number
): void {
    const f = state.military.formations?.[brigadeId];
    if (!f?.elite_loan_state) return;

    const ls = f.elite_loan_state;
    if (!ls.on_loan) return;

    const tracker = state.military.elite_brigade_tracker?.[brigadeId];
    if (tracker && ls.current_episode_id != null) {
        const episode = tracker.episodes[ls.current_episode_id];
        if (episode) {
            episode.loan_end_turn = turn;
            episode.recall_reason = reason;
            episode.personnel_end = f.personnel ?? 0;
            // casualties_taken is updated in real-time by recordBrigadeEngagement.
            // On close, use the larger of real-time tally and personnel delta
            // (personnel delta captures non-combat losses too).
            const personnelDelta = Math.max(0, episode.personnel_start - (episode.personnel_end));
            episode.casualties_taken = Math.max(episode.casualties_taken, personnelDelta);
            tracker.total_casualties_taken += episode.casualties_taken;
            tracker.total_battles += episode.battles_fought;
            tracker.total_osids_captured += episode.osids_captured;
        }
    }

    ls.on_loan = false;
    ls.loaned_to_corps = null;
    ls.last_recall_turn = turn;
    ls.current_episode_id = null;
    // Explicit reserve contract: when loan ends, elite returns to base (not home).
    const returnBase = f.base_osid ?? f.home_osid;
    if (returnBase) {
        f.location_osid = returnBase;
    }
}

// ─── Bot AI assignment ────────────────────────────────────────────────────────

/**
 * Bot AI auto-assigns pending reserve requests.
 * Processes highest-priority requests first; each assigned brigade is consumed.
 * Requests that cannot be fulfilled remain in pending_reserve_requests for the player.
 */
export function evaluateArmyReserveAssignments(
    state: GameState,
    adjacency: Map<Osid, Osid[]>
): void {
    const requests = state.military.pending_reserve_requests ?? [];
    if (requests.length === 0) return;

    const turn = state.meta.turn;
    const usedBrigades = new Set<string>();
    const fulfilled: ArmyReserveRequest[] = [];
    const remaining: ArmyReserveRequest[] = [];

    for (const req of requests) {
        // Only auto-assign bot factions (player faction surfaces in UI)
        const playerFaction = state.meta.player_faction ?? null;
        if (req.faction === playerFaction) {
            remaining.push(req);
            continue;
        }

        const brigadeId = req.suggested_brigade_id;
        if (!brigadeId || usedBrigades.has(brigadeId)) {
            // Try any available elite of same faction
            const alternatives = getAvailableElites(state, req.faction, turn)
                .filter(bid => !usedBrigades.has(bid));
            if (alternatives.length === 0) {
                remaining.push(req);
                continue;
            }
            // Pick nearest
            const corpsRef = getCorpsReferenceOsid(state, req.corps_id);
            if (!corpsRef) {
                remaining.push(req);
                continue;
            }
            let nearestId: string | null = null;
            let nearestHops = Infinity;
            for (const bid of alternatives) {
                const f = state.military.formations?.[bid];
                const bOsid = f?.location_osid ?? f?.home_osid;
                if (!bOsid) continue;
                const h = computeOsidGraphDistance(bOsid as Osid, corpsRef as Osid, adjacency);
                if (h < nearestHops) { nearestHops = h; nearestId = bid; }
            }
            if (!nearestId || nearestHops > MAX_AUTO_DEPLOY_HOPS) {
                remaining.push(req);
                continue;
            }
            const purpose = req.purpose ?? 'defensive';
            const whyNeeded = req.why_needed ?? req.description;
            const howToUse = req.how_to_use ?? 'Reinforce threatened front sectors and stabilize local combat power.';
            const requestId = req.request_id ?? `req:${req.turn_requested}:${req.corps_id}:${req.reason}`;
            deployEliteLoan(
                state,
                nearestId,
                req.corps_id,
                req.reason,
                nearestHops,
                turn,
                { purpose, why_needed: whyNeeded, how_to_use: howToUse },
                'Army CO accepted: nearest available elite can reinforce in time.',
                'army_ai'
            );
            appendReserveDecision(state, {
                request_id: requestId,
                turn,
                faction: req.faction,
                corps_id: req.corps_id,
                brigade_id: nearestId,
                outcome: 'accepted',
                reason: 'Army CO accepted: nearest available elite can reinforce in time.',
                decided_by: 'army_ai',
                purpose,
                why_needed: whyNeeded,
                how_to_use: howToUse,
            });
            usedBrigades.add(nearestId);
            fulfilled.push(req);
            continue;
        }

        // Verify the suggested brigade is still available (another request may have claimed it)
        const f = state.military.formations?.[brigadeId];
        if (!f || !isEliteAvailable(f, turn) || req.travel_hops > MAX_AUTO_DEPLOY_HOPS) {
            remaining.push(req);
            continue;
        }

        const purpose = req.purpose ?? 'defensive';
        const whyNeeded = req.why_needed ?? req.description;
        const howToUse = req.how_to_use ?? 'Reinforce threatened front sectors and stabilize local combat power.';
        const requestId = req.request_id ?? `req:${req.turn_requested}:${req.corps_id}:${req.reason}`;
        deployEliteLoan(
            state,
            brigadeId,
            req.corps_id,
            req.reason,
            req.travel_hops,
            turn,
            { purpose, why_needed: whyNeeded, how_to_use: howToUse },
            'Army CO accepted: request aligns with current operational priorities.',
            'army_ai'
        );
        appendReserveDecision(state, {
            request_id: requestId,
            turn,
            faction: req.faction,
            corps_id: req.corps_id,
            brigade_id: brigadeId,
            outcome: 'accepted',
            reason: 'Army CO accepted: request aligns with current operational priorities.',
            decided_by: 'army_ai',
            purpose,
            why_needed: whyNeeded,
            how_to_use: howToUse,
        });
        usedBrigades.add(brigadeId);
        fulfilled.push(req);
    }

    // Only unresolved requests remain in pending list (player sees these)
    state.military.pending_reserve_requests = remaining;
}

// ─── Per-turn tick ────────────────────────────────────────────────────────────

/**
 * Runs each turn after battles.
 *  - Force-recalls on casualty/morale thresholds
 *  - Voluntary recall when op concluded + need expired + min duration elapsed
 *  - Updates active episode tracker fields (turns_deployed, battles_fought)
 */
export function tickEliteLoans(state: GameState, turn: number): void {
    const formations = state.military.formations ?? {};
    const corpsCommand = state.military.corps_command ?? {};
    const brigadeIds = Object.keys(formations).sort(strictCompare);

    for (const bid of brigadeIds) {
        const f = formations[bid];
        const ls = f.elite_loan_state;
        if (!ls?.on_loan || !ls.loaned_to_corps) continue;

        const tracker = state.military.elite_brigade_tracker?.[bid];
        const episode = tracker && ls.current_episode_id != null ? tracker.episodes[ls.current_episode_id] : undefined;

        // ── Update tracker totals (every turn on loan) ──
        if (tracker) tracker.total_turns_deployed++;
        // Episode battles_fought, casualties_taken, osids_captured, kia_inflicted_est
        // are updated in real-time by recordBrigadeEngagement() in brigade_history_recorder.ts.

        // ── Auto-join target corps operation (standing rule) ──
        // If the target corps launched a NEW operation since deployment, join it.
        // This handles operation transitions: old op ends, new op launches, elite joins.
        const targetCmd = corpsCommand[ls.loaned_to_corps];
        // Auto-join any execution-phase operation the target corps is running
        if (targetCmd) {
            for (const activeOp of targetCmd.active_operations ?? []) {
                if (activeOp.phase !== 'execution') continue;
                if (activeOp.participating_brigades.includes(bid)) continue;
                if (activeOp.axes) {
                    const inAxis = activeOp.axes.some(a => a.assigned_brigades.includes(bid));
                    if (!inAxis) {
                        activeOp.participating_brigades.push(bid);
                        activeOp.participating_brigades.sort(strictCompare);
                    }
                } else {
                    activeOp.participating_brigades.push(bid);
                    activeOp.participating_brigades.sort(strictCompare);
                }
                break; // Join the first execution-phase op found
            }
        }

        const turnsSinceLoan = ls.loan_start_turn != null ? turn - ls.loan_start_turn : 0;
        const personnel = f.personnel ?? 0;
        const startPersonnel = ls.loan_start_personnel ?? personnel;

        // ── Force recall checks (in priority order) ──

        // Permanent degradation — > 50% personnel loss
        if (startPersonnel > 0 && personnel < startPersonnel * (1 - ELITE_DEGRADATION_THRESHOLD)) {
            ls.permanently_degraded = true;
            recallEliteLoan(state, bid, 'permanent_degradation', turn);
            continue;
        }

        // Casualty threshold — > 30% personnel loss
        if (startPersonnel > 0 && personnel < startPersonnel * (1 - ELITE_CASUALTY_THRESHOLD)) {
            recallEliteLoan(state, bid, 'casualty_threshold', turn);
            continue;
        }

        // Morale collapse
        if ((f.morale ?? 60) < ELITE_MORALE_RECALL) {
            recallEliteLoan(state, bid, 'morale_collapse', turn);
            continue;
        }

        // Cohesion collapse
        if ((f.cohesion ?? 50) < ELITE_COHESION_RECALL) {
            recallEliteLoan(state, bid, 'cohesion_collapse', turn);
            continue;
        }

        // ── Voluntary recall (army AI) — only after min duration ──
        if (turnsSinceLoan < ELITE_LOAN_MIN_DURATION) continue;

        const corpsId = ls.loaned_to_corps;
        const cmd = corpsCommand[corpsId];
        const hasActiveOp = !!(cmd?.active_operations?.some(op => op.phase === 'execution'));
        const cfs = state.military.corps_front_sectors ?? {};
        const sector = Object.keys(cfs).sort(strictCompare).map(k => cfs[k]).find(s => s.corps_id === corpsId);
        const threatHigh = sector ? sector.threat_ratio >= 1.5 : false;

        // Op ended + no high threat → recall
        if (!hasActiveOp && !threatHigh) {
            const hadOp = episode?.reason === 'offensive_support' || episode?.reason === 'exploitation';
            recallEliteLoan(state, bid, hadOp ? 'op_complete' : 'need_expired', turn);
            continue;
        }
    }
}
