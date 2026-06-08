/**
 * Army HQ override generation.
 * High-weight army priorities that the assigned corps is ignoring
 * trigger direct army-level overrides forcing action.
 */
import type { GameState, ArmyHQOverride, FactionId } from '../../state/game_state.js';
import { getCorpsArmyPriorities } from './bot_strategy.js';
import { munFromOsid } from './osid_adjacency.js';

/** Only the most critical priorities trigger full overrides. */
const ARMY_HQ_OVERRIDE_WEIGHT_THRESHOLD = 80;
/** Medium-weight priorities trigger probes for intel. */
const PROBE_WEIGHT_THRESHOLD = 50;
/** Corps must be idle this many turns before HQ forces action. */
const MIN_IDLE_TURNS_FOR_OVERRIDE = 6;
/** Max target OSIDs per override — keeps operations focused. */
const MAX_OVERRIDE_TARGET_OSIDS = 5;

/**
 * Free War Phase 1b — emergent SIGNAL-RESPONSIVE idle gate (the behavioral payoff
 * for the A2a signal substrate wired in #330).
 *
 * #330 folds the live battlefield signals (territory-trend × supply × campaign-plan-role)
 * into the EFFECTIVE `p.weight` returned by getCorpsArmyPriorities in emergent mode. Until
 * now those signals only re-ordered priorities and nudged the probe/full-override thresholds;
 * the offensive-op-LAUNCH path stayed starved by the flat MIN_IDLE_TURNS_FOR_OVERRIDE wall,
 * so a corps the battlefield is screaming at could still sit idle for the full 6 turns.
 *
 * Phase 1b CONSUMES those signals at the launch gate: when the composed signals have
 * AMPLIFIED a priority's effective weight to an URGENT level (≥ URGENT_EFFECTIVE_WEIGHT —
 * comfortably above the 80 full-override threshold, so it only fires when a high-static
 * objective is ALSO losing ground / plan-primary / well-supplied), army HQ is willing to
 * force action after fewer idle turns, down to URGENT_MIN_IDLE_TURNS. A corps the live war
 * marks as a clear, urgent opportunity launches SOONER than one the calendar alone favours.
 *
 * #335 CORRECTNESS FIX: "urgent" requires a GENUINE live-signal amplification, not merely a
 * high effective weight. A static-high priority (e.g. 'Central Corridor Counter' = static 150)
 * × the QUIET decay 0.80 lands at effective 120 — clearing URGENT_EFFECTIVE_WEIGHT with NO
 * live urgency, which would relax the idle wall for a calendar-high op the battlefield is
 * silent about. So the relaxation now also requires `p.emergent_boost > 1.0` (the composed
 * trend×supply×plan multiplier actually BOOSTED the static weight — real signal confluence),
 * gated together with the effective-weight threshold.
 *
 * EMERGENT-ONLY by construction (gated on state.meta.decision_mode === 'emergent'). In
 * historical mode `p.weight` is the authored static weight (capped at its 1992-calendar
 * value, never amplified) AND the relaxation is skipped entirely, so the flat 6-turn wall
 * stands → byte-identical calibration. Deterministic: reads persisted state + p.weight only;
 * no RNG, no clock. Bounded: never below URGENT_MIN_IDLE_TURNS, still one override per corps
 * per turn, still skip-if-active-op — no op-spam.
 */
const URGENT_EFFECTIVE_WEIGHT = 120;
/** Floor on the relaxed idle requirement — urgent never drops below this (anti-spam). */
const URGENT_MIN_IDLE_TURNS = 3;

/**
 * Generate army HQ overrides for this turn.
 * Examines each corps: if a high-weight priority exists, the corps has no active
 * operation, and it hasn't operated recently, army HQ forces action.
 * Weight >= 80 → full offensive. Weight 50-79 → probe.
 * At most one override per corps per turn.
 */
