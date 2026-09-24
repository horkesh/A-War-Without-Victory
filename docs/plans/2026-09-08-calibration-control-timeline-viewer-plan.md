# Calibration Control Timeline Viewer — Plan

**Date:** 2026-09-08
**Lane:** Development instrumentation (`tools/`) — NOT product surface, NOT a roadmap workstream
**Status:** IMPLEMENTED 2026-09-08; expected-owner markers published 2026-09-16; Vranjevići RS reference update published and verified on GitHub Pages 2026-09-24.
**Branch/worktree:** `calibration-timeline-viewer` at `F:/AWWV-worktrees/calibration-timeline-viewer`, isolated from the concurrent `codex/*` branches and from `r7-arbih-honorific-names`
**Live viewer:** <https://horkesh.github.io/A-War-Without-Victory/?run=vranjevici-rs-20260924>
**Publication:** `gh-pages` commit `b66e6da43`, superseding `a29e6c855`; latest dataset is the dirty local Sebiočina candidate against the corrected Vranjevići references, not an adopted baseline (2026-09-24).

## 2026-09-24 — Vranjevići RS reference update published

The owner directed `op:mostar:vranjevici_2` to RS in all four painted
references. The unchanged Sebiočina run replays at **707/697/690/662**, exactly
one higher per checkpoint. The viewer's 232 control events, initial owners,
geometry, markers and simulation run are unchanged; only the Vranjevići
painted entry differs in each checkpoint payload. This is an owner reference
decision; constituent-level historical uncertainty remains.

The generated map passes syntax, payload-delta and marker checks (712/712
anchors; all 57 distinct mismatch anchors inside their cells). Local desktop
and touch checks show actual and painted RS at all four checkpoints, with
Sebiočina still RBiH in January. Only the viewer HTML and README were
published to `gh-pages`; source/main and baseline acceptance are unchanged.
Full-campaign acceptance remains NO-GO.

Pages reports `b66e6da43` built. The live HTTP 200 HTML matches the generated
and committed artifact byte-for-byte (720,280 bytes, SHA-256
`046372ce689b94d002488df57d7c1a9d9db15615162c3115a690a1791cedd10a`).
Live desktop and touch checks pass all four checkpoint states, scores,
selection and zoom/reset without errors or horizontal overflow.

[Publication evidence](../../logs/vranjevici-reference-20260924/receipt.txt).

## 2026-09-24 — Sebiočina candidate published

At the owner's request, the unchanged viewer now serves the retained corrected
188-week Sebiočina run. Scores are **706/696/689/661** with **6/16/23/51**
mismatches, 232 control events, 744 drawn and 712 scored OSIDs. Sebiočina is
RBiH from t15 through January and RS again from t45; Brčko and Donji Rahić
remain RS throughout. The current January reference paints Doljani HRHB.

The embedded initial owners, events and painted references match the saved run
and files on disk. Embedded script syntax, 712/712 markers and all 58 distinct
mismatch anchors pass. Local and live desktop/touch checks pass selection,
zoom/reset and checkpoint behavior without browser errors or overflow. Pages
reports `a29e6c855` built; the live HTTP 200 HTML is byte-identical to the
generated and committed file (720,524 bytes, SHA-256
`07d9e574006e0e6e5639a602358675ffa0537ff942fab3e63f1f2cab1724b07d`).
Only `index.html` and `README.md` changed on `gh-pages`. Publication changes
no simulation source, main branch, painted reference or adopted baseline.
Full-campaign acceptance remains NO-GO on the inherited Farz and Prozor gates;
the full test suite has not been rerun after the snapshot correction.

[Publication evidence](../../logs/sebiocina-trial-20260923/receipt.txt).

## 2026-09-23 — Jemanlići candidate published

