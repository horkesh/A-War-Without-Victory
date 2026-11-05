# Visual polish Phase D — paper and type for Army HQ, Chronicle and Codex (2026-11-05)

**Packet:** [2026-11-05-visual-polish-art-direction-plan.md](../../plans/2026-11-05-visual-polish-art-direction-plan.md), Phase D.
**Branch:** `claude/visual-polish-phase-d`, stacked on B (PR #527), C (PR #526) and A (PR #525), worktree `F:/AWWV-worktrees/visual-polish`.
**Scope:** class names and one token only. No copy, number formatting, focus, dismissal, keyboard or state logic changed. No i18n key added.

## What changed

- **Army HQ reads in the command face.** The dialog root in `ArmyHQModal.tsx` set `font-mono` on everything, which is why the whole surface looked like a terminal. The class is removed from the root, so body prose inherits IBM Plex Sans Condensed (the Tailwind default); the data face stays, element by element, on figures, dates, codes, small-caps labels, badges and buttons. Block-level prose containers that carried their own `font-mono` drop it: the Operations, Orbat and Sectors section bodies, the commander notes, the command-relationship explanations, the front-visit notes, strategic-position notes and the directive-card note.
- **Chronicle prose** (card detail, chapter summary, empty-chapter line) moves to the command face; eyebrows, dates and chips keep the data face.
- **Codex badges never wrap mid-label.** The tier and category chips are `shrink-0 whitespace-nowrap`, and the row wraps whole chips onto a second line instead of breaking "FIXED HISTORY" across two.
- **Codex essays read on the project paper.** The essay card uses the `bg-paper` token with `paper-grain`, a slightly warmer header band, and a 560 px reading measure instead of 500 px.
- **Tests.** New `tests/ui/dossier_type_contract.test.ts` (RED 5/5 before, GREEN 5/5 after): the dialog root carries no data face, section bodies and commander notes are in the command face while figures keep the data face, Chronicle prose is in the command face, Codex badges carry `whitespace-nowrap`, and the essay card uses the paper token.

## Evidence (`F:/AWWV-worktrees/_logs/visual-polish/D/`)

- `type_RED.log` (5 failed before), `type_GREEN.log` (5 passed after).
- `tsc.log` exit 0; `vitest.log` 27 files / 231 tests pass (typography contract, typography floor, Army HQ and Codex readability, contrast tokens, Army HQ ultrawide, role clarity, readiness copy, sector truth, timing copy, presidential handoff; Chronicle chapters, chapter UI, causality slides, decision ledger, endgame mount, focus routing, spine scrubber; Codex dynamic mount, tier graph, unlock state, essay localization; directive card act art and stop-op; modal palette; decision art wiring); `map_build.log` `desktop:map:build` exit 0.
- `army_hq_1366_after.jpg`: Army HQ briefing on the real Vite route (port 3003, RBiH turn 1) with prose in the command face and figures in the data face. `chronicle_1366_after.jpg`: the Chronicle. `codex_list_1366_after.jpg`: the essay list with chips that wrap as units. `codex_essay_paper_1366_after.jpg`: an essay on the paper token.
- Zero turns advanced.

## Simplify pass

Four review lenses (reuse, simplification, efficiency, altitude) ran on the diff. Fixed in this slice:

- Four prose containers the first pass missed drop the data face: the corps card's commander line and its two provenance sentences, and the Chronicle's empty-chapter line (the sibling of the empty-entries line already fixed).
- The per-file source assertions are replaced by one policy scan over `army_hq/**` and `chronicle/**`: no paragraph and no prose-leading element may carry `font-mono` unless it is a small-caps (`uppercase`) label. A positive-control case proves the scan reports a prose paragraph and a prose-leading div and ignores a label and a figure. The Codex assertions are reduced to a nowrap count, the wrapping row and the paper card.
- The essay card clips its grain to its rounded corners (`overflow-hidden`), and its year and context labels move from `text-neutral-500` (about 3.7:1 on the paper token, below AA at 12 px) to `text-neutral-600` (about 5.9:1). Body text (`text-neutral-700`, about 8:1) was already AA and AAA.

Recorded, not done: a shared Badge/Chip component (every panel defines its own local badge; a refactor, not a polish fix); the borderline data-face uses on officer and corps names in the order-interpretation panel and the relationship event labels, which read as labels today; a scan of the remaining neutral-400/500 text inside the essay card. The altitude review kept the root-class removal plus opt-in `font-mono` as the right mechanism and judged `bg-paper` the right token. The efficiency review found no meaningful waste (the grain layer is a 4 % opacity static overlay already used by two other panels).

After the fixes: `tsc` exit 0, the policy scan and affected files pass, `desktop:map:build` exit 0 (`D/tsc_post_simplify.log`, `D/vitest_post_simplify.log`, `D/map_build_post_simplify.log`).

## Not done in this phase

- Army HQ sections keep their dark panel material; the plan's "cream paper panels with crest headers" would re-theme dozens of Tailwind-coloured panels one class at a time (the panel colours are hex tokens, not CSS variables, so no wrapper can re-theme them). The crest header landed in Phase C. Recorded for a later material slice if the owner wants Army HQ on paper.
- Chronicle "Wrapped" slides keep their data-face captions by design.
- Number formatting and the engineering-vocabulary copy findings from the showcase audit remain in the R7 readability amendment's lane.
