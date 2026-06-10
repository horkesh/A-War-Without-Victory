# RBiH Supply Constraint — Arms Embargo Timeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the UN arms embargo into the simulation as a phase-keyed timeline that delivers a faction-asymmetric supply cap on RBiH (and zero direct effect on RS/HRHB), sourced to BB1 where citable and explicitly flagged as estimate where not.

**Architecture:** Five embargo phases drive a per-faction supply cap. Phases are resolved each turn from canonical event flags. Caps are applied at the existing chokepoint in `src/state/supply_reserves.ts` (the current hard-coded `0.6` RBiH patron multiplier), so no new combat-side wiring is required. The `embargo_lifted` flag = 3 Nov 1994 is BB1-cited (p.63). Phase 3 (Iranian "Black Flights") and Phase 5 (UNSCR 1021 formal lift) carry `no BB source found` tags and are gated behind `/historian` follow-ups before quantitative caps land.

**Tech Stack:** TypeScript sim state (`src/state/embargo.ts`, `src/state/supply_reserves.ts`), event flags (`data/scenarios/events/`), Vitest, 40w + 188w scenario runner, anchor diff vs n1844.

---

## Scope

This plan owns ONLY the embargo timeline and its faction-asymmetric supply effect.

In scope:
- Five-phase embargo timeline keyed off canonical event flags.
- Per-faction supply cap constants (RBiH only; RS/HRHB unchanged).
- A single resolver `resolveActiveEmbargoPhase(state)`.
- Wiring caps into the existing `supply_reserves.ts` chokepoint.
- Authoring only the events the Historian audit row H4 marks as MISSING.
- `/historian` follow-ups for Phase 3 (Iranian Black Flights) and Phase 5 (UNSCR 1021) before any quantitative caps for those phases land.

Out of scope (owned by sibling plans — DO NOT TOUCH):
- The `state.military.logistics_priority` player lever and the `[0.5, 1.5]` cap (Logistics Priority plan).
- Dual-source reconciliation of `war_supply_pressure` and `war_supply_condition` (Supply Design Completion plan).
- Airdrop math, convoy modelling, UNPROFOR.
- HRHB-side supply (different mechanism — Croatia transit, not embargo).

## Source Anchors

- Historian audit row H4: `docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md` §H4.
- BB1 p.167: UNSCR 713 mechanism — "locked in the weapons advantage of one side."
- BB1 p.63: 3 Nov 1994 — UN General Assembly non-binding vote, de facto turn (`embargo_lifted`).
- Phase 3 / Phase 5: **no BB source found** in extracted pages — Historian follow-ups required.

## Phase Timeline (canonical)

| Phase | Event flag | Calendar window | Source tier | Initial cap on RBiH |
|---|---|---|---|---|
| 1 | `arms_embargo_active` | 25 Sept 1991 → mid-1992 | BB1 p.167 (anchored) | tightest |
| 2 | `embargo_croatia_transit` | mid-1992 → ~mid-1993 | BB1 p.167 (qualitative) | small loosening |
| 3 | `embargo_black_flights` | TBD via `/historian` (Washington Agreement window candidate) | **no BB source found** — gated | **NOT LANDED until Historian follow-up** |
| 4 | `embargo_lifted` | 3 Nov 1994 (week ~136, apr_1992 scenario) | BB1 p.63 (anchored) | major loosening |
| 5 | (formal Dayton lift) | TBD via `/historian` | **no BB source found** — gated | narrative beat only unless sourced |

Phase 3 and Phase 5 caps stay at the prior phase's cap value until the Historian follow-up returns a citation. The phase resolver still distinguishes them so events fire correctly.

## Task 1: Phase Resolver In `src/state/embargo.ts`

**Files:**
- Modify: `src/state/embargo.ts` (already exists — adds an `EMBARGO_PHASE_CAPS` constant block and `resolveActiveEmbargoPhase(state)`; existing `EmbargoProfile`, `ensureEmbargoProfiles`, `updateEmbargoProfiles` stay).
- Test: `tests/embargo_phase_resolution.test.ts` (new).

**Steps:**
1. Write failing tests covering: each event flag combination returns the expected phase id; precedence rule when multiple flags are set (latest phase wins by ordinal); pre-1991 returns `phase_0_none`.
2. Add `EMBARGO_PHASE_IDS = ['phase_0_none','phase_1_full','phase_2_croatia','phase_3_black_flights','phase_4_unenforced','phase_5_lifted'] as const`.
3. Add `EMBARGO_PHASE_CAPS: Record<EmbargoPhaseId, Record<FactionId, EmbargoCap>>` with RS/HRHB caps = `1.0` for every phase and RBiH caps phase-1/2/4 sourced from H4 §107 bands. Phase-3 and phase-5 RBiH caps explicitly set equal to the prior phase until Historian returns a citation; tag with comment `// PENDING /historian Lane H4 follow-up`.
4. Add `resolveActiveEmbargoPhase(state: GameState): EmbargoPhaseId` — reads canonical event flags from `state.events.flags` (or current equivalent — confirm in Task 1.1 via Read on `src/state/game_state.ts`), returns the highest-ordinal phase whose flag is set.
5. Re-run focused suite green.

