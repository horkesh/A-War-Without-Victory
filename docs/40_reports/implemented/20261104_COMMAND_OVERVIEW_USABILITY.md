# Army HQ and Warroom reporting / interaction usability

**Date:** 2026-11-04, Europe/Sarajevo.
**Branch/base:** `codex/command-overview-usability` from `d7f917853bc665ac4352796620332e302eb8e61f`.
**Result:** Implemented, verified and independently reviewed. Local integration remains held for Claude's reconciliation.

## Player-visible changes

- Army HQ's briefing and canonical summary show one shared equipment report: own active-brigade tanks, artillery and AA holdings, plus the existing separate abstract heavy-equipment operational percentage. Each field states how many brigade reports contributed. Missing reports are not zero; partial totals/percentages are explicitly partial.
- The owner explicitly replaced the old design's undefined Adequate/Strained/Critical bands with operational percentage and reporting completeness. No readiness formula, threshold, combat rule or per-weapon condition was invented.
- The current Warroom flag route opens the existing faction explainer, whose drill-in opens Army HQ Summary. The staff/coatrack route also opens that canonical summary. Browser evidence proves the actual faction-to-summary handoff; no new overview owner or persistent stockpile HUD was added. The legacy Warroom extractor reuses the pure aggregate; its fallback panel was not revived or modified.
- Army HQ now contains Tab traversal and returns focus to the connected opener. War Summary has a descriptive close name and viewport-bounded scrolling. Shared modal focus eligibility excludes hidden, inert, disabled, negative-tabindex and closed-disclosure content while retaining the native disclosure summary and open content.
- Shared Tab trapping runs in capture phase before the required-decision shortcut shield. Required decisions still cannot be dismissed by Escape or backdrop click; response handling and authorizations are unchanged.

## Reporting and information boundary

`src/ui/shared/equipmentSummary.ts` is a pure UI read model. It selects the explicit canonical player's `kind: brigade`, `status: active` rows and excludes opponent, command and OG/TG rollup records. An absent/invalid player fails closed. Holdings are independently reported composition values; the weighted operational percentage sums only valid existing `equipment_state.operational_heavy` and `total_heavy` reports. A known zero pool has no percentage and differs from a missing pool. Readiness pool units are not weapon counts.

The same aggregate enters UI-only `LoadedGameState.equipmentSummary` through `GameStateAdapter` and `OwnForcesSnapshot.equipmentSummary` through the Warroom extractor. No canonical GameState field, save schema, state writer or desktop payload owner changed. Existing unrelated Warroom personnel logic was left alone.

## Evidence

The committed [receipt](20261104_COMMAND_OVERVIEW_USABILITY_RECEIPT.json) carries normalized source hashes, per-file test results, fixture preservation, review proofs and transient frontend-build inventory. Raw commands, exits, logs and captures remain in `logs/command-overview-usability-20261104/` in this worktree (Git-ignored).

| Check | Result |
|---|---|
| Initial targeted baseline | Four files / 47 tests pass before implementation. |
| Final focused evidence | 19 unique files / 226 latest per-file tests pass across retained bounded runs, not a single full-suite run. This includes the three additional visibility/ownership files / 42 tests. |
| TypeScript | Final corrected source: `npm run typecheck`, exit 0 (`typecheck-reviewed.log`). |
| Closeout checks | Two documentation files /31 tests pass; plan-index/open-gate validators and staged diff check exit0. The repository `.husky/pre-commit` script was explicitly run through Git Bash and exits0. Automatic Husky launcher installation/host enforcement parity is not claimed. |
| Frontend build | Corrected source: `npm run desktop:map:build`, exit 0 (`map-build-reviewed.log`); 191 output files inventoried. An earlier successful build predating the review correction remains retained separately. No Electron package/release build. |
| Behavioral browser proof | All three factions at 1366x768 and 1920x1080: `browser-matrix/result.json` covers five cases; explicitly reuse the earlier passing RBiH1366 reporting/navigation prefix from `browser-smoke3/result.json`, and its corrected required-dialog proof from `browser-dialog-correction/result.json`. |
| Visible report proof | `report-captures/result.json`: six cases pass on final source. Report rectangles are fully in the viewport, horizontally contained and hit-test unobscured. Captures show partial RBiH data (15 tanks, partial20 artillery,3 AA, separate partial60% pool), known RS zeros, and HRHB missing reports. |
| Dialog/runtime proof | HQ forward/reverse Tab containment, connected opener focus return, named War Summary dismissal, Recruitment footer reachability without applying, and required-decision no-dismissal/long-narrative response access without responding. Warroom faction drill-in opens canonical HQ summary. |
| Preservation | Zero turns advanced. Original tracked save SHA-256 remains `aaebe5bd01d9ac78ffb264b74f3827ba34307c4f5ad312b4e735aa65fdca7062`. Imported-save/projection identities stay unchanged during each measured navigation. Final capture verifies all eleven changed production source hashes and no source change during its run. Protected-path inventory is empty. |
| Independent review | `/root/command_overview_review`, Sol (`gpt-6.1-sol`, medium): PASS after one targeted correction, including actual Chromium production-hook probes and final visible captures. |

