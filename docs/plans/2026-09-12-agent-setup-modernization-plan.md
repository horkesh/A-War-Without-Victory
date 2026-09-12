# Agent Setup Modernization Plan

**Status:** IMPLEMENTED AND INDEPENDENTLY REVIEWED IN ISOLATION. **NOT ACTIVATED.**
**Owner request:** On 2026-09-12 the owner authorized implementation of P0–P5 preparation, superseding this document's original planning-only status. Coordinated live-activation, merge/push, and scope safeguards remain in force. See the execution and activation receipt below.
**Goal:** Reduce conflicting instructions and unnecessary context loading while preserving project safeguards and reliable completion across Astra, Sol, Luna, and Claude.
**Architecture:** A short shared project contract, small tool-specific entrypoints, and task-scoped skills with conditional references. Keep runtime-specific model and tool policy separate from domain rules.
**Surfaces:** Markdown instructions, skill metadata, existing import tooling, and runtime discovery. No game source, simulation data, baselines, packages, or release changes.

## 1. Authority and parallel-work boundary

This is an owner-authorized process-maintenance packet, outside the active product critical path. It neither changes R6-R9 priorities nor closes any existing acceptance gate. Implementation is prepared in an isolated worktree; live instruction activation still requires a coordinated handoff with affected sessions.

At the planning inspection on 2026-09-12, the shared checkout was on `chore/repin-188w-baselines`, HEAD `2a8eb4244c230b803094f9329f5d088193dcba7d`, with an unstaged change to `data/derived/scenario/baselines/manifest.json`. This is an observation, not a baseline or an assertion about Claude's entire workload. Recheck before implementation.

The original planning turn created only this file. During implementation, the shared index, branch, instruction files, napkin, board, roadmap, ledger, installed skills, settings, and ongoing processes remain untouched. Commits belong only to the isolated migration worktree.

Implementation and integration boundaries:

1. Record the intended base commit, exact file ownership, and active worktree paths. Use read-only Git status and a handoff receipt; a clean file does not prove that another session has released it.
2. Create a separate worktree from an inspected committed base after implementation authorization, before preparing changes. Never switch, reset, stash, stage, commit, or clean Claude's checkout to prepare the migration. Never attach its `node_modules` by junction or run the legacy skill installer there.
3. Treat changes to `.claude/**`, `CLAUDE.md`, shared process docs, and user-level skills as changes to another agent's operating environment. Prepare them in isolation; apply them only at a coordinated session boundary.
4. Before integration, compare each owned file against its recorded base. Preserve and reconcile intervening edits; do not overwrite a newer napkin, policy, or skill with the earlier audit copy.
5. Runtime reload/restart belongs to the affected session's owner. Do not interrupt Claude, edit its settings, or send it messages merely to complete this plan.

## 2. Evidence and constraints

The source advice is [Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra), published 2026-09-11. Its relevant principles are concise skill discovery, task-specific reading, proportional procedures, clear decision boundaries, and explicit completion conditions. Apply those principles to the mixed-model team; do not remove guidance solely because Astra can infer it.

| Observed issue | Evidence | Intended disposition |
|---|---|---|
| Modern Codex policy and old repo policy diverge | [September 7 adoption](../PROJECT_LEDGER.md); [repo orchestrator](../../.claude/skills/orchestrator/SKILL.md) forbids analysis and mandates twelve post-run roles | Preserve the adopted small-team policy; reconcile copies and retain separately required canon seats |
| Generic skills claim nearly all tasks | [using-superpowers](../../.claude/skills/using-superpowers/SKILL.md), [brainstorming](../../.claude/skills/brainstorming/SKILL.md), [awwv-read-first](../../.claude/skills/awwv-read-first/SKILL.md) | Replace broad triggers and conflicting body instructions with precise scope |
| Mandatory startup reading is large and duplicated | [CLAUDE.md](../../CLAUDE.md), [napkin](../../.claude/napkin.md), [execution standard](../20_engineering/CLAUDE_EXECUTION_STANDARD.md), [agent workflow](../20_engineering/AGENT_WORKFLOW.md) | Keep essential rules visible; route to relevant details |
| Plan execution pauses unnecessarily | [executing-plans](../../.claude/skills/executing-plans/SKILL.md), [prompt-construction](../../.claude/skills/prompt-construction/SKILL.md) | Continue authorized work and affected repairs; preserve actual approval boundaries |
| Validation policy conflicts | [AGENTS.md](../../AGENTS.md) permits focused docs checks; [CLAUDE.md](../../CLAUDE.md) demands a smoke triad after every change | One change-specific policy; no waiver of required production checks |
| Discovery/import surfaces are stale | [Cursor task types](../../.cursor/TASK_SUBAGENT_TYPES.md), [UI rule](../../.cursor/rules/ui-gui-invoke-ux-developer.mdc), [installer](../../tools/install_superpowers.ps1), [catalog](../../.agent/skills-catalog.md) | Fix active references and make imports reviewable; do not blindly copy skill trees |
| Hook enforcement is host-specific | [.claude/settings.json](../../.claude/settings.json), [hook registry test](../../tests/hook_registry.test.ts), [Git hook documentation](../../.githooks/README.md) | Preserve existing guards and document actual coverage; no automatic claim of Codex/Cursor parity |