**Acceptance:** Resolver returns a deterministic phase id for every (flag-set × turn) combination tested. Phase-3 and phase-5 caps are byte-identical to phase-2 and phase-4 caps respectively until Historian unblocks them.

## Task 2: Wire Caps Into Existing Chokepoint

**Files:**
- Modify: `src/state/supply_reserves.ts` — replace the hard-coded `0.6` RBiH patron multiplier with `resolveActiveEmbargoPhase(state)` → `EMBARGO_PHASE_CAPS[phase][faction]`.
- Modify: `src/state/supply_reserve_constants.ts` — re-export `EMBARGO_SUPPLY_CAP`, `EMBARGO_HEAVY_CAP` for downstream test imports.
- Test: `tests/supply_reserves_embargo_cap.test.ts` (new).

**Steps:**
1. Inspect `supply_reserves.ts` and locate the literal `0.6` RBiH patron multiplier; record line + commit hash in the test header.
2. Failing test: under `arms_embargo_active` only, RBiH reserve delta is bounded by `EMBARGO_SUPPLY_CAP.phase_1_full.RBiH`; under `embargo_lifted` it relaxes to phase-4 cap; RS reserves never change between any two phases.
3. Replace the literal with `EMBARGO_PHASE_CAPS[resolveActiveEmbargoPhase(state)].RBiH.general`.
4. Re-run `supply_reserves.test.ts`, `supply_reserves_phase_b.test.ts`, and the new file.

**Acceptance:** RS and HRHB reserve trajectories are byte-identical to pre-change. RBiH trajectory moves only where the phase cap differs from the prior `0.6`. No combat consumer downstream is touched.

## Task 3: Combat Consumers Audit (Read-Only First)

**Files:**
- Inspect (no edit unless evidence): `src/sim/combat/supply_condition.ts`, `src/sim/combat/supply_pressure.ts`, `src/sim/combat/exhaustion.ts`.
- Report: append findings table to plan's implemented report.

**Steps:**
1. For each consumer, grep for any factor that already models embargo asymmetry (e.g. a RBiH-keyed multiplier on supply pressure outside the patron-aid chokepoint).
2. If a consumer already applies a RBiH-only effect, record it in a `double-counting risk` table and STOP for user decision before any consumer-side edit.
3. If no double counting exists, the combat-side code stays untouched — the cap propagates through the reserve trajectory only.

**Acceptance:** A table in the implemented report lists every combat-side supply consumer and confirms either `no double count` or `RISK: requires reconciliation` per file. No edits land here without user sign-off.

## Task 4: Event Authoring (Only Missing Rows)

**Files:**
- Inspect: `data/scenarios/events/` for existing rows matching the five phase flags.
- Modify/Create: only events for flags missing from `data/scenarios/events/`. Each created event cites Historian audit row H4 in its `source` field.

**Steps:**
1. Enumerate existing events; record which of `arms_embargo_active`, `embargo_croatia_transit`, `embargo_black_flights`, `embargo_lifted`, `embargo_formal_lift` are already authored.
2. Create only the missing events. `embargo_lifted` event uses fire date **3 Nov 1994 (week ~136)** with `source: BB1 p.63`. `arms_embargo_active` (if missing) uses **25 Sept 1991** with `source: BB1 p.167 + UNSCR 713`.
3. Phase 3 (`embargo_black_flights`) and Phase 5 (`embargo_formal_lift`) events are NOT authored in this plan unless the Historian Task 9/10 follow-ups have already returned. If they have, fire dates and sources come from those returns. If not, leave them unauthored and note in the implemented report.
4. No edits to existing event rows.

**Acceptance:** Every authored event lists `source` and `historian_audit_row: H4`. Phase 3 and Phase 5 events are either authored with citation OR explicitly absent with a flag in the implemented report.

## Task 5: Determinism And Anchor Re-Lock

**Lane label:** `LANE-V09X-EMBARGO`.

**Statement:** This lane MOVES cap values that flow into the existing supply reserve chokepoint. 40w + 188w hashes WILL shift. This is expected and intentional. Re-anchor all anchors and benchmark deltas under `LANE-V09X-EMBARGO` against the most recent calibration baseline (cross-check with napkin §Calibration Baseline before pushing).

**Steps:**
1. Capture pre-change 40w + 188w hash and anchor set from current baseline (n1844 or newest post-1844).
2. Apply Tasks 1–2 only (event authoring last so we isolate cap effect from event-firing effect).
3. Capture post-change 40w + 188w hash, anchor set, benchmark set, battle count.
4. Diff anchors. Sensitive-history anchors (Task 7) get separate treatment.
5. Publish delta table in the implemented report.

