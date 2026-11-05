## Current published snapshot — 2026-11-05 (latest, April 1994 at 711)

[Open the current weekly timeline 0–188](control_timeline_apr711_188_20261105.html), with scores of **712/711/710/693** at weeks 39/104/156/188. January 1993 is signed off at 712/712.

- **Source:** the unpushed local branch `claude/live-jan1993-calibration`; the commit is named in `PUBLICATION-PROVENANCE.json`.
- **Live equals headless through April 1994.** For RBiH, RS and HRHB as the player at production autonomy, 0 cells differ at weeks 39 and 104. Three fixes made this hold past week 39:
  - the player's staff follows the historical officer-succession schedule;
  - peace plans are answered;
  - a new **pause before combat**: when a decision fires for the player, the turn stops before movement and combat so the answer takes effect that same week.
- **What changed for April 1994:**
  - The Jablanica-based 444th Mountain now returns home before the Doljani attack. This unblocks the 4th Corps queue, so Neretva '93 takes Doljani and Turija in September 1993.
  - Kreševo stays HRHB as a side effect.
  - Brka is not lawfully reachable: the Serb brigades there are too weak to attack.
- **October 1995 is −4**, from the known late-1995 timing knife-edge, to be reworked at that checkpoint.
- **Checks:** strict engine health passes; enclaves on schedule; full suite passes; 0 markers outside their cell.
- **Not adopted:** baselines are not yet re-pinned.

The previous [712/708/707/697](control_timeline_jan712_188_20261105.html) page remains available; its provenance is archived as `PUBLICATION-PROVENANCE-previous-jan712.json`.

## Previous published snapshot — 2026-11-05 (712)

[Open the 712 weekly timeline 0–188](control_timeline_jan712_188_20261105.html), with scores of **712/708/707/697** at weeks 39/104/156/188. January 1993 matches all 712 cells.

- **Source:** the unpushed local branch `claude/live-jan1993-calibration`; the commit is named in `PUBLICATION-PROVENANCE.json`.
- **Run:** the 188-week scenario runner with no player; a repeat run is control-identical. The live game (any player faction, production autonomy, historical-default decisions) matches it cell-for-cell at January 1993 (712/712 each).
- **Checks:** strict engine health passes; enclave guard on schedule; anchors and the full suite pass; 0 markers outside their cell.
- **What changed since 711:** a one-brigade Skender Vakuf axis on Operation Donji Vakuf. The 3rd Banja Luka takes the HRHB-held Donji Koričani at week 29. This is a calibration assumption: wartime control is not established by a source.
- **Still open:** the Farz guard is parked until October 1995. Baselines are not yet re-pinned. Not adopted.

The previous [711/707/706/693](control_timeline_jan711_188_20261105.html) page remains available. Its provenance is archived as `PUBLICATION-PROVENANCE-previous-jan711.json`.

## Previous published snapshot — 2026-11-05 (711)

[Open the 711 weekly timeline 0–188](control_timeline_jan711_188_20261105.html), with scores of **711/707/706/693** at weeks 39/104/156/188.

- **Source:** the unpushed local branch `claude/live-jan1993-calibration`; the commit is named in `PUBLICATION-PROVENANCE.json`.
- **Run:** the 188-week scenario runner with no player. The live game (desktop `advanceTurn`, RBiH, RS or HRHB as player at production autonomy, historical-default decisions) matches it cell-for-cell at January 1993 (711/712 for each faction).
- **Checks:**
  - strict engine health passes;
  - the enclave guard holds (Goražde), and Srebrenica and Žepa fall on schedule;
  - 0 markers outside their cell, 0 missing.
- **What changed:** four operation-data changes recover the last five January cells, each a calibration assumption:
  - Miljeno and Todorovići: the Čajniče Brigade's home axis;
  - Kamen: the 802nd joins the Goražde counterattack;
  - Krivajevići: an Ilijaš Brigade axis on Kijevo;
  - Seher: a 1st Zvornik axis on Podrinje Sweep.
- **Still open:** Donji Koričani (Skender Vakuf) is the one January mismatch. The Farz guard is parked until October 1995. Baselines are not yet re-pinned. Not adopted.

The previous 2026-11-05 page, [707/705/703/692](control_timeline_jan707_188_20261105.html), remains available. Its provenance is archived as `PUBLICATION-PROVENANCE-previous-jan707.json`.

## Previous published snapshot — 2026-11-05 (707)

[Open the 707 weekly timeline 0–188](control_timeline_jan707_188_20261105.html), with scores of **707/705/703/692** at weeks 39/104/156/188.

