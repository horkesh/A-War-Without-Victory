## 2026-11-15 — Ending truth pass: render check, chunk-size gate and three defects it found

Follow-up to the 2026-11-14 ending truth pass (PR #635), after merging origin/main.

- **Chunk-size gate (full-suite player-experience gate).** Two independent warnings, neither fixed by
  raising a limit or loosening the gate. The tactical-map entry chunk sat at the 3000 kB limit: the Verdict
  screen is now a `React.lazy` + `Suspense` import in `src/ui/map/App.tsx`, so it loads when a game ends.
  The warroom build's `playerSafeText` chunk reached 913.87 kB against a 900 kB limit: the two message
  catalogs (`messages.en.ts`, `messages.bcs.ts`, both leaf modules) are now their own chunks through
  `manualChunks` in `src/ui/warroom/vite.config.ts`. They still load eagerly. `desktop:map:build`,
  `warroom:build` and `npm run qa:player-experience` print no chunk-size warning.
- **Defect found by the render check: raw collapse label.** A collapse ending showed
  `faction collapse:RS:winner:RBiH` as its outcome label. `src/sim/negotiation/scoring.ts` now labels
  every termination outcome the engine writes (`faction_collapse:<side>:winner:<side>` → "Faction
  Collapse", `mutual_collapse` → "Mutual Collapse"); test in `tests/scoring.test.ts`.
- **Defect found by the render check: unstyled signing beat on a loaded finished game.**
  `DaytonSigningBeat` uses `.dayton-live-*` classes defined in `live.css`, which only the conference room
  imported. Loading a finished save opens the Verdict on the beat without the room, so it rendered with
  browser-default buttons and headings. The beat now imports `live.css` first; test in
  `tests/ui/dayton_signing_beat_styles.test.ts`.
- **Tooling.** `tools/ui/paradox_local_qa.cjs` gains `--endgame-render-tour`, `--viewport WxH` and
  `--device-scale`, and its readability gate treats a labelled, focusable scroll region as keeping its
  text reachable (the Verdict share summary). `tools/ui/ending_truth_browser_proof.mjs` renders real
  engine endings at 1280×720, 768×1024 and 375×812 in EN and BCS against the vite dev server.
- **Render evidence.** Packaged app: RBiH A-grade ending at 1280×720, 1920×1080, 1280×720 at 125% and
  150%; Dayton review rail, focus order and cap warning; signing beat; Verdict text agrees with the
  Dayton text (signed settlement caps the A-grade at Hollow Victory, same settlement share, same date).
  Browser rig: BCS, RS, HRHB focus, stalemate, collapse, narrow widths.
- **Not done / reported, not fixed here.** Signing-plate captions are 3.4–11 px by design (plate art
  scales with its container); delegation-folder chip contrast 4.31/4.36; at 375 px the Verdict faction
  tiles break words mid-word; the Dayton delegation sheet's paramilitary count and the "Sustained Refusal"
  card disagree; the `us_halts_federation_advance_1995` default shows no visible source note.
