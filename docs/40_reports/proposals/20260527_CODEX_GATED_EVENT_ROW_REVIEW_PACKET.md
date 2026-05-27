# Codex Gated Event Row Review Packet

**Date:** 2026-05-27
**Status:** Proposal / review packet

## Scope

This packet covers the three event rows that remain uncited after the Phase 1 and Phase 2 provenance-note passes:

- `croat_bosniak_war_begins_1993`
- `visit_to_front_hrhb`
- `federation_ground_offensive_1995`

No runtime event data is changed by this packet.

## Row 1 - `croat_bosniak_war_begins_1993`

**Current risk:** The narrative combines "full-scale fighting" across central Bosnia/Herzegovina, HVO "coordinated offensives," Vance-Owen/Croatian pressure causality, and the clause that sporadic clashes "escalates into systematic ethnic cleansing on both sides." Inventory flag: `sci_bc285e6277902fa0`, `sensitive_history_gated`, uncited.

**Why gated:** The row combines broad war-causation, actor intent, operational coordination, and reciprocal ethnic-cleansing framing. Balkan Battlegrounds supports the Croat-Muslim war and Vance-Owen context, but the "systematic ethnic cleansing on both sides" sentence is too broad for provenance-only source-note treatment.

**Needed evidence:** Minimum trail is BB1 p.225 for Croat-Muslim descent into war and Vance-Owen trigger context; BB1 p.219 for the war erupting in force by summer 1993 and Croat-Muslim alliance dissolution; `ARBIH_HVO_HOSTILITIES_TIMING.md` for 1993 timing synthesis. For ethnic-cleansing/systematic framing, require ICTY Prlic, Kordic, Blaskic, and Hadzihasanovic-style sources with side-specific attribution and no invented symmetry.

**Possible later safe direction:** Narrow wording to sourced breakdown/open-war context and add a source note that says the row abstracts Croat-Muslim war onset, not a complete legal finding. Do not retain "systematic ethnic cleansing on both sides" unless fully sourced and reviewed.

**Stop gates:** Stop if the source trail does not separate military escalation from sensitive-history/legal findings. Stop if wording implies equal culpability, planned bilateral cleansing, or broad "both sides" claims without tribunal-grade support. Stop if any change touches triggers/effects.

## Row 2 - `visit_to_front_hrhb`

**Current risk:** The `visit_press_hrhb` response description says the tour should show civilians on the Croatian side and "avoid the detention camps"; the broader row also implies a managed HRHB presidential/press tour of HVO fronts. Inventory flag: `sci_c15ab461aad6f5c8`, `sensitive_history_gated`, uncited.

**Why gated:** The detention-camp phrase is sensitive-history content inside a player-facing command option and lacks a same-row source trail. Existing reports already classify `visit_press_hrhb` as blocked-sensitive. BB/knowledge docs support HVO Mostar/Central Bosnia context, but not this specific managed press-tour/detention-avoidance scenario.

**Needed evidence:** Minimum trail is the HVO detention-camp section in `docs/40_reports/1993_EVENT_RESEARCH.md`; ICTY Prlic et al. for Dretelj/Gabela/Heliodrom; BB1 p.41 for international detention-camp access context generally. HVO OOB/Mostar context can only be background, not proof of press management. The specific "press tour avoiding camps/civilians staged" framing needs evidence or must be explicitly treated as fictionalized command-presence abstraction.

**Possible later safe direction:** A source note alone is probably not safe while the phrase remains. Either remove/neutralize the detention-camp press-management phrase or explicitly mark the front-visit row as a fictional command-presence abstraction with no new camp disclosure claim.

**Stop gates:** Stop if evidence only proves camps existed but not the press-management claim. Stop if wording turns camp avoidance into a player optimization lever. Stop if adding notification copy for the blocked press option. Stop if any change touches option effects.

## Row 3 - `federation_ground_offensive_1995`

**Current risk:** The row states "Coordinated ARBiH and HVO ground forces, supported by Croatian Army units," "rapidly captures Sipovo, Jajce, Mrkonjic Grad, and Kljuc," reduces Republika Srpska territory from roughly 70 percent toward 49 percent, and says the VRS "cannot hold." Inventory flag: `sci_910042d1ac7c5dfc`, `safe_factual_correction`, uncited.

**Why gated:** This is primarily operational overclaim/dynamic-outcome risk rather than sensitive-history. It states fixed captures and territorial percentage outcomes in runtime prose while scenario state may diverge. It needs operational source trail and live-state wording review before source-note treatment.

**Needed evidence:** Minimum trail is BB2 late-war western Bosnia/1995 campaign pages for the Mistral/Sana/Southern Move sequence; BB2 index trail around Kljuc, Sanski Most, Bosanski Petrovac, Jajce, Mrkonjic Grad, and Sipovo; ICTY Gotovina and Karadzic judgments for Croatian Army/Federation offensive context; Contact Group/Dayton territorial line sources for 51/49 or 49 percent framing. Verify which towns belong to this row versus separate `operation_sana_1995`.

**Possible later safe direction:** Distinguish fixed historical context from live simulation outcome: a source note can cite the historical late-1995 Federation/Croatian offensive arc, while runtime text avoids asserting captures unless state confirms them.

**Stop gates:** Stop if wording asserts specific captures or 70-to-49 territorial reduction without state predicate or approved historical-only framing. Stop if source trail conflates Sana, Mistral/Maestral, Southern Move, and the Dayton halt into one undifferentiated operation. Stop if any change proposes mechanics/effects.

## Verification For Future Runtime Edits

Any accepted runtime edit from this packet should run:

```powershell
npx.cmd vitest run tests\codex_sensitive_history_source_notes.test.ts tests\event_timeline_integrity.test.ts tests\codex_sensitive_claim_inventory.test.ts tests\codex_source_quality.test.ts --reporter=dot
node --check tools\diagnostics\codex_sensitive_claim_inventory.cjs
node tools\diagnostics\codex_sensitive_claim_inventory.cjs --json
npm.cmd run typecheck
git diff --check
```

Scenario or baseline proof is required only if effects, triggers, decision options, or live-state behavior change.
