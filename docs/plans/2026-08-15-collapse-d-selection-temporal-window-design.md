# Collapse D-selection Temporal Window Design

**Status:** ACCEPTED and retained after two fresh 188-week measurements on 2026-08-15.

**Decision:** replace the retired same-turn municipality-support candidate with a symmetric two-turn combat-incidence window, behind the existing default-OFF collapse gate. Do not change `STRAIN_FRACTION`, the 40/55 thresholds, Phase 3D, or Section 6 in this packet.

## Evidence and objective

The retained v1 selector counts one exposure unit per resolved defender-side battle target. It is deterministic but the pre-registered exact main-town controls tie: `op:sipovo:sipovo_2` and `op:titov_drvar:drvar_2` each receive exposure 1 / strain 0.15.

The retired v2 selector added half-weighted municipality peers from the same turn. It also tied because the campaign's relevant battles were temporally adjacent, not simultaneous:

- Sipovo municipality: turns 177, 178, 179 (main town), 180, 181.
- Drvar municipality: turns 179, 181 (main town), 182.

An inclusive distance of two turns is the smallest symmetric window that sees every relevant peer around both main-town battles. Offline replay of the retained weekly battle evidence produces Sipovo 3 / Drvar 2 while leaving the campaign maximum exposure at 33. A one-turn window produces only 2 / 1.5; wider windows add unrelated temporal reach without improving the registered discriminator.

## Selected contract

Each valid resolved battle row contributes direct exposure `+1` to its `target_osid`.

For each distinct attacked target, every battle row at another target contributes peer exposure `+0.5` when all of the following hold:

1. the targets are different OSIDs;
2. both canonical OSIDs parse to the same municipality token in `op:<municipality>:<settlement>`;
3. the absolute difference between their turn numbers is at most two.

The support is credited exactly once, when the later target's rows are processed. Same-turn targets use stable sorted order. Crediting both sides means an earlier target may receive a later retroactive increment; this removes attack-order bias. Multiple direct rows at the receiving target do not multiply its peer support: two direct rows at target A plus three rows at target B produce A `2 + 0.5×3 = 3.5` and B `3 + 0.5×2 = 4`, matching the accepted target-level v2 arithmetic. An OSID can receive peer exposure only after it has itself been directly attacked within the active window. Missing/quiet reports contribute nothing. Casualties, outcome, attacker count, frontage, adjacency, control, and faction do not weight the selector.

## State and data flow

Add an optional, collapse-owned rolling queue under political state. It contains only the current and previous two turns of canonical battle identity, target OSID, and turn. The queue is lazily initialized only when Phase 3C is enabled and OSID-native combat selection runs; default-OFF serialized output therefore remains unchanged. Old saves treat the absent field as an empty queue.

The pure window advance function accepts the prior queue, current turn, and current attack-resolution report and returns:

- a stably ordered exposure map for increments to apply this turn; and
- a pruned, canonically sorted next queue.

Phase 3C applies every returned increment through the existing monotonic local-strain writer, then persists the next queue. It does not derive gameplay from GUI-oriented turn summaries or FIFO brigade-history telemetry.

## Rejected alternatives

- **One-sided trailing lookup:** simpler, but the result depends on which target was attacked first and fails to credit future peers back to the main town.
- **Reuse `turn_summaries` or brigade histories:** avoids a field but turns reporting/telemetry structures into hidden mechanical authority and inherits their grouping/FIFO policies.
- **Longer or cumulative municipality memory:** reaches farther than the evidence requires and risks conflating separate operations. Two turns is the minimum successful window.

## Determinism, canon, and failure handling

All rows, turns, municipalities, targets, and emitted state are explicitly sorted with `strictCompare` plus numeric turn order. No RNG, clock, filesystem order, locale collation, or transcendental arithmetic enters the computation. Malformed OSIDs and blank targets are ignored; missing queues and reports are empty; future-dated queued rows are discarded defensively.

The change remains within the War subsystem's default-OFF Phase 3C measurement path. It does not change control directly, does not weaken the Section 6 write guard, and does not edit canon. Engine Invariants v0.9.0 §9.6 continues to reserve any eventual control change for the existing collapse-resolution path; §9.8 requires stable OSID ordering. The new queue is source state rather than a disposable derived cache, so save/load, omission, and deterministic serialization require explicit tests.

## Acceptance and retirement criteria

The candidate advances only if two fresh collapse-ON 188-week runs:

- produce Sipovo main-town exposure 3 and Drvar main-town exposure 2;
- are byte-identical except for the known `run_meta.json` output-directory field and share the structural fingerprint;
- retain 31/31 anchors and pass all seven engine-health gates;
- truthfully report threshold, damage, capacity, and Section 6 liveness.

Selector acceptance does not authorize scaling or D-shape. If the exact discriminator fails, the temporal candidate is reverted. If it succeeds but remains below thresholds, the next packet may design scaling against the accepted selector without claiming live Section 6 clearance.

## Measured disposition

The candidate passed the predeclared gate and is retained. Two fresh collapse-ON 188-week runs produced the exact Sipovo/Drvar main-town exposure split `3/2`, final-state hash `2cfb52c1e7811915`, and structural fingerprint `22cf3c5d8884bfb8`. Fifteen of sixteen artifacts were byte-identical; only `run_meta.json` differed because it records the deliberately different output root. The run retained 31/31 anchors and passed all seven engine-health checks.

The accepted selector remains under-scaled: maximum exposure stayed 33 / strain 4.95, with zero 40/55 crossings and no damage or capacity writes. Section 6 passed as an instrument but remained unexercised by a live protected write. D-shape is still unauthorized. The next bounded packet is scaling against this accepted selector, beginning with a `STRAIN_FRACTION=3.0` probe: the current HRHB maximum exposure is 20, so 3.0 yields strain 60, above the 55 live severity floor on the only faction whose Tier-0 spatial gate is currently open.
