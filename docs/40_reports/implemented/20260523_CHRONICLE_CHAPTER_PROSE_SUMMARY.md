# Chronicle Chapter Prose Summary

**Date:** 2026-05-23
**Result:** Implemented

## Summary
- Chronicle chapters no longer summarize as generic `N sourced entries`.
- Each chapter now gets deterministic prose from source entry count, dominant entry type, headline count, and month range.
- Sensitive-history flags remain inherited only from source entries; the summary does not invent atrocity/rupture language.

## Changes Made
### Chapter Read Model
- `src/ui/map/data/chronicleChapters.ts` now derives `summary` with:
  - month range (`Apr 1992` or `Apr 1992-May 1992`),
  - sourced entry count,
  - dominant thread label,
  - headline record count.
- Type labels are deterministic and player-facing (`politics`, `cost`, `combat`, etc.).

### Regression Coverage
- `tests/ui/chronicle_chapters.test.ts` now pins prose summaries for standing-order and multi-month chapters.
- `tests/ui/chronicle_chapter_guardrails.test.ts` continues to prove sensitive signals are inherited only from source entries.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/data/chronicleChapters.ts` | Replaces generic chapter summary with deterministic prose summary. |
| `tests/ui/chronicle_chapters.test.ts` | Adds summary prose regressions. |

## Verification
- `npx.cmd vitest run tests\ui\chronicle_chapters.test.ts tests\ui\chronicle_chapter_guardrails.test.ts --reporter=dot` PASS 9/9 after red failure.

## Next Steps
- Larger CK3-style Chronicle recap remains a future synthesis layer. This slice improves the existing deterministic chapter mode without LLM/runtime generation.