At the owner's request, the unchanged viewer now serves the retained 188-week
Jemanlići candidate. Its scores are **704/697/692/657**, with **8/15/20/55**
mismatches, 224 control events, 744 drawn and 712 scored OSIDs. Jemanlići
changes to RS at t31 through Operation Donji Vakuf. All embedded initial owners
and control events match the saved run; geometry, painted references, markers
and colors match the preceding Orašac viewer. The saved run is dirty local
evidence, and full-campaign acceptance remains NO-GO. Publication changes no
simulation, source branch, reference, or baseline.
Pages reports `649b2b18e` built; the live HTTP 200 response is byte-identical
to the generated and committed HTML (720,075 bytes, SHA-256
`60f98d545ce43bdd62f6913fb94e05cd5af22c9c291609c372e7a8b1839a02c8`).
All 712 scored cells have markers; all 63 distinct mismatch anchors lie inside
their cells. Local and live desktop/touch/dark-touch browser checks find the
January score 704/712, Jemanlići RS at t31, working zoom/reset and no console
errors, failed requests or horizontal overflow. Only HTML and README changed
on `gh-pages`.

[Publication evidence](../../logs/jemanlici-op-probe-20260923/receipt.txt).

## 2026-09-22 — Map zoom and pan

Owner requested a way to zoom the published map. Scope is the standalone viewer:
accessible +/−/Reset controls, pointer-centered wheel zoom, drag pan and touch
navigation, preserving settlement selection, timeline controls and marker readability.
The same retained Prusac campaign remains the publication input.
Validation: syntax and focused interaction checks; equality of embedded campaign/map
payloads; local browser zoom/reset/pan/selection and mobile-size controls; independent
review; published-page byte/render verification. Expected cost: minutes, no simulation
or full suite. Correct any reproduced UI regression before publication.

**Completed:** local source commit `ac73f166f`; published `c31a9a2ed`. Buttons,
wheel, drag, reset, selection, timeline preservation and focused-map keyboard
controls pass browser checks; controls fit a 320px viewport. Pointer-capture click
regression corrected and independently re-reviewed GO. Touch pinch is implemented
and source-reviewed; a physical two-finger gesture was not tested. Syntax, marker,
payload-equality and commit-hook typecheck pass. Nine embedded payloads and scores
702/694/689/651 are unchanged. Live HTTP200/720220 bytes match the generated SHA256
`d7867c1ea15b0e2615160593082b630e0aaf321fb0c3701dc728a24607a95198`;
live zoom/reset work with zero browser errors. No new simulation or acceptance change.
[Portable receipt](../../logs/viewer-zoom-20260922/receipt.txt).

## 2026-09-22 — Prusac candidate published

Owner requested publication of the latest measured map. The unchanged renderer now
serves the retained 188-week candidate: **702/694/689/651**, 10/18/23/61 mismatches,
216 flips, 744 drawn/712 scored cells. Prusac is RS from week30 through Donji Vakuf.
Pages reports built for `224bfd0f6`; live HTTP200/713283 bytes match generated HTML
SHA256 `3e80eacf3d98e05e7088ec404f43b89e5c98a3dfb2028b16c0f9048cbd2fb02a`.
Payloads exactly match the saved run; geometry, references and renderer are unchanged.
All712 marker anchors exist; all71 distinct mismatch anchors are interior. Local/live
browser checks confirm January702/712,10mismatches and Prusac lastchange30, with no
live console errors/warnings. Only HTML/README changed on gh-pages. No new simulation,
source/main push, pin refresh or baseline adoption. January/full-campaign acceptance
remain open. Earlier publication entries below describe the prior datasets.

## Why

### 2026-09-16 expected-owner markers on mismatches

The owner asked to see mismatches directly on the map, with a circle naming the faction each
cell should belong to. A mismatched cell was already outlined in amber but said nothing about
its expected owner, so reading the map meant selecting cells one at a time.

Each mismatch now carries a circle filled in the colour of the faction that *should* hold it,
labelled `RB` / `RS` / `HR`, inside the retained amber ring. **The circle is painted historical
truth; the fill beneath it is still the actual controller**, and the legend now states both.
That separation is deliberate: the viewer exists because an orange mismatch fill was once
misread as RS control at Ozimica, and nothing here repeats that conflation. The overlay is now
on by default, and still appears only at weeks 39, 104, 156 and 188 — the four-snapshot rule is
unchanged, because at any other week a "mismatch" is only the war not having happened yet.

