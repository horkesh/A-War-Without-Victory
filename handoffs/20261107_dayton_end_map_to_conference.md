# Handoff: Dayton end map (RD) → Dayton conference redesign

**From:** Claude, RD lane (settlement and end map), branch `claude/loving-knuth-pmx3hi`.
**To:** Codex and the Dayton conference redesign (plan on Dragon: `F:/AWWV-worktrees/.dayton-design/DAYTON_CONFERENCE_IMPLEMENTATION_PLAN.md`; cooperation file `F:/AWWV-coordination/CODEX_CLAUDE_HANDOFF.md`).
**Status:** reference handoff, not an executor prompt. Owner, 2026-11-07: RD closes as the settlement and end-map lane; the Dayton table is reworked by the conference redesign.

## Context

RD built what happens AFTER a deal is signed: the settlement map and how the verdict reads it. While doing so it also changed the Dayton table in the engine. Those table changes are **interim rules**: tested and baseline-neutral, but owned by the conference redesign, which may keep, reshape or replace them.

None of this was on `main` when the conference plan was written. Merge this branch (PR from `claude/loving-knuth-pmx3hi`) before the redesign's data-contract and live-bargaining slices; the fixture-only first slice does not depend on it.

## Read first

- `docs/plans/2026-11-07-rd-dayton-settlement-lane.md` (RD scope, owner rulings, gate status)
- `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`, "Peace settlements" paragraph
- `docs/PROJECT_LEDGER.md`, entries dated 2026-11-07 (Dayton, settlement, RD)

## Design principle: player agency (owner, 2026-11-07)

> "We have a strong historical simulation engine that can be used by players to achieve ahistorical outcomes should they put their mind to it. Player agency is exactly the point."

Ahistorical outcomes earned through the engine's mechanics are wanted, not corrected. The conference should honour what the player achieved on the ground. Three current rules pull against this and are the redesign's first items:

1. **An enclave held at signature is handed to RS** by the researched Dayton map (it bakes in the July 1995 fall). An RBiH that kept Srebrenica or Žepa should keep it, with a corridor, on the Goražde precedent. Highest priority.
2. **Protected ground is absolute** (interim owner ruling): Prijedor, Banja Luka, Doboj and the corridor are never negotiable even when the player holds them. Consider making them very expensive instead of impossible, so a strong enough position can win them.
3. **Declining Dayton is strictly worse for RS**: the VRS has no offensive capacity in the eight extra weeks (measured: zero RS attacks, cohesion 18 → 3). Give the decliner something to do, or make the cost explicit.

Measured example of agency the engine already allows: with the aggressive RBiH strategy, Zvornik never falls in week 1, Srebrenica never becomes an enclave, and RBiH reaches 38.1% of BiH by week 188 and 39.0% by week 196 after refusing Dayton (`docs/40_reports/20261107_RD_CLOSEOUT.md`). Open check (not a blocker): confirm the week-1 Zvornik hold is earned through the mechanics and not a defect.

## End-map contract (stable; RD owns it)

| Function / record | File | Meaning |
|---|---|---|
| `applyPeaceSettlement(state, planId, overrides)` | `src/sim/negotiation/peace_settlement.ts` | Records `negotiation.settlement` when a plan is accepted by all parties or Dayton is signed/imposed. Never rewrites `political_controllers`. |
| `negotiation.settlement` | `src/state/negotiation_types.ts` (`PeaceSettlement`) | `{plan_id, turn, territory_pct, special_osids, status, map_overrides?}`. The verdict reads `territory_pct` and the status caps. |
| `computeSettlementControllers(state, planId, overrides)` / `settlementControllersFor(state)` | `peace_settlement.ts` | The OSID-level settled map, recomputed on demand (browser-safe JSON imports). |
| `enforceSettlementContiguity` | `src/sim/negotiation/settlement_contiguity.ts` | Dayton only: each entity one piece; ≤6-cell islands absorbed, larger pieces get a smallest-area corridor; won package cells and list/capital enclaves never absorbed; Posavina canton kept. |
| `capGradeBySettlement` | `peace_settlement.ts` | Plan status caps (Vance–Owen RS ≤ C; Owen–Stoltenberg RS/RBiH ≤ B; Contact Group RS ≤ B; Dayton none). |
| `deriveSettlementMap(state)` | `src/ui/map/data/GameStateAdapter.ts` | Renderer read model: plan, settled controllers, special cells, territory %, cells that change hands. The desktop projection now includes `negotiation.settlement`. |

**How the conference should hand a signed deal to the end map:** call `resolveDaytonNegotiation` (or, if the conference replaces it, call `applyPeaceSettlement(state, 'dayton', overrides)` with OSID → faction overrides for every term that moves ground away from the researched Dayton map, then `freezeEndgameSnapshot`). The contiguity pass and the verdict follow automatically.

## Interim table rules (owned by the conference redesign)

