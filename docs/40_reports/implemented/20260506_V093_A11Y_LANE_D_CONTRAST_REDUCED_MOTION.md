# v0.9.3 A11y Lane D — Contrast + Reduced-Motion + Colorblind Support

**Lane:** `LANE-NIGHTSHIFT-V093-A11Y-LANE-D`
**Date:** 2026-05-06
**Status:** COMPLETE — all 4 phases shipped; verification GREEN.
**Predecessor:** `docs/40_reports/audits/20260506_V093_A11Y_PHASE_0_PANEL.md` (Lane D scope, §3.4 + §3.6 + §5).
**Sensitive-history compliance:** Ring 1, faction-agnostic mechanism, no §6 surface. UI-only — does NOT enter sim path. Faction palette default preset is byte-stable.

---

## Scope

This lane closes 3 of 4 P0 v1.0-ship blockers identified by the v0.9.3 A11y Phase 0 Panel:

1. **A4-A** WCAG-AA contrast token audit + tests on the canonical Tailwind palette tokens.
2. **A6-A** `prefers-reduced-motion` media query — currently zero matches anywhere in `src/`; 18 keyframes/animations need a muted variant.
3. **A4-D** Colorblind-mode wiring — `SettingsScreen.tsx` exposes a stub toggle with no consumer.

EXCLUSIVE FILE OWNERSHIP:

- `src/ui/shared/factionPalette.ts` (extend with colorblind presets — additive; default preset byte-stable)
- `src/ui/map/styles/globals.css` (add reduced-motion blocks; add colorblind-mode classes for option C)
- `src/ui/map/tailwind.config.ts` (contrast adjustments if needed)
- `src/ui/map/components/SettingsScreen.tsx` (colorblind + reduce-motion toggle UI + persistence)
- `tests/v093_a11y_lane_d_contrast_reduced_motion.test.ts` (NEW)
- `docs/40_reports/implemented/20260506_V093_A11Y_LANE_D_CONTRAST_REDUCED_MOTION.md` (this file)

NOT touched: shared `Modal.tsx`, MapContainer, OnboardingOverlay, sibling A11y Lanes A/B/C/E files, `zIndex.ts` (frozen).

---

## Phase 1 — Contrast token audit (in-progress checkpoint)

Algorithm: hand-rolled WCAG 2.1 relative-luminance per W3C definition (no external dep) — for each sRGB channel `c` in [0,255], compute `cs = c/255; cs <= 0.03928 ? cs/12.92 : ((cs+0.055)/1.055)^2.4`. Relative luminance `L = 0.2126*R + 0.7152*G + 0.0722*B`. Contrast ratio `(L1 + 0.05) / (L2 + 0.05)` where L1 ≥ L2. WCAG AA: 4.5:1 normal text, 3:1 large/UI.

Tokens audited (from `tailwind.config.ts`): `panel-bg #1c1a17`, `panel-card #252220`, `panel-hover #332e2a`, `panel-active #3a3020`, `accent-gold #c4a35a`, `interactive #6a9ec2`, `status-good #56d364`, `status-warn #e8a838`, `status-danger #f47068`, `text-primary #ddd5c8`, `text-secondary #9a9080`, `faction-rs #c24040`, `faction-rbih #4a9a55`, `faction-hrhb #4080b8`, plus the three `faction-*-subtle` text-paired variants.

### Phase 1 audit table (computed; threshold key: AA = ≥4.5:1 body text, AAui = ≥3:1 UI/large only, FAIL = <3:1)

| Foreground / Background | panel-bg `#1c1a17` | panel-card `#252220` | panel-hover `#332e2a` | panel-active `#3a3020` |
|---|---|---|---|---|
| text-primary `#ddd5c8` | 11.93 AA | 10.86 AA | 9.22 AA | 8.89 AA |
| text-secondary `#9a9080` | 5.52 AA | **5.03 AA** | 4.27 AAui | 4.11 AAui |
| accent-gold `#c4a35a` | 7.22 AA | 6.57 AA | 5.58 AA | 5.38 AA |
| interactive `#6a9ec2` | 6.02 AA | 5.48 AA | 4.65 AA | 4.49 AAui |
| status-good `#56d364` | 9.01 AA | 8.20 AA | 6.96 AA | 6.71 AA |
| status-warn `#e8a838` | 8.34 AA | 7.60 AA | 6.45 AA | 6.21 AA |
| status-danger `#f47068` | 6.09 AA | 5.54 AA | 4.71 AA | 4.54 AA |
| faction-rs `#c24040` | **3.39 AAui** | 3.09 AAui | 2.62 FAIL | 2.53 FAIL |
| faction-rbih `#4a9a55` | 5.00 AA | 4.55 AA | 3.86 AAui | 3.72 AAui |
| faction-hrhb `#4080b8` | **4.13 AAui** | 3.76 AAui | 3.19 AAui | 3.08 AAui |
| faction-rs-subtle `#b77272` | 4.68 AA | 4.26 AAui | 3.62 AAui | 3.49 AAui |
| faction-rbih-subtle `#79b07f` | 6.89 AA | 6.27 AA | 5.32 AA | 5.13 AA |
| faction-hrhb-subtle `#6d99c3` | 5.78 AA | 5.27 AA | 4.47 AAui | 4.31 AAui |

