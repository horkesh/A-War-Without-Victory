# Ring-3 Sensitive-Event Authoring — Process + Backlog Plan

**Date:** 2026-05-29
**Status:** PLANNING-ONLY (no event content authored, no commit)
**Owner lane:** Content/Codex + §6 sign-off chain
**Authoring role:** Historian (with Content/Codex hat); drafts only after §6 panel convene
**Related command-board row:** P2 "Ring-3 sensitive-event authoring backlog" — OPEN (§6-gated) (`docs/plans/COMMAND_BOARD.md` line 48)
**Related ACTIVE row:** P1 "Dynamic Codex and sensitive-history consequence arcs" (`COMMAND_BOARD.md` line 35)
**Canon authority:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` (Tier 2 canon — above Rulebook, below Engine Invariants)
**Collision rule:** Authoring only; no engine, rupture-evaluator, scoring, or enclave-mechanic edits. Stop on any sign-off dispute and escalate to the user (Gate §6 "Escalation").

---

## 0. Required reading (cite before any drafting)

- `CLAUDE.md` Sacred Rules — determinism; "FORAWWV.md edits require Pyrrhic-panel sign-off".
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` — the binding gate. Key sections used by this plan:
  - §1 Three Rings (Ring 1 modeled / Ring 2 narrative / Ring 3 refused).
  - **§1.3 — the eleven Ring-3 refusals** (no genocide decision tree #1; no camp subsystem #2; no negotiable condemnation #3; no body-count optimization #4; no atrocity-efficiency metric #5; no alternate-history minimization #6; no faction-atrocity ranking #7; no granular victim attribution #8; no justified-atrocity framing #9; **no gamified "prevent genocide" mechanic #10**; no calendar-driven atrocity recording #11).
  - §2 Rupture Expansion Rule (4 criteria; current roster = `srebrenica_genocide_1995` only; explicit non-rupture list).
  - §3.6 forward-looking guard (the source_note must carry a prohibition phrase + a sensitive-act keyword).
  - §4 Cost Ledger / prose wording constraints (prosecutorial third-person voice; required ICTY citations; forbidden euphemism/minimization).
  - §5 Essays & Codex; §3 counterfactual-register canonical pattern (`enclave_defended` ghost entry).
  - **§6 Sign-Off Structure** — the per-change-type sign-off table + evidence rules + escalation.
- `tests/codex_sensitive_history_source_notes.test.ts` — the provenance-only `source_note` gate (forbidden tokens + required boundary phrases; per-family variants). READ verbatim before authoring.
- `tests/sensitive_history_canon_gate_audit_strict_gate.test.ts` + `tools/diagnostics/sensitive_history_canon_gate_audit.ts` — the F2 strict gate (CRITICAL + WARNING must be 0; INFO unconstrained; punitive-marker scoring; §3.6 guard heuristic).
- `src/sim/events/event_families.ts` — `RING3_SENSITIVE_FAMILIES`, `isRing3SensitiveFamily`, `isCampExposureFamily` (family-slug → Ring-3 classification).
- Authored exemplars in `data/scenarios/events/war_1992.json` etc.: `drina_valley_ethnic_cleansing_1992`, `concentration_camps_revealed_1992`, `ahmici_massacre_1993`, `markale_area_shelling_1993`, `srebrenica_falls_1995`, `zepa_falls_1995`, `second_markale_massacre_1995`, and the four `battle_of_the_barracks_*`.
- Source hierarchy (Gate §6 evidence rule): **ICTY/ICJ verdicts FIRST → museum B/C/S primary → Balkan Battlegrounds (BB) → Wikipedia LAST (never sole basis; not acceptable for `/historian` sign-off).**

---

## 1. Objective

Close the Ring-3 sensitive-history event backlog — author the remaining historically-required atrocity/siege/safe-area events — **without violating the Design Gate.** This plan delivers (a) the enumerated candidate backlog, (b) the §6 sign-off process each event must pass, and (c) the canon/test gates. It authors **no event prose**.

**Why now.** The Srebrenica/Žepa/Markale family already passes the §6 chain and the F2 strict gate, proving the pipeline works. The remaining sensitive backlog (Bijeljina, Prijedor-camp complex, siege-shelling continuum, safe-area enforcement, hostage-crisis follow-through) is unauthored or thinly authored. Leaving it open risks ad-hoc authoring that either (i) drifts into a Ring-3 refused surface (a "lever") or (ii) carries non-provenance `source_note` text that fails the gate. A codified process closes it safely.

---

## 2. Scope & Non-Scope

**In scope (this plan):**
- Enumerate candidate Ring-3 / sensitive events still to author, each with proposed id, historical anchor, source tier, and applicable §1.3 refusals.
- Flag any candidate too sensitive to gamify at all (Ring-3 refusal — never authored as a choice event).
- Codify the §6 sign-off process and the authoring template (incl. the exact `source_note` boundary phrases).
- Define one-family-at-a-time sequencing and the verification gates.

**Out of scope (explicitly NOT in this plan):**
- Authoring any event prose, `narrative`, `source_note`, options, or triggers. (Drafting happens per-event after §6 convene.)
- New ruptures or condemnation flags (Gate §2 — capital-R Decision; default is "do not add one"; requires user approval).
- Engine/evaluator/scoring/enclave/rupture-evaluator edits.
- Runtime response-level branch behavior (gated by the Event-system semantics packet — `COMMAND_BOARD.md` line 34 stop gate).
- The three already-packeted uncited rows (`croat_bosniak_war_begins_1993`, `visit_to_front_hrhb`, `federation_ground_offensive_1995`) — owned by the P1 Dynamic Codex lane / `docs/40_reports/proposals/20260527_CODEX_GATED_EVENT_ROW_REVIEW_PACKET.md`. Cross-referenced, not re-owned here.
- Editing `docs/10_canon/FORAWWV.md` (Sacred Rule).

---

## 3. Candidate Ring-3 / sensitive events to author

Classification key:
- **AUTHOR (Ring 2 event)** — a player-facing historical event, depicted in historical voice; may carry historical-default choices ONLY if the choices are non-atrocity-authorizing (institutional/diplomatic responses), gated by the F2 punitive-cost-floor rule.
- **AUTHOR (informational-only)** — historical record event with no response options (a `humanitarian`/`military` category notification, like `drina_valley_ethnic_cleansing_1992`). Lowest risk; preferred default for atrocity events.
- **RING-3 REFUSAL** — must NOT be authored as any decision/choice surface. Aggregate outcome stays in displacement/casualty ledgers + essays only (§1.3 #1, #2, #8).

### 3.1 Already authored (do NOT re-author — coverage baseline)

For backlog clarity. These exist in `data/scenarios/events/*.json`: `drina_valley_ethnic_cleansing_1992`, `concentration_camps_revealed_1992`, the four `battle_of_the_barracks_*`, `srebrenica_enclave_forms_1992`, `gorazde_pocket_consolidation_1992`, `kravica_attack_1993`, `ahmici_massacre_1993`, `hvo_detention_camps_1993`, `markale_area_shelling_1993`, `grabovica_uzdol_massacres_1993`, `stupni_do_massacre_1993`, `mostar_bridge_destroyed_1993`, `vrs_cerska_offensive_1993`, `east_mostar_siege_1993`, `un_safe_areas_declared_1993`, `markale_massacre_1994`, `gorazde_crisis_1994`, `anti_sniping_agreement_1994`, `un_hostage_crisis_1995`, `tuzla_gate_massacre_1995`, `srebrenica_falls_1995`, `zepa_falls_1995`, `second_markale_massacre_1995`.

### 3.2 Candidate backlog (12 candidates)

| # | Proposed id | Historical anchor | Source tier (highest available) | Classification | §1.3 refusals that bind |
|---|---|---|---|---|---|
| 1 | `bijeljina_massacre_1992` | Bijeljina killings, 1–2 Apr 1992; Arkan's SDG. ~48 killed. | ICTY (Stanišić & Simatović IT-03-69; Šešelj IT-03-67 context; Arkan indictment unprosecuted) → BB | AUTHOR (informational-only) | #1, #4, #8, #9 (Arkan/SDG named as perpetrators, no minimization) |
| 2 | `prijedor_camps_complex_1992` | Omarska, Keraterm, Trnopolje camps, summer 1992; Prijedor takeover. | ICTY (Tadić IT-94-1; Stakić IT-97-24; Kvočka IT-98-30/1; Brđanin IT-99-36) → museum (Prijedor memorial) → BB | AUTHOR (informational-only) — **NOT a camp subsystem** | **#2 (no concentration-camp system)**, #1, #4, #8 |
| 3 | `sarajevo_breadline_shelling_1992` | Vasa Miškin St / breadline massacre, 27 May 1992. ~17 killed. | ICTY (Galić IT-98-29; D. Milošević IT-98-29/1 siege case law) → BB | AUTHOR (informational-only) | #4, #6, #8, #9 |
| 4 | `foca_campaign_1992` | Foča takeover + systematic sexual-violence/cleansing, 1992. | ICTY (Kunarac IT-96-23 — landmark rape-as-CAH; Krnojelac IT-97-25) → museum → BB | **RING-3 REFUSAL for the SV dimension**; AUTHOR (informational-only) for the territorial-cleansing dimension ONLY | **#1, #2, #8, #9**; sexual-violence process is NEVER a mechanic or choice — essay-only |
| 5 | `visegrad_campaign_1992` | Višegrad killings (Pionirska St / Bikavac house burnings), 1992. | ICTY (Lukić & Lukić IT-98-32/1; Vasiljević IT-98-32) → museum → BB | AUTHOR (informational-only) | #1, #4, #8, #9 |
| 6 | `zvornik_campaign_1992` | Zvornik takeover + expulsions, Apr 1992; SDG/JNA. | ICTY (Stanišić & Simatović; Karadžić IT-95-5/18 municipality count) → BB | AUTHOR (informational-only) | #1, #4, #8 |
| 7 | `tuzla_konvoj_jna_1992` | Tuzla column / Brčanska Malta, 15 May 1992 (JNA-withdrawal clash). | ICTY context (limited specific finding) → BB → museum | AUTHOR (Ring-2 event, no atrocity choice) — **contested attribution; barracks-family wording discipline applies** | #4, #6, #9 (no justified-atrocity framing in either direction) |
| 8 | `kasindolska_sarajevo_siege_continuum_1993` | Sarajevo siege as recurring shelling/sniping pressure (NOT continuous-condition model — that is DEFERRED, COMMAND_BOARD P3 line 49). Discrete shelling notification. | ICTY (Galić; D. Milošević) → BB | AUTHOR (informational-only) — defer if it collides with the P3 continuous-condition design decision | #4, #6, #8 |
| 9 | `srebrenica_column_breakout_1995` | The Šušnjari–Tuzla column / Buljim, Jul 1995 (men fleeing the fall). | ICTY (Krstić IT-98-33; Popović et al. IT-05-88; Mladić IT-09-92) → UN A/54/549 → BB | **RING-3 REFUSAL as a player choice** (#1, #10 — no "save the column" prevent-genocide button); AUTHOR (informational-only) recording only if the §2 c2 rupture predicate is satisfied; otherwise essay/ghost-entry only (§3 register) | **#10 (no gamified prevent-genocide), #11 (no calendar trigger), #1, #8** |
| 10 | `zepa_negotiated_evacuation_1995` | Žepa fall + Avdo Palić disappearance + negotiated evacuation, Jul 1995. | ICTY (Tolimir IT-05-88/2 — genocide finding re Žepa leadership; Mladić) → UN → BB | AUTHOR (informational-only) — adjacency to `zepa_falls_1995`; verify no duplication | #1, #3, #8, #10 |
| 11 | `un_safe_area_enforcement_1995` | NATO/UNPROFOR safe-area enforcement failure family (already a `RING3_SENSITIVE_FAMILY` slug). | UN A/54/549; ICTY siege case law → BB | AUTHOR (Ring-2 event, institutional/diplomatic choices only) — family is Ring-3-classified, so **§3.6 guard text is MANDATORY in source_note** | #3, #6, #10, #11 |
| 12 | `markale_un_response_1994` | Post-Markale-I NATO ultimatum / Sarajevo exclusion zone, Feb 1994. | UN; ICTY siege case law → BB | AUTHOR (Ring-2 event, diplomatic choices only) | #4, #6 |

**Counts:** 12 candidates — **8 AUTHOR (informational-only)**, **2 AUTHOR (Ring-2 with institutional/diplomatic choices only)**, **2 with a RING-3-REFUSAL component** (#4 Foča sexual-violence dimension; #9 Srebrenica column as a player choice). One (#8) is conditionally deferred against the P3 continuous-siege design decision.

**Hard refusal restated (do not author under any framing):** a "commit/order ethnic cleansing" decision tree (§1.3 #1); a concentration-camp management subsystem (§1.3 #2); any "prevent Srebrenica for points" reward (§1.3 #10); named-individual-victim simulated entities (§1.3 #8). Prijedor (#2) and Foča-SV (#4) are authored as *informational record only* precisely because their process must stay in Ring 2, never Ring 1/3-as-choice.

**Rupture note:** None of these 12 is proposed as a new rupture. Gate §2 already lists Bijeljina/Stupni Do/etc. as **non-ruptures** (scale/finding thresholds). Any rupture addition is a separate capital-R Decision requiring `/historian` + `/war-or-game` + `/game-designer` + user approval (Gate §2 "Adding a new rupture").

---

## 4. The §6 sign-off process (each event must pass, in order)

Per Gate §6 table: "New atrocity event" → `/historian` + `/narrative-designer`. For any event whose **family** is a `RING3_SENSITIVE_FAMILY` (e.g. #11), the stricter convene applies, and anything that "could produce a reward-for-atrocity effect" needs **user approval (not delegable)**.

1. **Historian draft (this role).** Produce the event row draft against the §5 template. Cite ICTY/ICJ case number(s) per the source hierarchy. BB acceptable as secondary; Wikipedia never the basis. Classify the candidate (AUTHOR-informational / AUTHOR-Ring-2-choice / RING-3-REFUSAL) and state which §1.3 refusals bind.
2. **Canon-compliance review** (`/canon-compliance-reviewer`). Verify ring placement is explicit (Gate §8 life-lesson 2: a feature in no ring "does not exist yet"); verify no new rupture/condemnation flag is introduced silently; verify trigger is a mechanical predicate, never a bare calendar window (§1.3 #11, §2 criterion-3).
3. **Pyrrhic panel convene** (the §6 panel). For an atrocity event: `/historian` + `/narrative-designer`. Add `/game-designer` (verify no Ring-3 refused surface created by accident — §6 evidence rule) and `/war-or-game` ("would a real Bosnian War observer find this absurd", REAL_WAR_MASTER.md) when the row carries any response option or any reward-adjacent shift. Surface conflicts honestly; do not resolve sensitive-history disputes inside role review — escalate to user (§6 Escalation).
4. **Source-notes test** — `tests/codex_sensitive_history_source_notes.test.ts`. The `source_note` must carry the §5 boundary phrases and must not carry forbidden tokens. (Add the new id to `SOURCE_NOTE_EVENT_IDS` in the test as part of the authoring commit.)
5. **F2 strict gate** — `tools/diagnostics/sensitive_history_canon_gate_audit.ts` via `tests/sensitive_history_canon_gate_audit_strict_gate.test.ts`. CRITICAL + WARNING must be 0. For Ring-3-family rows: §3.6 guard PASS (prohibition phrase + sensitive-act keyword in `source_note`) and ring3-enabling-rejection PASS (no upstream `enables_events`/`enables_events_runtime` targets the Ring-3 row). For any sensitive-option row: ≥2 punitive markers, no positive `territorial_legitimacy`, no `recruitment_modifier > 1.20`.
6. **User approval** — required for any reward-adjacent surface (Gate §6 last row) and for any rupture/condemnation-flag candidate (default: not delegable).

A candidate that cannot clear step 2 ring-placement, or that a panelist flags as a lever, is **STOPPED and escalated** — not quietly reframed.

---

## 5. Authoring template (fields + provenance-only `source_note`)

### Required event fields (model on `drina_valley_ethnic_cleansing_1992`)
- `id` (snake_case, year-suffixed, not in any bot name-pool — see Gate §1 data-not-comment exclusion).
- `title`, `narrative` — historical third-person voice (§4 Required: "the war happened; the ledger records it"). No second-person "you ordered". No euphemism, no minimization, no humor (§4 Forbidden).
- `source_note` — provenance-only (see structure below).
- `category` — `humanitarian` | `military` | `diplomatic`.
- `family` — for Ring-3-family rows, a `RING3_SENSITIVE_FAMILIES` slug (triggers §3.6 + enabling-rejection enforcement).
- `source_tier` — record the highest tier used (`icty` / `icj` / `un` / `museum` / `bb`).
- `trigger` — mechanical predicate (territory %, flag, OSID control, turn range). **Never a bare calendar window** (§1.3 #11).
- `once: true` for one-shot historical records.
- `effects` / `dimension_shifts` — for atrocity events, perpetrator faction takes negative `international_standing` / `territorial_legitimacy`. **Never positive `territorial_legitimacy` and never `recruitment_modifier > 1.0` on a sensitive option** (F2 CRITICAL).
- **No response options** for informational-only rows. For Ring-2-choice rows, options are institutional/diplomatic only, with ≥2 punitive markers each.

### `source_note` provenance-only structure (EXACT phrases the gate requires)

Standard sensitive-history row (non-barracks) — must include all three REQUIRED_BOUNDARY_PHRASES plus the prevention-framing phrase:

> "Existing ICTY/UN and project sources ground the row's provenance and institutional context. This note **adds no casualty figures**, **causal claims**, **prohibited player choices**, or **alternate-outcome prevention framing**."

Barracks-family row — uses the equipment + alternate-outcome variant instead:

> "...This note **adds no casualty figures**, **equipment quantities**, **causal claims**, **prohibited player choices**, or **alternate-outcome framing**."

Boundary-phrase requirements (from `tests/codex_sensitive_history_source_notes.test.ts`):
- ALL rows must contain: `adds no casualty figures`, `causal claims`, `prohibited player choices`.
- Non-barracks rows must contain: `alternate-outcome prevention framing`.
- Barracks rows must contain: `equipment quantities` AND `alternate-outcome framing`.
- FORBIDDEN tokens anywhere in any sensitive `source_note` (case-insensitive): `prevent genocide`, `prevented genocide`, `reward`, `lever`.

§3.6 guard (Ring-3-FAMILY rows only — F2 audit `evaluateSection36Guard`): `source_note` must additionally contain BOTH a prohibition phrase (e.g. `must not`, `forbidden`, `prohibited`, `canon-gated`, `may not`, `re-author`) AND a sensitive-act keyword (e.g. `cleansing`, `displacement`, `paramilitary`, `atrocity`, `genocide`, `detention camp`, `hostage`). Example addendum for a Ring-3-family row: *"This row is canon-gated; its sensitive ethnic-cleansing framing must not be re-authored as a player choice."*

---

## 6. Per-event step plan (one family at a time)

Sequencing follows lowest-risk-first and groups by historical family. One event family per commit (matches localization-LQA plan discipline). Do not bundle.

- **Wave A — 1992 informational record (lowest risk).** Candidates 1, 5, 6 (Bijeljina, Višegrad, Zvornik): informational-only, no options, perpetrator dimension penalties. Then candidate 3 (breadline shelling). Each: historian draft → canon ring-check → §6 panel (historian + narrative-designer) → add id to source-notes test → F2 gate.
- **Wave B — camp + Foča record (process-stays-Ring-2).** Candidate 2 (Prijedor complex) and candidate 4 (Foča territorial-cleansing dimension only; SV dimension essay-only, RING-3 REFUSAL). Convene adds `/game-designer` to confirm no camp-subsystem (#2) creep.
- **Wave C — 1994 diplomatic-response rows.** Candidates 12 (`markale_un_response_1994`) and 7 (`tuzla_konvoj_jna_1992`, contested — barracks-wording discipline). Ring-2 with institutional/diplomatic choices only; convene adds `/war-or-game` for the option set.
- **Wave D — 1995 endgame + safe-area family (highest sensitivity).** Candidates 10 (`zepa_negotiated_evacuation_1995`), 11 (`un_safe_area_enforcement_1995`, Ring-3 family → §3.6 mandatory), and 9 (`srebrenica_column_breakout_1995` — informational-record-only; player-choice form is RING-3 REFUSAL #10). Full convene + **user approval** for any reward-adjacent or rupture-adjacent surface.
- **Conditional — candidate 8** (`sarajevo_breadline_siege_continuum`): author ONLY if it does not collide with the P3 continuous-siege design decision (COMMAND_BOARD line 49). Otherwise hold.

Each wave ends with the full verification gate (§7) and a `docs/PROJECT_LEDGER.md` entry.

---

## 7. Test / verification gates (run on every authoring commit)

```powershell
# Provenance-only source-notes gate (the named test) — add new id to SOURCE_NOTE_EVENT_IDS first
npx.cmd vitest run tests\codex_sensitive_history_source_notes.test.ts --reporter=dot

# F2 strict canon-gate audit (CRITICAL + WARNING must be 0)
npx.cmd vitest run tests\sensitive_history_canon_gate_audit_strict_gate.test.ts --reporter=dot
npx.cmd tsx tools\diagnostics\sensitive_history_canon_gate_audit.ts --violations-only

# Event integrity + taxonomy (catalog structure, ordering, references)
npx.cmd vitest run tests\event_timeline_integrity.test.ts tests\event_loader.test.ts tests\sim\events\event_taxonomy_report.test.ts --reporter=dot

# Codex inventory + source-quality (claim/citation accounting)
npx.cmd vitest run tests\codex_sensitive_claim_inventory.test.ts tests\codex_source_quality.test.ts --reporter=dot

# Typecheck + whitespace
npm.cmd run typecheck
git diff --check
```

Acceptance per event: all above green; F2 audit CRITICAL = 0 and WARNING = 0 (INFO permitted); the new id present in `SOURCE_NOTE_EVENT_IDS`; no scenario hash drift unless the event is wired to fire in a baseline scenario (if so, baseline-regression with explained delta). No `Math.random`/`Date.now` introduced.

---

## 8. Risks

- **Canon violation (ring misplacement).** Authoring a refused surface as a choice (e.g. a Foča-SV or Srebrenica-column "decision"). *Mitigation:* §6 step-2 ring-check is mandatory and explicit; Gate §8 life-lesson 2 — no ring, no event.
- **Prosecutorial-wording drift.** Euphemism/minimization/second-person creep in `narrative`/`source_note` (§4 Forbidden). *Mitigation:* `/narrative-designer` sign-off; informational-only default; provenance-only `source_note`.
- **Gamification / lever creep.** A sensitive option carrying a reward-adjacent shift (positive `territorial_legitimacy`, `recruitment_modifier > 1.0`). *Mitigation:* F2 strict gate CRITICAL; default to no-options rows.
- **Calendar railroading.** A turn-window-only trigger substituting for a mechanical predicate (§1.3 #11). *Mitigation:* canon-review trigger check; F2/event-loader.
- **Name-pool collision.** A new id randomly selected by a bot generator (Stupčanica-95 precedent). *Mitigation:* confirm id absent from `src/sim/combat/operation_names.ts` pools; add static exclusion if needed.
- **Duplication with existing rows** (e.g. #10 vs `zepa_falls_1995`, #9 vs `srebrenica_falls_1995`). *Mitigation:* §3.1 baseline cross-check before drafting.
- **Branch collision** with the P1 Dynamic Codex lane (the 3 uncited rows) and the Event-system semantics packet (no runtime branch behavior yet). *Mitigation:* author event-data rows only; defer runtime branch semantics.

## 9. Rollback

Each event is one row in one `war_19xx.json` file plus one id added to `SOURCE_NOTE_EVENT_IDS`, committed per-family. Rollback = revert the single authoring commit; no engine/schema/migration changes, so no save-compat or baseline-hash risk for informational-only rows. If an event was wired to fire in a baseline scenario and shifted the hash, rollback restores the prior baseline byte-for-byte.

## 10. Owner & sign-off

- **Author:** Historian (Content/Codex hat).
- **Panel (§6):** `/historian` + `/narrative-designer` minimum; + `/game-designer` (ring-safety) and `/war-or-game` (realism) for any option-bearing or reward-adjacent row; + `/canon-compliance-reviewer` ring-check.
- **User approval:** required for any reward-adjacent surface and any rupture/condemnation-flag candidate (not delegable, Gate §6).

## 11. Definition of Done

- All 12 candidates adjudicated: authored (informational or Ring-2-choice) OR formally recorded as RING-3 REFUSAL with rationale, OR deferred against a named design decision.
- Every authored row passes §7 gates (source-notes test green with id registered; F2 CRITICAL+WARNING = 0; event-integrity/typecheck green).
- Each authored family has a `docs/PROJECT_LEDGER.md` entry and a §6 panel record.
- COMMAND_BOARD P2 line 48 updated to reflect remaining backlog (CLOSED when all 12 are adjudicated and authored/refused).
- No new rupture, condemnation flag, runtime branch behavior, or `FORAWWV.md` edit introduced by this lane.
