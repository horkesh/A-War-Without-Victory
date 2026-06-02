# ADR-0007: Standing OG Defensive Model — shared-attrition combat, reserve commitment, persistent membership

## Status
**Proposed (DRAFT) — revised post-panel 2026-06-02.** For owner acceptance. Not yet accepted.
**Supersedes** the earlier ADR-0007 draft ("Persistent standing-OG membership"), absorbed here as Pillar A.
**Pyrrhic panel (5 specialists: Historian / Game-Designer / Tech-Architect / Ops-Expert / Corps-Commander)** returned a unanimous *Endorse-with-changes*; this revision folds their findings — re-sequenced phases, Pillar 2 reframed from "abolish the rear pool" to "commit the reserve," and six guardrails added. Panel findings are cited inline.

## Context

ADR-0005 (Tactical Groups) built the **offensive** half of the corps formation model (ephemeral task-organized TGs). ADR-0006 (Sectors as Standing OGs) established the **defensive** entity — `CorpsFrontSector` *is* the standing OG that owns an AOR — but only as a geometric partition, with **no defensive doctrine**. This ADR supplies the doctrine, as the defensive twin of ADR-0005.

### Worked example (40w apr1992, run `_prebake_40w_run1`)
- 3rd Corps: the **7th Viteška Muslim** held one front-edge OSID (`op:kakanj:brnjic_2`) for **38 weeks**, fatigue pegged at the cap (30), ground to **morale 0 / cohesion 0** (bled and refilled 456↔1,232), while sectormate **329th Mountain (1,800 men) in the same OG's rear fought 0 of 40 weeks.** Same pattern on the 303rd / 330th.
- Universal: RBiH rear-pool brigades fought **0/8**, HRHB **1/13**. RS masks it by being the attacker.
- **Undetected for 2,000+ runs** because calibration measures *territory* (the line holds), not brigade health; the one guard (`integration_formation_integrity`, ≤2 dissolutions) was tuned to *tolerate* the chronic collapse.

