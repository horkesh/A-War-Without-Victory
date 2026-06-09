# Displacement Tracking — Settlement-Panel "Now == Pre-war" Diagnosis + National-Stats Scope

Date: 2026-06-09
Worktree: `F:/awwv-disp-diag` off `origin/main` (0725d0de1)
Run inspected: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0/final_save.json` (40w, hash `be76e56dd9d288c2` — matches the known 40w floor).
Scope: DISPLAY / READ-side diagnosis only. No engine/calibration change proposed. §6-adjacent (atrocity magnitudes) — figures reported verbatim, not altered.

---

## 1. Confirmed root cause of `now == before`

There are TWO compounding facts. The owner's "ALWAYS the same" is the early-game manifestation of the first; the second is a permanent loss of per-OSID precision.

### (A) PRIMARY — early-game: displacement_state is seeded but all-zero until ~turn 4–5

At campaign start the desktop loads `data/derived/startup/apr_1992_initial_save.json` (via `startNewCampaign` → `loadStartupSnapshotState`, `src/desktop/desktop_sim.ts:120-122`). That snapshot DOES contain `displacement_state` for 110 municipalities, each with REAL census `original_population` (e.g. `banja_luka` = 195692) — NOT the 10000 default. BUT every row has `displaced_out = displaced_in = lost_population = 0` at turn 0.

Verified by advancing the live desktop snapshot through `advanceTurn`:

```
start  turn=0  nzMuns=0   out=0       lost=0      in=0
t1     turn=1  nzMuns=0   out=0       lost=0      in=0
t2     turn=2  nzMuns=0   out=0       lost=0      in=0
t3     turn=3  nzMuns=0   out=0       lost=0      in=0
t4     turn=4  nzMuns=3   out=6702    lost=1690   in=0
t5     turn=5  nzMuns=106 out=434604  lost=135157 in=53
t6     turn=6  nzMuns=106 out=481964  lost=156242 in=7511
```

Displacement does not begin until turn 4 — the maturation/flight delays (`TAKEOVER_DISPLACEMENT_DELAY_TURNS = 4` in `displacement_takeover.ts:28`; `MINORITY_FLIGHT_WAR_START_DELAY_WEEKS = 4`, but minority_flight is dead — see §2).

In the panel, the mun branch computes
`currentPop = round(popOriginal * disp.currentPopulation / disp.originalPopulation)`
(`SettlementDetailContent.tsx:269-274`). With `displaced_out/in/lost = 0`, `disp.currentPopulation == disp.originalPopulation`, the ratio is exactly 1.0, so `currentPop == popOriginal`. "Now" (line 514 / 617) shows `currentPop ?? popOriginal` → identical to Pre-war. This is CORRECT but reads as "broken" to a player inspecting turns 0–3.

Once displacement accrues (turn 4+), the mun branch DOES move. Emulating the panel's `currentPop` against the 40w FINAL save: of 741 OSIDs with population, **731 show `now != before`**, only 10 show `now == before` (muns with genuinely zero net change). Example: `op:bosanski_petrovac:prkosi` 382 → 378; `op:bosansko_grahovo:crni_lug` 3193 → 3079. So the read/display chain is functionally correct when state is populated.

### (B) SECONDARY — permanent: per-OSID precision is gone because `displacement_event_log` is cleared every turn

`displacement_event_log` is **empty (0 rows)** in the final save AND in the live state every turn. This is BY DESIGN: war-pipeline step `clear-displacement-event-log` (`war_phases.ts:3945-3957`) drains the turn's events to a JSONL side-sink (`displacementEventStreamSink`) and then does `log.length = 0`. The scenario runner wires the sink to `runs/.../displacement_event_log.jsonl` (32,826 rows in this run, `origin_osid` populated e.g. `op:stolac:stolac_2`). The desktop's `advanceTurn` (`desktop_sim.ts:171-176`) registers NO sink, so live events are simply dropped after each turn.

Consequence: the adapter's `displacementByOsid` (built from `state.displacement.displacement_event_log`, `GameStateAdapter.ts:1804-1828`) is ALWAYS empty → exposed as `undefined` (line 2208) → panel `osidDisp` is ALWAYS `undefined` (`SettlementDetailContent.tsx:228`). The panel therefore NEVER takes the precise per-OSID branch (`currentPop` line 270, `outSettlement`/`lostSettlement`/`inSettlement` lines 311-318) and ALWAYS falls back to the coarse municipality-scaled branch. The mun branch still moves the number, but per-OSID departures, killed, and arrivals are pro-rated by `popOriginal/disp.originalPopulation`, not the OSID's real flows.

### Candidate ranking (per the brief)
- (a) **mun-key mismatch — REFUTED.** displacement_state keys are mun slugs (`banja_luka`, `stolac`). OSID props `mun1990_id` are the same slugs (`banja_luka`, `stolac`). `getMunIdForDisplacement` lowercases+trims; values are already lowercase. `SelectionPanel.selectedMunId = selectedOsid.split(':')[1]` yields the same slug. All three agree exactly. `disp` resolves.
- (b) **state lacks displacement — CONFIRMED as the early-game cause.** The live state has displacement_state, but it is all-zero until turn 4. This is the "always same" the owner sees if inspecting early turns.
- (c) **original_population defaulting to 10000 — REFUTED for the apr_1992 path.** Snapshot has real census for all 110 muns (seeded in `buildScenarioStartupState` / `scenario_runner.ts:1728-1743`). The 10000 default only bites a mun that was never census-seeded (none in apr_1992).
- (d) **rich `disp` branch never taken AND osidDisp absent — CONFIRMED (the per-OSID precision loss).** `osidDisp` is always absent live because the event log is cleared each turn (B above). The mun `disp` branch IS taken and works post-turn-4.

**Net:** there is no key bug. The symptom is (b) early-game zero state + (d) the per-OSID branch being permanently dead in the live UI. If the owner reports "now == before even late-game", that points specifically at (d) plus possibly the panel not receiving `displacementByMun` (verify the live IPC/adapter feed — see §4), but the data and code paths examined here would show movement.

---

## 2. Is the engine tracking displacement, and is minority_flight dead?

**Engine tracking: YES, richly.** 40w final save `displacement_state`: 109/111 muns non-zero, total `displaced_out` = 784,632, `lost_population` = 248,815, `displaced_in` = 784,632. Key format = municipality slug. National aggregates fully populated (see §4).

**`minority_flight.ts` IS DEAD / UNWIRED — CONFIRMED.** `processMinorityFlight` is exported but has NO sim call site. The only sites referencing it are its own definition (`minority_flight.ts:152`); `war_phases.ts` imports and calls only `updateDisplacement` (3812) and `processDisplacementTakeover` (2989). `minority_flight_state` is in the serialize lazy-map list (`serialize.ts:136`) but is never written by a live path. The displacement that DOES occur comes entirely from `processDisplacementTakeover` (war-start seeding of all hostile OSIDs + battle-flip timers + sustained mode) and `updateDisplacement` (pressure/encirclement/breach triggers). Minority flight's RBiH-gradual-26-turn model is unused. (Not the cause of now==before; flagged because the brief asked.)

---

## 3. Concrete, minimal FIX PLAN for panel "Now" (UI/adapter-layer, calibration-inert)

The engine is correct; the fix is to restore per-OSID precision to the live UI without re-introducing an unbounded in-memory log. Two options, smallest first.

### Fix 3.1 (smallest, restores per-OSID precision) — feed the per-OSID aggregate that already survives
The bounded aggregate `state.displacement.displacement_origin_dest_arrivals` is persisted, but it only carries `settled` cross-mun arrivals, not departures/killed. The departures/killed that the panel needs are NOT retained per-OSID anywhere persisted (only in the cleared event log + the JSONL stream). So the truly minimal, schema-free fix is:

- **Adapter (`GameStateAdapter.ts`):** when `displacement_event_log` is empty (live/desktop), the per-OSID `displacementByOsid` will be empty — accept this and ensure the mun `disp` branch is always the source of truth in that case (it already is). No change strictly required for "Now" to move post-turn-4; the number already updates. **If the only goal is "Now reflects post-displacement population", no code change is needed — it already does once displacement accrues.**

### Fix 3.2 (recommended, gives per-OSID departed/killed/arrived breakdowns live) — add a small persisted per-OSID flow aggregate
Mirror the existing `displacement_origin_dest_arrivals` pattern with a bounded per-OSID flow tally, written in `appendDisplacementEvent` (`displacement_event_log.ts:54`), so it survives the per-turn clear:

- Add `state.displacement.displacement_flows_by_osid: Record<osid, { out: number; lost: number; in: number; by_ethnicity?: Record<faction, number> }>` (new optional field on `DisplacementStateBucket` in `game_state.ts`; add to `serialize.ts` rescue + `validateGameState.ts` version-gated schema as a new save version, mirroring lines 168-172 / 226-230).
- In `appendDisplacementEvent`, accumulate `out += displaced`, `lost += killed + fled_abroad` keyed by `origin_osid`; `in += settled` keyed by `dest_osid`. This is O(1) per event, deterministic (sums commute), and bounded (~744 OSIDs).
- **Adapter:** build `displacementByOsid`/`departedByOsid` from this new field as a fallback when the event log is empty (`GameStateAdapter.ts:1799-1844`).
- No display-component change required — `SettlementDetailContent.tsx` already prefers `osidDisp` when present (line 270, 311-318).

This is purely additive (calibration-inert: it writes a new read-model field consumed only by the UI; precedent = the observer-flag re-floors in MEMORY where read-model-only fields moved the hash but kept control byte-identical — here it would still move the 40w hash because a new persisted field changes serialization, so it MUST be gated behind a save-version bump and verified `control_delta` byte-identical, exactly like `displacement_humanitarian_aggregates` was added).

### Fix 3.3 (UX, independent of 3.1/3.2) — surface "displacement begins ~turn 4"
Because turns 0–3 legitimately show now==before, add a panel hint when `disp` exists but all flows are zero (e.g. "No displacement recorded yet"). Prevents the false-bug perception. `SettlementDetailContent.tsx` ~line 500 gate.

**Recommendation:** 3.2 (restores the precise per-OSID breakdown the panel was designed for) + 3.3 (kills the early-game false-bug perception). 3.2 requires a save-version bump + byte-identical control verification.

---

## 4. National displacement-stats surface — scope

The war-wide totals the owner wants ALREADY EXIST in persisted state — no new engine aggregation needed. From the 40w final save:

### Killed / fled-abroad by ethnicity — `state.displacement.civilian_casualties`
```
RBiH (Bosniak): killed 35,652   fled_abroad 80,074
RS   (Serb):    killed  2,777   fled_abroad 59,740
HRHB (Croat):   killed  3,452   fled_abroad 81,270
```
(Written by `recordCivilianDisplacementCasualties`, `displacement_state_utils.ts:36`.)

### Refugees created + casualties by PERPETRATOR × victim-ethnicity — `state.displacement.displacement_humanitarian_aggregates`
Outer key = `caused_by` faction; inner = victim ethnicity. e.g.:
```
RS  → RBiH: refugees_created 763,165  civilian_casualties_caused 34,952
RS  → HRHB: refugees_created 262,059  civilian_casualties_caused  3,152
RBiH→ RS:   refugees_created 219,509  civilian_casualties_caused  1,668
HRHB→ RS:   refugees_created  50,679  civilian_casualties_caused  1,109
```
(Written by `appendDisplacementEvent`, `displacement_event_log.ts:84-93`. NOTE: `refugees_received` is 0 across the board because events do not populate `dest_osid` — only `dest_mun` — so the receive-side attribution at `displacement_event_log.ts:101` never fires. If "received by faction" is wanted, populate `dest_osid` at the routing append sites, or derive received from `displacement_origin_dest_arrivals`.)

### Origin→dest flows — `state.displacement.displacement_origin_dest_arrivals`
231 `origin_mun|ethnicity` composite keys → dest_mun → settled. Drives a "where did people go" map.

### Per-turn refugee rate — `state.displacement.displacement_recent_by_turn`
40 turn entries (refugees_created per turn) — drives a time-series.

**By-ethnicity availability:** YES for all of the above (ethnicity-aligned faction is the inner/victim key). Perpetrator attribution YES via `caused_by`. The only gap is `refugees_received` (dest_osid not set).

**Where it would mount in the UI:** a new top-level "Humanitarian" / "Displacement Ledger" surface in the tactical-map UI (sibling to existing panels). The adapter (`GameStateAdapter.ts`) already reads `state.displacement.*`; add a `nationalDisplacement` block to `LoadedGameState` exposing `civilian_casualties`, `displacement_humanitarian_aggregates`, and `displacement_recent_by_turn`, then render a faction×ethnicity table + a per-turn sparkline. This is pure read-model exposure (no engine change). The consumers `war_dispatches.ts:184`, `negotiation/compute_capital.ts:246`, `negotiation/scoring.ts:189`, and `replay_frame_summary.ts:75` already read these aggregates, so the shapes are proven.

---

## 5. Determinism / §6 notes + smoke-test list

- **Determinism:** no `Math.random`/`Date.now`/timestamps proposed. Fix 3.2's `appendDisplacementEvent` accumulation is order-insensitive (sums) and already documented order-insensitive in `displacement_event_log.ts:26-28`. Adapter iteration must keep `strictCompare`/`localeCompare` sorting (already present at `GameStateAdapter.ts:1779`, 1787).
- **§6:** all figures above are reported verbatim from the engine; no magnitudes invented or altered. `docs/10_canon/FORAWWV.md` untouched. The national surface DISPLAYS engine truth only.
- **Calibration:** Fix 3.1 / 3.3 / the national surface (§4) are read-model-only and should be 40w/188w byte-identical (`control_delta` 0). Fix 3.2 adds a persisted field → save-version bump required and WILL move the state hash via serialization; must verify `control_delta.json` byte-identical at 40w + 188w before merge.

### Smoke tests
```
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run tests/displacement.test.ts \
  tests/displacement_civilian_casualties_contract.test.ts \
  tests/displacement_pipeline_displacement_accumulation.test.ts \
  tests/displacement_pipeline_municipality_aggregation.test.ts \
  tests/displacement_pipeline_pipeline_integration.test.ts \
  tests/displacement_pipeline_state_schema.test.ts \
  tests/displacement_pipeline_validation.test.ts \
  tests/state/displacement_event_log.test.ts \
  tests/bilateral_displacement_cascade.test.ts
