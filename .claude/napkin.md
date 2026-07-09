# Napkin Runbook Index

## Curation Rules
- Read this index every session; read topic archives only when relevant.
- Max 10 entries per category; adding an index entry must evict or demote one from that category.
- Keep recurring, high-value rules only; each entry includes a date and Do instead action.
- Full pre-restructure archive: [full_archive_20260708.md](napkin/full_archive_20260708.md).
- Topic archives: [QA gates](napkin/qa_gates.md), [unreported sparse truth](napkin/unreported.md), [map counters](napkin/map_counters.md), [release process](napkin/release_process.md), [engine runtime](napkin/engine_runtime.md), [Warroom/legacy](napkin/warroom_and_legacy.md).

## Current Release State
1. **[2026-07-07] Technical road to 1.0 is closed**
   Do instead: keep current path as WP-9 owner friction diaries -> D2 owner full-campaign playthrough -> D3 operator release gate -> D4 final docs/release sweep -> 1.0 tag.
2. **[2026-07-07] WP-9 diaries outrank speculative UI backlog**
   Do instead: use docs/40_reports/playtests/TEMPLATE.md; top-three diary friction items move to the front before new polish.
3. **[2026-07-09] CA-2 is the live Command Authority companion lane**
   Do instead: implement only the CA-1 political-income verdict; keep Section 6 income exclusions binding and prove headless byte-identical output.
4. **[2026-07-08] RR2 packets do not displace D2 path**
   Do instead: execute RR2 cleanup/audit work only within its stop gates; keep WP-9 first and CA-2 as the Command Authority companion lane.

## Execution & Validation
1. **[2026-06-30] Vite warnings are release-surface failures**
   Do instead: remove browser Node edges/static-dynamic overlap and run npm run qa:player-experience for release-facing player-experience sweeps.
2. **[2026-06-26] Browser gates must watch network failures**
   Do instead: collect requestfailed and HTTP >=400, ignoring only deterministic teardown noise.
3. **[2026-06-26] Packaged runtime resources are release inputs**
   Do instead: keep desktop/full-suite filters covering data/derived, data/ui, scenarios, assets, icons, package locks, and release workflow edits.
4. **[2026-06-26] Trusted CI detectors must restore HEAD**
   Do instead: run trusted base detector, then restore detector scripts from HEAD before setup/build/test.
5. **[2026-07-06] Output-changing branches need baseline reconciliation**
   Do instead: run npm.cmd run test:baselines; if intentional, refresh with the documented strict rerun path and ledger note.
6. **[2026-07-07] Engine-health refloors use the gate path**
   Do instead: reproduce with engine_health_gate.cjs, update through the gate command, rerun strict JSON, and record evidence.

## Domain Behavior Guardrails
1. **[2026-07-06] Player-only state is gate-invisible**
   Do instead: pin campaign integrals in contract tests; validate feel through owner diaries.
2. **[2026-06-26] Missing data is unreported, not favorable**
   Do instead: preserve null/reported flags and render Unreported; keep explicit zeroes as zeroes.
3. **[2026-06-24] Modal-required blockers are required regardless of visual severity**
   Do instead: derive Desk/pre-advance blockers from blocker contracts, not card severity alone.
4. **[2026-06-24] Srebrenica/Zepa fall receipts are event-owned**
   Do instead: keep Krivaja/Stupcanica as chronology/AAR context, not fall-delivery tuning.
5. **[2026-03-08] Timeline JSON is doctrine source of truth**
   Do instead: edit timeline JSON before code constants when doctrine phases disagree.

## Map & UI Shell
1. **[2026-07-05] Deck counters are screen symbols, not terrain decals**
   Do instead: keep tactical Deck overlay non-interleaved and counter/label layers depth-disabled.
2. **[2026-07-04] Stack counters in pixels, not coordinates**
   Do instead: anchor to OSID coordinate, apply Deck pixel offsets, and verify against live UI occluders by screenshot.
3. **[2026-06-25] Formation physical anchors differ from navigation anchors**
   Do instead: use physical location_osid for counters, hovers, stacks, arrows, and settlement truth.
4. **[2026-06-26] Global shortcuts respect focused controls**
   Do instead: guard app-level handlers with interactive-focus checks and use modified shortcuts for global cycling.
5. **[2026-07-08] Startup/package contracts define live UI shells**
   Do instead: before deleting UI shell code, prove deadness across package scripts, Electron protocol, probes, workflows, tests, and docs.

## Engine Runtime Patterns
1. **[2026-06-30] War spawn directives run during War turns**
   Do instead: run deterministic pool-to-formation spawning before reinforcement for spawn-capable directives.
2. **[2026-06-30] Final geometry can reopen front-sector coverage**
   Do instead: rerun dropped-front recovery after final-save geometry projection and classify no-donor scarcity honestly.
3. **[2026-06-29] Sector defense cannot suppress local militia floor**
   Do instead: merge physical target defenders first and preserve the shared militia-defense floor.
4. **[2026-06-23] Same-faction sector edge ownership is singular**
   Do instead: canonicalize duplicate sector edge ownership deterministically after side-coverage recovery.
5. **[2026-05-22] COHA expiry must clear combat suppression**
   Do instead: set coha_active: false on expiry; history flags alone must not suppress late-war combat.

## Shell & Command Reliability
1. **[2026-06-06] Windows-safe local CLIs are repo contract**
   Do instead: use local package entrypoints or repo wrappers; do not rely on PATH/.bin luck.
2. **[2026-06-26] Generic abort filters are too broad**
   Do instead: ignore only deliberate subframe or named teardown aborts; keep real request failures reportable.
3. **[2026-06-26] Browser gates use tileless proof by default**
   Do instead: let gate launchers disable PMTiles unless the test explicitly needs tile binaries.
4. **[2026-02-21] Avoid giant expanded path lists**
   Do instead: run rg on roots or use targeted file lists when the repo has huge generated/vendor directories.

## User Directives
1. **[2026-07-08] Execute plans through their stop gates**
   Do instead: when a packet says stop-and-report, file the proof/report rather than forcing an unsafe edit.
2. **[2026-06-20] Do not edit FORAWWV automatically**
   Do instead: flag design insights for a Pyrrhic panel; only edit canon with explicit approval.
3. **[2026-06-26] Packaging remains paused until owner satisfaction**
   Do instead: use release checks/probes as verification, but do not create installer/release artifacts as product work before D2/D3 gates.
