# ADR-0007: Persistent Standing-OG (Sector) Membership — Decision Brief

## Status
**Proposed (DRAFT)** — 2026-06-02. Awaiting owner decision + Pyrrhic panel. Not accepted.

## Context

ADR-0006 settled the **entity** question: the engine's `CorpsFrontSector` *is* the standing
Operational Group; TGs (ADR-0005) stay ephemeral; sectors are kept. It explicitly **deferred**
a deeper question to "a v0.10 milestone ADR if-and-when calibration data demonstrates the model
causes operational harm."

That data has now arrived. While fixing a mis-placed brigade (the 712th Mountain, homed on a
phantom OSID and teleported into the Bratunac enclave), we found a structural problem in how the
standing-OG layer is maintained:

**Sectors and brigade→sector membership are re-derived from scratch every reconcile pass.**
`buildCorpsFrontSectors` rebuilds the Voronoi-BFS front partition, and `classifyBrigadesByTerritory`
re-assigns every brigade from its `location_osid`. Nothing is durable:

- Brigades whose location is a deep-rear / orphan OSID (not claimed by any sector's territory) are
  left unassigned, then patched by `rehomeUnassignedBrigadesToPhysicalSectorOwners`
  (`allowDeepRearOwnership: turn===0`). That patch adds the brigade to a sector's `rear_brigade_ids`
  and its `location_osid` to that sector's `territory_osids` — but the **next** rebuild recomputes
  territory from control and **drops** it, so the brigade is orphaned again and re-homed again.
- Observed: building the apr_1992 startup snapshot re-homes the same 2 brigades (`hrhb_herceg_stjepan`,
  `rs_17th_klju`) ~6-7× across the build, sometimes flipping the chosen sector
  (`17th_klju`: `:5` ↔ `:2`). The final state is deterministic (drift check passes), so it is
  redundant work + log churn, not a wrong result — but it is brittle and visible.
- **Sector identity is positional and unstable.** `sector_id` is `sector:<corps>:<N>`, renumbered
  on every rebuild (`sector_splitting.ts`, `sector_rearrangement.ts`). Nothing — not a save, not a
  formation, not an operation's anchor — can durably reference "the same sector" across turns.

The churn cannot be cleanly removed at the tactical layer:
- Suppressing the log hides the symptom, not the redundant work.
- A cross-pass cache to skip the re-homing injects object-identity state into the deterministic sim
  (determinism is sacred) and changes which sector finally owns the brigade (calibration shift).
- Natively claiming orphan OSIDs inside the partition is a change to the core Voronoi-BFS front
  geometry (ADR-0006: ~13 load-bearing files, calibration cliff).

The root cause is the **re-derive-every-turn** model, not any one patch. This brief proposes making
the standing-OG layer **persistent**.

## Constraints (inherited, non-negotiable)

From ADR-0005 / ADR-0006 and the historical record — do **not** re-litigate:
1. **Sector stays the entity.** It already carries everything a standing OG carries; ADR-0006's
   3-1 verdict against replacing it stands. This is a *persistence* change, not an entity change.
2. **TGs stay ephemeral.** Task-organized per offensive, then dissolved (ADR-0005, BB sources).
   "TGs as permanent sectors" is rejected: it inverts the history and re-creates the Ops Expert's
   ~85%-ownerless coverage gap (TGs cover ~20-50 OSIDs; the friendly front is ~250-300).
3. **Determinism is sacred.** Any persistent membership must be a pure, deterministic function of
   prior persisted state + this turn's events; sorted iteration; no object-identity state, no RNG.
4. **No coverage gap.** Every friendly OSID touching the enemy must remain owned by exactly one
   standing OG, as today.
5. **Calibration governance.** This *will* move 40w/52w baselines; it is a measured, signed-off
   re-floor, phased, not a big-bang.

## Problem statement

Should the standing-OG (sector) layer become **persistent durable state with stable identity and
incremental update**, replacing the current rebuild-from-territory-truth-every-turn model — so that
brigade→OG membership survives across turns and the reconciliation churn becomes structurally
impossible rather than perpetually patched?

## Sketch of the persistent model (for the panel to refine, not a committed design)

- **Stable OG identity.** Give each standing OG a durable id assigned at creation and carried in
  saves, decoupled from positional renumbering (e.g. `og:<corps>:<monotonic>` minted once). Operations'
  `sector_id` anchor and player sector selections reference the stable id.
- **Persistent membership.** A brigade's OG membership is durable state (set on assignment, mutated
  only by explicit events: spawn, order, retreat, OG split/merge), not re-derived from `location_osid`
  every turn. `location_osid` still drives combat geometry; membership is an organizational fact.
