# R7 Audio Closeout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clear every blocking R7 audio-provenance violation by measuring the 17 supplied UI cues and adding three restrained, first-party ambient beds for the Warroom, tactical map, and archive surfaces.

**Architecture:** Keep the existing audio bus, surface routing, and stable cue IDs. Add a deterministic first-party synthesis script whose cross-platform contract is the canonical mono 48 kHz PCM for three loopable beds. Encode the processed OGGs only with the documented FFmpeg/FFprobe 8.1.2 toolchain, wire those binaries through the existing Rollup URL map, and record source-PCM and processed-asset hashes, duration, EBU R128 loudness, generation commands, and licensing in the canonical provenance manifest. Optional music, stingers, and extra ambience remain silent placeholders.

**Tech Stack:** TypeScript/Vitest, Node.js asset synthesis, FFmpeg/FFprobe 8.x, OGG Vorbis, Rollup static URL imports, JSON/Markdown provenance.

---

### Task 1: Make the required-audio contract fail positively

**Files:**
- Modify: `tests/audio_asset_provenance.test.ts`
- Modify: `tests/ui/audio_ambient_floor.test.ts`
- Test: `tests/audio_asset_provenance.test.ts`
- Test: `tests/ui/audio_ambient_floor.test.ts`

**Step 1: Write the failing tests**

Add assertions that the strict inventory has zero blocking violations, every `provided` cue has positive duration plus finite integrated LUFS plus a non-empty method, and all three required ambient cue IDs are `provided`, bundle-resolved, backed by existing OGG files, and represented in provenance.

**Step 2: Run the tests to verify RED**

Run:

```powershell
npm.cmd run test:vitest -- tests/audio_asset_provenance.test.ts tests/ui/audio_ambient_floor.test.ts --pool=forks --reporter=dot
```

Expected: FAIL because the inventory reports 54 blockers and the three required ambient binaries are missing.

**Step 3: Do not weaken existing placeholder behavior**

Keep the existing rule that optional missing cues fail softly. The new zero-blocker assertion applies to strict release blockers, not warnings for optional sensitivity-review placeholders.

### Task 2: Add deterministic first-party ambient generation

**Files:**
- Create: `tools/audio/generate_ambient_beds.mjs`
- Create: `tests/audio_ambient_generation.test.ts`
- Create: `src/ui/map/assets/audio/ambient/ambient_warroom.ogg`
- Create: `src/ui/map/assets/audio/ambient/ambient_field.ogg`
- Create: `src/ui/map/assets/audio/ambient/ambient_archive.ogg`

**Step 1: Write a failing generator test**

Test the exported recipe metadata and canonical PCM without invoking FFmpeg during ordinary Vitest runs: exactly three immutable cue IDs, 48 kHz mono output, duration no greater than 60 seconds, fixed seeds/recipes, per-cue deterministic PCM SHA-256, and no speech/music/weapon content tags. Test that generation rejects an unknown cue, each recipe declares a loop-safe periodic synthesis basis, digest drift is rejected, and encoder failure cannot overwrite an existing destination.

**Step 2: Run the generator test to verify RED**

```powershell
npm.cmd run test:vitest -- tests/audio_ambient_generation.test.ts --pool=forks --reporter=dot
```

Expected: FAIL because the generator module does not exist.

**Step 3: Implement the minimal deterministic generator**

Use fixed-seed random-phase spectral noise whose frequencies are integer multiples of the full loop period, making sample 0 and the loop boundary continuous. Give each surface a restrained spectral profile:

- Warroom: low interior room/HVAC texture, no signaling transients.
- Field: broad wind texture and low distant environmental rumble, no gunfire or bombardment.
- Archive: quiet room/paper-air texture, no speech or musical pitch foreground.

Render canonical mono PCM, wrap it in a temporary WAV, and invoke FFmpeg with explicit codec/sample-rate/channel/quality/bit-exact arguments. Encode into a generator-owned same-directory temporary root, validate a nonempty `OggS` payload, and publish the destination only after success. Cleanup is limited to that exact temporary root. The per-cue PCM SHA-256 is the canonical source hash; the checked-in OGG is the processed redistributable asset. OGG byte reproducibility is claimed only under the documented FFmpeg/FFprobe 8.1.2 full-build toolchain.

**Step 4: Generate the three assets and verify GREEN**

```powershell
node tools/audio/generate_ambient_beds.mjs --verify-toolchain
npm.cmd run test:vitest -- tests/audio_ambient_generation.test.ts --pool=forks --reporter=dot
```

Expected: three OGG files and a passing recipe contract.

### Task 3: Wire only the three required ambient beds

**Files:**
- Modify: `src/ui/map/audio/audioAssets.ts`
- Modify: `src/ui/map/audio/sound_manifest.ts`
- Test: `tests/ui/audio_manifest.test.ts`
- Test: `tests/ui/audio_ambient_floor.test.ts`

**Step 1: Verify the Task 1 tests remain RED for missing wiring**

Run the two tests after asset generation but before resolver edits. Expected: FAIL because the binaries are not bundle-resolved and cue status remains `missing_placeholder`.

**Step 2: Add minimal static wiring**

