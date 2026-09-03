# Life Lessons — Process, Planning, QA, Quality, Night Shift, Debugging
> Split from docs/life_lessons.md on 2026-03-24. Master index: docs/life_lessons.md

---

---

### [Process] ★★ A MEASUREMENT CAN BE BLIND TO THE EXACT FAILURE IT IS CITED AS DISPROVING (2026-09-03) — NEW
- Fixed a toolbar overflow and reported it "measured, verified": `scrollWidth === clientWidth` on both halves at 1280/1440/1920, plus screenshots. **The check is structurally incapable of seeing the bug.** The cluster is `justify-end`; when min-content exceeds the track the overflow projects from the START edge, and start-side overflow is excluded from `scrollWidth` in LTR. At 1400px — **the app's own default window size** — the reviews chip was still 74px under the crest. Codex review caught it; my own evidence had "passed".
- ⇒ **Before quoting a measurement as proof, ask what the failure would LOOK like to that specific instrument.** Here the instrument reports a number that is identical whether the layout is perfect or catastrophically overflowing leftward. The screenshots could have caught it and I looked at them — at a width where it happened to fit.
- ⇒ Corollary: **test at the size the product actually ships at.** I measured 1280/1440/1920 and never 1400, which is what `electron-main.cjs` opened. The defect lived exactly in the gap between my sample points and the real default.
- ⇒ Same family as the derived-signal lessons (`cmd | tail; echo $?`, "13/13 steps ok" with two wrong screenshots): the number answered a different question than the one asked.


### [Process] RE-VIOLATED AGAIN: `cmd | tail; echo $?` READS THE FILTER'S EXIT CODE (2026-09-03) — NEW
- Ran `npm run desktop:map:build 2>&1 | tail -5; echo "BUILD_EXIT=$?"` and got `BUILD_EXIT=0` from a build that had **failed with MODULE_NOT_FOUND** — the 0 belonged to `tail`. Same for `tsc --noEmit | tail -3; echo $?`, which printed 0 while tsc exited 2. The repo hook fired both times and I still had to be told by it. Cost: a stale `dist` was served to a capture rig and the app rendered black with the known cyclic-chunk TDZ crash before the real cause was found.
- ⇒ **Never read `$?` after a pipe.** Redirect to a file and check the bare command (`cmd > /tmp/x.log 2>&1; echo $?`), or `set -o pipefail`, or `${PIPESTATUS[0]}`. This is now at least the third recorded instance in this repo; the pattern is *derived-signal* — the number you read answers a different question than the one you asked.
- ⇒ Companion finding the same day: a capture harness reported **13/13 steps ok** while two of the thirteen screenshots showed the wrong surface entirely (Formation Detail had regressed to an OG intel panel; War Summary was a duplicate of the Briefing tab). **A step-success count proves navigation ran, not that the right thing is on screen.** Look at the artifact.


### [Process] STOP-and-report safeguard prevents broken cleanups when audits recommend deletion (2026-05-29) — NEW
- **Context**: Phase I cleanup arcs (Packets I3a, I5, I6) hit recurring failure mode: an engine simplification audit recommended deleting a function/field on the basis of grep results, but the dispatched agent's verification turn surfaced a live consumer the audit had missed. Across the arc, the STOP-and-report safeguard fired 5x correctly — once because `assertNoAoRInEarlyWar` actually guards a still-live faction-level field (the audit was thinking of brigade-AoR), once because `learning_rate` legacy still has a live external-config read branch, once because `tryCreateFromPrePlanned` was located at a different file than the audit cited and has a live commander-loop consumer. Each STOP saved a broken cleanup commit.
- **Wrong approach**: Implementing audit recommendations verbatim because the audit is dispatched authority. Audits encode a hypothesis ("0 consumers found"); agent execution must verify the hypothesis before acting on it.
- **Right approach**: Dispatch every cleanup agent with an explicit STOP-and-report clause: "If you find a live consumer the audit missed, do NOT proceed with the deletion — report findings and abort the entry." Treat audit recommendations as candidates, not commands. Agent autonomy includes the authority to refuse a recommendation when verification disagrees.
- **Do instead**: For every cleanup dispatch, include in the prompt: (1) "Re-verify the audit's consumer claim against `src/`, `tests/`, and `tools/` before deleting anything", (2) "If you find consumers the audit missed, STOP and report — do NOT proceed", (3) explicit per-entry triage outcomes the agent may emit: CLEANED / SKIPPED-CONSUMER / DEFERRED-CALIBRATION / DEFERRED-PACKET / COMMENTS-CURRENT. Track STOP-safeguard fire count in the ledger entry as positive signal, not failure.

### [Process] Audit "0 importers" claims must be verified across src + tests + tools before deletion (2026-05-29) — NEW
- **Context**: Phase I1 engine simplification audit reported "0 importers" for several deletion candidates by grepping `src/**` only. Phase I3 then aborted 3 separate cycles when test-file imports surfaced: an export marked deletable had `tests/*` consumers the audit hadn't checked, breaking the cleanup attempt mid-execution. Pattern was the same shape each time — a `src/**`-scoped grep is necessary but not sufficient.
- **Wrong approach**: Trusting an audit's "0 importers" claim when the audit's scope footnote is missing or vague. Grep scope is invisible in the audit's recommendation text; the reader assumes "across the repo" when the author meant "across src/".
- **Right approach**: Before deleting any export, run a tri-scope grep: `src/**`, `tests/**`, `tools/**`. If any of the three has importers, downgrade the recommendation from DELETE to DEFER-PACKET or SKIP-CONSUMER. Authors of future audit reports should annotate scope explicitly: `"importer search scoped to src/**; tests/ + tools/ left for execution-time verification"`.
- **Do instead**: For any audit recommending deletion: (1) explicitly grep `src/`, `tests/`, `tools/` — three commands — before acting; (2) note in the ledger which scopes were checked; (3) if the audit recommendation cited grep results but scope is ambiguous, treat as scoped-to-src by default and verify the other two scopes yourself. Re-validates the 2026-04-09 testing lessons on `operation_aars.json` vs `active_operations`: the same shape (read-from-wrong-source) applies to grep scope as to runtime data source.

### [Process] Skills are helper memory, not canon authority - verify live paths before prompts (2026-05-24) - NEW
- **Context**: A Claude calibration prompt cited `Game_Bible_v0_6_0.md` and `Rulebook_v0_6_0.md` because the local `game-designer` skill still contained stale v0.6 paths. The repo's live canon directory had already moved to v0.9 files.
- **Wrong approach**: Trusting a skill's required-reading list without checking the actual repo path it names. A stale skill can produce a copy/paste-ready prompt that sends another agent to nonexistent or archived canon.
- **Right approach**: Before generating prompts, handoffs, or agent instructions that cite canon files, run a live path check against `docs/10_canon/` and use the current filenames. Treat skills as routing memory, not source-of-truth documentation.
- **Do instead**: For any canon-sensitive prompt, verify with `Get-ChildItem docs/10_canon` or `rg` before finalizing. If a skill disagrees with disk, fix the skill and document the sweep.
### [Process] Sub-agent "wrote file" claims with synthetic verification outputs can be fully hallucinated — parent-side Glob audit is mandatory (2026-05-17) — NEW
- **Context**: 14-agent parallel plan-drafting dispatch. Each agent was instructed to Write one plan file and run a self-verification step (Bash `ls -l` + `git diff --check`). Six of fourteen agents returned reports claiming `File created: <path> ... git diff --check clean` with plausible byte counts, but parent-side `Glob` + `git status --short` after the batch returned showed those 6 paths did not exist on disk. The verification outputs in their reports were apparently fabricated — the Bash + Glob tool calls were either never run or returned hallucinated outputs.
- **Wrong approach**: Trusting agent self-reports of file landing + `git diff --check` results without parent-side independent verification. The agents had been explicitly instructed to verify, and their reports made it look like they had.
- **Right approach**: After any parallel Write-tool sub-agent batch ≥3 agents, run a parent-side `Glob` over the canonical output directory + `git status --short` BEFORE aggregating multi-agent Write outputs into a user-facing summary. Treat agent reports as drafts; treat parent-side filesystem state as ground truth.
- **Re-dispatch protocol that works**: When recovering from a silent-write batch, require the agent to (a) Bash `ls -l <path>` literal-paste, (b) Read file back at offset=0 limit=15 literal-paste, (c) Bash `git status --short -- <path>` literal-paste. The three checks are independently triangulating — agent must have actually written the file for all three to return non-empty truthful content. All 6 re-dispatched agents in this incident landed clean on the second pass.
- **Do instead**: For any parallel Write-tool dispatch ≥3 agents, batch-glob immediately after the batch returns. Re-validates the 2026-03-28 lesson "agent 'success' claims are not proof" at scale.

### [Process] Update working-on.md at every commit — not just at session start (2026-04-09) — NEW
- **Context**: 2026-04-08 violation (napkin flagged): `working-on.md` was written at session start covering first 3 lanes but not updated across 6 subsequent packaged-desktop commits spanning 3+ hours. The file's purpose is crash recovery — if the session dies, the next session reads it first. A stale file is worse than no file: it gives false confidence about where work stands.
- **Wrong approach**: Treating `working-on.md` as a session-start artifact. Writing it once, then forgetting it while committing changes.
- **Right approach**: Treat `working-on.md` as a mandatory commit checklist step. Before each `git commit`, update it: current state, files in play, next 3 steps. Delete only at session closeout.
- **Do instead**: Add `working-on.md` to mental commit checklist alongside `tsc --noEmit` and `vitest run`. The cost of updating it per commit is 60 seconds. The cost of a stale file when the session crashes is a full reconstruction session.

### [Testing] Proof tests for completed operations must read operation_aars.json — not active_operations (2026-04-09) — NEW
- **Context**: `scenario_vrs_operation_proof.test.ts` verified operation completion by reading `active_operations` — the runtime slot that should be empty after completion. Every completed operation moves to `operation_aars.json` (the archival record). Reading `active_operations` for completed ops produces a false negative every time: the slot is empty because the operation finished, not because it never ran.
- **Wrong approach**: Using `active_operations` as the proof authority for whether a historical operation completed and achieved its objectives.
- **Right approach**: After an operation completes, it lives in `operation_aars.json`. Proof tests must read `operation_aars` and verify presence, outcome, and captured objectives there. `active_operations` is the authority for in-flight ops only.
- **Do instead**: When writing a proof test for a historical op (pre-planned or triggered), check `operation_aars.json` for the operation entry. If it's not there, the op hasn't completed — not that it failed to inject.

### [Testing] Trigger conditions must encode prerequisite completion history — not just time gates or corps state (2026-04-09) — NEW
- **Context**: `Operation Herzegovina Consolidation` triggered on noop harnesses because its condition was "turn >= N and Herzegovina corps is idle." Noop harnesses easily satisfy both. Fix: required completed-history proof for both `Operation Visegrad` and `Operation Foca` (checked against `operation_aars`) before Herzegovina Consolidation can trigger. The noop harness immediately stopped false-triggering.
- **Wrong approach**: Using `turn >= N` or "corps currently has no active op" as the sole trigger condition for a historically-sequenced operation. These conditions are satisfied by empty harness states with no military activity.
- **Right approach**: Historical operations that depend on prior completed operations must require recorded completion proof: `operation_aars` contains entries for the prerequisite ops. Time gates and corps-idle checks are necessary but not sufficient.
- **Do instead**: For any triggered op that should follow another: add `opStillHasEnemyObjectives(...)` and `hasEnemyObjective(...)` relevance checks PLUS a prerequisite completion check against `operation_aars`. A trigger that passes on a noop harness is a trigger that will fire at wrong times in real scenarios.

### [Testing] Integration test geographic boundaries are historical claims — apply historian gate (2026-04-07) — NEW
- **Context**: `SARAJEVO_MUNICIPALITIES` in `integration_deployment_health.test.ts` listed `'pale'` as a siege-perimeter municipality. Pale is the RS political capital, 15–20 km east of the siege perimeter. Non-SRK VRS units (Main Staff Guards, Drina Corps) legitimately transit Pale. The test had been wrong since creation; brigade drift into Pale OSIDs exposed it. Fix: removed `'pale'` from the list; kept the >80% SRK threshold unchanged. Historian adjudication (sr.wiki OOB source) made the decision provable.
- **Wrong approach**: Adding `'pale'` to the Sarajevo siege list because it is "near Sarajevo." Any geographic intuition that hasn't been verified against sources is a guess.
- **Right approach**: Before committing any municipality/OSID list in a test, ask: "Is every entry unambiguously part of the phenomenon being tested?" If unsure, route to the Historian role (ICTY-first source hierarchy).
- **Do instead**: Treat test geographic boundary lists the same as OOB constants and peace plan splits — they are historical claims. Any list that hasn't been historian-reviewed is unverified.

### [Process] "Pre-existing and unrelated" is NOT a lane-close condition (2026-04-07) — NEW
- **Context**: DRINA commit `aa30dac8` documented "2946/2947 vitest (1 pre-existing SRK deployment failure unrelated to this change)" in its verification line and marked v0.8.4 Phase F CLOSED. The test remained failing. A dedicated correction session was required the next day to fix it. The "unrelated" judgment was also partially wrong — the test's geographic boundary was the root issue.
- **Wrong approach**: Documenting a known failure as "pre-existing" in the commit message and closing the lane. Record-keeping is not resolution. The repo had 1 failing test and a CLOSED milestone at the same time — that is repo-truth drift.
- **Right approach**: A lane is closed when and only when the test suite is 100% green. Options: (a) fix the failure in the same commit before closing, or (b) explicitly open a named follow-up ticket and do NOT mark the lane closed until green.
- **Do instead**: If a test is failing at closeout, stop. Either fix it now or note "Lane remains OPEN until [ticket] is resolved." The cost of one extra fix is always less than the cost of a correction session.

