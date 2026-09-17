# FINDINGS — `rs_19th_krajina_light_infantry` transit: corrected mechanism, and why the repair is an EXTENSION

**Date:** 2026-09-17. **Branch/HEAD:** `codex/january-1993-operations-20260914` @ `26342bcc8`.
**Packet:** "investigate and, if demonstrated, repair the 19th Brigade's persistent transit state."
**Verdict:** the "persistent/stale transit" framing is **wrong and is corrected here**. There is a real,
reproduced **T2/T6 destination-scope contradiction with an ordering coupling**, but the only fixes are
precedence/scope **policy** choices, so this is returned as an **EXTENSION** — **no implementation**.

Evidence in this directory: `prefix_diag.txt`, `prefix_timeline.txt`, `generality_scan_n406.txt`; retained
runs `runs/apr1992_definitive_188w__9137f75e9f35be20__w39_n406` and
`runs/apr1992_definitive_188w__e2ad6266350df364__w7_n407`.

---

## 1. Corrected mechanism (the record was wrong)

At **no turn boundary** does the 19th hold a `brigade_movement_state`. `buildBrigadeTemporalRows`
(`brigade_temporal_emit.ts:185-192, 212`) reads state at end of turn; for the 19th it shows `mv_state=null`
with `mv_destinations=["op:donji_vakuf:pribraca_2"]` every turn t1–t20 — i.e. a **pending order, no transit
state**. The `in_transit` status exists only **intra-turn**:

| step (turn-relative) | phase (`war_phases.ts`) | what happens to the 19th |
|---|---|---|
| 1 | `osid-column-movement` **:1537** | Pass 2 (`osid_column_movement.ts:420-534`) consumes the previous turn's bot order and writes `brigade_movement_state[19th] = {status:'in_transit', stance:'column', destination_sids:['op:donji_vakuf:pribraca_2'], path, turns_remaining, owner:'bot_discretionary'}` |
| 2 | `check-triggered-operations` **:2075** | sees `in_transit`; `buildOperation` excludes the brigade (`triggered_operations.ts:976-981`) |
| 3 | `commander-correct-march-orders` **:2591** | `correctTransitStates` (`commander_march_correction.ts:167-268`) sees assigned sub-segment front `["op:donji_vakuf:jemanlici"]`, `transitDest=pribraca_2`, `atValidFront=true`, `destInFront=false` → branch :234-238 **deletes the transit state and the order**, no corrected order |
| 4 | `generate-bot-brigade-orders` **:2625** | the bot no longer sees a transit (its in-transit skip `bot_brigade_ai_osid.ts:637-664` does not fire), so it **re-issues the same order** |

Because Pass 1 (`osid_column_movement.ts:383-418`, the only decrementer of `turns_remaining`) runs before
Pass 2 in the same turn, and the state is deleted at step 3 before the next turn's Pass 1, **`turns_remaining`
is never decremented** — zero progress. `prefix_diag.txt` is the source-bound trace of steps 3–4
(`[CORR-DIAG] … atValidFront=true destInFront=false owner=bot_discretionary`, `[BOT-COL-DIAG] … dest=…pribraca_2`).

The 19th finally leaves `jemanlici` at **t29** for `pribraca_2`; the authored `Operation Donji Vakuf`
prestage (`prestage_from: 21`, staging `op:sipovo:pribeljci_2`) produces the t21–t28
`in_transit … pribeljci_2` spells. The t29 write is **not** attributed by the retained evidence and is
recorded as unresolved.

## 2. Classification (packet step 4)

- **The isolated T6 cancellation is (B).** `pribraca_2` is outside the 19th's assigned sub-segment front;
  `correctTransitStates` rejecting it, and the brigade legitimately holding its assigned front, is the
  existing contract (`commander_march_correction.ts:16,28`; tests `tests/retroactive_tooth_eviction.test.ts`).
- **The composition is (C).** T2's column-march target selection is **scope-broader** than T6's validation:
  `getEffectiveCorpsFrontTargets` pools every sub-segment of the brigade's corps
  (`bot_brigade_movement_ai.ts:320-337`), and `evaluateSectorMarch`'s retroactive-tooth eviction uses a
  corps-wide `safeFront` (`bot_brigade_eval_front.ts:~328-378`), while T6 validates only the
  `assigned_sub_segment_id` front (`commander_march_correction.ts:89-96,113-114,173-180,197-198`). For a
  brigade on a single-OSID tooth, **every** T2 eviction destination is outside the assigned sub-segment, so
  T2 and T6 never converge: create → cancel → re-issue, forever. `MOVEMENT_AUTHORITY.md` §2 says T2 chooses
  "on the assigned sector front" and §4 lets T6 repair "inside … its legal connectivity and **assignment
  bounds**" — canon does **not** settle sub-segment vs sector, and the code's own header asserts
  sub-segment. Two behaviours are pinned by tests on opposite sides.
