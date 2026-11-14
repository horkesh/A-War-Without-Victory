## 2026-11-14 — Ledger fragments replace top-of-file ledger edits

**Problem.** Every parallel PR added its entry at the top of `docs/PROJECT_LEDGER.md`, so any two PRs merging close together conflicted on the same line (#599, #605 and others).

**Change (docs and tooling only; no `src/`, `data/` or calibration change).**
- Stopgap: `.gitattributes` gains `docs/PROJECT_LEDGER.md merge=union`, so a local merge of main keeps both sides. GitHub's own mergeability check may not honour it.
- Fix: each PR adds one file, `docs/ledger/fragments/YYYY-MM-DD-<slug>.md`. `tools/ledger_compile.cjs` stitches all fragments into one generated block of the ledger below the archive-pointer comment, newest first (date descending, then file name with `strictCompare`). It is deterministic and idempotent. Older hand-written entries stay below the block.
- Guard: `tools/ledger_fragment_check.cjs` and the `Ledger Fragment Guard` workflow fail a PR that changes `src/` or `data/` without adding a fragment. During the transition a direct ledger edit is also accepted (`ACCEPT_DIRECT_LEDGER_EDIT`); the `no-ledger` label skips the check.
- Docs: `docs/ledger/fragments/README.md`, a paragraph in `AGENT_WORKFLOW.md`, and a PR template.

**Checked.** No test or tool depends on where an entry sits: the ledger guard reads only Current Phase and Non-negotiables, the lifecycle gate excludes the ledger, the release workflow only mentions it in a comment. `tests/ledger_compile.test.ts` covers ordering, idempotence, validation and the guard decision.

**Not done.** The union rule keeps both sides in a local merge (shown in a scratch repo; a blank line between the two entries can be lost), but it is unverified on GitHub's own merge check. `ACCEPT_DIRECT_LEDGER_EDIT` should be flipped to false once the lanes that started before this change have merged.
