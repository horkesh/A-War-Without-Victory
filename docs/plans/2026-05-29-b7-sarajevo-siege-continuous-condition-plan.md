# B7 — Sarajevo Siege Continuous-Condition Modeling (Design + Implementation Plan)

**Date:** 2026-05-29
**Status:** Design proposal (planning only — NO code, do NOT commit)
**Lane:** B7 (deferred during Phase D/B authoring)
**Owners:** Game Designer (lead), Event-system / narrative-designer (lifeline + surfacing), gameplay-programmer (engine), historian (grounding), data-pipeline/save (migration)
**Authority:** Below canon. Inherits — in hierarchy order:
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` (Ring 1 enclaves; §6 sign-off; §3 no-lever rule)
- `docs/10_canon/Engine_Invariants_v0_9_0.md` §8 (exhaustion monotonic, irreversible)
- `docs/plans/2026-05-17-sarajevo-special-casing-canon-plan.md` (Branch B: numerics → `scenario.sarajevo_overrides`; ID-sets = engine geometry)
- `CLAUDE.md` (negative-sum ethos, determinism sacred, ops-only-attacks, NEVER override initial OSIDs)

> **For Claude executing this:** REQUIRED SUB-SKILL `superpowers:executing-plans` task-by-task. This plan models a SENSITIVE-HISTORY Ring 1 subject (siege civilian suffering). Every phase is flag-gated default-OFF and byte-identical until a §6 sign-off lands. STOP at the §6 gate before any value/threshold tune.

---

## 1. Objective + Why

**Objective.** Model the Sarajevo siege (April 1992 – February 1996, ~1,425 days — the longest siege of a capital in modern history) as a **single coherent continuous battlefield condition**, consolidating the four engine mechanisms that already model fragments of it, and adding the one missing piece: an explicit **lifeline modifier** (UN airlift + the Dobrinja–Butmir tunnel) that mediates supply strangulation and civilian attrition over the siege's full duration.

**Why now.**
1. **Historically central, mechanically under-represented.** The siege is the defining experience of the war for ~340,000 trapped civilians, yet today the engine surfaces it almost entirely through *discrete* events (`sarajevo_siege_begins_1992`, `sarajevo_tunnel_completed_1993`, `markale_area_shelling_1993`, `markale_massacre_1994`, `second_markale_massacre_1995`, `anti_sniping_agreement_1994`). Discrete shelling events under-represent the *continuous* strangulation: the grinding daily attrition, the slow supply choke, the way the tunnel changed the siege from "total blockade" to "strangled but survivable" (the `sarajevo_tunnel_completed_1993` narrative says exactly this — `data/scenarios/events/war_1993.json:2604`).
2. **The substrate already half-exists but is fragmented.** Four disconnected systems each model a slice (see §4). They share no single status object, no shared lifeline input, and no shared read-model. Consolidation buys coherence + a clean surface, not new behavior.
3. **It must stay negative-sum.** The siege is exhaustion and constrained agency made concrete. The deliverable is NOT a "lift the siege" minigame. Relief is possible only as the existing ops-only consequence of control flips; the player experiences the siege primarily as a *cost that accrues* — to exhaustion, morale, supply reserves, civilian displacement — not a puzzle to optimize away.

**Non-objective (stated up front so it cannot drift):** this lane does not add a victory condition, a relief score, a "days survived" badge, a brutality lever for the besieger, or any surface that rewards or optimizes against civilian suffering (Gate §3 #4, #5, #10).

---

## 2. Scope & Non-Scope

### In scope
- A **unified continuous-condition substrate**: promote the existing per-turn `SarajevoState` (`src/state/game_state.ts:1625`) to the single read/write home for siege phase, intensity, duration, internal/external supply, humanitarian pressure — and add a **lifeline field** plus a **phase enum already-present** reuse (`OPEN | PARTIAL | BESIEGED`).
- A **lifeline modifier** (`SiegeLifelineState`): a derived 0..1 scalar combining airlift availability (event-flag-gated) and tunnel availability (post-`sarajevo_tunnel_completed_1993`), feeding external_supply, attrition escalation, and morale drain. This is the one genuinely-new mechanic.
- **Consolidation wiring:** make `siege_attrition.ts`, `siege_morale_drain.ts`, the exhaustion siege-extra (`exhaustion.ts:90-98`), and supply-reserve siege drain (`supply_reserves.ts:300-310`) read the unified lifeline scalar instead of independently re-deriving siege state. No new attrition formulas — the lifeline becomes a multiplier into existing formulas.
- **Player-facing read-model** (read-only): a `SarajevoSiegeReadModel` exposing duration, status, lifeline status (open/strangled/severed), supply trend, humanitarian-pressure band — sourced only from already-public `SarajevoState`, never from hidden enemy truth.
- **Save migration + validator** for the new optional fields.
- **Flag gating**: a default-OFF `SARAJEVO_CONTINUOUS_CONDITION_ENABLED` shadow flag (env + scenario), byte-identical when OFF.
- **Sensitive-history source_note + §6 sign-off** for any value/threshold change.

### Non-scope (explicit)
- **NO "relieve the siege" victory/score mechanic.** Flag as the **Ring-3 sensitive boundary** (§8). Relief remains an emergent consequence of ops-only control flips, never a tracked objective with a reward.
- **NO besieger "shelling intensity" or "siege brutality" lever.** Siege intensity is *derived* from supply/firepower/duration, never *chosen* by RS. (Gate §3 #1, #5.)
- **NO concentration-camp / detention subsystem** (Gate §3 #2) — out of bounds regardless.
- **NO change to siege-ring OSID membership** — `SARAJEVO_CITY_CORE_MUN_IDS` / `SARAJEVO_MUN_IDS` are engine geometry (`enclave_integrity.ts:16-38`), code-side canon per the 2026-05-17 Branch B decision. Annotation/read only.
- **NO new rupture.** Markale stays Ring 2 narrative; it does not meet the §2 four-criteria test (Gate §1 table, line 89).
- **NO calibration tune** in the flag-OFF path. Any default value move is a separate one-change-per-run calibration step after §6 sign-off.
- **NO new discrete civilian-death counter for the siege.** Civilian attrition flows through the existing displacement + casualty ledgers (Gate §1, Ring 1 displacement).
- Other enclaves (Bihać, Srebrenica, Žepa, Goražde) — Sarajevo only. The substrate may be *shaped* for later reuse but is not generalized here.

---

## 3. Historical Grounding (source tier: ICTY > museum > BB)

| Fact | Value | Source tier |
|---|---|---|
| Siege duration | ~1,425 days, 5 Apr 1992 – 29 Feb 1996 (longest siege of a capital in modern warfare) | ICTY *Galić* (IT-98-29), *D. Milošević* (IT-98-29/1), *Karadžić*, *Mladić* |
| Encirclement geography | VRS held surrounding ridgelines (Trebević, Grbavica, Ilidža, Vogošća, Ilijaš, Hadžići); ARBiH held the inner-city core (Centar, Novi Grad, Novo Sarajevo, Stari Grad) | BB1 (encirclement maps); matches code `SARAJEVO_CITY_CORE_MUN_IDS` vs outer `SARAJEVO_MUN_IDS` (`enclave_integrity.ts:26-38`) |
| Supply lifeline — UN airlift | Operation Provide Promise, longest humanitarian airlift in history (Jul 1992 – Jan 1996), intermittent — suspended under shelling/incidents | UN A/54/549; BB |
| Supply lifeline — tunnel | "Objekt BD" Dobrinja–Butmir, 800m under the airport runway, completed mid-1993, up to ~20 t/day; "transformed the siege from a total blockade into a strangled but survivable containment" | Sarajevo War Tunnel Museum; matches `sarajevo_tunnel_completed_1993` (`war_1993.json:2604`) |
| Shelling / sniping tempo | Sustained daily indirect fire + sniping of civilians ("Sniper Alley"); episodic mass-casualty shellings | ICTY *Galić* findings (campaign of sniping/shelling terror) |
| Markale mass-casualty events | Markale I (5 Feb 1994, 68 killed); Markale II (28 Aug 1995, 43 killed) — within siege case law, NOT discrete ruptures | ICTY (Gate §1 table line 89); already Ring 2 events |
| Civilian attrition | ~5,400+ civilians killed in the siege period; mass displacement; chronic shortage of food/water/electricity/heating fuel | ICTY *Galić*/*D. Milošević*; UN reports |

**Grounding constraint for the model:** the *mechanism* (encirclement → strangulation → lifeline-mediated survival → attrition + exhaustion) is canon; the *numeric values* are sim-tuning and flow through `scenario.sarajevo_overrides` per the 2026-05-17 Branch B decision. The lifeline timeline anchors (airlift window, tunnel completion turn) bind to existing event truth, never to a bare calendar check.

---

## 4. Current-State Findings (file:line)

Sarajevo is **already a continuous condition in four fragments** plus discrete events. The lane consolidates, it does not invent.

**Discrete events (Ring 2 narrative — keep):**
- `sarajevo_siege_begins_1992` (`data/scenarios/events/war_1992.json:3557`) sets `sarajevo_siege_active` flag.
- `sarajevo_tunnel_completed_1993` (`war_1993.json:2602`) — supply_delta +10, morale +5; the lifeline narrative anchor.
- `markale_area_shelling_1993` (`war_1993.json:3214`), `markale_massacre_1994` (`war_1994.json:110`), `second_markale_massacre_1995` (`war_1995.json:520`), `anti_sniping_agreement_1994` (`war_1994.json:2769`), `nato_ultimatum_sarajevo_1994` (`war_1994.json:150`), `sarajevo_exclusion_zone_1994` (`war_1994.json:452`). All carry `source_note` (in `SOURCE_NOTE_EVENT_IDS`, `tests/codex_sensitive_history_source_notes.test.ts:18`).

**Continuous-condition fragments (the substrate to unify):**
1. **`SarajevoState` per-turn derivation** — `src/state/sarajevo_exception.ts:85` `updateSarajevoState()`. Already computes `siege_status` (`OPEN|PARTIAL|BESIEGED`), `siege_duration` (monotonic per-turn increment), `internal_supply`, `external_supply` (currently `= internalSupply`, line 109 — **the gap the lifeline fills**), `siege_intensity`, `humanitarian_pressure`, `international_focus`. State type at `game_state.ts:1625`. Wired in `war_phases.ts:2565`.
2. **Siege bombardment attrition** — `src/sim/combat/siege_attrition.ts:54` `applySiegeBombardmentAttrition()`. Reads `military.siege_turn_counters` (`game_state.ts:2049`), escalates by duration + firepower ratio, records casualties + pool exhaustion. Wired `war_phases.ts:1993`.
3. **Siege defender morale drain** — `src/sim/combat/siege_morale_drain.ts:1` graduated by `siege_turn_counters`; default-OFF env flag `SIEGE_MORALE_DRAIN_ENABLED` (byte-stable when unset — the precedent gating pattern to mirror).
4. **Exhaustion siege-extra** — `src/sim/combat/exhaustion.ts:90-98`: when `sarajevo_state.siege_status === 'BESIEGED'`, adds `rbih_exhaustion_per_turn` / `rs_exhaustion_per_turn` from `getSarajevoSiegeParams()`. Monotonic (Engine Invariants §8).
5. **Supply-reserve siege drain** — `src/state/supply_reserves.ts:300-310`, keyed off `siege_turn_counters`.
6. **Siege-turn-counter driver** — `updateSiegeTurnCounters()` (`supply_reserves.ts:155`), wired `war_phases.ts:592`; increments `${factionId}:${osid}` on consecutive critical-supply turns.
7. **Enclave integrity** — `src/state/enclave_integrity.ts:152` `updateEnclaveIntegrity()`; Sarajevo gets `CAPITAL_ENCLAVE_VISIBILITY=3.0`, `SARAJEVO_PRESSURE_MULTIPLIER=3.0`, `SARAJEVO_DEGRADATION_RATE=0.5`, `integrity_floor` (Branch B override). Wired `war_phases.ts:2549`.

**Numeric tuning surface (Branch B, reuse as-is):** `src/sim/combat/sarajevo_siege_params.ts` — `getSarajevoSiegeParams(state)`, `scenario.sarajevo_overrides`, defaults frozen. The lifeline scalars should land here as additional optional override fields, preserving the single-resolution-surface invariant.

**Engine pattern to reuse (the load-bearing precedent):** the **monotonic per-turn accumulator + flag-gated read** of `updateExhaustion()` — `src/sim/combat/exhaustion.ts:41-117`. It is: phase-gated (`meta.phase === 'war'`), reads a derived siege status, applies a bounded per-turn delta, never decreases (§8), and is consumed downstream by gates. The continuous siege condition fits this shape exactly: `updateSarajevoState()` (already per-turn, already monotonic on `siege_duration`) becomes the canonical accumulator; the lifeline scalar is a new bounded input. (Secondary reuse: `war_supply_condition` derivation in `supply_condition.ts` as the live-current-state pattern that pairs with the monotonic accumulator.)

**Determinism baseline (memory):** BFS isolation detection is ABSENT (so encirclement = control-of-ring-OSIDs, not graph isolation — keep that); enclave-lock guard exists in `warlord_friction.ts`. Do not add BFS encirclement here (out of scope).

---

## 5. Design — The Continuous Condition

### 5.1 State representation (new GameState fields → migration + validator)

Extend `SarajevoState` (`game_state.ts:1625`) with the lifeline, keeping all current fields:

```ts
// addition to SarajevoState
lifeline?: SiegeLifelineState;        // derived per-turn; OPTIONAL for old saves
```

New nested type (sibling of `SarajevoState`):

```ts
export type SiegeLifelineStatus = 'OPEN' | 'STRANGLED' | 'SEVERED';
export interface SiegeLifelineState {
    status: SiegeLifelineStatus;       // derived band
    airlift_active: boolean;           // from event flag (Provide Promise window)
    tunnel_active: boolean;            // from sarajevo_tunnel_completed_1993 fired
    throughput: number;                // 0..1 derived scalar (the multiplier)
    last_updated_turn: number;
}
```

- **Persisted contract:** `lifeline` is OPTIONAL, derived each turn (re-derivable, so safe to default `undefined` on old saves — runtime-only-ish, but persisted for read-model + replay parity). Classify per the Phase 2 optional-field family rules in `2026-05-24-engine-quality-residuals-execution-plan.md`.
- **Lifeline override scalars** go into `sarajevo_siege_params.ts` / `scenario.sarajevo_overrides` (Branch B surface), e.g. `lifeline_tunnel_throughput`, `lifeline_airlift_throughput`, `lifeline_severed_attrition_mult`. Defaults preserve current behavior (i.e. when flag OFF, `throughput` is never read).

### 5.2 Per-turn derivation (extends `updateSarajevoState`)

When `SARAJEVO_CONTINUOUS_CONDITION_ENABLED` is set:
1. **Lifeline derivation (deterministic, read-only inputs):**
   - `tunnel_active = state.military.fired_event_ids includes 'sarajevo_tunnel_completed_1993'` (event truth, not calendar — mirrors §4 "event truth not date" rule from the 5th-corps doc).
   - `airlift_active = event flag` for Provide Promise window (suspended by shelling-incident flags if present; else default active in window).
   - `throughput = clamp01( base + tunnel_active*tunnel_throughput + airlift_active*airlift_throughput )`, bounded; **`status`** banded: `SEVERED` (throughput≈0), `STRANGLED` (low), `OPEN` (lifeline carrying).
2. **`external_supply` stops aliasing `internal_supply`** (closing the `sarajevo_exception.ts:109` gap): `external_supply = throughput` so the lifeline genuinely mediates the OPEN/PARTIAL/BESIEGED band and `siege_intensity` (which already multiplies by `(1 - externalSupply)`, line 123).
3. **`siege_duration`** stays monotonic (the exhaustion §8 analogue).

### 5.3 Per-turn effects (consolidation — no new formulas)

The lifeline `throughput` becomes a **single shared multiplier** into the four existing fragments:
- **Bombardment attrition** (`siege_attrition.ts`): `SEVERED` lifeline raises escalation toward cap; `OPEN` damps it. Multiply the existing `escalation`/`fpRatio` product by a lifeline factor (≥1 when severed, <1 when open). No new casualty math.
- **Morale drain** (`siege_morale_drain.ts`): lifeline `OPEN` softens the graduated decrement; `SEVERED` hardens it (toward, never below, `SIEGE_DRAIN_MORALE_FLOOR=25`).
- **Exhaustion siege-extra** (`exhaustion.ts:90-98`): scale the besieged `rbih_exhaustion_per_turn` by `(1 - 0.5*throughput)` so a working tunnel slows (never reverses — §8) RBiH exhaustion growth. RS extra unchanged (besieger).
- **Supply-reserve drain** (`supply_reserves.ts:300-310`): lifeline `throughput` offsets the siege drain (a working lifeline = less reserve burn).

All four stay **faction-symmetric in mechanism**; the asymmetry (RBiH besieged, RS besieger) is data-driven by who controls the ring, never special-cased beyond the existing `sarajevo_exception.ts` controller logic.

### 5.4 How it begins / ends (no calendar railroad)
- **Begins:** `siege_status` becomes `BESIEGED` from the existing derivation — RBiH controls the inner core + low internal supply, OR canonical `sarajevo_siege_active` flag set (existing `isSarajevoSiegeCanonicallyActive`, `sarajevo_exception.ts:78`). No new trigger.
- **Ends:** `siege_status → OPEN` when supply recovers (lifeline OPEN + control intact) or when control flips through combat. Ending is emergent from supply + ops-only control, **never a "siege lifted!" reward event**. The `anti_sniping_agreement_1994` / `sarajevo_exclusion_zone_1994` events may set lifeline-easing flags (Ring 2 narrative) but do not "win" anything.

### 5.5 How relief offensives interact (ops-only-attacks intact)
- An ARBiH operation that flips a ring OSID (e.g. a historical Igman/airport-corridor push) reduces VRS firepower presence around the pocket and may flip `siege_status`. This already works through `CorpsOperation` → control flip → next-turn re-derivation. **No new "relief operation" type.** The plan adds *no* op-layer code. (Operations-expert sign-off only if any op data changes — it should not in this lane.)

### 5.6 Negative-sum + determinism guarantees
- Siege is a **cost accumulator**, not an objective. The only "reward" for surviving is the absence of accrued cost — exactly the Gate §3 #10 "absence of a flag, not a badge" pattern.
- Fully deterministic: sorted iteration via `strictCompare`, event-flag/control inputs only, no `Math.random`/`Date.now`, monotonic `siege_duration` (§8 analogue).

---

## 6. Player-Facing Surface (read-model only; no hidden-truth leak)

A single read-model assembled from already-public `SarajevoState` (it is the defender's own city — no enemy-truth leak):

```ts
export interface SarajevoSiegeReadModel {
    status: SarajevoSiegeStatus;          // OPEN | PARTIAL | BESIEGED
    duration_turns: number;
    lifeline: SiegeLifelineStatus;        // OPEN | STRANGLED | SEVERED
    supply_trend: 'improving' | 'stable' | 'worsening';  // sign of internal_supply delta
    humanitarian_band: 'contained' | 'severe' | 'critical';  // banded, never raw count
}
```

- Surfaces in the existing CoS/Situation panel area (e.g. a "Sarajevo" status line in `SituationTab.tsx` which already references siege state). **No new modal** without ui-ux-developer sign-off (Gate §6 row + napkin UI rule).
- **Banded, never numeric civilian counts** in the read-model (Gate §4 forbids casualty %; raw counts live only in the casualty ledger / endgame Cost Ledger prose). No "days survived" leaderboard, no relief progress bar.
- Narrative voice for any new prose: historical, third-person, source_note-gated (Gate §4, §5).

---

## 7. Step-by-Step Implementation (flag-gated, default-OFF, byte-identical)

Each phase = one commit. Flag OFF ⇒ 40w + 188w hashes byte-identical to captured baseline.

**Phase 0 — Inventory + baseline capture (no behavior).**
Capture current 40w + 188w hashes. Write a deterministic inventory note enumerating the four siege fragments + their constants (extend the Branch-B `SARAJEVO_CONSTANT_INVENTORY.md` artifact). Tests-first: a static test asserting the four fragments + lifeline scalars are the complete consolidation set. STOP if more than the enumerated siege mechanisms surface.

**Phase 1 — State + flag (inert).**
Add `SiegeLifelineState` type + optional `lifeline` field on `SarajevoState`; add `SARAJEVO_CONTINUOUS_CONDITION_ENABLED` flag (env + scenario, default-OFF, mirroring `SIEGE_MORALE_DRAIN_ENABLED`). Add lifeline override fields to `SarajevoSiegeOverrides` (default undefined). Save migration (new version bump) + validator + fixture for the new optional field. No derivation yet. Byte-identical.

**Phase 2 — Lifeline derivation (shadow, no consumers).**
Extend `updateSarajevoState()` to derive `lifeline` when flag ON; `external_supply` still aliases `internal_supply` when flag OFF (byte-identical). Diagnostic-only: `lifeline` populated, nothing reads it. Tests: lifeline `SEVERED` pre-tunnel, `STRANGLED`/`OPEN` post-tunnel; deterministic across reruns.

**Phase 3 — Consolidate consumers behind the flag.**
Wire `throughput` as the shared multiplier into attrition, morale-drain, exhaustion-extra, supply-reserve drain — **only when flag ON**. When OFF, every consumer takes the identical pre-change path. Per-consumer red tests: OFF = byte-identical to pre-change; ON = lifeline visibly modulates the existing formula. STOP if any OFF path drifts (do not paper over with tolerance — Branch-B Task-4 stop-gate precedent).

**Phase 4 — Read-model + surface.**
Add `SarajevoSiegeReadModel` builder (pure, from `SarajevoState`). Surface a banded status line (ui-ux-developer sign-off). No raw counts. Read-model tested for no-hidden-truth (sources only public defender state).

**Phase 5 — §6 sensitive-history gate + (optional, separate) calibration.**
Bring the flag-ON path to the user for §6 sign-off (enclave-mechanics change touching Sarajevo). ONLY after sign-off: a separate one-change-per-run calibration step may move a default value. Default-flip (OFF→ON) is itself a §6 + user decision, not part of this plan's execution.

---

## 8. Determinism, Canon & Sensitive-History Compliance

- **Determinism:** no `Math.random`/`Date.now`/timestamps; sorted iteration via `strictCompare`; event-flag + control + supply inputs only; `siege_duration` monotonic (Engine Invariants §8). New persisted field gets migration/default/validator/fixture (the §4-cited engine-quality contract).
- **Canon hierarchy:** Engine Invariants §8 (monotonic) > Branch-B numeric/ID-set split (ID-sets untouched, numerics via overrides) > this design. NEVER override initial OSIDs (control comes from existing derivation). Ops-only-attacks intact (no op-layer code). Faction-symmetric mechanism. Do NOT auto-edit `FORAWWV.md` — flag a manual-review note if a canonical "siege = continuous condition" clause is wanted.
- **Sensitive-history (Gate):**
  - Ring placement: the continuous condition is **Ring 1** (mechanical, like enclaves) for *its own* state; civilian suffering surfaces via existing Ring-1 displacement/casualty ledgers and Ring-2 narrative events. No new Ring-3 surface.
  - **The Ring-3 boundary this plan draws:** the siege is modeled as an **accruing cost the player endures**, never a **lever the player (or besieger) pulls**. Specifically refused: a relieve-the-siege score/victory, a besieger shelling-intensity control, a days-survived/prevented-massacre reward, a numeric civilian-death surface. (Gate §3 #1/#4/#5/#10; §8 lesson "atrocity is a consequence, not a lever".)
  - Markale stays Ring 2; **no new rupture** (fails §2 four-criteria, Gate line 89).
  - Any new event/prose text → `source_note` provenance-only, added to `SOURCE_NOTE_EVENT_IDS` and `codex_sensitive_history_source_notes.test.ts`.
  - **§6 sign-offs required:** `/gameplay-programmer` + `/historian` (enclave-mechanics change, Sarajevo) ; `/game-designer` (verify no Ring-3 surface created) ; `/narrative-designer` + `/historian` (any new prose) ; **user approval** for the default-ON flip (could change accepted output → "reward for atrocity" check, not delegable).

---

## 9. Test / Verification Gates

- **New tests (tests-first):**
  - `sarajevo_lifeline_derivation.test.ts` — SEVERED/STRANGLED/OPEN bands; pre/post tunnel via `fired_event_ids` (not calendar); determinism.
  - `sarajevo_continuous_condition_flag_off.test.ts` — every consumer byte-identical with flag OFF.
  - `sarajevo_lifeline_consumers.test.ts` — attrition/morale/exhaustion/supply each modulated ON.
  - `sarajevo_siege_read_model.test.ts` — banded, no raw counts, no hidden-truth.
  - `sarajevo_lifeline_save_migration.test.ts` — old save (no `lifeline`) loads → defaults; round-trip lossless.
  - Extend `codex_sensitive_history_source_notes.test.ts` if new prose lands.
- **Save/schema:** version bump, default, validator, v(N-1) fixture (per §4 engine-quality contract).
- **Regression (hash gates):** `npm run sim:scenario:run:40w` + 188w. **Flag OFF ⇒ both hashes byte-identical** to Phase-0 captured baseline (anchors/benchmarks unchanged: 26/27 + 6/6). Flag ON ⇒ deterministic shift only (re-run twice, identical).
- **Smoke triad:** `tsc --noEmit` + `vitest run` + `desktop:map:build`.
- STOP on any unexplained flag-OFF hash drift.

---

## 10. Risks / Rollback / Dependencies / Owner / DoD

**Risks**
1. **Gamifying suffering (sensitive-history violation) — highest.** Mitigation: §2 non-scope + §8 Ring-3 boundary + §6 sign-off; cost-accumulator framing, no objective/lever/reward. War-or-game not auto-dispatched but available on explicit request.
2. **Calibration drift.** Mitigation: default-OFF byte-identical; any value move is a separate one-change-per-run step post-sign-off.
3. **Over-scope** (BFS encirclement, other enclaves, op-layer relief). Mitigation: explicit non-scope; consolidation-only, no new formulas.
4. **Double-counting** (lifeline modulates a fragment that already self-derived siege state). Mitigation: Phase 0 inventory enumerates every read site; consumers switch to the shared scalar, not add to it.
5. **Save-shape regression.** Mitigation: optional field, migration + fixture + round-trip test.

**Rollback:** flag is default-OFF; revert by leaving the flag unset (inert). Each phase is one commit, independently revertible. No baseline refresh until the default-ON decision.

**Dependencies:** Branch-B `sarajevo_siege_params.ts` / `scenario.sarajevo_overrides` (landed). Engine-quality optional-field/migration contract (`2026-05-24-engine-quality-residuals-execution-plan.md` Phase 2). Event truth for `sarajevo_tunnel_completed_1993` + airlift flag. `SIEGE_MORALE_DRAIN_ENABLED` gating pattern as the precedent.

**Owner:** Game Designer (design + boundary) ; gameplay-programmer (engine consolidation) ; event-system/narrative-designer (lifeline event-flag wiring + any prose) ; data/save (migration). Reviewers: historian, ui-ux-developer (surface), determinism-auditor.

**Definition of Done**
- Single unified `SarajevoState` + `SiegeLifelineState` substrate; four fragments consume one shared lifeline scalar.
- Lifeline derived from event truth (tunnel/airlift), not calendar; `external_supply` no longer aliases `internal_supply` when ON.
- Read-model banded, public-state-only, no raw civilian counts, surfaced in Situation panel.
- Flag default-OFF; 40w + 188w byte-identical OFF; deterministic-only shift ON.
- All new tests green; migration + validator + fixture green; smoke triad green.
- §6 sign-offs recorded; FORAWWV manual-review note flagged if a canon clause is wanted (not auto-edited).
- Ledger entry appended; implemented report written; this plan + MASTER_ROADMAP B7 row updated. Default-ON flip deferred to an explicit user decision.

---

## Appendix A — Files (read/touch map)
- `src/state/game_state.ts:1625` (SarajevoState, +SiegeLifelineState) ; `:2049` (siege_turn_counters) ; `:1438` (sarajevo_overrides)
- `src/state/sarajevo_exception.ts:85` (updateSarajevoState — derivation home; close `:109` aliasing gap)
- `src/sim/combat/sarajevo_siege_params.ts` (override surface; +lifeline scalars)
- `src/sim/combat/siege_attrition.ts:54` ; `src/sim/combat/siege_morale_drain.ts` ; `src/sim/combat/exhaustion.ts:90-98` ; `src/state/supply_reserves.ts:300-310` (consumers)
- `src/state/enclave_integrity.ts:16-38` (ID-set geometry — read/annotate only) ; `:152` (integrity)
- `src/sim/turn_phases/war_phases.ts:592,1993,2549,2565` (wiring sites)
- `src/ui/map/components/SituationTab.tsx` (read-model surface)
- `data/scenarios/events/war_1993.json:2602` (tunnel) ; `war_1992.json:3557` (siege begins) ; Markale rows
- `tests/codex_sensitive_history_source_notes.test.ts:18` (source_note registry)
- Reuse pattern: `src/sim/combat/exhaustion.ts:41-117` (monotonic per-turn accumulator + flag-gated read)
