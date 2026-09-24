# A War Without Victory — calibration control timeline

[Open the interactive viewer](https://horkesh.github.io/A-War-Without-Victory/).

This standalone HTML viewer replays settlement control at every week of a saved campaign.
Faction colors always mean actual control. Historical mismatches are a separate overlay,
available only at the four reference checkpoints. Settlement selection works without tapping
small map polygons.

Use the + and - map buttons or mouse wheel to zoom; drag to pan. On a touch screen,
pinch with two fingers. Reset fits the whole map. When the map has keyboard focus,
+ / - zoom and 0 resets. Changing weeks preserves the map view and selection.

A mismatched cell is outlined in amber and carries a circle naming the faction that *should*
hold it, in that faction's color with a two-letter label (RB, RS, HR). The circle is painted
historical truth and never simulated control — the fill under it remains the actual
controller, so the two readings cannot be confused. The overlay is on by default and can be
switched off. It appears only at weeks 39, 104, 156 and 188, because painted historical truth
exists only there; at any other week a "mismatch" would just be the war not having happened yet.

The published snapshot is the local 188-week Sebiočina operation and Brčko defense
candidate generated 2026-09-24 from retained run artifacts. Its source checkout is marked dirty, so
the viewer is **not an adopted calibration baseline**. The saved run SHA-256 is
`8262413bcf258e15e4e8a7dfc2853cc75d776230f49241e546afd31016f47d73`.
RBiH captures Sebiočina at week 15 through Srebrenica–Cerska Link-Up; VRS
retakes it at week 45 through Operation Cerska–Kamenica. Brčko and Donji Rahić
remain RS-held throughout the run. The January painted reference includes
Doljani as HRHB.

Checkpoint scores are **706 / 696 / 689 / 661** with **6 / 16 / 23 / 51**
mismatches. Full-campaign acceptance remains NO-GO on inherited Farz attribution
and Prozor operation-injection gates; the required full test suite has not been
rerun after the corrected startup snapshot.
Publishing this map does not adopt a baseline or approve a main-branch merge.

[Open this dataset](https://horkesh.github.io/A-War-Without-Victory/?run=sebiocina-20260924).

The viewer is generated with `tools/calibration_timeline.mjs` in the project checkout:

```sh
node tools/calibration_timeline.mjs <saved-run-directory> --out index.html
```

The `gh-pages` branch contains only the public viewer snapshot and its publishing files.
Regenerating the viewer reads existing artifacts and does not run or change the simulation.
