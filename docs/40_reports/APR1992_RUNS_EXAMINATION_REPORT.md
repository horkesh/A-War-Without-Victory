# April 1992 Runs Examination Report

**Date:** 2026-02-10  
**Runs examined:** `apr1992_4w_bots__4ed47d787b783178__w4`, `apr1992_50w_bots__6e81bac9f1991f42__w50`, `apr1992_bna_bots_40w__9f0b340ce31848d6__w40`  
**Role:** Scenario-creator-runner-tester (conceptual findings and proposals; no code changes).

---

## 1. Were brigades actually assigned AoRs?

**Yes.** In the 50-week run final save:

- **`state.brigade_aor`** is populated for all 5,822 settlements.
- **2,617** settlements are assigned to a brigade (front-active + 1-hop depth).
- **3,205** settlements have `null` (rear; no brigade assignment).

**Mechanics:**

- At Phase I → Phase II transition, `applyPhaseIToPhaseIITransition()` calls `initializeBrigadeAoR(state, edges)` (in `phase_i_to_phase_ii.ts`). The scenario runner supplies `settlementGraph.edges` to the turn pipeline, so edges are available when the transition runs.
- `initializeBrigadeAoR` uses Voronoi BFS from each brigade’s `hq_sid` over faction-controlled territory and assigns each front-active (and 1-hop depth) settlement to exactly one brigade. Rear settlements get `null`.
- Each turn, `validate-brigade-aor` runs and can reassign settlements (e.g. when a brigade is dissolved or control changes).

So **brigade AoR assignment is in use** and is populated at Phase II entry and maintained by the pipeline.

---

## 2. Control changes by municipality vs by settlement

**Current behavior:**

- **Init:** `init_control: "apr1992"` loads **municipality-level** control (`municipalities_1990_initial_political_controllers_apr1992.json`). Every settlement gets the controller of its `mun1990_id`. So at start, control is **by municipality** (all settlements in a mun share the same controller).
- **Flip decision (Phase I):** The flip **decision** is **municipality-level** (Phase I Spec §4.3): we evaluate each municipality; attacker strength vs defender (militia + formation, stability, etc.) decides whether the **whole municipality** flips to the attacker. One decision per mun.
- **Flip application:** After a mun is chosen to flip, **settlement-level** resolution runs:
  - `applyFlip` → `applyWaveFlip`: settlements with favorable demographics for the attacker flip immediately; hostile-majority settlements can become **holdouts**.
  - Holdout cleanup (later turns) can clear holdouts (formation presence, isolation surrender).
- **State:** `political_controllers` is **keyed by settlement**; so stored control is settlement-level. After a flip, a municipality can therefore have mixed control (e.g. some settlements flipped, some holdouts still showing old controller until cleared).
- **Reporting:** `control_delta.json` and `control_events.jsonl` list **per-settlement** flips (each event has `settlement_id` and `municipality_id`). So the *record* of what changed is settlement-level, but the *driver* of that change is one mun-level decision per flip.

**Conclusion:** Control **changes** are driven by **municipality-level** decisions (whole mun eligible to flip, then wave/holdouts apply per settlement). So “control changes by municipality” is accurate for the **decision**; “by settlement” is accurate for **storage** and **reporting** of the resulting state. If the desired design is that **only some settlements** in a mun can flip (e.g. only those on a contested edge), that would require a different flip model (settlement-level eligibility and flip decision), which would be a canon/design change.

---

## 3. Brigades occupying territories of opposing factions

**Finding:** In the 50-week run final save, **230 formations** have their **HQ settlement (`hq_sid`) controlled by an opposing faction** in `political_controllers`.

Examples (first 15):

| Formation ID   | Faction | HQ (hq_sid) | Controller at HQ |
|----------------|---------|-------------|------------------|
| F_HRHB_0001    | HRHB    | S170356     | RS               |
| F_HRHB_0002    | HRHB    | S200026     | RS               |
| F_HRHB_0003    | HRHB    | S207446     | RS               |
| F_HRHB_0009    | HRHB    | S116963     | RBiH             |
| …              | …       | …           | …                |