- **Source:** commit `379a3f309` on the unpushed local branch `claude/live-jan1993-calibration`.
- **Run:** the 188-week scenario runner with no player. The live game (desktop `advanceTurn`, RBiH, RS or HRHB as player at production autonomy, historical-default decisions) matches it cell-for-cell at January 1993 (707/712 for each faction).
- **Checks:** strict engine health passes (0 stranded, 0 ghost operations); anchors pass; all 712 cells are anchored with 0 markers outside their cell.
- **Engine:** the no-teleport engine (Engine Invariants 14.9), plus live player-staff parity fixes and the Visoko–Breza reinforcement (Vareš 147th/185th, a calibration assumption).
- **Still open:** January has 5 mismatches (Miljeno, Todorovići, Kamen, Krivajevići, Seher). The Farz guard is parked until October 1995. Baselines are not yet re-pinned. Not adopted.

The previous pages, [measured 708/707/707/699](control_timeline_measured_health699_188.html) and [published 709/708/709/692](control_timeline_qualified_brka_188.html), ran on the pre-no-teleport engine and remain available. Previous provenance: `PUBLICATION-PROVENANCE-previous-measured-health699.json`. No game source or raw save is uploaded.

## Previous published measured snapshot — 2026-11-03

[Open the current measured, UNQUALIFIED weekly timeline 0–188](control_timeline_measured_health699_188.html). Source baseline `64e616e0b696dc3dafebb02028a745af33711f5c`; source binding `361427763e79dde27d53dab365fc7446af92f0608bd51d9810154d1412f271f2`; bundle `29196c4ee877ad40c09fe312628c20b27b474c0d7e86da07349efa4832e08915`. This is HEAD plus the 135-file manifest, 34 reviewed deltas, 6 untracked tests and 2 non-game documents — not a clean commit.

Repeat-verified cold pair: all 188 digest equivalents and 85 nonclock artifacts; scores 708/707/707/699 vs prior 709/708/709/692 at weeks 39/104/156/188. Reference revisions remain 7/6/9/7; no repaint. All five final health metrics are 0 and the anchors pass.

Current game includes stranded health fixes, Gubin sequencing and the late503 allocation. Causation of earlier losses is not fully established. Exact changed early cells versus the prior publication: January 1993 Donje Žešće moves RBiH→RS against painted RBiH; April 1994 Kreševo moves HRHB→RBiH against painted HRHB; April 1995 Kreševo moves HRHB→RBiH, Kupres and Novo Selo move HRHB→RS (all painted HRHB), and Gornje Krčevine moves RS→RBiH (painted RBiH). Net October 1995 is +7 versus the prior publication, but this snapshot is not qualified.

Known Farz timing defect: first combat at 169 (26 June–2 July), not the historical 10 September; the fix is not in this published snapshot. The full suite terminated FAIL with one genuine stale fixed-route enumeration expectation (the new 503rd axis is absent from the expected list); native boundaries and the offline package remain pending.

No adoption, no selected-player 188 equivalence, and no gap-free audio claim. This is ambience-disabled observer evidence only; old audio-enabled FAILs remain FAILED. [Previous published 709/708/709/692](control_timeline_qualified_brka_188.html) remains available with earlier regressions retained. No source or raw save is uploaded. The previous provenance archive `PUBLICATION-PROVENANCE-previous-qualified-brka-188.json` is retained.

## Current publication - 2026-11-03

[Open the current qualified observer timeline](control_timeline_qualified_brka_188.html). Source baseline 64e616e0b696dc3dafebb02028a745af33711f5c; exact source binding ccc5d2dbb32203b96e57f878b896f9c47213f9bb8a12be1f62d0c6913aac6040; bundle 81cdb13514b35919cd9b588a2eb53b415224a9a466fdc238e7e8692b6dee67c4.

This is one coherent 262-event / 712-cell saved history replayed weekly from 0 through 188. All four checkpoint controller maps match the replay exactly. Current corrected references are April 1994 revision 6 and April 1995 revision 9; scores are 709/708/709/692 at weeks 39/104/156/188. Those corrected-reference scores differ from the original receipt 709/709/708/692 only by the Brka painted-reference correction: reference-only changes, not new gameplay gains.

Scope: scoped qualified observer fallback with tests, cold pairs and focused native boundaries. It is not adoption, not a current experimental qualification, and not selected-player 188 certification; ambience is disabled. The earlier public week-104 page and older 188-week pages remain available below. No game source or raw save is uploaded here.
# Canonical AWWV calibration control timeline

**Standard tool:** https://horkesh.github.io/A-War-Without-Victory/ — the interactive week-by-week control timeline with checkpoint navigation, search, cell inspection and zoom/pan. Use this tool for requests for the calibration map/tool; single-checkpoint Sites maps are not substitutes.

## Current publication — 2026-11-01

