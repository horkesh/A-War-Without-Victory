# Life Lessons — AWWV Development

> Last updated: 2026-03-08 (initial synthesis from 3 days of work)
> Auto-generated daily at 06:00. Cross-checked against previous entries.
> Violation-tracked: lessons with recent violations stay at the top.
> Enforcement: session-start scan, pre-commit gate (`/awwv_pre_commit_check`), daily cron violation detection.

---

## Recently Violated (needs reinforcement)

_No violations detected yet._

---

## Active Lessons (no recent violations)

### [Architecture] Organic emergence beats hard caps (2026-03-06)
- **Context**: VRS tempo needed to decay over a 40-week war. Personnel needed faction-specific ceilings.
- **Wrong approach**: Adding phase switches ("RS goes defensive at week X"), hardcoded personnel caps, or forced stance transitions. These create artificial cliffs that don't match historical gradual degradation.
- **Right approach**: Fatigue (+2/battle, recovery only off frontline), supply drain (MAINTENANCE_DRAIN 0.045/formation), entrenchment walls (sqrt curve), and pool demographics create organic decay. RS attacks naturally decline 8→1 by w40 without any forced switch.
- **Do instead**: When a faction's behavior needs to change over time, find the emergent lever (fatigue, supply, pool exhaustion) — never add a hard phase switch or cap. If you can't find an emergent lever, the underlying system is missing a mechanic.

### [Calibration] Fixing one faction cascades to all others (2026-03-08)
- **Context**: HRHB was taking 6.3k KIA from phantom attrition on cold (Graz Accords) fronts where no combat should occur.
- **Wrong approach**: Fixing HRHB attrition in isolation and expecting other factions to stay stable. After the fix, HRHB was suddenly too healthy, which changed territorial dynamics, which changed RBiH mobilization pressure.
- **Right approach**: Treat faction calibration as a system — fixing HRHB required HRHB pool scale 1.60→1.05 AND RBiH pool scale 0.18→0.25 to maintain equilibrium. All three factions must be re-verified after any single-faction fix.
- **Do instead**: After fixing any faction-specific bug, immediately check all three factions' troop strength, KIA, and territorial outcomes. Budget time for at least one cascade recalibration run.

### [Debugging] The bug is never where you think it is (2026-03-08)
- **Context**: n304 had too-low casualties and RS wasn't degrading. Looked like a combat balance issue.
- **Wrong approach**: Tuning combat constants (attacker/defender rates, morale thresholds). The real bugs were: (1) `Number.isInteger` check was resetting fractional fatigue to 0 every turn — a type coercion bug masquerading as a balance problem, (2) equipment losses were simply missing from the OSID attack path — only the legacy SID path had them.
- **Right approach**: Trace the actual data flow. Print fatigue values across turns. Check whether equipment loss code even exists in the code path being executed. The answer was "no."
- **Do instead**: Before tuning constants, verify the mechanic is actually executing. Add a diagnostic tool/script to trace the value you're calibrating across turns. If the value isn't changing when it should, you have a bug, not a balance problem.

### [Architecture] Port systems incrementally, not all-at-once (2026-03-08)
- **Context**: Frontline attrition needed to move from legacy `brigade_front_assignment`/`local_fronts` to the new `corps_front_sectors` system.
- **Wrong approach**: Trying to remove the entire legacy system at once. The legacy system is still used by fatigue, defense, GUI, and serialization — ripping it all out would break 4+ consumers.
- **Right approach**: Port one consumer at a time (`frontline_attrition.ts` only). Leave legacy intact for other consumers. Each port is a clean, testable, commitable unit.
- **Do instead**: When migrating to a new system, enumerate ALL consumers of the old system first. Port one at a time, verify calibration between each, and only delete the old system when the last consumer is ported.

### [Calibration] Data problems masquerade as engine bugs (2026-03-07)
- **Context**: 84.2% calibration plateau. Combat loop looked broken — VRS wasn't capturing historically-held territory.
- **Wrong approach**: Debugging the combat resolution engine, checking morale, checking attack thresholds. The engine was working correctly — VRS operations simply weren't targeting the right OSIDs.
- **Right approach**: Pre-planned operation target chains in `pre_planned_operations.ts` were missing key OSIDs (Zvornik corridor, Brčko corridor). Adding the correct targets was a data change, not an engine fix.
- **Do instead**: When calibration hits a plateau, check whether operations are targeting the right places before debugging why combat isn't working. Use `weekly_report.jsonl` to trace what was attacked, what was defended, and what was ignored.

