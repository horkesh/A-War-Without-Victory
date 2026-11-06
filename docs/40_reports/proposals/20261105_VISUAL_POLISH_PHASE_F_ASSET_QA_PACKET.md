# Visual polish Phase F — asset QA decision packet (2026-11-05)

**Packet:** [2026-11-05-visual-polish-art-direction-plan.md](../../plans/2026-11-05-visual-polish-art-direction-plan.md), Phase F.
**Branch:** `claude/visual-polish-phase-f`, stacked on E (PR #529) → D (#528) → B (#527) → C (#526) → A (#525).
**Scope:** a decision packet for the owner. No asset is replaced, generated or edited by Claude; the owner generates all images externally (plan §3). The only repository changes in this phase are documents: this packet, a provenance note beside the officer source photographs, a stale README corrected, and the plan, ledger and GUI master entries.

## 1. What was inspected

Every raster plate the map client and the Warroom ship, viewed at native or contact-sheet scale, plus the six officer source photographs by metadata only (they are not viewed or reproduced here):

| Family | Plates | Native size | Viewed how |
|---|---|---|---|
| Warroom HQ rooms (3 factions × 1991–1995) + presidential desk | 16 | 2752×1536 | each at native scale |
| Tutorial deck | 8 | 600×400 | each at native scale |
| Command cards (`act_*`, `cat_*`) | 38 | 1280×720 / 1024×768 | contact sheets, 640 px tiles |
| Event stills + codex header | 30 | 800×450 | contact sheets |
| Decision headers | 7 | 1536×512 | contact sheets |
| Consequence stills | 5 | 1280×720 | contact sheets |
| Packet thumbnails | 7 | 640×480 | contact sheets |
| Opening (portal, monitoring room, splash) | 3 | 2048×1152 / 2752×1536 | contact sheets |
| Peace-plan stills | 4 | 600×400 | contact sheets |
| Verdict backgrounds | 3 | 1920×1080 | contact sheets |
| Crests, flags, props (paperclip, stamp) | 11 | 1024×1024 / 1536×1024 / 640×640 | contact sheets |

Contact sheets and their index: `F:/AWWV-worktrees/_logs/visual-polish/F/sheets/` (not committed; 21 sheets, `INDEX.txt` maps each tile to its file).

## 2. Verdict

The art holds. Of 132 plates, **one must be regenerated** (the second tutorial slide is covered edge to edge in pseudo-glyph scrawl), **five should be** (the RBiH room's newspaper masthead is a different garble in every year, where the RS and HRHB rooms carry legible real mastheads), and the rest is a cosmetic tail that can wait for a convenient regeneration round. Nothing in this packet blocks the Phase A–E pull-request chain. One item (D8) asks the §6 chain for a confirmation before PR #526 merges, because Phase C put an already-approved atrocity still on a second surface.

## 3. Decisions for the owner

Each row has a recommendation and the default that applies if the owner records no answer. Answers go in the plan's §11.

| # | Decision | Finding | Recommendation | Default if unanswered |
|---|---|---|---|---|
| D1 | `tutorial_02_map.webp` | The map and its entire paper margin are dense pseudo-text; legible as nonsense at any size. The other seven slides are sound (07 and 08 carry ledger tables whose figures are pseudo-text but read as tables). | **Regenerate** from brief §5.1. | Regenerate. |
| D2 | RBiH newspaper masthead, `hq_rbih_1991…1995.webp` | The folded paper on the RBiH desk shows a different near-word each year ("NEZAVISNI" in 1992, garbles elsewhere). The RS desk reads "Глас Српске" and the HRHB desk "Hrvatski vojnik"; the RBiH room is the only one whose paper is not a paper. The real Sarajevo daily is *Oslobođenje*, which the command cards already use legibly (`act_authorize_op_RBiH`, `act_replace_commander_RBiH`). | **Regenerate the fold region only** (in-paint), five plates, brief §5.2. Room geometry must not move: `hq_rbih_regions.json` and the measured cork box depend on it. | Accept at distance; revisit in the next art round. |
| D3 | `hq_rs_1993.webp` (named in the plan) | On inspection the RS masthead is legible on every year; only the subhead and desk papers are pseudo-text, and at small size. The visible issue is historical, not visual: the Banja Luka daily was *Glas* until 1992, *Glas srpski* 1992–2003, and *Glas Srpske* only from 2003. | **Historian to confirm**; if any RS fold is ever regenerated, the masthead reads "Глас српски" (brief §5.3). No regeneration on its own account. | Accept; record the Historian note. |
| D4 | HRHB corkboard plate (roadmap §10 backlog, 2026-09-05, audit finding 27) | The backlog line describes the control map floating small on the HRHB cork. WR01 (#515–#517) now sizes the sheet from the **measured** cork box per faction (`corkBox()` in `warroomCorkSheet.ts`), not the click rectangle that was 15% narrow and 35% short for HRHB. The residual is physical: the HRHB cork is a smaller board than the RBiH one, so the map is smaller in that room. | **Close the backlog line as superseded by WR01.** No plate regeneration. | Close. |
| D5 | Officer source photographs, `src/ui/map/assets/officers/source/*.jpg` (6) | Real photographs of six real people, added in `a1f585514` as references for stylised portraits. They are not imported anywhere, so Vite does not bundle them; they are not in any build. The commit records "Wikimedia Commons/Wikipedia" with no per-file licence; Blaškić is 120×130 and unusable. The portrait feature (`VISUAL_ASSET_STRATEGY.md` §9: stylised, not photographic, "avoids likeness issues with living persons") is not built. Plan §8: no real-person photograph is introduced. | **Keep as reference only, with a provenance note** (added this phase: `PROVENANCE.md` beside them, recording what is known and that they never ship). When the portrait lane opens: record licence and URL per file before use, generate stylised portraits per strategy §9, then delete the sources. If the owner prefers a clean tree now, delete them; `git` history keeps them. | Keep with the provenance note. |
| D6 | 1991 room plates, all three factions | The RBiH 1991 room flies the lily flag (adopted May 1992) and hangs an ARBiH-patched uniform (ARBiH formed April 1992); the RS 1991 room flies the RS tricolour (RS proclaimed January 1992); the HRHB 1991 room is plausible (HRHB proclaimed November 1991). The 1991 plate is the pre-war room. | **Historian to decide** whether the 1991 rooms show the institutions as they were (SR BiH flag, TO or JNA uniform) or the faction as it already imagines itself. Default is the latter: it is the player's faction room, and the plates are otherwise excellent. | Accept as the faction's own room; record the note. |
| D7 | Tutorial deck and peace-plan stills at 600×400 | Both families are the smallest plates in the set and are upscaled on a 1920 display (the deck in the onboarding overlay, the plans in the peace-plan modal). The resolvers (`tutorialDeckArt.ts`, `peacePlanArt.ts`) resolve by basename and accept any size. | **Re-export at 1200×800** from the originals if the owner still has them; otherwise regenerate the tutorial deck in the same scenes at 1200×800 when D1 is done. Plans can wait. | Accept the resolution; re-export opportunistically. |
| D8 | §6 stills in the decision-modal header (Phase C, PR #526) | The June 2026 §6 chain approved placement ([20260610_SECTION6_ART_SIGNOFF.md](../governance/20260610_SECTION6_ART_SIGNOFF.md)) and #410 approved wiring the `image` keys for the `EventModal`. Phase C renders an event's authored still a second time, as the `DecisionModalImageHeader` of `EventDecisionModal`, when that event requires a decision. Same event, same still, one more surface. Plan §8 allows event art on its own event and forbids it as decoration elsewhere; this is its own event. | **Answered 2026-11-06: all three seats CONFIRM**, each with a condition ([panel record](../governance/20261106_SECTION6_D8_DECISION_HEADER_PANEL.md)). Applied in #526: a §6 still carries a factual alt (EN and BCS) and the eyebrow drops the faction colour for the neutral accent. Held enclave images and the "deny" cohesion balance are recorded for separate work. | Closed. |

## 4. Cosmetic tail (recorded, no decision needed)

- **Command-card aspect.** `act_*` cards are 16:9 (1280×720) and `cat_*` cards 4:3 (1024×768); `CommandCard.tsx` shows both in a 4:3 frame with `object-cover`, so the action cards lose their left and right edges. Nothing important sits there today. Re-export `act_*` at 4:3 only if a card ever crops badly.
- **Decision headers.** `decision_header_intelligence` has pseudo-glyph captions under its reconnaissance photographs; `decision_header_personnel` and `decision_header_paramilitary` carry pseudo-text bodies. All small at modal width. Regenerate with the next round.
- **Consequence stills.** `consequence_humanitarian_access` and `consequence_reserve_deployment` show form grids that their own briefs forbade ("no manifest table, no checklist grid"). They read as paperwork and do no harm.
- **`stamp_secret.webp` reads "STROGO POVERLJIVO"**, the ekavian spelling. Right on an RS document, Serbian on an RBiH or HRHB one ("STROGO POVJERLJIVO"). The asset is exported from `factionAssets.ts` and used nowhere today; if it is ever placed on faction paper, it needs a per-faction spelling.
- **Masthead casing.** "Hrvatski vojnik" (1991, 1992) versus "Hrvatski Vojnik" (1993–1995). Trivial.
- **Decay continuity** between years is deliberate and good: cracks and water stains in the RBiH walls, a cracked RS cork and faded RS flag in 1995, a sooted HRHB ceiling in 1995. The RBiH jacket lightens between 1993 and 1994; accept.
- **`src/ui/map/assets/event_illustrations/README.md`** said the directory was intentionally empty and every shipped event rendered text-only. Thirty stills have shipped since June and twenty-five events author an `image`. Corrected in this phase.
- **Opening portal** is 2048×1152 where its siblings are 2752×1536; it is a map, not a room, and reads fine.

## 5. Generation briefs (in the voice of the existing asset briefs)

### 5.1 Tutorial slide 02 — the map

> Generate a `1200 x 800` px image. Export final as `tutorial_02_map.webp` and later drop it in `src/ui/map/assets/tutorial/`. Scene: a 1:200,000 topographic map of central Bosnia and Herzegovina spread flat on a dark wooden staff desk, seen from above at a slight angle, with a second sheet overlapping at the right. A front line drawn in red grease pencil crosses both sheets; a few blue pencil arrows and three small paper counters sit on the map. Contour shading, rivers and road lines are visible but **no place names, no legends, no grid numbers and no marginal notes are legible**: the map's text must be out of focus or too small to read, and the paper margins are clean. A desk lamp lights the map from the upper left; the rest of the desk is in shadow. Documentary realism, muted olive, ochre and slate tones, no people, no hands, no modern electronics. Match the lighting and palette of `tutorial_04_inspect.webp`.

Negative prompt:

> readable text, place names, map legend, grid numbers, handwriting, scrawl, pseudo-text, dense annotation, margin notes, symbols, watermark, logo, signature, people, hands, modern devices, screens, bright colours, fantasy map, sepia filter, oil paint

### 5.2 RBiH desk newspaper fold (in-paint, five plates)

> Edit `hq_rbih_1991.webp` (then 1992, 1993, 1994, 1995) in place, changing **only** the folded newspaper on the left of the desk. The room, desk, lamp, flag, corkboard, whiteboard and every other object stay pixel-identical: the hotspot geometry in `hq_rbih_regions.json` and the measured corkboard box depend on them. The paper is a folded Sarajevo daily whose masthead reads exactly **Oslobođenje** in a bold black serif, as on `act_replace_commander_RBiH.webp`; the headline and columns beneath are out of focus and unreadable. Keep the paper's existing position, fold, lighting and paper tone. Export at 2752 × 1536, WebP, same filename.

Negative prompt:

> readable headline, readable columns, pseudo-text, changed desk layout, moved objects, altered lighting, new props, logo, watermark

### 5.3 RS desk newspaper fold (only if an RS plate is ever regenerated)

> Same procedure as 5.2 on `hq_rs_<year>.webp`. The masthead reads exactly **Глас српски** (the paper's 1992–2003 name), red on white as on the existing plate; subhead and columns unreadable. Nothing else in the room changes.

### 5.4 Two decision headers Phase C found missing

Phase C maps event categories to existing header plates; economic events borrow the intelligence plate and territorial events borrow the military-staff plate. Two dedicated plates would close the gap. Both follow the existing header brief's rules (1536 × 512, dark quiet band for modal copy, no readable text, no people).

> Generate a `1536 x 512` px modal header strip. Export final as `decision_header_economic.webp` and later drop it in `src/ui/map/assets/presidential_desk/decision_headers/`. Scene: a ministry desk under a cold fluorescent tube, a ration ledger open beside a stack of blank coupon sheets, a mechanical adding machine, a cup of cold coffee, an unlabeled fuel can on the floor at the edge of frame, 1990s wartime bureaucracy, desaturated documentary realism, no people, no readable text, no numbers. Leave the left third visually quiet for the modal title.

> Generate a `1536 x 512` px modal header strip. Export final as `decision_header_territorial.webp` and later drop it in `src/ui/map/assets/presidential_desk/decision_headers/`. Scene: a municipal boundary map pinned flat with four brass pins, a red grease-pencil line redrawn twice across it, a wooden ruler, a folded road map beneath, late-afternoon window light, 1990s staff-office realism, no people, no readable place names, no legend. Keep the lower third dark and calm for modal copy.

Negative prompt for both:

> readable text, numbers, labels, legend, place names, people, soldiers, weapons, flags, insignia, UI overlay, black panel, watermark, bright colours, modern computer

### 5.5 Optional: the intelligence header

> Regenerate `decision_header_intelligence.webp` from its existing brief (asset brief §"Intelligence Brief Header"), adding to the negative prompt: "captions, typed labels under photographs, pseudo-text, glyphs". The current plate's photograph captions read as invented script at modal width.

## 6. What this phase changed in the repository

- This packet.
- `src/ui/map/assets/officers/source/PROVENANCE.md`: what is known about the six photographs, that they are reference only and never imported, and what must be recorded before any use.
- `src/ui/map/assets/event_illustrations/README.md`: no longer claims the directory is empty; points at the §6 sign-off and wiring records.
- Plan §11, `docs/PROJECT_LEDGER.md`, `GUI_MASTER.md` "Recent GUI changes".
- `COMMAND_BOARD.md` is **not** edited: it stands at 19,735 of its 20,000-character guard, and the R7 row already links this packet. The roadmap R7 row text does not change.

## 7. Not done

- No asset was generated, replaced or edited. D1–D7 are the owner's; D8 is the §6 chain's.
- The officer photographs' licences are not verified; the provenance note says so rather than guessing.
- Contact sheets are evidence under `_logs`, not committed.