Two failure modes were designed out rather than discovered later:

- **Anchors are interior representative points, not bounding-box or area centroids.** An area
  centroid falls outside a crescent-shaped or two-lobed municipality, which would park the
  circle on a neighbour and assert something false about that neighbour. The centroid is
  tested for containment and replaced, where it fails, by the midpoint of the widest interior
  span at that height. Verified: 712 of 712 scored cells resolve an anchor, and all 56
  mismatch anchors across the four checkpoints lie inside their own polygon.
- **Marker size is computed in screen pixels per render, not fixed in user units.** The first
  implementation passed every payload check and then rendered as a 2.1px sliver of faction
  colour inside a 6px amber ring — measured in the browser, the colour carrying the entire
  meaning of the feature was invisible. Circles now hold a constant 20px on screen (16px of
  visible faction fill), confirmed unchanged at 1200px, 640px and 320px map widths. Below
  1000px the two-letter label is hidden and the colour dot carries the reading.

Verified in the browser on the published URL: 12 markers at w39 (RB 7 / RS 4 / HR 1), 10 at
w104, 15 at w156, 45 at w188; zero markers and the correct explanatory note at w73; the toggle
hides both markers and outlines; no console errors. Markers are `pointer-events:none`, so the
polygon under a circle remains the click target it always was.

Published as `gh-pages` commit `c1a292500`, superseding `3096f4e0b`. Live artifact SHA-256
`b97c388688bdf7cb7710031c1d001213009118cb026cedfb98a3da8a437da197`, 712,622 bytes, HTTP 200.
**No simulation change**: the same saved POST-A run from `ac3e5e152`, the same 700/702/697/667
scores, the same final-save hash. Generator change is in `tools/calibration_timeline.mjs`.

### 2026-09-16 publication record completed (no republication)

The 2026-09-14 session published the January-1993 operations run and was interrupted before it
could record the fact, so the roadmap, command board and calibration master briefly described the
viewer as still serving `8db305596`. That description was wrong and is corrected here and in
those documents.

`gh-pages` commit `3096f4e0b26bde8b98ee5262b602c57f9fd17868` — *"Publish verified January 1993
operations run"*, 2026-09-14 18:35:05 +0200 — supersedes `469b4cba3` on the same three-file
branch (`index.html`, `.nojekyll`, `README.md`). It serves the saved POST-A campaign from clean
`ac3e5e152`: 188 weeks, 230 flips, 744 drawn / 712 scored cells, checkpoint scores
**700 / 702 / 697 / 667** with 12/10/15/45 mismatches. Final-save SHA-256 is
`8e80eca07cf0317fd8775ab818bb10adade8230076b6bde99d2b3a0a082fecee`.

