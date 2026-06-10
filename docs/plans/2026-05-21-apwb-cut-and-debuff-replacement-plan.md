# APWB Cut + Debuff Replacement — Implementation Plan

**Date:** 2026-05-21
**Author:** orchestrator synthesis after APWB modelling review.
**Status:** DRAFT — read-only plan. No code edits. Awaiting user review.
**Sibling work (do not touch concurrently):** Codex is editing `src/sim/combat/*` strict-null leaves and sector perf. This plan **deletes content** from `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` and `src/sim/combat/operation_opportunities.ts` — coordination required before execution. Defer execution until Codex's current `src/sim/combat/*` lane closes, or carve a synchronous window.

---

## 1. Goal

Remove APWB's mechanical representation from the engine. Replace with a narrative-debuff overlay built on existing consequence-event infrastructure. Preserve all APWB narrative events (declaration, Karadžić pact, consequence chain). Leave a clean future-work hook for an APWB DLC.

The current modelling pays substantial complexity cost (two custom ops, a substrate primitive, ~500 lines of catalog code, dedicated tests) for combat that doesn't actually happen — `targets_friendly_overrides` lets 5th Corps "attack" RBiH-painted OSIDs that have no defenders, no equipment, and no controller-flip outcome. The cut converts this into "5th Corps is hampered 1993-1994" which is the actual mechanical truth that matters for calibration.

---

## 2. Scope

### 2.1 Removed

| Surface | Path | Approximate scope |
|---|---|---|
| Tigar-Sloboda 94 op definition | `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` | def + axes + predicates + comments (~200 lines around line 385-610) |
| APWB Pressure 94 op definition | same file | def + axes + predicates + `APWB_*` constants + comments (~250 lines around line 616-870) |
| `targets_friendly_overrides` substrate field | `src/sim/combat/operation_opportunities.ts` | lines 232-243 (field declaration) + 973-997 (filter override logic at `buildCorpsOperation`) |
| Tigar-Sloboda tests | `tests/operation_opportunities_*tigar*.test.ts` (if it exists) | full file |
| APWB Pressure 94 tests | `tests/operation_opportunities_apwb_pressure_94.test.ts` | full file |
| Catalog-coverage tests asserting these ops exist | `tests/operation_opportunities_catalog.test.ts` | rows referencing the two ops |
| Substrate-primitive tests | wherever `targets_friendly_overrides` is referenced | scope TBD by grep |

**Precondition before execution**: grep `targets_friendly_overrides` repo-wide. The substrate primitive must have **zero consumers** outside the two ops being deleted. If any other op (existing or planned) consumes it, the field cannot be cleanly retired — STOP and re-scope.

### 2.2 Preserved (narrative + Codex value retained)

| Surface | Why kept |
|---|---|
| `abdic_apwb_declared_1993` event (`data/scenarios/events/war_1993.json:2430`) | Codex chain anchor. Sets flag downstream consequences depend on. |
| `abdic_karadzic_pact_1993` event (`war_1993.json:2502`) | ICTY-cited (Karadžić TJ IT-95-5/18-T), Oct 22 1993. Required by consequence event chain. |
| `bihac_crisis_1994` event narrative referring to VRS-RSK-APWB (`war_1994.json:827`) | Pure prose; no APWB unit references. |
| 5th-Corps-falls consequence event (`consequences.json:301`, gated on `abdic_karadzic_pact_1993`) | Narrative consequence. No mechanical APWB dependency. |
| OOB brigades homed at Velika Kladuša / Cazin | Already canonical ARBiH 5th Corps formations (`arbih_506th_mountain`, `arbih_510th_bosnian_liberation`). |
| Operation name string `'Operacija Tigar-Sloboda'` (`operation_names.ts:128`) | **Decision**: remove from the name pool (no op consumes it anymore) — see §4.2. |

### 2.3 Added — two consequence events (Path A: existing faction-scoped effect kinds)

