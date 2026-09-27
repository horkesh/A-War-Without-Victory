# A War Without Victory — calibration control timeline

[Open the Doljani candidate map](https://horkesh.github.io/A-War-Without-Victory/?run=doljani-20260927).

This page replays the saved **188-week Doljani timing candidate** from `apr1992_definitive_188w__6deb5845c150c196__w188_n13`. The run came from a dirty local worktree and is **not an adopted baseline**. Its saved final state has SHA-256 `ee5dbfb8f42e7d147e046ad7ffe1b494ded34eec45d3d84f69069d586a347558`.

Against the unchanged painted references, the checkpoints are **707/712** in January 1993, **707/712** in April 1994, **701/712** in April 1995, and **664/712** in October 1995. There are respectively **5, 5, 11, and 48** mismatched cells. The run contains **235** saved control events. The map draws **744** polygons and scores **712** OSIDs.

To inspect the Doljani result, select **April 1994 (w104)** and search for `op:jablanica:doljani_2`. The map shows simulated **RBiH** and painted **RBiH** control. The saved run records an ordinary RBiH combat capture at turn 57; Doljani remains RBiH at w104. At that checkpoint, `op:prozor:ljubunci_2`, `op:prozor:lug_2`, and `op:prozor:paros` are **HRHB**. `op:maglaj:jablanica` remains a parked mismatch: simulated **RS**, painted **RBiH**.

Faction colors show simulated control at each week. At measured checkpoints, amber outlines indicate mismatches, and colored circles show the painted controller. Use search or click a cell to inspect it. Zoom with the map buttons, mouse wheel, or touch pinch; drag to pan. Historical mismatch comparison exists only at the four checkpoints.

The standalone HTML was generated from the saved run with `tools/calibration_timeline.mjs`. Publication changes the viewer only. The required full Vitest suite and the 188-week Farz P-A checkpoint guard remain red, and the candidate has one HVO Central Bosnia critical anomaly. This map is for inspection; it does not change the simulation, painted references, or baseline status.
