# A War Without Victory — calibration control timeline

[Open the interactive viewer](https://horkesh.github.io/A-War-Without-Victory/).

This standalone HTML viewer replays settlement control at every week of a saved campaign.
Faction colors always mean actual control. Historical mismatches are a separate overlay,
available only at the four reference checkpoints. Settlement selection works without tapping
small map polygons.

A mismatched cell is outlined in amber and carries a circle naming the faction that *should*
hold it, in that faction's color with a two-letter label (RB, RS, HR). The circle is painted
historical truth and never simulated control — the fill under it remains the actual
controller, so the two readings cannot be confused. The overlay is on by default and can be
switched off. It appears only at weeks 39, 104, 156 and 188, because painted historical truth
exists only there; at any other week a "mismatch" would just be the war not having happened yet.

The published snapshot is the clean 188-week Prusac candidate from simulation source
`efa53f55c34e4e9fe8ec8d4fe99ec01502ba1ed1`, final-save SHA-256
`575254183566bf2c7b4db3946217ddcce014317eb2232997e003964919cf10c3`.
Published 2026-09-22 from retained run artifacts, without another simulation.
Prusac falls at week 30 through Operation Donji Vakuf; the town and Korenići fall
at weeks 34 and 35. The four Jajce captures remain by week 39. Orašac falls at
week 53 and still misses the January deadline.

Checkpoint scores are **702 / 694 / 689 / 651** with **10 / 18 / 23 / 61** mismatches.
Engine health and all 31 anchors pass. January acceptance remains open (7/8 named
captures), and full-campaign acceptance remains NO-GO for the western cascade,
Farz attribution and inherited Prozor issue. The full suite exited nonzero with a
documentation length failure and a setup timeout; both categories passed targeted
verification. Publishing this measured candidate does not adopt a baseline or
approve a main-branch merge.

[Open this dataset](https://horkesh.github.io/A-War-Without-Victory/?run=efa53f55c).

The viewer is generated with `tools/calibration_timeline.mjs` in the project checkout:

```sh
node tools/calibration_timeline.mjs <saved-run-directory> --out index.html
```

The `gh-pages` branch contains only the public viewer snapshot and its publishing files.
Regenerating the viewer reads existing artifacts and does not run or change the simulation.