**Schema research outcome** (per `docs/40_reports/audits/20260521_PLAN_OPEN_QUESTIONS_RESEARCH.md` Q2.1): the engine has **no per-corps modifier surface**. All 18 existing effect kinds (`apply_effects.ts:17-36`) are faction-scoped. A per-corps debuff would require schema work (`Path B`, parked as future schema lane). This plan adopts **Path A**: express the APWB burden as a faction-wide RBiH debuff using three existing effect kinds. Slightly imprecise (other ARBiH corps share the penalty) but historically defensible — the 1993-1994 ARBiH operated under degraded national conditions across the board (HVO war, embargo, fuel crisis).

#### `csq_5th_corps_apwb_burden_1993`

```jsonc
{
    "id": "csq_5th_corps_apwb_burden_1993",
    "title": "5th Corps Bears the APWB Burden",
    "narrative": "With Abdić's Autonomous Province declared and the Karadžić pact signed, the 5th Corps is forced to fight a two-front war inside its own pocket. Brigades that should be probing the VRS siege ring are instead screening the Cazin southern flank against APWB armed formations. Ammunition stocks deplete faster, cohesion frays, and offensive options outside the pocket close.",
    "requires_events": ["abdic_karadzic_pact_1993"],
    "turn_min": 78,
    "turn_max": 84,
    "sets_flags": {
        "apwb_burden_active": true
    },
    "effects": [
        { "kind": "aggression_modifier", "faction": "RBiH", "delta": -0.10, "duration_turns": 47 },
        { "kind": "bot_priority_shift", "faction": "RBiH",
          "remove_objectives": ["western_offensive", "central_bosnia_offensive"],
          "duration_turns": 47 },
        { "kind": "recruitment_modifier", "faction": "RBiH", "pool_multiplier": 0.85, "duration_turns": 47 }
    ],
    "historical_source": "BB1 p.225-227; ICTY Karadžić TJ IT-95-5/18-T §§4944-4948 (Abdić-APWB context)."
}
```

**Objective IDs**: confirm the exact strings `"western_offensive"` and `"central_bosnia_offensive"` against the existing bot objective-ID universe in `bot_strategy.ts` / `bot_priority_shift` consumers before authoring. If the canonical IDs differ, substitute the actual IDs that correspond to "5th Corps reaches outside Bihać pocket" and "ARBiH offensives against HVO Central Bosnia."

#### `csq_abdic_defeated_1994`

```jsonc
{
    "id": "csq_abdic_defeated_1994",
    "title": "5th Corps Crushes Abdić's Forces",
    "narrative": "After eight months of internal civil war, the 5th Corps under Dudaković reduces Abdić's APWB armed formations and retakes Velika Kladuša. The two-front burden lifts; ARBiH brigades that had been screening the southern Cazin flank are freed for offensive operations against the VRS siege ring. Operation Grmec becomes feasible.",
    "requires_events": ["csq_5th_corps_apwb_burden_1993"],
    "requires_flags": { "apwb_burden_active": true },
    "turn_min": 123,
    "turn_max": 130,
    "sets_flags": {
        "apwb_burden_active": false,
        "apwb_defeated": true
    },
    "historical_source": "BB1 p.226-227 (5th Corps reconquest of Velika Kladuša, Aug 1994). war_1994.json:720 narrative for Operation Grmec already in canon."
}
```

**Clearing the burden**: with Path A, the three faction-wide modifiers expire on their own `duration_turns: 47` window (w78-w125). The `csq_abdic_defeated_1994` event fires within w123-w130 to set the `apwb_defeated` flag and lift any narrative state; no explicit modifier-clearing mechanism is needed because the natural expiry coincides with the historical defeat. If a player triggers the defeat earlier via some emergent path (none currently exists), the modifiers harmlessly run their natural duration — accepted as a precision-vs-engine-work tradeoff.

