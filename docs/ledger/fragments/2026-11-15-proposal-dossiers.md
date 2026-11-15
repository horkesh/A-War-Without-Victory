## 2026-11-15 — Proposal dossiers: every offensive proposal carries an attributed dossier (command loop L5)

**Why.** The R8 dry-run Player Experience Council found that operation proposals asked for yes or no on "Staff recommends authorization." with no objective, forces, odds, cost or map. Ordinary proposals printed thirteen English "Label: value" lines with raw percentages, often "Unreported", behind the Personnel action label, and Withhold and Cancel were not explained (`docs/40_reports/proposals/20261114_COMMAND_LOOP_PROPOSAL.md` §5A).

**What changed (UI and a read-only projection; no sim, state or save change).**
- New `src/ui/map/data/proposalDossier.ts` builds each ordinary operation proposal's dossier for the Command Surface:
  - A header in one sentence: who asks, with how many brigades, for which settlement.
  - Facts, each shown only when known:
    - Objective (with Show on map).
    - Forces (the first three brigades and "+n", donor corps, and a thin-front warning when the corps front is under heavy pressure).
    - Odds.
    - Cost (a casualty band).
    - If you hold back.
    - Withhold, and Cancel.
- Odds are one of four bands (favourable, even, hard, long), never a number, and always attributed: "Odds: Ramiz Dreković judges them even."
  - The band comes from the plan viability the corps staff report, bent by the proposing officer's file (aggressiveness 0.06 and competence 0.02 per point from the midpoint 3).
  - The intelligence behind it is named (poor, partial or good).
  - When the army staff's unbent reading differs, both voices appear.
  - With no known officer, the corps staff judge.
- The inputs are the corps staff's own beliefs about their own plan. `OpProposalCardView.dossier_inputs` carries viability, intel confidence, concentration, front pressure, staging and brigade ids for map focus, and the officer's competence and aggressiveness; no fog-hidden enemy data. `buildOpProposalCardData` in `autonomy_ipc_contract.cjs` mirrors the same inputs in one property block. `src/shared/playerSafeOperationBalance.ts` gains the four-band mapping.
- Show on map uses the existing `field-operation-plan` target, until now set only for historical operations.
- Card actions read "Review the plan". Generated plans get a localized title ("Advance from Banovići" / "Napredovanje, polazište: Banovići").
- **Entry-chunk split.** With main merged, the dossier pushed the map entry chunk to 3,002 kB, over the 3,000 kB warning the player-experience gate blocks on. The split now follows `stanceMatterCopy` / `stanceMatterDetail`:
  - The entry keeps the title, the header and the map target (`proposalDossier.ts`, five `dossier.*` strings in EN and BCS).
  - The facts, the odds logic and their EN/BCS copy live in `proposalDossierDetail.ts`, loaded only by the lazy `ProposalDossierFacts` that the Command Surface renders in the detail body.
  - Result on main `b51ab3e58` plus this branch: entry 2,998.52 kB (main alone 2,996.30 kB); facts chunk 5.1 kB.
  - The margin under 3,000 kB is about 1.5 kB, which matters for L6 next.
- `CommandSurface.tsx` drops the decorative art for proposal cards, so the dossier facts get that space. This is outside the lane's file list.
- Stakes (who reacts) are left out: no structured stakes exist for operation proposals yet. The Authority price joins the cost line with L6.

**Tests.**
- New `tests/ui/proposal_dossier.test.ts`:
  - bands, the officer's bend, attribution, missing data, thin front and donors;
  - determinism, the BCS render and the localized title;
  - read-model inputs, IPC parity, and no inputs for a plan that is not ready.
- `presidential_decision_room.test.ts`: the ordinary-proposal cases now assert the dossier, its map target and the absence of percentages, raw ids and "Unreported".

**Evidence** (`C:/Pyrrhic/AWWV-worktrees/_logs/cl-l5-dossiers-20261115/`).
- `tools/ui/proposal_dossier_browser_proof.mjs` boots a real RBiH campaign, gives the player's own 5th Corps a ready plan and a pending proposal in the raw state, and reloads it through the real adapter and Decision Room.
- Screenshots at 1280×720 and 2293×960, in EN and BCS: `dossier_*.png`, and `dossier_facts_*.png` with the facts scrolled into view.
- No percentage, raw id or "Unreported" in any render; 13 px minimum font.
- "Show on map" opened the field operation plan with its objectives in view.

**Not done / found.** At 1280×720 the Command Surface's directive footer takes about half the detail column, so the dossier facts begin below the fold and need a scroll. That footer layout is shared and was not changed here. The legacy string fields on the proposal card (with percentages) remain for the Autonomy panel's read model and the QA harness; they are no longer shown in the Decision Room.
