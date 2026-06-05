# Soundscape + High-Value Asset Substrate / Sourcing Packet

**Date:** 2026-06-05
**Lane:** Command-board P2 — "Soundscape and high-value assets" (controlling plan: `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 4)
**Type:** READ-ONLY PLANNING packet. No binary assets added; no engine/UI code edited.
**Aesthetic canon:** Documentary realism — somber, restrained, institutional. This is a tragedy, not an action game (`docs/plans/2026-05-24-gui-ai-asset-brief.md`).

---

## ⛔ GATED — OWNER APPROVAL REQUIRED

> **No public asset selection, download, generation, or commissioning may proceed on the strength of this packet alone.**
>
> This packet INVENTORIES needs, AUDITS existing substrate, and PROPOSES sourcing/licensing/manifest structure. It names sourcing *categories* (CC0 library / royalty-free marketplace / AI-generated / commissioned), NOT specific public picks. Every one of the following is GATED on explicit owner sign-off:
> - Choosing any specific public audio file, sound library, or sample pack.
> - Generating audio via any AI tool, or commissioning a composer/sound designer.
> - Importing any binary `.wav`/`.ogg`/`.mp3`/`.webp` into git.
> - Any asset whose content touches atrocity/camp/siege-casualty material (additionally **SENSITIVE / §6-gated** — see §6 below).
>
> Phase 4 stop gates (from the controlling plan): *"public asset choice without approval, license uncertainty, or generated/public marketing asset without user approval."* All three apply here.

---

## 1. Executive summary

The **audio substrate is already built and wired** (manifest, deterministic stub bus, event adapter, preferences, observer, composer brief). What is missing is **the audio binary assets themselves (0 of ~32 on disk)** and **one asset-resolution wiring decision** so the engine can load named slots when files arrive.

The **high-value visual substrate is effectively complete** for the presidential-desk flow: the desk background, 7 decision-family headers, 7 packet thumbnails, and 5 consequence stills are all on disk as `.webp` and imported through Rollup. The visual gap is narrow (optional era variants only).

**Top recommendation:** Treat this as a **placeholder-first, slot-stable** delivery. Keep the existing manifest as the single source of cue truth, resolve one packaging decision (Rollup URL-import vs `public/` copy step), then source audio in the priority order in §4 — **CC0/royalty-free library beds for UI + ambient, commissioned/AI-curated for the main theme and stingers** — all reviewed against the §6 sensitivity gate before any commit.

---

## 2. Needed-assets inventory (by category)

Counts below are the canonical slot counts the engine already references (audio: `sound_manifest.ts`; visuals: `presidentialDeskAssets.ts` + the GUI asset brief).

### 2A. Audio — 32 cue slots defined, 0 binaries on disk

| Category | Slots | Cue IDs (from `sound_manifest.ts`) | Notes |
|---|---:|---|---|
| **UI feedback (SFX)** | 18 | `ui_click`, `ui_hover`, `ui_open_panel`, `ui_close_panel`, `turn_advance`, `turn_complete`, `turn_review_open`, `battle_notification`, `battle_decisive`, `battle_catastrophic`, `operation_launched`, `operation_complete`, `event_notification`, `event_critical`, `peace_plan_offered`, `game_over`, `tutorial_objective_complete` | Dry, quiet, tactile. No bright game beeps (composer brief §UI). |
| **Ambient beds** | 3 | `ambient_peace_spring`, `ambient_war_winter`, `ambient_siege_distant` | Loopable, 60–120 s. Composer brief requests **4–6** beds (diplomatic table, late-war exhaustion, Dayton aftermath are briefed but not yet slotted — see gap note). |
| **Music** | 6 | `menu_theme`, `peace_phase`, `war_phase`, `tension`, `victory`, `defeat` | Main theme = `menu_theme`. Solemn/unresolved; no triumphant cadence. |
| **Stingers** | 2 | `stinger_dayton_ceasefire`, `stinger_campaign_verdict` | Brief requests **3–5** (major escalation, peace-plan-offered, severe humanitarian warning briefed but not slotted). |
| **Total** | **32** | | Manifest is the source of truth; brief asks for a few more beds/stingers. |

**Gap between composer brief and current manifest (additive, low-risk):**
- Ambient: brief requests `diplomatic_table`, `late_war_exhaustion`, `dayton_aftermath` beds — not yet registered.
- Stingers: brief requests `major_escalation`, `humanitarian_warning` — not yet registered.
- These are **manifest-only additions** (no binaries) and can be slotted in the same wiring pass; flagged here, not done in this read-only packet.

### 2B. High-value visuals — present vs needed

| Slot family | Spec dims | On disk? | Path |
|---|---|:--:|---|
| Presidential desk background (1992) | 2752×1536 | ✅ | `src/ui/warroom/assets/hq_presidential_desk_1992.webp` |
| Decision-family headers | 1536×512 | ✅ 7/7 | `src/ui/map/assets/presidential_desk/decision_headers/*.webp` (diplomacy, military_staff, intelligence, humanitarian_convoy, personnel, paramilitary, counter_offer) |
| Packet thumbnails | 640×480 | ✅ 7/7 | `src/ui/map/assets/presidential_desk/packet_thumbnails/*.webp` |
| Consequence stills | 1280×720 | ✅ 5/5 | `src/ui/map/assets/presidential_desk/consequence_stills/*.webp` |
| HQ room plates (all factions, 1991–1995) | 2752×1536 | ✅ | `src/ui/warroom/assets/hq_{rbih,rs,hrhb}_199x.webp` |
| Faction crests / flags | — | ✅ | `src/ui/warroom/assets/crest_*.webp`, `flag_*.webp` |

**Optional / not-yet-present visuals (all GATED, low priority):**
- Desk background era variants `hq_presidential_desk_{1993,1994,1995}.webp` (brief lists as optional).
- Any consequence still / header for new decision families if they ship later.
- No "high-value visual beyond the 20 decision cards" is *required* by Phase 4; the 20 are done. Treat further visuals as enhancement, not substrate.

---

## 3. Existing-substrate audit (what is already wired)

| Substrate piece | File | State |
|---|---|---|
| Cue catalog / registry | `src/ui/map/audio/sound_manifest.ts` | **Complete.** 32 cues with id, category, defaultVolume, cooldownMs, assetStatus (`missing_placeholder`), reducedMotionPolicy, optional filePath. Typed, sorted, deterministic. |
| Audio bus | `src/ui/map/audio/audio_engine.ts` | **Complete stub.** `playCue/playSFX/playMusic/setEnabled/setVolume/mute`. Disabled+muted by default. **No network, no `Date.now`, no `Math.random`** — determinism-safe. Cooldown via caller-supplied `nowMs`. Missing assets degrade silently (cue accepted, nothing decoded). |
| Event → cue adapter | `src/ui/map/audio/audio_event_adapter.ts` | **Complete + pure.** Maps turn-complete, battle (decisive/reported), historical-event-fired, operation-complete to cue IDs. Dedup by stable `key`. `strictCompare` sorted. Only emits for registered cues. |
| Preferences (persist) | `src/ui/map/audio/audio_preferences.ts` | **Complete.** localStorage `awwv.audio.preferences.v1`; default **muted**, master 0.5; best-effort, fails safe. |
| Cue observer | `src/ui/map/components/AudioCueObserver.tsx` | Present (UI hook surface). |
| Hook points | `PeacePlanModal.tsx`, `warroom/AdvanceTurnModal.tsx` | Call sites present (no-op when disabled). |
| Composer brief | `docs/audio/2026-05-17-awwv-composer-brief.md` | **Complete + sendable.** Main theme, 4–6 ambient beds, UI set, 3–5 stingers, hard sensitive-history constraints, delivery format (WAV 48k/24-bit masters + OGG/MP3 previews + stems). |

**Substrate gaps (the real missing pieces):**
1. **Zero binary audio files** anywhere in the repo (`git ls-files` for `*.mp3/ogg/wav/flac/m4a/aac` = 0). Every cue's `filePath` is a placeholder string.
2. **No asset-resolution wiring.** Manifest paths are bare strings like `'audio/ui_click.mp3'`. The tactical-map build sets **`publicDir: false`** and **`copyPublicDir: false`** (`src/ui/map/vite.config.ts`), and the visuals deliberately use Rollup `import x from '*.webp'` to get hashed, bundle-safe URLs. **Bare manifest strings will NOT resolve at runtime** under this config. A decision is required (see §5).
3. **Brief↔manifest delta** (3 ambient beds + 2 stingers briefed but not slotted) — see §2A.

---

## 4. Sourcing plan (by category — categories named, NOT specific picks)

Priority follows "minimum useful first delivery" thinking: get the game audibly alive cheaply, reserve bespoke spend for the identity-defining pieces.

### Priority 1 — UI feedback set (18 cues)
- **Recommended source category:** **CC0 / public-domain UI SFX libraries** (the category of CC0 game-audio collections) or a single small **royalty-free UI pack**. Short, generic, non-narrative — lowest sensitivity, lowest cost.
- **Why:** 18 dry/quiet/tactile clicks and confirms do not need bespoke composition. Restraint per the brief ("avoid bright game-like beeps") is a *selection/EQ* problem, not a *commission* problem.
- **Licensing:** Prefer **CC0** (no attribution burden, clean redistribution in a packaged Electron app). If royalty-free, confirm the license permits **redistribution inside a distributed/sold desktop binary** (many "free" licenses forbid this) and **retain the license text** in `docs/audio/LICENSES/`.

### Priority 2 — Ambient beds (3 slotted, up to 6 briefed)
- **Recommended source category:** **CC0/royalty-free field-recording + drone libraries** for room tone, wind, distant low-frequency pressure; or **AI-generated ambience** reviewed by a human. Bespoke composition optional here.
- **Why:** Siege/front/peace beds are texture, not melody. Field recordings carry documentary authenticity that matches canon.
- **Sensitivity:** `ambient_siege_distant` and `ambient_war_winter` must be **distant pressure, not action-film impacts** (brief: "never action-film intensity"). **No realistic screams / suffering vocals** (brief hard constraint). Flag for §6 review.

### Priority 3 — Main theme + music states (6 cues)
- **Recommended source category:** **Commissioned composer** (preferred for identity) OR **AI-generated then human-curated**, governed entirely by the existing composer brief.
- **Why:** `menu_theme` is the campaign's sonic identity — solemn, tense, unresolved, no triumphant cadence. The one place bespoke spend is justified.
- **Licensing:** If commissioned, secure a **buyout / work-for-hire or perpetual game-use license** with redistribution rights. If AI-generated, confirm the tool's terms permit **commercial redistribution** and that **no training-data attribution claims** encumber the output. **No national anthems, no folk quotations readable as factional endorsement** (brief hard constraint).

### Priority 4 — Stingers (2 slotted, up to 5 briefed)
- **Recommended source category:** Same as music — **commissioned or AI-curated**, short (2–8 s), gravity-marking not reward.
- **Sensitivity:** `stinger_dayton_ceasefire` is the one place the brief reserves the **first clear human voice** — that choice is **GATED + §6** (see §6). A `humanitarian_warning` stinger must mark gravity, never sensationalize.

### Cross-cutting licensing rules (apply to every category)
1. **Redistribution-in-a-distributed-binary** is the load-bearing license question (this ships as a sold/distributed Electron app, not a website). CC0 is safest; verify every non-CC0 license explicitly allows it.
2. **No attribution-only licenses without an attribution surface** — if a CC-BY asset is chosen, an in-app credits screen must exist first.
3. **Keep generation/source masters out of git** (per the visual asset-intake contract): commit only final compressed `.ogg`/`.mp3` deliverables; keep raw WAV masters / AI prompts / source packs in an external art/audio store.
4. **Record provenance + license per asset** in `docs/audio/LICENSES/<cue_id>.md` (proposed) before any binary is committed.

---

## 5. Proposed asset-manifest slot structure (placeholder-first)

The manifest already IS a slot registry. The placeholder-first contract is therefore **"keep slots stable, fill binaries later, resolve one packaging decision"** — no schema churn.

### 5A. Slot stability contract (already satisfied)
- Cue IDs in `sound_manifest.ts` are the **stable public contract**. Engine call sites reference IDs, never file paths. New assets fill existing slots without touching call sites. ✅ already true.
- `assetStatus: 'missing_placeholder' | 'provided'` already encodes the placeholder-first lifecycle. Flip to `'provided'` per cue as binaries land. ✅ already present.
- Missing-asset behavior is **silent accept** (bus records the cue, decodes nothing). ✅ already true — no crash when a slot is empty.

### 5B. The one wiring decision required before any binary works (engineering gate, not owner)
The manifest's bare strings (`'audio/ui_click.mp3'`) do not resolve under `publicDir:false` + `copyPublicDir:false`. Two options:

- **Option A (recommended — mirror the visuals):** Resolve audio via **Rollup URL imports**, exactly like `presidentialDeskAssets.ts` does for `.webp`. Add an `audioAssets.ts` that `import beep from '../assets/audio/ui_click.ogg'` and maps cue ID → hashed URL; the bus reads from that map. Pros: hashed, cache-safe, bundle-verified at build, identical to the proven visual pattern. Cons: every asset must exist at build time (placeholder silence handles the not-yet-there case via the existing `assetStatus` guard).
- **Option B:** Re-enable a **copied `public/audio/` dir** for the map build (`copyPublicDir:true` + `publicDir`). Pros: bare-string paths "just work," assets swap without rebuild. Cons: diverges from the visual pattern, no content hashing, must verify it survives the Electron `desktop:map:build` copy.

> **Recommendation: Option A.** It matches the already-proven `.webp` pipeline and keeps one asset-handling mental model. This is a small engineering wiring task for the Phase-4 owner (asset-integration), **not** part of this read-only packet.

### 5C. Proposed on-disk layout (final, compressed only)
```
src/ui/map/assets/audio/
  ui/            ui_click.ogg, ui_hover.ogg, ...            (18 UI cues)
  ambient/       peace_spring.ogg, war_winter.ogg, ...      (3–6 beds, loop-safe)
  music/         menu.ogg, war.ogg, ...                     (6 states)
  stingers/      dayton_ceasefire.ogg, campaign_verdict.ogg (2–5 stingers)
docs/audio/LICENSES/<cue_id>.md                              (provenance + license, per asset)
```
- Use **`.ogg`** as the committed delivery format (open, well-compressed, Chromium/Electron-native). Keep **WAV masters external** per the no-raw-sources-in-git rule.
- Filenames should match the manifest's existing `filePath` stems so the wiring map is mechanical.

---

## 6. SENSITIVE / §6-gated audio (atrocity-adjacency flags)

The documentary-realism canon and the composer brief's hard constraints converge here. Flag for sensitivity review **before** sourcing, never after:

| Cue / asset | Risk | Required handling |
|---|---|---|
| `ambient_siege_distant`, `ambient_war_winter` | Could drift into action-film impacts / "exciting" combat ambience | Distant pressure only; no foreground explosions; **no screams or suffering vocals**. §6 review of any candidate. |
| `battle_decisive`, `battle_catastrophic`, `event_critical`, `game_over` | Risk of rewarding/sensationalizing mass-casualty or atrocity outcomes | Mark **gravity, not reward** (brief). A "catastrophic"/atrocity outcome must never sound like a win — no fanfare, no sting that reads as triumph. |
| `stinger_dayton_ceasefire` (first human voice) | Brief reserves the first clear human voice for ceasefire; any voice content is identity-sensitive | **GATED + §6.** Human voice only with explicit owner approval; no language/accent choice that reads as factional endorsement. |
| Any music | National anthems / folk quotations | **Hard ban** (brief). No melody traceable to a national anthem or factional folk song. §6 review of theme + stingers. |
| Future atrocity-event stings (e.g. camp/Srebrenica-adjacent events) | Direct atrocity content | **SENSITIVE-GATED** like the uninstantiated deposit essays (camp/atrocity prose is sensitive-gated in this repo). Do **not** author atrocity-specific audio stings without explicit owner + canon sign-off. |

**General rule:** audio that would make suffering into spectacle is out of canon. When in doubt, the cue stays a silent placeholder.

---

## 7. Recommended next actions (for the Phase-4 owner — all post-approval)

1. **(Owner gate)** Approve sourcing categories in §4 and the §6 sensitivity posture. Nothing below proceeds without this.
2. **(Engineering, no assets)** Land the §5B Option-A wiring (`audioAssets.ts` URL-import map + bus read-through) and slot the 5 briefed-but-unregistered cues (3 ambient beds, 2 stingers) into the manifest. Determinism-safe, no binaries.
3. **(Sourcing, gated)** Acquire **Priority 1 UI set** from CC0 first (cheapest, lowest sensitivity) → integration-test the live pipeline end-to-end with real files.
4. **(Sourcing, gated)** Acquire Priority 2 ambient beds; §6-review siege/winter beds.
5. **(Sourcing, gated)** Commission/curate Priority 3 main theme + Priority 4 stingers per the composer brief; §6-review every voice/melody choice.
6. **(Provenance)** For each committed binary, add `docs/audio/LICENSES/<cue_id>.md` and confirm redistribution-in-binary rights before `git add`.
7. **(Verify)** Run Phase-4 verification each step: `npm run typecheck`, `npm run desktop:map:build`, `git diff --check`.

---

## Appendix — evidence

- Controlling plan: `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` §"Phase 4 - Soundscape And High-Value Assets".
- Source plans: `docs/plans/2026-05-17-soundscape-integration-plan.md`, `docs/plans/2026-05-17-soundscape-kickoff-audio-stub-plan.md`.
- Visual canon: `docs/plans/2026-05-24-gui-ai-asset-brief.md`.
- Composer brief: `docs/audio/2026-05-17-awwv-composer-brief.md`.
- Audio substrate: `src/ui/map/audio/{sound_manifest,audio_engine,audio_event_adapter,audio_preferences}.ts`, `src/ui/map/components/AudioCueObserver.tsx`.
- Packaging constraint: `src/ui/map/vite.config.ts` (`publicDir: false`, `copyPublicDir: false`).
- Visual import pattern reference: `src/ui/map/data/presidentialDeskAssets.ts`.
- Binary-audio scan: `git ls-files | grep -iE '\.(mp3|ogg|wav|flac|m4a|aac)$'` → **0 results**.