### [Architecture] Scope determines lookup granularity (2026-03-08)
- **Context**: First attempt at sector-based frontline attrition used `sub_segments[].friendly_osids` — only border-adjacent OSIDs.
- **Wrong approach**: Using the narrowest scope (border OSIDs). Only 55% of RBiH brigades were at border-adjacent positions. Casualties dropped ~50%. The issue: many brigades are in the sector's depth zone, not directly at the border.
- **Right approach**: Use `assigned_brigade_ids` — any brigade whose `location_osid` is within the sector's `territory_osids`. This captures brigades in the depth zone who still take sniping/shelling/disease attrition.
- **Do instead**: When choosing which entities a system applies to, map out the full spatial hierarchy (border → territory → faction space) and pick the level that matches the mechanic's real-world scope. Passive attrition = entire sector territory. Active combat = border only.

### [Process] Classify tasks by actual system impact, not plan labels (2026-03-07)
- **Context**: A task labeled "GUI Phase 5" actually touched IPC contracts, bot AI logic, pipeline steps, and serialization schemas — all engine-critical.
- **Wrong approach**: Treating it as "UI work" and skipping regression gates, running tasks in parallel that shared state, combining engine + UI commits.
- **Right approach**: Before parallelizing or skipping regression, audit what the task actually touches. If it modifies schema, IPC, bot logic, pipeline, or serialization — it's engine work regardless of what the plan calls it.
- **Do instead**: Read the actual file list before deciding task classification. If ANY file is in `src/sim/`, `src/state/`, or touches IPC contracts, add regression gates and separate commits.

### [Debugging] Override direction is critical and confusing (2026-03-04)
- **Context**: RS territory calibration. RS was under-capturing some areas and over-capturing others.
- **Wrong approach**: Adding under-captured OSIDs to `avoided_osids`. This made RS *even less likely* to capture them — the exact opposite of intended. Cost: -0.7pp regression.
- **Right approach**: `avoided_osids` = fix OVER-captures (prevent VRS from attacking there). `osid_control_overrides` = fix UNDER-captures (force-start RS control). The names are confusing because they describe the *mechanism*, not the *problem*.
- **Do instead**: Before adding any override, state the problem as "RS has too much/too little here" and then match: too much → avoided_osids, too little → osid_control_overrides. Never guess — get it wrong and you regress.

### [Architecture] FormationKind beats conditional checks everywhere (2026-03-07)
- **Context**: Paramilitary units needed to be excluded from reinforcement, bot AI, fatigue, and 6+ other systems.
- **Wrong approach**: Adding `if (f.is_paramilitary) continue;` checks in every system that should skip them. Fragile, easy to miss one, creates maintenance burden.
- **Right approach**: New `FormationKind = 'paramilitary'` type. Existing kind-filters (`f.kind !== 'brigade'`) naturally exclude them from all formation systems without any new conditional checks.
- **Do instead**: When a new entity type needs different lifecycle rules, make it a new Kind (or equivalent type discriminator) so existing filters exclude it automatically. Only add explicit checks for systems where the new type DOES participate.

### [Calibration] Test override blocks in isolation (2026-03-07)
- **Context**: Calibration overrides interact in unexpected ways. Adding 10+ HRHB cell overrides across multiple regions caused cascading regressions (POSAVINA_NE -9.9pp, SARAJEVO -9.3pp).
- **Wrong approach**: Bulk-adding overrides across regions in one change. Each override shifts force balance, supply lines, and bot targeting — effects compound non-linearly.
- **Right approach**: Add overrides by isolated geographic cluster (one region at a time). Verify each cluster's impact before adding the next. Some overrides are "load-bearing" — removing them causes net losses even though they look wrong individually.
- **Do instead**: Add override changes one cluster at a time, run calibration between each, and measure delta. If a single override causes >1pp regression elsewhere, investigate before adding more.

### [Process] OSID-level anchors, not municipality-level (2026-03-07)
- **Context**: Scenario anchors for pockets (e.g., Bihać) were set at municipality level. Municipality-level anchors gave false failures because a municipality can be partially controlled.
- **Wrong approach**: `anchor: "bihac"` — reports failure if any OSID in bihać municipality is lost, even if the pocket (Bihać city) is held.
- **Right approach**: `anchor: "op:bihac:bihac_2"` — checks the specific OSID that represents the pocket core.
- **Do instead**: Always use OSID-level anchors for calibration checkpoints. Municipality-level is too coarse for a 744-OSID map.