**Path B (future schema lane, parked)**: introducing a per-corps modifier surface would let the burden target `arbih_5th_corps` specifically and use `clears_modifiers` for clean early termination. Estimated scope: new `EventEffect` variants + `MilitaryState` fields + `active_modifiers.ts` accessors + per-corps readers in `bot_corps_directives.ts` + tests + canon documentation + baseline re-bless. Park for a future v0.9.x schema lane.

---

## 3. Files to touch (exhaustive)

Subject to the precondition grep above; commit each touched file as its own commit for clean review.

| File | Action |
|---|---|
| `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` | Delete: TIGAR_SLOBODA_94_OPPORTUNITY def + axes + comments; APWB_PRESSURE_94_OPPORTUNITY def + axes + APWB_* constants + comments; any catalog-registration export referencing either. |
| `src/sim/combat/operation_opportunities.ts` | Delete: `targets_friendly_overrides` field (lines 232-243); override logic at buildCorpsOperation (lines 973-997). Restore the pre-override friendly-controller filter. |
| `src/sim/combat/operation_names.ts:128` | Delete the `'Operacija Tigar-Sloboda'` name entry (no consumer). |
| `data/scenarios/events/consequences.json` | Add `csq_5th_corps_apwb_burden_1993` and `csq_abdic_defeated_1994` events. Keep all existing entries. |
| `tests/operation_opportunities_apwb_pressure_94.test.ts` | Delete. |
| `tests/operation_opportunities_*tigar*.test.ts` | Delete if exists. |
| `tests/operation_opportunities_catalog.test.ts` | Remove rows asserting the two deleted ops; add coverage that the new consequence events fire from their trigger events. |
| `tests/consequence_event_effects.test.ts` (or sibling) | Add tests verifying the debuff applies to `arbih_5th_corps` formations only and lifts cleanly. |
| `docs/plans/late-war-5th-corps-opportunities-design.md` | Add a "2026-05-21 withdrawn" section noting APWB ops were cut. |
| `docs/plans/late-war-operation-opportunity-system-design.md` | Edit §10 (the APWB-as-RS-aligned-auxiliary design): mark withdrawn, link to this plan. |
| `docs/40_reports/REAL_WAR_MASTER.md` | Update any Bihać-pocket-civil-war section to point at the debuff-events instead of the deleted ops. |
| `docs/PROJECT_LEDGER.md` | Append entry per ledger protocol. |

**Not touched**: `docs/10_canon/FORAWWV.md` (edits require Pyrrhic-panel sign-off), `src/state/identity.ts` (no faction change), `data/source/oob_brigades.json` (no formation change — APWB never had units), painted control JSONs (Velika Kladuša stays RBiH everywhere).

---

## 4. Specific care items

### 4.1 Substrate primitive retirement

`targets_friendly_overrides` is documented in `operation_opportunities.ts:232-243` as "SCOPE-RESTRICTED: only honored when `tier === 'T1'` AND `family === 'fifth_corps'`." If the precondition grep confirms zero non-APWB consumers, retiring the field is safe. If a future fifth_corps T1 op turns out to genuinely need this mechanism (e.g. a DLC APWB representation), it can be re-introduced — but speculatively keeping the field violates "don't keep abstractions for hypothetical future requirements."

### 4.2 Operation name pool

`'Operacija Tigar-Sloboda'` in `operation_names.ts:128` is removed. Verify no bot name-generator picks from that pool independently of the op def — per memory rule "Bot/AI generators must exclude canonical names by DATA, not by comments," removing the name from the data list is the canonical way.

### 4.3 Consequence-event coverage

The 5th-Corps-falls consequence event at `consequences.json:307` declares `requires_events: ["abdic_karadzic_pact_1993"]`. That dependency chain is preserved — no change. The new burden/defeat consequence events extend the same chain.

### 4.4 Calibration impact

