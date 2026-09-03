# Showcase Screenshot GUI Audit — 2026-09-03

**Scope.** Critical examination of every surface captured for the publisher showcase at 1920×1080
(fresh captures, current `main`-lineage build v0.9.9-beta.1, w68 saves for all three factions plus
the w191/game-over RS saves). The audit is about the **game's UI**, not the capture rig; rig
artifacts (`?dev=1` chip, the browser-only "command bridge unavailable" notice) are excluded from
published stills and noted only where the *product* would show them.

**Evidence set.** `tmp_gui_observation/fresh_shots/{rbih,rs,hrhb}/*.png`,
`tmp_gui_observation/verbs/*.png`, `tmp_gui_observation/endgame1080/*.png` — identical files ship
on the showcase, so every finding is reproducible from the published media.

Severity: **P1** = visible defect a journalist would screenshot; **P2** = clear quality/consistency
failing; **P3** = polish; **P4** = nit.

---

## P1 — Defects visible at a glance

### 1. Tactical top-bar collision cluster (every map-shell screen)
At 1920×1080 the toolbar centre is broken on every tactical screen (`02_war_map`,
`07a_sector_command`, `07a2_formation_detail`, `04_review_before_advance`):
- The faction crest overlaps the `RECORDS` nav item and floats over the bar.
- The `N REVIEWS` chip renders **behind** the crest (text half-hidden).
- `1 CRITICAL RESERVE REQUEST` chip clips its own last line mid-word.
- `REVIEW BLOCKERS` is clipped by the right viewport edge (`REVIEW BLOCKE…`).
This is not a resolution problem — it reproduces at full HD. The centre cluster needs a real layout
(flex with min-widths) instead of absolute stacking. *This is the exact defect the owner circled.*

### 2. "Sustainment: 0 critical, 0 strained, 55 collapsed" (situation report, all factions)
The war-map SITUATION REPORT prints `55 collapsed` in a quiet front with "Operations: 0 active
commands". This is the internal `stranded_status='collapsed'` accounting (EH-3; the status is
load-bearing for reconstitution and deliberately never cleaned) surfacing raw to the player as if
55 formations had collapsed. Either exclude the reconstitution-path status from the player-facing
sustainment line or rename the bucket; as shipped it reads as a catastrophic bug.

### 3. OSID/slug leakage into player-facing names (Chronicle, ops, decision cards)
The Chronicle is full of engine identifiers presented as prose:
- `Battle of Petrovo 2`, `Battle of Glavaticevo 2`, `Battle of Prelovo 2` — the `_2` operational-
  OSID suffix rendered as if it were "Second Battle of…". Nearly every battle carries it.
- `Battle of medojevici`, `Battle of svrake`, `Battle of zvornik`, `Battle of dragoradi` —
  lowercase slugs, missing diacritics (Medojevići, Svrake, Zvornik).
- `Battle of Sarajevo Dio Ilidza 2` — raw census naming ("Dio") in a battle title.
- Operation names inherit it: `Op Bratunac Jezestica 2`, `Op Gornji Vakuf Zdrimci`,
  `Op Cajnice Batotici` (Čajniče without diacritics), and one card shows
  `Recipient OG: Op Bratunac Bratunac 2` (municipality doubled).
A display-name pass (title-case + diacritics via the settlement name lookup, strip `_N`) would fix
the whole class.

---

## P2 — Quality and consistency failings

### 4. Engineering/contract vocabulary shown to the player
- Records tab: "Records **owns** operation status, completed dossiers, and archive exclusions."
- Army HQ: "Army HQ **owns** command review, operation dossiers, personnel, and reserve handoffs.";
  "…no new command channel is created here."; "4 **executable staff items** are on file."
- Codex: "Ring 2 — narrative observation. Path-not-taken. **Ghost entry**." (internal ring taxonomy).
- Chronicle recap: `FROM "APR 1992" TO "JUL 1993" | SENSITIVE-HISTORY SIGNAL CHAPTERS: 1` —
  internal content-gate tag, quoted-string formatting.