| Rule | Where | Notes |
|---|---|---|
| Decline → 8 more weeks → coercion event → forced table (no decline; unanswered → map signed) | `dayton_negotiation.ts` (`declineDaytonNegotiation`, `enforceDaytonImposition`, `pending_dayton.forced`), `war_1995.json` coercion events | `result.imposed` stamped. Continuation operations run in the 8 weeks (`operation_opportunity_catalog_dayton_continuation.ts`). |
| Captured-ground packages: one per municipality where the front departs from the map; encircled ≤6-cell pockets ride with the adjacent package | `src/sim/negotiation/front_packages.ts` | Derived per state, never persisted (baseline-neutral). No RBiH-vs-HRHB packages (owner ruling). Cost 3 + 12×area% to demand, 2 + 9×area% to concede. |
| Patron leverage: area budget `0.5 + 0.15 × (override − 75)` % of BiH (0 below 75, cap 4.25), smallest first; protected ground never forced or conceded; post-decline ground never forced | `src/sim/negotiation/patron_leverage.ts`, `dayton_negotiation.ts`, `bot_negotiation.ts` (`PROTECTED_GROUND_REFUSAL_COST`) | Owner ruling 2026-11-07. Protected: RS Banja Luka region, Prijedor, Bosanski Novi, Doboj, Bijeljina, Posavina corridor incl. Brčko; HRHB Mostar + western Herzegovina. |
| A demand kept in the holder's counter-offer carries | `dayton_negotiation.ts` | Applies to all territorial demands. |
| Fixed-package keyword matching is token level | `src/sim/negotiation/package_area_resolver.ts` | Data fix, not a rule: Sarajevo Suburbs 1.6%, Central Bosnia 3.6%. |

## UI the redesign inherits

`src/ui/map/components/DaytonNegotiationModal.tsx` gained: a captured-ground section (`dayton.frontPackages*` i18n), an imposed-table banner (`dayton.forced.*`), Decline hidden on the forced table, decline warnings rewritten (EN/BCS). The dev screenshot harness (`src/ui/map/dayton_shot.tsx`) snapshots this modal. Tests: `tests/ui/dayton_negotiation_modal.test.ts`.

## Known boundary gaps

1. **Fixed (RD):** the desktop projection (`src/desktop/player_visible_state.cjs` `projectNegotiation`) dropped `negotiation.settlement`, so the renderer could not draw the settled map. RD adds the key and a projection test.
2. **Open (conference baseline item):** whether non-default institutional fields drop at the desktop boundary on `preview-dayton` / `resolve-dayton` (`src/desktop/electron-main.cjs`). Not traced by RD.
3. `preview-dayton` resolves on a cloned state, and that clone already holds the full settled map (`applyPeaceSettlement` runs inside the resolver); returning it would give the table a live "result of terms" map.

## Known limitations (independent review, 2026-11-07; not fixed in RD)

- `reopenWarAfterDaytonDecline` removes the Holbrooke-halt aggression modifiers by faction, negative delta and expiry turn, because those records carry no source field; an unrelated RBiH/HRHB negative modifier with the same expiry would also be removed. A `source` field on aggression modifiers would make this exact.
- The settlement map is recomputed (`settlementControllersFor`), not stored. It is stable after the war (the pipeline stops at `game_over`), but a later change to `plan_settlement_shares.json`, the contact graph or the contiguity rules would re-draw an old save's map while its stored `territory_pct` stays as signed. Freezing the controllers into the endgame snapshot would fix this (a state/serialization change).

## Transferred to the conference lane (not done in RD)

- Dayton-table map: highlight a package's cells; live result-of-terms map (from the preview clone, never re-derived in the renderer).
- Settled-map rendering: verdict "front at signature / map signed" comparison and a "View settled map" inspection mode (pattern: replay inspection). Data path ready via `deriveSettlementMap`.
- The Goražde Corridor package covers all of Foča, Goražde and Višegrad (4.2% of BiH), above any patron budget below override ≈ 99; it should be redrawn to the actual corridor cells.
- **An eastern enclave held at signature is handed to RS** (owner, 2026-11-07: decided by the conference lane). The researched Dayton map bakes in the July 1995 fall, so if RBiH still holds Srebrenica (or Žepa) at signature, the settled map gives it to RS (in a measured run: Srebrenica 13, Zvornik 9, Vlasenica 3, Bratunac 2, Rogatica 2 OSIDs, all RBiH-held). The Dayton precedent for an enclave that held is Goražde (kept, with a corridor). Any change needs historian, game-designer and sensitive-history panel sign-off.
- Bot counter-demands (a bot adding its own captured ground to a counter), and relative leverage inside the Federation, if Federation-internal terms come back.
- Zagreb's override is stuck near 5: scripted patron deltas last one turn because `computeOverrideAuthority` rebuilds each turn (`patron_pressure.ts`); a calibration change of its own.
- Washington as a precondition for the Contact Group plan; Invincible as the September 1993 revision of Owen–Stoltenberg; the EU Action Plan as an event (historian seat, 2026-11-07).
- RBiH–HRHB permanent-alliance counterfactual (needs the sensitive-history panel and the unanimous panel; moves the Washington anchor).

## Constraints that still bind the redesign

- Brigades attack only through CorpsOperation; determinism; `political_controllers` is never rewritten by a settlement.
- The headless/historical path signs the historical default proposal; the 188w baseline must stay pinned (Dayton never resolves in the calibration scenario).
- Sensitive history: counterfactual coercion narratives and continuation objectives are under the RD sensitive-history check; keep their counterfactual labelling.
