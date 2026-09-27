# QA Gates Archive Pointer

Full pre-restructure archive: ./full_archive_20260708.md

Use this topic when working on release gates, browser gates, packaged probes, baseline regression, engine-health, structural fingerprint, or verification discipline.

High-value current rule: release-facing claims require fresh proof from the relevant gate; browser gates must capture network/request failures, not only console errors.

## Demoted from the napkin index 2026-08-12 (still valid, just lower-frequency)

- **[2026-06-26] Browser gates must watch network failures** — collect `requestfailed` and HTTP >=400, ignoring only deterministic teardown noise.
- **[2026-06-26] Trusted CI detectors must restore HEAD** — run the trusted base detector, then restore detector scripts from HEAD before setup/build/test.


<!-- relocated-from-index-2026-09-12:Execution & Validation -->
## Execution & Validation
0z. **[2026-08-26] YOU LEARNED THAT FIELD'S MEANING FROM ONE ROW — count the distribution before gating on it. RE-VIOLATION.**
   Do instead: **one `filter(has-tag).length` before you design.** Saw `placement:fixed_home_osid` on `arbih_115th_mountain` (a Stari Grad garrison, same OSID t0→t188, morale 100, cohesion 100, 2 battles in 188 weeks) and built a probe-pool exclusion on it, writing "fixed-home garrisons" into the scope.
   Worked detail: [entry_detail.md](entry_detail.md#0z)
0y. **[2026-08-26] A COUNTER THAT RUNS AWAY — ask what its INPUT is keyed on, not why the counter is wrong.**
   Do instead: `consecutive_probes` hit **38 against a cap of 2** and read as a broken counter; four mechanism hypotheses failed. The cause was two layers down: `sector_intel` is keyed on `sector_id`, and sector ids are **positional indices re-minted every turn** (`corps_front_sectors.ts:1643`), so one edge change orphans the record and confidence resets to the initial floor. **Median `turns_in_contact` 1-2 across three 188w runs, against a threshold needing ~18 uninterrupted turns — unreachable by construction.** ⇒ **Any state keyed on a per-turn-regenerated id has this defect.** Fix by deriving identity from CONTENT (smallest edge id under `strictCompare`, never iteration order), persisting it on the record, keeping the positional lookup as a legacy fallback. ⇒ **Related shape:** a fitness ranking can select for the unit LEAST able to do the job — `fitness = personnel × cohesion × fatigue` makes a brigade that never fights permanently the fittest, so it is picked, fails, stays perfect, and is picked again.
1. **[2026-08-22] A probe that cannot fail is indistinguishable from a probe that works**
   Do instead: give every monitoring/verification check a positive control before quoting its output. Five failures in one session came from a check answering a narrower question than the claim it carried — grep scoped to `src/` with an unscoped conclusion; `attacker_brigade` (first attacker only) read as non-participation; and **two "0 failures" reports on a gating suite produced by grepping `×` when vitest marks a failing FILE with `❯`**. Also: **Windows caches a file's size/mtime while a writer holds the handle** — a healthy 73-min run looked frozen for 33 minutes. File size is not a liveness signal here; process CPU time is. **[2026-09-09] UI proof:** wait for fonts/entry animation, measure text against its own clipping box, and inspect scroll fades at maximum scroll; fitting the outer card is not sufficient.
2. **[2026-08-12] ANY territory-moving change needs 188w — the "catalog-only" carve-out is WITHDRAWN**
   Do instead: treat 40w/43w as a DEVELOPMENT loop only. A one-line objective addition measured +3 with zero regressions at 43w and −26 with two anchor flips at 188w. 43w faithfully reproduces turn-43 state (~4 min vs ~20) so it is useful for iterating — never for adopting. Only provable byte-identity earns a short-horizon-only GO.
0o. **[2026-08-16] A DISPATCHED AGENT'S PLAIN OUTPUT IS INVISIBLE TO THE ORCHESTRATOR — only `SendMessage` lands. Say so IN THE BRIEF.**
   Do instead: every dispatch brief must state "report via SendMessage; plain output does not reach me", and every idle-without-report must be chased immediately rather than waited on.
   Worked detail: [entry_detail.md](entry_detail.md#0o)
0p. **[2026-08-17] A DIFFERENTIAL GUARD CANNOT CERTIFY HISTORICITY — it can only certify "no change". And an artifact-reading test cannot be attributed to source by re-running it.**
   Do instead: ask what a guard's predicate is keyed to. `collapse_s6_criteria_4_7`'s 7a says *"no OFF-baseline RBiH-held rim cell is newly lost in ON"* — which **makes the collapse-OFF baseline the definition of correct**, so where OFF is wrong ON is forbidden from correcting it, and the guard fires on corrections.
   Worked detail: [entry_detail.md](entry_detail.md#0p)
0q. **[2026-08-23] THE HEALTH GATE'S `dead_ops` COUNTS *INVALID* OPS, NOT *INERT* ONES — a green gate is NOT evidence operations ran. And `matched_osids` is NON-INJECTIVE.**
   Do instead: read `engine_health_gate.cjs:260` — `dead_ops: cc.invalid_operation_count`. Measured on the clean 637 baseline: gate reports `dead_ops: 0` while **13 of 42 operations recorded ZERO attacks and 21 captured ZERO objectives**.
   Worked detail: [entry_detail.md](entry_detail.md#0q)
3. **[2026-09-10] The local executor drafts; the planner judges — and prompt speed, not generation speed, decides which model**
   Do instead: run `npm run local:check`, then `npm run local:delegate -- --spec <task> --read <exact files>`, review the proposal, apply what is right, and prove it with `npm run gate:local -- --tests <files>`. The gate REFUSES (exit 2) when no tests are declared, because a gate with nothing to prove is not a passing gate. Measured on this box: a 9B that fits entirely in VRAM does 352 tok/s prompt; a 30B MoE spilling 6.3 GB to DDR4-2400 does 8 tok/s — ~50 minutes to read one 25k-token file, so the better model loses badly. `think:false` is separately a 30x effect. Never hand it a repo to explore: `App.tsx` alone is ~24,350 tokens. Full detail in `tools/local_executor/README.md`.


<!-- relocated-from-index-2026-09-12:Evidence & Tooling Discipline -->
## Evidence & Tooling Discipline

0s. **[2026-09-12] Compute the local test set; do not pick it by hand — and audit your own CHECKS, not just your code**
   Do instead: `npm run test:affected` (`tools/affected_tests.cjs --run`) selects every test naming a changed path, its immediate parent directory, or its basename, plus one hop through the `tools/`/`scripts/` that consume those paths — then runs them in chunks. Hand-picking under-covered TWICE in one session, both times a test consuming DATA OR DOCS rather than code (`task_manifests` on a changed CSS path; `plan_index` on an edited plan), and the first took main's gate red: the test job failed, `scenarios` skipped, and `engine-health-188w` correctly refused to report green on a skipped upstream. **Second half of the rule:** two guards written that same day encoded premises that were then disproved — a "reads as a light source" check measuring against the wrong surface, and a border check matching Tailwind's `0px` preflight default. A checker's false positives cost more than its misses.
0t. **[2026-09-12] A "must NOT appear" assertion reads PROSE AS CODE**
   Do instead: strip comments first — `tests/helpers/sourceComments.ts`. The prose most likely to mention a banned construct is the comment explaining the ban, and this fired **four times in two sessions** (CSS `--font-command`, `Math.random`, `padding: '10%'`, `viewBox="0 0 100 100"`), each on the file's own explanation. Strip BLOCK comments only for CSS; naive `//` stripping eats `https://` and makes an external-resource check vacuously pass.

0l. **[2026-08-16] A defect can arrive WITH A TEST DEFENDING IT — when a fix turns a test red, ask which one is wrong**
   Do instead: treat a red test on a correct fix as a hypothesis about the TEST, not proof the fix is wrong. R7 Phase 2 deleted two `war_crimes_record` entries (incl.
   Worked detail: [entry_detail.md](entry_detail.md#0l)
0j. **[2026-08-14] NEVER `git checkout --` in a tree another agent is working in — copy the file aside and restore from the copy**
   Do instead: `cp file file.bak` before mutating, restore with `cp`, delete the backup. A reviewer reverting its own mutation with `git checkout -- tests/collapse_phase1_g2_section6_invariant.test.ts` **silently discarded another agent's UNCOMMITTED seam pin** in the same file, then measured and reported a degraded 39/40 (true count 40/40). The implementer had written it, verified it, reported honestly, and been rolled back after its measurement — so BOTH agents reported truthfully and the tree disagreed with both. Same hazard class as committing in a running agent's worktree. Corollary: **a report is only true as of its last measurement, and in a shared tree that window is short** — re-verify immediately before reporting, and treat a count that disagrees with your own file list as the tell.
0r. **[2026-09-03] A documented derive script is not automatically a no-op — diff its output against the committed file BEFORE adopting it**
   Do instead: run the generator to a temp path and diff record-by-record against the tracked artifact; adopt only the records your change is about.
   Worked detail: [entry_detail.md](entry_detail.md#0r)
1. **[2026-07-06] Output-changing branches need baseline reconciliation**
   Do instead: run npm.cmd run test:baselines; if intentional, refresh with the documented strict rerun path and ledger note.
2. **[2026-07-07] Engine-health refloors use the gate path**
   Do instead: reproduce with engine_health_gate.cjs, update through the gate command, rerun strict JSON, and record evidence.
3. **[2026-07-12] Electron replay proof is an exact-turn hard gate**
   Do instead: bind the actual Electron log and autosave; validate scenario/faction/full control timeline, tour all required surfaces, enforce 12px unclipped essential text and clean runtime/network output, and retain Records/Chronicle screenshot evidence.
4. **[2026-09-03] Capture at the resolution you publish, read every frame, and verify the FILES not the run**
   Do instead: set the harness viewport to the delivery size (1920x1080) BEFORE a capture run, not after — a 1440x900 set had to be re-shot wholesale.
   Worked detail: [entry_detail.md](entry_detail.md#8)
5. **[2026-07-17, twice re-violated 2026-09-03] CI tests cannot depend on local evidence roots — and the half that goes missing is usually the EVIDENCE, not the test**
   Do instead: keep executable QA harnesses under tracked `tools/`; write generated screenshots, saves, and logs under excluded `tmp-*` roots, and prove harness contracts from a clean-checkout path.
   Worked detail: [entry_detail.md](entry_detail.md#9)
6. **[2026-08-15] Name actors at the claim boundary**
   Do instead: resolve generic-symmetry findings (`both sides`/`all sides`) by reading the full
   claim, naming the actors its evidence supports, and preserving asymmetric responsibility.
   Recast spatial collisions (`surrounded on all sides`) without changing meaning. Keep the
   player-facing actor-specificity queue at zero and mirror every essay edit into the runtime index.
7. **[2026-08-15] A prose source note is not a machine-readable citation**
   Do instead: give historical event metadata both roles — `historical_source` identifies the cited
   instrument, `source_note` explains which claims it supports and where the counterfactual
   boundary begins. Three HRHB decisions had exact pages, judgment sections and a resolved tier in
   `source_note`, yet all 63 owned claims read as uncited because no recognized citation key was
   present. When repairing older rows, promote only citations already present in the note.


<!-- relocated-from-index-2026-09-12:Shell & Command Reliability -->
## Shell & Command Reliability
0a. **[2026-09-06] Three false "success" signals in ONE session — every one was a check built around the happy path**
   Do instead: key completion on the signal that **cannot be faked** (a target file's own hash changing), not on a wrapper's exit code, a log phrase, or a process check. The three: a `nohup npm run sim:scenario:run:188w` launcher exited **0** while preflight had **REFUSED** the run on a Node-major mismatch; a watch grepped `turn 188` while the log writes `turn=188`, so success could never match though failure could; and a waiter used `! pgrep -f run_baseline_regression` — **`pgrep` does not exist in this Git Bash**, so its negation was always true and an incidental `OK` closed the loop at **turn 17 of 188**. ⇒ Ask BOTH questions before arming: *would my filter emit on a crash?* **and** *would it emit on success?* ⇒ Verify the tools your condition calls exist here.
0a2. **[2026-09-16] A red full suite can be the SHELL, not the branch — `bash` resolves to WSL unless Git Bash is on PATH**
   Do instead: run `(Get-Command bash).Source` before attributing failures to the code. From PowerShell without `C:\Program Files\Git\bin` on `PATH`, `bash` is `C:\Windows\system32\bash.exe` (**WSL**), which cannot resolve the MSYS-form paths the hook-guard and CI-guardrail tests pass to `execFileSync('bash', …)` — it wants `/mnt/f/...`, not `/f/...`. Measured: **50 failures across 10 files, exit 1**, on a calibration branch that had touched none of them; with Git Bash prepended the same source passes **13,982 across 1,389 files, exit 0**, with no repo change. ⇒ Tells: `/bin/bash: /f/...: No such file or directory`, or hook-guard assertions reading `expected 'allow' to be 'deny'` beside `SyntaxError: Unexpected end of JSON input` (the guard emitted nothing, so the helper defaulted to allow). ⇒ Confirm with `git diff --quiet main..HEAD -- <file>`; these files are rarely touched by feature work. ⇒ Record the resolved bash path in the run's launch JSON so the receipt is self-diagnosing. ⇒ `tests/runtime_dependency_resolution.test.ts` failing on `Hook timed out in 10000ms` is a SEPARATE setup-timing flake; the PATH fix does not address it and the two must not be merged into one cause.
0b. **[2026-09-06] `.nvmrc` pins Node 22 and the 188w preflight REFUSES to start on Node 24 — this machine defaults to 24**
   Do instead: there is no `volta`/`fnm`/`nvm` on PATH, but Volta's cache holds a usable 22: `export PATH="/c/Users/User/AppData/Local/Volta/tools/image/node/22.23.2:$PATH"`. Do **not** reach for `AWWV_PROVENANCE_OVERRIDE` — it runs but permanently disqualifies the artifact from §6 and from pairing, which defeats the purpose of measuring. Also check the BASELINE's `node_version` and `git merge-base --is-ancestor` **before** the first measurement, not after: an entire investigation this session ran off a baseline that was Node 24 **and** off-mainline.
1. **[2026-08-23] A missing transient field is not an empty set, and silence needs liveness proof**
   Do instead: when serialization deliberately strips diagnostic truth such as `unresolved_sector_brigades`, final-save validators must say **NOT ESTABLISHED**, never default absence to `[]` and print zero. Bind health claims to live evidence with a positive counter/marker. Distinguish one normal turn seal from a final-save artifact-projection seal (`kind=turn|final_save`) so legitimate projection cannot masquerade as a duplicate or let concatenated logs pass.
1b. **[2026-08-10] node_modules/.bin can be unpopulated on a checkout — `npm run` then fails silently on `tsx`/`tsc`**
   Do instead: run `npm rebuild` to repopulate `.bin` (confirmed fix — 237 entries restored, all subprocess-spawning tests that shell out via `npm run` then pass). Until then, invoke entrypoints directly: `node node_modules/tsx/dist/cli.mjs <script.ts>` and `node node_modules/typescript/bin/tsc --noEmit`. This caused 6 of 15 `test:vitest:fast` failures this session (audit_state/political_control_audit_cli/data_extract1990/desktop_sim_bundle_smoke) — all local-environment noise, NOT code regressions; CI's fresh `npm ci` would not reproduce this.
1c. **[2026-08-20] A junctioned `node_modules` in a temp worktree is DESTROYED by `git worktree remove --force`** — the remove recurses through the junction and empties the TARGET in the main repo, silently, until something needs to build. Cost this session: a full `npm ci` mid-investigation.
   Do instead: install separately in the worktree, or delete the junction link first **and verify it is gone before removing the worktree**. The failure was not the intent but the missing CHECK — a link removal can fail on a NonInteractive prompt and return without removing anything. Recovery is `npm ci` and it is exact, because `package-lock.json` is stable across this repo's range. Note one agent solved this correctly (`mklink` link deleted first, `.bin/tsx.cmd` verified present afterwards) hours before another hit it, which is why it belongs here and not in a transcript.
2. **[2026-06-26] Generic abort filters are too broad**
   Do instead: ignore only deliberate subframe or named teardown aborts; keep real request failures reportable.
3. **[2026-06-26] Browser gates use tileless proof by default**
   Do instead: let gate launchers disable PMTiles unless the test explicitly needs tile binaries.
4. **[2026-07-12] Direct Electron QA requires its tactical Vite host**
   Do instead: start `npm.cmd run dev:map -- --port 3002 --strictPort`, verify HTTP readiness, then launch the direct Playwright/Electron harness; classify missing-host startup timeouts as harness precondition failures.
5. **[2026-07-17] Poll browser-owned fixture status**
   Do instead: start large renderer save loads behind a unique token and poll synchronous browser-owned status from Node; do not directly await a churn-prone renderer promise through `Runtime.callFunctionOn`.
6. **[2026-08-28] Iframe transport readiness is not committed shell ownership**
   Do instead: let the child emit readiness only after React commit; accept proxy messages only from `window.parent`, and let the host trust only the current iframe/source/origin. A load event never claims readiness. During recovery mutation, defer handover; keep failure visible; consume the recovery latch only after retry succeeds. Publish lazy recovery dependencies only after successful load and clear rejected setup so retry remains possible.

<!-- relocated-from-index-2026-09-12:Curation Rules -->
## Former index curation rules and retained enforcement lessons

The automatic every-session read/edit routine and fixed category/line caps in the original first
three bullets are superseded by the current napkin skill and are retained below only for provenance.
The enforcement-tier, measurable-count, failure-predicate, mutation-proof, and allow-case lessons
remain active evidence/QA guidance.

### Original Curation Rules
- Read this index every session; read topic archives only when relevant.
- Max 10 entries per category; adding an index entry must evict or demote one from that category.
- Keep recurring, high-value rules only; each entry includes a date and Do instead action.
- **A written rule is the WEAKEST form of enforcement — treat every entry here as a candidate for promotion, not a solution.** Tier ladder: 0 impossible (the failure cannot be expressed) > 1 refused (blocked at the attempt) > 2 caught pre-merge (a test fails) > 3 caught post-merge > 4 prompted (a hook warns) > 5 written (here). On 2026-09-10, five rules from tiers 4-5 were violated in a single session, one of them written INTO the stash message that was then popped; everything that actually saved work that day was tier 0-2. **A tier-4 warning does not work: `guard_pipe_exit_code` fired on its violation twice and was stepped over both times.**
- **A COUNT WRITTEN INTO PROSE IS NEVER RE-DERIVED, AND THREE OF THEM WERE WRONG IN TWO DAYS.** `qwen3-coder` recorded at 8 prompt tok/s (measures **254**); the napkin's largest category reported as "0 entries" (it held **13,684 bytes**); the open-gates register's lesson-pointer backlog recorded as "160 of 244" (it is **15 of 23**, and was 20 in total at that gate's own commit). Each came from a pattern that could not match what it was counting, and each survived because nothing recomputed it. The 160 was the expensive one: it made an afternoon's cleanup read like a week, so nobody started. ⇒ **If a figure will be cited, make it a command, not a sentence** — `npm run gates`, `npm run receipts`, `npm run lessons:pointers`, `npm run local:benchmark`. ⇒ When you must write a number down, write the command that produced it beside it. ⇒ Re-deriving a cited figure before repeating it costs seconds; all three of these were repeated into decisions.
- **To promote an entry:** state the failure as a predicate over a concrete ACTION (not advice); find the earliest point that predicate is decidable; install at the strongest tier available there; PROVE it fires by mutation, or it is tier 5 in costume; record the tier reached. Templates: `tools/hooks/guard_stash_pop.sh` (blocks on command POSITION, so prose mentions stay writable) and `guard_pipe_exit_code.sh` (blocks only the narrow shape that is never intentional, advisory elsewhere). **Write the ALLOW cases first — all six defects across both guards were found by allow-cases, none by deny-cases, and a guard that blocks real work gets switched off.** Most entries here cannot be mechanised; the point is to find the few that can.
- Full pre-restructure archive: [full_archive_20260708.md](full_archive_20260708.md).
- Topic archives: [QA gates](qa_gates.md), [unreported sparse truth](unreported.md), [map counters](map_counters.md), [release process](release_process.md), [engine runtime](engine_runtime.md), [Warroom/legacy](warroom_and_legacy.md).
