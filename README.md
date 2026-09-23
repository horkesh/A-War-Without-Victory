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

The published snapshot is the local 188-week Orašac operation candidate generated
2026-09-23 from retained run artifacts. Its source checkout is marked dirty, so
the viewer is **not an adopted calibration baseline**. The saved run SHA-256 is
`0c86638f9e2042d5c00452d15f69877e72cdf041c29cdbd1e17c7768f424d303`.
Orašac falls at week 1 through the Bosanska Krupa Takeover operation.

Checkpoint scores are **703 / 692 / 688 / 654** with **9 / 20 / 24 / 58**
mismatches. All eight named January captures occur by week 39. Full-campaign
acceptance remains NO-GO on the Farz attribution and western cascade gates.
Publishing this map does not adopt a baseline or approve a main-branch merge.

[Open this dataset](https://horkesh.github.io/A-War-Without-Victory/?run=orasac-axis-20260923).

The viewer is generated with `tools/calibration_timeline.mjs` in the project checkout:

```sh
node tools/calibration_timeline.mjs <saved-run-directory> --out index.html
```

The `gh-pages` branch contains only the public viewer snapshot and its publishing files.
Regenerating the viewer reads existing artifacts and does not run or change the simulation.
