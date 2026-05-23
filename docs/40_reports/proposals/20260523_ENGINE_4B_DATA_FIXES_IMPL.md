# Engine #4B — Data Fixes Implementation Memo (16 OSIDs)

**Date:** 2026-05-23
**Type:** Calibration data follow-through (Engine #4 historian audit)
**Source memo:** `docs/40_reports/proposals/20260523_ENGINE_4_HISTORIAN_AUDIT_18_OSIDs.md`
**Implementer:** AWWV data editor (this session)
**Companion audits in flight:** Engine #1, Engine #2 implementers on disjoint source files

---

## 1. Scope

The Engine #4 historian audit classified 18 east-Bosnia hotspot OSIDs
against the historical record. This memo implements the **16 actionable
fixes** (6 FIX_PAINTED + 10 FIX_INIT) and records why one of those two
categories was actually applied vs. deferred under canonical sacred-rule
constraints. The 18th OSID (`op:rogatica:zepa_2`, KEEP_BOTH) is owed
engine work, not a data edit, and is excluded from this memo.

### 1.1 Action tally

| Category | OSIDs | Status |
|---|---:|---|
| **FIX_PAINTED** (painted_oct1995 RS → RBiH) | 6 | **APPLIED** to `data/source/calibration/painted_control_oct1995.json` |
| **FIX_INIT** (apr1992 init RBiH → RS) | 10 | **DEFERRED** — sacred-rule conflict; alternative proposed in §3 |
| **KEEP_BOTH** (Žepa) | 1 | Out of scope (engine work) |
| **Total** | 17 | 6 applied, 10 deferred, 1 OOS |

---

## 2. FIX_PAINTED — applied (6 OSIDs)

### 2.1 Edits

The painted_control_oct1995 file was edited in-place. Six OSIDs flipped
from `"RS"` to `"RBiH"` in `by_settlement_id`. `meta.counts` updated to
reflect the net swing:

| OSID | Before | After | Settlement |
|---|---|---|---|
| `op:gorazde:faocici_2` | RS | RBiH | Faočići (eastern outskirt of Goražde) |
| `op:gorazde:hrancici` | RS | RBiH | Hrančići (western suburb) |
| `op:gorazde:kolovarice` | RS | RBiH | Kolovarice (northern hamlet) |
| `op:gorazde:slatina_2` | RS | RBiH | Slatina (southern village) |
| `op:gorazde:ustipraca_2` | RS | RBiH | Ustiprača (eastern pocket edge, road to Višegrad) |
| `op:gorazde:zorovici` | RS | RBiH | Zorovići (south of Goražde) |

`meta.counts` was updated atomically: `RS 319 → 313` and `RBiH 286 → 292`.
HRHB unchanged at 107. Total still 712.

### 2.2 Validation

Post-edit validation script:

```
node -e "const j=JSON.parse(require('fs').readFileSync('...painted_control_oct1995.json','utf8'));
  const c=j.meta.counts; const m=j.by_settlement_id;
  const tot={RS:0,RBiH:0,HRHB:0};
  for(const k in m){tot[m[k]]++;}
  console.log('meta:',c,'actual:',tot,'total:',Object.keys(m).length);"
```

Output: `meta: { RS: 313, RBiH: 292, HRHB: 107 } actual: { RS: 313, RBiH: 292, HRHB: 107 } total: 712`.

Meta counts match actual counts. JSON parses cleanly. `npx tsc --noEmit`
passes (no schema regression — painted file is read at runtime as a
flat data map).

### 2.3 Citations

* ICTY *Galić* Trial Judgment IT-98-29-T (5 Dec 2003) §§186–195 (Goražde
  one of three enclaves alongside Sarajevo and Srebrenica).
* ICTY *Krstić* Trial Judgment IT-98-33-T (2 Aug 2001) §22 (Goražde
  enumerated as UN Safe Area).
* UNSC Resolution 824 (6 May 1993) — Goražde designated UN Safe Area #6.
* UNSC Resolution 836 (4 Jun 1993) — UNPROFOR mandate.
* CIA Office of Russian and European Analysis, *Balkan Battlegrounds*,
  Vol. 1 (2002), pp. 142–148 (Goražde siege 1992–95).
* Burg & Shoup, *The War in Bosnia-Herzegovina* (M.E. Sharpe, 1999),
  pp. 138–142, 297.

Goražde was ARBiH-held continuously from April 1992 through Dayton
(survived April 1994 VRS offensive that triggered NATO airstrikes).
The painted file appears to have mistakenly used the post-Dayton IEBL
administrative boundary rather than the freeze-line control. The
correction is unambiguous for the six listed OSIDs.

`ustipraca_2` carries a caveat (most contested edge of the pocket; BB1
pp. 145–146 note intermittent VRS pressure) but historians concur it
was ARBiH-held at the October 1995 freeze.

---

## 3. FIX_INIT — deferred (10 OSIDs)

### 3.1 Sacred-rule conflict

CLAUDE.md and the project's life-lessons doctrine state:

> **NEVER override initial OSIDs**: Initial OSID control from
> census/referendum is sacrosanct. Fix engine, OOB, operations, or
> scenario params instead.

The 10 FIX_INIT OSIDs are currently seeded RBiH because the
`hybrid_1992` init mode (used by `apr1992_definitive_188w.json`)
combines:

1. mun1990-level controller (Doboj=RS, Foča=RS, Rogatica=RS, Trnovo=RS
   — all four munis are seeded RS at the muni-controller layer).
2. SID-level ethnic override: if a settlement has ≥0.70 Bosniak share,
   it flips from the muni-controller (RS) to RBiH, per
   `initializePoliticalControllersFromHybrid1992` in
   `src/state/political_control_init.ts:671–746`.
3. Promotion to OSID via majority-of-SIDs vote
   (`promotePoliticalControllersToOsid`), so an OSID composed mostly
   of Bosniak-majority SIDs becomes RBiH.

For the 10 listed OSIDs, the underlying SID-level ethnicity data has
sufficient Bosniak share to trigger the override. The sim then never
contests them (no front edges form there, no ops target them) and the
final-save shows them RBiH at t188, which `painted_oct1995.json` flags
as wrong.

### 3.2 Why direct edits are blocked

Three potential fix surfaces, each with an objection:

| Surface | Edit type | Blocker |
|---|---|---|
| `data/source/municipalities_1990_initial_political_controllers_apr1992.json` | mun1990-keyed | Already correct (all four munis seeded RS); the OSIDs flip via SID-level ethnic override, not via muni controller |
| `data/source/settlement_ethnicity*.json` (1991 census ethnicity per SID) | SID-keyed census | Census data is documentary truth; rewriting Bosniak shares to falsely show <0.70 would violate the "census is sacrosanct" rule |
| `osid_control_overrides` in `apr1992_definitive_188w.json` | OSID-keyed | The CLAUDE.md sacred rule explicitly bans this mechanism for new entries (the comment in `scenario_types.ts` carves a "factual initial-control corrections" exception, exemplified by Brčko, but the project-level rule in CLAUDE.md is stricter) |

### 3.3 Affected OSIDs

The 10 OSIDs the historian classified FIX_INIT (RBiH → RS):

| OSID | Settlement | Muni controller | ICTY/BB takeover date |
|---|---|---|---|
| `op:doboj:grapska_gornja_2` | Grapska Gornja | RS | ≤3 May 1992 (Doboj takeover) |
| `op:doboj:makljenovac` | Makljenovac | RS | ≤3 May 1992 (Doboj takeover) |
| `op:foca:mazlina` | Mazlina | RS | 8 Apr – end Jun 1992 (Foča ethnic cleansing) |
| `op:foca:patkovina` | Patkovina | RS | 8 Apr – end Jun 1992 |
| `op:foca:ustikolina` | Ustikolina | RS | Jun–Jul 1992 (BB1 p.138; caveat: held through May) |
| `op:rogatica:brcigovo` | Brčigovo | RS | Aug 1992 (Rogatica fall) |
| `op:rogatica:rogatica_2` | Rogatica town outskirt | RS | Aug 1992 |
| `op:rogatica:varosiste_2` | Varošište | RS | Aug 1992 |
| `op:trnovo:delijas` | Delijaš | RS | May 1992 (Trnovo fall) |
| `op:trnovo:kijevo_2` | Kijevo | RS | May 1992 |

All citations: ICTY *Stanišić & Župljanin* IT-08-91-T §§496–608
(Doboj); ICTY *Kunarac* IT-96-23-T (Foča); ICTY *Krnojelac* IT-97-25-T
(Foča KP Dom); ICTY *Karadžić* IT-95-5/18-T (multi-muni overview);
ICTY *Galić* IT-98-29-T §§198–204 (Trnovo/Igman); BB1 pp. 130–148.

### 3.4 Proposed alternatives (ordered by preference)

**Option A — Increase `coercion_pressure_by_municipality` for the four munis (PREFERRED)**

The 188w scenario already uses `coercion_pressure_by_municipality`
(lines 43–61) to model 1992 SDS/JNA pressure on mixed munis. The
existing entries include `foca: 0.85`, `rogatica: 0.6`, `doboj: 0.55`.
The coercion mechanism flips Bosniak-majority settlements toward the
muni-controller (RS) at scenario start, simulating early-war takeover
without violating the census layer.

To match historian recommendations, raise:

* `doboj: 0.55 → 0.80` (full corridor takeover by 3 May 1992)
* `foca: 0.85 → 0.90` (essentially complete by June 1992)
* `rogatica: 0.60 → 0.80` (full takeover by Aug 1992)
* `trnovo` (currently absent → add at `0.75`)

This is a single 4-key delta in the scenario file, fully reversible,
auditable, and per the scenario-types contract (the coercion mechanism
is the *engine param* the sacred rule directs us to use). It does not
touch census, doesn't add osid_control_overrides, and doesn't edit
init source files.

**Risk:** raising pressure flips ALL Bosniak-majority OSIDs in those
munis, not just the historian's 10. Foča at 0.90 may flip OSIDs the
historian didn't list (potentially correct historically; needs review).
Trnovo at 0.75 plus the muni controller (RS) flips everything Bosniak
in Trnovo muni to RS at t0, which is also the historian's preferred
KEEP_BOTH-pragmatic-FIX_INIT treatment for `op:trnovo:trnovo`.

**Verification gate before Option A applies:** run the 40w scenario
post-pressure-bump and inspect `final_save.political.political_controllers`
to confirm:
1. The 10 listed OSIDs now seed RS at t0.
2. The Goražde 6 (already RBiH-correct) are NOT incorrectly flipped to
   RS by coercion (Goražde muni controller is RBiH, so this should
   be safe).
3. Anchor and benchmark calibration metrics don't regress materially
   (one-shot test, no further pressure tuning).

**Option B — Add a per-OSID early-war control_event timeline**

The audit memo §5.3 proposes a scripted control_event in turn 1–8 for
each of the 10 OSIDs that flips RBiH → RS at the historically correct
week. This models the takeover as engine behavior (which the sacred
rule prefers) rather than overriding the seed. Cost: ~20–40 lines per
event in `data/scenarios/timelines/apr1992.json` or a new
`historical_control_events` section. Surface area: ~10 events.

**Risk:** existing front-edge / sector / op systems may have already
locked these OSIDs into RBiH-side fronts and brigade assignments by
the time the flip fires. Requires verification that mid-early-war
control flips propagate correctly through downstream phases.

**Option C — Per-muni `init_control_mode` override (NEW MECHANISM)**

Add a `per_muni_init_overrides` field to scenario config:
`{ "doboj": "muni_controller_only", ... }` which disables the
ethnic-override branch in `initializePoliticalControllersFromHybrid1992`
for the listed muni only, falling back to pure muni-controller
assignment (RS for all four). This is the cleanest data-driven fix but
requires a code change in `political_control_init.ts` plus scenario
type addition. Not recommended for this implementation pass —
introduces a new mechanism just to handle 10 OSIDs.

### 3.5 Recommendation

Option A (coercion pressure bump) is the cheapest, lowest-risk,
sacred-rule-compliant alternative. It uses the existing engine
mechanism the scenario already deploys and requires only a 4-line
scenario edit. Recommend this be applied in a follow-on pass with
a single 40w calibration run for verification.

Option B is the "engine-correct" answer the audit prefers and should
be tracked as a backlog item for the early-war takeover model overhaul.

**Filed status:** FIX_INIT not applied in this pass. Orchestrator
should route Option A to the scenario-creator-runner-tester for the
4-line pressure bump and verification run, or route Option B to the
operations-expert for the timeline-event design.

---

## 4. Out of scope: KEEP_BOTH (`op:rogatica:zepa_2`)

Žepa fell to VRS on 25 July 1995 (UN Safe Area #5; ICTY *Krstić* §§552–597,
*Tolimir* §§550–733). The painted_oct1995 file correctly assigns Žepa to
RS at the October 1995 freeze, but the sim's t188 controller is RBiH
because the engine produces no `control_event` for the Žepa offensive.
Proper fix is engine work — a triggered operation or scripted
control_event in week ~174 — not a data edit. Filed as operations-expert
backlog (audit memo §5.3).

---

## 5. Determinism and safety

* Painted file edits: 7 line changes (6 OSID values + 3-line counts
  block). No structural change. JSON validates. `meta.counts` and
  `by_settlement_id` agree (verified by enumeration script).
* No code changes in this pass. `npx tsc --noEmit` exit-clean.
* No scenario config changes in this pass (FIX_INIT deferred).
* No engine code changes.
* Sorted-iteration / strictCompare invariants unaffected (painted file
  is data, not state; consumed by calibration scoring only).
* Sacred-rule compliance: NO new entries to `osid_control_overrides`;
  NO new entries to `avoided_osids_by_faction`; init source untouched.

---

## 6. Files modified

* `data/source/calibration/painted_control_oct1995.json` — 7 lines
  changed (6 OSID flips RS→RBiH + 2 count adjustments). JSON-clean,
  712 OSIDs preserved, counts agree.

## 7. Files NOT modified (and why)

* `data/source/municipalities_1990_initial_political_controllers_apr1992.json`
  — would not address the issue (muni controllers already RS for all
  four affected munis; OSIDs flip via SID-level ethnic override at a
  layer below this file).
* `data/source/settlement_ethnicity*.json` — would violate the
  "census is sacrosanct" doctrine; 1991 ethnicity data is documentary
  truth.
* `data/scenarios/apr1992_definitive_188w.json` — sacred-rule blocked
  for adding entries to `osid_control_overrides`. Recommended next-pass
  alternative is a 4-line bump to existing
  `coercion_pressure_by_municipality` (Option A in §3.4).
* Any code under `src/` — no code changes needed for the applied 6
  edits; engine work for the deferred 10 is owed to scenario or ops
  experts.

---

## 8. Citations (data layer)

* ICTY *Galić* Trial Judgment IT-98-29-T (5 Dec 2003).
* ICTY *Krstić* Trial Judgment IT-98-33-T (2 Aug 2001).
* ICTY *Tolimir* Trial Judgment IT-05-88/2-T (12 Dec 2012).
* ICTY *Kunarac et al.* Trial Judgment IT-96-23-T & 23/1-T (22 Feb 2001).
* ICTY *Krnojelac* Trial Judgment IT-97-25-T (15 Mar 2002).
* ICTY *Stanišić & Župljanin* Trial Judgment IT-08-91-T (27 Mar 2013).
* ICTY *Karadžić* Trial Judgment IT-95-5/18-T (24 Mar 2016).
* UNSC Resolution 824 (6 May 1993).
* UNSC Resolution 836 (4 Jun 1993).
* CIA Office of Russian and European Analysis, *Balkan Battlegrounds:
  A Military History of the Yugoslav Conflict 1990–1995*, Vols. 1–2
  (2002–2003).
* Burg & Shoup, *The War in Bosnia-Herzegovina: Ethnic Conflict and
  International Intervention* (M.E. Sharpe, 1999).

---

## 9. Reportback summary

(a) **Painted file**: 6 OSID flips applied (RS → RBiH in Goražde
cluster). `meta.counts` updated to `{ RS: 313, RBiH: 292, HRHB: 107 }`.
JSON validates, total=712, meta matches actual.

(b) **Init source**: DEFERRED. Direct osid_control_overrides edits
blocked by CLAUDE.md sacred rule. Three alternatives proposed (§3.4),
with Option A (coercion pressure bump in scenario file) recommended
as the lowest-risk sacred-rule-compliant fix for follow-on pass.

(c) **Typecheck**: `npx tsc --noEmit` — clean exit, no errors.

(d) **Memo size**: see file metadata; target ~7–9 KB.

---

## 10. Audit metadata

* Source audit: `docs/40_reports/proposals/20260523_ENGINE_4_HISTORIAN_AUDIT_18_OSIDs.md`
* Scenario referenced: `data/scenarios/apr1992_definitive_188w.json` (188w run
  `apr1992_definitive_188w__210e69404d054959__w188_n1992`).
* Sacred rule referenced: `CLAUDE.md` — "NEVER override initial OSIDs"
  and "NEVER use `avoided_osids_by_faction`".
* Type-doc carve-out cited: `src/scenario/scenario_types.ts:147–154`
  (Brčko precedent for `osid_control_overrides`); not exercised in this
  pass per project-level sacred rule.
* Parallel work-streams in this session (Engine #1, #2, #4) operate on
  disjoint source files; no merge conflict risk on the painted file
  (sole writer this pass).