[Open the latest published run](https://horkesh.github.io/A-War-Without-Victory/?run=ac3e5e152).
Verified live on 2026-09-16 **before the marker publication later the same day**: HTTP 200,
681,592 bytes, SHA-256
`d38d81eb29deee1531cf6ed36bc93cb99dc3c20ea9bb5cee09b18ef02fe905c9`, byte-identical to both the
locally generated artifact under
`logs/roadmap-integration-20260912/january-operations/viewer/` and the blob on `gh-pages`, and
embedding `ac3e5e1524558d2dc4e4fc40924306fc2873735a`. The retained browser audit records desktop
and touch checks passing against this dataset, including the eight January capture selections at
weeks 28/29/32/34/35/36/36/39.

No simulation was rerun, no artifact regenerated and no republication performed on 2026-09-16;
only the written record changed. Publication supersedes the previous viewer dataset only. Overall
calibration acceptance remains **NO-GO** for the western cascade and Farz attribution, with the
Prozor injection inherited.

### 2026-09-14 latest-run publication

The owner requested the latest measured run for remote inspection. The unchanged renderer
now publishes the saved local-occupation POST-A campaign: 188 weeks, 232 control events,
744 drawn / 712 scored cells, and checkpoint scores **696 / 690 / 687 / 659**. Baljvine,
Jezero, Donji Korićani and Lupnica change to RS at weeks 32, 33, 36 and 37. The source is clean
`8db3055962143af8f272ef7cf5d95414e6c5a601`, Node 22.23.2; final-save SHA-256 remains
`c41dad9c3dba6a8486397096f8b485a3ed4ab7d1c43e1ac5039271c26702d661`.

[Open the latest published run](https://horkesh.github.io/A-War-Without-Victory/?run=8db305596).
The query separates this link from previously cached page requests. GitHub Pages reports
`built` for `469b4cba3e576d0452e642137cf02d6143994137`. The live HTTPS page returns 200 and
exactly matches the verified 683,738-byte HTML, SHA-256
`e8d6c7a86fd1f0e671c838affd2298a7994aa475dae790ae4c17af8ff69e244b`.
Only `index.html` and its README changed on the existing three-file publication branch.

Payload checks verify all initial controllers and 232 embedded events against the saved run,
the four scores, unchanged geometry/references, and absence of absolute local paths. Local HTTP
and live browser checks pass at desktop 1440px, touch 320px and dark touch 320px. They verify
actual controller fills against replay, exact checkpoint mismatch counts, the four Jajce
capture details, an actual phone tap on Lupnica, unchanged fills when mismatch outlines are
toggled, and no horizontal overflow, console errors, failed requests or external assets.
The earlier browser fixture expected the old run's Ozimica transition at week 71 and failed;
the retained correction checks the new run's actual replay rather than retaining old ownership
expectations. No renderer or simulation change was needed. Earlier independent renderer review
remains applicable; this publication refresh uses focused payload and rendered checks.

Evidence is retained under `logs/roadmap-integration-20260912/github-pages-latest-20260914/`:
payload audit, preflight/live browser audits, live byte audit, screenshots, Pages build and
publication commit/push logs. No simulation was rerun. Protected data, references, baseline pins,
source save and source code remain unchanged. Local main remains `9588876bc`; remote main remains
`e607508bc`. This publication supersedes the previous viewer dataset only. Overall calibration
acceptance remains **NO-GO** for the western cascade, Prozor injection and Farz attribution.

### 2026-09-13 publication follow-up

The owner requested a remotely accessible GitHub HTML viewer after the orange mismatch fill
was mistaken for RS control at Ozimica and the inline map could not be tapped reliably.
The published page keeps faction fill truthful at every week. Optional amber outlines mark
checkpoint mismatches and default off. Search by settlement, municipality or OSID selects a
cell without tapping a small polygon; controller, historical owner and last-change week remain
visible. The review corrected the 320px grid width and dark search contrast. An embedded tab
icon prevents an unnecessary HTTP request while keeping the page self-contained.

Only `index.html`, `.nojekyll` and `README.md` were published on the dedicated `gh-pages`
branch. GitHub Pages reports `built` for `50b927492896af185c99894cd07df997371d9036`.
The HTTPS route returns 200 with exactly the reviewed 682,100-byte artifact, SHA-256
`5fdedb62e19db8c8980f948aba3534bb3885bb3c58e7c335843da2e55ed05bb4`.

The saved clean POST-A run from simulation commit `51fe494151397c1cc6521b54006b0f8da70705e5`
is the input (final-state hash `5d6f8378dbf433fc`). All five embedded datasets match the prior
viewer exactly: 744 drawn / 712 scored cells, 223 flips and checkpoint scores
**692 / 698 / 694 / 665**. Ozimica is HRHB at week 70, RBiH from week 71, and remains green
when its HRHB-reference mismatch is outlined at week 104. Historical comparisons remain
limited to weeks 39, 104, 156 and 188.

Independent review and the live browser check pass desktop 1440px, touch 320px and dark 320px,
including an actual tap on a visible search result, persistent details and no horizontal
overflow. HTTP preflight and the public route have zero console/page errors, failed requests
or external asset requests. Public provenance carries the run name/identity and hashes without
absolute local paths. Evidence is retained in `logs/roadmap-integration-20260912/github-pages/`
(`payload-audit.json`, `http-browser-audit.json`, `live-byte-audit.json`,
`live-browser-audit.json`, screenshots and `publication-receipt.json`).

No simulation was rerun; protected data, reference files, baseline pins and source save are
unchanged. Local main remains `9588876bc`; remote main remains `e607508bc`. The existing
full-horizon calibration acceptance stays **NO-GO**. Publication makes this measured run
inspectable and does not adopt it as a baseline. Closeout uses focused documentation checks
and the normal source-commit hook (`npx tsc --noEmit`, expected 1–2 minutes); both must pass,
and any failure is diagnosed before repeating its affected check.

Closeout evidence: plan index is current; all 32 focused documentation/governance tests pass
(three files, exit 0). The required typecheck remains enforced by the normal commit hook.

Calibration is currently followed through a single number per checkpoint. That number cannot answer the question the work actually turns on — *which cells moved* — and it is provably ambiguous: `matched_osids` is **non-injective**, and two runs have scored an identical 637 over **different maps four cells apart**. A score is not an identity, so a delta cannot be attributed by reading the score alone.

The existing tools each answer part of this and none answers it over time:

| Tool | Answers | Missing |
|---|---|---|
| `tools/verify_checkpoints.cjs` | four-checkpoint scores replayed against current painted files, enclave guard | end state only, no per-cell view |
| `tools/compare_painted_vs_sim.cjs` | OSID match rate by region + mismatch list | `final_save` only, one checkpoint per invocation |
| `tools/build_calibration_map_html.mjs` | interactive HTML map, amber mismatches, merge-map handling | one static snapshot per rendered PNG |

## The finding that made this cheap

No new engine artifact is required. `final_save.json` already carries `political.control_events` — the **complete** flip log for the whole campaign (`{turn, settlement_id, mechanism, from, to, mun_id, battle_id, attacker_brigade}`) — plus `political.initial_political_controllers`. Replaying the log over turn-0 control yields the exact controller map at any week.

Verified on the tracked final save: **220 events spanning turns 1→188**, 64 distinct turns. Nothing prunes the log (no slice/splice/truncation anywhere in `src/state/` or `src/sim/turn_phases/`).

**Correction worth making separately:** the schema comment at `src/state/game_state.ts:3216` says `control_events` is *"Kept for last 3 turns"*. That is stale and load-bearing misinformation — someone could "restore" pruning to match the comment and silently break both this tool and `verify_checkpoints.cjs`, which is where the calibration floors come from.

## Design rules (each exists to stop a specific known failure)

1. **The four-snapshot rule.** Painted historical truth exists at four weeks only — jan1993 w39, apr1994 w104, apr1995 w156, oct1995 w188. Control is shown for every week; **mismatch is only defined at those four**, and the viewer refuses to outline mismatches anywhere else, stating why. Comparing a mid-period week against its era's snapshot (what `pickHistoricalReferenceKey` does for scoring) would report "mismatches" that are only the war not having happened yet — a confident, wrong instrument. Do not add that.
2. **Always replay against painted-on-disk-now, never the run's recorded `historical_fit`.** The same run has read 673 then, 675 replayed. Painted files are absent from `consumed_inputs.files`, so a repaint silently re-bases every recorded score with nothing recording it.
3. **Stamp provenance, and say when a run is inadmissible.** Run name/identity, the run's own commit/dirty/Node, painted-file sha256 + revision. Public HTML omits absolute local paths. Latest ≠ valid: a dirty tree or the wrong Node major disqualifies a run as a baseline however recent it is, and the page says so in red.
4. **Merged sub-1km² cells render and score under their parent** (`micro_osid_merge_map.json`, 32 entries, 744 drawn / 712 scored). Stated in the UI, because outlined *polygons* can exceed the scored mismatch count.
5. **Reuse the existing projection**, identical to `build_calibration_map_html.mjs`, so the two viewers cannot drift.
6. **ONE SCENARIO, MANY SNAPSHOTS.** Canon (owner, 2026-08-24) is a single definitive 188-week scenario with intermediate checkpoints taken as snapshots of *its* runs. Auto-discovery therefore **prefers `apr1992_definitive_188w`** rather than newest-wins, and any non-master run is called out — in stdout before the scores and as a red banner on the page — as development-loop evidence that is **not adoptable**. `apr1992_definitive_104w` is additionally named as a measured-drifted fossil (missing `firepower_deficit_penalty_enabled` and `must_hold_osids_by_corps`). The tool does not refuse non-master runs, because 40w remains a legitimate development loop and the structural-fingerprint gate's scenario; it refuses only to let their numbers *look like* calibration truth.

   *Added after the first version got this wrong:* newest-wins auto-discovery selected a 104w fossil out of `runs/`, and its scores were reported without qualification. 36 master runs were present; the tool simply had no notion of which scenario was authoritative.

## What was built

`tools/calibration_timeline.mjs` — zero dependencies, plain node, emits one self-contained HTML file (~660 KB, no CDN, no network).

```
node tools/calibration_timeline.mjs [run_dir] [--out <path>]
```

- Auto-discovery prefers the newest definitive 188-week run **that actually holds a `final_save.json`**; an interrupted run without a final save is skipped. An explicit `run_dir` selects the publication input reproducibly.
- Output defaults to `<run_dir>/control_timeline.html` (`runs/` is gitignored, so no artifact enters the repo).

The page provides: a week slider across the whole campaign with keyboard arrows; flip-stepping buttons (the map is static between flips, so stepping by *event* beats scrubbing empty weeks); checkpoint buttons; the mismatch list for the active checkpoint, click-to-highlight; optional mismatch outlines that preserve faction fill; per-week flips coloured by mechanism (combat / paramilitary / consolidation / abandoned / event / setup_control); settlement search, persistent selection details and cell hover details; and the provenance panel.

## Original verification (2026-09-08 input)

- **Scoring agrees exactly with the authoritative tool.** Same run, `verify_checkpoints.cjs` and this tool both report **702 / 678 / 672 / 657**. The replay is the same `stateAt()` form, so agreement is by construction, not coincidence.
- **The four-snapshot rule holds under test:** mismatches shown at w39/104/156/188 (10 / 34 / 40 / 55, matching stdout exactly) and **zero, with an explicit refusal note, at w73 and w150**.
- **Rendered and driven in a real browser:** 744 cells drawn, no console errors, layout fits the viewport with the panel scrolling independently, flip-stepping / checkpoint-jump / mismatch-select all confirmed working.

## Deliberately not done

- **No second renderer and no new map stack** — same projection as the existing viewer.
- **No new engine artifact, no pipeline change, no re-run.** Everything derives from `final_save.json` as it is emitted today, so this cannot affect determinism, hashes, or calibration.
- **Not wired into Electron or any product surface.** This is dev instrumentation in `tools/`, the same category as `engine_health_gate.cjs` and `verify_checkpoints.cjs`; it does not expand the 1.0 product roadmap (§10).

## Worthwhile follow-ups (not built)

1. **Diff two runs cell-by-cell**, not just run-vs-painted. This is the highest-value extension, because it directly addresses the non-injective-score problem that motivated the tool.
2. **Classify the residual.** ~70% of the oct1995 residual has previously been shown to be "the engine never fought there" rather than "the engine fought and lost" (52 of 75 mismatches were not an objective of any authored operation; 53 never changed hands in 188 turns). Overlaying *ever contested? / ever an objective?* would make each mismatch self-sort into the two classes, which need completely different fixes.
