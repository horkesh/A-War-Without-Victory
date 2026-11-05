# Independent review — agent setup modernization

Reviewer scope: one independent P1–P4 review against base `8913cca6f714e07acf59785ce526c19dc5fc9973`. P1–P3 reviewed first; P4 held until the parent READY message. No build, package, campaign, application test, live activation, user-skill edit, settings edit, hook edit, or commit was performed.

## P1–P3 snapshot findings

### Blocking

1. **Universal independent review creates administrative-work cost creep.** `AGENTS.md:7`, `docs/20_engineering/AGENT_WORKFLOW.md:10,13,39`, `docs/20_engineering/CLAUDE_EXECUTION_STANDARD.md:18`, `.claude/skills/executing-plans/SKILL.md:10`, and `.claude/skills/orchestrator/SKILL.md:31` apply independent review to every implementation. This omits the adopted runtime policy that the implementer/reviewer default is for non-trivial implementation and small administrative work can be handled directly. A named README typo therefore appears to require a second worker. Correction requested: scope independent review to work where it is required and restore the small/reversible administrative exception.

2. **Governance artifact combines two unrelated tasks.** `docs/30_planning/_task_artifacts/ACTIVE_TASK_GOVERNANCE.md:33-38` names `RE — 1.0 Engine Integrity`; `:135-138` names the RE roadmap/plan as canonical owner; the modernization-specific `Demoted path`, `Decision boundary`, `Done means`, `UI/report truth`, `Roadmap slot`, and `What this unlocks` begin at `:166`. `scripts/repo/check_claude_governance.ps1` tests only whether headings occur anywhere, so this cross-task combination can return OK without a coherent modernization task/owner record. Correction requested: provide truthful modernization task and canonical-owner context while retaining RE history.

3. **Branch and long-job safeguards lost their active routes.** Base `CLAUDE.md` required branch-cleanup classification with `git cherry`, deletion only after zero unique commits or a recovery archive tag, and pushed archive tags; the changed active entrypoints contain none of this, and the only retained copy found by scoped search is the July full archive. Base `CLAUDE.md` also required Claude’s background/Monitor wakeup path, matching both success and failure, and reading the command’s own status rather than a wrapper/partial log. The shared cost language retains the status principle, but the Claude-specific long-job mechanism has no active destination. Add a task-scoped repository/branch-maintenance route and the host-specific long-job mechanism; do not restore universal startup loading.

### Open semantic check

- Base `CLAUDE.md` routed every session through `docs/life_lessons.md`, including its “Recently Violated” and “New Lessons” sections. Universal startup loading is intentionally removed, but the final contract still needs a discoverable task-scoped destination for relevant life lessons. Classify after the implementer’s correction rather than requiring universal startup loading.

### Correction status observed during the pass

- Finding 1 was corrected in the working tree: `AGENTS.md:7` and `AGENT_WORKFLOW.md:10,13,39,41` now say “where required,” restore direct handling for small reversible administrative work, and limit the default pair to nontrivial implementation. Recheck all duplicate host/skill entrypoints in the final snapshot.
- Finding 2 was corrected structurally: the file now opens with a modernization `## Task` and `## Canonical owner`, and the complete RE material is nested under `## Historical record — RE 1.0 Engine Integrity` with subordinate `###` headings. Recheck the final diff for accidental alteration of the retained historical record.

### Preserved in the reviewed snapshot

- Canon precedence, deterministic ordering/serialization, GameState truth, initial-control and authored-data boundaries, save compatibility, ops-only attacks, calibration one-change discipline, 188-week/full-suite/anchor/provenance gates, and release/package authority are visible in `AGENTS.md`, `CLAUDE.md`, and/or `AGENT_WORKFLOW.md`.
- The canon panel membership was initially summarized, then concurrently corrected in `AGENT_WORKFLOW.md:35` to the exact four standard seats and eight broader bright-line seats, independent and unanimous with implementer excluded. Recheck final content once P4 settles.
- Host-specific model/tool policy is kept out of Claude configuration. Shared policy requires cheap prerequisites, a stated expensive question/cost/pass criterion/stopping rule, retained logs, targeted correction, and reuse of unaffected evidence.
- Generic skills no longer impose universal activation, design interviews for settled requirements, fixed task-count stops, first-failure approval loops, complete-code plans, or repeated expensive validation. They preserve plan-only boundaries and named canon/determinism/data/save/history/acceptance constraints.