- **Incremental front update.** Each turn, update the OG front geometry from control *deltas*
  (flips since last turn) rather than a from-scratch Voronoi-BFS partition. Deep-rear / orphan
  brigades keep their OG membership (no re-orphaning) and are placed in rear by the durable membership,
  not patched by a turn-0 band-aid.
- **OG lifecycle events.** Split when a front fragments into disconnected components; merge when they
  reconnect; transfer on corps reassignment. These are the only operations that change membership.

## Options

- **A. Full persistent membership + stable identity + incremental partition.** The real fix.
  Removes the churn structurally; enables durable player↔OG references, AAR continuity, and the
  ADR-0006 `display_name` to finally stick to a stable entity. Largest scope (ADR-0006 tech-architect
  estimate: this is the v0.10 refactor; expect a calibration re-floor and multi-week work).
- **B. Persistent membership only (keep from-scratch geometry).** Brigades keep durable OG ids;
  front geometry still rebuilt each turn but re-attaches brigades by stored membership instead of
  re-deriving + patching. Smaller; kills the rehome churn; partial (geometry still recomputed).
- **C. Status quo + tactical patches.** Keep re-deriving; patch each churn case (orphan claim, log
  dedup) as it appears. Lowest cost, perpetual whack-a-mole, brittleness remains.

## Recommendation (author)

Pursue **Option B first** as a contained, validatable step (durable membership re-attached pre-partition
→ rehome becomes a genuine no-op → churn gone), then evaluate **A** (stable identity + incremental
geometry) on the evidence. Decide via a four-specialist Pyrrhic panel (Historian / Tech Architect /
Ops Expert / Game Designer), mirroring how ADR-0005/0006 were decided, with this churn as Exhibit A.

## Interim (until a decision lands)

The visible churn is turn-0 reconciliation logging. Acceptable stopgaps, explicitly temporary:
- Quiet the turn-0 deep-rear rehome diagnostics on the snapshot-bake + desktop runtime paths
  (byte-identical; the desktop new-game already loads the baked snapshot and does not reconcile).
- Do **not** add a cross-pass cache (determinism risk) or change the core partition (calibration cliff)
  as an interim — those pre-empt this decision.

## Determinism & calibration impact

A/B both move 40w/52w baselines (membership/ownership changes) → measured run + re-floor + calibration
panel + full test triad, phased. The persistent state must be deterministic by construction (sorted,
event-driven, no object identity). Save-migration required (new durable og ids + membership fields).

## References
- ADR-0005 (ephemeral TGs as primary ops path); ADR-0006 (sectors = standing OGs; 3-1 verdict; v0.10
  deferral clause).
- Engine: `corps_front_sectors.ts` (buildCorpsFrontSectors, 5 turn-0 rehome sites),
  `brigade_assignment.ts` (classifyBrigadesByTerritory, rehomeUnassignedBrigadesToPhysicalSectorOwners),
  `final_sector_truth_reconciliation.ts`.
- Trigger evidence: 712th phantom-home placement (this branch); turn-0 deep-rear rehome thrash on
  `hrhb_herceg_stjepan`, `rs_17th_klju`.