### [GUI] Never show raw engine values to the player (2026-03-07)
- **Context**: Officer stats were displayed as raw 1-5 integers. Players saw "Competence: 3" with no context.
- **Wrong approach**: `Math.round(stat * 100)` or showing raw integers. Meaningless to players, breaks immersion, invites min-maxing.
- **Right approach**: `OfficerProfile` component with archetype labels ("Master Strategist"), pip ratings (●●●○○), descriptive text, and origin badges. The underlying 1-5 values drive mechanics but are never shown.
- **Do instead**: Every engine value shown to the player must go through a presentation layer that gives it meaning. Pips, bars, descriptive labels, archetypes — never raw numbers.

### [Process] Update CALIBRATION_MASTER during the session, not after (2026-03-06)
- **Context**: Calibration work produces insights that are lost if not captured immediately. Multiple sessions' worth of constants and run results were scattered across reports.
- **Wrong approach**: Writing calibration notes at end of session or in ad-hoc reports. Knowledge fragments across 20+ report files.
- **Right approach**: `CALIBRATION_MASTER.md` is the single source of truth for current constants, run history, and open questions. Update it as you change constants, not after.
- **Do instead**: Open CALIBRATION_MASTER.md at session start. Update it every time you change a constant or complete a calibration run. Same discipline for GUI_MASTER.md during GUI work.

### [Calibration] Constants need inline range documentation (2026-03-06)
- **Context**: UN airdrops were set to 15 pts/turn — silently dominating RBiH's entire supply system. Only discovered during the n159 audit when drilling into a cascade failure.
- **Wrong approach**: Treating constants as opaque tuning levers. No documentation of expected value range or system impact.
- **Right approach**: Constants get inline docs noting their expected range and which subsystems they dominate. When AIRDROP_MAX_SUPPLY_PER_TURN was capped 15→3, the entire RBiH supply flow changed.
- **Do instead**: When adding a constant, document: expected range, what happens at min/max, and which systems it dominates. A buried constant can be the true control knob while its "documented" parameters do nothing.

### [Calibration] Measure secondary region deltas, not just the target (2026-03-07)
- **Context**: n237 — adding HRHB overrides caused POSAVINA_NE to drop −9.9pp and SARAJEVO −9.3pp. The HRHB region improved; two others regressed.
- **Wrong approach**: Only checking the target region's delta after a change.
- **Right approach**: After every override or pool change, check 2–3 secondary regions that share a border or supply line with the changed area. Faction changes trigger cascades: weaker HRHB → VRS easier wins → different front geometry → different casualty distribution.
- **Do instead**: Always run a full-region ATH diff after any calibration change, not just the target region.

### [Architecture] When you have 50+ overrides for one behavior, the mechanic is missing (2026-03-07)
- **Context**: Goražde, Srebrenica, Žepa were being auto-captured via consolidation. Overrides were piling up to prevent it. The ceiling was stuck at ~93.6%.
- **Wrong approach**: Keep adding `avoided_osids` and `osid_control_overrides` for each enclave. Eventually hit a hard ceiling from override debt.
- **Right approach**: Enclaves aren't a tuning problem — they're an engineering problem. Surrounded OSIDs with ethnic co-control or supply access need an enclave resilience mechanic, not more overrides.
- **Do instead**: Count your overrides. When you have 10+ overrides for the same structural behavior, stop adding overrides and build the mechanic instead.

### [Debugging] One fix can expose a second deeper bug (2026-03-08)
- **Context**: Wiring equipment loss into undefended-path battles caused total combat shutdown (0 battles). Looked like the equipment formula was wrong.
- **Wrong approach**: Tune the equipment loss formula because "that's what changed." Assume the new code is the bug.
- **Right approach**: The real issue was that undefended-path battles had `defenderFormation = undefined` hardcoded — equipment loss was impossible. The new code was correct; it exposed a hollow legacy path. When one fix causes a cascade failure, audit what the fix exposed.
- **Do instead**: When a fix causes regression, ask "what did this expose?" before tuning the fix. The regression is often a symptom of a deeper pre-existing hole.