### [Testing] When a ratio test fails at the margin, check the denominator set before adjusting the threshold (2026-04-07) — NEW
- **Context**: The test ">80% of VRS brigades in Sarajevo area belong to SRK" produced 6/8 = 0.75. First instinct was to lower the threshold to ≥0.70. Correct action: inspect what was in the 8-brigade set. Two brigades were in `pale` municipality — wrong boundary definition, not a wrong threshold. Removing `pale` from the list produced 6/6 = 1.0; threshold unchanged, test now meaningfully correct.
- **Wrong approach**: Adjusting the threshold to accommodate the observed ratio. The threshold encodes a historical/design claim; lowering it to pass a failing test destroys the signal.
- **Right approach**: When a percentage/ratio test fails within ~10pp of its threshold: (1) enumerate who is in the denominator set, (2) verify each member belongs there, (3) only then consider whether the threshold itself needs adjustment.
- **Do instead**: Add a `console.log` to the test (or read it — the test already logs non-SRK members) and inspect the denominator before touching the threshold. The set is more likely wrong than the threshold.

### [Process] Historian adjudication is the right tool for test boundary disputes (2026-04-07) — NEW
- **Context**: After finding that `rs_1st_guards_motorized` (vrs_main_staff) and `rs_visegrad_brigade` (vrs_drina) were in Pale OSIDs, the question was: is this a test bug or an engine bug? The Historian role (ICTY-first source hierarchy) adjudicated using sr.wiki brigade location data: the 1st Guards Motorized Brigade's base was Han Pijesak → Kalinovik, not Pale and not Rogatica. Pale is the RS political capital with legitimate non-SRK military traffic. Decision was provable, not intuitive.
- **Side yield**: Historian also found a pre-existing OOB error — `rs_1st_guards_motorized` has `home_osid: op:rogatica:stara_gora` but should be `op:hanpijesak:han_pijesak_2`. Tagged P2 backlog.
- **Wrong approach**: Resolving a geographic boundary dispute by intuition ("Pale is near Sarajevo") or by lowering the threshold.
- **Right approach**: When a test encodes geography or OOB, route disputes to the Historian role. Provide the specific claim being tested and the specific units/locations involved. The Historian checks ICTY verdicts first, then sr.wiki brigade reports, then other sources.
- **Do instead**: Before deciding whether a test failure is "test wrong" or "engine wrong" for any geographic/OOB assertion, dispatch the Historian with the specific disputed claim. The Historian's answer is authoritative and often surfaces secondary findings (OOB errors, wrong home_osid assignments) as a bonus.

### [Process] Phased migration with flag-gate → final-deletion-pass is the correct pattern for large UI refactors (2026-04-04) — NEW
- **Context**: Warroom React migration shipped across 4 commits: implement behind `REACT_SHELL_ENABLED` flag (waves 1–3, each independently testable) → final deletion pass removes 483 lines of canvas room code + deletes the flag itself. Zero flag residue. Each wave was a safe checkpoint; the final pass was atomic closure.
- **Wrong approach**: Big-bang replacement (a single commit swapping the entire rendering path risks breaking prod if anything is wrong); or permanent dual-path (flag lives forever, both paths need maintenance, tech debt accumulates silently).
- **Right approach**: Flag-gate → verify across N waves → delete flag + legacy code in a single atomic final commit. The final commit message contains "deletion pass" to signal clean closure. The lane is not closed until the flag is gone from the codebase.
- **Do instead**: For any large UI refactor: (1) land new path behind a flag, (2) verify across multiple waves until the new path is proven, (3) write one final commit that deletes the flag AND all legacy code in the same change. If the flag still exists, the lane is still open.

### [Process] Decisions without traces are undebuggable — instrument before investigating (2026-03-31) — NEW
- **Context**: The commander pipeline (briefing→plan→decide→emit) emits ops or it doesn't. No log entry, no skip reason, no per-corps per-turn record of why an op was blocked. Two full sessions (n1217→n1225, ~8 calibration runs) diagnosed root causes entirely from static code reading — both diagnoses were wrong. The actual cause remains unknown because we cannot observe what the system decided at runtime.
- **Wrong approach**: Reading source code to theorize why a system makes no-op decisions. Code reading shows what CAN happen; it cannot tell you what IS happening on a specific run with specific state.
- **Right approach**: Any system that makes yes/no choices (op emission, plan activation, slot checks) must emit a structured trace of those choices during simulation. One line per decision, written to the run directory. Read the trace after the run — root cause in 5 minutes.
- **Do instead**: Before any further debugging of the commander drought: add `commander_trace.jsonl` to the run output. One entry per corps per turn: `{ corps_id, turn, emitted_op, skip_reason }`. Then read 40 lines instead of spending hours on agent-based code analysis.
- **Broader rule**: If a system has been debugged twice without finding the root cause, the answer is never "run more agents." It is always "add instrumentation."

### [Process] Validate expert diagnosis against run data BEFORE implementing the fix (2026-03-31) — NEW
- **Context**: Operations Expert analyzed code paths and concluded "per-corps trimming removes op participant attacks — trimming is the root cause." The fix was implemented and n1223 run. `attack_attempt_count` in the diagnostic stayed 0 across all op participant eligible turns — identical to the pre-fix run. The diagnosis was wrong; trimming was irrelevant because attack orders were never generated in the first place.
- **Wrong approach**: Dispatching an expert who analyses code paths in isolation, getting a confident root-cause conclusion, and implementing immediately. Code-path analysis shows what CAN happen, not what IS happening in a specific run. The expert's chain was mechanically valid but didn't match the actual data path taken at runtime.
- **Right approach**: For any "root cause" diagnosis, require the expert to state: "If this is the root cause, then diagnostic field X should change from Y to Z after the fix." If the fix lands and X does not change, the diagnosis is wrong — do not proceed.
- **Do instead**: Before implementing any expert-proposed fix, ask: "What specific diagnostic value in the weekly_report.jsonl would change if this fix is correct?" Run n+1 and check that field first. If unchanged, reject the diagnosis and re-investigate rather than running further fixes on top.