## Exact napkin relocation map and classifications

Independent comparison method: extract each `##` section from base `.claude/napkin.md`, rebase only Markdown targets from `](napkin/` to `](`, and compare ordinal text with the block following its dated relocation marker. The 12 numbered sections are exact after newline normalization and the documented link rebase. The opening Curation Rules section is also exact after normalizing its demoted “Original Curation Rules” heading. Entry counts use the source numbered-entry form. Total: 93/93 numbered entries plus all 8 curation bullets retained; three bold enforcement/count/predicate lessons remain active, while the automatic read/edit and fixed-cap workflow is explicitly historical.

| Base index section | Destination | Entries | Classification |
|---|---|---:|---|
| Curation Rules | `.claude/napkin/qa_gates.md` | 0 numbered; 8 bullets | retained verbatim under an original-rules heading; 3 high-value enforcement lessons active; automatic session reading/fixed caps superseded with provenance visible |
| Current Release State | `.claude/napkin/release_process.md` | 8 | retained verbatim; changing status/detail moved to release topic |
| Execution & Validation | `.claude/napkin/qa_gates.md` | 8 | retained verbatim; validation detail moved to QA topic |
| Diagnostic Reasoning | `.claude/napkin/entry_detail.md` | 9 | retained verbatim; diagnostic/postmortem detail moved to entry detail |
| Evidence & Tooling Discipline | `.claude/napkin/qa_gates.md` | 12 | retained verbatim; evidence/tool gates moved to QA topic |
| Domain Behavior Guardrails | `.claude/napkin/entry_detail.md` | 6 | retained verbatim; domain cautions moved to entry detail |
| Player & Runtime Truth | `.claude/napkin/engine_runtime.md` | 8 | retained verbatim; runtime/state truth moved to engine topic |
| Operations & Narrative Truth | `.claude/napkin/engine_runtime.md` | 3 | retained verbatim; operations/narrative truth moved to engine topic |
| Map & UI Shell | `.claude/napkin/map_counters.md` | 15 | retained verbatim; map/UI detail moved to map topic |
| Engine Runtime Patterns | `.claude/napkin/engine_runtime.md` | 10 | retained verbatim; implementation patterns moved to engine topic |
| Shell & Command Reliability | `.claude/napkin/qa_gates.md` | 10 | retained verbatim; runner/platform detail moved to QA topic |
| User Directives | `.claude/napkin/entry_detail.md` | 3 | retained verbatim; user directives moved to entry detail and linked from universal boundary 1 |
| Visual Art Direction | `.claude/napkin/warroom_and_legacy.md` | 1 | retained verbatim; neutral opening direction moved to warroom topic |

Index classification:

- `.claude/napkin.md` changed from 6,214 whitespace-delimited words / 252 lines to a 437-word / 38-line synthesized routing index.
- Five universal boundaries are concise semantic summaries, not replacements for the relocated text; they link to the detailed destinations.
- Seven task-routing rows point to the six modified topics plus the retained `unreported.md` and full archive.
- Ten high-frequency hazards are curated summaries/duplicates of retained detail. They preserve control, provenance, selector, runtime/UI, destructive-worktree, deterministic-fixture, missing-data, desktop transaction, and junction hazards.
- All six destination files retain their complete base prefix byte-for-byte after newline normalization. Final marker counts are: release 1; QA 4; entry detail 3; engine runtime 3; map counters 1; warroom/legacy 1.
- All 19 local Markdown link occurrences in the reviewed P1–P3 entrypoints resolve to existing files. The `entry_detail.md#user-directives` heading exists. The initial checker command emitted benign `Join-Path` errors for repository-root source files before applying the root-path fallback; its reported targets all resolved. No claim is made about external URLs.