### [Process] Determinism requires explicit sorting, not hope (2026-03-04)
- **Context**: `Object.keys()` and `Object.entries()` iteration order is not guaranteed. Map source updates diverged across runs.
- **Wrong approach**: Assuming iteration order is stable because it "usually is." Running tests on a single machine where the order happened to be consistent.
- **Right approach**: Every iteration over maps, every `Object.keys()`, every array derived from records must be explicitly sorted via `strictCompare`. Document the sorting contract in function signatures.
- **Do instead**: Search for any `Object.keys()` or `Object.entries()` without a `.sort(strictCompare)` call. Each one is a latent nondeterminism bug.

### [Architecture] Systems need a single owner file (2026-03-05)
- **Context**: `recon_intelligence.ts` had BFS logic in one file, consumers GUI-only (no bot), types in game_state.ts. When OSID migration happened, the dead SID-keyed BFS hung around for weeks undetected.
- **Wrong approach**: Split a system across: types in game_state, logic in module, constants in a separate constants file consumed by 3 different places.
- **Right approach**: One owner file declares types, constants, and core logic. `sector_intel.ts` + `sector_intel_constants.ts` as a self-contained pair — immediately obvious whether the system was being used.
- **Do instead**: When a system spans more than 2 files for its core logic (not consumers), consolidate. Dead code becomes visible when ownership is clear.

### [Architecture] If you enforce a property every turn, the model is wrong (2026-02-22)
- **Context**: AoR model treated brigade location as a set of owned settlements, requiring contiguity enforcement, enclave fragmentation, and 20+ lines of rebalancing code every turn.
- **Wrong approach**: Add more enforcement code each time the model drifts. Contiguity enforcement, sector rebalancing, AoR re-computation.
- **Right approach**: Brigade location should be a single node (`location_osid`) in the contact graph. Contiguity, sector assignment, and territory claims become derived views — no enforcement loop needed.
- **Do instead**: When you add per-turn enforcement code for a property, stop. The model should make the property invariant automatically. Find the model that makes it true by construction.

### [Debugging] Empty execution windows need layer-by-layer diagnosis (2026-03-07)
- **Context**: Drina corps went dormant — zero operations for weeks 4–40 after pre-planned operations. Investigators assumed the operation relaunch was broken.
- **Wrong approach**: Debugging the operation execution code when the real gap was in corps directive generation. Three separate investigations before finding the right layer.
- **Right approach**: Three-layer diagnosis: (1) Is the operation launching? (2) Are brigades assigned? (3) Is the operation progressing? Find which layer is broken before touching code.
- **Do instead**: Build layer-by-layer diagnostic tooling. A blank execution window can mean: no launch, no assignment, no progression — each has a different fix.

### [Architecture] Operations need explicit phase lifecycle (2026-03-06)
- **Context**: Operations would enter execution phase and stay there with no attacks, triggering `execution_without_attack_orders` warnings indefinitely.
- **Wrong approach**: Treating a quiet execution turn as always a broken state. Triggering failure logic and resetting ops.
- **Right approach**: A quiet execution turn with movement orders is a maneuver turn — brigades staging. Only trigger failure if brigades have staged AND zero attacks happen over multiple turns. The gate: have all participants reached staging positions?
- **Do instead**: Operations need explicit states: planning → staging → attacking → completion. A turn with movement-only is still progress.

### [Calibration] Supply is a three-faction cascade — change one, verify all (2026-03-06)
- **Context**: PATRON_AID_SCALE at 6 meant RBiH felt near-zero embargo. Raising it to 12 broke HRHB. Each faction's supply formula interacts.
- **Wrong approach**: Tuning one faction's supply constants and checking only that faction's outcome.
- **Right approach**: Supply cascade validation: RBiH (UN airdrops + patron) → RS (self-sufficient + patron) → HRHB (Croatian pipeline + embargo). All three must be checked after any supply constant change.
- **Do instead**: Have a supply validation checklist: after any supply change, check all three factions' reserve levels, run a 40w scenario, verify no faction hits critical unexpectedly.

### [Debugging] Formation state is a state machine — guard transitions, not values (2026-03-08)
- **Context**: `Number.isInteger(1.5) === false` caused the fatigue recovery guard to skip recovery, leaving fractional fatigue unreset. Looked like a formula error.
- **Wrong approach**: Checking if a value is an integer as a guard for a state transition. This is a type assumption, not a state guard.
- **Right approach**: Guard transitions with `typeof !== 'number'` (data presence) not `Number.isInteger` (value shape). Fatigue has explicit transitions: accumulate → recover in cycles → ceiling at 30. Guard the transition, not the value format.
- **Do instead**: For any state machine field, document the transitions explicitly. Never guard with shape assumptions (`isInteger`, `isArray`) when presence (`!= null`, `typeof`) is the right gate.