Add exactly three static imports and cue-map entries in `audioAssets.ts`. Mark only `ambient_warroom`, `ambient_field`, and `ambient_archive` as `provided` with `.ogg` paths in `sound_manifest.ts`. Preserve loop flags, volumes, first-gesture unlock, mute/master volume, and existing surface selection. Do not modify `audio_event_adapter.ts` unless a failing behavioral test proves routing is incomplete.

**Step 3: Verify the focused manifest behavior**

```powershell
npm.cmd run test:vitest -- tests/ui/audio_manifest.test.ts tests/ui/audio_ambient_floor.test.ts --pool=forks --reporter=dot
```

Expected: wiring assertions pass; provenance may remain RED until Task 4.

### Task 4: Measure all provided audio and close provenance

**Files:**
- Modify: `docs/audio/AUDIO_ASSET_PROVENANCE.json`
- Modify: `docs/audio/AMBIENT_BED_ASSET_MANIFEST.md`
- Create: `docs/audio/LICENSES/ambient_warroom.md`
- Create: `docs/audio/LICENSES/ambient_field.md`
- Create: `docs/audio/LICENSES/ambient_archive.md`
- Modify: `tests/audio_asset_provenance.test.ts`

**Step 1: Measure without changing the 17 existing UI binaries**

For every provided OGG, obtain duration via FFprobe and integrated loudness via FFmpeg `ebur128`. For UI cues shorter than 400 ms, repeat the cue content without silence to a deterministic 3.0-second analysis window (`-stream_loop -1 -t 3.0`) so EBU gating has valid blocks; reject the `-70.0` no-gated-block sentinel. Record the exact method/version string. Do not normalize or trim an existing UI cue unless measurement establishes a concrete defect; any byte change must preserve original hash and update processed hash and command.

**Step 2: Record first-party ambient lineage**

For each ambient bed record: checked-in generator recipe as source, AWWV project as author, `FIRST_PARTY` license, original/processed SHA-256, duration, integrated LUFS, measurement method, exact generation command, license-note path, `restrained_ambient` class, and `provided` disposition.

**Step 3: Update licensing and manifest documentation**

State that the three assets are original procedural recordings/syntheses created for AWWV, redistributable with the game, nonmusical, voice-free, and sensitivity-bounded. Document exact loop duration, format, measurement method, and regeneration command.

**Step 4: Verify GREEN and positive controls**

```powershell
npm.cmd run test:vitest -- tests/audio_asset_provenance.test.ts tests/ui/audio_ambient_floor.test.ts --pool=forks --reporter=dot
npx.cmd tsx tools/diagnostics/audio_asset_provenance.ts --strict
```

Expected: zero blocking violations. Then temporarily invalidate one processed hash and confirm the strict diagnostic fails; restore it and confirm zero blockers again.

### Task 5: Integrated verification and handoff

**Files:**
- Review all files changed since `9573e89a2be028cbf1438e3d4c9d294c3d8e80c5`
- Do not modify calibration, scenario, baseline, canon, roadmap, ledger, life-lessons, package-lock, or opening-screen files.

**Step 1: Run the complete focused audio matrix**

```powershell
npm.cmd run test:vitest -- tests/ui/audio_manifest.test.ts tests/ui/audio_bus.test.ts tests/ui/audio_event_adapter.test.ts tests/ui/audio_cue_observer.test.ts tests/ui/audio_hook_points.test.ts tests/ui/audio_preferences.test.ts tests/ui/settings_audio_preferences.test.ts tests/ui/audio_ambient_floor.test.ts tests/audio_asset_provenance.test.ts tests/audio_ambient_generation.test.ts --pool=forks --reporter=dot
npx.cmd tsx tools/diagnostics/audio_asset_provenance.ts --strict
npm.cmd run typecheck
npm.cmd run desktop:map:build
npm.cmd run desktop:release:check
git diff --check
```

**Step 2: Inspect the media mechanically**

Use FFprobe/FFmpeg to confirm mono 48 kHz OGG, duration at or below 60 seconds, finite EBU R128 loudness, no clipping, non-silence, and bounded loop-seam discontinuity. Confirm the production bundle contains all three hashed audio assets and makes no runtime network request for them.

**Step 3: Perform the listen handoff**

Expose the three local files for a human listen pass covering loop clicks, relative level, fatigue, semantic fit, and sensitive-content restraint. Do not claim this subjective gate passed solely from automated analysis.

**Step 4: Independent review**

Require separate spec/sensitivity review and code-quality/QA review. Resolve all Critical or Important findings before integration.

**Step 5: Commit the isolated packet**

```powershell
git add tools/audio/generate_ambient_beds.mjs tests/audio_ambient_generation.test.ts tests/audio_asset_provenance.test.ts tests/ui/audio_ambient_floor.test.ts src/ui/map/assets/audio/ambient src/ui/map/audio/audioAssets.ts src/ui/map/audio/sound_manifest.ts docs/audio/AUDIO_ASSET_PROVENANCE.json docs/audio/AMBIENT_BED_ASSET_MANIFEST.md docs/audio/LICENSES/ambient_warroom.md docs/audio/LICENSES/ambient_field.md docs/audio/LICENSES/ambient_archive.md docs/plans/2026-08-24-r7-audio-closeout-implementation-plan.md
git commit -m "feat(audio): close required ambient provenance"
```

Ledger, roadmap, and canon reconciliation remains a post-rebase integration action after Claude's dirty documentation lane lands.
