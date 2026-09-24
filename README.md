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

The published snapshot is the local 188-week Lukavac 93 military calibration
candidate, replayed on 2026-09-24 against the current painted references. Its
source checkout is marked dirty, so the viewer is **not an adopted calibration
baseline**. The saved run SHA-256 is
`a4079d59934a55cff78c0e3054c209f8810b34166ff719137662a4d31fec9bf2`.
The northern and southern VRS groups jointly take Trnovo through combat at
week 73; the southern Guards take Tošići at week 74, and the northern corridor
takes Delijaš, Mazlina and Podgrab. Brčko city and Donji Rahić remain RS-held.

Checkpoint scores are **707 / 702 / 697 / 664** with **5 / 10 / 15 / 48**
mismatches. Full-campaign acceptance remains NO-GO: the inherited Farz 95
corps-attribution guard and the Windows full-suite gate remain red. The ungated
western Bosnia cascade declines from 32 to 28 matched cells. Publication changes
no simulation source, reference, baseline pin or source branch.
Publishing this map does not adopt a baseline or approve a main-branch merge.

[Open this dataset](https://horkesh.github.io/A-War-Without-Victory/?run=lukavac-93-20260924).

The viewer is generated with `tools/calibration_timeline.mjs` in the project checkout:

```sh
node tools/calibration_timeline.mjs <saved-run-directory> --out index.html
```

The `gh-pages` branch contains only the public viewer snapshot and its publishing files.
Regenerating the viewer reads existing artifacts and does not run or change the simulation.
