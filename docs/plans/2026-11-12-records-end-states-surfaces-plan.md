# Records and end states as surfaces — step 4 of the player-surface review (2026-11-12)

**Status:** ACTIVE (branch `claude/records-surfaces-5a7f7f`; the owner decides the PR and merge).
**Source:** step 4 of [the player-surface and agency review](../40_reports/proposals/20261111_PLAYER_SURFACE_AND_AGENCY_REVIEW.md) §4. Steps 2 (map rails) and 3 (operations family) run in parallel sessions on disjoint files.
**Builds on:** the surface redesign (#566) and its shared parts in `src/ui/map/components/surface/Surface.tsx`; merged in first: `claude/r8-name-sweep-recovery`, then `claude/truthful-command`.

## Rules

- Presentation only. No store, engine, IPC or read-model change.
- No change to the wording of verdict, atrocity, casualty or humanitarian text (EN or BCS). Layout only; the protected reviewed events and essays stay byte-identical. Header eyebrows reuse existing strings (date, faction name, existing titles), so no new player copy is needed.
- Test ids and `data-awwv-*` hooks stay; tests that pin old class strings are updated to the new layout.
- Not in scope: map-side panels (step 2), operation screens (step 3), the shared `GlassPanel` (still used elsewhere), the Dayton treaty/boundary/settlement components and the replay scrubber shown inside the verdict.

## Screens

| Screen | File | Surface form |
|---|---|---|
| Codex | `CodexPanel.tsx` | Full modal surface. Header: date eyebrow, "Codex", available count, Close (`codex-close`). Columns: years and essays in the rail; the selected essay in the middle on an opaque reading plane (18 px body, measure ≤ 46 rem); campaign records, choices, distance from history and the diagnostics block in the right column, which appears only when one of them has content. |
| Verdict | `VerdictScreen.tsx`, `verdict/CinematicVerdict.tsx`, `WarCostSummary.tsx` | Full modal surface (Modal kept: not dismissible, `Z.GAME_OVER`). Header: date and duration, outcome label. Rail: the three factions with score, grade and outcome. Middle: the cinematic scene as the banner, then the faction report, historical record, reckoning, campaign records and replay as surface sections. Footer: tagline and the three actions. Mobile flow tabs keep their hooks. |
| Fallback game over, Game Over modal | `VerdictScreen.tsx` (fallback), `GameOverModal.tsx` | Compact modal surface: header, standings as figure panels, footer actions. |
| Peace status | `PeaceStatusPanel.tsx` | Stays docked at the left during the pre-war phase (the map is the point of that phase) but becomes an opaque surface card: gold border, surface header, sections, gold End Turn button. |
| Economy | `EconomyPanel.tsx` | Full surface (Diplomacy pattern). Summary figures, then reserves, facilities, routes and embargo as sections in a two-column grid. |
| Enclave dashboard | `EnclaveDashboard.tsx` | Full surface. Enclave cards in the middle; airdrop budget, allocation total and Stage action in the right column when any enclave is eligible. |
| Humanitarian ledger | `HumanitarianLedgerPanel.tsx` | Full surface. Single reading column: the two tables at 16 px, the weekly bars, the verbatim note. |

Every listed file ends with: text 13 px or larger, opaque planes, surface colours; no `backdrop-blur`, no `amber-400`, no `text-xs`/sub-13 px sizes.

## Gates

Wait gate first: nothing heavier than reading and editing until `F:/AWWV-coordination/crash_recovery_20261112/shake_status.txt` says `hrhb03_exit`.

1. `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`.
2. Affected tests, then all of `tests/ui`.
3. Dev map build, Playwright drive of each screen at 2293×960 and 1280×720; screenshots in `F:/AWWV-coordination/surface_steps/step4/`; computed minimum font size ≥ 13 px per screen.
4. Entry chunk size against main.
5. Full `npm run test:vitest` (the `tests/fixtures/vitest_balanced` reds are deliberate controls).
6. PROJECT_LEDGER entry; commit and push the branch. No PR, no merge.
