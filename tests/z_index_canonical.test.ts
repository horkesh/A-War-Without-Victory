/**
 * z_index_canonical.test.ts
 *
 * Pin LANE-V094-Z-INDEX-TOKENS:
 *
 *   T1 (frozen Z constants):     `Z` is exported from
 *                                `src/ui/shared/zIndex.ts`, all expected tier
 *                                names exist, all values are integers, and
 *                                the object is frozen (mutation rejected).
 *   T2 (numeric values exact):   Every named tier preserves the audit-inventory
 *                                numeric value byte-for-byte. Stacking order
 *                                is unaffected by the migration; only the
 *                                literal-to-token mapping changed.
 *   T3 (relative ordering):      Tier ordering is monotonically consistent
 *                                with the audit's stacking taxonomy:
 *                                  MAP_OVERLAY < ORDER_QUEUE < CORPS_CARD_LABEL
 *                                  < GLASS_PANEL_DEFAULT < LOADING_SKELETON
 *                                  < PANEL_RAIL_SECONDARY < PANEL_RAIL_PRIMARY
 *                                  < OVERLAY_LIGHT < SHELL_FLOATING < PANEL
 *                                  < CODEX < MODAL < MODAL_RAISED
 *                                  < MODAL_RAISED_2 < PAUSE_MENU < MODAL_HARD
 *                                  < HARD_MODAL < CRITICAL_MODAL <= TOOLTIP
 *                                  < TURN_AFTERMATH < GAME_OVER
 *   T4 (no remaining literals):  All migrated source files import the Z token
 *                                from `src/ui/shared/zIndex` and no longer
 *                                contain `z-[N]` Tailwind arbitrary values
 *                                or numeric `zIndex: N` literals (where the
 *                                literal corresponds to a UI shell tier).
 *   T5 (canonical source path):  The canonical token file lives at
 *                                `src/ui/shared/zIndex.ts` (single source-of-
 *                                truth, mirrors `src/ui/shared/factionPalette.ts`
 *                                pattern).
 *
 * Sensitive-history compliance: Ring 1, faction-agnostic mechanism, no §6
 * surface. UI-only — does NOT enter sim path. No `political_controllers`,
 * `OOB`, paint anchor, rupture wiring, or `enclave_resilience.ts` touched.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Z } from '../src/ui/shared/zIndex';

const repoRoot = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8');

/**
 * The 24+ migrated source files. Each must (a) import `Z` from the canonical
 * `zIndex.ts`, (b) no longer contain a Tailwind `z-[N]` arbitrary class or
 * numeric `zIndex: N` literal mapped to a shell tier.
 */
const MIGRATED_FILES = [
  'src/ui/map/components/AttackConfirmation.tsx',
  'src/ui/map/components/CodexPanel.tsx',
  'src/ui/map/components/CommanderSelectionModal.tsx',
  'src/ui/map/components/CorpsCard.tsx',
  'src/ui/map/components/CreditsScreen.tsx',
  'src/ui/map/components/DaytonNegotiationModal.tsx',
  'src/ui/map/components/EventDecisionModal.tsx',
  'src/ui/map/components/EventLogPanel.tsx',
  'src/ui/map/components/EventModal.tsx',
  'src/ui/map/components/FirstTurnOrientationCard.tsx',
  'src/ui/map/components/GameOverModal.tsx',
  'src/ui/map/components/GlassPanel.tsx',
  'src/ui/map/components/LoadErrorToast.tsx',
  'src/ui/map/components/LoadingSkeleton.tsx',
  'src/ui/map/components/MainMenu.tsx',
  'src/ui/map/components/Minimap.tsx',
  'src/ui/map/components/OperationBriefingModal.tsx',
  'src/ui/map/components/OfficerEventBadge.tsx',
  'src/ui/map/components/OrderQueue.tsx',
  'src/ui/map/components/PauseMenu.tsx',
  'src/ui/map/components/PeacePlanModal.tsx',
  'src/ui/map/components/PeaceWarTransition.tsx',
  'src/ui/map/components/PresidentialToolbar.tsx',
  'src/ui/map/components/RadialMenu.tsx',
  'src/ui/map/components/RecruitmentModal.tsx',
  'src/ui/map/components/SettingsScreen.tsx',
  'src/ui/map/components/SidePickerOverlay.tsx',
  'src/ui/map/components/StackExpansionOverlay.tsx',
  'src/ui/map/components/StrategicDashboard.tsx',
  'src/ui/map/components/Tooltip.tsx',
  'src/ui/map/components/TurnAftermathModal.tsx',
  'src/ui/map/components/VerdictScreen.tsx',
  'src/ui/map/components/WarSummaryModal.tsx',
  'src/ui/map/components/army_hq/ArmyHQModal.tsx',
  'src/ui/map/components/chronicle/ChronicleOverlay.tsx',
  'src/ui/map/components/chronicle/WrappedOverlay.tsx',
  'src/ui/map/components/onboarding/OnboardingOverlay.tsx',
  'src/ui/map/components/ops_modal/OpsPlanningModal.tsx',
  'src/ui/map/components/panelRail.ts',
  'src/ui/map/components/warroom/AdvanceTurnModal.tsx',
  'src/ui/map/components/warroom/WarroomStatusBar.tsx',
] as const;