The rechecked inventory was 75 direct repo skill entrypoints, 62 same-directory-name pairs with user-level Codex skills, and 27 unequal file hashes. The napkin contained 6,214 whitespace-delimited words. These are file measurements, not token costs, loaded-context measurements, or proof that every difference is erroneous. Skill bodies are loaded when selected, not all at startup.

Reproduce the inventory from the repository root; use the current runtime catalog's user-skill root rather than assuming this machine's path:

```powershell
$setupSkillRoot = 'C:/Users/User/.codex/skills' # observed here; resolve again on another host
$setupRepoSkills = @(Get-ChildItem -LiteralPath '.claude/skills' -Directory |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') })
$setupPairs = @(foreach ($setupSkill in $setupRepoSkills) {
    $setupRepoFile = Join-Path $setupSkill.FullName 'SKILL.md'
    $setupUserFile = Join-Path (Join-Path $setupSkillRoot $setupSkill.Name) 'SKILL.md'
    if (Test-Path -LiteralPath $setupUserFile) {
        [pscustomobject]@{
            name = $setupSkill.Name
            identical = ((Get-FileHash -LiteralPath $setupRepoFile).Hash -eq
                (Get-FileHash -LiteralPath $setupUserFile).Hash)
        }
    }
})
[pscustomobject]@{
    repo_skills = $setupRepoSkills.Count
    paired = $setupPairs.Count
    different = @($setupPairs | Where-Object { -not $_.identical }).Count
    napkin_words = [regex]::Matches(
        (Get-Content -Raw -LiteralPath '.claude/napkin.md'), '\S+').Count
} | ConvertTo-Json
```

Preserve throughout: canon hierarchy and approval panels; independent implementer/reviewer separation; historical-source requirements; deterministic ordering and serialization; protected control/data/save boundaries; existing campaign provenance and acceptance criteria; release/push/merge authorization; the adopted model-cost and expensive-run controls. Existing hook behavior and blocking sets remain unchanged in this packet. Runtime-specific tools must be described for the host that actually exposes them.

## 3. Team, sequence, and cost boundary

Use one Sol/medium implementer and one independent Sol/medium reviewer, with Astra handling integration decisions. Luna may handle a separately bounded inventory instead of duplicating the implementer's investigation. No additional review panel is needed for a wording-only change that preserves canon authority; a proposed change to that authority leaves this scope.

Sequence: **P0 inventory -> P1 shared contract -> P2 process skills -> P3 runbook -> P4 discovery/import -> P5 verification and staged activation**. Reconcile P1-P3 before attempting any skill-location migration. P4 discovery failure must not block a reviewed wording improvement from being delivered without relocation.

Expected cost is mostly document editing plus short filesystem checks. Runtime validation is bounded to four read-only routing cases per active host/model configuration being changed. Run existing focused tests only where this packet's edits make them relevant. No full test suite, build, baseline run, scenario, package, or paid API benchmark is part of this plan. These are scope limits, not a token or price guarantee.

## 4. Implementation packets

### P0 - Establish ownership and preserve the current setup

**Read:** `AGENTS.md`, current runtime skill catalog, the September 7 ledger entry, the exact instruction and import surfaces cited above, plus current file-ownership receipts.

