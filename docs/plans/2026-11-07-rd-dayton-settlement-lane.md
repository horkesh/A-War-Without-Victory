# RD — Dayton Settlement and Endgame (lane plan)

**Declared:** 2026-11-07 by the owner ("Dayton is our new active lane").
**Status: CLOSED 2026-11-07** (owner). All `RD-*` gates closed; record in [RD closeout](../40_reports/20261107_RD_CLOSEOUT.md). Next lane: DC, the Dayton conference redesign (Codex).
**Roadmap row:** [MASTER_ROADMAP.md §5](MASTER_ROADMAP.md) `RD`. **Gates:** [open_gates.yml](../open_gates.yml) `RD-*`.
**Panel record:** Pyrrhic team convened 2026-11-07 (historian, game designer, QA/systems, UI/UX + modern wargame, product/orchestrator seats). Owner rulings recorded below.

## Scope (rescoped by the owner, 2026-11-07)

**RD is the settlement and end-map lane:** peace plans settling on their maps and terms, the OSID-level Dayton map, settlement contiguity (no isolated pockets), the settled territory share and status caps the verdict reads, and the data path that lets the renderer draw the settled map.

**The Dayton table belongs to the Dayton conference redesign** (next lane, Codex; plan on Dragon at `F:/AWWV-worktrees/.dayton-design/DAYTON_CONFERENCE_IMPLEMENTATION_PLAN.md`). RD's table changes stay in the engine as **interim rules** the redesign owns and may replace: the decline path and forced table, captured-ground packages, patron leverage (area budget, protected ground, post-decline protection), counter-offer retention. Handoff: [handoffs/20261107_dayton_end_map_to_conference.md](../../handoffs/20261107_dayton_end_map_to_conference.md).

Out of scope here: the conference table and its UI, packaged-campaign acceptance (R8), human audio listening (R7, parallel).

## Owner rulings (2026-11-07)

1. **Patron override:** a patron forces ground only up to an **area budget** that grows with its override (0 below 75; `0.5 + 0.15 × (override − 75)` % of BiH, capped at 4.25), smallest pieces first, and **never** forces ground on a protected list: Banja Luka region, Prijedor, Bosanski Novi, Doboj, Bijeljina and the Posavina corridor for RS (Brčko stays with arbitration); West Mostar and western Herzegovina for HRHB.
2. **No Federation-internal captured-ground packages:** RBiH-vs-HRHB differences follow the researched Dayton map. Dayton drew the inter-entity line; lines inside the Federation came from the Washington cantons.
3. **Post-decline gains are not patron-forced:** ground taken after a player declines Dayton can still be demanded at the forced table, but no patron can be forced to give it up (the United States is the coercing power).
4. **Proceed** with the order below.

## Work order and gates

| Step | Work | Gate | Measured run |
|---|---|---|---|
| 1 | Declare the lane (this plan, `.claude/current-lane.txt`, roadmap, gates) | — | none |
| 2 | Quick fixes: package keyword matching (token level), `agent_skill_import` PowerShell skip, `ongoing_mobilization` fixture, contiguity pass fixes (continue past unfixable pieces, smallest-area corridors, never absorb won-package or enclave cells), patron threshold constant | RD-PACKAGE-KEYWORD-MATCH, RD-CONTIGUITY-PROTECTION | 188w baseline gate |
| 3 | Owner rulings 1–3 | RD-PATRON-OVERRIDE | 188w baseline gate + decline campaign |
| 4 | Re-measure maximum territory per faction under the settlement rules; RS and HRHB decline campaigns | RD-MAX-TERRITORY-REMEASURE | live harness, one strategy set per faction |
| 5 | Settled map data path: project `negotiation.settlement` to the renderer; `deriveSettlementMap` read model. Rendering (verdict comparison, inspection mode, Dayton-table highlight, plan thumbnail) transferred to the Dayton conference lane | RD-SETTLED-MAP-UI | none (tests) |
| 6 | Canon propagation (WAR_TERMINATION_SPEC, Systems Manual, Rulebook, Phase Specifications), independent review of the Dayton commits, sensitive-history check (coercion narratives, Prijedor/Kozarac objectives, RS grade re-anchor), scenario review of run artifacts | RD-CANON-PROPAGATION, RD-INDEPENDENT-REVIEW, RD-SENSITIVE-HISTORY-CHECK, RD-RUN-ARTIFACT-REVIEW | none |
| 7 | Transferred to the Dayton conference lane (see handoff): Goražde package redraw, bot counter-demands, Zagreb override persistence fix, Invincible as the September revision of Owen–Stoltenberg, EU Action Plan as an event, Washington as a precondition for the Contact Group plan, RBiH–HRHB alliance counterfactual | — | owned there |

## Acceptance (RD-ACCEPTANCE-ALL-GREEN)

- Every engine change leaves all 8 pinned 188w artifacts byte-identical, or carries an owner re-pin with the reason recorded; 712/711/712/710 and the guard intact.
- Full suite green, environmental skips documented; typecheck clean.
- Maximum territory re-measured for all three factions with the map as signed (no table demands), on-time and after a decline; report refreshed.
- Settled-map data reaches the renderer (projection + adapter tests); rendering is the conference lane's.
- Independent review GO recorded for each change; canon propagated in the same change set.