Fixtures clone the retained RS104 save before loading, change only synthetic player identity/display inputs, and import through the real app's import/Continue path. They deliberately add opponent and command equipment sentinels that must not enter the report. The required-decision dossier is synthetic and is never answered. These prove presentation, ownership and navigation, not historical/native campaign outcomes. The frontend uses the established tileless browser fallback; terrain was not under test.

### Retained failures and targeted corrections

1. The initial focused run had 179/180 passing tests. A base-module check reproduced an inherited assertion expecting “Turn20” instead of the already-approved parent wording “Week20.” Only that expected text changed; the affected adapter file then passed70/70, reusing the other passing files.
2. Initial TypeScript found a new test's `unknown[]` fixture type. The concrete fixture type was corrected without a production cast; final typecheck passes.
3. Browser preflight rejected a nonexistent raw `corps` fixture row; the actual save has `army_hq` command rows. The non-brigade exclusion sentinel now uses that observed row and fixture assumptions are checked before opening a browser. A later partial-label assertion was case-sensitive against actual “reported (partial)” text; the assertion was corrected without changing product copy.
4. Actual required-decision Tab navigation escaped because the inner capture shield consumed Tab before the original bubbling modal trap. A failing nested-shield regression preceded the ancestor capture correction; five targeted files /37 tests then passed. Escape/backdrop and response semantics stayed intact.
5. Independent review found native summary missing from eligibility and invisible closed-details buttons still included. Both failures were reproduced with the production hook in Chromium. One eligibility correction plus eight focused tests passed; separate new GREEN probe files prove summary-to-next and reverse-wrap-to-summary behavior. Original RED scripts/receipts were not overwritten.
6. Keyboard traversal scrolled the report out of the original screenshots, despite text/horizontal checks passing. A separate capture-only pass now scrolls it into view and asserts vertical bounds and actual hit-test visibility. Earlier behavioral evidence is reused at its actual scope; no campaign or full-suite retry followed.

## Reproduction and boundaries

With private Node22 dependencies and `VITE_AWWV_DISABLE_PMTILES=1`, start this worktree's Vite on an unused loopback port:

```powershell
node node_modules/vite/bin/vite.js --config src/ui/map/vite.config.ts --host 127.0.0.1 --port 3297 --strictPort
node tools/ui/command_overview_browser_proof.mjs --capture-only --out logs/command-overview-usability-20261104/report-captures
node tools/ui/command_overview_browser_proof.mjs --width 1366 --faction RBiH --only-dialogs --out logs/command-overview-usability-20261104/browser-dialog-correction
```

The tool supports `--width`, `--faction`, `--skip-case`, `--only-dialogs`, `--capture-only`, `--url` and `--out` for bounded verification, stops on its first failure, and preserves the original save. Inspect the receipt's per-file test log map rather than summing repeated tests or rerunning a full suite for reassurance.

No simulation/state/data/calibration/history/baseline/audio/startup/Electron-host/map-renderer/manifest/lockfile changes were made. Simulation determinism and serialization writers are unaffected by this UI-only diff; no campaign equivalence measurement is claimed. The event-catalog checker remains outside this task. Existing calibration, R7/R8, native/package and release gates remain unchanged. Final branch-local documentation and the cooperation-file handoff do not update Claude's copies or authorize push/merge. The prior polish branch remains at `d7f917853`.
