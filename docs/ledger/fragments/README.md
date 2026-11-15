# Ledger fragments

One file per PR. This replaces editing the top of `docs/PROJECT_LEDGER.md`, where parallel PRs
conflicted on the same line.

## Add an entry

1. Create `docs/ledger/fragments/YYYY-MM-DD-<slug>.md`. The date is the day of the change; the slug
   is lowercase letters, digits and hyphens (for example `2026-11-14-siege-displacement.md`).
2. The first line is the entry heading, with the same date as the file name:
   `## 2026-11-14 — <title>`. Write the entry below it as before (what changed, evidence, what is
   not done).
3. Do not edit `docs/PROJECT_LEDGER.md` for the entry. Do not run the compile script in your PR.

A PR that changes `src/` or `data/` must add a fragment. CI (`Ledger Fragment Guard`) fails
otherwise. Label the PR `no-ledger` for the rare change with nothing to record.

## Compile

The integration steward runs `node tools/ledger_compile.cjs` after a merge batch, in the same PR
that re-syncs the roadmap. It rewrites one generated block in `docs/PROJECT_LEDGER.md`, below the
archive-pointer comment, newest first (date descending, then file name). Entries written before
fragments existed stay below that block. Never edit inside the block's markers.

`node tools/ledger_compile.cjs --validate` checks the names and headings only.

## Why not "append at the end"

Two branches that add text at the same spot conflict wherever that spot is. Separate files never
do.
