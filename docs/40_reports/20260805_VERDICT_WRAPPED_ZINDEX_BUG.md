# Bug: the Wrapped campaign-recap deck is unreachable through normal play

**Found**: 2026-08-05, while capturing showcase-site screenshots of the endgame Verdict/Wrapped flow.
**Status**: documented, not yet fixed. No engine/UI code changed by this report.
**Severity**: player-facing feature-unreachable, not a crash. Silent — no error, no visual glitch, nothing in the console.

## Symptom

From the Verdict screen (shown once `meta.game_over` is true), clicking **"View Your War"** does nothing visible. The button correctly fires `setWrappedOpen(true)`, and the Wrapped overlay (a 10-slide campaign recap: The Opening, Bloodiest Week, Best Brigade, Another Such Victory, etc.) does mount and render — but it is invisible, permanently painted underneath the still-open Verdict screen. Clicking "View Your War" again, pressing arrow keys, or waiting has no visible effect. The only way to see it was to override the DOM directly (`element.style.display = 'none'` on the Verdict screen's backdrop from devtools/a test harness).

This is not a rare edge case — it is the ONLY entry point to `WrappedOverlay` (`src/ui/map/components/chronicle/WrappedOverlay.tsx`) in the shipped UI. `generateWrappedSlides.ts` computes real, deterministic, campaign-specific content (verified working — casualty spikes, named formations, live spider chart of the six negotiating-capital dimensions), but no player can currently reach it through normal play.

## Root cause

Two independent facts combine:

1. **`VerdictScreen` never yields.** `src/ui/map/components/VerdictScreen.tsx` renders at `zIndex: Z.GAME_OVER` (both instances, lines 435 and 1089) and is gated only by `if (!loadedGameState?.gameOver) return null;`. It has no local dismiss/hide state anywhere in the file (`grep -n "dismissed|setDismiss|onClose|handleClose" VerdictScreen.tsx` → zero matches) and never reads `wrappedOpen` from the store. Once `game_over` is true, it renders for the rest of the session, full stop — which is arguably correct ("you can't dismiss the fact your war is over"), but it means nothing else can visually supersede it by default.

2. **`Z.GAME_OVER` (99999) is documented as "top of stack," and `WrappedOverlay` sits at `Z.MODAL_RAISED` (1100)** — src/ui/shared/zIndex.ts's own doc comment for `MODAL_RAISED` says "above MODAL siblings" (the 1000-tier: ArmyHQ/Chronicle/Ops), not above `GAME_OVER`. The token table is internally consistent and the existing test (`tests/z_index_canonical.test.ts`) confirms the *static* tier values and *relative ordering* are exactly as documented — the table isn't buggy. The bug is that **`VerdictScreen`'s own "View Your War" button asks for a UI state (`wrappedOpen`) that structurally cannot ever become visible while `VerdictScreen` itself is mounted**, because nothing lowers `VerdictScreen`'s z-index or hides it when that flag flips. Nobody designed for the case of a `GAME_OVER`-tier screen spawning a lower-tier overlay of itself.

## Why nothing caught this

- `tests/z_index_canonical.test.ts` (`T1`–`T5`) only asserts the token table's static values, relative ordering, and that source files import from it correctly. It never mounts two components together and checks *effective* visibility/reachability — it cannot catch "component B is technically rendered but permanently occluded by component A."
- No browser/QA gate in the repo drives the actual "game over → View Your War → see a slide" path. (`tests/ui/endgame_verdict_screen_mount.test.ts` and siblings test `VerdictScreen`'s own HTML output via `renderToStaticMarkup`, not the composed `App.tsx` stacking with `WrappedOverlay` mounted alongside it.)
- This matches the napkin's existing "QA routes must be visibly mounted" guardrail (`.claude/napkin.md`, Map & UI Shell #9: *"hidden React/Warroom copies in the DOM are not player-reachable proof"*) — but that guardrail is about hidden duplicate copies, not one live component occluding another live component it itself opened. This is a related but distinct failure shape worth naming separately.

## The correct pattern already exists elsewhere in the same file

`WrappedOverlay`'s own **"View Chronicle"** button (its *own* forward-navigation on the last slide) does this correctly:

```ts
const handleViewChronicle = useCallback(() => {
    setOpen(false);        // <- closes itself FIRST
    setCurrentSlide(0);
    openChronicle(useGameStore.getState());
}, [setOpen]);
```

`ReplayInspectionBanner.tsx` also shows awareness of this class of problem: it explicitly renders at `Z.GAME_OVER - 1`, i.e. it was deliberately positioned to sit just below the Verdict screen rather than fight it. Both of these are the "right" pattern; `VerdictScreen → WrappedOverlay` is the one place that pattern wasn't applied.

## Blast-radius survey

Checked every component rendering at the four highest tiers (`GAME_OVER` 99999, `TURN_AFTERMATH` 10000, `CRITICAL_MODAL` 9999, `HARD_MODAL` 9000, `MODAL_HARD` 8500, `PAUSE_MENU` 8000) for the same shape — "opens another component's boolean store flag without closing/yielding itself first":

| Component | Tier | Opens another overlay? |
|---|---|---|
| `VerdictScreen.tsx` | GAME_OVER (99999) | **Yes — `setWrappedOpen(true)`, no self-yield. This bug.** |
| `GameOverModal.tsx` (fallback, no-verdict case) | GAME_OVER (99999) | No — only `window.location.reload()` / `ipc.loadStateDialog()` |
| `TurnAftermathModal.tsx` | TURN_AFTERMATH (10000) | No |
| `WarHasBegunSplash.tsx` | TURN_AFTERMATH (10000) | No |
| All `CRITICAL_MODAL` modals (Commander/Dayton/Event/Officer/PeacePlan/AdvanceTurn/Reserve/Convoy/Intelligence/Operation) | CRITICAL_MODAL (9999) | No |
| `MainMenu.tsx` | HARD_MODAL (9000) | No |
| `OnboardingOverlay.tsx` | HARD_MODAL (9000) | No (its own step-advance only) |
| `PauseMenu.tsx` | PAUSE_MENU (8000) | Opens Settings/Credits (`MODAL_HARD`, 8500) — **higher** tier, so this one is fine by construction |

**Conclusion: `VerdictScreen → WrappedOverlay` is the only instance of this bug shape in the current codebase.** It exists because `VerdictScreen` is the only high-tier screen with a real reason to open a *lower*-tier overlay of itself (every other high-tier component either opens nothing, or opens something already above it).

## Recommended fix (not applied — flagging for owner/panel per the standing FORAWWV-adjacent-code caution)

Smallest correct change: make `VerdictScreen` cede visually while `wrappedOpen` is true, without giving it a general-purpose dismiss capability (preserving the "you can't dismiss game-over" intent). E.g., at both `Z.GAME_OVER` render sites in `VerdictScreen.tsx`:

```ts
const wrappedOpen = useGameStore((s) => s.wrappedOpen);
// ...
style={{ zIndex: Z.GAME_OVER, ...(wrappedOpen ? { display: 'none' } : {}) }}
```

This is a pure UI-reachability fix (Ring 1, no `§6` surface, no sim/calibration touch) — safe for a small direct PR rather than a dispatched worktree per the napkin's small-spec-dispatch-overhead lesson. A regression test should mount `App`-level (or at minimum both components together) and assert the Wrapped slide is the topmost element / has focus after triggering the transition, closing the gap `tests/z_index_canonical.test.ts` structurally cannot cover.

## Evidence

Screenshots taken during investigation (not committed to this repo; captured for the showcase site work): 10 real Wrapped slides successfully rendered once `VerdictScreen`'s backdrop was hidden via a test-only DOM override. Slide 1 "The Opening" / RS / 188 weeks; slide 3 "Bloodiest Week" / 7,507 casualties, 13 Apr 1992; slide 4 "Best Brigade" / 246th Vitezka Mountain; slide 10 "Another Such Victory" / spider chart + historical-divergence notes — all computed correctly, confirming the content pipeline (`generateWrappedSlides.ts`) itself has no bug; the entire defect is reachability.
