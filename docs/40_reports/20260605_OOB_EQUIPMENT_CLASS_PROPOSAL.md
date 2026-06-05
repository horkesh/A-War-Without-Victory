# OOB `equipment_class` Proposal — Motorized / Mechanized / Armored Brigades

**Issue:** [#16](../../) — "OOB: assign equipment_class for historically motorized/mechanized brigades (Option J, issue #13)"
**Date:** 2026-06-05
**Type:** READ-ONLY research proposal. No data file edited. Historian-gated.
**Author:** dispatched research agent (Claude)

---

## TL;DR

- The premise in issue #16 step 4 — *"`oob_brigades.json` has `equipment_class: unspecified` for all 249 brigades"* — is **STALE / no longer true**. The live OOB has already been substantially classified. A prior pass populated the `default_equipment_class` field. Current distribution: **132 light_infantry, 78 mountain, 26 motorized, 6 mechanized, 5 police, 2 special.**
- Therefore the issue's headline fix ("assign equipment_class to a near-blank file") is **mostly already done.** What remains is a **small set of targeted gaps** where a corps that historically had a motorized/mechanized spearhead currently has *zero* brigades at `equipment_priority >= 2`, which keeps `tier_counts.main_effort = 0` and (per the #13 chain) caps the corps at defensive stance.
- I propose a **high-confidence shortlist of 1 brigade** and a **needs-historian shortlist of ~6**. I am deliberately conservative: most 1992–95 BiH formations were genuinely rifle-only light infantry, and over-promoting would defeat the N1297 readiness gate's intent.

---

## Engine mechanics (verified against live source)

`src/sim/combat/sector_offensive_launch_helpers.ts:70` — `getEquipmentOffensivePriority`:

| equipment_class | priority |
|---|---|
| `mechanized` | 3 |
| `motorized` | 2 |
| `mountain` | 1 |
| everything else (`light_infantry`, `special`, `police`, undefined) | 0 |

`src/sim/combat/commander/force_eval.ts:104-128` — a brigade is classified `main_effort` only if `equipment_priority >= 2` (i.e. **motorized or mechanized**) AND `fitness_offense >= 0.4`. `bot_corps_stance.ts` (N1297 gate) caps stance at `defensive` when a corps has `tier_counts.main_effort === 0`.

**Consequence:** `mountain` (priority 1) does NOT satisfy main_effort. Only **motorized/mechanized** promotions change the readiness gate. A corps with only light/mountain brigades is structurally locked out of offensive stance — by design for rifle-only corps, but a bug where history actually gave that corps an armored/mechanized spearhead.

Note: `special` (priority 0) is the ARBiH Black Swans / Guards classification — elite but NOT main_effort under current mapping. That is a separate design question (Option M, event-driven tier boost) and out of scope here.

---

## Live OOB inventory by corps (the corps that matter)

Corps that **currently have ZERO motorized/mechanized brigade** → `main_effort` permanently 0:

| Faction | Corps | Brigades | Has moto/mech? | Historical spearhead? |
|---|---|---|---|---|
| HRHB | `hvo_tomislavgrad` | 3 (Kralj Tomislav, Kralj Petar Krešimir IV, Rama) | **NO** (2 mountain, 1 light) | Weak — no documented organic armor |
| RS | `vrs_drina` | 9 (Zvornik, Bratunac, Birač, Milići, Vlasenica, Podrinje×2, Višegrad, Skelani bn) | **NO** (8 mountain, 1 light) | **YES — 1st Zvornik had an armour-mech company** |
| RBiH | `arbih_3rd_corps` | 28 | already has `arbih_7th_vitezka_muslim_liberation` = motorized | OK |
| RBiH | `arbih_4th_corps` | 11 | already has `arbih_4th_muslim_light` = motorized | OK |
| RBiH | `arbih_5th_corps` | 10 | **NO** (all light_infantry) | Weak — captured only ~5-6 tanks, stayed rifle-heavy |
| RBiH | `arbih_2nd_corps` | 40 | already has `arbih_9th_muslim_liberation` = motorized | OK |
| HRHB | `hvo_central_bosnia` | 12 | has `hrhb_vitezovi_brigade_vitez` = motorized | OK (1) |

The HVO Guards (`hvo_1st/2nd/3rd_guard`, `hvo_4th_guard`) are already mechanized/motorized but sit in `hvo_main_staff`, not in the regional fighting corps — so they do not lift a regional corps' `main_effort` unless attached. That attachment question is engine/ops, not OOB data.

---

## Per-brigade proposal table

Legend — **Conf**: H=high (documented organic heavy contingent, ready to apply), M=med, L=low (needs-historian).

| # | brigade_id | faction / corps | current class | proposed | evidence (source + locator) | Conf |
|---|---|---|---|---|---|---|
| 1 | `rs_1st_zvornik` | RS / vrs_drina | `mountain` | **`motorized`** | 1st Zvornik Inf Bde included an **Armour-Mechanised Company** (tanks + APCs); ~3,500 troops 1992. ICTY VRS structure annex (Borovčanin) + Wikipedia "Zvornik Brigade". BB2 narrative lists Zvornik with armour. **[Wikipedia/ICTY web cross-check]** | **H** |
| 2 | `rs_1st_bratunac` | RS / vrs_drina | `mountain` | `motorized` (light) | Drina Corps had some armour at Bratunac/Srebrenica (Krivaja-95 tank support), but armour was Corps-level/attached, not necessarily organic to Bratunac Bde. BB2 + Srebrenica military narrative (archive.org). | L (needs-historian) |
| 3 | `arbih_502nd_vitezka_mountain` | RBiH / arbih_5th_corps | `light_infantry` | `mountain` (NOT moto) | 502nd "Knightly **Mountain**" Bde, Dudaković's elite, Bihać pocket. Captured a few T-55s 1994 but remained light/mountain — name is honorific + mountain role. Wikipedia "502nd Brigade (ARBiH)". Promoting to `mountain` is accurate but does NOT grant main_effort. **[Wikipedia web]** | M (class accurate; does not fix gate) |
| 4 | `hrhb_kralj_tomislav_brigade` | HRHB / hvo_tomislavgrad | `mountain` | (stay `mountain`) — flag only | ~3,800 men infantry bde, Tomislavgrad. HVO heavy weapons concentrated in **Guards** bdes, not regional bdes (HVO_OOB_MASTER L194; hr.wikipedia "Brigada Kralj Tomislav"). No documented organic tank/mech bn. **[Wikipedia/BB]** | L (no promotion warranted) |
| 5 | `hrhb_kralj_petar_kreimir_iv_brigade` | HRHB / hvo_tomislavgrad | `mountain` | (stay `mountain`) — flag only | Same OZ Tomislavgrad infantry profile; no documented organic armor. dr.nsk.hr ZP Tomislavgrad dissertation lists it as infantry. **[Wikipedia/web]** | L (no promotion warranted) |
| 6 | `rs_1st_birac` | RS / vrs_drina | `mountain` | (stay `mountain`) | Birač Bde, light infantry profile. No armour evidence. BB2. | L |
| 7 | `rs_visegrad_brigade` | RS / vrs_drina | `mountain` | (stay `mountain`) | Višegrad Bde, light infantry. No organic armour found. | L |

### Already-correct classifications confirmed during audit (no change needed)

These were checked against history and the existing class is right — listing them so a future pass does not re-litigate:

- **RBiH 1st Corps** `arbih_102nd_motorized`, `arbih_104th_vitezka_motorized`, `arbih_105th_motorized`, `arbih_111th_vitezka_motorized`, `arbih_112th_vitezka_motorized`, `arbih_155th_motorized` — all correctly `motorized` (102nd Stup, 111th Žuc per Wikipedia 1st Corps). The many *other* "Vitezka" mountain/light brigades (182nd, 213th, 215th, 246th, 303rd, 327th, 372nd, 377th…) are correctly **light/mountain** — "Vitezka/Vitezka" ("knightly") is an honorific, NOT an equipment marker. Do not bulk-promote on the name. **[Wikipedia web confirm]**
- **VRS** `rs_1st_armored`, `rs_2nd_armored` (mechanized), `rs_1st_sarajevo_mechanized` (mechanized); `rs_16th/27th/43rd/7th_krajina_*_motorized`, `rs_1st_guards_motorized`, `rs_65th_protection_motorized_regiment`, and the SRK Romanija/Sarajevo motorized set — all match VRS_OOB_MASTER (lines 533-622). Correct.
- **HVO** Guards `hvo_1st/2nd/3rd_guard` (mechanized), `hvo_4th_guard` (motorized), `hrhb_vitezovi_brigade_vitez` (motorized), Mostar 1st/2nd/Mostar bdes (motorized) — match HVO_OOB_MASTER. Correct. (Issue's "Viteška" = the already-classified `hrhb_vitezovi_brigade_vitez`.)
- **ARBiH elites** `arbih_120th_..._black_swans` and `arbih_guards_brigade` are `special` (priority 0). Historically correct as special forces; promoting them to grant main_effort is an Option-M design decision, not an OOB fidelity fix.

---

## Shortlists

### High-confidence, ready-to-apply (owner sign-off) — 1 brigade

| brigade_id | change | one-line justification |
|---|---|---|
| `rs_1st_zvornik` | `mountain` → `motorized` | Documented organic Armour-Mechanised Company (ICTY VRS structure + Wikipedia); gives Drina Corps a single historically-grounded main_effort spearhead. |

This is the only change I am confident enough to recommend for direct application. It is historically the best-documented "missing armor" in the file, and it surgically unlocks the Drina Corps main_effort=0 lock with one true unit.

### Needs-historian (citation-backed per-brigade ruling required) — 6 brigades

- `rs_1st_bratunac` — was Drina armour organic to Bratunac Bde or Corps-attached for Krivaja-95? If organic → motorized.
- `arbih_502nd_vitezka_mountain` — confirm `light_infantry` → `mountain` reclass (accurate but does NOT fix 5th Corps main_effort; 5th Corps was genuinely rifle-heavy, so the gate-lock may be historically correct — flag for design, not promotion).
- `hrhb_kralj_tomislav_brigade` / `hrhb_kralj_petar_kreimir_iv_brigade` — confirm NO organic armor (my finding) so `hvo_tomislavgrad` main_effort=0 is left as a true historical constraint, NOT papered over. If the design wants HVO Tomislavgrad to launch ops, the correct lever is **Guards attachment** (engine/ops), not fabricating brigade armor.
- `rs_1st_birac`, `rs_visegrad_brigade` — confirm light-infantry profile (my finding: no armor).

---

## Engine impact note (tier / main_effort)

- Applying #1 (`rs_1st_zvornik` → motorized) gives `vrs_drina` exactly one `main_effort`-eligible brigade. Combined with `fitness_offense >= 0.4`, this can lift Drina Corps stance from `defensive` to `balanced/offensive` and let `managePlan` emit plans. This will **measurably change 40w/188w outputs** (Drina Corps is the Srebrenica/Žepa/Podrinje axis) and therefore **requires a baseline refresh + anchor diff** before merge — it is NOT byte-identical-safe.
- The HVO Tomislavgrad and ARBiH 5th Corps "can't go offensive" symptoms are, on the evidence, **partly historical fact** (rifle-only corps), not pure data bugs. The honest fix for HVO offensive intent is Guards-brigade attachment or the Option-M event-driven tier boost — both tracked in #13 — not promoting infantry brigades that had no tanks.
- The `war-or-game` concern in the issue holds: do NOT give every corps a motorized brigade. Under this proposal, rifle-only corps (5th Corps, Tomislavgrad) stay locked, preserving the gate's intent.

---

## Source & honesty caveat

- **Source hierarchy used:** ICTY > BB1/BB2 KB > OOB masters > museum B/C/S > Wikipedia, EXCEPT Wikipedia/web outranks BB the moment BB is silent or in doubt (per owner directive 2026-06-04).
- **Web/Wikipedia-derived findings** (vs BB): the `rs_1st_zvornik` Armour-Mechanised Company detail is corroborated by **Wikipedia "Zvornik Brigade" + ICTY VRS structure annex**, with BB2 narrative consistent. The ARBiH 5th Corps "only ~5-6 captured tanks, stayed light" finding is **Wikipedia ("502nd Brigade", "5th Corps")** — this is the load-bearing reason I do NOT promote 5th Corps. The HVO "heavy weapons live in Guards, not regional brigades" finding is **HVO_OOB_MASTER + hr.wikipedia**. The "Vitezka = honorific not equipment" caution is **Wikipedia 1st Corps** cross-checked against the OOB's own mixed use of the term.
- **Honesty / coverage:** I audited all 249 brigades' current class against the three OOB masters and spot-checked the ambiguous ones on the web. I did NOT exhaustively web-verify every one of the 26 existing motorized / 6 mechanized assignments — I confirmed they match the OOB masters, which I trust for those. The genuinely uncertain calls are flagged needs-historian; I invented no equipment. The single high-confidence promotion is deliberately narrow. If the goal is specifically "make HVO launch ops," this OOB pass alone will **not** achieve it — the data evidence says HVO regional brigades were light infantry, and the real lever is Guards attachment / Option M.

---

## Validation plan (if #1 is applied)

1. Apply `rs_1st_zvornik` → `motorized` only (one change).
2. Refresh 40w + 188w baselines; capture hash.
3. Anchor diff on the Drina axis (Srebrenica/Žepa/Podrinje OSIDs) — expect movement; confirm it is historically plausible, not a runaway.
4. If Drina Corps now over-performs, revert and re-route through ops-level attachment instead.