## P4/final review scope release

P4 and the activation/rollback packet were reviewed after the parent READY messages. The initial blockers below were reported once and then checked only at their corrected locations; unchanged validation was not repeated.

## P4 review — initial pass and targeted correction status

### Findings raised

1. Three newly authored Cursor paths were ignored/untracked under `.gitignore:110`: `.cursor/TASK_SUBAGENT_TYPES.md`, `.cursor/rules/ui-gui-invoke-ux-developer.mdc`, and `.cursor/rules/napkin-session-start.mdc`. Because tracked `.cursor/AGENT_TEAM_ROSTER.md` actively links the task-type file, omission would break the repaired route. **Corrected:** all three are now explicitly staged as additions; final inventory must retain them.
2. `.claude/AGENT_TEAM_ROSTER.md` called six domain rows “Mandatory consultation gates,” and the Cursor roster repeated mandatory consultations without distinguishing guidance/lens coverage from an additional worker. Cursor also repeated an unqualified implementer/reviewer default. **Corrected:** both rosters now state that qualified implementation/review may cover compatible consultation duties; a specialist is added for a distinct expertise gap; nontrivial work gets the default pair; small reversible administration may be direct; mandatory canon/explicit seats remain independent.
3. The role map pointed exact canon-panel membership to FORAWWV plus `canon-compliance-reviewer`, neither of which carries the complete exact 4/8 membership wording. **Corrected:** the role map now links the exact shared workflow canon boundary, then the operative sensitive-history/canon sources, and keeps similarly named canon reviewers distinct.
4. The `using-superpowers` repo and adapter descriptions were still broad enough that the Sol tabletop selected the meta-skill for every case. **Corrected without repeating the whole tabletop:** both frontmatter/body copies now activate only for unclear skill/workflow selection or explicit request; `routing-sol.md` preserves the original observation and marks only that selection superseded. Manifest hashes and the exact user diff were regenerated. `codex-adapter-summary.json` was briefly stale and is now aligned.

### Import/distribution assessment

- `tools/install_superpowers.ps1` is explicit-name and preview-first. It requires an external review receipt and matching `.diff`; binds apply to unchanged source, target, receipt state, and diff hash; refuses existing targets without a separate `-Replace` preview/apply and fresh external backup root; preserves the full old tree; rejects equal/nested trees and reparse points; stages and verifies a complete incoming tree; rechecks destination drift before move; and restores the backup if the replacement move fails.
- The focused retained test log records 12/12 passing disposable cases: preview no-write, missing-preview refusal, named support-file import, default overwrite refusal, required backup, full-old-tree preservation, source/target drift refusal, modified-diff refusal, nested-tree refusal, reused-backup refusal, and linked-source refusal. No test or import targeted live `.claude/skills`.
- `.agent/skill-distribution.json` truthfully says prepared/not activated, keeps `.claude/skills` as maintained project semantics, records CLI `0.130.0` and desktop `0.154.0-alpha.6.2` discovery, records duplicate repo/user entries rather than claiming merge/precedence, changes no settings, preserves named host-specialized skills, and stages exactly nine named installed entrypoints.
- Independent hash observation after correction: all nine project sources, adapters, saved originals, proposed diff paths, and current installed originals match the manifest. No live user skill differs from the recorded original.
- The nine exact user diffs replace only `SKILL.md` entrypoints. Adapters preserve generic behavior outside AWWV, route AWWV to its matching `.claude/skills` source plus repo/runtime authority, preserve canon/determinism/control/save/history/provenance gates where triggered, and do not copy or delete support files.
- `logs/agent-setup-modernization/user-skill-handoff.ps1` defaults to `Verify`; Apply/Rollback require `-SessionBoundaryConfirmed` and a fresh receipt outside the installed tree. It validates all nine names, paths, source/candidate/original hashes, installed state, and reparse ancestors before the first write; checks each target again before copy; verifies post-copy hashes; writes a completed or truthful partial receipt; and refuses rollback over a newer third-party edit.
- Disposable handoff rehearsal retained in `user-handoff-rehearsal.json`: Verify 0, missing-boundary refusal 1, installed-drift refusal 1, Apply 0, rollback-drift refusal 1, Rollback 0, nine restored, unrelated support files preserved, live files untouched.
- Discovery receipts support only what the manifest claims: `.agents/skills` appears in `skills/list` for both tested CLI and desktop binaries in disposable project/profile; duplicate repo/user names both appear; no thread/turn ran; desktop activation and current-session routing remain unverified. The decision to retain current locations and avoid `.agents` same-name exposure follows that evidence.
- Hook evidence is bounded: `tests/hook_registry.test.ts` logged 6/6 pass; protected hook sources/settings are unchanged; no Codex/Cursor parity is claimed.