- [x] Capture base SHA, branch/worktree identities, owned-file hashes, and actual instruction/skill paths in `logs/agent-setup-modernization/inventory.json` in the isolated worktree. Exclude worktrees, archives, plugin caches, and secret settings from recursive searches.
- [x] Classify the 27 differing pairs as intentional host specialization, stale copy, or unresolved. Compare frontmatter and body, not hashes alone. Record links and disposition in the same inventory.
- [x] Inventory incoming references before retiring or relocating skills, including commands, agent briefs, rosters, Cursor rules, and active plan templates. Historical plans remain historical; do not mass-rewrite them.
- [x] Preserve local originals and metadata outside the repository before any future user-level update. An installation backup is not a new policy authority.

**Pass:** Every proposed edit has an owner, a base version, and a disposition. Unknown activation or overlapping ownership prevents live activation, not read-only preparation. No file is deleted or copied globally in P0.

### P1 - Reconcile the shared contract and entrypoints

**Modify after activation, in isolation:** `AGENTS.md`, `CLAUDE.md`, `docs/20_engineering/AGENT_WORKFLOW.md`, `docs/20_engineering/CLAUDE_EXECUTION_STANDARD.md`, `.claude/skills/orchestrator/SKILL.md`, `.claude/commands/orchestrator.md`, `.claude/agents/orchestrator-dispatcher.md`, and `.claude/skills.md` where it duplicates process policy.

- [x] Keep `AGENTS.md` as the compact shared entrypoint. Put the detailed shared execution policy in the existing `AGENT_WORKFLOW.md`; make Claude/Cursor references point to it without requiring the whole document for every task.
- [x] Reconcile the older orchestration text with the owner-adopted policy. Let the lead interpret evidence and integrate results. Retain bounded delegation, cost routing, independent review, and required distinct canon seats. Do not translate OpenAI model names into unsupported Claude settings.
- [x] Replace universal reading lists with a task-to-document map: simulation/state, map/UI, calibration/history, release, and documentation/process. Keep applicable hard constraints at the entrypoint and link their detailed authority.
- [x] Remove duplicate `tasks/todo.md` and `tasks/lessons.md` workflows from `.claude/skills.md`; retain the established plan/ledger/knowledge system.
- [x] Make the tool-specific entrypoints concise. Move the detailed local-executor procedures to their existing `tools/local_executor/README.md` destination only where missing; retain a scoped pointer in `CLAUDE.md`.

**Proposed completion language:**

> For an authorized implementation task, continue through implementation, required checks, diagnosis of failures caused by the change, targeted correction, and independent review. Resolve routine reversible choices from project evidence. Ask when authority, acceptance criteria, or costly scope must change; report an unresolved blocker accurately. A request for a plan or review alone does not authorize implementation.

**Pass:** The same task receives compatible authority and review rules across entrypoints. Documentation-only work does not acquire simulation/build gates. Production gates and canon powers remain intact. No old dispatcher-only rule remains on the edited active routes.

### P2 - Narrow generic skills and remove automatic stopping loops

**First batch:** `.claude/skills/{using-superpowers,brainstorming,awwv-read-first,writing-plans,executing-plans,prompt-construction,awwv-make-cursor-prompt,verification-before-completion}/SKILL.md`.

- [x] Replace the 1%-relevance instruction with normal task relevance. Keep explicit user skill requests supported. Align frontmatter and body triggers.
- [x] Scope brainstorming to unresolved design choices; remove mandatory question-by-question approval for already specified work.
- [x] Make reading-list generation an explicit workflow or a response to genuinely unclear ownership, not a precondition for every nontrivial edit.
- [x] Make plans specify outcome, exact scope, dependencies, checks, authority, and stopping conditions. Remove mandatory complete implementation code, tiny-step commits, and an execution-choice question after a plan-only request.
- [x] Remove fixed three-task feedback stops and automatic escalation on the first failing test. Preserve requested checkpoints and escalation after a consolidated unresolved diagnosis.
- [x] Consolidate overlapping prompt generators around one maintained template. Retain existing names as small compatibility entrypoints until P0 proves callers can migrate safely.
- [x] Retain fresh evidence before completion; remove language that repeats already sufficient validation without new changes or evidence gaps.

Example descriptions to adapt, not copy across unrelated skills:

- `brainstorming`: "Resolve open product or technical design choices before implementation. Use when material requirements or tradeoffs remain unsettled."
- `awwv-read-first`: "Map a named AWWV subsystem to its governing docs and tests when a reading guide is requested or ownership is unclear."
- `executing-plans`: "Execute an authorized implementation plan through its required checks and closeout, preserving its scope and decision boundaries."

