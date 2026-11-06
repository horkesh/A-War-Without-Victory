# §6 panel — the event decision header carries an approved §6 still (D8), 2026-11-06

**Question:** [Phase F packet](../proposals/20261105_VISUAL_POLISH_PHASE_F_ASSET_QA_PACKET.md) D8. The June 2026 chain approved seven atrocity stills for placement ([20260610_SECTION6_ART_SIGNOFF.md](20260610_SECTION6_ART_SIGNOFF.md)) and #410 wired their `image` keys for the `EventModal`. Visual-polish Phase C (PR #526) renders an event's authored still a second time, as the `DecisionModalImageHeader` of `EventDecisionModal.tsx`, when that event requires a presidential decision. Same event, same still, one more surface.

**Convened by:** Claude (integrator), per the delegated §6 route in `AGENT_WORKFLOW.md`. Three seats, read-only, in parallel, on `claude/visual-polish-phase-f` at `27fd52753`.

**Outcome: CONFIRM by all three seats, each with one condition. Two conditions are applied in #526 (commit on `claude/visual-polish-phase-c`, 2026-11-06); the rest are recorded below.**

## Seats

**Historian — CONFIRM.** The June sign-off cleared the stills as consequence and record, never lever; the camps still is "one revealed place seen from outside the wire". The header takes the art only through the event's own `image` key, so it cannot move to another event (plan §8 holds). Only `concentration_camps_revealed_1992` (`data/scenarios/events/war_1992.json`) has response options; the other six stilled events (Drina valley, Ahmići, three Markale, Srebrenica, Žepa) have none, so the header never shows for them. The choice is how RS answers being exposed, not an order to commit an atrocity (gate §1 Ring 3 #1 not touched). *Condition:* the header set `imageAlt=""`, which marks the still as decoration; a §6 still needs short factual alt text naming the documented site, without casualty figures, and the dossier's historical-source line stays visible.

**Narrative Designer — CONFIRM.** It is the still's own event and the decision is about access to the camps, which is what the image shows: not decoration. The heavy fade keeps the still in the background; "Decision Required" / "Potrebna odluka" is the procedural label every decision carries, not an imperative aimed at the image. *Condition:* when the header shows a §6 still, the eyebrow uses the neutral accent, not the faction text class; RS red uppercase over a camp still reads as faction branding laid on the atrocity (gate §1 Ring 3, §4 tone). No wording change and no fallback to the category plate is needed. Any future §6 event that gains response options returns to this chain.

**Game Designer — CONFIRM.** The three RS options (deny, the historical default; obstruct; cooperate, permitting ICRC and press access) are postures toward exposure; none runs, expands or exploits a camp, and every option lowers RS international standing, so none is a reward. Showing the still above the choice gives the decision its proper weight. *Conditions:* (1) the image never changes with the option chosen; (2) category plates never fall back to a §6 still; (3) this confirmation does not cover the HELD enclave-overrun decision images (sign-off items 8.7, 8.9, 8.10), which need their own panel; (4) outside D8, for the record: under "deny" internal cohesion rises by 5, and the balance of that option deserves a separate look.

## Applied in #526

- `section6StillAlt()` in `src/ui/map/data/eventIllustrationArt.ts` owns the gated set (six event stills, keyed by basename) and returns a localised factual alt; `EventDecisionModal.tsx` passes it as `imageAlt` and switches the eyebrow to `text-accent-gold` whenever it is non-null. Category plates are not in the table, so they can never stand in for a gated still (Game Designer 2). The image is chosen from the event's `image` key before any option is taken and never re-resolved on choice (Game Designer 1).
- Alt text, EN and BCS, under `eventArt.alt.*` in `messages.en.ts` / `messages.bcs.ts` (one i18n commit). The camps alt reads "Camp perimeter seen from outside the wire, Prijedor area, 1992"; no figures.
- `tests/ui/decision_modal_art_wiring.test.ts` pins both: a §6 still renders a non-empty alt naming Prijedor and a gold eyebrow with no faction class, in both locales; a non-gated still keeps `alt=""`.

## Recorded, not done

- Held enclave-overrun decision images (8.7, 8.9, 8.10) stay held; their panel is separate (Game Designer 3).
- The "deny" option's +5 internal cohesion on `concentration_camps_revealed_1992` is a balance question for the Game Designer outside this packet (Game Designer 4).
- Any §6 event that gains `response_options` comes back to this chain before it ships (Narrative Designer).
