# Event illustrations

Documentary-realism 16:9 stills shown above the narrative in `EventModal` when an
event authors an `image` key (resolved by `src/ui/map/data/eventIllustrationArt.ts`).

**This directory is intentionally empty of imagery.** It holds only the WIRING.
Drop a `<basename>.webp` here and any event whose `image` key ends with that
basename renders it — no code edit needed. Events without an `image` (every
shipped event today) render text-only, byte-identical to before.

Style canon: **documentary realism** — desaturated war-photography register, no
oil-paint, no sepia. See:
- `docs/plans/2026-05-24-gui-ai-asset-brief.md`
- `docs/30_planning/design/VISUAL_ASSET_STRATEGY.md`

§6 note: atrocity-adjacent event stills (camps, Srebrenica/Žepa, Ahmići, Drina,
Markale aftermath) are SENSITIVE-GATED and must be individually owner + §6
approved before generation. Do NOT add them here without that sign-off.