export function generateArmyHQOverrides(
    state: GameState,
    faction: FactionId,
): ArmyHQOverride[] {
    const overrides: ArmyHQOverride[] = [];
    const turn = state.meta.turn;
    // Phase 1b: the signal-responsive idle relaxation is emergent-only. In historical mode
    // this stays false, so every corps faces the flat MIN_IDLE_TURNS_FOR_OVERRIDE wall and
    // the gate is byte-identical to pre-Phase-1b behaviour.
    const emergent = state.meta.decision_mode === 'emergent';
    const corpsCommand = state.military.corps_command ?? {};
    const formations = state.military.formations;
    const pc = state.political.political_controllers ?? {};

    // Find all corps for this faction
    const factionCorps: string[] = [];
    for (const [id, f] of Object.entries(formations)) {
        if (f.faction === faction && (f.kind === 'corps' || f.kind === 'corps_asset') && f.status === 'active') {
            factionCorps.push(id);
        }
    }
    factionCorps.sort();

    for (const corpsId of factionCorps) {
        const cc = corpsCommand[corpsId];
        // Skip if corps has an active operation
        if (cc?.active_operations?.length) continue;

        const priorities = getCorpsArmyPriorities(faction, corpsId, turn, state);

        for (const p of priorities) {
            if (p.weight < PROBE_WEIGHT_THRESHOLD) continue;

            // Idle check: corps hasn't operated recently.
            // Phase 1b: in emergent mode, a priority the live signals have GENUINELY amplified
            // to an URGENT effective weight earns a relaxed idle wall (down to
            // URGENT_MIN_IDLE_TURNS) — HQ acts sooner where the battlefield is loud.
            // #335: require BOTH (a) the effective weight ≥ URGENT_EFFECTIVE_WEIGHT AND
            // (b) emergent_boost > 1.0 (the composed multiplier actually boosted the static
            // weight — real signal confluence). Condition (b) blocks a static-high op that
            // merely survives a quiet decay (boost ≤ 1.0) from relaxing the wall without
            // urgency. Historical mode (emergent === false, emergent_boost undefined) always
            // uses the flat 6-turn wall → byte-identical.
            const boost = p.emergent_boost ?? 1.0;
            const urgent = emergent && boost > 1.0 && p.weight >= URGENT_EFFECTIVE_WEIGHT;
            const requiredIdle = urgent ? URGENT_MIN_IDLE_TURNS : MIN_IDLE_TURNS_FOR_OVERRIDE;
            const lastOpTurn = cc?.last_completed_operation_turn ?? 0;
            if (turn - lastOpTurn < requiredIdle) continue;

            // Build target OSIDs
            const targetOsids: string[] = [];

            // Direct OSID targets first
            if (p.target_osids) {
                for (const osid of p.target_osids) {
                    const ctrl = pc[osid];
                    if (ctrl && ctrl !== faction) {
                        targetOsids.push(osid);
                    }
                }
            }

            // Derive from municipalities if no direct targets
            if (targetOsids.length === 0 && p.target_municipalities.length > 0) {
                const targetMuns = new Set(p.target_municipalities);
                for (const [osid, controller] of Object.entries(pc).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)) {
                    if (controller === faction) continue;
                    const mun = munFromOsid(osid);
                    if (mun && targetMuns.has(mun)) {
                        targetOsids.push(osid);
                        if (targetOsids.length >= MAX_OVERRIDE_TARGET_OSIDS) break;
                    }
                }
                targetOsids.sort();
            }

            if (targetOsids.length === 0) continue;

            if (p.weight >= ARMY_HQ_OVERRIDE_WEIGHT_THRESHOLD) {
                overrides.push({
                    corps_id: corpsId,
                    operation_name: `HQ: ${p.name}`,
                    min_brigades: 3,
                    target_osids: targetOsids.slice(0, MAX_OVERRIDE_TARGET_OSIDS),
                    reason: `Army HQ directive: ${p.name} (weight ${p.weight})`,
                    issued_turn: turn,
                    type: 'offensive',
                });
            } else {
                overrides.push({
                    corps_id: corpsId,
                    operation_name: `Probe: ${p.name}`,
                    min_brigades: 1,
                    target_osids: targetOsids.slice(0, 2),
                    reason: `Intel probe: ${p.name}`,
                    issued_turn: turn,
                    type: 'probe',
                    max_brigades: 2,
                });
            }
            break; // One override per corps per turn
        }
    }

    return overrides;
}
