# Working On: 5-Round QA for 46 Remaining Essays

## Status
94-essay Codex is complete (100% game event coverage). All committed.
- **48 essays**: 5-round QA CERTIFIED (batches 1+2)
- **46 essays**: Written and committed, PENDING 5-round QA (batch 3)

## What needs to happen
Run the same 5-round QA process used for batches 1+2:
1. **Round 1**: Dispatch 8 historian reviewers (BB sources, ICTY citations, factual errors, hallucinations, tone)
2. **Round 2**: Fix all issues found in Round 1 (bulk BB cleanup + targeted content fixes)
3. **Round 3**: Re-review to verify fixes applied correctly
4. **Round 4**: Cross-essay consistency check + hallucination sweep (dates, ICTY numbers, VRS naming, repetition)
5. **Round 5**: Final certification — binary PASS/FAIL on each essay

## Key rules enforced
- NEVER fabricate ICTY paragraph numbers
- NEVER name background sources in body text (no BB, book titles)
- NEVER guess uncertain facts
- Perišić acquittal (Feb 2013), Gotovina acquittal (Nov 2012) properly noted
- VRS anachronism: April 1992 = "Bosnian Serb forces", not "VRS" (established 12 May)
- Dragomir Milošević always disambiguated from Slobodan
- Halilović (IT-01-48-T) for Grabovica/Uzdol, not Prlić

## Files
- Canonical: `data/scenarios/essays/essay_index.json` (94 essays, all with content)
- Individual: `data/scenarios/essays/<event_id>.json` (94 files)
- The 46 essays needing QA are those NOT in batches 1+2 (the original 48)

## After QA completes
- Commit fixes
- Sync individual files from index
- Update memory/ledger/napkin to reflect full certification
