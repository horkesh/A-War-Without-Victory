/**
 * z-index Token File — single canonical source-of-truth for stacking tiers
 * across every UI shell (React tactical map, vanilla-TS Warroom, Army HQ,
 * Codex, deck.gl tactical layers).
 *
 * ─── Authority ─────────────────────────────────────────────────────────────
 * Per `docs/40_reports/audits/20260505_V094_PHASE_1_2_UI_SHELL_AUDIT.md`
 * §3.1 P1-A and §2.6: 17+ z-index literals were scattered across 24+ files
 * with no central token registry. Risk: future modal lands at the wrong
 * layer; modals at the same tier (Army HQ vs Chronicle vs Ops vs
 * StackExpansion all at 1000) rely on ad-hoc render order.
 *
 * This module canonicalizes those literals into named, frozen semantic
 * tiers. Numeric values are preserved byte-for-byte from the audit
 * inventory — the migration only changes the literal-to-token mapping;
 * relative stacking order is unaffected.
 *
 * ─── Faction-symmetric mechanism ──────────────────────────────────────────
 * z-index is faction-agnostic. No faction-specific branching anywhere in
 * this module.
 *
 * ─── Determinism ───────────────────────────────────────────────────────────
 * Pure constants; no Math.random, no Date.now, no closures over mutable
 * state. The frozen `Z` object is safe to read from any code path.
 *
 * ─── Migration policy ──────────────────────────────────────────────────────
 * Use inline `style={{ zIndex: Z.X }}` (or for vanilla DOM:
 * `el.style.zIndex = String(Z.X)`) when migrating an existing literal.
 * This avoids Tailwind JIT class-detection edge cases that can occur with
 * template-literal `z-[${Z.MODAL}]` arbitrary-value classes (Tailwind's JIT
 * scans for static class strings; template substitutions are not always
 * resolved at scan time).
 *
 * Pre-existing Tailwind `z-[N]` arbitrary-value classes are removed from
 * a `className` and replaced with `style={{ zIndex: Z.X }}` on the same
 * element — the resulting browser z-index is identical to the prior
 * literal class.
 *
 * NEVER hard-code a numeric literal for z-index in any UI shell file going
 * forward; import a tier from this module instead. Tests in
 * `tests/z_index_canonical.test.ts` pin the contract.
 *
 * ─── Sensitive-history compliance ──────────────────────────────────────────
 * Ring 1, faction-agnostic mechanism, no §6 surface. UI-only — does NOT
 * enter sim path. No `political_controllers`, `OOB`, paint anchor,
 * rupture wiring, or `enclave_resilience.ts` touched.
 */

/**
 * Canonical z-index tiers. Frozen.
 *
 * Tier names are organized roughly low→high. Numeric values are exact
 * preservations of the audit inventory — every existing literal maps to
 * one of these tiers without changing its numeric value.
 *
 * Tier groupings:
 *
 *   MAP_OVERLAY (10)              — Intra-component map overlays (Minimap)
 *   ORDER_QUEUE (15)              — Intra-component queue badges
 *   CORPS_CARD_LABEL (30)         — Intra-component badge labels
 *   GLASS_PANEL_DEFAULT (40)      — GlassPanel default (left/right tray)
 *   GLASS_PANEL_EVENT_LOG (42)    — Right-side Event Log panel
 *   LOADING_SKELETON (50)         — First-paint scenario-load placeholder
 *   PANEL_RAIL_TERTIARY (50)      — Right-edge settlement panel
 *   GLASS_PANEL_EVENT_MODAL (55)  — Event Modal centered overlay
 *   GLASS_PANEL_PEACE_WAR (60)    — Peace→War transition centered overlay
 *   PRIORITY_DOCKET (60)          — Warroom Status priority docket
 *   PANEL_RAIL_SECONDARY (90)     — Secondary detail panel
 *   PANEL_RAIL_PRIMARY (100)      — Primary detail panel
 *   TOOLBAR (100)                 — Presidential toolbar (top)
 *   ATTACK_CONFIRMATION (100)     — Attack confirm dialog (panel-level)
 *   OVERLAY_LIGHT (120)           — Recruitment / SidePicker
 *   SHELL_FLOATING (200)          — Toolbar crest, radial menu
 *   PANEL (500)                   — Strategic dashboard
 *   CODEX (900)                   — Codex panel
 *   MODAL (1000)                  — ArmyHQ / Chronicle / Ops / StackExpansion
 *   MODAL_RAISED (1100)           — Wrapped overlay (above MODAL siblings)
 *   MODAL_RAISED_2 (1200)         — War Summary modal
 *   PAUSE_MENU (8000)             — Pause menu
 *   MODAL_HARD (8500)             — Settings, Credits, FirstTurn, Toast
 *   HARD_MODAL (9000)             — Main menu, Onboarding overlay
 *   CRITICAL_MODAL (9999)         — Commander / Dayton / Operation / Event / OfficerEvent / PeacePlan / AdvanceTurn
 *   TOOLTIP (9999)                — Tooltip (sits at same tier as critical modals — last paint wins)
 *   TURN_AFTERMATH (10000)        — Turn aftermath card (above critical modals)
 *   GAME_OVER (99999)             — GameOver / Verdict screens
 */
