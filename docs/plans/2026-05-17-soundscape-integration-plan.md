# Soundscape Integration Implementation Plan
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Goal

Turn the audio stub from the AAA closeout track into a functional, optional soundscape layer that can react to phase, battle, diplomacy, and verdict events without affecting deterministic simulation output.

## Architecture

The simulation remains authoritative and silent. Audio derives only from already-emitted UI/event state. A small UI adapter maps event categories to named cues, and a browser-safe audio service owns loading, volume, mute state, and fallback behavior.

## Tech Stack

- React tactical map shell
- Browser Web Audio or HTMLAudioElement API
- Existing game store selectors and event feeds
- Vitest for service and adapter coverage

## Implementation Tasks

1. Inventory available event sources
   - Identify battle, diplomacy, phase transition, order outcome, and verdict events already exposed to the map UI.
   - Record which events are stable enough to drive cues.
   - Avoid adding new simulation events solely for audio.

2. Define cue catalog
   - Create a typed cue registry with stable IDs, category, default volume, cooldown, and asset path.
   - Include a null or silent fallback cue for missing assets.
   - Document cue naming and asset placement.

3. Build audio service
   - Add opt-in initialization after user interaction.
   - Support mute, master volume, category volume, cooldown suppression, and asset-load failure handling.
   - Ensure failures degrade silently and do not block UI rendering.

4. Wire event adapter
   - Map UI-visible events to cue IDs.
   - Deduplicate repeated events during store hydration or panel remounts.
   - Keep adapter pure and unit-testable.

5. Add settings UI
   - Add a compact audio control in the settings/options surface.
   - Persist mute and volume preferences locally.
   - Default to muted or non-playing until explicit user interaction satisfies browser autoplay rules.

6. Validate runtime behavior
   - Verify no cue can change turn state, RNG, serialized state, or diagnostic output.
   - Test missing assets, muted mode, repeated events, and remount behavior.

## Files To Touch

- `src/ui/map/services/audio/*` or nearest existing service folder
- `src/ui/map/components/settings/*` or existing options panel
- `src/ui/map/store/gameStore.ts` only for UI preference state if no better local settings store exists
- `tests/ui_audio_soundscape*.test.ts`
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- `docs/40_reports/GUI_MASTER.md`
- `docs/PROJECT_LEDGER.md`

## Verification

- Run focused audio service and adapter tests.
- Run tactical map UI tests that cover settings persistence.
- Run `npm.cmd run typecheck`.
- Manually open the map, enable audio, trigger at least one event category, and confirm mute works.

## Documentation And Ledger

- Document the audio layer as cosmetic and non-authoritative.
- Add implemented report when functional cues land.
- Add PROJECT_LEDGER entry with tests and determinism note.

## Stop Gates

- Stop if browser autoplay constraints require an unexpected UX change.
- Stop if event sources are not stable enough to avoid duplicate cue spam.
- Stop if any audio wiring would need simulation-side behavior changes.
