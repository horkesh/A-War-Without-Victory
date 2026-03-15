---
name: propagate-to-canon
description: After making changes (code, constants, mechanics, paths, schemas, or any behavioral change), propagate those changes to all relevant canon and engineering documentation. Keeps docs in sync with code.
---

# Propagate to Canon

## When to use
After any change that affects what documentation says: code refactoring (renames, moves, splits), constant/parameter tuning, mechanic additions or removals, schema changes, new pipeline steps, new files, deleted files, behavioral changes.

## Workflow

### 1. Identify what changed
- Read recent `docs/PROJECT_LEDGER.md` entries and/or `git log --oneline -10`
- List every change that documentation might reference:
  - **Path changes:** old path → new path (or "deleted")
  - **Constant/parameter changes:** old value → new value, which file
  - **Mechanic changes:** what was added, removed, or altered
  - **Schema changes:** new GameState fields, removed fields, type changes
  - **Pipeline changes:** new steps, removed steps, reordered steps

### 2. Scan documentation for stale references
Search these locations for references to the changed items:
- `docs/10_canon/` — canon, MUST update
- `docs/20_engineering/` — engineering, MUST update
- `docs/30_planning/` — update if actively referenced
- `.cursor/skills/` — Pyrrhic role skills, MUST update
- `.claude/skills/` — Claude skills, MUST update
- `.agent/` — agent config, update if references exist
- `.claude/napkin.md` and MEMORY.md files — session memory, MUST update

**Skip**: `docs/40_reports/` (historical, leave as-is), `node_modules/`, `dist/`

### 3. Classify each reference
- **Structural** (file path, import path, directory listing, constant value in a table, mechanic description that contradicts current code, "see file X") — MUST update
- **Historical/content** ("Phase I mechanics were developed in...", "in n213 we observed...") — leave as-is
- **Step names** (`phase-i-militia-emergence` in TurnReport) — leave as-is (save compatibility)
- **Uncertain** — leave and flag in output

### 4. Apply updates
- Use Edit tool for each file, updating structural references
- For path renames: replace old paths with new paths
- For constant changes: update values in tables/descriptions that cite specific numbers
- For mechanic changes: update descriptions that explain how the mechanic works
- For schema changes: update field lists, type descriptions
- Add "(renamed from old/path)" only in reference guides where readers might search old names
- Never auto-edit `docs/10_canon/FORAWWV.md` — flag for manual review

### 5. Verify
- Run `npx tsc --noEmit` if any `.ts` files were touched
- Spot-check updated docs for coherence (no broken cross-references, no contradictions)

### 6. Append ledger entry
Record in `docs/PROJECT_LEDGER.md`:
- Which files were updated
- How many references were changed
- Any flagged uncertain references left for human review

## Rules
- Canon hierarchy: Engine Invariants > Phase Specs > Systems Manual > Rulebook > Game Bible > context.md
- Never invent new content; only update existing references to match current code
- When uncertain whether structural or historical, leave it and flag it
- For behavioral changes, update descriptions to match new behavior, but don't rewrite entire sections