**Cause:**

- Formations are created at scenario init or spawn with a fixed `hq_sid` (e.g. from OOB or municipality HQ map).
- When a municipality (and thus its settlements) later flips to another faction, `political_controllers[hq_sid]` changes, but **formation state is not updated**: `hq_sid` (and any `mun:X` tag) is unchanged.
- So we end up with formations whose “home” settlement is now enemy-controlled. In **Voronoi AoR init**, such brigades are **skipped** as seeds: `if (!seed || pc[seed] !== faction) continue;` in `assignByVoronoiBFS`. So they receive **no AoR** and do not claim any front-active settlements. They remain in the order of battle with the old HQ.

**Why this is a game/historical improbability:**

- A brigade whose HQ is in enemy-held territory would historically have withdrawn, been overrun, or relocated. Showing it still “at” that HQ on a map implies it is sitting in hostile territory without relocation or disbandment.

**Conceptual proposals (no code):**

1. **Relocate HQ when home is lost:** When control flips and `political_controllers[formation.hq_sid] !== formation.faction`, either:
   - Set `hq_sid` to a settlement in the same (or nearest) friendly-controlled municipality, or
   - Derive a “display position” from the brigade’s current AoR (e.g. centroid of assigned settlements) so the map does not show the formation in enemy territory.
2. **Displaced / withdrawn state:** Introduce a formation state (e.g. “displaced” or “withdrawn”) when HQ is in enemy control; such formations might not participate in AoR until they “relocate” (e.g. player or bot assigns new HQ).
3. **Map display only:** At minimum, the tactical map (and any UI that places formations by `hq_sid`) could avoid drawing a formation in enemy territory (e.g. show “HQ in enemy territory” or use a fallback position).

Hand-off for implementation: **gameplay-programmer** / **formation-expert** (formation state and HQ semantics); **ui-ux-developer** (map display).

---

## 4. Other historical and game improbabilities

- **230 “ghost” HQs:** As above; formations with HQ in enemy territory and no AoR look like brigades occupying opposing territory. Conceptually: relocate or mark displaced when HQ is lost.
- **Municipality-level flip decision:** Canon (Phase I §4.3) specifies municipality-level flips. If design goal is more granular front lines (e.g. settlement-by-settlement flips along edges only), that would require a canon/design change and a different flip model. **Game-designer** / **canon** for scope.
- **Init control is mun-level:** April 1992 and other well-known keys use mun1990-only control; every settlement in a mun gets the same controller. For scenarios that need settlement-level initial control (e.g. Sarajevo siege, Srebrenica enclave), the spec already allows `init_control` as a **path** to a file with a `settlements` array (e.g. Sept 1992). So no change needed for current apr1992 runs; only for future settlement-level init scenarios.
- **Supply pressure / exhaustion at 100:** End report shows all three factions at 100 supply pressure and high exhaustion by week 50. That may be intended for a long run without supply sources; if historically implausible for the period, consider supply/relief levers (production facilities, corridors) or scenario length. **Game-designer** for balance.

---

## 5. Summary table

| Issue | Finding | Proposal (conceptual) |
|-------|---------|------------------------|
| AoR assignment | Yes; 2,617 assigned, 3,205 rear in 50w final save | None; working as designed. |
| Control by mun vs settlement | Decision and init are mun-level; state and reporting are settlement-level. | If settlement-level flip *decisions* are desired, treat as canon/design change. |
| Brigades in opposing territory | 230 formations have `hq_sid` in enemy-controlled settlement. | Relocate HQ or mark displaced when HQ is lost; or at least don’t draw at enemy HQ. |
| Init control | apr1992 is mun-level (all sids in mun same controller). | Use settlement-level init file when needed (e.g. Sept 1992). |

---

**Artifacts:** This report; run dirs above; `src/sim/phase_i/control_flip.ts`, `src/sim/phase_ii/brigade_aor.ts`, `src/state/political_control_init.ts`, `src/scenario/scenario_end_report.ts`.
