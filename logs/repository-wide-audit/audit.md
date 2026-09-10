# Repository-wide first-principles audit — 2026-09-07

Read-only source audit. No implementation, roadmap expansion, baseline refresh, dependency install, or campaign run. The previously drafted four-item cleanup plan remains unchanged.

## Purpose and coverage

The product is a presidential strategy game: understand the situation, make consequential choices under constraints, and see credible consequences. Code earns its place by supporting that loop, historical integrity, reproducibility, or development of the shipped product. A second implementation, a permanently dormant feature, or an automated report does not earn its place merely by having tests.

Inventory covered 8,252 tracked files: 1,293 in src, 1,403 in tests, 563 in tools, 146 in scripts, 1,330 in data, and 3,210 in docs, plus assets/configuration. There are 315 root npm commands. Current discovery finds 1,348 Vitest files (1,316 fast / 32 scenario). These counts describe breadth, not quality or individually reviewed files.

Main review covered tooling, dependencies, CI, hooks, data packaging, and architecture/process authority. Independent Sol reviews covered simulation/state/scenario/AI and UI/desktop/IPC/recovery. Source tracing sampled representative architecture and followed specific candidate consumers. This is not an exhaustive symbol-level dead-code proof, security audit, historical adjudication, or live playthrough. No full test/build suite was run; live branch protection and deployed package contents were not inspected.

## Delete first

### D1. Remove 22 npm commands whose target files are absent

**Confidence: high for broken targets; confirm no documented generation contract before deletion.**

`package.json:76` exposes `sim:aorcheck` against missing `src/cli/sim_aorcheck.ts`; `:135` exposes `map:build:raw` against missing `scripts/map/build_raw_settlements_from_js.ts`; `:319` exposes another absent AoR audit. The complete 22-command list is in `inventory.json`, under `missingCommandPaths`.

Delete obsolete entries and correct their current documentation references. Do not rebuild deleted utilities merely to keep old command names alive. Six groups of aliases also exist, but aliases are not automatically waste: keep useful public entrypoints unless their names imply false scope (`test:ui` currently runs unsharded Vitest discovery).

Verification before adoption: confirm every retained command's target exists and required build/test workflows do not invoke a removed alias. The scan matched literal source/tool/script targets; it does not prove arbitrary shell command validity.

### D2. Delete abandoned operations-UI components and their exclusive test assertions

**Confidence: high from current source references.**

In `src/ui/map/components/plan_ui/`, `AxisAssessmentCard.tsx:27`, `CommanderAssessmentDoc.tsx:31`, and `TacticalCard.tsx:11` have no consumers outside their own definitions. `CommandTopBar.tsx:19` and `OpsMapRenderer.ts:67` have test consumers, but no production consumer found. The live card is `src/ui/map/components/TacticalCard.tsx:34`.

Delete those five abandoned components; remove only tests/assertions exclusively protecting them. Do not remove `ReadinessBar.tsx` or `opsConstants.ts`: the current operations modal imports them. Tests rendering or grepping abandoned UI are not evidence the player can reach it.

Verification: current import/HTML/build-entry search, typecheck, live operations-modal regression coverage and packaged modal smoke. Preserve accessibility coverage for the live modal.

### D3. Delete the orphan standalone-viewer bootstrap

**Confidence: high.**

`src/ui/warroom/map_viewer_standalone.ts:1` is an unused bootstrap. The actual HTML imports `map_viewer_app.ts` at `map_viewer_standalone.html:121`; Vite builds that HTML at `vite.config.ts:110`. Delete the unused TS file. This does not authorize removing the separate live standalone viewer or the Warroom recovery map.

### D4. Retire the fixed historical “state of the game” generator

**Confidence: high.**

`tools/audit/generate_state_of_game.ts:16` embeds a fixed v0.2 report asserting green typecheck, determinism and baselines. `:249-251` writes three strings into report files; it does not obtain current gate results. `tests/audit_state_of_game_determinism.test.ts:49-92` repeatedly runs it and checks timestamps, sorting and byte equality, not truth.

Delete the current `audit:state` command, generator, and generator-only tests. Preserve useful generated historical evidence as history. Do not replace this with another reporting framework: current results belong in existing verification receipts and the roadmap.

### D5. Retire the obsolete generic orphan-audit command

**Confidence: high that it is unreliable as a deletion guide.**

`scripts/repo/cleanup_audit.ts:147` appends suffixes without resolving a `.js` specifier to a `.ts` source. An isolated execution of its actual resolver returned nonexistent `src/sim/run_early_war_browser.js` for a live import whose source is `src/sim/run_early_war_browser.ts`. See `tooling-controls.json`. Its scan also omits `.cjs` and `.mjs` (`:249`), and its “tracked” set is a filesystem walk rather than Git tracking.