- War Summary: "Responsible owner: Drina Corps", "recorded decision effect −32".
- Records: "7 archived operation records are excluded from RS detailed AAR review."
- Codex box: "Historical essays … live in the separate Codex **shell**."
These are ownership contracts and QA annotations, not staff voice.

### 5. "Unreported" styled as a numeric value
`SUPPLY RESERVE — Unreported` (Force Overview), `Current commitment: Unreported`,
`Last relevant consequence: Unreported` (War Summary, three on one screen), plus terse stacked
"Unreported / Enemy picture unconfirmed" in corps briefings. The sparse-truth intent is right; the
presentation (same styling as numbers, no explanation) reads as a data bug. Needs a distinct muted
style and one standard phrase ("No staff report").

### 6. Number formatting is inconsistent across (and within) surfaces
- `1.0k` beside `517` and `839` in the same brigade column; `48.4k` header style.
- War Summary shows `Killed 5k / Wounded 18k` while CAMPAIGN COST on the *same screen* shows
  `4,755 killed / 17,767 wounded` — rounded and exact for identical stats side by side.
- `1211k` displaced (should be 1.21M or 1,211,000); `4390 friendly casualties` without separator
  next to `4,755` with one.

### 7. Truncation and overflow cluster
- Review-before-advance modal truncates its own labels with room to spare: `RECOMMEND…`,
  `PRESIDENTIAL DEC…`, `COMMAND & PERSO…`, `PRESIDENTIAL REV…`.
- Decision Room filter chips overflow the modal edge (the `BRIEFING`/`COMMAND` chip row is cut;
  at 1440 the `ALL` chip collides with its own count).
- DirectiveCard action row: `HOLD AT MAIN ST…` renders OVER `CANCEL DIRECTIV…` (buttons overlap).
- HRHB desk reserve card ends mid-sentence with no ellipsis or scroll cue ("…Ruda (Novi Travnik)").
- Codex essay body stops mid-citation ("…in Prosecutor v.") with no visible continuation cue.

### 8. Duplicate / contradictory content on one screen
- Corps briefing lists **two "OG MAGLAJ"** entries with different stats; naming also mixes
  conventions (`OG MAGLAJ` vs `DOBOJ OG 9`).
- Two `Commander Replacement` inbox cards recommend different appointees (Galić, Sladoje) and both
  say "Leaving this pending keeps Tomislav Šipčić in command" — simultaneous competing
  recommendations with no linkage.
- Review-before-advance lists the same two required decisions **twice** (as red REQUIRED cards and
  again as DECISION/BLOCKING rows).
- Army HQ shows `CRITICAL 10` (commander summary) and `CRITICAL 0` (presidential attention) on the
  same screen with no reconciliation.
- Decorate-a-unit candidates all carry identical body copy ("has borne the heaviest burden") and
  identical effect rows (+5/+2/+4/−2) — the choice reads cosmetic.
