/**
 * R5 Phase 2e — shared narrow read-state type for the sector-topology solve's
 * external readers.
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 6 implementation note: "change getCorpsArmyPriorities(...),
 * buildCorpsCommanderProfiles(...), and the sector-specific political-
 * controller fallback to accept narrow read interfaces. Do not manufacture a
 * partial object and cast it to GameState."
 *
 * `GameState` structurally satisfies this type (it has every field here plus
 * more), so retyping a function's `state: GameState` parameter to this type
 * is a non-breaking, call-site-transparent change — every existing caller
 * that already passes a real `GameState` keeps compiling unchanged. The
 * value is architectural: it lets a future caller (the Task 3 pure solver)
 * pass a smaller `{ meta, political, military }`-shaped object built from
 * `SectorTopologySolveInput` without ever casting a partial object AS a full
 * `GameState` — the STOP condition this plan explicitly forbids.
 *
 * This type narrows which TOP-LEVEL GameState keys a function may declare it
 * needs; it does not itself restrict which SUB-fields of `meta`/`political`/
 * `military` are read — that discipline is enforced by direct code review
 * and the static read-inventory tests in `sector_topology_snapshot.test.ts`,
 * consistent with how this codebase already gates other read boundaries
 * (e.g. the `WarDataSnapshot` warroom boundary).
 */

import type { GameState } from '../../state/game_state.js';

export type SectorTopologyNarrowReadState = Pick<GameState, 'meta' | 'political' | 'military'>;