export const Z = Object.freeze({
  /** Intra-component minimap overlay marker (e.g., viewport rectangle). */
  MAP_OVERLAY: 10,

  /** Intra-component order-queue badge stacking. */
  ORDER_QUEUE: 15,

  /** Intra-component CorpsCard badge label. */
  CORPS_CARD_LABEL: 30,

  /** GlassPanel default tray z-index (left / right / bottom variants). */
  GLASS_PANEL_DEFAULT: 40,

  /** Event Log glass panel (right side). */
  GLASS_PANEL_EVENT_LOG: 42,

  /** First-paint scenario-load skeleton (covers everything below the toolbar). */
  LOADING_SKELETON: 50,

  /** Right-edge settlement panel (panel rail tertiary). */
  PANEL_RAIL_TERTIARY: 50,

  /** Event Modal — centered overlay with backdrop. */
  GLASS_PANEL_EVENT_MODAL: 55,

  /** Peace→War transition — centered overlay with backdrop. */
  GLASS_PANEL_PEACE_WAR: 60,

  /** Warroom-style priority docket (bottom-right alert badges). */
  PRIORITY_DOCKET: 60,

  /** Secondary detail panel (slides out behind the primary). */
  PANEL_RAIL_SECONDARY: 90,

  /** Primary detail panel (right side, full clearance). */
  PANEL_RAIL_PRIMARY: 100,

  /** Top Presidential toolbar — fixed h-12 bar at top of frame. */
  TOOLBAR: 100,

  /** Attack confirmation overlay — panel-tier (sits above the map). */
  ATTACK_CONFIRMATION: 100,

  /** Recruitment / SidePicker overlay (light overlay, above panels). */
  OVERLAY_LIGHT: 120,

  /** Toolbar crest, radial menu — floating shell-level chrome. */
  SHELL_FLOATING: 200,

  /** Strategic dashboard — full-screen panel below modals. */
  PANEL: 500,

  /** Codex knowledge panel. */
  CODEX: 900,

  /** ArmyHQ / Chronicle / OpsPlanning / StackExpansion — sibling modal tier. */
  MODAL: 1000,

  /** Wrapped overlay — above MODAL siblings. */
  MODAL_RAISED: 1100,

  /** War Summary modal — above MODAL_RAISED. */
  MODAL_RAISED_2: 1200,

  /** Pause menu — above all panels and modals, below MODAL_HARD. */
  PAUSE_MENU: 8000,

  /** Settings / Credits / FirstTurn orientation card / LoadErrorToast. */
  MODAL_HARD: 8500,

  /** Main menu / Onboarding overlay. */
  HARD_MODAL: 9000,

  /**
   * Critical modals: Commander select, Dayton, Operation briefing,
   * Event decision, Officer event, Peace plan, Advance turn.
   */
  CRITICAL_MODAL: 9999,

  /** Tooltip layer — same numeric tier as critical modals (last paint wins). */
  TOOLTIP: 9999,

  /** Turn aftermath summary card — sits above critical modals. */
  TURN_AFTERMATH: 10000,

  /** GameOver / Verdict screens — top of stack. */
  GAME_OVER: 99999,
} as const);

/**
 * Type alias for any tier-name key in the canonical `Z` table.
 */
export type ZTierName = keyof typeof Z;
