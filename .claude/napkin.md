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
2. **[2026-07-15] Campaign QA stays local until the owner reopens release work**
   Do instead: retain RBiH v47 and RS v17 as accepted local comparison evidence; keep D2 owner play as the separate release gate and do not stage, commit, push, package, release, or infer remote status.
3. **[2026-07-07] WP-9 diaries outrank speculative UI backlog**
   Do instead: use docs/40_reports/playtests/TEMPLATE.md; top-three diary friction items move to the front before new polish.
4. **[2026-07-09] CA-2/CA-3 Command Authority is merged**
   Do instead: keep Section 6 income exclusions binding, preserve headless byte-identical output, and treat WP-9 owner diaries as the current release-path action.
5. **[2026-07-08] RR2 packets do not displace D2 path**
   Do instead: execute RR2 cleanup/audit work only within its stop gates; keep WP-9 first and CA proof/merge as the Command Authority companion lane.

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
7. **[2026-07-12] Electron replay proof is an exact-turn hard gate**
   Do instead: bind the actual Electron log and autosave; validate scenario/faction/full control timeline, tour all required surfaces, enforce 12px unclipped essential text and clean runtime/network output, and retain Records/Chronicle screenshot evidence.
8. **[2026-07-17] CI tests cannot depend on local evidence roots**
   Do instead: keep executable QA harnesses under tracked `tools/`; write generated screenshots, saves, and logs under excluded `tmp-*` roots, and prove harness contracts from a clean-checkout path.

## Domain Behavior Guardrails
1. **[2026-07-06] Player-only state is gate-invisible**
   Do instead: pin campaign integrals in contract tests; validate feel through owner diaries.
2. **[2026-06-26] Missing data is unreported, not favorable**
   Do instead: preserve null/reported flags and render Unreported; keep explicit zeroes as zeroes.
3. **[2026-06-24] Modal-required blockers are required regardless of visual severity**
   Do instead: derive Desk/pre-advance blockers from blocker contracts, not card severity alone.
4. **[2026-07-15] Operation authorization is factual and identity-stable**
   Do instead: use advisory copy and scenario-plan goals/force/command facts for `HISTORICAL_OP:*`; for ordinary Level-1 plans, emit only ready plans with targets, key the decision by exact corps+plan, and retain the resolution until admission/no-reprompt ownership is complete.
5. **[2026-07-10] Advisory copy follows blocker predicates**
   Do instead: use required-response copy only when the same row is a true blocker; filter decided paramilitary rows from manifests and preserve request mode metadata for truthful packets.
6. **[2026-07-11] Level 1 assisted execution is explicit broad staff control**
   Do instead: keep Level 0 manual except accepted `HISTORICAL_OP:*` participants; Level 1+ includes `player_faction` in deterministic corps/brigade staff execution via a merge pass that preserves player-staged attack/movement/posture orders; headless auto-control stays separate.
7. **[2026-07-15] Player/headless equivalence requires bound inputs, not matching labels**
   Do instead: inject accepted pre-planned operations before lifecycle advancement using `resolved_turn`; bind the Electron log/autosave and record target scope, event mode, decision timing, Army HQ ownership, proposals, and transcript. Name player paramilitary scope as unrestricted municipality selection with undefended-only generation. Categorize Electron-only actions as input divergence; only identical state plus phase inputs support nondeterminism claims.
8. **[2026-07-13] Paramilitary truth has one bounded lifecycle and three ledgers**
   Do instead: reject exact and adjacent organized defense before dispatch; expire spawning and active formations after week 20; dissolve to inactive/disbanded/degraded with zero personnel; write civilian deaths to casualty, event, and municipal `lost_population` ledgers; attribute captures as `paramilitary`, never combat. If defense arrives after dispatch, retreat and dissolve without capture or defender losses.
9. **[2026-06-24] Srebrenica/Zepa fall receipts are event-owned**
   Do instead: keep Krivaja/Stupcanica as chronology/AAR context, not fall-delivery tuning.
10. **[2026-07-12] Records owns operation truth; Chronicle owns one narrative**
   Do instead: project active/history lifecycle once with stable IDs and explicit exclusions; count AAR captures only from attack-backed receipts; grade zero attempts as one-star no-assault with no duration reward; cap ending-force scoring at 100; let Records show the full ledger; and let Chronicle emit exactly one entry per visible completion.

## Map & UI Shell
1. **[2026-07-05] Deck counters are screen symbols, not terrain decals**
   Do instead: keep tactical Deck overlay non-interleaved and counter/label layers depth-disabled.
2. **[2026-07-09] Critical counters do not wait for idle**
   Do instead: render the DOM fallback as soon as control GeoJSON is ready; keep optional overlay sources out of counter readiness gates.
3. **[2026-07-12] Tactical readiness is state-revision readiness**
   Do instead: keep the loading surface active until the required control source and formation counters have rendered for the current turn and loaded-save fingerprint; timeout only required-source failure and leave optional MapLibre errors diagnostic.
4. **[2026-07-04] Stack counters in pixels, not coordinates**
   Do instead: anchor to OSID coordinate, apply Deck pixel offsets, and verify against live UI occluders by screenshot.