[Open the current timeline](https://horkesh.github.io/A-War-Without-Victory/). Exact artifact: `control_timeline_709_through104.html`, SHA-256 `17df2d9f0158ca6befbdb1e921e58a2818981cd49c664e9714a55766251c303b`.

This coherent all-AI observer run actually completed104 weeks: January1993(w39)709/712 and April1994(w104)709/712. All168 control events and712 initial controllers are preserved;744 polygons include32 scoring aliases. Weeks0–104 are inspectable; April1995(w156) and October1995(w188) are disabled/not reached. No later history was invented or spliced from another run. The older188-week runs remain available below.

Source `18dc69fac06ff729b551a43f862b48547ce22c86`; save SHA-256 `74fe4be432ec3b26ba4bd6c68611f04ae13c33e3a4481c49e89aedb775bb7623`. Source measurement completed2026-10-29T18:03:37.454Z; HTML generated2026-11-01T12:23:06.538Z. Publication time is not a new simulation result. Dirty-worktree/non-master warnings remain; this is unadopted observer evidence, not native-player acceptance or completed full-campaign qualification. Ambience-disabled native qualification is separate and remains unclaimed here.

## Maintenance contract

Preserve one coherent saved history, exact source/reference provenance, old dated viewer artifacts and `.nojekyll`. Never treat planned duration or last flip as actual completed week. Historical mismatch is defined only at reached painted checkpoints39/104/156/188, not intermediate weeks. Publish only reviewed/tested generated viewer artifacts to this branch under explicit publication authorization; do not modify simulation sources, references or acceptance status. Keep root pointed at the current verified timeline and preserve old query routes.

## Preserved historical publications

# A War Without Victory — calibration control timeline

[Open the current n14 map with corrected Prusac paint](https://horkesh.github.io/A-War-Without-Victory/?run=april1995-n14-prusac-20260929). The saved simulation is unchanged and remains a dirty-source inspection candidate, not an adopted baseline. The owner's RBiH reference correction makes Prusac a mismatch at all four checkpoints. Replayed scores are 706/706/705/671 of 712; April 1995 protected anchors remain 40/40. The t29 VRS operation capture and other open integration gates remain visible. Earlier pages below retain their original painted-reference snapshots.

[Open the earlier April 1995 n14 inspection map](https://horkesh.github.io/A-War-Without-Victory/?run=april1995-n14-20260929). This is the retained dirty-source 188-week candidate, not an adopted baseline. Scores: 707/707/706/671 across the four checkpoints; April protected anchors 40/40. Donja Mahala remains HRHB, Paklarevo and Gornje Krčevine are RBiH at w156, and Vidimlije remains an HRHB-versus-RS mismatch. Farz's four authored objectives have logged operation-owned combat captures; 2nd Corps participation is not recorded. Western cascade 31/38, full suite, clean-source twin-run proof and separate §6 effects remain open. The older links below are preserved as dated inspection evidence.

[Open the Doljani candidate map](https://horkesh.github.io/A-War-Without-Victory/?run=doljani-20260927).

[Open the April 1995 delay-30 inspection map](https://horkesh.github.io/A-War-Without-Victory/?run=april1995-delay30-20260927). This retained 188-week run is an **inspection candidate, not the adopted baseline**. It scores 707/712 in January 1993, 707/712 in April 1994, 704/712 in April 1995 (anchors 40/40), and 669/712 in October 1995. Gornja Presjenica is painted RS at the April and October 1995 checkpoints and the retained simulation is RS. Vidimlije and the other listed cells remain parked; the Central Bosnia anomaly and the then-current Farz gate were open at publication; the latter has since been revised. The published artifact is `april1995-delay30-20260927.html`; the query link selects it while keeping the Doljani entry available.

This page replays the saved **188-week Doljani timing candidate** from `apr1992_definitive_188w__6deb5845c150c196__w188_n13`. The run came from a dirty local worktree and is **not an adopted baseline**. Its saved final state has SHA-256 `ee5dbfb8f42e7d147e046ad7ffe1b494ded34eec45d3d84f69069d586a347558`.

Against the unchanged painted references, the checkpoints are **707/712** in January 1993, **707/712** in April 1994, **701/712** in April 1995, and **664/712** in October 1995. There are respectively **5, 5, 11, and 48** mismatched cells. The run contains **235** saved control events. The map draws **744** polygons and scores **712** OSIDs.

To inspect the Doljani result, select **April 1994 (w104)** and search for `op:jablanica:doljani_2`. The map shows simulated **RBiH** and painted **RBiH** control. The saved run records an ordinary RBiH combat capture at turn 57; Doljani remains RBiH at w104. At that checkpoint, `op:prozor:ljubunci_2`, `op:prozor:lug_2`, and `op:prozor:paros` are **HRHB**. `op:maglaj:jablanica` remains a parked mismatch: simulated **RS**, painted **RBiH**.

Faction colors show simulated control at each week. At measured checkpoints, amber outlines indicate mismatches, and colored circles show the painted controller. Use search or click a cell to inspect it. Zoom with the map buttons, mouse wheel, or touch pinch; drag to pan. Historical mismatch comparison exists only at the four checkpoints.

The standalone HTML was generated from the saved run with `tools/calibration_timeline.mjs`. Publication changes the viewer only. At that publication, the full Vitest suite and the former Farz P-A checkpoint guard were red, and the candidate had one HVO Central Bosnia critical anomaly. This map is for inspection; it does not change the simulation, painted references, or baseline status.