The two deleted ops did very little: they "fired" but produced no combat damage (no defenders), no controller flips (targets stayed RBiH), no casualty deltas (shadow targets), no displacement (no civilian model). Removing them therefore has near-zero impact on the 188w baseline scenario hash. The new debuff events, however, **will** change behavior — 5th Corps will be measurably less effective for ~48 turns, reducing its ability to launch Grmec / Sana 94 / Grmec 94 ops during the burden window. **Baseline regression will need a re-bless.** Anchor sets may shift slightly (Bihać pocket area trending slightly more contested w78-w125). The Tier 1 anchor plan's Apr 1994 / Apr 1995 stable OSIDs at Bihać (`bihac_2`, `cazin_2`) should still hold — they're enclave-cores, not contested fronts.

---

## 5. Verification

- `npm.cmd run typecheck` clean.
- `npm.cmd run test:vitest` clean (deleted-test references resolved, new consequence-event test passes).
- Fresh 40w run: hash diff expected (debuff is active w78-w125, inside the 40w window only at the tail). Re-bless baseline if drift is consistent with expected debuff effects.
- Fresh 188w run: hash diff expected. Confirm 27/27 anchors still hold; confirm 6/6 benchmarks still pass; confirm `5th_corps_apwb_burden` flag transitions in turn summary as designed.
- Run painted-vs-sim against current tip post-cut: confirm Apr 1994 / Apr 1995 / Oct 1995 deltas don't worsen (and ideally Apr 1994 RS-undershoot improves slightly because 5th Corps isn't expending force on shadow ops).

---

## 6. Stop gates

- **STOP if** `targets_friendly_overrides` has any consumer outside the two APWB ops. Re-scope the substrate retirement before touching the catalog file.
- **STOP if** the bot objective-ID universe doesn't include identifiers usable for `bot_priority_shift.remove_objectives` corresponding to "5th Corps offensives outside Bihać pocket" and "ARBiH offensives in HVO Central Bosnia." If the canonical IDs differ from `"western_offensive"`/`"central_bosnia_offensive"`, substitute; if no usable ID exists, this part of the debuff is incomplete — degrade gracefully (keep aggression + recruitment modifiers, drop the bot_priority_shift block).
- **STOP if** Codex is mid-edit in `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` or `operation_opportunities.ts`. Sequence after Codex's combat lane closes.
- **STOP if** baseline regression post-debuff shows >5% area-weighted change at the 40w anchor benchmark. Investigate the debuff magnitude before re-blessing.

(The previous schema-check stop-gate — for `cohesion_regen_multiplier` / `readiness_ceiling` / `supply_pressure_step` / `block_offensive_ops_outside_region` / `clears_modifiers` — is **withdrawn** under the Path A refactor in §2.3. Those fields are no longer needed; the debuff uses existing faction-scoped effect kinds.)

---

## 7. DLC future-work hook (parking lot)

Cutting APWB now leaves a clean re-entry surface for a future "APWB DLC" or expanded modelling:

- Canonical event chain is preserved (`abdic_apwb_declared_1993` → `abdic_karadzic_pact_1993` → consequence events).
- OSID slugs already exist for Velika Kladuša cluster (`op:velika_kladusa:velika_kladusa_2`, `op:velika_kladusa:poljana_2`, etc. — confirmed in painted maps).
- Engine has the substrate concept for "faction-overlay auxiliaries" (`targets_friendly_overrides`) documented in code comments even after deletion — a future re-introduction can cite this plan.

**DLC scope sketch (NOT in this plan)**:
1. Introduce APWB as a fourth faction (or as an RS-attached auxiliary corps with separate brigade pool, equipment trickle from VRS, separate cohesion/morale).
2. Implement Velika Kladuša controller transitions: ARBiH → APWB at w77 (declaration), APWB → ARBiH at w125 (Aug 1994 defeat), ARBiH → APWB at w172 (post-Storm brief return), APWB → ARBiH at w176 (final 5th Corps march-in post-Oluja).
3. Add ~10k APWB armed-formation manpower with proper combat resolution.
4. Civilian displacement events for Aug 1994 (~25k to Croatia) and Aug 1995 (~25k more).
5. Final-defeat consequence: `csq_apwb_civilian_collapse_1995` etc.

