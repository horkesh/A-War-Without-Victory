# Census scripts for the unheld-pockets diagnosis

Run them from the repo root against a 188w run directory (`R=runs/<run>`). They are read-only.

- `node pockets.cjs $R out.json` is the per-turn pocket census: control replay, connected components, own formations inside each pocket. Use `--max-old-space-size=8000`.
- `node show.cjs out.json` prints the pockets at t39/104/135/156/188 and the long-lived pocket records.
- `node region.cjs out.json` lists the western-Bosnia pockets and their fates.
- `node resolve.cjs $R out.json` shows how every post-week-20 unheld pocket was resolved, and by which operation.
- `node battles.cjs $R <osid,...>` lists battles at the given cells.
- `node cells.cjs $R <osid,...>` compares sim with the painted reference at four checkpoints.
- `node locate.cjs` georeferences the owner screenshot to OSIDs.

Reference run: main `e07847268` (#600), final hash `53ffe8e9545686ad`, checkpoints 712/709/710/705.
- `node savecheck.cjs <save.json>` inspects a desktop save: autonomy, pocket cells, RS commander status, operation history.
- `node t136.cjs <save.json> <T> [label] [keys]` gives small pockets at turn T (replayed from control_events) and the operation tally.