### Targeted P1–P3 correction verification

- Administrative exception and “where required” review wording now agree across `AGENTS.md`, shared workflow, Claude standard, executing-plan/orchestrator skills, and Cursor roster.
- Exact standard four and broader eight canon seats are explicit in `AGENT_WORKFLOW.md`; panel independence, unanimity, implementer exclusion, delegated §6/enclave authority, same-change canon record, and owner proposal visibility remain.
- `CLAUDE.md` now has task-scoped life-lessons and repository/branch-maintenance routes. It restores `git cherry` classification, archive-before-delete, remote recovery tag, and guarded-prune rules.
- `CLAUDE_EXECUTION_STANDARD.md` now restores Claude background/Monitor wakeup, both success/failure selectors, useful parallel work, actual command status, and retained-log rules.
- Modernization governance now owns the top-level required headings; the prior RE record is nested as historical. Independent ordinal comparison confirms the full base RE record is exact after only demoting its `##` headings to `###` and removing its duplicate top title.

## Final targeted acceptance — GO

**Verdict: GO for the isolated migration commit and owner-controlled P5 handoff. No blocking P1–P4 finding remains.** The packet is reviewable, preserves the required authority/canon distinctions and safeguards, and describes its activation state truthfully.

Targeted final checks:

- The plan header now says `IMPLEMENTED IN ISOLATION` and `NOT ACTIVATED`, records the owner's implementation authorization, and no longer describes the worktree as a post-activation artifact.
- The ownership receipt says the migration commit follows this GO and final staged checks; it does not claim a commit already exists. The final delivery must identify the resulting exact SHA.
- Activation step 6 binds user-skill Apply to the final reviewed integration packet after any base reconciliation. The external boundary receipt records that packet's absolute path, commit, manifest SHA-256, helper SHA-256, and apply-receipt path. Rollback requires the identical retained packet and verifies the same bindings before restoring the nine named entrypoints.
- Repository integration, ignored-Cursor reconciliation, repository-session reload, user-skill application, and fresh-host routing checks are ordered separately. Each host remains explicitly unactivated until its own acceptance succeeds; Cursor runtime behavior is still untested rather than inferred from static files.
- The ledger describes isolated preparation and remaining P5 work without claiming live activation, merge, push, settings changes, hook changes, product validation, or closure of a roadmap gate.
- The final static receipt reports 46 source/docs files, 19 skill metadata records, 2 Cursor metadata records, 128 links, 32 protected files, 12 numbered napkin sections, 1 curation section, and 3 active curation lessons, with no failures and exit 0. Four raw protected-file hash differences are identified as line-ending-only and have base-identical normalized Git blobs.
- The three ignored Cursor paths remain explicitly staged as additions. This is necessary for the roster and session-routing links to survive integration.

Residual conditions are activation work, not preparation blockers: create and identify the local migration commit after final staged checks; obtain the affected owners' release receipt; reconcile against the released live base; record the integrated commit; apply the user adapters only from the bound final packet; and run the stated fresh-session host checks. A failed or untested host remains unactivated, and retained backups/worktrees remain until activation and rollback verification are complete.

Review limits: this verdict relies on the retained focused test/evidence receipts and the targeted correction inspection described above. I did not rerun builds, campaigns, product tests, importer tests, hook tests, the full tabletop, or live activation, and I made no changes outside this review log.
