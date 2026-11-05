# Player-experience completion — 2026-11-05

## Outcome and authority

Owner authorized branch/worktree isolation, plan, implementation, verification and independent review. Base main `f0d77121c`; branch `codex/player-experience-completion`; worktree `F:/AWWV-worktrees/player-experience-completion`. Claude owns calibration in a different worktree. Coordination is append-only `F:/AWWV-coordination/CODEX_CLAUDE_HANDOFF.md`, reservation CX-20261105-012.

Deliver a reliable, accessible renderer sound/control experience using existing actions and player-visible data. Preserve visual equivalents and fail silently on missing optional audio. Human listening, sensitivity/design approval, full packaged R7 acceptance and campaign qualification remain separate open gates; engineering checks cannot close them.

Governance: AGENTS.md, docs/20_engineering/AGENT_WORKFLOW.md, PLAYER_VISIBLE_STATE.md, UI_OWNERSHIP_MATRIX.md, TACTICAL_MAP_SYSTEM.md, docs/40_reports/GUI_MASTER.md and existing R7 content/history/localization/audio plan. Use one Sol implementer and one independent Sol reviewer. Root owns integration, runtime evidence and documentation.

## Scope and boundaries

Owned production surfaces: src/ui/map/audio/*; AudioCueObserver.tsx; AudioSurfaceBedController.tsx; SettingsScreen.tsx; narrowly required existing cue-host components and current EN/BCS keys. Tests under tests/ui and bounded tools/ui diagnostics. Own output root logs/player-experience-completion-20261105/.

No simulation/AI/commander changes; no desktop mutations or IPC semantic changes; no scenario/control/authored data, canonical state/save schema, calibration tools, lockfile/dependency changes, invented event severity thresholds, hidden-state exposure or new audio assets. Preserve the ambience-disabled default and existing optional-asset behavior. Do not revive deferred localization or require human listening now. No campaigns, release packaging, remote push, merge or cleanup of other worktrees/processes.

## Deliverables and sequence

1. Inspect current code, existing tests and the old ten-unproven-cue inventory. Record current hooks; distinguish retained hooks, appropriate existing action hooks and deliberately unused cues. Establish focused unchanged baseline before production edits. Do not interpret old absence reports as current defects.
2. Implement verified controls/playback/persistence/gesture-lifecycle defects and appropriate existing UI hooks with meaningful failing behavioral tests first. Avoid blanket noisy click/hover listeners or duplicated surface ownership. Keep one source of preference truth and muted/disabled stopping semantics.
3. Repair keyboard/focus semantics in affected Settings/audio flows using existing modal infrastructure. Verify labels, Escape/Tab behavior, opener focus restoration, reduced-motion compatibility and visual equivalents. Limit changes to demonstrated defects in owned flows.
4. Verify real rendered routes and offline renderer audio. Use a scoped deterministic fixture/recorded visible-state transitions, local server and blocked external network; assert startup/selectors first. Exercise actual gesture unlock, mute, volume persistence, decode failure recovery and ambient policy transitions. Hash supplied local audio assets against canonical inventory. Capture network/console/media observations and screenshots. A browser proof is not a packaged Electron proof or human listening.
5. Independent review covers code, player-visible boundary, determinism separation, accessibility, runtime evidence and process. Correct concrete findings once, then targeted verification; consolidate any persistent contradiction. Batch implementation report/receipt, R7 plan addendum and required PROJECT_LEDGER entry after evidence settles. Shared roadmap/board changes only if needed; never mark R7 globally closed.

## Fixed validation plan, cost and stop rules

Question: do existing renderer actions produce correct optional cues and do controls remain safe, accessible and usable offline without changing gameplay?

Cheapest gates first: inspect scripts/runtime/dependencies/fixture paths; verify own worktree and startup; run affected audio/preferences/Settings/modal tests before edits, then explicit RED/GREEN tests. Use local dependencies (never junction node_modules to another worktree). Retain stdout/stderr and command exits in the output root.

Commands: local Vitest selected audio, preferences, Settings and affected focus/accessibility tests with at most2 workers; npm run typecheck; repository lint (check script first); npm run desktop:map:build and qa:chunk-cycles when required by UI bundle; bounded real-browser proof over actual mounted UI and fixture. Include warroom build/checks only if its production surface changes. Scope-preservation git diff and canonical/audio fixture hashes after final changes. No full simulation suite or188-week run is triggered by this renderer-only change; if a proposed edit crosses that boundary, stop and keep the defect out of this packet.

Expected cost: setup may take several minutes; focused tests/typecheck/lint and one UI build several minutes; browser matrix bounded to5 minutes after startup preflight. At most one initial qualification pass and targeted reruns invalidated by corrections. No full suite/package/campaign for reassurance. On unexpected failure inspect retained evidence and all visible categories, fix/reproduce cheaply before repeating the affected larger check. Reuse unaffected evidence explicitly.

Pass: focused required tests/checks exit0; no new relevant runtime/console failures; no external font/audio loads; supplied assets retain hashes; no sound before gesture or while muted; persisted preferences reload safely; ambient remains off by default; accessible controls/focus pass actual route checks; no protected source/data changes; independent review GO. Report inherited/unresolved gates accurately. Final local commit is authorized; merge/push/publication are not.

## Execution record

Plan written before implementation. Checkout/setup failures are preserved; implementation, scoped verification and independent review are complete. Final evidence and cue disposition are recorded in the implementation report rather than duplicated here.

## Owner amendment — original audio, 2026-11-05

Owner requested richer effects and background music and selected "Sparse piano, low strings and analogue texture". This explicitly expands the asset non-goal above: add a bounded original first-party set (6–8 tactile UI cues and one90-second instrumental main-theme/background bed), using local deterministic synthesis and FFmpeg, no external generation service. Preserve existing Kenney binaries and attribution history; map selected cue IDs to new files. Include full mix plus piano/strings/texture stems and an audition reel under own ignored evidence root. Follow docs/audio/2026-05-17-awwv-composer-brief.md. No voices, borrowed tunes, factional motifs, heroic rhythms or combat spectacle.

Owned additions: tools/audio recipe; new assets/audio/designed and assets/audio/music files; audioAssets.ts/sound_manifest.ts mappings; AUDIO_ASSET_PROVENANCE.json and changed per-cue LICENSES records; related manifest/provenance tests. Original-audio Sol worker owns these; primary implementer retains bus/preferences/Settings/controller. Add a separate persisted music opt-in (OFF by default) and music level; global mute/master and gesture requirements still apply. No save fields/dependencies. Ambient policy stays disabled. Root performs integration.

Additional validation question: are these original assets technically clean, correctly attributed, locally decoded and controlled independently? Expected cost a few minutes of offline rendering/analysis, no campaign or release package. Check fixed-seed/explicit-score reproducibility, duration, finite samples, safe peaks/headroom, stereo/full mix and stem exports, file hashes/manifest/license consistency, and FFmpeg decode/loudness reports. Browser asset count follows the canonical import inventory rather than a hard-coded20; preserve hashes of all original files. Audition files are creative drafts, not human listening/sensitivity approval. Stop after one render/technical pass plus targeted corrections; broader composition campaigns require a new concrete decision.

### Settled execution evidence

Controls/audio implementation, owner-requested v2 and compatibility repair complete. Scoped evidence: controls: 18 files / 121 tests plus targeted review: 4 files / 49 tests, asset/Python checks, final typecheck/lint/build/chunks and browser05 with explicit reuse of completed browser03controls. All 21 emitted assets hash-exact and all 20 originals preserved. Remaining listening/sensitivity/design/package/native/global gates stay open. Report/receipt: `docs/40_reports/implemented/20261105_PLAYER_EXPERIENCE_COMPLETION.md` and its `_RECEIPT.json` companion. Independent review GO; no merge/push.