Remove `repo:cleanup:audit` and the misleading generic scanner unless a concrete consumer needs a repaired tool. Prefer targeted compiler/build-entry tracing for actual deletions. This is not authority to delete files it labels orphan candidates.

### D6. Remove obsolete RE hook-installation machinery from the active tool surface

**Confidence: high for retirement; inspect other worktrees before physical removal.**

`.husky/pre-commit:3` explicitly records owner retirement of the scope lock. Yet `package.json:12-14` still exposes its checker, installer and verifier, with two dedicated PowerShell test suites. `.githooks/README.md:3` separately claims `.githooks` is active, while current local `core.hooksPath` is `.husky/_` and package preparation uses Husky.

Retire the three RE commands, obsolete installation/check scripts and exclusive tests once external/worktree hook references are checked. Retain the actual current typecheck and Git LFS hooks. Correct the competing hook instructions; do not install a new governance system to replace a closed one.

### D7. Retire the empty legacy engine behind npm start

**Confidence: high for empty behavior; intentional smoke role must be preserved elsewhere.**

`package.json:17` routes `npm start` to `src/index.ts`, which labels itself a smoke entrypoint and imports `executeTurn`. `src/turn/steps.ts:4` is an empty registry; `src/turn/pipeline.ts:28-45` clones/increments and runs it. The review found the root entry and dedicated legacy test as its consumers.

Remove the parallel `src/turn/*` abstraction and its exclusive tests; give `npm start` a deliberate product or clearly named smoke meaning. Keep a tiny smoke against a real canonical path if required. Do not confuse this with `src/state/turn_pipeline.ts`, which still supports peace scenarios/tests and is not proven dead.

## Simplify after deletions

### S1. Use one dependency-version authority for the map and its tests

**Confidence: high for version split and compensating complexity.**

Root and `src/ui/map/package.json` overlap on 16 dependency names. Actual locks resolve MapLibre 5.24.0 vs 4.7.1, PMTiles 4.4.1 vs 3.2.1, Turf helpers/Bezier 7.3.4 vs 6.5.0, and Deck mapbox 9.3.3 vs 9.2.11. React currently resolves identically; declared range differences alone do not prove a runtime mismatch.

`tools/test/vitest_shared_config.mjs:5-22` documents prior failures caused by nested copies and forces root aliases; the map Vite config does not impose equivalent library aliases. This undermines the assumption that test module resolution equals shipped module resolution.

Choose and validate one supported version set, then consolidate ownership/installation (a single dependency graph or workspace with one lock). Do not blindly upgrade to whichever root version is newer. Remove compensating aliases only after all runners and production builds resolve the intended same packages. Validate actual map rendering, PMTiles, mocks and package build.

### S2. Remove repeated validation execution, preserving distinct acceptance

**Confidence: high for repeated commands; live required-check names not inspected.**

Standalone `.github/workflows/typecheck.yml` and the baseline workflow both install the two package trees and run root typecheck; Event System CI repeats typecheck again. All 27 executable test paths listed by Event System CI are already in current full-suite discovery (`test-overlap.json`). That workflow also runs on both feature-branch pushes and PRs.

The master global command list runs `canon:check` and then `test:baselines`, although `tools/engineering/canon_check.ts:43-47` already invokes baseline regression when the manifest exists. That regression currently runs the 188-week master.

Keep one execution owner for each identical check. Preserve deliberate fast-feedback slices only where their latency has value. Preserve strict canon visibility, baseline comparison, structural fingerprints, engine health and packaged tests: these answer different questions. Do not delete Event System CI wholesale because its test subset overlaps; its baseline work is distinct from a full unit-test run. Inspect branch protection before retiring status names. No runtime-cost savings were measured.

### S3. Exclude research outputs from the release payload

**Confidence: high for config inclusion; package-size effect unmeasured.**

`package.json:382-387` copies essentially all of `data/derived`. The tracked `data/derived/scenario` tree contains 239 research output files across old sensitivity runs, recruitment matrices and sweeps, totaling 53,031,799 raw bytes, plus the baseline manifest. None of those research families is excluded by the declared filter. See `package-data-candidates.json`.

Retain research/provenance in the repository where required, but remove confirmed development-only outputs from the shipping input set. Use the existing resource-route inventory and runtime consumers to establish the allowed set. A literal-reference absence does not prove a resource is unused; generic routes and dynamic filenames exist. Do not remove source history, geometry or startup data merely because it is large.

### S4. Finish the shared turn-input ownership boundary

**Confidence: high from loader and entrypoint tracing; no corrupt-install runtime reproduction.**

