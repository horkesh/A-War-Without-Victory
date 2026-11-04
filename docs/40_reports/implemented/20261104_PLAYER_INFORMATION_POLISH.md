# Player information consistency and readability

**Date:** 2026-11-04 (Europe/Sarajevo)
**Branch:** `codex/player-information-polish`
**Base:** `74945d8e0877da2b113cd318d6b7941de0554a5b`
**Result:** All six presentation deliverables implemented and independently reviewed PASS. Retained locally for later integration; no push or merge.

## What changed

| Area | Result and owned surface |
|---|---|
| Time wording | Reviewed 161 changed English values, including 158 previously using turn as a game unit. Players now see weeks in preparation, recovery, event-effect durations, chronology, advance controls, Desk and aftermath text. Existing keys and placeholder identities are preserved. The verb “turns presidential intent” is retained. Singular cases use existing explicit branches, two new EN/BCS paired keys, or invariant phrasing such as “a {turns}-week period”; no interpolation/parser rule was added. |
| Numbers | `formatters.ts` shares exact active-locale whole counts and compact formatting. Personnel retains one decimal for thousands/millions; summary counts retain integer thousands/one-decimal millions. Scale is selected before rounding, preserving the existing 999,999 → 1000k contract; negative deltas use symmetric scale handling. EN uses en-US and BCS uses bs-BA separators. |
| Missing information | Nonfinite/absent counts display the existing localized staff-report gap, while actual zero stays zero. Brigade/settlement/detail/aftermath presentation and summary counts no longer hide missing personnel or substitute an absent count with zero. `reportedMetrics.ts` preserves its partial/unreported aggregation semantics and localizes the reported total. No missing input is manufactured. |
| Labels/explanations | Existing personnel/casualty labels and exact accessible counts align with compact presentation; affected duration labels state weeks. Existing effectiveness, cohesion, supply and fatigue explanations remain derived from their current owners. |
| Layout | Formation names have their own full-width wrapping line. Formation/settlement details and aftermath values wrap safely. HQ threat/stance badges occupy a normal-flow row; effectiveness can shrink/wrap instead of overflowing. |
| Accessibility | Native row/selection actions and exact entity routing remain intact. Brigade, formation effectiveness and HQ descriptions are available on keyboard focus; brigade/HQ focus is visibly marked. Settlement formation buttons remain native keyboard controls. No nested interactive control or new command owner was introduced. |

The production changes are limited to six existing components (`BrigadeRow`, `FormationDetail`, `SettlementDetailContent`, `TurnAftermathModal`, `ArmyHQCorpsCard`, `WarSummaryContent`), two formatter/metric utilities, and English/BCS messages. Related tests were added/updated. The reusable browser tool is `tools/ui/player_information_browser_proof.mjs`.

## Evidence and verification

The committed [compact receipt](20261104_PLAYER_INFORMATION_POLISH_RECEIPT.json) retains source hashes, per-file test receipts, measured browser geometry, fixture preservation and review attribution. Raw logs and captures remain under `logs/player-information-polish-20261104/` in the owning worktree, deliberately excluded from Git. Source SHA-256 values describe the tested working-file bytes; normal Git text attributes can normalize CRLF on checkout. The receipt also carries LF-normalized source hashes for portable comparison.

| Check | Actual outcome |
|---|---|
| Cheap initial baseline | Seven files / 114 tests passed before implementation. |
| Focused implementation evidence | 25 unique files / 412 unique latest per-file passing tests across bounded runs. This is reused evidence, not one full-suite run. The latest review correction is three files / 39 tests, exit 0. |
| Additional player-visibility/ownership checks | Three additional files / 42 tests pass. The fourth boundary file, shell navigation ownership, passes 13/13 after its old “Advance turn” expectation was corrected; it is already counted in the 412. Total unique focused coverage: 28 files / 454 tests. |
| Final TypeScript | `npm run typecheck`, exit 0 on the corrected production source (`typecheck-reviewed-source.log`). |
| Closeout checks | Plan-index/open-gate tests: two files / 31 tests, exit 0. Derived plan-index and open-gate validators pass; staged whitespace check exits 0. The repository `.husky/pre-commit` script was explicitly invoked through Git Bash and exited 0. Private `--ignore-scripts` setup did not install automatic Husky launchers; automatic host-hook parity is not claimed. |
| 1366×768 real app | Corrected formation/HQ routes pass (`review-correction-browser/result.json`). Brigade name is 364px wide and 32px high within a 382px row; 2px keyboard focus and visible descriptions are proven. Reuse the unchanged settlement selection proof from `browser-attempt2/result.json` and the passing aftermath proof from `aftermath-preflight/result.json`. |
| 1920×1080 real app | All four surface groups pass: corps list/formation selection, settlement selection, HQ/summary and aftermath (`browser-1920/result.json`). |
| Preservation | Both final viewport proofs use matching hashes for all ten changed production files. No engine turns advanced. Retained save SHA-256 remains `aaebe5bd01d9ac78ffb264b74f3827ba34307c4f5ad312b4e735aa65fdca7062`; imported-save identity and the stressed projected state remain unchanged during interactions at week 104. No protected source/data/package path changed. |
| Independent review | `/root/presentation_review`, Sol (`gpt-6.1-sol`, medium): PASS after one targeted correction. Source, tests, localization, visibility/ownership, React/accessibility, and actual corrected 1366/1920 captures inspected. |

