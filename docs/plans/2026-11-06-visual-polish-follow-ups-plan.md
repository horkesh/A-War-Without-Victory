# Visual polish follow-ups — the five recorded lanes, run in parallel (2026-11-06)

**Status:** ACTIVE (owner direction 2026-11-06: "tackle them all in a separate tree; if it waits for something, then it waits, but the rest?"). Successor of [2026-11-05-visual-polish-art-direction-plan.md](2026-11-05-visual-polish-art-direction-plan.md), registered under R7 once that packet closes on PR #533. Branch `claude/visual-polish-followups` in worktree `F:/AWWV-worktrees/visual-polish`.
**Owner of this plan:** Claude (integrator). Creators: Codex for images under the [art work order](../40_reports/proposals/20261106_VISUAL_POLISH_ART_WORK_ORDER.md); Pyrrhic seats for panels; Claude for code and docs.
**Rules carried over:** presentation only in code lanes; no engine, state, authored or calibration data without its own gate; never Codex's files; i18n keys in one announced commit per lane; §6 chain for anything gated; one change per measured run for anything calibration-moving.

## Lanes

| Lane | What | Who | State (2026-11-06) |
|---|---|---|---|
| A | Two decision headers (economic, territorial) so those event categories stop borrowing the intelligence and military plates | Codex generates (handoff CL-20261106-028); Claude wires `EVENT_CATEGORY_HEADERS` in `presidentialDeskAssets.ts` and pins it | **Waiting on Codex's PR.** |
| B | Held enclave-decision art 8.7 / 8.9 / 8.10 | Four-seat §6 panel (Historian, Scenario-tester, Engine, Red-team) | **Done: HOLD stands (2 approve-inert, 2 hold).** [Panel record](../40_reports/governance/20261106_SECTION6_HELD_ENCLAVE_ART_PANEL.md) carries the revised brief and eight conditions for the feature's own PR. No art generated. |
| C | Event-art authoring packet: which events without an `image` reuse an existing still, which need a new plate, which stay text-only | Historian seat drafts; Claude wires `image` keys for non-§6 rows after Historian confirmation (plan §8 of the first packet); Codex generates new plates | **Historian packet pending** (seat running). |
| D | Army HQ on paper: prose surfaces take the paper material, data panels stay dark | Claude, slice by slice, owner's eye on each | **Slice 1 landed on the branch:** `DossierPaper` owns the material; Chief of Staff missive and situation briefing on it; Codex essay footer shares the band. Browser proof at 1366 (Briefing tab). Next slices: `CommanderSection`, `FrontVisitSection` (IPC-only, desktop proof), `CommandRelationshipSection`, dossier excerpts in `OperationOpportunityDossierPanel`. Not paper: ORBAT, readiness, sectors, operations tables. |
| E | Camps "deny" option rewards denial | Game Designer seat investigated; §6 chain + owner + one measured 188w run before any edit | **Proposal written:** [20261106_CAMPS_DENY_OPTION_BALANCE.md](../40_reports/proposals/20261106_CAMPS_DENY_OPTION_BALANCE.md). No data changed; calibration-moving on the verdict; serial with other calibration lanes. |

## Gates per lane

- **A:** work-order rules A1–A8; the wiring commit adds two rows to `EVENT_CATEGORY_HEADERS` and extends `decision_modal_art_wiring.test.ts`; browser proof on an economic and a territorial event decision.
- **C:** Historian confirms each reuse; §6 rows untouched; `image` edits are presentation metadata in authored event JSON and must leave every sim artifact byte-identical (`tests/event_timeline_integrity.test.ts` and the provenance manifest hash are the witnesses); EN/BCS alt only for gated stills.
- **D:** `tsc`, `dossier_type_contract`, `dossier_paper_material`, readability and role-clarity tests, `desktop:map:build`, browser proof per slice; owner accepts the material before the next slice.
- **E:** nothing lands without the §6 chain, the owner's go and one measured 188-week run with a verdict diff.

## Execution record

- 2026-11-06 — Lanes opened in parallel on `claude/visual-polish-followups`. B closed as HOLD with the revised brief. E proposal written. D slice 1 committed with browser proof. A handed to Codex. C Historian seat dispatched.
- 2026-11-06 — First packet closed (#533 merged). C step 1 wired: 73 events to existing stills; local structural fingerprint `92ff10609b13c5bd` matches expected, so the wiring is simulation-inert; `tests/ui/event_art_keys_resolve.test.ts` added. C new plates (two regenerations first, then fourteen) handed to Codex (CL-20261106-029). PR #535 open with lanes B, C-1, D-1, E.
- 2026-11-06 — Lane E applied on `claude/camps-rebalance` with the owner's go: numbers, copy and the historical default (`obstruct`) in one edit; one measured 188-week run against main (figures in the proposal); Scenario-tester GO, Game Designer intent met; residuals (HRHB deny patron-confidence, three perpetrator-paying consequence rows) queued for the sibling run. `tools/diagnostics/verdict_diff.ts` added. #536 and #537 merged; lane D complete.