**Pass:** Positive and negative routing cases in section 5 select appropriate guidance. Generic process changes do not remove domain-specific consultation duties. Remaining domain-skill consolidation is deferred until P0 identifies safe, exact replacements; do not delete `canon-compliance-reviewer` or merge distinct panel seats because names overlap.

### P3 - Restore the runbook to an index

**Modify:** `.claude/napkin.md`, `.claude/napkin/entry_detail.md`, the existing relevant topic files under `.claude/napkin/`, and `.claude/skills/napkin/SKILL.md`.

- [x] Coordinate ownership before editing: the napkin is actively curated by other sessions.
- [x] Preserve user directives, domain constraints, source citations, and provenance. Move long examples/postmortems to existing topic files with working links; do not discard inconvenient lessons.
- [x] Keep the index to task routing plus the highest-value universal hazards. Move changing release numbers to pointers to their existing authorities rather than duplicating status.
- [x] Remove automatic rewriting of the napkin merely because it was read. Curate when new verified knowledge or an explicit maintenance task warrants a change.
- [x] Review candidate reductions by retained meaning and retrieval, not line/word quota. Report measured before/after size without claiming token savings.

**Pass:** Every relocated rule has a destination and source-to-destination mapping in the retained inventory. A reader can reach relevant history without reading unrelated topics. No required boundary disappears.

### P4 - Repair discovery and prevent reintroduction of stale policy

**Primary surfaces:** `.claude/README.md`, `.claude/skills.md`, `.claude/AGENT_TEAM_ROSTER.md`, `.cursor/AGENT_TEAM_ROSTER.md`, `.cursor/TASK_SUBAGENT_TYPES.md`, `.cursor/rules/*.mdc`, `.agent/skills-catalog.md`, and `tools/install_superpowers.ps1`. Select exact changed files from P0; do not rewrite every rule.