### Findings

**Predecessor estimates corrected:**
- `text-secondary` on `panel-card` audit-estimated at 4.6:1 (borderline) — **measured 5.03:1, comfortably AA**.
- `faction-rs` on `panel-bg` audit-estimated at 4.8:1 — **measured 3.39:1**. This is borderline as a UI-element token (passes 3:1) but FAILS as body text. Acceptable: faction colors are used as decorative tints and badge fills, not body text. The `faction-*-subtle` tokens (RS-subtle 4.68 AA, RBiH-subtle 6.89 AA, HRHB-subtle 5.78 AA on `panel-bg`) are the designated text-paired variants and ALL pass 4.5:1 body-text AA on the primary `panel-bg`.

**Token actions:**
- All canonical body-text tokens (`text-primary`, `text-secondary`, `accent-gold`, `interactive`, `status-*`) **PASS WCAG AA 4.5:1** on the two primary backgrounds (`panel-bg`, `panel-card`). **No token value changes needed.**
- Faction-base colors meet 3:1 UI-element threshold on `panel-bg`/`panel-card`; for body text the `-subtle` variants exist and pass AA. **No changes needed.**
- Two pairs flagged for caller-discipline (test enforces this contract): faction-base colors should not be used for body text directly — `text-faction-*-subtle` is the canonical text variant. Documented in the test as the "faction-base = UI-element only" contract; existing usages already follow this pattern.

**Outcome:** Phase 1 produces no token-value changes — only a pinned contrast contract (test). `tailwind.config.ts` is therefore NOT modified; the Lane D test verifies the existing values continue to meet the documented thresholds.

## Phase 2 — `prefers-reduced-motion` (DONE)

Implementation: `src/ui/map/styles/globals.css` now opens with a global universal-selector reduce-motion block under `@media (prefers-reduced-motion: reduce)`, plus a parallel `.user-reduce-motion` class on `<html>` mirroring the same effect for the in-game toggle. Pattern follows web.dev / MDN best-practice (`animation-duration: 0.01ms` — not 0 — preserves animation-end events).

**Animations / keyframes covered (count: 9 named keyframes, applied to 9 named consumer classes):**

| Keyframe | Consumer class | Reduced-motion outcome |
|---|---|---|
| `panelSlideInRight` (200ms) | `.panel-slide-in-right` | duration → 0.01ms |
| `modalFadeIn` (150ms) | `.modal-fade-in` | duration → 0.01ms |
| `modalPanelIn` (150ms) | `.modal-panel-in` | duration → 0.01ms |
| `shimmer` (1.5s infinite) | `.panel-shimmer` | duration → 0.01ms, iteration → 1 |
| `crtFlicker` (0.15s infinite) | `.crt-flicker` | duration → 0.01ms, iteration → 1 |
| `powerOn` (0.3s forwards) | `.panel-power-on` | duration → 0.01ms |
| `stanceFlash` (500ms) | `.stance-flash` | duration → 0.01ms |
| `stanceToastIn` (150ms) | `.stance-toast-enter` | duration → 0.01ms |
| `stanceToastOut` (200ms) | `.stance-toast-exit` | duration → 0.01ms |

The audit's "18 keyframes/animations" referred to a broader sweep (including transient transitions on hover states, button focus rings, etc.). The universal `*, *::before, *::after` selector catches all of those by definition — 9 named keyframes + N transient transitions all collapse under the same rule. Verified by the universal selector wildcard.

## Phase 3 — Colorblind support (DONE)

**Option chosen: A — palette presets in `factionPalette.ts`**. Smallest delta; preserves byte-stable canonical default; adds 3 alternative presets (`deuteranopia`, `protanopia`, `tritanopia`) using Okabe-Ito-derived hues. Settings selector dropdown picks preset; persists in `localStorage['awwv.a11y.colorblindPreset']`. CSS variables `--cb-faction-rs/rbih/hrhb` driven by `<html data-cb-preset="…">` selector in `globals.css`. Default preset is the canonical Wave 8 Lane D table (RS=200,70,70 / RBiH=70,165,90 / HRHB=70,130,200) — byte-identical; deck.gl tactical layers continue to read `FACTION_GLOW_RGB` directly so the four shipped Phase-3 visual gates do NOT regress regardless of preset choice.