### [Bot AI] New mechanics competing with bot AI need explicit target exclusion (2026-03-07)
- **Context**: Paramilitary brigades competed with bot AI for undefended rear pocket OSIDs. Bot AI struck immediately; paramilitaries with MARCH_TURNS=2 never captured anything.
- **Wrong approach**: Assume bot AI and new mechanics will naturally share territory. Set MARCH_TURNS and expect the system to work.
- **Right approach**: Bot AI must explicitly exclude paramilitary target OSIDs from its offensive targets. New mechanics that compete for territory must gate the bot's access to that target class.
- **Do instead**: When adding any new mechanic that captures OSIDs, immediately check `generateCorpsDirectives` and `bot_brigade_ai_osid.ts` for conflicts. Add explicit exclusions before wiring the mechanic.

### [Calibration] Confidence thresholds should be named constants, not magic numbers (2026-03-05)
- **Context**: Sector intelligence used raw float comparisons throughout GUI and bot code. Changing a threshold required finding every comparison site.
- **Wrong approach**: Inline threshold comparisons: `if (confidence > 0.5)`. Each site independently defines "good enough."
- **Right approach**: `sector_intel_constants.ts` defines named tiers: CONFIDENCE_ROUGH_STRENGTH=0.2, CONFIDENCE_FRONT_BRIGADES=0.3, CONFIDENCE_FULL_STRENGTH=0.5, CONFIDENCE_DEEP_INTEL=0.8. Every consumer uses the same gates.
- **Do instead**: Any threshold that gates information or behavior should be a named constant. If you have two float comparisons that look similar but use slightly different values, they're silently diverging.

### [GUI] Defer heavy work off the main thread (2026-03-01)
- **Context**: Formation icon creation (canvas draw + getImageData + MapLibre GPU upload) was synchronous in a single rAF, freezing the UI for hundreds of milliseconds per load.
- **Wrong approach**: Doing DOM manipulation, image encoding, and GPU operations synchronously in the render path.
- **Right approach**: `requestIdleCallback` with 400ms timeout deferred icon loading without blocking UI. Heavy work belongs off the hot path.
- **Do instead**: Any work touching DOM, canvas, or GPU inside a render callback needs a `requestIdleCallback` or next-tick defer. If the UI stutters during load, find the synchronous work in the render path.

### [Debugging] Validate attribution at three layers: firing → accounting → outcome (2026-03-01)
- **Context**: Displacement system attributed all casualties to "encirclement" due to OSID/SID mismatch. Ledger said "working" because accounting was technically correct. But 4.36M displaced = 4× history.
- **Wrong approach**: Validating only that a mechanism fires and the accounting is non-negative. Missing the sanity check on outcome magnitude.
- **Right approach**: Three-layer validation: (1) mechanism fires correctly, (2) accounting correct (no negatives), (3) outcome magnitude is historically plausible. All three must pass.
- **Do instead**: For any new casualty/displacement/loss mechanic, add a magnitude sanity check: is the total within 0.5×–2× of historical? If not, the mechanism has a hidden amplifier.

### [Process] Pre-run validity checks prevent calibration dead-ends (2026-03-06)
- **Context**: Multiple early calibration runs produced zero battles (n35, n52) because operation preconditions weren't checked before investing in a 40w run.
- **Wrong approach**: Running full 40w scenarios to discover that combat is fundamentally broken (no attack orders, wrong OSID keys, zero eligible brigades).
- **Right approach**: Proof-lane test (`scenario_vrs_operation_proof_4w.json`) validates that one VRS opening op can attack, battle, and advance in 4 turns. Run this before any 40w calibration.
- **Do instead**: Maintain a lightweight proof test that validates the critical path of the simulation. Run it before every calibration run. Saves 5-10 minutes per failed long run.

---

## Internalized (Consistently Applied)

### [Process] Determinism is sacred (2026-02-25)
- No `Math.random()`, no timestamps, sorted iteration via `strictCompare`. Consistently followed — no violations in last 3 days.

### [Process] Smoke-test triad after every change (2026-02-21)
- `tsc --noEmit` + `vitest run` + `desktop:map:build`. Consistently run. No recent failures from skipping.

### [Platform] Windows shell uses semicolons (2026-02-07)
- PowerShell: `;` not `&&`. No recent violations.
