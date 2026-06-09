# Art Prompt Pack — §6 SENSITIVE QUEUE (Documentary Realism) — HELD FOR OWNER REVIEW

**Date:** 2026-06-09
**Status:** **HELD — NOT cleared for generation.** These eight prompts are §6 (sensitive camp/atrocity/enclave-fall/moral-decision content). They are authored as text ONLY and require **explicit owner + §6 sign-off** before any image is generated or wired. No images are produced by this document.
**Companion:** `docs/40_reports/proposals/20260609_ART_PROMPT_PACK_NON_SECTION6.md` — the 28 shared + 15 per-faction NON-§6 prompts. Those eight §6 subjects were *listed-only-and-deferred* there (its "§6 DEFERRED" section). This document authors the deferred eight to the same documentary-realism contract, but holds them behind the gate.
**Canon authority:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` (Tier 2 canon — above Rulebook, below Engine Invariants). Every prompt below is bound by it.
**How to use (after sign-off only):** Each block is fully self-contained and copy-paste-ready: subject, composition, mood, lighting, palette, dimensions, drop path, and negative prompt are inlined — identical workflow to the shipped presidential-desk cards. Do NOT paste any block into a generator until the §6 gate clears it.

---

# §6 DIGNITY GUARDRAILS — BINDING ON EVERY PROMPT BELOW

This is Srebrenica/Žepa/camp/atrocity-adjacent imagery for a serious historical and memorial work. The thesis is **tragedy and cost, not spectacle.** These are not negotiable.

1. **Documentary realism only.** The established art canon — desaturated war-correspondent photograph, fine film grain, period-accurate 1990s Balkans, institutional/archival light. The oil-paint / sepia direction is RETIRED. NO oil paint, NO impasto/brushstrokes, NO "classical war painting," NO Richter/Sargent painterly reference, NO sepia filter, NO concept art, NO heroic poster, NO video-game render, NO bright saturated colour, NO clean glossy stock photo.
2. **Victim-centered and dignified — NEVER glorifying, sensationalizing, gratuitous, or gore-focused.** No depiction that dishonors victims. No identifiable victims, no faces, no bodies, no graphic injury, no execution depicted, no blood. Favor **aftermath / absence / memorial framing** — empty spaces, abandoned belongings, a far anonymous column, the silence after, the weight of the event — over any act of violence. The camera looks at what was *left behind*, not at the act.
3. **No atrocity is a spectacle and no atrocity is a lever.** Per the Design Gate §1 Ring-3 refusals: the game depicts atrocity as a *consequence*, never an optimizable surface. The imagery must carry the same posture — sober record, never thrill. NO perpetrator glorification, NO paramilitary/irregular emblems (no skull/wolf/eagle patches), NO weapon hero-shots, NO triumphalism over a fallen enclave.
4. **ICTY-grounded factual basis; historical voice.** Settings, terrain, and period detail are grounded in the documented historical record (ICTY judgments first, then museum/primary B/C/S sources, then Balkan Battlegrounds). The register is that of an archival press photograph or a memorial — not commentary, not drama. (Gate §4 wording constraints — historical third-person, no euphemism, no minimization, no irony — are the prose analogue of this visual register.)
5. **The standard production guards, every prompt:** `no readable text` · `no legible flags or insignia` · `no modern electronics / computers / LCD screens` · people only distant / anonymous / from-behind / absent. Let the empty objects and spaces carry the meaning; never a semantic English label baked into the image.
6. **Baked-UI guard, every prompt.** The app draws all titles/body text in its own panel (event modals) or reserves a band (modal headers) — so these stills must NOT invent a fake caption strip, title bar, gradient overlay, app frame, watermark, or logo. The ONE decision-header prompt (8.7) reserves a calm lower-third band for app-rendered modal copy, exactly like the shipped `decision_header_*` strips; the seven event/codex stills are full-bleed with no baked text furniture.

**If any prompt below feels like it crosses from record into spectacle, it is wrong — stop and return it to the owner.** When in doubt, the Gate's answer is "no, not yet, bring it to the user."

---

# THE EIGHT DEFERRED §6 SUBJECTS

These are exactly the eight enumerated in the NON-§6 pack's "§6 DEFERRED — OWNER SIGN-OFF REQUIRED" section (cross-referenced against the authored exemplar event IDs in `docs/plans/2026-05-29-ring3-sensitive-event-authoring-plan.md` §0/§3.1 and the rupture roster in the Design Gate). None invented.

| # | Subject | Wired surface (event ID / family) | Asset kind |
|---|---|---|---|
| 8.1 | Detention camps — Omarska / Keraterm / Trnopolje | `concentration_camps_revealed_1992` (+ `prijedor_camps_complex_1992` candidate) | Event still 800×450 |
| 8.2 | Srebrenica fall, July 1995 | `srebrenica_falls_1995` (rupture `srebrenica_genocide_1995`) | Event still 800×450 |
| 8.3 | Žepa fall, 1995 | `zepa_falls_1995` | Event still 800×450 |
| 8.4 | Ahmići massacre, 1993 | `ahmici_massacre_1993` | Event still 800×450 |
| 8.5 | Markale market shelling | `markale_area_shelling_1993` / `markale_massacre_1994` / `second_markale_massacre_1995` | Event still 800×450 |
| 8.6 | Drina valley executions / ethnic cleansing | `drina_valley_ethnic_cleansing_1992` | Event still 800×450 |
| 8.7 | Enclave OVERRUN / CONTAIN decision header | presidential moral-choice header (never-fell-enclave overrun) | Modal header 1536×512 |
| 8.8 | Camp / atrocity codex essay header | the 13 unindexed deposit essays (Foča, Višegrad, Prijedor, Zvornik 1992, etc.) | Codex essay header 800×450 |

> **Resolver note.** Event stills resolve by bare basename through `resolveEventIllustration(event.image)` from `src/ui/map/assets/event_illustrations/` (NOT auto-faction-aware — see the NON-§6 pack's Proven-Style §4). The decision-header strip follows the shipped `decision_header_*` convention (`1536×512`, `src/ui/map/assets/presidential_desk/decision_headers/`). Codex essay headers reuse the 800×450 event-still format and live alongside the essay assets. **All eight are HELD; the drop paths below are the intended destinations once cleared.**

---

## 8.1 Detention camps revealed — `event_concentration_camps_revealed_1992.webp`

- **Drop path:** `src/ui/map/assets/event_illustrations/event_concentration_camps_revealed_1992.webp`
- **Dimensions:** 800×450 (16:9)
- **Wires to:** `concentration_camps_revealed_1992` event still / codex header (and the `prijedor_camps_complex_1992` candidate). ICTY basis: Tadić (IT-94-1), Stakić (IT-97-24), Kvočka (IT-98-30/1), Brđanin (IT-99-36).
- **§6 framing:** AFTERMATH / ABSENCE ONLY. No detainees, no abuse, no faces, no bodies. The horror is read through the *emptied place and its barriers* — never a person in distress. This is **not** a "camp subsystem" (Gate §1 Ring-3 #2); it is a single sober record of what was revealed.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_concentration_camps_revealed_1992.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: the silent exterior of a disused industrial compound in the Bosnian Krajina in 1992 — a long low corrugated-metal shed and a concrete yard behind a rusted chain-link and razor-wire perimeter fence, a shut sheet-metal gate, weeds pushing through cracked concrete, a single grey overcast sky, no people anywhere in frame. The fence and the closed gate carry the whole weight; the place is empty and the camera simply records that it existed. Restrained, factual, witnessing — the register of an archival war-correspondent photograph taken from outside the wire. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-brown-rust palette, restrained contrast, flat natural overcast light. No people, no detainees, no figures, no bodies, no readable text, no legible insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** detainees, prisoners, emaciated people, faces, bodies, violence, abuse, guards, weapons brandished, gore, blood, dramatic spectacle, sensational lighting, identifiable victims, readable text, legible insignia, flags, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, captions, watermark, logo, signature.

---

## 8.2 Srebrenica fall — `event_srebrenica_falls_1995.webp`

- **Drop path:** `src/ui/map/assets/event_illustrations/event_srebrenica_falls_1995.webp`
- **Dimensions:** 800×450 (16:9)
- **Wires to:** `srebrenica_falls_1995` event still / codex header (the one canonical rupture `srebrenica_genocide_1995`). ICTY/ICJ basis: Krstić (IT-98-33), Karadžić (IT-95-5/18), Mladić (IT-09-92), ICJ Bosnia v. Serbia (2007).
- **§6 framing:** ABSENCE AND THE EMPTY GROUND. The genocide is NOT depicted. The image is the void it left — abandoned belongings on a deserted assembly ground, the silence after the column has gone. No bodies, no executions, no perpetrators, no triumphalism. This is the single gravest event in the war; the imagery must be the most restrained in the pack.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_srebrenica_falls_1995.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: the emptied UN compound and assembly ground at the edge of Srebrenica/Potočari in July 1995, after the population has gone — a vast deserted concrete yard and a derelict factory hall, scattered abandoned belongings left where people once waited (a single shoe, a bundle, a child's coat on the ground, an overturned plastic chair), a far chain-link fence, low summer haze, utterly still and silent, no people anywhere in frame. The absence is the subject; the ground holds only what was left behind. Elegiac, grave, witnessing — a memorial stillness, not an event. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-green palette, restrained contrast, flat overcast summer light. No people, no soldiers, no bodies, no violence, no buses of deportation, no readable text, no legible insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** bodies, mass grave, execution, killing, soldiers herding people, perpetrators, weapons, gore, blood, identifiable victims, faces, deportation buses crowded with people, triumphant flag, victory, dramatic spectacle, sensational lighting, readable text, legible insignia, flags, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, captions, watermark, logo, signature.

---

## 8.3 Žepa fall — `event_zepa_falls_1995.webp`

- **Drop path:** `src/ui/map/assets/event_illustrations/event_zepa_falls_1995.webp`
- **Dimensions:** 800×450 (16:9)
- **Wires to:** `zepa_falls_1995` event still / codex header.
- **§6 framing:** THE EMPTIED MOUNTAIN ENCLAVE. Absence and displacement read at distance — the abandoned village in its valley, no violence, no faces. Žepa was a small mountain enclave; the imagery is the deserted place, not the fall as action.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_zepa_falls_1995.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a small emptied mountain village in a steep wooded Bosnian valley in the summer of 1995 — modest stone-and-timber houses with doors left open, a deserted track winding out of the valley, scattered abandoned household objects at a roadside (a handcart, bundles, a left-behind kettle), thin smoke from one cold hearth rising into a hazy ridge line, no people in frame. The enclave is emptied; the valley holds only the leaving. Quiet, sorrowful, witnessing — the texture of a place abandoned under duress, recorded from a distance. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-green forest palette, restrained contrast, natural light. No people in close-up, no soldiers, no bodies, no violence, no readable text, no legible insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** bodies, execution, killing, soldiers in action, perpetrators, weapons, gore, blood, identifiable victims, faces in close-up, triumphant flag, victory, dramatic spectacle, sensational lighting, readable text, legible insignia, flags, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, captions, watermark, logo, signature.

---

## 8.4 Ahmići massacre — `event_ahmici_massacre_1993.webp`

- **Drop path:** `src/ui/map/assets/event_illustrations/event_ahmici_massacre_1993.webp`
- **Dimensions:** 800×450 (16:9)
- **Wires to:** `ahmici_massacre_1993` event still / codex header. ICTY basis: Blaškić (IT-95-14), Kordić (IT-95-14/2), Kupreškić (IT-95-16).
- **§6 framing:** THE BURNED VILLAGE THE MORNING AFTER. Aftermath only — gutted houses and the toppled minaret of the Ahmići mosque (the documented, recognisable signature of this atrocity), no bodies, no people, no fire in progress. The ruin records what was done; the camera does not show the doing.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_ahmici_massacre_1993.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a small central-Bosnian village the morning after it was destroyed in 1993 — a row of burned-out, roofless stone-and-plaster houses with smoke-blackened window openings, the broken stump of a village mosque's minaret toppled among the rubble, scorched timber, cold ash and a thin haze of smoke still hanging over the lane, a grey overcast sky, no people anywhere in frame. The emptied, burned street is the whole record. Sober, still, grave — the aftermath witnessed, never the act. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-ash-brown palette, restrained contrast, flat natural light. No people, no bodies, no fire in progress, no perpetrators, no readable text, no legible insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** bodies, corpses, killing, soldiers, perpetrators, weapons, active flames in foreground, fire spectacle, gore, blood, identifiable victims, faces, dramatic explosion, sensational lighting, readable text, legible insignia, flags, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, captions, watermark, logo, signature.

---

## 8.5 Markale market shelling — `event_markale_shelling.webp`

- **Drop path:** `src/ui/map/assets/event_illustrations/event_markale_shelling.webp`
- **Dimensions:** 800×450 (16:9)
- **Wires to:** the Markale family — `markale_area_shelling_1993`, `markale_massacre_1994`, `second_markale_massacre_1995`. ICTY basis: Galić (IT-98-29) and D. Milošević (IT-98-29/1) Sarajevo siege case law. (Distinct from the NON-§6 generic besieged-city texture in the companion pack's 4.11, which does NOT depict Markale.)
- **§6 framing:** THE EMPTIED MARKETPLACE AFTER THE SHELL. Aftermath and absence — the deserted market square with the shell's impact scar and overturned stalls, no casualties, no bodies, no people. The "Sarajevo rose" impact mark in the pavement carries the documented signature without depicting a single victim.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_markale_shelling.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: an open-air city market square in besieged Sarajevo, deserted in the moments after a mortar shell has struck — overturned wooden market stalls and scattered produce on wet cobblestones, a dark star-shaped shell-impact scar gouged into the pavement (the documented "Sarajevo rose"), a few abandoned shopping bags, shrapnel-pocked shutters on the surrounding buildings, cold grey light, no people and no casualties anywhere in frame. The emptied square and the impact mark record the act without showing a single person harmed. Still, grave, witnessing. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey palette, restrained contrast, natural overcast light. No people, no bodies, no injured, no blood, no readable text, no legible insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** bodies, casualties, injured people, blood, gore, faces, crowds, the moment of explosion, dramatic blast in foreground, sensational lighting, identifiable victims, readable text, legible insignia, flags, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, captions, watermark, logo, signature.

---

## 8.6 Drina valley executions / ethnic cleansing — `event_drina_valley_ethnic_cleansing_1992.webp`

- **Drop path:** `src/ui/map/assets/event_illustrations/event_drina_valley_ethnic_cleansing_1992.webp`
- **Dimensions:** 800×450 (16:9)
- **Wires to:** `drina_valley_ethnic_cleansing_1992` (an informational-only event in the authored baseline). ICTY basis: Drina-municipalities case law (Lukić & Lukić IT-98-32/1, Vasiljević IT-98-32, Stanišić & Simatović IT-03-69, Karadžić municipality counts).
- **§6 framing:** THE EMPTIED RIVER VALLEY. Absence and depopulation along the Drina — abandoned riverside houses, a deserted bridge, the river itself, no executions, no bodies, no people. The "executions" dimension is NEVER depicted as an act (Gate §1 Ring-3 #1/#8); the still records the depopulated landscape the cleansing left behind.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_drina_valley_ethnic_cleansing_1992.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a wide, still view of a town along the Drina river valley in eastern Bosnia in 1992, emptied of its people — riverside houses with broken windows and open doors, a quiet stone or iron bridge spanning the green river, abandoned belongings at a deserted riverbank, mist over the wooded gorge, a leaden sky, no people anywhere in frame. The depopulated valley and the silent river carry the record; the camera looks only at the emptied place. Sober, elegiac, witnessing — a landscape that has lost its inhabitants. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-green river palette, restrained contrast, natural overcast light. No people, no bodies, no violence, no executions, no perpetrators, no readable text, no legible insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** bodies, corpses in the river, execution, killing, soldiers, perpetrators, weapons, gore, blood, identifiable victims, faces, dramatic spectacle, sensational lighting, readable text, legible insignia, flags, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, captions, watermark, logo, signature.

---

## 8.7 Enclave OVERRUN / CONTAIN decision header — `decision_header_enclave_overrun.webp`

- **Drop path:** `src/ui/map/assets/presidential_desk/decision_headers/decision_header_enclave_overrun.webp`
- **Dimensions:** 1536×512 (modal header strip)
- **Wires to:** the presidential moral-choice header for the never-fell-enclave OVERRUN vs CONTAIN decision (owner-authored, §6-gated; build pending owner + §6 sign-off). This is the gravest single decision header in the game.
- **§6 framing:** THE WEIGHT OF THE CHOICE, NOT THE DEED. This is the *desk before the order* — an operational map of a surrounded enclave under a lamp, the unmade decision rendered as the burden it is. It must NOT depict the act, glorify the assault, or frame overrun as a reward (Gate §1 Ring-3 #1/#5/#9). Reserve a calm dark lower-third band for the modal title/body, matching the shipped `decision_header_*` strips.
- **Prompt:** Generate a `1536 x 512` px modal header strip. Export final as `decision_header_enclave_overrun.webp` and later drop it in `src/ui/map/assets/presidential_desk/decision_headers/`. Scene: a darkened wartime command desk seen from above — an operational staff map showing a small surrounded enclave ringed in faded grease pencil, a single lamp throwing a cold pool of light across it, an unmoved field telephone handset resting beside the map, a closed folder, an ashtray, the long shadows of a decision not yet taken. The mood is dread and moral weight: an order that has not been given, a line on a map that means lives. No soldiers, no combat, no enclave depicted as a target reticle, nothing triumphant. Keep contrast restrained and leave a quiet dark band across the lower third so white/amber modal text remains legible. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-amber office palette, restrained contrast, low natural lamp light. No people, no soldiers, no weapons, no readable map labels, no legible insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** soldiers, combat, explosions, an enclave shown as a target or crosshair, assault imagery, triumphant tone, glorified command pose, bodies, gore, bright colour, readable map labels, legible insignia, flags, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face.

---

## 8.8 Camp / atrocity codex essay header — `codex_atrocity_essay_header.webp`

- **Drop path:** `src/ui/map/assets/event_illustrations/codex_atrocity_essay_header.webp` *(reuses the 800×450 still format; a shared, reusable header for the sensitive codex essays)*
- **Dimensions:** 800×450 (16:9)
- **Wires to:** the 13 unindexed deposit essays (Foča, Višegrad, Prijedor, Zvornik 1992, etc.) and any future atrocity codex header. Authoring the BCS prose + trigger events for these is itself SENSITIVE-GATED (see `docs/40_reports/20260529_PROVENANCE_GAP_INVESTIGATION.md` §3.5/§5.1) — this header is the *image* slot only, equally held.
- **§6 framing:** ARCHIVAL / DOCUMENTARY OBJECT, NOT A SCENE. A neutral, sober memorial-archive header that can sit above any of the sensitive codex essays without depicting any specific atrocity, victim, or perpetrator — an ICTY-register documentary still of *the record itself* (closed case files, an archival folder), not of an event. Deliberately generic and reverent so one header serves many essays without sensationalising any.
- **Prompt:** Generate a `800 x 450` px image. Export final as `codex_atrocity_essay_header.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a quiet archival still of a closed historical-tribunal case file on a plain table — a thick manila document folder tied with cord, a stack of aged typed pages with their text turned away and unreadable, a single cold overhead light, a neutral grey background, no people, no scene of any event. The object is the *record* of what happened, photographed soberly as in a museum or tribunal archive — the place where history is kept, not where it occurred. Restrained, reverent, documentary. Style: documentary archival photograph, 1990s register, desaturated colour, fine film grain, muted grey-brown palette, restrained contrast, flat even light. No people, no atrocity scene, no bodies, no violence, no readable text, no legible insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** any depicted atrocity, bodies, victims, perpetrators, soldiers, weapons, gore, blood, faces, a depicted scene of violence, dramatic spectacle, sensational lighting, readable text, legible case names, insignia, flags, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, captions, watermark, logo, signature.