- **Not A, not D.** It is not a legitimate hold (the zero-progress churn serves no purpose and misleads
  consumers), and the chain is fully reproduced.

## 3. Generality (not a Donji Vakuf-only artefact)

`generality_scan_n406.txt` — 10 formations show a ≥5-turn run of a pending order with no transit state and
no location change, across **four factions/corps**: `rs_19th_krajina_light_infantry`,
`hrhb_mostar_brigade`, `arbih_443rd_mountain`, `hvo_nikola_subic_zrinski_brigade`,
`rs_3rd_sarajevo_infantry`, `hrhb_ljubuki_brigade`, `vrs_1st_laktasi` (×2),
`hrhb_1st_herzegovina_brigade_knez_domagoj`, `rs_11th_mrkonji_light_infantry`. The two single-OSID-tooth
cases (`jemanlici`, `trebimlja_2`) are the strongest confirmed signature; the multi-hop cases are a
related-but-unconfirmed class.

## 4. EXTENSION — the precedence/scope decision required (NOT implemented)

**Decision needed:** for a non-operation line brigade, is the authoritative legal march scope the
**assigned sub-segment** (current T6), the **sector**, or the **corps** (current T2)? Canon does not say, so
choosing is a new precedence policy, not the restoration of one.

**Affected callers:** T2 `bot_brigade_eval_front.ts` (tooth eviction, overstack redistribution) and
`bot_brigade_movement_ai.ts` (`getEffectiveCorpsFrontTargets`, `issueInteriorMovement`); T6
`commander_march_correction.ts` (`correctMarchOrders`, `correctTransitStates`); T3
`osid_column_movement.ts` Pass 2; ordering `war_phases.ts` :2591 vs :2625; consumers
`triggered_operations.ts:976-981,1179,1210`, `pre_planned_operations.ts:1803-1808`,
`operation_preparation.ts:311`, `sector_offensive_launch_helpers.ts:479-539`.

**Candidate resolutions (owner to choose; each is a policy change):**
1. Align T6 validation to T2's scope (sector or corps). System-wide movement change; needs re-measure.
2. Run the correction pass **after** the T2 writer so an invalid order is deleted before T3 consumes it.
   Changes admission timing globally.
3. Narrow T2 to the assigned sub-segment. Removes tooth-eviction/rebalancing reach.
4. Resolve at T1: do not assign a line brigade to a single-OSID risky tooth — fold it into an adjacent
   multi-OSID sub-segment or mark it `unstaffed_front` (`MOVEMENT_AUTHORITY.md` §5.7).

**Focused test proposal:** a failing-first regression driving the production pipeline for a small
deterministic prefix — `processOsidColumnMovement` → `correctTransitStates` → the T2 order generation →
next-turn `processOsidColumnMovement` — asserting that a destination inside the chosen scope survives with a
strictly decreasing `turns_remaining`, and an out-of-scope destination is rejected **once** without
perpetual re-issue. Must include an unrelated formation/location fixture so it does not encode the 19th.

## 5. Source-identity notes (packet step 1)

- The **withdrawn `Donji Vakuf Local Action` operation patch and its admission tests are NOT recoverable**
  from this branch (they were never committed and were reverted/deleted before the closeout commit). Only
  the predeclared `CHANGE_SPEC.md` survives; any re-derivation is a **reconstruction**, not the measured
  source.
- The new `prefix_diag.txt` trace was produced by **temporary instrumentation** (logs added to
  `brigade_movement_order_helpers.ts`, `bot_brigade_ai_osid.ts`, `commander_march_correction.ts`,
  `osid_column_movement.ts`) that was **reverted before commit**; the tree is byte-identical to `26342bcc8`.
  The instrumentation is therefore **absent** and the trace is retained as the record.
- `data/derived/latest_run_final_save.json` was left untouched and uncommitted.

## 6. Operation-admission question (packet step 8), without prejudging it

With the corrected evidence: in the t2–6 window the 19th is **transiently `in_transit` during the
admission step** every turn, so `buildOperation` (`triggered_operations.ts:976-981`) drops it and only the
31st remains → `build_insufficient_participants`. That is **blocker 1**. **Blocker 2** is separate: at t5 the
`probe_vrs_1st_krajina_t4` probe is active on the same objective → `objective_overlap`. Fixing the
transit scope would remove blocker 1 for that configuration; it would **not** by itself clear blocker 2,
launch the offer, or capture anything. The two must be re-tested separately in any later explicitly
specified operation experiment.