describe('z-index canonical token file — LANE-V094-Z-INDEX-TOKENS', () => {
  it('T1 — Z is exported, frozen, and contains every expected tier', () => {
    const expectedKeys: ReadonlyArray<keyof typeof Z> = [
      // LANE-V094-Z-TIER-EXPANSION additions (low end)
      'BACKDROP_GRAIN',
      'MAP_HUD_LOW',
      'MAP_HUD_BUTTON',
      'MAP_OVERLAY',
      'ORDER_QUEUE',
      'HOVER_LABEL',
      'CORPS_CARD_LABEL',
      'GLASS_PANEL_DEFAULT',
      'GLASS_PANEL_EVENT_LOG',
      'LOADING_SKELETON',
      'PANEL_RAIL_TERTIARY',
      'GLASS_PANEL_EVENT_MODAL',
      'GLASS_PANEL_PEACE_WAR',
      'PRIORITY_DOCKET',
      'PANEL_RAIL_SECONDARY',
      'PANEL_RAIL_PRIMARY',
      'TOOLBAR',
      'ATTACK_CONFIRMATION',
      'OVERLAY_LIGHT',
      'SHELL_FLOATING',
      'PANEL',
      'CODEX',
      // LANE-V094-Z-TIER-EXPANSION additions (modal band)
      'WARROOM_TICKER',
      'MODAL',
      'MODAL_CLOSE',
      'MODAL_RAISED',
      'MODAL_RAISED_2',
      'MODAL_RAISED_3',
      'WARROOM_OVERLAY',
      'PAUSE_MENU',
      'MODAL_HARD',
      'HARD_MODAL',
      'CRITICAL_MODAL',
      'TOOLTIP',
      'TURN_AFTERMATH',
      'GAME_OVER',
    ];
    for (const k of expectedKeys) {
      expect(Z).toHaveProperty(k);
      expect(Number.isInteger(Z[k])).toBe(true);
      expect(Z[k]).toBeGreaterThanOrEqual(0);
    }
    expect(Object.isFrozen(Z)).toBe(true);
    // Mutation must throw in strict mode (TS files are strict by default).
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Z as any).MODAL = 1;
    }).toThrow();
  });

  it('T2 — every tier preserves the audit-inventory numeric value byte-for-byte', () => {
    // LANE-V094-Z-TIER-EXPANSION additions (low end)
    expect(Z.BACKDROP_GRAIN).toBe(1);
    expect(Z.MAP_HUD_LOW).toBe(2);
    expect(Z.MAP_HUD_BUTTON).toBe(5);
    expect(Z.MAP_OVERLAY).toBe(10);
    expect(Z.ORDER_QUEUE).toBe(15);
    expect(Z.HOVER_LABEL).toBe(20);
    expect(Z.CORPS_CARD_LABEL).toBe(30);
    expect(Z.GLASS_PANEL_DEFAULT).toBe(40);
    expect(Z.GLASS_PANEL_EVENT_LOG).toBe(42);
    expect(Z.LOADING_SKELETON).toBe(50);
    expect(Z.PANEL_RAIL_TERTIARY).toBe(50);
    expect(Z.GLASS_PANEL_EVENT_MODAL).toBe(55);
    expect(Z.GLASS_PANEL_PEACE_WAR).toBe(60);
    expect(Z.PRIORITY_DOCKET).toBe(60);
    expect(Z.PANEL_RAIL_SECONDARY).toBe(90);
    expect(Z.PANEL_RAIL_PRIMARY).toBe(100);
    expect(Z.TOOLBAR).toBe(100);
    expect(Z.ATTACK_CONFIRMATION).toBe(100);
    expect(Z.OVERLAY_LIGHT).toBe(120);
    expect(Z.SHELL_FLOATING).toBe(200);
    expect(Z.PANEL).toBe(500);
    expect(Z.CODEX).toBe(900);
    // LANE-V094-Z-TIER-EXPANSION additions (modal band)
    expect(Z.WARROOM_TICKER).toBe(999);
    expect(Z.MODAL).toBe(1000);
    expect(Z.MODAL_CLOSE).toBe(1001);
    expect(Z.MODAL_RAISED).toBe(1100);
    expect(Z.MODAL_RAISED_2).toBe(1200);
    expect(Z.MODAL_RAISED_3).toBe(1500);
    expect(Z.WARROOM_OVERLAY).toBe(2000);
    expect(Z.PAUSE_MENU).toBe(8000);
    expect(Z.MODAL_HARD).toBe(8500);
    expect(Z.HARD_MODAL).toBe(9000);
    expect(Z.CRITICAL_MODAL).toBe(9999);
    expect(Z.TOOLTIP).toBe(9999);
    expect(Z.TURN_AFTERMATH).toBe(10000);
    expect(Z.GAME_OVER).toBe(99999);
  });

  it('T3 — relative ordering preserves audit stacking taxonomy', () => {
    // Strict-monotonic ordering of the canonical taxonomy chain. Ties are
    // explicit (e.g. CRITICAL_MODAL === TOOLTIP); preserved as-is.
    // LANE-V094-Z-TIER-EXPANSION additions interleave with existing tiers
    // without disturbing the original chain — only new < relations added.
    expect(Z.BACKDROP_GRAIN).toBeLessThan(Z.MAP_HUD_LOW);
    expect(Z.MAP_HUD_LOW).toBeLessThan(Z.MAP_HUD_BUTTON);
    expect(Z.MAP_HUD_BUTTON).toBeLessThan(Z.MAP_OVERLAY);
    expect(Z.MAP_OVERLAY).toBeLessThan(Z.ORDER_QUEUE);
    expect(Z.ORDER_QUEUE).toBeLessThan(Z.HOVER_LABEL);
    expect(Z.HOVER_LABEL).toBeLessThan(Z.CORPS_CARD_LABEL);
    expect(Z.CORPS_CARD_LABEL).toBeLessThan(Z.GLASS_PANEL_DEFAULT);
    expect(Z.GLASS_PANEL_DEFAULT).toBeLessThan(Z.LOADING_SKELETON);
    expect(Z.LOADING_SKELETON).toBeLessThan(Z.PANEL_RAIL_SECONDARY);
    expect(Z.PANEL_RAIL_SECONDARY).toBeLessThan(Z.PANEL_RAIL_PRIMARY);
    expect(Z.PANEL_RAIL_PRIMARY).toBeLessThan(Z.OVERLAY_LIGHT);
    expect(Z.OVERLAY_LIGHT).toBeLessThan(Z.SHELL_FLOATING);
    expect(Z.SHELL_FLOATING).toBeLessThan(Z.PANEL);
    expect(Z.PANEL).toBeLessThan(Z.CODEX);
    expect(Z.CODEX).toBeLessThan(Z.WARROOM_TICKER);
    expect(Z.WARROOM_TICKER).toBeLessThan(Z.MODAL);
    expect(Z.MODAL).toBeLessThan(Z.MODAL_CLOSE);
    expect(Z.MODAL_CLOSE).toBeLessThan(Z.MODAL_RAISED);
    expect(Z.MODAL_RAISED).toBeLessThan(Z.MODAL_RAISED_2);
    expect(Z.MODAL_RAISED_2).toBeLessThan(Z.MODAL_RAISED_3);
    expect(Z.MODAL_RAISED_3).toBeLessThan(Z.WARROOM_OVERLAY);
    expect(Z.WARROOM_OVERLAY).toBeLessThan(Z.PAUSE_MENU);
    expect(Z.PAUSE_MENU).toBeLessThan(Z.MODAL_HARD);
    expect(Z.MODAL_HARD).toBeLessThan(Z.HARD_MODAL);
    expect(Z.HARD_MODAL).toBeLessThan(Z.CRITICAL_MODAL);
    expect(Z.CRITICAL_MODAL).toBeLessThanOrEqual(Z.TOOLTIP);
    expect(Z.TOOLTIP).toBeLessThan(Z.TURN_AFTERMATH);
    expect(Z.TURN_AFTERMATH).toBeLessThan(Z.GAME_OVER);
  });

  it('T4 — every migrated source file imports Z from the canonical zIndex module', () => {
    for (const path of MIGRATED_FILES) {
      const src = read(path);
      // Must import Z from a path that resolves to src/ui/shared/zIndex.
      expect(src, `${path} should import Z from shared/zIndex`).toMatch(
        /from\s+['"][^'"]*shared\/zIndex(?:\.js)?['"]/,
      );
    }
  });

  it('T4b — no migrated source file contains a residual Tailwind z-[N] arbitrary class', () => {
    for (const path of MIGRATED_FILES) {
      const src = read(path);
      // The migration removed every `z-[N]` class. Any residual literal
      // is a regression.
      const matches = src.match(/className=[^\n]*\bz-\[\d+\]/g);
      expect(matches, `${path} should not contain a residual z-[N] class`).toBeNull();
    }
  });

  it('T4c — no migrated source file contains a residual numeric zIndex literal mapped to a shell tier', () => {
    // Tiers we expect callers to have routed through Z.* tokens. Any source
    // file that still hard-codes one of these numbers via `zIndex: N` is a
    // regression.
    const SHELL_TIER_NUMBERS = new Set<number>([
      // LANE-V094-Z-INDEX-TOKENS original shell tiers
      40, 42, 50, 55, 60, 90, 100, 120, 200, 500, 900, 1000, 1100, 1200,
      8000, 8500, 9000, 9999, 10000, 99999,
      // LANE-V094-Z-TIER-EXPANSION additions — these are NOT yet expected
      // to appear in React-shell components (no React-shell consumer was
      // migrated as part of this lane); the React-source migration is
      // future work. They are listed here so that if a React-shell file
      // later uses one of these values inline it must route through the
      // canonical Z.<TIER> token rather than a bare numeric literal.
      1, 2, 5, 20, 999, 1001, 1500, 2000,
    ]);
    for (const path of MIGRATED_FILES) {
      const src = read(path);
      const matches = src.match(/zIndex\s*:\s*(\d+)/g);
      if (!matches) continue;
      for (const m of matches) {
        const n = Number(m.replace(/[^0-9]/g, ''));
        expect(SHELL_TIER_NUMBERS.has(n), `${path} contains residual zIndex: ${n}`).toBe(false);
      }
    }
  });

  it('T5 — canonical token file exists at src/ui/shared/zIndex.ts', () => {
    expect(existsSync(resolve(repoRoot, 'src/ui/shared/zIndex.ts'))).toBe(true);
    const src = read('src/ui/shared/zIndex.ts');
    // Single named export `Z`.
    expect(src).toMatch(/export\s+const\s+Z\s*=\s*Object\.freeze\(/);
    // Faction-agnostic — no faction-specific branching.
    expect(src).not.toMatch(/RBiH|RS\b|HRHB/);
  });
});