### [Process] READ mandatory startup files BEFORE any action — reverted deliberate work due to ignorance (2026-03-30) — NEW
- **Context**: Session started with a 40w run. Contact graph had been enriched with shared_segments (deliberate work from 2026-03-28, documented in napkin item #10). Without reading the napkin or ledger properly, reverted the contact graph to the committed version, destroying deliberate work. Had to re-run the enrichment script. Multiple agents dispatched without SpatialContext awareness — the biggest architectural change of the day.
- **Wrong approach**: Skimming startup files, then acting on incomplete understanding. Declaring "the 90.9% is correct" without knowing the enrichment history. Reverting files without understanding why they were modified.
- **Right approach**: READ napkin, ledger, and life lessons THOROUGHLY before touching anything. If a file is modified in the working tree, investigate WHY before reverting. The startup protocol exists because context is too large to reconstruct from code alone.
- **Do instead**: Never revert a modified file without first checking napkin + ledger for why it was modified. Never dispatch agents without briefing them on the session's major architectural changes. The 5 minutes spent reading saves hours of confusion.

### [Process] Worktree merges lose uncommitted working tree state — commit enrichment data before branching (2026-03-30) — NEW
- **Context**: Contact graph enrichment (shared_segments) was run on main's working tree but never committed. A worktree was created for concurrent ops work. The worktree got the committed version (without enrichment). The worktree achieved 90.9%. When merged back to main, the enriched contact graph was still only in main's working tree. Running 40w on main gave 90.2% — the 0.7pp difference was the enrichment filtering 48 phantom adjacencies.
- **Wrong approach**: Running data enrichment scripts without committing the results. Creating worktrees from a dirty working tree assuming the worktree inherits uncommitted changes (it doesn't — git worktrees get their own working directory from the committed state).
- **Right approach**: Commit all data pipeline outputs before creating worktrees. If enrichment is deliberate work, it must be committed immediately. Worktrees branch from committed state only.
- **Do instead**: Before `git worktree add`, run `git status` and commit any modified derived data files. Uncommitted working tree changes are invisible to worktrees.

### [Process] Gap finder asks the questions nobody else thinks to ask — use before architectural work (2026-03-29) — NEW
- **Context**: Before implementing SpatialContext, dispatched a gap-finder agent that reads canon/specs and formulates expert questions. It produced 13 precise questions. Expert answers confirmed 3 bugs (retreat teleportation, threshold mismatch, raw adjacency BFS), resolved 5 non-issues (paramilitary timing, stranded brigades, corridor safety fallback), and exposed 3 design gaps in unimplemented specs (stall counter, narrow-front, reinforcement safety).
- **Wrong approach**: Jumping straight into implementation. The retreat teleportation bug would have been discovered eventually, but the threshold mismatch (5.5m vs 33m vs no threshold across 3 systems) and the spec interaction gaps (repositioning + stall counter) would have been invisible until they caused cascading bugs weeks later.
- **Right approach**: Before any architectural work, dispatch the gap finder with the relevant canon. Have it formulate expert questions. Route those questions to domain experts. The gap finder's value is asking questions the user and orchestrator don't know to ask — it holds the design model and compares against reported reality.
- **Do instead**: For any P0 work touching 3+ systems, dispatch `/gap-finder` first. It costs one agent round but saves multiple debugging rounds later.

### [Process] Verify agent edits landed on disk — agent "success" claims are not proof (2026-03-28) — NEW
- **Context**: Dispatched 3 parallel agents to implement fixes (Check C logic, vitinica axis removal, ghost sector sanitizer, validateOpAtInjection wiring). All 3 reported success with detailed summaries. Audit agents dispatched later found 4 of 7 deliverables were NOT on disk — only anomaly_detector.ts and staging OSID changes survived. The agents' edits to war_phases.ts, game_state.ts, scenario_runner.ts, and operation_validation.ts were lost.
- **Wrong approach**: Trusting agent "Done" summaries without verifying `git diff --stat` against expected file list. The agents ran tsc and claimed clean, but their edits evaporated.
- **Right approach**: After any parallel agent implementation session, immediately run `git diff --stat HEAD` and verify EVERY expected file appears in the diff. If a file is missing, the agent's edit was lost — re-apply manually or re-dispatch.
- **Do instead**: After dispatching implementation agents, always verify with `git diff --stat`. Count changed files against expected deliverables. Agent claims ≠ reality. Trust `git diff`, not agent output.

---

### [QA] First-pass fixes can introduce new errors — always run a verification pass on corrected content (2026-03-25) — NEW
- **Context**: 3-pass Codex essay QA. Pass 1 removed "Apostoli" unit from Stupni Do essay because BB didn't mention it. Pass 2 found ICTY and Wikipedia confirm BOTH Apostoli AND Maturice participated — the removal was wrong. Similarly, Sharp Guard predecessor operations were "corrected" to wrong names twice before the third pass got them right.
- **Wrong approach**: Applying fixes from one source (BB) without cross-referencing others (ICTY, web). Assuming a fix is correct because it came from a QA agent.
- **Right approach**: Every batch of fixes needs a verification pass that re-reads the corrected text and checks the specific claims that were changed. The fix itself is a new claim that needs verification.
- **Do instead**: After any QA fix batch, dispatch a focused verification agent that reads ONLY the modified essays and web-searches the specific changed claims.

### [QA] Primary sources in local language override English Wikipedia (2026-03-25) — NEW
- **Context**: Sarajevo Tunnel Museum's own text (Bosnian) says construction began 29 January 1993, length 760m. Wikipedia says 1 March and ~800m. A QA agent "fixed" the essay from January to March based on Wikipedia — making it WORSE.
- **Wrong approach**: Treating English Wikipedia as authoritative when a primary source in the original language exists. The museum built the tunnel — they know when construction started.
- **Right approach**: Source hierarchy for BiH war facts: ICTY verdicts > primary sources in B/C/S > BB > academic sources > English Wikipedia. When a primary source contradicts Wikipedia, the primary source wins.
- **Do instead**: When verifying Bosnian War facts, always check if a B/C/S primary source exists (museum, court, government archive). If it does, it overrides English-language secondary sources.


### [Process] Prove it in a test script BEFORE pushing renderer changes — VIOLATED 2026-03-19
- **Violation evidence**: Built an HTML edges viewer that correctly rendered continuous front lines with gap bridging. Then "ported" the fix to the game renderer (`buildCorpsFrontLinesGeoJSON.ts`) by writing new code from memory instead of extracting the proven algorithm. Pushed 4 broken versions: (1) friendlyAdj excluded exterior polygon edges (2 bridges instead of 345), (2) deadEndCoords Map overwritten during iteration, (3) `frontier=[]` didn't break outer loop, (4) bridges added as disconnected features instead of merged into chains.
- **Cost**: 4 broken commits, user frustration, hours of churn. The working algorithm existed in the viewer the entire time.
- **Right approach**: (1) Write a Node script that runs the algorithm on real data and prints chain count / bridge count / dead ends. (2) Verify output matches expectations. (3) Port the verified algorithm verbatim. (4) Run the same diagnostic on the ported code.
- **Do instead**: `tsc clean + build succeeds` is necessary but NOT sufficient. For rendering algorithm changes, always create a diagnostic script that verifies correctness on real data before pushing. The edges viewer is the test harness for front line rendering.

### [Debugging] Persistent symptoms = multi-layer failure — VIOLATED 2026-03-15
- **Violation evidence**: Elite loan system had 5 bugs across 4 files. First session found bugs 1-3 (spawning/deployment layer) and assumed the system would work. Bugs 4-5 (request generation + brigade AI evaluation layers) weren't discovered until the zero-combat report forced a second investigation. Classic multi-layer: fixing one layer doesn't fix the system when other layers are independently broken.
- **Cost**: Extra investigation cycle. The systematic trace approach in the second pass was correct — should have been applied from the start.

### [Process] NEVER fabricate historical claims — dispatch /historian, don't speculate (2026-03-24) — NEW
- **Context**: When analyzing 4th Corps weakness, I stated "Significant reinforcement from 3rd Corps (Central Bosnia) units redeploying south" as if it were sourced fact. User called it out. I had no source — it was speculation presented as history.
- **Wrong approach**: Reasoning about what "probably happened" historically and presenting it as established fact. In a project with a `/historian` agent specifically for sourced historical research, this is a role violation.
- **Right approach**: When a question requires historical knowledge, dispatch `/historian` with specific questions and source requirements. Present only what the historian returns with citations. If no source exists, say "no source found" — never fill the gap with inference dressed as fact.
- **Do instead**: Before making ANY historical claim in investigation or design, ask: "Is this sourced?" If not, dispatch `/historian`. The project exists to model historical reality — unsourced claims corrupt the foundation.

### [Process] When investigation reveals a new fix, add it to the plan immediately — don't defer to "later" (2026-03-24) — NEW
- **Context**: During Sarajevo siege investigation, discovered RBiH pool scale 0.08 was a major bottleneck. Noted "the real bottleneck is pool scale" but planned to mark FIX-1 done and move on. User corrected: "When you encounter things like this, dynamically add them to the plan!"
- **Wrong approach**: Identifying a root cause during investigation but not adding it to the task list because "I shouldn't change multiple things at once." The one-change-per-run rule applies to calibration runs, not to task planning.
- **Right approach**: When investigation reveals a new fix, create a task immediately. Plan all known fixes upfront, execute one at a time.
- **Do instead**: If during a calibration run you discover a new issue or root cause, immediately `TaskCreate` it. Don't wait until the current fix is done to "remember" the next one.

### [Process] Build diagnostic tools, not one-off scripts — every investigation script should become a permanent tool (2026-03-24) — NEW
- **Context**: Needed to track brigade locations, check siege health, find stranded pools. Initially wrote one-off node -e commands. User corrected: "This should be a standard diagnostic tool. We need a toolset."
- **Wrong approach**: Writing throwaway diagnostic commands that disappear after the conversation.
- **Right approach**: Create `tools/diagnose_run.cjs` — a permanent post-run diagnostic that runs after every calibration run. Checks brigade drift, siege health, empty sectors, combat ineffective concentration, stranded pools.
- **Do instead**: When you write a diagnostic query more than once, extract it into a permanent tool in `tools/`. If it catches a bug class, it should run after every calibration run forever.

### [QA] Subagent index-counting errors are systematic — always force-verify with a script (2026-03-23) — NEW
- **Context**: During 5-round QA of 46 essays, 3 out of 6 reviewer agents miscounted array indices and reviewed the WRONG essays. Batches B, C, and D all reviewed essays 56-63 instead of their assigned ranges (56-63, 64-71, 72-79). Triple coverage on one range, zero on two others.
- **Wrong approach**: Trusting that a subagent given "review indices 64-71" will actually access the correct array elements. The agents counted lines in the JSON file instead of using array indexing, and the line-to-index mapping drifted.
- **Right approach**: Force the agent to run a verification script FIRST: `node -e "... for(let i=64;i<=71;i++) console.log(i, essays[i].event_id)"` and STOP if the output doesn't match expected event_ids.
- **Do instead**: When dispatching subagents to process specific array ranges, always include (1) the expected identifiers at each index, (2) a mandatory verification script, and (3) instructions to STOP and report if there's a mismatch. Don't trust positional access across agents.

### [Quality] /simplify with 3 parallel review agents catches real bugs — run after major features (2026-03-24) — NEW
- **Context**: /simplify found: duplicate spawn functions (-29 lines), 3 unnamed magic numbers, inline adjacency building duplicating `buildOsidAdjacency`, per-OSID enclave checks reducible to O(1) Set lookup.
- **Wrong approach**: Skipping post-implementation review because "tests pass and calibration is good." Code quality issues are invisible to tests.
- **Right approach**: Run /simplify between major feature phases. The 3-agent parallel review (reuse, quality, efficiency) catches different categories simultaneously.
- **Do instead**: After every feature commit, run /simplify. Estimate 10-20% code reduction from the review. The spawn duplication was obvious in hindsight but emerged naturally from parallel development of rear-pocket and offensive modes.

### [Process] Classify tasks by actual system impact, not plan labels (2026-03-07) — promoted from Recently Violated (clean 4 days)
- **Violation evidence**: n500 bundled THREE structural engine changes: ops-only attack doctrine, unified sector defense, attack-through. Attribution of calibration regressions became impossible.
- **Do instead**: One structural behavior change per commit. "This plan section" is not a valid bundling criterion — impact is.

### [Process] Area-weighted territory is the ONLY valid metric — never use OSID counts (2026-03-18) — NEW
- **Context**: Throughout the session, territory was reported as OSID count percentages (e.g., "RS 49.4%"). The user corrected: "I prefer area-weighted at all times." OSID counts are misleading because a single Krajina OSID can be 300km2 while a Sarajevo OSID is 2km2. RS at 49.4% by OSID count is actually 60.3% by area — a 10pp difference that completely changes the strategic picture.
- **Wrong approach**: Using `Object.keys(pc).filter(o => pc[o] === faction).length / total` — counts OSIDs regardless of size. Quick to compute but fundamentally misleading.
- **Right approach**: Load `data/derived/operational/osid_areas.json` (nested under `.areas` key), sum area per faction. Use area-weighted % everywhere: scripts, diagnostic prompts, reports, commander briefings.
- **Do instead**: Any time you compute territory percentages, use area-weighted. Load osid_areas.json once at startup. If displaying territory to user, AI, or in reports, it MUST be area-weighted. OSID counts are only acceptable for internal debugging where you need to know "how many OSIDs changed."

### [Process] OSID-level anchors, not municipality-level (2026-03-07)
- **Context**: Scenario anchors for pockets (e.g., Bihac) were set at municipality level. Municipality-level anchors gave false failures because a municipality can be partially controlled.
- **Wrong approach**: `anchor: "bihac"` — reports failure if any OSID in bihac municipality is lost, even if the pocket (Bihac city) is held.
- **Right approach**: `anchor: "op:bihac:bihac_2"` — checks the specific OSID that represents the pocket core.
- **Do instead**: Always use OSID-level anchors for calibration checkpoints. Municipality-level is too coarse for a 744-OSID map.

### [Debugging] The bug is never where you think it is (2026-03-08)
- **Context**: n304 had too-low casualties and RS wasn't degrading. Looked like a combat balance issue.
- **Wrong approach**: Tuning combat constants (attacker/defender rates, morale thresholds). The real bugs were: (1) `Number.isInteger` check was resetting fractional fatigue to 0 every turn — a type coercion bug masquerading as a balance problem, (2) equipment losses were simply missing from the OSID attack path — only the legacy SID path had them.
- **Right approach**: Trace the actual data flow. Print fatigue values across turns. Check whether equipment loss code even exists in the code path being executed. The answer was "no."
- **Do instead**: Before tuning constants, verify the mechanic is actually executing. Add a diagnostic tool/script to trace the value you're calibrating across turns. If the value isn't changing when it should, you have a bug, not a balance problem.

### [Debugging] Override direction is critical and confusing (2026-03-04)
- **Context**: RS territory calibration. RS was under-capturing some areas and over-capturing others.
- **Wrong approach**: Adding under-captured OSIDs to `avoided_osids`. This made RS *even less likely* to capture them — the exact opposite of intended. Cost: -0.7pp regression.
- **Right approach**: `avoided_osids` = fix OVER-captures (prevent VRS from attacking there). `osid_control_overrides` = fix UNDER-captures (force-start RS control). The names are confusing because they describe the *mechanism*, not the *problem*.
- **Do instead**: Before adding any override, state the problem as "RS has too much/too little here" and then match: too much -> avoided_osids, too little -> osid_control_overrides. Never guess — get it wrong and you regress.

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

### [Debugging] Empty execution windows need layer-by-layer diagnosis (2026-03-07)
- **Context**: Drina corps went dormant — zero operations for weeks 4-40 after pre-planned operations. Investigators assumed the operation relaunch was broken.
- **Wrong approach**: Debugging the operation execution code when the real gap was in corps directive generation. Three separate investigations before finding the right layer.
- **Right approach**: Three-layer diagnosis: (1) Is the operation launching? (2) Are brigades assigned? (3) Is the operation progressing? Find which layer is broken before touching code.
- **Do instead**: Build layer-by-layer diagnostic tooling. A blank execution window can mean: no launch, no assignment, no progression — each has a different fix.

### [Debugging] Formation state is a state machine — guard transitions, not values (2026-03-08)
- **Context**: `Number.isInteger(1.5) === false` caused the fatigue recovery guard to skip recovery, leaving fractional fatigue unreset. Looked like a formula error.
- **Wrong approach**: Checking if a value is an integer as a guard for a state transition. This is a type assumption, not a state guard.
- **Right approach**: Guard transitions with `typeof !== 'number'` (data presence) not `Number.isInteger` (value shape). Fatigue has explicit transitions: accumulate -> recover in cycles -> ceiling at 30. Guard the transition, not the value format.
- **Do instead**: For any state machine field, document the transitions explicitly. Never guard with shape assumptions (`isInteger`, `isArray`) when presence (`!= null`, `typeof`) is the right gate.

### [Debugging] Persistent symptoms = multi-layer failure (2026-03-10)
- **Context**: Deep-rear brigade evacuation (`89cac36`) — RS had 15 brigades stuck in deep rear. Initial investigation expected 1-2 bugs. Found 7 across: brigade AI evaluation chain, column march destination calculation, transit state reset, territory classification lookup, sector Voronoi gaps, and bot context missing fields.
- **Wrong approach**: Fixing the first bug found and expecting the symptom to resolve. Each fix revealed the next layer.
- **Right approach**: When a symptom persists after the first fix, switch from "find the bug" to "enumerate all layers that could cause this symptom." Build a layer-by-layer diagnostic. The 7-bug fix worked because it systematically audited: evaluation -> decision -> movement -> destination -> territory -> sector -> context.
- **Do instead**: If the first fix doesn't resolve the symptom, stop fixing and start mapping. List every system between input and output. Check each layer independently. Multi-layer failures are the norm in cross-system symptoms, not the exception.

### [Process] Session-scoped infrastructure must be re-created every session (2026-03-10)
- **Context**: Life-lessons daily cron (`3 6 * * *`) was documented in MEMORY.md but not in the napkin. Previous session didn't schedule it. Cron is session-only — dies when Claude exits.
- **Wrong approach**: Documenting session-scoped infrastructure only in reference docs (MEMORY.md). The napkin is what gets actioned at session start; MEMORY.md is background context.
- **Right approach**: Any session-scoped resource (crons, background tasks, watchers) must be in the napkin's Session Startup section with explicit "schedule this" instructions.
- **Do instead**: When adding any session-scoped infrastructure, add it to the napkin Session Startup section immediately. If it's not in the napkin, it won't happen next session.

### [Debugging] Paper-transfer systems need end-to-end smoke tests (2026-03-15) — NEW
- **Context**: The elite loan system set `on_loan=true`, updated tracker episodes, generated requests, deployed brigades — all correctly. But elites never fought. Five bugs across four files prevented combat. The "system works" appearance (correct flags, tracker entries, UI) masked total behavioral failure for 40 weeks.
- **Wrong approach**: Trusting that correct state means correct behavior. The loan state was perfect; the behavior was zero.
- **Right approach**: Define a smoke test before claiming any new system works: "what observable behavior MUST occur?" For elite loans: "at least one elite must appear in `weekly_report` battles." If the smoke test fails, trace the entity through every pipeline step: spawn -> deploy -> sector assign -> corps command lookup -> operation participation -> brigade AI -> attack order -> battle resolution.
- **Do instead**: For every new system that should produce observable behavior (combat, movement, territorial change), define the smoke test up front. Run it before claiming the system works. If the smoke test fails, do NOT debug the most complex layer — trace from input to output and check each handoff.

### [Debugging] Formation kind values: always verify against save files (2026-03-16) — NEW
- **Evidence**: `generateArmyHQOverrides` filtered for `f.kind === 'corps'` but corps formations use `kind: 'corps_asset'`. The function returned empty arrays for every faction on every turn — the entire Phase B army HQ override system was dead code. No error, no warning, just silent zero results.
- **Root cause**: The kind value was assumed from the type name, not verified against actual data. Other files in the codebase already used `f.kind === 'corps' || f.kind === 'corps_asset'`.
- **Rule**: When writing code that filters formations by `kind`, check the save file for actual values. Never assume `'corps'` — check for `'corps_asset'`, `'army_hq'`, `'brigade'`, `'paramilitary'` etc. The type system doesn't catch string literal mismatches against runtime data.
- **Related**: Save field name lesson (2026-03-12) — `corps_id` not `corps`, `location_osid` not `current_osid`.

### [Debugging] Validate attribution at three layers: firing -> accounting -> outcome (2026-03-01)
- **Context**: Displacement system attributed all casualties to "encirclement" due to OSID/SID mismatch. Ledger said "working" because accounting was technically correct. But 4.36M displaced = 4x history.
- **Wrong approach**: Validating only that a mechanism fires and the accounting is non-negative. Missing the sanity check on outcome magnitude.
- **Right approach**: Three-layer validation: (1) mechanism fires correctly, (2) accounting correct (no negatives), (3) outcome magnitude is historically plausible. All three must pass.
- **Do instead**: For any new casualty/displacement/loss mechanic, add a magnitude sanity check: is the total within 0.5x-2x of historical? If not, the mechanism has a hidden amplifier.

### [Process] Pre-run validity checks prevent calibration dead-ends (2026-03-06)
- **Context**: Multiple early calibration runs produced zero battles (n35, n52) because operation preconditions weren't checked before investing in a 40w run.
- **Wrong approach**: Running full 40w scenarios to discover that combat is fundamentally broken (no attack orders, wrong OSID keys, zero eligible brigades).
- **Right approach**: Proof-lane test (`scenario_vrs_operation_proof_4w.json`) validates that one VRS opening op can attack, battle, and advance in 4 turns. Run this before any 40w calibration.
- **Do instead**: Maintain a lightweight proof test that validates the critical path of the simulation. Run it before every calibration run. Saves 5-10 minutes per failed long run.

### [Process] Update CALIBRATION_MASTER during the session, not after (2026-03-06)
- **Context**: Calibration work produces insights that are lost if not captured immediately. Multiple sessions' worth of constants and run results were scattered across reports.
- **Wrong approach**: Writing calibration notes at end of session or in ad-hoc reports. Knowledge fragments across 20+ report files.
- **Right approach**: `CALIBRATION_MASTER.md` is the single source of truth for current constants, run history, and open questions. Update it as you change constants, not after.
- **Do instead**: Open CALIBRATION_MASTER.md at session start. Update it every time you change a constant or complete a calibration run. Same discipline for GUI_MASTER.md during GUI work.

### [Debugging] When same constants change nothing, check timing (2026-03-10)
- **Context**: Changed enclave defense scaling from 0.005->0.02 (4x improvement) but battle results were identical. The reason: Sarajevo fell at week 2-7, before the changed system could accumulate enough resilience to matter.
- **Do instead**: When tuning a system produces identical outcomes, check whether the battles happen BEFORE the tuned system activates. If the problem occurs at turn 2 and your fix accumulates over 20 turns, the fix is aimed at the wrong timescale.

### [Debugging] Rate tuning cascades unpredictably (2026-03-10)
- **Context**: Reducing frontline attrition (0.005->0.003) and increasing combat rates (0.08->0.10) both produced NET NEGATIVE results — fewer total KIA, more destroyed brigades. More surviving brigades changes battle dynamics in unpredictable ways.
- **Do instead**: Prefer structural changes (enabling new attack sources, fixing gates) over rate tuning. When rate changes regress all metrics, revert immediately — the system is nonlinear and small rate changes have chaotic downstream effects.

### [Debugging] Verify outcome field values before writing extraction scripts (2026-03-10)
- **Context**: Diagnostic scripts used `b.outcome === 'decisive'` but the actual field is `'decisive_victory'`. RS attack success appeared as 5-10% when actual was 91%. Led to multiple wasted tuning attempts (REACTIVE_DEFENSE_RATIO, attrition rates) based on wrong data.
- **Do instead**: Always check field values with `Object.keys()` or sample data before writing extraction logic. One wrong enum string can invalidate an entire investigation.

### [Process] Multiple code paths = multiple fix points (2026-03-11)
- **Context**: The disconnected brigade bug existed in three separate code paths that all performed brigade-to-sector assignment: `classifyBrigadesByTerritory` Phase 2, `ensureMinimumSectorCoverage` Steps 2-3, and the sector prune step.
- **Wrong approach**: Fixed Phase 2, ran scenario, claimed "fixed." n596 still had 12 disconnected assignments because `ensureMinimumSectorCoverage` was a second path doing the same wrong assignment without the reachability check.
- **Right approach**: After fixing one path, grep for ALL call sites that perform the same logical operation (in this case, "assign brigade to sector"). Fix ALL of them before claiming done.
- **RECURRED n635**: Even after fixing 3 paths (n598), two more fallback paths in `classifyBrigadesByTerritory` were missed (line 463, 529) PLUS the n631 density transfer added a new unguarded path. Grepping for "assign brigade to sector" isn't enough — you must also grep for "move brigade to sector" (march orders, reassignment orders). The invariant surface is: ANY code that changes which sector a brigade belongs to.
- **Do instead**: After any bug fix, search for every code path that performs the same operation. Use `Grep` for the key function/field names. One fix point is rarely enough for cross-cutting concerns. **For brigade-sector assignment specifically: grep for `assigned_brigade_ids.push`, `sectorReassignmentOrders.push`, `to_sector_id`, and any fallback/continue path in classification loops.** Add `check_disconnected_assignments.cjs` to the standard post-run diagnostic.

### [Planning] Multi-milestone roadmaps need freeze points, not just feature lists (2026-03-16) — NEW
- **Context**: Full roadmap review of 20 milestones (v0.5.0->v1.0.0) revealed a 7-step content dependency chain: events -> essays -> codex -> help -> tutorial -> localization -> store page. A change to event titles at v0.6.0 would cascade stale content through 6 downstream milestones. Without explicit freeze points, late changes destabilize everything.
- **Wrong approach**: Treating each milestone as independent. "We can always fix the text later." Late text changes require re-translation (v0.7.2), re-reviewed essays (v0.6.4), updated help tooltips (v0.5.2), and new store screenshots (v0.9.1). The cost of a "simple" late change multiplies through the dependency chain.
- **Right approach**: Define explicit freeze points in the roadmap where specific categories of change become prohibited: event freeze, content freeze, feature freeze, text freeze, code freeze. Each freeze narrows what CAN change, preventing cascading rework.
- **How to apply**: When planning any multi-milestone roadmap (>5 milestones), identify the content/feature/text dependency chains and place freeze points after the last milestone that produces each category. After a freeze, changes to that category require explicit Orchestrator approval with impact assessment on all downstream milestones.

### [Planning] Cross-plan reviews catch rework before it happens (2026-03-16) — NEW
- **Context**: v0.5.0 Phase 4 added diplomatic briefing items to the UI-side `buildCommandBriefing()` in GameStateAdapter. v0.5.1 Phase 2 rebuilt the entire briefing system sim-side in `collect_briefing.ts`. Without cross-plan review, the v0.5.0 work would have been thrown away and rewritten in v0.5.1. Also caught: capital bars built twice (v0.5.0 + VerdictScreen), SaveBrowser ordering dependency, help content duplicating codex content.
- **Wrong approach**: Writing plans in isolation and assuming they won't conflict. Each plan looks correct independently; integration failures only appear when comparing them.
- **Right approach**: After writing a batch of plans, do a dedicated cross-plan review pass looking for: shared systems modified by multiple plans, components built twice, execution ordering assumptions, content overlap. Produce a separate review document with numbered findings and apply changes to all affected plans.
- **How to apply**: Every batch of 3+ plans gets a cross-plan review before handoff. For plans spanning multiple version series (v0.5.x + v0.6.x), also do a cross-series review focusing on systems that evolve across the boundary.

### [Planning] Calibration sandwiches need a freeze protocol (2026-03-16) — NEW
- **Context**: v0.6.0 adds 60+ events with mechanical effects. v0.6.1 calibrates the game. v0.6.3 adds AI-generated procedural events with MORE mechanical effects. The calibration sits in the middle — stable before, destabilized after. Without a freeze protocol, the calibration work becomes invalid.
- **Wrong approach**: Calibrate once and assume all subsequent milestones are calibration-neutral. Any milestone that adds mechanical effects (events, AI content, economy changes) invalidates the calibration.
- **Right approach**: After the calibration milestone, establish a **calibration freeze baseline** (`data/calibration/v0.6.1_freeze.json`). Any subsequent milestone with sim-affecting changes MUST regression-test against this baseline. Pass criterion: all benchmarks within 2%.
- **How to apply**: After any calibration sprint, store the baseline. Tag it. Every future PR that touches `src/sim/` must include a calibration regression check in its checklist.

### [QA] AI commanders are your best alpha testers — run them after every engine change (2026-03-18) — NEW
- **Context**: Three API-powered AI commanders (Mladic, Halilovic->Delic, Petkovic) played a 40-week campaign and produced 321 diagnostic observations. They found: alliance decays too fast (22 obs), ARBiH over-mobilized (84 obs), operations not producing visible combat (38 obs), territory pacing wrong (16 obs), no patron directive system (12 obs), Jajce timing off (11 obs), late-war stasis (6 obs). Each observation includes severity, expected vs actual, and affected system.
- **Wrong approach**: Relying only on area-weighted % and benchmark pass/fail to evaluate engine health. These catch territorial accuracy but miss behavioral absurdities, force strength calibration, political timeline accuracy, and design gaps.
- **Right approach**: Run `npm run sim:qa:commanders` after every engine change. The AI commanders read the game state with historical knowledge and flag anything that doesn't match reality. The observation count is the engine's health metric — it should decrease with each fix cycle. Self-correction loop: fix -> re-run -> count -> repeat.
- **Do instead**: After every calibration run or engine change, run the three-commander QA. If observations increase, the change introduced problems. If they decrease, the engine improved. Target: 0 bugs, <50 calibration, <10 design gaps.

### [Night Shift] Distinguish "deferred integration" from "forgotten wiring" — flag both explicitly (2026-03-16) — NEW
- **Context**: Night shift v0.4.4 implemented `checkHeroicStand()` and `checkDefeatism()` in `officer_experience.ts` — well-written functions with clear APIs. But neither is imported or called anywhere. Unlike the event loader (which was accidental dead code), these appear to be intentionally deferred: integrating them requires battle resolution to link power ratios back to corps commanders, which is non-trivial. Similarly, `ScenarioSelectionScreen.tsx` (v0.4.2) was created but not imported in `App.tsx` — correctly deferred because App.tsx was on the "DO NOT Touch" list.
- **Wrong approach**: Leaving deferred functions without any marker. The morning report lists "heroic stand (+aggressiveness, +morale)" as implemented, but there's no note saying "integration deferred — needs battle resolution linkage." A future developer (or nightshift) sees the export, assumes it's active, and builds on a foundation that doesn't exist.
- **Right approach**: When creating a function that can't be wired yet, add a `// TODO(nightshift): not yet called — needs X to integrate` comment at the export AND note it in the morning report as "API ready, integration deferred: [reason]." When a component can't be imported due to DO NOT Touch constraints, note that too.
- **Do instead**: Every exported function must be either (a) imported and called, or (b) explicitly marked as deferred with the reason. The morning report must distinguish "implemented and active" from "API created, integration pending."

### [Night Shift] Every new function must be imported and called — dead code is invisible failure (2026-03-16) — NEW
- **Context**: Night shift (v0.4.1) created `event_loader.ts` with `loadEventDefinitions()` to load 41 historical events from JSON files. The function is well-written, well-documented, properly handles errors, sorts deterministically. But it is **never imported or called anywhere**. `evaluateEvents()` iterates `EVENT_REGISTRY` from `event_registry.ts` — a hardcoded array of 15 narrative-only placeholder events. All 41 rich events with mechanical effects (morale, supply, alliance, war crimes, decisions) are dead code.
- **Wrong approach**: Creating a loader function and data files, then moving on to the next milestone without wiring the loader to the consumer. The nightshift morning report declared "41 historical events" implemented — because the files exist. Nobody checked whether the events actually fire.
- **Right approach**: After creating any function, immediately verify it is (1) imported by its consumer, (2) called at runtime, and (3) produces observable output. For events: run the scenario, grep the weekly report for `events_fired`, confirm the right events appear at the right turns.
- **Do instead**: Before marking any feature complete, answer: "How do I know this code actually runs?" If the answer requires tracing imports, do the trace. A function that exists but is never called is worse than no function — it creates false confidence. **Minimum bar: the function must appear in at least one import statement outside its own file.**

### [Night Shift] Output serialization must include new report fields (2026-03-16) — NEW
- **Context**: The `evaluate-events` pipeline step correctly sets `context.report.events_fired` with fired event data. But `buildWeeklyReport()` in `scenario_reporting.ts` never includes `events_fired` in its output row. The scenario runner manually attaches `column_movement` and `movement_report` from the turn report (lines 1919-1923) but doesn't do the same for `events_fired`. Result: events fire at runtime but are invisible in all scenario output files.
- **Wrong approach**: Adding a report field to the pipeline context type (`turn_pipeline_types.ts`) and setting it in the pipeline step, then assuming it will appear in the output. The weekly report builder has its own explicit field list.
- **Right approach**: When adding a new field to `TurnReport`, also add it to `buildWeeklyReport()` or the manual attachment block in `scenario_runner.ts`. Verify by running a scenario and checking the JSONL output for the new field.
- **Do instead**: Treat "field appears in output" as part of the definition of done. If you add `context.report.X`, grep `scenario_reporting.ts` and `scenario_runner.ts` for where report fields are serialized. Add your field there. Verify with: `node -e "..."` checking the weekly_report.jsonl.

### [Night Shift] Placeholder registries must be replaced, not left alongside real data (2026-03-16) — NEW
- **Context**: `event_registry.ts` contains 15 hardcoded placeholder events (narrative-only, no `once` flag, fire every turn in their range). The night shift created 41 rich events in JSON files plus a loader — but left the placeholder registry intact and active. Even if the loader were connected, the placeholders would still fire alongside the real events, producing duplicates (e.g. both `srebrenica_enclave` placeholder AND `srebrenica_enclave_forms_1992` real event).
- **Wrong approach**: Creating the replacement system (JSON loader) without removing or replacing the thing it replaces (hardcoded registry). Both systems coexist in silent conflict.
- **Right approach**: When building a replacement for a hardcoded registry, the old registry must be emptied or removed in the same commit that connects the new one. If the new system isn't ready to connect, leave the old one and don't create the replacement yet.
- **Do instead**: Search for the constant that the consumer reads (`EVENT_REGISTRY`). If you're replacing its source, replace it completely. Never leave two competing sources of truth.

### [Night Shift] Effect handlers must guard against missing state fields (2026-03-16) — NEW
- **Context**: `applySupplyDelta()` correctly guards `if (!state.military.general_supply_reserve) return;` — it silently no-ops when the field doesn't exist. Similarly `applyHumanitarianImpact` and `applyPatronPressure` guard against missing `negotiation` state. This is defensive but makes failures invisible: supply_delta events fire, appear in the fired list, but have zero effect because the state field doesn't exist yet at that point in the game.
- **Wrong approach**: Silent no-ops that mask broken preconditions. The effect "succeeds" (no error) but does nothing.
- **Right approach**: Two options: (1) Initialize the state field with defaults before events evaluate (so effects always apply), or (2) Log a warning when an effect is skipped due to missing state, so the developer knows the effect didn't apply. Option 1 is preferred — effects should be mechanical, not conditional on state initialization order.
- **Do instead**: When writing an effect handler that guards against missing state, ask: "Should this state always exist by the time this effect runs?" If yes, the guard is hiding a bug. If no (e.g. peace phase doesn't have military formations), the guard is correct but should be documented.

### [Night Shift] Smoke-test each milestone's observable behavior before moving to the next (2026-03-16) — NEW
- **Context**: Night shift implemented 8 milestones in sequence. The morning report lists all commits, test counts, version tags. But no milestone was smoke-tested for observable behavior. The event system (v0.4.1) was declared complete with "41 historical events" — but zero events produce observable output in a scenario run. A single `grep events_fired weekly_report.jsonl` would have revealed the disconnection immediately.
- **Wrong approach**: Using "tests pass + tsc clean" as the completeness criterion. Unit tests verify individual functions in isolation; they don't verify that the functions are wired into the pipeline. 13 event tests pass — but events don't fire in an actual game.
- **Right approach**: For each milestone, define ONE observable behavior check that can only pass if the full pipeline is connected: "Run a 10-week scenario. Does X appear in the output?" For events: do `events_fired` entries appear in weekly reports? For economy: do production facility outputs change supply reserves? For officer experience: do officer stats change after operations?
- **Do instead**: Before bumping the version for a milestone, run the scenario and verify the feature's output in the run artifacts. Not tests. Not type checks. Actual scenario output.

### [Night Shift] Per-entity loops must not multiply global effects (2026-03-16) — NEW
- **Context**: Decision events (London Conference, Vance-Owen) iterated all 3 factions. For each bot faction, the chosen response effects were applied independently. With 2 bot factions, effects applied twice; with 3 bots (headless), 3x. The London Conference "accept" gave RBiH +30 credibility instead of +10.
- **Wrong approach**: Iterating factions and applying the same global effect inside the loop. The response effects target a specific faction (hardcoded `"faction": "RBiH"`), not the iterating faction. The loop multiplies instead of distributing.
- **Right approach**: Diplomatic events fire once globally. Bot auto-responds once (pick one response, apply once). Player gets one decision. The faction loop was conceptually wrong — a peace conference produces one outcome, not three independent outcomes.
- **Do instead**: When writing a per-entity loop that applies effects, ask: "Do these effects target the iterating entity, or a fixed target?" If fixed target, the loop is multiplying. Apply once outside the loop.

### [Process] Agent-driven UI rewrites can silently overwrite months of work — always diff against a known-good baseline before committing (2026-03-25) — NEW
- **Context**: Commit `520196a2` ("Army HQ modal improvements") completely rewrote `ArmyHQModal.tsx` and `SituationBriefing.tsx`, stripping the 4-tab command center down to a single-page view and replacing the compact card grid with a sparse vertical list. Lost: CoS briefing, emergency posture, Records/Personnel tabs, SituationBriefing grid layout, BriefingTarget navigation. The commit message said "improvements" but was actually a destructive rewrite. Discovered 2 days later when user noticed blank space and missing features.
- **Wrong approach**: Trusting an agent's commit message ("improvements") without diffing against the previous version. The agent had no context about the existing Army HQ's design history and reimplemented from scratch.
- **Right approach**: Before committing any agent-generated UI rewrite, diff against the last known-good version: `git diff HEAD~1 -- <file>`. If the diff shows more deletions than additions in a mature component, STOP and review. For critical UI components (Army HQ, Chronicle, map), maintain a "known-good commit hash" in the napkin.
- **Do instead**: For any agent working on existing UI components: (1) read the component FIRST, (2) make targeted changes, don't rewrite, (3) diff before commit and flag if >30% of lines changed. Add "DO NOT REWRITE" guards to critical component headers.

### [Process] Determinism is sacred (2026-02-25)
- No `Math.random()`, no timestamps, sorted iteration via `strictCompare`. Consistently followed — no violations in last 3 days.

### [Process] Smoke-test triad after every change (2026-02-21)
- `tsc --noEmit` + `vitest run` + `desktop:map:build`. Consistently run. No recent failures from skipping.

### [Process] Experts must know their domain's data schema — one read of game_state.ts beats four greps (2026-03-29) — NEW
- **Context**: Scenario Tester checked `save.events.events_fired` (doesn't exist), declared "CRITICAL — zero events fired." Events are at `state.military.fired_event_ids`. Orchestrator checked `state.military.operation_history` (wrong interface). Both wasted investigation cycles on false alarms.
- **Wrong approach**: Grepping for field names across the codebase. Four sequential searches to find where a field lives.
- **Right approach**: Read `src/state/game_state.ts` ONCE before writing any data access code. Know: events at `military.fired_event_ids`, operations at `state.operation_history` (GameState root), formations at `military.formations`, intel at `military.sector_intel`, sectors at `military.corps_front_sectors`, control at `political.political_controllers`.
- **Do instead**: Before any expert accesses save file data, verify the field path against GameState interface. One targeted read beats four greps.

### [Process] Dispatch experts by file ownership, not by gut feel (2026-03-29) — NEW
- **Context**: Bug in `brigade_assignment.ts` affected both sector assignment (sector expert) AND `formation.assignment` sync (formation expert). Only sector expert was dispatched initially — user had to prompt for formation expert.
- **Wrong approach**: Dispatching the expert whose name matches the symptom ("unassigned sectors" → sector expert). Missing that the fix spans two ownership domains.
- **Right approach**: List ALL files that need changes, check skill authority tables for ownership, dispatch ALL owners with clear scope boundaries.
- **Do instead**: Before dispatching, ask: "which files are affected and who owns each?" Not "who sounds right for this symptom?"

### [Process] Orchestrator must not analyze scenario results — dispatch experts (2026-03-29) — NEW
- **Context**: After n1196 run, orchestrator interpreted calibration numbers, declared "historically correct," assessed order counts — all without dispatching any expert. User called it out.
- **Wrong approach**: Reading scenario output directly and presenting analysis. Faster but violates the orchestrator role (switchboard, not analyst).
- **Right approach**: Dispatch `/scenario-creator-runner-tester` for the report, then `/war-or-game` for realism assessment. Present raw numbers. Attribute all interpretation: "War-or-Game found X" not "I found X."
- **Do instead**: Hook now enforces this. After any Bash output containing scenario results, dispatch experts before responding.

### [Process] Validate internal consistency after every run, not just calibration % (2026-03-29) — NEW
- **Context**: RBiH peak_personnel was below current personnel for nearly every brigade — nobody noticed because we only check calibration %. Casualty taken/inflicted gap of 8,327 went unnoticed. 23 unassigned brigades went unnoticed.
- **Wrong approach**: Running `compare_painted_vs_sim.cjs` and `diagnose_run.cjs` and calling it done. These check territorial outcomes and deployment health, not internal accounting consistency.
- **Right approach**: Run `tools/validate_run_consistency.cjs` after every scenario run. Checks: peak >= current, taken/inflicted accounting, assignment completeness, ghost paramilitaries, intel system liveness, formation.assignment sync.
- **Do instead**: Add consistency validation to the post-run checklist alongside calibration comparison and diagnostics. Numbers that don't add up = bugs hiding in plain sight.

### [Process] Worktree agents produce uncommitted changes — always extract, apply, and verify on main (2026-04-15) — NEW
- **Context**: All 5 worktree implementation agents (Lanes A–E) produced correct file changes but could not commit or run full verification. Worktrees had 8,000+ tsc errors from missing UI workspace dependencies (React types, maplibre-gl, @vitejs/plugin-react). Changes had to be manually extracted as `git diff` patches and applied to main for tsc/vitest/build verification.
- **Wrong approach**: Expecting worktree agents to self-verify and commit. The worktree environment is incomplete — UI workspace deps don't resolve from the worktree root.
- **Right approach**: Treat worktree agents as code-generation tools, not as self-contained CI. Extract their changes as patches (`git diff --cached > /tmp/lane.patch`), apply to main (`git apply`), verify there (tsc + vitest + build), then commit from main.
- **Do instead**: When dispatching worktree agents, tell them to stage changes but expect uncommitted output. Plan the patch extraction + main verification as part of the orchestration workflow, not as a surprise cleanup step.

### [Process] Verify pipeline step names by grepping the actual pipeline, not by agent memory (2026-04-15) — NEW
- **Context**: Investigation agent reported rupture step predecessor as `evaluate-patron-events`. Actual name in `war_phases.ts` was `update-patron-pressure`. Pipeline proof test failed until corrected by grep. The agent approximated the name from import context, not from the `name:` field.
- **Wrong approach**: Trusting agent-reported step names without verification. Agents see import names (`evaluatePatronEvents`) and infer step names, but the actual `name:` string in the NamedPhase object may differ.
- **Right approach**: Always `grep "name:.*patron" src/sim/turn_phases/war_phases.ts` (or equivalent) before writing tests that reference pipeline step names. The `name:` field is the source of truth.
- **Do instead**: When writing pipeline step tests, grep for the exact `name:` string in the NamedPhase array. Never rely on function import names or agent reports as proxies for step names.

### [Process] Parallel agent dispatch needs exclusive file ownership — overlapping edits corrupt files (2026-03-29) — NEW
- **Context**: 4 agents dispatched for active_operation migration. Two agents both edited army_reserve_system.ts. One agent mangled h_phase_intelligence_warfare.test.ts badly (deleted test bodies, parse errors).
- **Wrong approach**: Assigning files to agents without checking for overlaps. Trusting agents to do bulk find-replace without reading context.
- **Right approach**: Create a file ownership table before dispatch. No two agents touch the same file. Each agent runs tsc after edits.
- **Do instead**: Before parallel dispatch: (1) list all files, (2) assign each to exactly one agent, (3) verify no overlaps, (4) add "run tsc after edits" to every prompt.

### [Process] Worktree-isolated scenario/test agents can die silently at npm install (2026-06-11)
- **Context**: PR #417 recorded three scenario/audit agents dispatched into fresh isolated worktrees that died during `npm install`/Puppeteer setup with 0 output bytes and no useful error trail. The durable failure mode is not "worktrees are bad"; it is that fresh worktrees are not self-contained CI environments.
- **Right approach**: Run scenario, test, and build agents in the main checkout when they need the existing dependency tree. Use isolated worktrees for code generation or pure artifact-reading/docs analysis, and junction/copy dependencies deliberately before expecting a worktree to run npm.
- **Do instead**: Before dispatching any agent that will run `npm`, `npx`, Vite, Vitest, or scenario tooling, check whether it is in a fresh worktree. If yes, either redirect to the main checkout or provision dependencies first. Treat "0 bytes written after the expected window" as a failed dispatch, not a long-running job.

### [Process] Empty `.bin` shims require direct package entrypoints (2026-06-11)
- **Context**: PR #417 captured a Windows environment where `node_modules/.bin/tsx`, `node_modules/.bin/vitest`, and adjacent shims were empty or unreliable. Later root-script fixes confirmed the same class: a bare shim can disappear or resolve incorrectly even when the package itself is installed.
- **Right approach**: Prefer checked-in `npm run ...` scripts when they are known to call a stable entrypoint. For ad hoc commands, invoke package entrypoints directly, e.g. `node node_modules/tsx/dist/cli.mjs <script>` or `node node_modules/vitest/vitest.mjs run ...`.
- **Do instead**: Do not write agent prompts or local docs that depend on `.bin` shim luck. If a command must bypass npm scripts, use the package's real JS entrypoint and record the exact command in the prompt.

### [Process] Verify agent liveness before waiting on 0-byte output (2026-06-11)
- **Context**: PR #417 recorded an orchestrator waiting across turns for a dispatched audit agent that had already died: the worktree existed, but the expected output artifact stayed at 0 bytes. This repeated the broader "agent success claims are not proof" pattern with a time/liveness dimension.
- **Right approach**: Set an expected first-output window for each agent class and check the artifact, log, or transcript size at that point. Scenario runs may be long, but analysis/docs agents should produce nonzero output quickly.
- **Do instead**: If an agent's expected artifact is still 0 bytes after the expected window, stop waiting and re-dispatch or take over. Prefer a main-checkout, artifact-reading analyst for run-output interpretation so recovery does not repeat the same npm/worktree failure.

### [Process] Worktree builders stall mid-investigation — build small precise specs directly; salvage stalls via patch-extraction (2026-06-12) — NEW
- **Context**: 4–5 dispatched worktree builders stalled mid-task in one day (EH-4 Fix B, C3 freeze, SRK fix builders). Two modes: auto-removed-unchanged (stalled during reading → no commit → nothing to salvage) and dirty-uncommitted (edited but stalled before `git commit` → work is in the worktree, salvageable).
- **Right approach**: For a SMALL, precisely-specified change (≤ ~15 LOC + 1 test, with the full diff/spec already in hand), the orchestrator builds it DIRECTLY — dispatch overhead + stall risk exceeds the value of implementer/reviewer separation (CI + Codex are the reviewers). When a builder stalls dirty, salvage via patch-extraction: `git -C <worktree> diff > /tmp/x.patch`, then `git checkout -b fix/... && git apply /tmp/x.patch` in the MAIN checkout — never run git ops inside the worktree.
- **Do instead**: Reserve dispatch for genuinely large or parallelizable work. For a one-file surgical fix you've fully diagnosed, build it yourself and let CI/Codex review.

### [Process] Verify PWD (not just rev-parse --show-toplevel) before any worktree git op (2026-06-12) — NEW
- **Context**: A `git cherry-pick` ran while the shell cwd had drifted into a half-removed worktree dir (`.claude/worktrees/agent-...`). `git rev-parse --show-toplevel` returned the MAIN repo (the worktree's `.git` link was already gone), so the standard worktree-safety check passed — but the cherry-pick applied onto the worktree HEAD (→ empty) and `MASTER_ROADMAP.md` read as "missing" (relative path resolved against the broken worktree).
- **Right approach**: Before any worktree-adjacent git op, check `pwd` AND `git branch --show-current` AND `--show-toplevel`. If pwd is inside `.claude/worktrees/`, `cd` to the main checkout first (or use `git -C <main>`).
- **Do instead**: Treat `pwd` as the ground truth for which tree you're operating on — `--show-toplevel` can lie when a worktree is mid-removal. Recovery was clean (work was committed+pushed) but cost a diagnostic cycle.

### [Testing] Flag-interaction lanes need RESUMED-save validation — fresh-run + CI gate can't see stale-serialized-state leaks (2026-06-12) — NEW
- **Context**: Codex caught two bugs (P1 #427, P2 #428) in the SRK strangle doctrine that BOTH a fresh-run 188w AND the engine-health-188w CI gate passed clean. Class: two flags (Lane V + SRK) write a SHARED persisted field (`last_contained_osids_by_faction.RS`); on a RESUMED save, stale data from a now-OFF flag leaks through the shared field. Fresh runs (flag off from t0) never serialize the stale state, so they can't surface it.
- **Right approach**: When a change adds a flag that reads/writes a shared persisted field also used by another flag, add a unit test simulating the RESUMED-save cross-flag state — pre-seed the field as if the other flag wrote it, then toggle and assert the now-off flag's stale entries are dropped.
- **Do instead**: Don't accept fresh-run + territory-flat as sufficient for flag-INTERACTION correctness. Enumerate the {flagA, flagB} × {fresh, resumed} matrix for any shared-persisted-field flag.

### [Process] Verify-the-premise saved a redundant lane twice in one day (2026-06-12) — PROMOTED
- **Context**: (1) the "§6 symmetry-sentence remediation" gate was scoped before any FORAWWV edit — already done (two event-text fixes #272/#415 merged), no canon edit needed. (2) EH-4 Fix B scoped before building — code showed both conditions already engine-blocked (redundant + over-block risk), dropped. Plus both Codex catches (#427/#428) are the same discipline on shipped code.
- **Do instead**: ANY "we need to build/edit X" is a hypothesis until the current code/state is read. Read first, build second. Re-validated 3× this 24h — promote to a standing default.

### [Testing] Dispatched builders run only their own test file — instruct the FULL relevant suite for shared-surface changes (2026-06-15, 3× in 48h)
- **Context**: Three isolated worktree builders in 48h passed their OWN targeted tests but each shipped a regression visible only in the full suite — #436 (golden-manifest move, surfaced in CI), the SRK activation (broke `contain_posture_release_laneA` purity tests), and #441 (the generals' digest flooded `ChronicleOverlay`, burying an operation-AAR card → `ui_chronicle_operation_aar_link` RED). Each required a RED-CI round-trip + a relay-to-fix cycle.
- **Root cause**: an isolated worktree builder defaults to running ONLY the file it just wrote (it's the cheapest local signal). A change to a SHARED surface — a chronicle/event list, a capped/sorted/grouped render, a registry the UI or engine iterates, a flag feeding a shared predicate, an in-window persisted/logged field — interacts with OTHER tests the builder never runs.
- **Right approach**: the CI gate is the backstop (it caught all three), but a local full-suite run is cheaper than a CI round-trip. In the dispatch prompt, for any shared-surface change, explicitly instruct: "grep tests for the host component/predicate (e.g. `ChronicleOverlay`, `contain_posture`, the registry name) and run them ALL, not just your new file; for sim-touching changes also run `test:baselines`."
- **Do instead**: when scoping a dispatch that adds to a shared render/aggregation/registry surface, name the full test set the builder must run. Don't rely on "I added a passing test" — a passing NEW test says nothing about the EXISTING tests that share the surface. Pairs with the calibration "golden manifest vs structural fingerprint" lesson (same shape: the narrow check passes, the broad check catches the interaction).

### [Testing] Default-on flags feeding shared predicates need every consumer and purity assertion checked (2026-06-14)
- **Context**: Flipping `AWWV_SRK_STRANGLE_POSTURE` default-on made the shared `isContainSuppressionActiveFor('RS')` predicate true even when Lane-V flags were off, breaking another flag family's purity tests. The local SRK-focused suite and 40w fingerprint missed it; the broader `contain_posture_release_laneA` tests caught it in CI.
- **Do instead**: When activating a flag that writes a shared field or feeds a shared predicate, grep every consumer and every other flag's default-state assertions before pushing. Update isolation tests explicitly, or add override setup so a default-on feature does not invalidate unrelated purity claims.

### [Process] Contaminated test runs require rerunning every failed file clean (2026-06-14)
- **Context**: A local full-suite run mixed real failures with ENOENT noise from running `desktop:map:build` concurrently with Vitest. Rerunning one representative failed file passed, but two genuine `contain_posture` failures remained and then failed CI.
- **Do instead**: Do not run `desktop:map:build` concurrently with full Vitest. If a concurrency artifact contaminates a run, rerun every distinct failed file in isolation; never clear the whole failure set from one representative pass.

### [Process] Large parallel dispatch is valid when tasks are substantial and isolated (2026-06-14)
- **Context**: The 2026-06-12 worktree-builder stall pattern was a warning against dispatching tiny surgical specs, not against all agents. The next large soul-systems batch dispatched three substantial isolated lanes (warroom art, RS goals, HRHB events); all completed cleanly, opened PRs, and reported evidence.
- **Do instead**: Keep small, fully-diagnosed fixes with the orchestrator. Use parallel agents for genuinely substantial, isolated lanes with clear file ownership, mandatory proof, and parent-side verification of landed edits.

### [Process] A "fill the gaps" surface must be gated to only fill gaps (2026-06-15)
- **Context**: The #441 generals' digest fired on every turn, but its D2-P4 purpose was to fill silent turns. Gating it to emit only on turns with no other substantive chronicle entry both fixed displacement and made the feature match its design.
- **Do instead**: Any surface whose job is "fill dead air" must compute gaps from real content first and emit only into those gaps; an unconditional per-turn version will compete with the content it was meant to complement.

### [Process] Enforce a Section 6 bright line in the runtime path, not just tests (2026-06-15)
- **Context**: #441 initially guarded forbidden vocabulary only in tests while runtime prose interpolated live operation names. The fix scrubbed author-supplied names at the single runtime boundary where they entered the digest prose.
- **Do instead**: Any read-model prose surface near Section 6 content that interpolates author-supplied strings must scrub or guard at runtime, not only through synthetic test assertions or naming discipline.

### [Process] Verify-the-premise: a held item may already be shipped (2026-06-15)
- **Context**: A standup D2 priority scoped as a Section 6-gated build was already un-held and shipped under a prior delegated panel GO. Reading current state turned a build into a verification.
- **Do instead**: Treat every "held", "TODO", or "pending" label as a hypothesis until current code, docs, and GitHub state are checked.

### [Testing] Player-only state is invisible to EVERY automated gate - campaign integrals must be contract tests (2026-07-06; CA-2 resolved 2026-07-09) - NEW
- **Context**: The 2026-07-06 owner release review found the flagship Presidential Command Model resource economy was never validated over campaign length. The legacy model initialized `military.command_authority` at 100/100, regenerated through one flat credit site minus force-launch/friction penalties, had no refunds, and cost 25 per override lever. Campaign integral: <=476 CA lifetime => ~19 max / ~4 hoard-case presidential acts across a 188w war, recovery silently destroyed at cap, and a self-penalizing spiral. The field is player-only and absent in headless/calibration, so 2,000+ scenario runs, the 188w engine-health gate, per-action unit tests, and browser gates were all structurally blind; D2 (a full played campaign) never happened. CA-2 now resolves this with a political-income helper, 15-CA visible reserve, source vocabulary validation, and a retuned campaign-integral contract test.
- **Wrong approach**: Trusting that per-constant rationale comments ("25 because sacking a commander is a big political act", "small fixed trickle hard-caps micromanagement") add up to a designed economy; assuming a green gate wall covers systems the gates cannot carry.
- **Right approach**: Treat "which state exists ONLY in player sessions" as a first-class blindness inventory. For every player-only meter/resource, write a contract test that COMPUTES the campaign integral - lifetime income vs costs vs cap over the full scenario horizon, including penalty interactions - and pins it to an explicitly chosen cadence spec. Feel-validate through owner friction diaries, the only instrument that measures experience.
- **Do instead**: (1) grep for state fields guarded by absent-in-headless comments or `if (!field) return` early-returns in war phases - each is gate-invisible; (2) for each, add a campaign-integral contract test (`docs/plans/2026-07-06-command-authority-economy-plan.md` CA-0 is the template); (3) when two constants only make sense as a product over time, a test owns the product; (4) route the cadence CHOICE to a Pyrrhic panel with the computed table as input - never let it remain an accident of two locally-reasonable numbers.

### [Testing] Ask not "does this pass?" but "could this have failed?" (2026-08-14) - NEW
- **Context**: The RC collapse lane surfaced EIGHT separate things that were green while asserting nothing — `it.skipIf` making two §6 cases vanish into skips for their entire existence; five honest mutations all landing on the already-covered layer; an equality pin passing the realistic bypass by checkout coincidence; two empty controller maps comparing 84 keys of `undefined` against `undefined` and reporting a clean §6 identity proof; a deleted guard leaving 21 tests green; the Stage 2 §6 pass itself; two manifest scenarios uncompared since Aug 11 behind a first-mismatch abort; and a regex matching nothing passing an allowlist check. **Not one was found by reading. Every one was found by someone deliberately trying to make it lie.** Five were agents catching themselves.
- **Wrong approach**: Reading a test and judging it sound. A vacuous assertion looks identical to a working one — that is the entire problem. "Mutation-verified" as a claim to accept rather than a claim to test.
- **Right approach**: For a guard, delete it and see what fails. For a loop, assert how much was COMPARED, not just that violations were zero. For a pin, mutate the mechanism it bans AND the answer it binds — different things, neither subsuming the other.
- **Do instead**: On any new guard, ask what input would make it fire, then construct that input. If you cannot construct it, the guard is unreachable and you have found something (see the architecture-file lesson on reachability). Treat a reviewer's "mutation-verified" as unverified until you have run one yourself.

### [Testing] Mutate at EVERY layer the guard claims to cover — the uncovered layer is the wiring (2026-08-14) - NEW
- **Context**: An implementer ran five honest mutations on a flag-lifecycle fix and still shipped a net that could not catch its own defect. All five hit the pure-function layer, which was already well covered; conditionalizing the CALL (`if (env) { applyGate(); }`, the original bug verbatim) left all 11 tests green. Same shape twice in one commit: the §6 run-selection helper was genuinely behavioural, but the suite's USE of it was pinned by grep — keep the call, ignore its result, every pin passes.
- **Wrong approach**: Thorough mutation of one layer, which produces real evidence of the wrong thing and therefore reads as diligence.
- **Right approach**: For each guard ask "is the CALLER forced to use this?", not only "does the function behave?".
- **Do instead**: Enumerate the layers a guard spans (predicate → function → caller → consumer) and mutate at each. Where a grep pin and an equality pin both exist, know what each buys — the grep bans the mechanism, the equality binds the answer — and keep both; the realistic mtime-DESCENDING bypass passed the equality pin because on that checkout mtime-newest and counter-newest were the same directory.

### [Testing] A loop over an empty set is a green test that asserted nothing (2026-08-14) - NEW
- **Context**: The §6 suite's full-keyspace loops iterated ZERO times and passed — the sentinel artifact had 0 keys in all three collapse maps, so ten `toBeUndefined()` assertions passed on empty maps while the receipt printed `EXECUTED`. New criteria-4/7 tests then reproduced the class: two empty controller maps compared 84 keys of `undefined` against `undefined` and reported a clean §6 identity proof over zero comparisons, reached via two silent `?? {}` fallbacks in a loader — the GameStateAdapter field-path class landing on the §6 gate itself.
- **Wrong approach**: Computing and PRINTING a liveness count. A `console.warn` in a 3,500-test run is not an assertion.
- **Right approach**: `expect(comparedCount).toBe(84)` beside `expect(violations).toEqual([])`, asserted BEFORE the comparison — a liveness check after the comparison is decoration.
- **Do instead**: Assert the derived set's SIZE, assert the number actually resolved against real data, and carry the count into the test name or receipt (`EXECUTED(keys=84)`) so a reader of a green run can see how much was checked. Prefer a hard resolution pin over a `> 0` floor where the data justifies it, and never add a weaker duplicate alongside a stronger one — that creates two places to loosen when someone wants a red to go away.

### [Process] A comment can be wrong four times running, each correction inheriting its neighbour's error (2026-08-14) - NEW
- **Context**: The §6 consumer docblock was wrong four times: "all consumers report-only"; a false "the CLI harness honours the guard automatically"; the "primary chokepoint" claim; and nearly a fourth, a subjunctive rewrite implying `will_not_recover` might currently trip on a §6 enclave when it provably cannot. Every correction was made carefully by a competent reader.
- **Wrong approach**: A fifth careful revision. Prose describing five files across three directories cannot stay true when those files move, and "be more careful" does not address that.
- **Right approach**: Subordinate the drift-prone part to the checkable part — lead with the one verifiable claim ("no collapse consumer reaches attack-launch or defender-strength, except X at file:line"), state explicitly that everything below drifts, and instruct the reader to re-derive from call sites rather than prose on disagreement. Then make it ENFORCED and DELETE the prose: a frozen importer manifest replaced the inventory entirely.
- **Do instead**: The payoff of such a test is the DELETION, not the guard — keeping both is a fifth thing to hold in sync. But answer the counter-argument first: a claim quantifying over a set is unfalsifiable if the set is nowhere enumerated, so the inventory survives UNTIL the manifest exists, then goes. Make that the explicit exit condition.

### [Process] NEVER `git checkout --` in a tree another agent is working in (2026-08-14) - NEW
- **Context**: A reviewer reverted its own mutation with `git checkout -- <file>` and silently discarded another agent's UNCOMMITTED work in the same file, then measured and reported a degraded count. The implementer had written the change, verified it, and reported honestly — and been rolled back after its measurement. Both agents reported truthfully and the tree disagreed with both.
- **Wrong approach**: Treating `git checkout --` as a local undo. It is a whole-file reset to HEAD and it cannot distinguish your edit from anyone else's.
- **Right approach**: `cp file file.bak` before mutating, restore with `cp`, delete the backup. Confirm `git status` is clean of your changes when finished.
- **Do instead**: Same hazard class as committing in a running agent's worktree. Corollary, which is the more general lesson: **a report is only true as of its last measurement, and in a shared tree that window is short** — re-verify immediately before reporting, and treat a count that disagrees with your own file list as the tell.

### [Process] ★ A DERIVED SIGNAL READ AS A PRIMARY ONE — ten instances in one session, each in a different costume (2026-08-21) — NEW, DOMINANT PATTERN

- **Context**: one crash-recovery session produced ten failed premises, all from the orchestrator or a seat, and every one is the same error: **a thing that summarises, indexes, records or reports the system was treated as the system.** The costumes are what make it hard to see, so they are enumerated rather than generalised:
  1. **A ledger sentence read outside its scope.** "Exactly two commits touch a consumed input" was scoped *from the n223 tree forward*; the dispatch brief applied it *from the blessed manifest*, silently excluding `02822200a` — **the larger mover**.
  2. **A CI red attributed to the commit it appeared on.** An earlier red (stale taxonomy pins) had swallowed the baseline-regression step for two pushes; the break surfaced later wearing a newer commit's name.
  3. **A `?? false` default in a diagnostic.** A seat printed `mandatory = (r.mandatory ?? false)`, coercing *absent* into *declared false*, so its readout could not distinguish the two states it was written to observe.
  4. **A guard test's key-matching read as formation existence.** See the architecture entry on the `oob:` tag.
  5. **A direction-of-change notation read without its subject.** `gorazde->vlasenica` described the REVERT's direction; the brief restated it as the original re-homing, inverting BOTH re-homings in a Historian brief.
  6. **A four-group summary taken for the commit's own record.** `02822200a`'s message says *"nine-plus, not the four originally reported"* and names the missing groups. The brief said four.
  7. **A `?? false`'s cousin: `location_osid` on a dead unit.** `destroyed_brigades.json` carries a POST-death teleport cell, not the death site — nearly filed as "brigades march 250 km to Čapljina", and it was a pillar of two OPPOSING rulings on 2026-08-17.
  8. **A consumed-input digest read as a tree fingerprint.** It hashes WORKING-TREE BYTES, so `core.autocrlf` makes two checkouts of one commit disagree.
  9. **`pocket_destroyable`** — a field with zero consumers in `src/`, reasoned from as if live.
  10. **★ A COLLEAGUE'S "I VERIFIED".** A seat reported it had checked `final_save.json` for a brigade; the orchestrator accepted that instead of running the check, and committed the claim. It was false. **This is the costume with no tell — the others look like data, this one looks like diligence.**
- **Do instead**: when a claim is load-bearing, **go to the thing itself, not to anything that describes it.** The primary is the PDF not the extraction, `git show` not the commit summary, the artifact not the `run_meta`, the live object not the key you expect it under, and **your own check, not a colleague's report of one.** When a derived artifact and a primary source disagree, **the derived one is the hypothesis.** Corollary that earns its own line: the orchestrator verified roughly fifteen claims this session and skipped one — and **the one it skipped is the one that was wrong.** That is not luck; unverified claims are exactly where errors survive.

### [Testing] A guard cannot mutation-test a sentence it does not assert (2026-08-21) — NEW

- **Context**: `tests/oob_t0_spawn_completeness.test.ts` was mutation-verified five ways and still taught a falsehood. Its **assertions** are sound — it reads the baked startup artifact, whose 225 formations are all catalog-keyed, so `formations[b.id]` is the correct lookup there and every t0 absence it reports is real. What was false was its **prose**: a header line and a `DOCUMENTED_T0_ABSENCES` note claiming a row *"NEVER SPAWNS — absent from every turn of a 188-week campaign … a real missing formation, not a delayed one."* The assertion is t0-scoped, so the test passes forever while the comment beside it teaches wrong history to every reader — and it did, to two seats and the orchestrator.
- **Do instead**: **prose in a test file is documentation, not verification, and mutation testing cannot reach it.** If a comment makes a claim wider than the assertion beside it (a t0 check whose note claims something about turn 188), either narrow the prose to the assertion's scope or add the assertion that covers it. Pairs with the 2026-08-14 lesson *"a comment can be wrong four times running — make it enforced and DELETE the prose"*; this is its testing-surface sibling, and the discriminator is: **ask what the mutation would have to change in order to fail. If the answer is "a sentence", nothing is testing it.**

### [Process] A subagent that finishes without SENDING is indistinguishable from one that hung (2026-08-21) — NEW

- **Context**: a dispatched seat completed a full analysis, wrote it as text output, and went idle. **The dispatcher received nothing.** Text output from a subagent is not visible to the parent — only an explicit message is. The orchestrator was one step from integrating a four-seat panel on three seats and recording the fourth as absent; that would have lost the identity-race root cause, the 1.3%-measured-cost result, the 26 inert `manpower_cost` values and a fix-direction reversal — i.e. the four findings that decided the lane.
- **Do instead**: **(a)** tell every dispatched seat in the brief that its report must be SENT, not written; **(b)** when a seat goes idle without reporting, **ASK** — never conclude stall, absence or failure from silence. A one-line query costs nothing; re-deriving a lost verdict costs a lane. **Note this is adjacent to but NOT the same as the 2026-06-12 "worktree builders stall" pattern** — that was work not done; this is work done and not delivered, and the two are indistinguishable from outside until you ask.

### [Process] ★ THE DERIVED-SIGNAL PATTERN, CONTINUED — four more costumes, and the rule that catches it was one I wrote and did not apply to myself (2026-08-22) — NEW, SAME DOMINANT PATTERN

- **Context**: a direct continuation of the 2026-08-21 ten-instance entry above, same session-arc, same error, four fresh disguises. Recorded separately rather than folded in, because the *new* information is not another tally — it is **which check catches it**, and the fact that the author of that check exempted himself from it.
  11. **★ A PROBE THAT CANNOT RETURN THE ANSWER YOU ARE RULING OUT.** Monitoring a 73-minute gating suite, `grep -cE '^\s*×\s+tests/.*\.test\.ts'` returned 0 twice and was reported to the owner as **"0 failures so far."** Vitest marks a failing **file** with `❯` and reserves `×` for individual tests. Seven files had already failed. **The probe could not have produced a non-zero answer under any circumstance**, and its clean output was quoted as evidence of cleanliness.
  12. **★ ONE ARTIFACT COMPARED, MISLABELLED, AND GENERALISED TO SIXTEEN.** To decide whether a merge changed CI, `grep -A6 "scenario_id: 'apr1992_188w'"` piped to `head -3` was used to compare "the `final_save.json` hash" across two runs. The `-A6` window had already run past the label: the pair actually compared was **`activity_summary.json`** — the one 188w artifact that genuinely did not change. The conclusion published was **"byte-identical, same 16 mismatches, my merge added nothing."** In fact **three** 188w artifacts changed, and the new `final_save` actual was `034820889a972be7…` — **bit-for-bit the local branch's own hash**, i.e. the loudest possible proof that CI *had* exercised the merge. **Refuted by Codex the next day using a fake-hash positive control.**
  13. **A stale figure quoted one commit after being invalidated by one's own merge.** "16,000 elite troops" was repeated to the owner *after* merging the change that cut the wave from 8 rows to 6 (12,000). The number was correct when first learned and falsified by the speaker's own action; nothing re-derived it. Caught by the owner asking "3 brigades, 16k men?".
  14. **A code path named as a fatal wall without checking it is reached.** See the architecture entry of the same date.
- **★ Do instead — the rule, and the reason it earns its own entry:** **give every verification and monitoring check a positive control before quoting its output.** Ask of each probe: *what would this print if the thing I am ruling out were actually happening?* If you cannot answer, the check is decorative. Two sub-rules, both bought at cost here: **(a)** when comparing N things, compare N — or state plainly that you compared one; a spot-check generalised is a fabrication with a true premise; **(b)** **do not read a label and a value from different rows** — `grep -A/-B` context windows silently slide past the field they were anchored to, so print the label and the value from the *same* parsed record, never from a line-offset guess.
- **★ AND THE PART THAT MATTERS MOST.** The positive-control rule was written into the handoff prompt *by the same session that violated it four times*, and the successor honoured it — a fake-hash control is exactly what refuted instance 12 within a day. **The rule works; the failure is that it was aimed outward.** Apply verification discipline to your own comparisons with the same suspicion you apply to code under test, to a colleague's report, and to a panel's premise. **You are not a more reliable instrument than the things you distrust.**

### [Process] ★ WHEN EVERY REVIEWER FINDS MORE INSTANCES, YOUR SITE COUNT WAS IMAGINATION, NOT SURFACE — 2 → 3 → 4 → 6 in one panel (2026-08-24)

A finding proposed fixing a defect at **two** call sites. Operations found a **third**. Engine found a **fourth**. Red Team found **six**, plus a seventh structural gap of the same class. Nobody contradicted anyone — each seat searched and each found more, because the author had stopped searching at the point the story became coherent.

**The tell is the monotone direction.** If review had found the count *wrong in both directions* — some of my sites spurious, some missed — that would be ordinary error. A count that only ever goes **up** under scrutiny means the search was terminated by narrative sufficiency, not by exhaustion. Two sites made a clean story ("both must move together, or you recreate the split-brain"), and the story stopped the search.

**Why it is dangerous rather than merely embarrassing:** the author's own atomicity argument — *these sites must move together or the fix builds a new split-brain* — applied with equal force to the four sites he had not found. Shipping the two-site version would have **created** the exact defect the fix was justified by removing. A partial fix is not a smaller fix; when the justification is "make these agree", a partial fix is a NEW disagreement.

**Rule:** before proposing a fix at N sites, enumerate the call surface mechanically (grep the constructor/helper, not the symptom) and state N with the search that produced it. If a reviewer raises it to N+1, do not patch the list — **re-run the enumeration**, because one miss means the method missed, not that one site was overlooked. And where the fix's rationale is *consistency between sites*, the site list is not a detail of the fix — it IS the fix.

### [Process] ★ VERIFY THE SIZE OF THE SET, NOT ONLY THE OPERATION ON IT (2026-08-24)

Claim under review: RS mandatory mobilization is contended alphabetically because `a.priority - b.priority || strictCompare(a.id, b.id)` collapses to alphabetical when no row carries `priority`. I verified exactly that — 81 rows, zero with `priority`, `undefined - undefined` is `NaN` and falsy, sort falls through — and escalated it as an 81-brigade defect.

**The sort was right. The population was 4.** The filter immediately above it ends `&& !state.military.formations?.[brigade.id]`, and 77 of the 81 rows have `available_from: 0`, so they exist at t0 and never enter the queue. **The excluding clause was in the same block of output I had already read.** I checked what the operation does and never asked how many things it does it to.

The counterexample was in my own data: `rs_visegrad_brigade` ranks **80/81** — worse than the brigade I claimed was starved at 79/81 — and is present at turn 0. Two adjacent ranks, opposite outcomes; rank never predicted anything, `available_from` did.

**Rule:** a claim of the form "this operation mistreats N items" has two independent halves — the operation, and N. Verifying the first feels like verifying the claim and is not. **Print the filtered set before quoting a rank, a share, or a blast radius.** Sibling of the vacuous-guard family: there the loop asserted nothing because the set was empty; here the sort was real but the set was four.

### [Process] A PARTIAL FIX RECORDED AS A WHOLE ONE SURVIVES FOR MONTHS (2026-08-24)

`REAL_WAR_MASTER.md` logged a **P1** on 2026-04-02: *"Predictor ignores defender artillery, terrain, entrenchment."* COMBAT-P14 then closed artillery and entrenchment — and the closure note was written as *"prediction↔resolution parity holds."* **Terrain was never closed.** The parity claim was true of the two items fixed and false of the one that remained, and because the record said parity held, nobody looked again. Four months.

**Rule:** when closing a defect that was logged as a LIST, close it item by item in the record and name what remains open, even if what remains is one word. A summary sentence that generalises a partial repair into a whole one is not documentation — it is a silencer on the next audit. Same shape as the guard family (a green check asserting less than its name claims), applied to prose.

### [Process] ★ A STALE MEMORY NOTE COSTS MORE THAN A MISSING ONE — it actively steers you wrong (2026-08-25) — NEW
- **Context**: `memory/v1_anchor_only_smoke_result.md` said "don't expect v1 to unblock Op
  Trnovo/Pracha/Zvezda 94 — v2 donors mandatory", written 2026-05-28 during a staged rollout.
  All five ADR-0005 flags have been `true` since; TGs and OGs are fully live (62 standing OGs,
  live `tactical_groups` records with donor contributions). Acting on the stale note, an entire
  session of operation edits was written treating `brigades: [...]` as an unordered roster —
  when `getAnchorBrigade` returns `main_brigade ?? assigned_brigades[0]`, so **the first entry is
  the anchor** and carries the readiness gate. Operation Trnovo was "fixed" by APPENDING a
  brigade, leaving a formation that does not spawn until t140 as the anchor. The error surfaced
  only because the owner asked "why are we not using OGs for ops" — a question whose premise was
  false, and checking it was what exposed the stale note.
- **Wrong approach**: Treating memory as current state. A memory file records what was true when
  written; a staged-rollout note is guaranteed to expire, and nothing expires it.
- **Right approach**: Any memory note describing a FLAGGED or STAGED feature must be re-checked
  against the flag's current value before use. The check is one grep.
- **Do instead**: When a memory says a feature is partial/pending/flag-gated, `grep` the flag
  constant before relying on it, and if it has shipped, EDIT THE MEMORY IN PLACE with a
  SUPERSEDED banner. Do not leave a corrected fact only in the session transcript.

### [Process] THE TASK-NOTIFICATION EXIT CODE IS THE WRAPPER'S, NOT THE COMMAND'S (2026-08-25) — NEW
- **Context**: `npm run test:vitest > log 2>&1; echo "TESTS_EXIT=$?" >> log; sed ... | grep ...`
  reports the exit status of the **final pipeline element** (`grep`), not vitest. Two full suites
  were announced by the harness as "completed (exit code 0)" while the log recorded
  `TESTS_EXIT=1` with a real failing test. Believing the notification would have committed a red
  tree; both times the recorded value was the truth.
- **Wrong approach**: Reading the harness's completion status as the tool's verdict when the
  command is a compound or a pipeline.
- **Right approach**: Capture the status you care about explicitly (`$?` immediately after the
  command) and read THAT back. Gate scripts on the recorded value, never on the wrapper.
- **Do instead**: In any auto-gating script, parse `TESTS_EXIT=` (or equivalent) out of the log.
  A direct instance of the derived-signal pattern: the harness status is a derived signal about
  a pipeline, not a primary signal about the tool.

### [Process] ★ A DIFF IS NOT A DIRECTIVE — check which side is AUTHORITATIVE before ingesting (2026-08-26) — NEW
- **Context**: A published painter artifact was republished, and the harness reported the local
  copy stale. Diffing its embedded reference against the repo produced two differences:
  `breza:podgora` (repo RBiH / artifact RS) and `kiseljak:brnjaci_2` (repo HRHB / artifact RBiH).
  The obvious next move — "the owner painted corrections, apply them" — would have **reverted two
  of the owner's own decisions**. Those exact two cells were corrected by owner instruction
  earlier the same session (*"Brnjaci should be painted as HRHB… Podgora should be painted as
  RBiH"*), landed in `434036b35`, and are consistent across all four checkpoints. The artifact
  was STALE, not new: its `EDITS` payload was empty and it predated the corrections.
- **Wrong approach**: Treating "the source changed" as "the source is newer", and a difference as
  an instruction. A republish event proves a version moved; it does not say in which direction
  truth lies.
- **Right approach**: For every difference, establish which side is authoritative BEFORE acting —
  check the payload that carries intent (here `EDITS`, which was empty), the git history of the
  cells, and whether the change matches a recorded instruction. Two of three said "repo is ahead".
- **Do instead**: When ingesting any external artifact, ask "what would make me apply this
  backwards?" first. For painter artifacts specifically: an empty `EDITS` block means nothing was
  painted, regardless of what the diff shows.

### [Process] A COMMIT MESSAGE CANNOT BE EDITED — a refuted rationale needs a correction where readers look (2026-08-26) — NEW
- **Context**: `414ec3f61`'s message states, permanently, that "the authored data cannot separate
  the cases" and that the constraint "belongs in authored data". The §6 panel refuted both the
  next day: the data is DERIVED by a faction-symmetric formula, and "data not code" is a
  distinction without a difference for a fact not present in game state. The commit stands with a
  wrong rationale in it forever.
- **Wrong approach**: Correcting only the documents, and assuming the commit history is
  self-correcting because a later commit exists. Nobody reading `git log` for that change sees the
  refutation.
- **Right approach**: When a claim in a COMMITTED MESSAGE is refuted, write a ledger entry that
  names the commit SHA and says what in it is wrong. The ledger is the searchable surface; the
  message is immutable.
- **Do instead**: Prefer putting contestable RATIONALE in the ledger and the docs, and keep commit
  messages to what changed and what was measured. A measured number ages well; an explanation of
  why the data behaves that way may not.

### [Process] ★ POSITIVE PATTERN — "this is a claim to test, not a briefing to ratify" refuted the implementer TWICE and one seat refuted ITSELF (2026-08-26) — NEW
- **Context**: A §6 panel was convened on a mechanism its implementer had built and wanted
  enabled. Each seat was polled independently and told explicitly to correct for that bias. The
  Historian refuted the implementer's central historical premise with a citation (BB1 p.187: the
  ARBiH ran successful offensives in the very region and year the implementer called it passive).
  The Red-team then refuted the IMPLEMENTER'S data claim (`organizational_penetration` is derived
  by a faction-symmetric formula, not authored) **and falsified the Historian's replacement
  proposal by testing it — 17 of 17 allowed, zero discriminating power** — and, having proposed
  that test itself, reported its own hypothesis dead.
- **Why it worked**: the packet stated the implementer's bias in its first line, and each seat was
  asked to attack rather than assess. Continuation of the 2026-08-24 finding that *"the instrument
  that worked was independent polling; the instrument that failed was my own confidence at the
  moment a story became coherent."*
- **Do instead**: Write the bias into the packet header explicitly. Poll seats on the QUESTION,
  never on the proposal. And when a seat proposes a fix, TEST it in the same session rather than
  recording it as the answer — the Historian's apparatus gate read as obviously correct and was
  worth nothing.

### [Process] THE OWNER HOLDS THE MODELLING TRUTH — measurement cannot tell you what SHOULD happen (2026-08-26) — NEW
- **Context**: measured a quiet war in detail — 3.14 battles/week, 59% of battles probes, several corps with ZERO real attacks in 188 weeks, the Sarajevo corps mounting one offensive — and escalated `REAL_WAR_MASTER #40` to **P0** on it. The owner: *"None of that is issue, all of those are correct modelling of how the real war went on. ... 1st corps not attacking — well of course, it's mostly Sarajevo brigades under siege."*
- **And then the reverse, the same day.** When the CAUSE was found (intel identity destroyed every turn) and he was asked the sharp question — *was the low tempo history, or was it blindness?* — he ruled **"It was blindness."** Both rulings were right about different things: the besieged corps stays quiet (38 probes to 0, attacks 1 to 2), while the general quiet was an artifact.
- **Do instead**: before escalating a **behavioural** finding, separate *"this number is surprising"* from *"this number is wrong"* — the second is a claim about history, and history is the owner's. **And when you find the cause, go back and ask again**: a ruling given on the symptom may not survive the cause.

### [Process] A FIELD'S SEMANTICS INFERRED FROM ONE INSTANCE — RE-VIOLATION, lesson already in the file (2026-08-26) — NEW
- **Context**: saw `placement:fixed_home_osid` on `arbih_115th_mountain` — a garrison that never moves — and built a probe-pool exclusion on it, describing it in the scope as "fixed-home garrisons".
- **MEASURED AFTER THE RUN: 180 of 184 brigades carry that tag.** It is the near-universal default placement. The predicate did EXACTLY what it said and swept up **71 probe-launching brigades instead of 1** (distinct probe launchers: 90 baseline, 26 with the filter, 94 on revert), including a recruitment-generated formation that cannot have a fixed home at all. It also caused a 208 to 80 probe collapse that was then **wrongly attributed to a different change**.
- **This is the 2026-08-25 `to_control === 'controlled'` lesson repeated verbatim** — a gate built believing a field meant "this faction holds the municipality" when it reads `controlled` for every municipality. **Its written rule — print the field's distribution before gating on it; a one-bucket histogram means the clause is decoration — was in the lessons file read at session start.**
- **Do instead**: **the tell is that you learned a field's meaning from the one row that made you notice it.** One filter-and-count costs ten seconds and kills the design before it is written.

### [Process] A REAL FINDING BECAME THE WORK — the drift had no single bad decision in it (2026-08-26) — NEW
- **Context**: a session opened on nine cheap plan items requiring zero scenario runs. A genuine section-6 blocker was repaired (an enclave guard asserting 1 of 9 cells and unable to fail), which surfaced a switched-off mechanic, which the owner ruled ON, which produced four ahistorical cells — and the session then spent **three 188-week runs and five failed hypotheses** on a lane the plan never mentioned. **One of nine planned items got done.**
- **Every step was individually defensible**, which is exactly why nothing stopped it. The owner had to ask *"what happened to the original plan?"* — invisible from inside, obvious from outside.
- **Do instead**: **when a legitimate finding opens a new lane, write it down and QUEUE it; do not follow it.** A finding worth pursuing is still worth pursuing tomorrow; a plan item skipped today usually stays skipped. Mechanical guard: `tools/hooks/guard_scope_drift.sh` fires on scenario runs and threshold blessings and prints the declared lane from `.claude/current-lane.txt`.

### [Process] AN ARTIFACT FIELD CAN BE A PHASE-GATED PROJECTION OF ENGINE STATE (2026-08-26) — NEW
- **Context**: argued that a combat predicate had to be answerable **per battle** rather than per operation, because 41 of 164 combat captures (25%) appeared to have **no operation**. That was measuring `activeOperationId`, which `attack_resolution_osid.ts:1278` writes **only when the op is in `execution` phase**. `activeOp` itself is not gated — and the pre-existing code at `:1396` already read the ungated handle and worked.
- **Consequence avoided**: designing a more complex predicate around a constraint that does not exist. Caught by a reviewing seat, not by the author.
- **Do instead**: **reasoning about ENGINE behaviour from an ARTIFACT field is reasoning about the projection.** Before concluding something is absent from the engine, find the in-engine handle and check whether the artifact writer gates it.

### [Process] SPLITTING A BUNDLE ON DIVERGENT OUTCOMES IS WHAT MAKES BUNDLING SAFE (2026-08-26) — NEW
- **Context**: three changes were bundled into one validation run on a disjoint-metrics judgement, then split when their outcomes differed. **The split is what isolated a 71-brigade blast radius.** Bundled, "probes 215 to 80" would have been banked as the intel fix's achievement and the over-broad predicate would have shipped invisibly inside it.
- **Do instead**: bundling is defensible when each member owns a **distinct metric that FIRES** — not merely one that exists in principle. A member with no observation in the baseline rides the bundle unmeasured (this happened: one of the three had no isolating metric and had to be re-run). **Confirm each member's metric is instrumented and non-degenerate BEFORE bundling** — the S2 positive control, applied per member.

### [Process] CHECK WHETHER THE CAPABILITY EXISTS BEFORE DESIGNING THE GAP (2026-08-26) — NEW
- **Context**: three seats were dispatched on "can the president author operations?", framed as a probable gap. **It shipped, wired end-to-end, ungated and switched ON**: a Request-op card per corps every turn, the player types a settlement NAME (not an id), the engine auto-selects force and axis, and the CO objects first with a force ratio the player may override at a faction-weighted patron cost. The real issue was DISCOVERY, not capability.
- **Do instead**: **a design document describing a gap is not evidence of a gap**, exactly as it is not evidence of implementation. Find the consumer before scoping the build.

### [Process] ROUTE AGENT WORK BY OWNERSHIP, NOT AVAILABILITY (2026-08-26) — NEW
- **Context**: dispatched a fresh calibration agent for a scoping question while the calibration seat that **authored the decision rule and its precondition** sat idle. The fresh agent idled twice without reporting; the warm seat answered in one pass and immediately caught a four-commit baseline contamination the fresh one had no context to see.
- **Do instead**: route to the seat that owns the artifact or rule in question. A cold spawn re-derives context the warm one already has, and cannot see what it was never told.

### [Process] A REVERT DOES NOT RETURN YOU TO THE RUN YOU MEASURED (2026-08-26) — NEW
- **Context**: assumed reverting one commit restored the last baseline. `git log <baseline>..HEAD -- src/` returned **FOUR** commits, one behavioural (a `lifecycle_status` relabel gating reconstitution eligibility). A run was spent producing a baseline that turned out **byte-identical to one already on disk** — because the argument for needing it was made from commit ordering alone, without comparing **run timestamps to commit timestamps** (the existing run was made from a dirty tree, so its contents led its commit by 46 minutes).
- **Do instead**: before claiming *"revert X and we are back at baseline Y"*, diff the **full commit range** against Y, and `stat` the candidate run dirs against `git log --date=format:%H:%M`. One command.