---

# Summary

| # | Subject | Asset kind | Dimensions | §6 visual posture |
|---|---|---|---|---|
| 8.1 | Detention camps (Omarska/Keraterm/Trnopolje) | Event still | 800×450 | Empty compound seen from outside the wire — no detainees |
| 8.2 | Srebrenica fall | Event still | 800×450 | Emptied assembly ground, abandoned belongings — absence |
| 8.3 | Žepa fall | Event still | 800×450 | Emptied mountain village, the leaving — distance |
| 8.4 | Ahmići massacre | Event still | 800×450 | Burned village + toppled minaret the morning after — aftermath |
| 8.5 | Markale shelling | Event still | 800×450 | Deserted market + impact scar — no casualties |
| 8.6 | Drina valley executions | Event still | 800×450 | Depopulated river valley — emptied landscape |
| 8.7 | Enclave OVERRUN/CONTAIN decision | Modal header | 1536×512 | The desk before the order — weight, not deed |
| 8.8 | Camp/atrocity codex essay header | Codex header (still format) | 800×450 | Archival case file — the record, not the event |

**Eight prompts authored. Zero images generated.** Every prompt is documentary-realism (war-correspondent / archival photograph aesthetic), explicitly no oil-paint / no sepia / no dramatic-painting — matching the proven contract distilled in the companion NON-§6 pack's "Proven Style & Lessons" header and the shipped presidential-desk / command-card assets. Each is copy-paste standalone with subject, composition, mood, lighting, palette, dimensions, drop path, and negative prompt inlined. Every one is built on **aftermath / absence / memorial framing** — no victims, no faces, no bodies, no act of violence depicted — and is bound by `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`.

**No reference attachments are expected for any of these eight** (unlike the Category-1 peace-plan maps in the companion pack, which require an attached historical map). If the owner wishes to ground a specific still on a particular ICTY-published or museum reference photograph, note it at sign-off; otherwise these are generated from the text prompt alone.

**HELD. These prompts must NOT be pasted into any generator until the owner and the §6 sign-off chain (`/historian` + `/narrative-designer` + `/game-designer`, per Design Gate §6, with owner approval non-delegable for the enclave-overrun decision) explicitly clear them.**