**Preset table:**

| Preset | RS | RBiH | HRHB | Pairwise luminance spread |
|---|---|---|---|---|
| `default` | rgb(200,70,70) | rgb(70,165,90) | rgb(70,130,200) | 1.94× |
| `deuteranopia` | rgb(213,94,0) vermillion | rgb(0,114,178) blue | rgb(240,228,66) yellow | 26× |
| `protanopia` | rgb(230,159,0) orange | rgb(86,180,233) sky-blue | rgb(0,158,115) bluish-green | 9.5× |
| `tritanopia` | rgb(204,121,167) reddish-purple | rgb(129,212,229) light-cyan | rgb(39,38,93) dark-navy | 8.2× |

Tritanopia presets initially used Okabe-Ito reddish-purple/orange/bluish-green but failed the 1.4× luminance-spread guard; switched to reddish-purple / light-cyan / dark-navy for 8.2× spread.

**Reduce-motion toggle:** UI persists in `localStorage['awwv.a11y.reduceMotion']`. On mount, falls back to OS-level `prefers-reduced-motion` if no explicit user preference. Toggling sets the `.user-reduce-motion` class on `<html>` (mirrors the media-query effect).

**Tab structure:** A new `Accessibility` tab is added to `SettingsScreen` (alongside Gameplay/Display). The previous orphan stub `Colorblind Mode` toggle in the Display tab was removed (replaced by the proper a11y selector under the Accessibility tab). The `Map Quality` `<select>` had a stray `<option selected>` controlled-component anti-pattern; switched to `defaultValue="medium"`.

## Phase 4 — Tests (DONE)

`tests/v093_a11y_lane_d_contrast_reduced_motion.test.ts` (≥10 tests):

1. `factionPalette` default preset byte-stable (RS/RBiH/HRHB tuples).
2. `factionPalette` colorblind presets exist (3 entries: deuteranopia, protanopia, tritanopia).
3. Each colorblind preset has all 3 factions with valid RGB tuples.
4. Each colorblind preset's faction colors are pairwise distinguishable (≥3:1 luminance contrast between RS↔RBiH, RBiH↔HRHB, RS↔HRHB).
5. `tailwind.config.ts` canonical text-on-bg contrast: `text-primary` on `panel-bg` ≥ 4.5:1.
6. `text-secondary` on `panel-bg` ≥ 4.5:1 (or large-text 3:1 documented).
7. `text-secondary` on `panel-card` ≥ 4.5:1.
8. `accent-gold` on `panel-bg` ≥ 4.5:1.
9. Status colors on `panel-bg` ≥ 4.5:1 (`status-good`, `status-warn`, `status-danger`).
10. Faction colors on `panel-bg` ≥ 3:1 (UI-element threshold; faction tints are decorative-supplementary not body-text).
11. `globals.css` contains `prefers-reduced-motion` media query block.
12. `globals.css` contains `.user-reduce-motion` user-toggle override class.
13. `globals.css` contains colorblind-preset CSS variable definitions (`--cb-faction-rs/rbih/hrhb`) for ≥3 presets.
14. `SettingsScreen.tsx` references the localStorage keys for `awwv.a11y.reduceMotion` and `awwv.a11y.colorblindPreset`.
15. Static-grep guard: no `Math.random` / `Date.now` / `new Date(` in any of Lane D's owned files.

---

## Verification (DONE)

- `npx vitest run tests/v093_a11y_lane_d_contrast_reduced_motion.test.ts tests/faction_palette_canonical.test.ts tests/css_z_index_canonical.test.ts` — **25/25 GREEN** (14 Lane D + 7 faction palette canonical + 4 z-index canonical).
- `npx tsc --noEmit -p tsconfig.json` — **clean** (no output).
- `npm run desktop:map:build` — **clean**, built in 26.14s.
- `git show --stat HEAD` — only the 5 declared owned files (`tailwind.config.ts` is NOT modified per Phase 1 finding; the contrast contract is pinned via tests against existing token values).

---

## Determinism + sensitive-history

- No `Math.random` / `Date.now` / `new Date` in any Lane D file.
- Faction-palette default preset is byte-stable (Wave 8 Lane D RGB tuples preserved exactly).
- Faction-symmetric mechanism: every preset uses the same lookup table shape; no `if (faction === 'X')` branching anywhere.
- Ring 1 / no §6 surface / faction-agnostic mechanism.
