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

The published snapshot is the 188-week POST-A run from simulation source
`ac3e5e1524558d2dc4e4fc40924306fc2873735a`, final-save SHA-256
`8e80eca07cf0317fd8775ab818bb10adade8230076b6bde99d2b3a0a082fecee`.
Published 2026-09-14 after the January 1993 operations repair; the mismatch overlay above was
added on 2026-09-16 with no change to the underlying run. Orašac is captured at
week 29; Donji Vakuf town, Korenići and Prusac at weeks 35, 36 and 39. The four Jajce
captures remain: Baljvine 28, Jezero 32, Donji Korićani 34 and Lupnica 36. All eight are
ordinary operation-owned combat captures.
Its checkpoint scores are 700 / 702 / 697 / 667. January's repair contract passes with
no new January mismatches; later calibration acceptance remains separate. This diagnostic
publication does not refresh the baseline or approve a main-branch merge.

[Open this dataset](https://horkesh.github.io/A-War-Without-Victory/?run=ac3e5e152).

The viewer is generated with `tools/calibration_timeline.mjs` in the project checkout:

```sh
node tools/calibration_timeline.mjs <saved-run-directory> --out index.html
```

The `gh-pages` branch contains only the public viewer snapshot and its publishing files.
Regenerating the viewer reads existing artifacts and does not run or change the simulation.