- [x] Redirect active missing `.cursor/skills` and `.cursor/agents` references to verified available capabilities. Label unused legacy inventories as historical. Preserve applicable UI, historian, and AoR rules.
- [x] Replace hardcoded catalog counts with an inventory command/pointer, or derive them from the same source. Avoid another manually maintained roster.
- [x] Change the legacy installer to a preview-first, explicit-name import. Reject overwrite by default; an intentional replacement must have a before/after diff and backup. Test allow and refuse cases in disposable temporary directories, including existing locally edited skills. Never test imports against live `.claude/skills`.
- [x] Choose one maintained source for project skill semantics. Keep `.claude/skills` in place initially; expose the reconciled project skills to Codex only after proving discovery in a disposable project and auditing existing user-level copies.
- [x] Evaluate repository `.agents/skills` support using the actual installed runtime. Current [Codex skill documentation](https://learn.chatgpt.com/docs/build-skills) supports this location and warns that same-name skills are not merged. This session's custom skills load from `~/.codex/skills`; do not assume that the documentation alone proves this desktop's behavior.
- [x] If discovery works, use a reviewed adapter/manifest that preserves deliberate host differences and prevents duplicate same-name exposure. If it fails, deliver the wording/reference fixes and retain current locations with explicit ownership. No bulk global skill installation or plugin changes.

**Pass:** Active pointers resolve; imports cannot overwrite silently; proposed Codex exposure selects the intended version without ambiguous duplicates. Hook files, hook settings, Git-hook selection, and their blocking sets remain unchanged. Any request for cross-host hook parity becomes a separate scoped task.

### P5 - Review, activation, and continuity

- [x] Complete the focused checks in section 5 and one independent review of authority preservation, instruction contradictions, paths, and mixed-model suitability. Independent Sol/medium verdict: GO for the isolated commit and owner-controlled handoff.
- [x] Correct specific findings and verify only affected checks. A second failed correction requires one consolidated diagnosis and revised approach, not another unchanged review cycle.
- [ ] At the agreed handoff, reconcile current files with the recorded bases. Activate repository changes separately from user-level changes so each can be checked and reverted independently.
- [ ] Apply approved user-level updates only when affected sessions are ready. Preserve unrelated settings and skills. Verify discovery in a fresh session without interrupting Claude's running work.
- [x] Prepare the batched ledger entry in isolation after evidence settles, recording actual scope and residuals in existing documents. Live application waits for file release with repository activation above. No board/roadmap update is necessary; no product priority or acceptance gate changed.
- [x] Record the tested source versions, activation state per host, evidence paths, and disposable rollback receipt in the activation-receipt section of this plan, referencing `logs/agent-setup-modernization/inventory.json` and the saved originals. Unavailable host verification and the future live receipt remain explicit residuals, not claims of activation.

**Pass:** The changed active configurations satisfy the routing and preservation checks, approved activation is verified, and every unmet criterion is named. Preparing a worktree or changing a source copy alone is not successful activation.

## 5. Fixed validation plan

**Question:** Do the revised instructions reduce irrelevant loading and premature stops while preserving the project's actual authority and correctness requirements?

| Check | Command or observation | Pass criterion / cost / stopping rule |
|---|---|---|
| Cheap static preflight | Scoped `git diff --check`; parse changed skill frontmatter; check active Markdown/file references; compare owned-file hashes and diff scope | No broken active paths, invalid metadata, unexpected edits, or removed protected rules. Seconds; correct failures before runtime trials |
| Routing trial | Four read-only prompts below in a disposable worktree/profile using the proposed source versions | Expected scope, reading, authority, and checks are stated. One initial run per case/configuration; retain output to files and return verdicts only |
| Host/model coverage | Astra lead and Sol worker where Codex policy changes; Claude if its files change; Luna only if its affected workflow needs distinct verification | Do not repeat identical file checks per model. Report untested hosts. Do not launch a separate large evaluation campaign |
| Import behavior, only if installer changes | Add `tests/agent_skill_import.test.ts` for the disposable-path allow/refuse cases, then `npm run test:vitest -- tests/agent_skill_import.test.ts` | Real overwrite refusal and permitted import behavior, not source-string matching; verify prerequisites before running |
| Existing hook preservation, if discovery/import paths could affect hooks | `npm run test:vitest -- tests/hook_registry.test.ts` with the documented child-scoped Git Bash environment | Registry test passes and the unchanged protected hook files match their bases. This does not prove Codex/Cursor hook execution |
| Governed documentation | `powershell -NoProfile -File scripts/repo/check_claude_governance.ps1` in the isolated worktree when its governed files change | Existing governance artifact/sections satisfied. The checker sees tracked diffs, not untracked new files; an empty/no-governed result is not proof of the new plan or adapters |
| Independent review | One separate Sol/medium reviewer, compact exact-file handoff | Concrete verdict covering process, preservation, and activation claims; one targeted correction pass |

Before test invocation, check Node and npm availability, the relevant test file, runner prerequisites, and Git Bash resolution where needed. Keep process output in `logs/agent-setup-modernization/`; capture the command's own exit code. Stop expensive retries after unexpected failures. No whole-suite/build/campaign fallback is authorized by a focused failure.

Use these read-only routing prompts; ask the tested agent to state the sources, authority, and verification it would use without editing, running simulations, publishing, or sending messages:

1. **Documentation typo:** Correct a spelling error in a named README. Expected: inspect the relevant file; focused documentation verification; no canon stack, design approval, scenario, or build.
2. **Specified UI bug:** Repair a named modal's clipped footer with an agreed behavior. Expected: relevant UI ownership/design guidance, scoped implementation and visual proof, required checks; no generic design interview or stop after the first patch.
3. **Simulation behavior change:** Change a territory-moving operation rule. Expected: domain/canon/determinism review and applicable full-horizon/provenance requirements remain; no automatic waiver or unplanned campaign expansion.
4. **Canon decision:** Change a sensitive-history rule with no panel receipt. Expected: identify the required panel/authority boundary and preserve it; no unapproved canon edit or claim that a generic reviewer replaces distinct seats.

Also review plan-only requests and injected first-test-failure examples in the same retained transcripts: plan-only work must remain planning; an in-scope implementation failure should lead to diagnosis and affected correction, not a new approval request. These are tabletop routing checks, not proof of full real-world task performance. Use ordinary subsequent authorized work to observe practical impact; do not invent savings.

## 6. Rollback and first executable slice

Repository changes roll back through the isolated migration commits, preserving any subsequent work. Restore only migration-owned user-level files from their saved originals after checking for newer edits. Never use whole-home restoration, recursive cleanup of another worktree, or a global reset. Do not remove a rollback link/backup until activation is verified.

The original first-slice recommendation was P0 plus P1 and P2. The subsequent owner instruction authorizes all preparation that isolation permits. P3 was prepared under migration-worktree ownership; no shared napkin ownership was inferred. P4 retains current locations after actual runtime discovery and duplicate-name evidence. P5 live activation still waits for the coordinated handoff.

## Planning receipt (historical)

- Prepared on 2026-09-12 from the article, the retained audit, and a fresh read-only inventory.
- Only this plan file is created in the shared checkout. No branch/index operation, build, test campaign, configuration update, or migration is part of preparing it.
- Planning verification: 20 relative Markdown links resolve; code fences are balanced; explicit planning status, parallel-work boundary, preservation requirements, validation, and rollback sections are present. Focused whitespace/conflict-marker checks pass (exit 0). No application tests are needed for this proposed document.
- Independent Sol/medium review: GO, no blocking findings. Reviewed actionability, parallel-work protection, mixed-model/cost controls, canon-seat preservation, bounded validation, discovery, and rollback. The nonblocking receipt-location clarification is incorporated above.
- Concurrent activity advanced the shared HEAD and updated the ledger during preparation. Those updates were observed and left intact; the initial SHA above remains a dated observation. No shared state was restored or frozen to make the planning checks pass.

## Execution and activation receipt — 2026-09-12

**State:** Implementation is complete in isolation and independent Sol/medium review returned GO. No live repository instructions, user skills, settings or ongoing Claude session were changed. Live activation remains an unmet P5 criterion, not an implied result of preparation.

### Ownership, versions and implemented scope

- Migration worktree: `F:/AWWV-worktrees/agent-setup-modernization`, branch `codex/agent-setup-modernization`, inspected committed base `8913cca6f714e07acf59785ce526c19dc5fc9973`. The local migration commit follows independent-review GO and final staged checks. The final delivery names its exact SHA; branch existence alone does not prove a migration commit exists.
- Shared checkout remains `F:/A-War-Without-Victory`. During preparation its owner moved from `chore/repin-188w-baselines` to `main`, HEAD `e607508bc65dad1950d560d8b5b628da89674360`. Read-only reconciliation found no tracked-tree difference from the migration base and no drift in owned files. Branch, trees, status and hashes are dated in the inventory; this is **not a release receipt**. No shared switch/reset/stash/stage/commit/clean/restore, process interruption or message to another existing session was performed by this task.
- Only the untracked plan was copied from the shared checkout into the worktree. The three previously ignored Cursor repairs were newly authored in isolation and explicitly staged; their live originals were saved outside the repo for reconciliation.
- P0: 75 direct repo skills, 62 installed counterparts, 27 unequal hashes classified by frontmatter/body: 4 host specializations, 18 stale copies, 5 retained unresolved pairs. All original directories and metadata were backed up outside the repository at `F:/AWWV-agent-setup-modernization-backup/20260912-8913cca6`. The [inventory](../../logs/agent-setup-modernization/inventory.json) contains exact paths, hashes, base blobs, per-pair dispositions, ownership and shared-file comparisons.
- P1–P2: one shared execution contract, scoped entrypoints, exact canon-seat and protected-boundary retention, and all eight requested generic skills narrowed. Prompt construction has one template and a compatibility entrypoint. Small reversible administrative edits remain direct; nontrivial/required review remains independent.
- P3: napkin index 6,214 → 437 whitespace-delimited words. All 93 numbered entries and three opening curation lessons are retained across 13 mapped sections in existing topics; obsolete automatic-reading/fixed-cap policy is labeled superseded. See [relocation mapping](../../logs/agent-setup-modernization/napkin-relocation-map.json). This is a word measurement, not token savings.
- P4: repaired active Cursor/roster/catalog references and removed stale counts. The importer previews one explicit name, refuses silent replacement, verifies the reviewed before/after state, and requires a backup for intentional replacement. [.agent/skill-distribution.json](../../.agent/skill-distribution.json) selects nine reviewed Codex adapters in the existing installed locations, with exact [per-file diffs](../../logs/agent-setup-modernization/user-diffs/). Runtime orchestrator and all unrelated installed files remain unchanged.
- No product lane, roadmap/board priority, acceptance criterion, game source/data, baseline, package, hook selection, hook setting or enforcement was changed. The existing governance artifact now has one active modernization identity and preserves the complete RE record as history. A ledger entry is prepared here for later integration.

### Verification and review

| Evidence | Actual result |
|---|---|
| [Importer tests](../../logs/agent-setup-modernization/import-final.log) | 12/12 pass, exit 0; disposable red/failure/correction evidence retained |
| [Hook registry](../../logs/agent-setup-modernization/hook-registry.log) | 6/6 pass, exit 0; child-scoped Git Bash, no persistent environment or hook changes |
| [Command contract](../../logs/agent-setup-modernization/document-command-contract.log) / [local-executor discovery](../../logs/agent-setup-modernization/local-executor-doc-contract.log) | 5/5 plus 1 applicable test pass, exit 0; unrelated tests not repeated |
| [Static checks](../../logs/agent-setup-modernization/static-validation.json) | YAML metadata, active paths, diff hygiene, source/candidate hashes, napkin preservation and 32 protected files pass, exit 0 |
| [Governance correction](../../logs/agent-setup-modernization/governance-targeted-correction.md) | Eight unique active headings and complete retained historical RE text; checker exit 0 |
| [User handoff rehearsal](../../logs/agent-setup-modernization/user-handoff-rehearsal.json) | Six disposable cases pass; nine originals restored; newer edits refused; support files preserved |
| [Read-only installed preflight](../../logs/agent-setup-modernization/live-user-preflight.log) | Final candidates/source hashes and saved originals match; no live writes, exit 0 |
| [Astra tabletop](../../logs/agent-setup-modernization/routing-astra.md), [Sol tabletop](../../logs/agent-setup-modernization/routing-sol.md), [Claude trial](../../logs/agent-setup-modernization/routing-claude-receipt.json) | Four primary cases plus plan-only/failure variants; candidate snapshots, not activation. Original gaps remain recorded |
| [Claude targeted territory case](../../logs/agent-setup-modernization/routing-claude-case3-output.json) | Exit 0; explicitly retains full suite, 188-week horizon, anchors and deterministic provenance after the wording correction |
| [Independent Sol/medium review](../../logs/agent-setup-modernization/independent-review.md) | GO for isolated migration commit and owner-controlled P5 handoff; concrete findings corrected with targeted verification; no blocking findings remain |

The [validation disposition](../../logs/agent-setup-modernization/validation-disposition.md) records commands, failed attempts, the affected-test superset disposition and why unaffected evidence was reused. The four raw protected-file hash differences are checkout line endings only; normalized contents and base Git blobs match, as recorded in static validation. No full-suite/build/campaign fallback occurred.

### Discovery, compatibility and unactivated residuals

Both installed CLI `0.130.0` and the actual desktop binary `0.154.0-alpha.6.2` discovered `.agents/skills` in a disposable project/profile. The desktop returned **two** same-name repo/user entries in the [duplicate trial](../../logs/agent-setup-modernization/duplicate-discovery-receipt.json). Therefore no same-name relocation or duplicate exposure is proposed; nine explicit adapters use the existing user skill entrypoints and route AWWV semantics to the current checkout. Supporting files stay in place.

Retained unresolved pairs are `formation-expert`, `propagate-to-canon`, and `scenario-creator-runner-tester` (unique domain/authority wording), plus `frontend-design` and `refactor-pass` (format-only differences with no semantic selection needed). The plan expressly defers further domain consolidation; neither copy is silently selected or overwritten. These are recorded compatibility dispositions, not permission to change canon authority.

| Surface/host | Prepared evidence | Activation state |
|---|---|---|
| Repository instructions and Claude source skills | Implemented; focused checks and independent review | Not integrated into Claude's checkout |
| Codex user skills | Nine exact candidate diffs; backups; hash guards; disposable apply/rollback | Not applied; all installed originals unchanged |
| Codex desktop discovery | Actual binary RPC proof; no turn started | Fresh session selecting final installed adapters still required |
| Claude | Code 2.1.269, Sonnet 5 candidate-snapshot tabletop; no tools/persistence | Owner must start/reload at boundary and verify actual routing/hooks |
| Cursor | Static paths/metadata checked; three formerly ignored routes staged | Runtime discovery/routing untested; affected owner must verify |
| Shared settings and hook enforcement | Preserved; registry and source comparison pass | No changes to activate; no cross-host parity claim |

### Exact activation steps — only after the owner coordinates the boundary

1. Obtain the affected session owners' explicit release receipt for the exact files in `inventory.json`, including the shared napkin, ledger, instructions, the three ignored Cursor files and the nine installed skill entrypoints. Record the released HEAD, worktree paths and current hashes. Do not infer release from a clean status or interrupt a running session.
2. Recompare every owned path against its recorded base/original and the current live version. If any differ, retain all versions and reconcile in an integration worktree from the newly inspected released committed base. Preserve intervening Claude edits. Regenerate only affected diffs/hashes and rerun their checks before approval; do not apply the old packet over changed files.
3. In that integration worktree, cherry-pick the reviewed migration commit from `codex/agent-setup-modernization`. Resolve only migration-owned conflicts. The previously ignored `.cursor/TASK_SUBAGENT_TYPES.md`, `.cursor/rules/ui-gui-invoke-ux-developer.mdc`, and `.cursor/rules/napkin-session-start.mdc` become tracked: before final integration into the released shared checkout, preserve/reconcile its old ignored copies against `ignored-cursor-originals` in the external backup and move those exact released local copies aside if Git would refuse their overwrite. Also preserve the shared checkout's untracked planning document at this plan's path outside the checkout and reconcile any later edits before replacing it with the reviewed execution receipt. Do not delete untracked files or clean the checkout to force integration.
4. Run scoped diff/metadata/reference checks and `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/repo/check_claude_governance.ps1 -Staged` while governed changes are staged. If the integration base changed, verify the migration diff against that base and use its reconciled preservation receipt; the original base-bound evidence is not a claim about new unrelated changes. Reuse unchanged importer/hook evidence unless reconciliation affects those inputs. Record the integrated commit and review result. Remote push/final merge still require their established authorization.
5. Activate repository instructions separately after that integration is approved. The affected owner starts a fresh Claude/Cursor session and verifies the four routing cases against the actual catalog and preserved hook coverage. No script here reloads another session.
6. Only after repository activation and a coordinated Codex user-skill boundary, run the following **from the final reviewed integration packet identified in step 4**, including any reconciled sources, adapters and regenerated manifest. First inspect the nine exact diffs and original backups. Record the packet's absolute worktree path, exact commit, manifest SHA-256 and helper SHA-256 in the external boundary receipt alongside the apply-receipt path; retain this exact packet unchanged until rollback verification is complete. Do not return to a stale migration worktree after reconciliation. The first command is read-only; the second requires the explicit boundary flag and a fresh external receipt path. The helper verifies all original/source/candidate hashes before writing and changes only named `SKILL.md` files, preserving support files and unrelated settings.

```powershell
git rev-parse HEAD
Get-FileHash -Algorithm SHA256 -LiteralPath .agent/skill-distribution.json, logs/agent-setup-modernization/user-skill-handoff.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File logs/agent-setup-modernization/user-skill-handoff.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File logs/agent-setup-modernization/user-skill-handoff.ps1 -Mode Apply -SessionBoundaryConfirmed -ReceiptPath F:/AWWV-agent-setup-modernization-backup/20260912-8913cca6/live-apply-receipt.json
```

7. The Codex owner starts a fresh session, confirms exactly one intended entry per adapted name with its narrowed description and correct current-checkout route, and verifies the four routing cases. Record per-host activation receipts here; leave any failed/untested host explicitly unactivated. Do not remove backups or the isolated worktree while activation/rollback verification is outstanding.

### Exact rollback steps

- User adapters roll back independently using the **same retained final packet that produced the apply receipt**, with the helper below and a fresh receipt. First verify its path, commit, manifest and helper hashes against the boundary receipt recorded in activation step 6; do not use an earlier migration packet or a subsequently changed checkout. The helper refuses any installed file that differs from both that packet's saved original and reviewed adapter, so later edits are preserved for manual reconciliation. It restores only the nine named original entrypoints, including their saved last-write time, and leaves support files/settings alone. A partial-apply receipt requires per-file reconciliation before further action.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File logs/agent-setup-modernization/user-skill-handoff.ps1 -Mode Rollback -SessionBoundaryConfirmed -ReceiptPath F:/AWWV-agent-setup-modernization-backup/20260912-8913cca6/live-rollback-receipt.json
```

- Repository rollback is a reviewed `git revert <integrated-migration-commit>` in an owned integration worktree, followed by scoped checks and separately authorized integration. Preserve subsequent changes through conflict resolution; never reset/restore the shared checkout wholesale.
- If reverting removes the three newly tracked Cursor paths, reconcile and restore only their exact previously ignored originals from the external backup after checking for newer edits. Preserve both versions if they differ. No other Cursor file is part of rollback.
- Affected owners reload their own sessions and record discovery/routing after rollback. No home-directory restore, global skill sync, recursive worktree cleanup, settings restoration or hook change is part of this packet.

**Remaining handoff:** All safely preparable work is delivered in this isolated packet. Shared integration, live user-file application and fresh-session acceptance remain owner-controlled P5 activation work. No approval has been inferred.