5. **[2026-06-25] Formation physical anchors differ from navigation anchors**
   Do instead: use physical location_osid for counters, hovers, stacks, arrows, and settlement truth.
6. **[2026-06-26] Global shortcuts respect focused controls**
   Do instead: guard app-level handlers with interactive-focus checks and use modified shortcuts for global cycling.
7. **[2026-07-12] Map context and telemetry must be bounded**
   Do instead: clear tactical overlays/selections before Warroom transitions; release MapLibre/Deck contexts and callbacks on unmount; expose only bounded aggregate formation-counter status in DOM telemetry.
8. **[2026-07-12] Named counter controls own exact selection**
   Do instead: synchronize accessible DOM counters on camera movement, filter live chrome occluders, and open the button's exact formation id even when its OSID is stacked; keep generic Deck hits stack-aware.
9. **[2026-07-12] QA routes must be visibly mounted**
   Do instead: require visible parent surface, visible target control, and visible changed destination; hidden React/Warroom copies in the DOM are not player-reachable proof.
10. **[2026-07-15] Modal completion actions stay outside narrative scrolling**
   Do instead: keep the only acknowledge/commit action in a persistent footer and scroll the long dispatch body independently; pin DOM ownership and inspect a real Electron viewport.

## Engine Runtime Patterns
1. **[2026-07-13] Terminal lifecycle truth must close live synthetic commands**
   Do instead: project authoritative event flags through persisted lifecycle state, retire synthetic commands only after spawned subordinates are gone, and hide them from live UI without deleting historical AARs.
2. **[2026-06-30] War spawn directives run during War turns**
   Do instead: run deterministic pool-to-formation spawning before reinforcement for spawn-capable directives.
3. **[2026-06-30] Final geometry can reopen front-sector coverage**
   Do instead: rerun dropped-front recovery after final-save geometry projection and classify no-donor scarcity honestly.
4. **[2026-06-29] Sector defense cannot suppress local militia floor**
   Do instead: merge physical target defenders first and preserve the shared militia-defense floor.
5. **[2026-06-23] Same-faction sector edge ownership is singular**
   Do instead: canonicalize duplicate sector edge ownership deterministically after side-coverage recovery.
6. **[2026-05-22] COHA expiry must clear combat suppression**
   Do instead: set coha_active: false on expiry; history flags alone must not suppress late-war combat.
7. **[2026-07-12] Desktop mutations are serialize-autosave-broadcast transactions**
   Do instead: converge mutating IPC on the canonical helper, roll back in-memory serialization on autosave failure, and broadcast the persisted state to every renderer including the caller.
8. **[2026-07-12] Recruitment shares eligibility and physical placement truth**
   Do instead: use one evaluator for catalog/apply, preserve autonomy 0/1 player exclusion and autonomy 2+ staff control, and require a controlled home-municipality `location_osid`; command anchors are not placement.
9. **[2026-07-15] Active assignments retain transit intent**
   Do instead: while an elite loan remains active and the formation is outside receiving territory, retain or reacquire a valid deterministic column order; match simultaneous reserve requests globally so one brigade cannot satisfy multiple requests.
10. **[2026-07-15] Empty fronts require call-chain and movement proof**
   Do instead: verify canonical helpers have production callers; distinguish legal isolation from reachable gaps; resolve reachable gaps through explicit T1 intent, T2 routing, and delayed T3 movement, while marking no-donor sectors `unstaffed_front` instead of teleporting or paper-staffing.

## Shell & Command Reliability
1. **[2026-06-06] Windows-safe local CLIs are repo contract**
   Do instead: use local package entrypoints or repo wrappers; do not rely on PATH/.bin luck.
2. **[2026-06-26] Generic abort filters are too broad**
   Do instead: ignore only deliberate subframe or named teardown aborts; keep real request failures reportable.
3. **[2026-06-26] Browser gates use tileless proof by default**
   Do instead: let gate launchers disable PMTiles unless the test explicitly needs tile binaries.
4. **[2026-07-12] Direct Electron QA requires its tactical Vite host**
   Do instead: start `npm.cmd run dev:map -- --port 3002 --strictPort`, verify HTTP readiness, then launch the direct Playwright/Electron harness; classify missing-host startup timeouts as harness precondition failures.
5. **[2026-02-21] Avoid giant expanded path lists**
   Do instead: run rg on roots or use targeted file lists when the repo has huge generated/vendor directories.
6. **[2026-07-17] Poll browser-owned fixture status**
   Do instead: start large renderer save loads behind a unique token and poll synchronous browser-owned status from Node; do not directly await a churn-prone renderer promise through `Runtime.callFunctionOn`.

## User Directives
1. **[2026-07-08] Execute plans through their stop gates**
   Do instead: when a packet says stop-and-report, file the proof/report rather than forcing an unsafe edit.
2. **[2026-06-20] Do not edit FORAWWV automatically**
   Do instead: flag design insights for a Pyrrhic panel; only edit canon with explicit approval.
3. **[2026-06-26] Packaging remains paused until owner satisfaction**
   Do instead: use release checks/probes as verification, but do not create installer/release artifacts as product work before D2/D3 gates.