- War Summary objective cards: both military objectives share one lever ("Review reserve
  commitment"), both political ones share another — undifferentiated CTAs.

### 9. Diacritic/name normalization inside single cards
Formation card: `Location: Medojevići (Ilijaš)` but `Home municipality: Ilijas`; personnel pool
row `Ilijas`. Same word, two spellings, one card.

### 10. OG intelligence panel data slots
- `OFFENSIVE POWER` renders with **no value** while `DEFENSIVE POWER` has one (both OGs sampled).
- `FORCE BALANCE: REDACTED` on the player's **own** OG — if intended (OPSEC INACTIVE), it needs a
  reason string; as is it looks broken.
- The `STRENGTH` value slot contains a sentence ("Friendly line reported") where numbers live.
- "Baseline: 1.0 = Standard Brigade" is calibration-speak.
- Corps card repeats the same metric twice ("DENSITY 0.23" up top; "BRIGADES PER FRONT SEGMENT:
  0.23" in the footer), and exposes `SUBSEGMENTS: 1`.

### 11. Verdict strip semantics
`HVO 68.3 B` sits directly above a red `FAILURE` tag (all three factions show FAILURE). Outcome
class and cost-adjusted grade are different axes, but juxtaposed unlabelled they contradict each
other. `Cost Signal: rupture` (lowercase, jargon) same panel.

### 12. Vertical letter-stacking
`CAMPAIGN MILITARY CASUALTIES` renders the faction label as `V`/`R`/`S` one letter per line
(column too narrow for "VRS"). Also `ARBiH` wraps `AR / BiH` in the RBiH variant.

---

## P3 — Polish

13. **Ambiguous strikethrough numerals**: `Visit the front ~~10~~ CA` on all desks;
    `Entity Autonomy ~~100~~` on Dayton. If these mean "discounted/capped", nothing says so.
14. **Left COMMAND rail clipping**: first OG list item's title hides under the rail header.
15. **Map counter clutter**: Sarajevo ring shows a 12-deep splayed counter stack with EN chips
    overlapping counters; no declutter/cluster behaviour at default zoom.
16. **Records layout**: territory chart occupies a full-width panel but plots into the left half,
    leaving a large dead field; five zero-count archive tiles add noise; campaign-pulse text is fine.
17. **Corps briefing page** bottom half is empty with the corps-switcher row stranded mid-page.
18. **Dayton**: faction chips read `RBIH` (canonical casing is `RBiH`); `Negotiation Capital: 0/27`
    with all packages priced and enabled (affordability unclear); `PATRON OVERRIDE ACTIVE (76%)`
    unexplained on-surface.
19. **Paramilitary packet copy** prints model methodology on the desk ("uses the simulation's fixed
    5,000-person target baseline; it is not a claim that this exact outcome occurred here") and
    two-decimal diplomacy ("−4.04 international standing"). Right instinct — wrong voice/precision
    for a president's desk; belongs in a tooltip/codex note, rounded.
20. **Time-unit vocabulary** mixes "turns" (entrenched 12 turns, isolated 68 turns), "weeks"
    (fiction), and "16mo in command" — standardize on weeks.
21. **Toast placement**: "Directive cancelled. No command authority was spent." pins inside the
    Decision Room header and lingers.
22. **Army HQ header**: "FIELDED PERSONNEL **NOW** 108,040" (awkward NOW), stray `×` glyph beside
    the date.
23. **Reserve officers** presented as a flat comma paragraph of 19 names — scan-hostile; also worth
    a deliberate presentation given several names carry ICTY significance (fidelity is intended;
    presentation should be conscious, e.g. row list with dossier links).
24. **Whiteboard date** is half-hidden behind the desk panel on all three desks (scene layering).
25. **War Summary net territory** `+84` has no unit (settlements? municipalities?).

## P4 — Nits
26. Verdict share-summary preview cuts mid-sentence without ellipsis.
27. HRHB office wall-map render is small/washed-out relative to RS/RBiH boards.
28. Repeated "OPEN TURN AFTERMATH" button on every chronicle card (visual noise).
29. Decision Packet body text uses `-` hyphen for ranges/dashes where UI style uses `—`.

---

## What this means for the showcase
The published stills are honest captures of the current build, including several of the above
(top-bar collisions are visible in the map exhibits). The three P1 classes are the ones worth
fixing before any press push, in order: **(1) toolbar layout, (3) display-name pass for
battles/ops, (2) sustainment wording** — all three are contained, none touches sim behaviour, and
together they remove nearly everything a reviewer would screenshot mockingly.

*Capture provenance: browser rig at 1920×1080 for faction/endgame surfaces; Electron rig for
command-surface/directive exhibits. Rig scripts and saves under `tmp_gui_observation/` (untracked).*