**Acceptance:** Determinism is sacred — re-runs produce the same new hash. Diff table is published. No anchor regresses without a typed cause.

## Task 6: Verification Commands

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/embargo_phase_resolution.test.ts tests/supply_reserves_embargo_cap.test.ts tests/supply_reserves.test.ts tests/supply_reserves_phase_b.test.ts`
- `npm.cmd run sim:scenario:run:40w`
- `npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --out runs`

## Task 7: Sensitive-History Gate

**Anchors that must be hand-checked vs n1844 baseline:**
- Srebrenica (`op:srebrenica:srebrenica_2`)
- Žepa (`op:rogatica:zepa_2`)
- Goražde (`op:gorazde:gorazde_2`)
- Bihać (`op:bihac:bihac_2`)
- Sarajevo (`op:sarajevo:*` cluster)

**Rule:** If ANY of these anchor outcomes shifts versus the most-recent n1844-lineage baseline, STOP and request user sign-off before commit. Loosening the embargo cap on RBiH may plausibly let enclaves break out earlier or let Sarajevo's relief outcomes drift. That is exactly the class of outcome the sensitive-history gate exists to halt.

**Acceptance:** Plan executor pastes the anchor diff for all five names into the implemented report. No commit lands while any of the five is in a shifted state without user `OK`.

## Task 8: Stop Gates

- Stop if RS or HRHB reserve trajectory changes by any amount (faction-asymmetric means RBiH only).
- Stop if any sensitive-history anchor (Task 7) shifts without user sign-off.
- Stop if Task 3 audit finds a combat-side consumer that already models embargo asymmetry (double-counting risk).
- Stop if 188w hash fails to re-anchor cleanly twice in a row (nondeterminism leak).
- Stop if phase resolver returns a different phase id for the same input twice (nondeterminism leak).

## Task 9: Historian Follow-Up — Phase 3 (Iranian "Black Flights")

**Owner:** Dispatch `/historian` skill.

**Question:** Calendar date (week-of-year acceptable) for the operational start of the Iranian arms pipeline through Zagreb after the Washington Agreement (1 March 1994), AND a magnitude band for RBiH heavy-weapons availability during this phase. Primary sources required (US Senate Select Committee on Intelligence 1996, ICTY filings, or comparable). General-knowledge claims will not unblock the quantitative cap.

**Output binds to:** `EMBARGO_PHASE_CAPS.phase_3_black_flights.RBiH` and the fire date of the `embargo_black_flights` event.

**Acceptance:** Historian returns a citation-anchored phase-3 cap OR explicitly returns `cannot anchor` — in the latter case Phase 3 remains absent from the engine (not just from caps).

## Task 10: Historian Follow-Up — Phase 5 (UNSCR 1021 formal lift)

**Owner:** Dispatch `/historian` skill.

**Question:** Confirm UNSCR 1021 (22 Nov 1995) phased-lift schedule, full-lift date (~March 1996), and whether any BB1/BB2 page directly cites the resolution number. If BB extracts surface a direct citation, lift the `general knowledge` tag.

**Output binds to:** `embargo_formal_lift` event row and Phase 5 narrative beat. Because Phase 5 falls after Dayton (~14 Dec 1995), it is unlikely to bind any quantitative cap inside the apr_1992 188w scenario window — confirm with Historian whether any in-window effect is warranted.

**Acceptance:** Historian returns either an in-window effect or `no in-window effect` — in the latter case Phase 5 is permanently narrative-only.

## Docs And Ledger

Update under the executing-plans skill — NOT in this plan-writing pass:
- `docs/40_reports/implemented/YYYYMMDD_RBIH_SUPPLY_CONSTRAINT_ARMS_EMBARGO.md` (new implemented report).
- `docs/40_reports/REAL_WAR_MASTER.md` (RBiH supply asymmetry section — append, do not rewrite).
- `docs/PROJECT_LEDGER.md` (behavioral entry under `LANE-V09X-EMBARGO`).
- `docs/plans/MASTER_ROADMAP.md` (only after execution lane reports closure).

Edits to `docs/10_canon/FORAWWV.md` require Pyrrhic-panel sign-off — route any phase cap that touches canon through the appropriate panel.

## Closeout

- Commit Task 1 + Task 2 + Task 4 in a single behavioral commit only after Tasks 5 and 7 produce clean delta tables.
- Tasks 3 (audit), 9, 10 (Historian follow-ups) may close in separate commits — they do not move sim state.
- Stage ONLY files owned by this plan: `src/state/embargo.ts`, `src/state/supply_reserves.ts`, `src/state/supply_reserve_constants.ts`, the four test files, any new event row under `data/scenarios/events/`, the implemented report, ledger entry. NEVER stage logistics-priority files or supply-design dual-source files — those belong to sibling plans.