Browser fixtures load the tracked RS104 save through the actual import/Continue flow, then stress only player-owned projected display data with a long formation name, 1,234,567 personnel, missing metrics and zero. Aftermath uses the existing pure production model with synthetic displayed combat/humanitarian metrics. These are presentation fixtures, not historical results or newly simulated saves. Screenshots were inspected after font/finite-animation completion where relevant. The tileless fallback uses the established browser-gate environment; terrain rendering was not under test.

### Failures retained and corrections

- Plain `npm ci` exited 1 on inherited missing peer entries. A `--legacy-peer-deps --dry-run` preflight and private `npm ci --legacy-peer-deps --ignore-scripts --no-audit --no-fund` installation passed without modifying either manifest/lockfile. No dependency junction was used.
- Test-first receipts demonstrate the numeric/missing/locale/interaction failures. Later failing tests were old import/text expectations, corrected while retaining their runtime assertions. Every latest affected-file result passes; original failures are retained.
- The first browser selector treated a tab as a button; active HMR could also reset the screen. Freeze source before route checks. The first substantive pass found real HQ overflow (369/328px) and badge overlap; the correction then passed.
- Aftermath harness failures used the wrong metric input field and assumed the pure model appeared in the resource-entry list after skipped lazy routes. The corrected harness uses actual combat/humanitarian fields, can explicitly import the pure producer, reserves a larger resource timing buffer, and supports bounded surface/viewport selections. A targeted aftermath preflight passed before remaining verification.
- Independent review found a name reduced to about 65px despite whole-row overflow passing. A full-width name line and a name-width/line-height browser assertion resolve it. The same correction makes HQ explanations visible for sighted keyboard users. No repeated unchanged review or campaign followed.
- The plan-index check found an inherited stale R8 plan-size estimate (66941 → 66362). Regeneration changes that derived value only; no roadmap, queue or acceptance status changes.

## Reproduction

Use Node 22 and this branch's private dependencies. Start the owned Vite server on an unused loopback port; port 3297 was used here, with `VITE_AWWV_DISABLE_PMTILES=1`:

```powershell
node node_modules/vite/bin/vite.js --config src/ui/map/vite.config.ts --host 127.0.0.1 --port 3297 --strictPort
node tools/ui/player_information_browser_proof.mjs --width 1366 --surfaces formation,hq --out logs/player-information-polish-20261104/review-correction-browser
node tools/ui/player_information_browser_proof.mjs --width 1920 --out logs/player-information-polish-20261104/browser-1920
npm run typecheck
```

The proof stops on its first unexpected failure and writes `result.json` plus captures. Its default covers both viewports/all surfaces; `--width`, `--surfaces`, `--url` and `--out` permit targeted verification. Inspect `focused-coverage-inventory.json` for the exact per-file Vitest selection/results rather than rerunning a full suite for reassurance.

## Boundaries and integration

No simulation/state writer, schema, calibration input/reference, historical content, baseline, audio, startup, Electron host, map renderer/geometry, dependency manifest, package or release artifact changed. Deterministic simulation/serialization outputs are unaffected by this presentation-only source diff; no campaign equivalence measurement is claimed. Canon authorities and existing R7/R8/release gates are unchanged. No full suite, campaign, native/package acceptance or release build was run for this packet.

Claude acknowledged the external shared message file at `F:/AWWV-coordination/CODEX_CLAUDE_HANDOFF.md` and reserved the presentation paths from overlap. Its integration and frozen evidence checkouts received no Codex edits. All closeout docs, the append-only ledger entry, GUI reference and derived-index correction belong to this branch only.

For later integration, apply the presentation changes onto Claude's reconciled source and resolve any source differences with fresh affected checks. This branch is based on a locally retained January commit, not a claim that the reconciliation has landed. The current report closes this bounded presentation task only.