npm run sim:scenario:run:40w   # confirm hash be76e56dd9d288c2 (control_delta byte-identical)
npm run desktop:map:build
```
(For Fix 3.2 also run 188w and diff `control_delta.json`.)

---

### Key file:line index
- Engine write: `src/state/displacement.ts:685` (updateDisplacement), `src/state/displacement_takeover.ts:482` (processDisplacementTakeover), `src/state/displacement_event_log.ts:54` (appendDisplacementEvent + aggregates).
- Per-turn clear: `src/sim/turn_phases/war_phases.ts:3945-3957` (clear-displacement-event-log).
- Census seeding: `src/scenario/scenario_runner.ts:1728-1743` (inside buildScenarioStartupState).
- Desktop entry: `src/desktop/desktop_sim.ts:113` (startNewCampaign → snapshot), `:161` (advanceTurn, no sink, no municipalityPopulation1991).
- Snapshot artifact: `data/derived/startup/apr_1992_initial_save.json`.
- Adapter read: `src/ui/map/data/GameStateAdapter.ts:1776-1844` (displacementByMun / displacementByOsid), exposed `:2205-2208`.
- Panel display: `src/ui/map/components/SettlementDetailContent.tsx:38-45` (munId), `:226-228` (disp/osidDisp), `:269-274` (currentPop), `:514`/`:617` ("Now").
- Dead module: `src/state/minority_flight.ts:152` (processMinorityFlight, no call site).
- National state shapes: `src/state/game_state.ts:2986` (humanitarian_aggregates), `displacement.civilian_casualties`, `displacement_origin_dest_arrivals`, `displacement_recent_by_turn`.
