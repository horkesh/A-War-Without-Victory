## 2026-11-16 — FORAWWV §X and §XIV amended: the political-directive chain is retired (B3)

Canon record for the FORAWWV amendment that follows PR #710 (B3 + B2). #710's canon seat recorded the debt: FORAWWV 276-301, 409 and 421 described the B1 producer, the A3 step and the C1 overlay as live, validated substrate.

**Panel (unanimous).** Five seats, each APPROVE WITH WORDING CHANGES, all applied: historian, canon-compliance, game-designer, corps-army-commander, scenario-creator-runner-tester. The named integrator checked every change and found no contradiction: GO. war-or-game is not seated (owner rule).

**Amendment.**
- **§X header:** a dated "Amended" paragraph. It says the chain is retired, gives the measured result (control-identical in the five smoke scenarios plus historical and emergent 188w; commander state byte-identical in the historical run), and gives the corps-role source (the Army HQ CampaignPlan plus the existing bilateral-front diversion). It says civil-military direction now runs through the player's staged orders, the A4 officer roster and `army_clashes` compliance, with no standing political verb modelled.
- **§X.1:** the six-verb set is library and tooling only; no game step writes it, except in tooling runs.
- **§X.2:** each slot now reads as retired or save-only, as follows.
  - `political_directives_by_faction` is not written in a game (the harness may write it); v39 deletes it.
  - `army_corps_directives_by_faction` stays a required field. It is not written or read for decisions; the adapter still reads it, validation checks it, and v39 empties it.
  - Corps decisions: the `plan.ts` gates read the CampaignPlan role, null without a valid plan, or primary/contain under the bilateral-front diversion.
- **§XIV line 409:** B1+B2 and C1+C2 noted as retired; the invariant is unchanged.
- **§XIV.3:** the Ring 1 example now names the retired C1 persistence as historical.
- **Path correction (integrator note):** the old §X.2 said `state.political.political_leader_data`. The code (`political_leader_data_loader.ts`, `political_leader_types.ts`) holds it at `state.military.political_leader_data`. The new text uses the code's path.

**Scope.** Canon text only; no code or data. The Systems Manual, Engine Invariants and Rulebook needed no change (canon seat).

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/batch-b-20261116/forawwv_b3_panel_packet.md`, `forawwv_b3_amendment_final.md`.