### Root causes (code-verified by the panel)
1. **Win shared, cost not.** The reactive-defense model (`attack_resolution_osid.ts:626-691`) mobilizes reserve *power* and **already distributes casualties** across the roster by `sectorBrigadeWeights` (`attack_casualty_distribution.ts`). But **defender fatigue is applied to the single primary `defenderFormation` only** (`attack_resource_aftermath.ts:101`). Reserves lend strength for free; the lone holder accrues all the exhaustion that drives the morale/cohesion spiral. (Same family as the force-trajectory-wiring plan's "`casualty_ledger` has 9 writers, 0 combat readers".)
2. **Reserves invisible to the model.** The reactive roster is built from `sector.assigned_brigade_ids` only (line 637); `reserve_brigade_ids` / `rear_brigade_ids` never enter — zero power, zero casualties, zero fatigue. The 1,800-man 329th is invisible.
3. **Distribution under-uses the OG, but depth itself is correct.** `classifyBrigadesByTerritory` sorts brigades into front / reserve / rear; `brigade_front_distribution` actively *un-stacks*. The bug is that the rear pool is combat-**invisible** and that a single brigade holds a hot OSID alone — **not** that depth exists. (Historian: real OGs kept a second echelon; see Constraints.)
4. **No durable identity.** Sectors + membership are re-derived every turn; `sector_id` is positional (`sector:corps:N`) and renumbered on every split/merge — nothing references "the same OG" across turns (the reconciliation churn).

## Constraints (inherited — do not re-litigate)
- **Sector stays the defensive entity** (ADR-0006, 3-1 verdict). Doctrine + wiring, not an entity change.
- **TGs stay ephemeral** (ADR-0005); no OG/TG-only coverage gap.
- **No rotation off the line** (owner; historical): share the line and attrition *in place*; do not refit units in the rear.
- **Keep depletable depth** (Historian, BB-cited). Real BiH OGs held a second echelon even when manpower-starved — the VRS "Vlasić" OG deployed the 1st Knežević LIB *behind* the 22nd Brigade as reserve; "reserves all but exhausted" is *how lines broke* (BB2 p.510-512; Una-92, Vozuća likewise). The reserve is **committed forward under pressure and is depletable** — its exhaustion, not its absence, breaks the line. Do **not** abolish the rear pool.
- **Respect encirclement isolation** (Ops/Corps panel). Attrition-share rides the existing `sectorBrigadeWeights` (weight>0 only); BFS-through-friendly-territory already zeroes unreachable reserves, so in a severed pocket (Srebrenica/Žepa/Goražde) the holder *correctly* stands alone. Never smear fatigue onto units that can't reach the fight.
- **Negative-sum soul-lock is sacred** (Game Designer). Sharing attrition must not make the war *cheaper* in aggregate — see the war-cost gate.
- **Determinism is sacred**; **flag-gated, default-off, flag-off byte-identical to `main`** (ADR-0005 discipline). Re-floor is a deliberate decision at the Phase-D flip, not an accident.

## Decision — the Standing OG Defensive Model

A standing OG defends as a **formation**: a durable roster, a thin **depletable** second echelon that commits forward to the threatened point, and combat that shares the **cost** (fatigue + casualties) across every brigade that actually contributes — bounded so the line can still break when the reserve is spent.

**Pillar C — Shared-attrition combat (the core fix).** The contested OSID's defence draws on the OG's **whole reachable roster** (front + reserve + rear, weight>0), and **fatigue is distributed across the contributing defenders by their contribution weight** — not dumped on the lone primary. Add **unit-quality resilience**: quality-weighted cohesion/fatigue floors so elite formations (the 7th Viteška) resist collapse and are preferentially committed to hot points (Historian).

**Pillar B — Reserve commitment (not abolition).** The OG keeps a thin second echelon. When a front-edge OSID's threat crosses a threshold, the OG **commits a reserve brigade forward** to that segment (depth feeds the hot point); the reserve is consumed/depleted, so a line can still break once depth is gone. Restrict the anti-idle correction to **contested** sectors (quiet-front idleness is correct — Game Designer). Reserve commitment **yields to active-op assignment** (a TG/offensive donor is not also pinned to a defensive segment — Ops).

**Pillar A — Persistent membership & stable identity (last, optional).** Durable OG id (minted once; deterministic split/merge lineage) + persisted membership, so "who holds which segment" is durable and the reconciliation churn ends. Required only for the health invariant and to kill the rehome thrash — **not** for the correctness of C or B.

## Phasing (re-sequenced per panel; each flag-gated, default-off, flag-off byte-identical)

- **Phase C (FIRST — the MVS): `ENABLE_SHARED_SECTOR_DEFENSE`.** Three surgical changes, ~3 functions in 2 files, reusing the existing weight/casualty machinery, no new serialized state, no migration:
  1. `attack_resolution_osid.ts:637` — widen the reactive roster from `assigned_brigade_ids` to `[...assigned, ...reserve_brigade_ids, ...rear_brigade_ids]` (dedup, `strictCompare`-sorted). The distance-weight machinery (660-672) handles non-co-located brigades for free.
  2. `attack_resource_aftermath.ts:101` (`applyCombatFatigue`) — take `sectorDefenseBrigades` + `sectorBrigadeWeights` (the caller already holds both, ~1344-1345) and apply `FATIGUE_DEFENDER` **scaled by normalized contribution weight** across all contributors, instead of `+1` to the primary only.
  3. Re-derive the reactive cap (`REACTIVE_DEFENSE_RATIO`, line 680-683) and `minFloor` (685) off **contributing power**, not raw roster count — widening the roster lowers `avgBrigadePower = totalPower/length` (644) and would otherwise *weaken* the cap (Corps-Commander caveat; this is the real re-floor driver).
  - Ship the **health-invariant test with this phase**: "no brigade holds a contested front-edge OSID alone for >N turns while full-strength same-OG brigades exist." Directly satisfies the 329th / 7th-Viteška acceptance criterion.
- **Phase B (second): `ENABLE_STANDING_OG_RESERVE_COMMIT`.** Reserve-commitment in `brigade_front_distribution` / `classifyBrigadesByTerritory`: gate the un-stacking on a **contested-sector** test (sector enemy-personnel > 0) and route reserve brigades to the **highest-threat** front-edge sub-segment (the per-OSID signal exists — `countActiveEnemyPersonnelByOsid` / `sub_segment.enemy_osids`). Keep `rear_brigade_ids`; the reserve is depletable; yields to active ops.
- **Phase A (last, optional): `ENABLE_STANDING_OG_PERSISTENCE`.** Durable id + membership. Write durable fields **flag-on only** (the `display_name` omit-empty pattern) so flag-off stays byte-identical; requires an explicit **save-migration + strict-null-ratchet + hash-input** line item before greenlight. Pursue only if B/C show re-derivation churn is the actual blocker.
- **Phase D: default flip + deliberate re-floor.**

## Guardrails (panel-mandated)
1. **War-cost conservation gate (Game Designer).** At Phase D, flag-on 40w/52w **total casualties + peak/mean faction exhaustion must be ≥ flag-off**, within a stated tolerance, as a named proof metric beside `formation_integrity`. If sharing attrition lowers aggregate cost (healthy co-defenders soak hits at a better exchange rate), re-tune before flip — the soul-lock must not erode silently into the baseline.
2. **Cap the uncapped enclave/garrison path (Ops, code-verified).** `attack_resolution_osid.ts:692-708` sums raw `totalPower` with **no `STACKING_DEFENDER_SUPPORT (0.3)` attenuation and no cap.** Apply the 0.3 stacking attenuation + a hard per-OSID defender-power ceiling (≤ attackers × avgPower × fixed ratio) to that path **before Phase B**, or massing makes contested OSIDs ahistorically impregnable (the inverse bug; calibration won't catch it).
3. **Encirclement-safe attrition.** Distribute fatigue/casualties strictly off `sectorBrigadeWeights` (weight>0); never flat OG membership.
4. **Unit-quality resilience.** Quality-weighted floors in Pillar C (elites resist collapse; preferentially committed).
5. **Active-op precedence.** A brigade committed to a TG/offensive is removed from the defensive-segment roster that turn (no starving RS offensives / Posavina-Drina anchors).
6. **Legibility.** Surface an "OG under sustained pressure" indicator so spreading the grind across six brigades doesn't *hide* it.

## Determinism, calibration & verification
- Phases A-C are **byte-identical to `main` flag-off** (ADR-0005 contract); baseline-of-record untouched until Phase D.
- Flag-on per phase → measured 40w/52w/188w + calibration panel + full test triad; deliberate re-floor at D gated by Guardrail 1 + the health invariant trending toward 0 collapsed brigades.
- Pillar A persisted state must be a pure deterministic function of prior state + control deltas (sorted, no object identity, no RNG); flag-gated writes only.

## Worked-example acceptance criteria
With the model on (40w): the 7th Viteška no longer holds `brnjic_2` alone for 38 weeks — its OG's reserve commits forward and shares the fatigue/casualties (weight>0); no brigade grinds to 0/0 while full-strength reachable sectormates idle; depth is depletable (a line *can* still break once the reserve is spent); territory anchors/benchmarks hold within the re-floored baseline; **aggregate casualties + exhaustion ≥ the flag-off run** (Guardrail 1).

## Roadmap slot & command-board lane
- **Roadmap:** v0.10 combat-soundness band, alongside ADR-0005 v3.0 (Army HQ ops) and the force-trajectory wiring plan (`docs/plans/2026-05-22-force-trajectory-wiring-plan.md`) — Pillar C is the same "wire the combat cost to all participants" family as that plan's `casualty_ledger` reader gap.
- **Command-board lane (proposed; Codex owns the board):**

| Priority | Lane | Status | Owner Lane | Next Action | Verification / Proof | Stop Gate |
|---|---|---|---|---|---|---|
| P1 | Standing OG Defensive Model (ADR-0007) | OPEN | TBD | Owner accept ADR → Phase C MVS (`ENABLE_SHARED_SECTOR_DEFENSE`, 3 fns) | flag-off byte-identical 40w/52w/188w; health-invariant test; flag-on war-cost ≥ flag-off + `formation_integrity` → 0 + re-floor at D | No default-flip / re-floor without owner sign-off; Guardrail-1 war-cost gate must pass |

## Governance
Pyrrhic panel complete (Endorse-with-changes, folded above). Next: owner acceptance, then Phase C. This ADR does not auto-edit canon; on acceptance Rulebook §5.7 / Systems Manual §6.3 gain a clarifying paragraph (manual edit) on the standing-OG defensive doctrine (depletable second echelon; shared attrition).

## References
- ADR-0005 (ephemeral offensive TGs; flag-gated discipline); ADR-0006 (sectors = standing OGs; 3-1 verdict; v0.10 deferral clause this ADR redeems).
- Force-trajectory wiring plan `docs/plans/2026-05-22-force-trajectory-wiring-plan.md`.
- Pyrrhic panel 2026-06-02 (Historian BB-cites Vlasić OG depth BB2 p.510-512; Tech-Architect/Corps-Commander phasing reorder + 3-function MVS; Game-Designer war-cost gate; Ops uncapped-enclave path + encirclement-safe attrition).
- Engine: `attack_resolution_osid.ts` (reactive defense 626-691; roster 637; uncapped enclave path 692-708; cap 680-685), `attack_resource_aftermath.ts:101` (fatigue → primary only), `attack_casualty_distribution.ts` (casualty weights — already roster-wide), `combat_math.ts` (REACTIVE_* + `STACKING_DEFENDER_SUPPORT`), `brigade_front_distribution.ts` / `brigade_assignment.ts` (front/reserve/rear + anti-stacking), `corps_front_sectors.ts` (re-derived partition; positional `sector_id`).
- Worked example: run `runs/_prebake_40w_run1`.
