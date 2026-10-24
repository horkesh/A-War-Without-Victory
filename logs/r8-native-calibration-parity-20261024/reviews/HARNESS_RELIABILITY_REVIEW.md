# Harness reliability repair review

Date: 2026-10-24  
Verdict: **PASS; one bounded turn-39 observational measurement may proceed after ordinary frozen-input/package preflight**

Reviewed files:

- `tools/ui/paradox_local_qa.cjs` SHA-256 `14faffa17bcc04612cc441ed870449e8cb769743e5343e5fa74e79d33b92a291`
- `tests/paradox_local_qa_harness.test.ts` SHA-256 `ae5887f223d77f734d360ea4118a0b1d98e2c5366d44e9aa12db3fab94b67a19`

No production UI, simulation, policy, event timing, scenario, tuning, comparator, or packaged-game content changed in this repair. There is no sensitive-history canon conflict in measuring the untouched normal Historical player campaign.

## Findings

No blocking findings.

The turn evidence now has two explicit classes. The increment-time copy is immutable and stored under `turn-autosaves-pre-settlement`; it is diagnostic only. The one acceptance archive is stored under `turn-autosaves` after two reads prove the same turn, zero state blockers, no owned decision/aftermath surface, and a stable canonical autosave identity. Intermediate turns settle before the next Advance and before any checkpoint tour. The terminal turn settles after the terminal drain. Existing destinations are exclusive and are never silently overwritten.

The hydration validator permits only leaf changes beneath `military.home_distance_cache` and `military.sector_combat_ratings`. It requires the home-distance cache to be absent after authoritative hydration and requires rating keys to equal the player-owned sector IDs. The full structural delta and its classified counts are retained; canonical-save byte equality and exact authoritative expected-versus-loaded projection equality remain independent hard gates.

Failure handling now copies the raw network-failure array before invoking the same exact tile AbortSignal classifier used on success. Matched records remain in `failureRawNetworkFailures`, the full observer signals remain recorded, and attribution records retain the request plus exact signal. Unmatched, ambiguous, wrong-origin, wrong-range, or out-of-window failures remain in `networkFailures` and therefore remain fatal.

The retained RED run exited 1 with exactly four intended failures and 80 passes. The implementer GREEN run passed 85/85; syntax and nonincremental typecheck exited 0. Independent review reran the focused harness test once against the frozen hashes: 85/85 passed, exit 0, duration 1.59 s. `git diff --check` is clean for the two reviewed files.

## Bounded turn-39 question

The next run is an observational measurement of the unchanged game:

> Can a normal packaged RBiH Historical player campaign reach the accepted n94 turn-39 checkpoint controller map and score while preserving the protected/control-health, provenance, canonical capture, save/load, and runtime gates?

This run must preserve and report every provisional and settled turn archive and the raw per-turn differences against n94. The already observed two-OSID turn-1 mismatch and the broader exact-per-turn n94 equality gate remain **FAILED** even if turn 39 converges. A matching turn-39 map/score is a checkpoint result, not full-state or per-turn parity.

Before launch, bind the exact frozen harness/test hashes above, the unchanged packaged executable/content inventory, the accepted startup/scenario inputs including the documented GeoJSON EOL caveat, a fresh profile/unique label, visible Historical selection, faction RBiH, autonomy 2, `headless=false`, and `harness-seed`. Use the normal UI/IPC Advance route, per-turn archives, and real Save -> Records -> Resume. Do not use strategic, auto-recruit, policy overrides, state injection, forced flips, or headless simulation.

Stop immediately on campaign/startup/input mismatch, missing archive, unexplained controller mutation at the turn-39 checkpoint, protected/health failure, save/load failure, unmatched runtime category, or process failure. A turn-39 checkpoint failure does not authorize a retry or turn-188 launch. Turn 188 and the RS/HRHB lanes remain **UNREACHED**.

The known native audio abort remains a separate strict R8 failure and is not changed by this review.