`src/scenario/turn_inputs.ts:14-22` says duplicate loading recreates desktop/calibration drift. The aggregate loader is used by desktop, while `src/scenario/scenario_runner.ts:1531-1591` retains inline input assembly and later passes it at `:2618-2625`. Consolidate the actual shared preparation path, allowing already-loaded inputs to avoid new I/O.

The helper also catches all read/parse failures and returns undefined (`turn_inputs.ts:49-125`); its header documents that missing population inputs disable formation eligibility checks. The scenario preflight registry (`src/data_prereq/data_prereq_registry.ts:8-31`) covers controller mapping and settlement graph inputs, not these census/ethnicity files, and its checks are existence-only. Desktop advance calls the shared loader without equivalent prerequisite validation. This is a production data-integrity concern, not merely cleanup. Distinguish deliberate fixture omission from corrupt production data and reject invalid required production inputs. Do not turn every optional field into a mandatory input indiscriminately. Preserve existing keying, ordering and historical lookups; require controlled equivalence evidence before adoption.

### S5. Resolve optional external-AI authority before adding more AI features

**Confidence: high for overwritten corps stance outputs and unordered logging; campaign impact unmeasured.**

In non-cadet modes with a configured client, `war_phases.ts:2269-2294` applies external corps decisions; `corps_commander_ai.ts:108-142` writes stance and sector stances. Later deterministic corps-order generation recomputes corps stance (`bot_corps_stance.ts:75-115`), applies an army-level override (`:292-305`), evaluates sector stances and applies commander output (`bot_corps_ai.ts:396-425`, `commander_loop.ts:203-225`). Corps-specific stance outputs are overwritten before the commander briefing consumes the recomputed state. Army-level AI intent is consumed and assessment text remains, so this is not a total external-AI failure. The default cadet mode skips this external path.

Choose a clear contract: external AI proposes bounded inputs to the canonical commander, or that execution mode owns specified outputs. Prefer removing competing mutation authority over maintaining two systems that both claim the last word. This is a product decision for optional modes, not a reason to rewrite the default deterministic commander.

Concurrent generators append to shared `ai_decision_log` on response completion (`war_phases.ts:2255`, `army_commander_ai.ts:37-54`, `decision_log.ts:10-15`). Identical decision payloads can therefore have different recorded array order. Latency metadata is also logged. Separate asynchronous acquisition from ordered state application and keep runtime telemetry outside canonical deterministic evidence as appropriate. Test permuted completion order explicitly; do not describe temperature zero or a replay log alone as determinism proof.

## Decisions to defer; sound architecture to retain

- The standalone legacy map is a built production entry, not dead code. Decide whether it remains a development tool before removing it from release inputs. Preserve the separate Warroom recovery map until equivalent recovery exists.
- Do not split `electron-main.cjs` merely because it is large. First preserve one serialized state transaction and identify concrete duplicate work. A new registrar/manifest framework is not justified by line count alone.
- IPC declarations do repeat across preload/types/wrapper. Consolidate truly repeated declarations when a real channel change needs it; do not add code generation as the first response.
- Retain main-process player-visible/FOW projection, renderer validation of player-safe state, and canonical write/autosave/broadcast ownership. These are intentional boundaries, not duplicate truth.
- Retain the canonical war pipeline, commander perception/assessment/allocation/planning stages, transient-state serialization boundary and shared startup canonicalization.
- Retain historical/counterfactual branches, event pacing limits, provenance, and distinct scenario/health/packaged checks. Quiet weeks and absent event firings alone prove neither missing agency nor dead code.
- The four-item cleanup already planned remains valid as a separate bounded packet. This audit does not silently enlarge it.

## Recommended order and evidence limits

1. Delete broken command entries, orphan UI/bootstrap, obsolete report/scanner tools and retired hook surface after consumer confirmation.
2. Retire the empty smoke engine, preserving a meaningful smoke entrypoint.
3. Consolidate dependency ownership, remove repeated validation execution and narrow shipped research data.
4. Take shared-input and external-AI authority changes as separate, behavior-sensitive work with their own acceptance evidence.

The large opportunity is deleting obsolete scaffolding and duplicate ownership around the game. There is no evidence here supporting a wholesale simulation rewrite or a new optimization/automation programme.

Evidence files: `inventory.json`, `tooling-controls.json`, `test-overlap.json`, `package-data-candidates.json`. These were produced by read-only source/configuration scans; the orphan-resolver control executed only the isolated resolver, not the report-writing command. An independent challenge pass confirmed D1/D4/D5 and retained the historical-output preservation caveat. A targeted engine qualification confirmed S4's missing prerequisite coverage and narrowed S5 to corps-specific outputs. No claim of whole-suite green or full runtime equivalence is made.
