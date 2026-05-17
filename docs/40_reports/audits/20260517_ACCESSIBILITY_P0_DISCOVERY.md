# Accessibility P0 Discovery - 2026-05-17

Plan: `docs/plans/2026-05-17-accessibility-p0-closeout-plan.md`

Scope honored: tests under `tests/ui/accessibility_*`; component fixes under `src/ui/map/components/**`; CSS verification under `src/ui/map/styles/globals.css`. `docs/PROJECT_LEDGER.md` and `docs/plans/MASTER_ROADMAP.md` intentionally not edited per task instruction.

## Discovery Commands

- `rg -n -U '<(div|span|li|section|article|p)\b(?s:[^<>]|<[^/])*?onClick=' src/ui/map/components`
- `rg -n -U '<(input|select|textarea)\b(?s:[^<>]|<[^/])*?>' src/ui/map/components`
- `rg -n -U '@keyframes|animation:|animate-|transition:|transition-[a-z]|duration-[0-9]|prefers-reduced-motion|user-reduce-motion' src/ui/map/styles/globals.css src/ui/map/components`
- `rg -n "text-secondary|text-\[#8a8578\]|text-\[#9a9080\]|text-neutral-500|text-slate-500|text-amber-400|text-red-500|text-green-700|text-red-700|text-\[#c24040\]|text-\[#4a9a55\]" src/ui/map/components src/ui/map/tailwind.config.ts src/ui/map/styles/globals.css`

## Clickable Control Offenders

- `src/ui/map/components/BottomStatusStrip.tsx`: clickable `div` opens Strategic Dashboard.
- `src/ui/map/components/CorpsCard.tsx`: `div role="button"` card body handles Enter only, not Space.
- `src/ui/map/components/CreditsScreen.tsx`: backdrop/content `div` click handlers.
- `src/ui/map/components/GlassPanel.tsx`: backdrop `div` click handler.
- `src/ui/map/components/OOBSidebar.tsx`: `div role="button"` faction header handles Enter only, not Space.
- `src/ui/map/components/PauseMenu.tsx`: backdrop/content `div` click handlers.
- `src/ui/map/components/SettlementDetailContent.tsx`: formation row `div role="button"` handles Enter only, not Space.
- `src/ui/map/components/SettingsScreen.tsx`: backdrop/content `div` click handlers.
- `src/ui/map/components/StackExpansionOverlay.tsx`: backdrop, formation option, and close affordance use clickable `div`.
- `src/ui/map/components/StrategicDashboard.tsx`: backdrop `div` click handler.
- `src/ui/map/components/chronicle/ChronicleSpine.tsx`: timeline segment clickable `div`.
- `src/ui/map/components/chronicle/WrappedOverlay.tsx`: full-screen clickable `div`.

## Form Label Offenders

- `src/ui/map/components/SettingsScreen.tsx`: Display `Map Quality` select has no programmatic name.
- `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx`: corps stance select has no programmatic name.
- `src/ui/map/components/army_hq/ArmyHQModal.tsx`: emergency posture select has no programmatic name.
- `src/ui/map/components/army_hq/SectorsSection.tsx`: sector stance select has no programmatic name.
- Static regression also flagged wrapped-label controls in `AiSettingsPanel.tsx` and `RecruitmentModal.tsx`; these are visually valid, but adding explicit aria labels is a low-risk hardening patch.

## Motion Findings

- `src/ui/map/styles/globals.css` already contains the OS-level `@media (prefers-reduced-motion: reduce)` block and the in-game `html.user-reduce-motion` block.
- Motion classes and inline transitions remain numerous across overlays, pulsing badges, and cards, but the global reduced-motion gates cover animation duration, iteration count, transition duration, and scroll behavior.

## Contrast Findings

- Canonical Tailwind tokens in `src/ui/map/tailwind.config.ts` already meet the pinned WCAG AA pairs encoded in `tests/ui/accessibility_contrast_tokens.test.ts`.
- No broad token churn recommended in this closeout.
