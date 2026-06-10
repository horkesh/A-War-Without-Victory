# §6 Sensitive-History Art — Sign-Off Record

**Date:** 2026-06-10
**Gate:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §6 (atrocity event content → `/historian` + `/narrative-designer`; `/game-designer` added for the Ring-3 boundary check, per the §6 art-pack chain).
**Scope:** the 7 NON-enclave §6 documentary stills authored in `docs/40_reports/proposals/20260609_ART_PROMPT_PACK_SECTION6.md` (8.1–8.6 + 8.8). Owner-delivered, dignity-QC'd, then formally reviewed by the three-party chain.
**Owner authorization:** owner directed the sign-off chain to run and to place the cleared assets inert on green (2026-06-10). Owner approval remains **non-delegable** for the enclave-overrun decision branch (8.7/8.9/8.10) — those are **NOT** in scope here and stay HELD.

---

## Outcome

**All 7 reviewed stills: APPROVED-WITH-NOTES by all three reviewers. No rejections.**

- **7 placed inert** (the conditional and the recommended refinement are now resolved — see Update below): `event_concentration_camps_revealed_1992`, `event_srebrenica_falls_1995`, `event_zepa_falls_1995`, `event_markale_shelling`, `event_drina_valley_ethnic_cleansing_1992`, `codex_atrocity_essay_header`, `event_ahmici_massacre_1993`.

### Update 2026-06-10 (regens) — `/historian` conditional CLEARED

Owner regenerated the two `/historian`-flagged stills; both re-QC'd (dignity guards held) and placed:
- **8.4 `event_ahmici_massacre_1993` — conditional CLEARED + placed.** The regen renders an unmistakable felled minaret — slender white shaft, decorated şerefe balcony ring, conical cap, lying intact across the rubble with the broken base stump on the gutted mosque. This satisfies the historian's "minaret-legibility carried forward" condition; the documented religious-targeting signature (Blaškić IT-95-14 / Kordić IT-95-14/2 / Kupreškić IT-95-16) now reads correctly. Moved from HELD → placed.
- **8.5 `event_markale_shelling` — refinement applied (swap).** The regen replaces the deep blast crater with a shallow radial "Sarajevo rose" surface scar, matching the forensic record (Galić IT-98-29 / D. Milošević IT-98-29/1). The prior version (already approved) is overwritten.

All placements are **INERT** — the `event_illustrations/` dir is globbed by `eventIllustrationArt.ts`, but no event/codex JSON sets a matching `image` key yet, so in-product render is unchanged. This sign-off authorizes **placement only**, not wiring; wiring the `image` keys is a later step.

---

## Reviewer verdicts (summary)

### `/historian` — factual / setting fidelity — OVERALL APPROVE-WITH-NOTES
ICTY/ICJ/BB-grounded. All 7 historically defensible. 8.2 Potočari assembly-ground (Krstić IT-98-33, UN A/54/549, ICJ 2007), 8.6 Drina arched-bridge townscape (Vasiljević IT-98-32, Lukić IT-98-32/1), and 8.8 archival header accurate without reservation; 8.3 Žepa mountain terrain and 8.1 Krajina industrial-camp compound correct to the documented sites (Tadić IT-94-1, Kvočka IT-98-30/1). Recorded notes:
- **8.4 Ahmići (conditional):** toppled minaret is the correct documented signature but must read unmistakably as a slender minaret shaft, not generic masonry. Carry the fix forward.
- **8.5 Markale (refinement):** the impact mark should be a shallow radial "Sarajevo rose," not a deep blast crater (forensic record litigated in Galić IT-98-29 / D. Milošević IT-98-29/1).
- **8.1 camps (caution):** best represents Omarska/Keraterm (repurposed industrial/mining sites); Trnopolje was only loosely fenced.

### `/narrative-designer` — §4 dignity register (visual) — OVERALL APPROVE-WITH-NOTES
Every image holds the sober, victim-centered, memorial posture: aftermath/absence framing, no people/faces/bodies, no depicted violence, no triumphalism, documentary (not painterly/sepia) treatment. Srebrenica (8.2) correctly the most restrained image in the set; no image aestheticizes suffering or tips into pity-spectacle. Recorded notes:
- **8.3 Žepa:** the one frame that leans faintly picturesque — confirm the final grade pushes toward the specified muted grey-green so the valley does not read as serene (within tolerance).
- **8.4 Ahmići:** minaret legibility deferred to `/historian` (that role's lane).

### `/game-designer` — Ring-3 boundary check — OVERALL APPROVE-WITH-NOTES
None of the 7 creates or implies a §1 Ring-3 refused surface. Atrocity is rendered strictly as consequence/record — never lever, spectacle, achievement, trade, justified outcome, or player-authorized target. 8.1 specifically reads as one revealed place seen from outside the wire, **not** a concentration-camp subsystem (Ring-3 #2). 8.2 personal effects read as human absence, not inventory or spectacle (Ring-3 #4/#5/#6). 8.6 records the emptied landscape, never the act (Ring-3 #1/#8). Only note: 8.4 minaret legibility (non-blocking, historical — referred to `/historian`).

---

## Dignity-QC (pre-chain, recorded)

All 10 delivered §6 stills (including the 3 held enclave-decision images) passed the dignity guardrails on receipt: no bodies, no faces, no people, no depicted violence, no perpetrators, no gore, no triumphalism; documentary palette; no readable text or legible flags. Aftermath/absence/memorial framing throughout. Source PNGs retained at `F:\tmp\section6_art\`.

---

## Held (not placed)

| Asset | Reason |
|---|---|
| `decision_header_enclave_overrun` (8.7) | Enclave-decision art; feature build pending owner + §6 sign-off; owner approval non-delegable |
| `decision_overrun_aftermath` (8.9) | Enclave-decision branch; held with the feature |
| `decision_contain_siege` (8.10) | Enclave-decision branch; held with the feature |

---

## Follow-ups (recorded)

1. ~~**8.4 Ahmići** — regenerate for an unmistakable felled minaret.~~ **DONE 2026-06-10** (regen placed; conditional cleared — see Update above).
2. ~~**8.5 Markale** — refine to a shallow "Sarajevo rose" impact scar.~~ **DONE 2026-06-10** (regen swapped in — see Update above).
3. **8.3 Žepa** — confirm desaturated grey-green grade at integration (non-blocking; placed version stands).
4. **Wiring** (separate, later) — set the `image` keys on the matching atrocity event / codex rows; that is itself §6 content work and routes back through this chain for the wiring change. Must not run until the assets are merged to main.
