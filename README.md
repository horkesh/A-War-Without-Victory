# A War Without Victory — calibration control timeline

[Open the interactive viewer](https://horkesh.github.io/A-War-Without-Victory/).

This standalone HTML viewer replays settlement control at every week of a saved campaign.
Faction colors always mean actual control. Historical mismatches are a separate overlay,
available only at the four reference checkpoints. Settlement selection works without tapping
small map polygons.

The published snapshot is the 188-week POST-A run from simulation source
`8db3055962143af8f272ef7cf5d95414e6c5a601`, final-state hash `c41dad9c3dba6a84`.
Updated on 2026-09-14 after the local occupation repair: Baljvine, Jezero, Donji Korićani
and Lupnica are captured at weeks 32, 33, 36 and 37 through ordinary military operations.
Its checkpoint scores are 696 / 690 / 687 / 659. This candidate has unresolved calibration
acceptance failures; publication of this diagnostic viewer is not acceptance of the engine run.

The viewer is generated with `tools/calibration_timeline.mjs` in the project checkout:

```sh
node tools/calibration_timeline.mjs <saved-run-directory> --out index.html
```

The `gh-pages` branch contains only the public viewer snapshot and its publishing files.
Regenerating the viewer reads existing artifacts and does not run or change the simulation.