DLC scope is a future v1.x or v2 feature, not v1.0.

---

## 8. Open questions — RESOLVED

All four §8 open questions have been resolved per `docs/40_reports/audits/20260521_PLAN_OPEN_QUESTIONS_RESEARCH.md`:

1. **Schema check** → **Path A adopted**: no per-corps surface exists; debuff refactored to use existing faction-scoped `aggression_modifier` + `bot_priority_shift` + `recruitment_modifier`. Per-corps surface parked as Path B future schema lane.
2. **Hard vs probabilistic block** → **Hard-block** via `bot_priority_shift.remove_objectives`. Historical truth was binary (no spare bandwidth), not gradient.
3. **Debuff turn windows** → **w78-w125 confirmed** (47 turns ≈ Oct 1993 → Aug 1994, matching historical APWB burden period).
4. **`apwb_defeated` flag durability** → **Persistent** within v1.0 scope. Brief Aug 1995 APWB return is below cut resolution; future DLC can introduce a separate `apwb_return_active` flag without contradiction.

---

## 9. Out of scope (explicit)

- APWB as a fourth faction (DLC).
- APWB armed-formation brigades in OOB.
- Aug 1995 post-Storm Velika Kladuša re-flip mechanics.
- APWB civilian displacement events.
- Updates to painted control JSONs (Velika Kladuša stays RBiH at all four epochs — that's now correct under the debuff model).
- Repainting any of the four anomaly cells (Goražde city-core, Žepa-at-oct95, Kupres flip path) — handled separately under the Tier 1 anchor plan §3.

---

## 10. Sequencing recommendation

1. **Wait** for Codex's current `src/sim/combat/*` lane to close (or carve a sync window with Codex owner).
2. **Schema check** (open question §8.1) — investigate effect-schema before code work begins.
3. **If schema gaps exist**: file separate schema-addition plan first. Don't conflate cut + schema work.
4. **Cut execution** as a single PR (or branch), per-file commits for clean review:
   1. Tests deletion (proves nothing else depends on the ops).
   2. Op def deletion in `operation_opportunity_catalog_5th_corps.ts`.
   3. Substrate primitive retirement in `operation_opportunities.ts`.
   4. Op name pool entry deletion in `operation_names.ts`.
   5. Consequence events JSON addition in `consequences.json`.
   6. New consequence-event tests.
   7. Doc propagation (design docs, REAL_WAR_MASTER, ledger).
5. **Baseline re-bless** with the user's explicit approval — the debuff is intentional behavior change.
6. **Painted-vs-sim re-run** against the post-cut tip to confirm calibration impact matches expectation.

---

## 11. Source references

- `docs/40_reports/audits/20260521_HISTORIAN_PAINTED_TARGET_ANCHOR_PROPOSALS.md` §0.5 (Velika Kladuša APWB anomaly).
- `docs/40_reports/audits/20260521_WAR_OR_GAME_ANCHOR_REVIEW_CRITERIA.md` §Apr 1995 (Abdić/APZB civil war absent as engine mechanic).
- `docs/40_reports/audits/20260521_CANON_COMPLIANCE_ANCHOR_FRAME.md` §3.1 (existing `abdic_apwb_declared_1993` / `abdic_karadzic_pact_1993` events).
- `docs/plans/2026-05-21-tier1-painted-target-anchors-plan.md` §3 row 3 (anomaly entry to be struck after this cut lands).
- `docs/plans/late-war-operation-opportunity-system-design.md` §10 (canonical design to mark withdrawn).
- `src/sim/combat/operation_opportunities.ts:232-243` (substrate primitive declaration).
- `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:385-870` (the two op defs being deleted).
- `data/scenarios/events/war_1993.json:2430,2502` (preserved narrative events).
- `data/scenarios/events/consequences.json:301-307` (existing 5th-Corps-falls consequence chain).
