# A War Without Victory — calibration control timeline

[Open the interactive viewer](https://horkesh.github.io/A-War-Without-Victory/).

This standalone HTML viewer replays settlement control at every week of a saved campaign.
Faction colors always mean actual control. Historical mismatches are a separate overlay,
available only at the four reference checkpoints. Settlement selection works without tapping
small map polygons.

The published snapshot is the 188-week POST-A run from simulation source
`51fe494151397c1cc6521b54006b0f8da70705e5`, final-state hash `5d6f8378dbf433fc`.
Its checkpoint scores are 692 / 698 / 694 / 665. This candidate has unresolved calibration
acceptance failures; publication of this diagnostic viewer is not acceptance of the engine run.

The viewer is generated with `tools/calibration_timeline.mjs` in the project checkout:

```sh
node tools/calibration_timeline.mjs <saved-run-directory> --out index.html
```

The `gh-pages` branch contains only the public viewer snapshot and its publishing files.
Regenerating the viewer reads existing artifacts and does not run or change the simulation.
