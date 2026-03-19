# Morning Report — Night Shift 2026-03-19

## Summary
Displacement recalibration session. 10 calibration runs (n925-n934). Traced displaced Bosniak flow end-to-end: sources → routing → receiving municipalities → militia pools → brigade recruitment. Best result: **88.8% area-weighted** (from 87.5% uncalibrated, baseline 91.0%). Remaining 2.2pp gap is structural — VRS Drina Corps losing 6 marginal Zvornik OSIDs due to ARBiH having slightly more manpower. 2 commits.

## What Was Done

### Displacement Pipeline Investigation
1. Traced 548k displaced Bosniaks from RS-controlled municipalities
2. Top receivers: Tuzla (91k), Zenica (75k), Tešanj (55k), Jajce (53k), Bihać (48k), Srebrenica (50k)
3. Identified Novi Grad Sarajevo pool as biggest single delta: 1,965 → 10,272 committed (+8,307)
4. Total RBiH pool committed delta: +19,878 across all municipalities
5. RS pool committed delta: -5,911 (driven by Doboj collapse: 14,317 → 3,855 from ARBiH capturing Doboj OSIDs)

### Calibration Runs
| Run | Changes | Area% | Key Finding |
|-----|---------|-------|-------------|
| n925 | Fix only | 87.5% | Baseline post-fix |
| n928 | RATE=0.02 + RBiH pool 0.06 | 87.8% | Pool scale too blunt |
| n930 | CAP=500 | 87.6% | RS starved |
| n931 | CAP=800 + RS pool 0.30 | 88.2% | RS compensation works |
| **n932** | **CAP=300 + RS pool 0.30** | **88.8%** | **Best — used** |
| n933 | RS pool 0.35 | 87.4% | Overcorrected (Sarajevo collapsed to 45.9%) |
| n934 | +Enclave rate 0.005 | 88.8% | Same (Zvornik not enclave-driven) |
| n935 | RATE=0.01 | 87.5% | Starves ARBiH everywhere |

### Root Cause of Remaining Gap
**Zvornik municipality**: 6 OSIDs that VRS captured in baseline (9 RS / 2 RBiH) now stay RBiH (3 RS / 8 RBiH). These started as Bosniak-majority from census. VRS Drina Corps is losing marginal early-war battles because ARBiH brigades in Tuzla/Kalesija/Gradačac area have ~5-10% more personnel.

NOT fixable through displacement parameters — needs VRS combat effectiveness work:
- VRS early-war blitz doctrine tuning (weeks 0-12 intensity)
- Drina Corps OOB (VRS brigade strength in the area)
- Painted target review (are 9/11 RS OSIDs in Zvornik realistic at w40?)

## Decisions Made
- **Enclave routing KEPT**: User explicitly corrected attempt to block — "enclaves received refugees, that's why they became enclaves." Written to memory.
- **Enclave-specific reinforcement rate (0.005)**: Refugees in besieged enclaves less militarizable than IDPs in free territory. Historically correct.
- **RS pool scale 0.30**: Compensates for cascade (more ARBiH → captures RS OSIDs → RS pool drain). 0.35 overcorrected.
- **DISPLACED_CONTRIBUTION_CAP=300**: Limits mega-receivers without starving small pools.

## Lessons Learned (appended to memory)
- **[Night Shift] Enclaves received refugees — that's WHY they became enclaves**: Never block displacement routing to enclaves. Fix overperformance through reinforcement rates, supply, or combat effectiveness. Corrected for 5th time — now in memory.
- **[Night Shift] REINFORCEMENT_RATE is a weak calibration lever**: Changing 0.05→0.01 moves calibration <1pp. The real driver is total displaced × rate × turns compounding through combat outcomes. The cascade is non-linear.
- **[Night Shift] RS pool scale overcorrection is catastrophic**: 0.25→0.35 caused Sarajevo to collapse (74.8% → 45.9%). Confirmed life lesson: "Cross-faction pool scale changes cascade through changed war dynamics."

## Commits
1. `5fd65a7` — calibrate(n931): recalibrate pool parameters after displacement fix
2. `0c09a66` — calibrate(n934): enclave-specific reinforcement rate + refined pool parameters

## Build State at End of Shift
- tsc: clean
- vitest: 98 suites, 1203 tests, 1 skipped
- Last commit: 0c09a66
- Calibration: 88.8% area-weighted (n934)

## Recommended Next Steps
1. Investigate VRS Drina Corps early-war performance (Zvornik, weeks 0-12)
2. Consider increasing VRS blitz intensity for Drina region specifically
3. Review painted targets for Zvornik — 9/11 RS is aggressive for w40
4. Resume ops planning modal implementation in worktree (`feat/ops-modal-redesign`)
5. Commit the ops modal prototype and plan docs (currently untracked)
