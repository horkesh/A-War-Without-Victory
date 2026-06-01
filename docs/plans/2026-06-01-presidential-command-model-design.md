# Presidential Command Model (v1.0) — Design

**Status:** LOCKED 2026-06-01 (owner). Supersedes the parked "Free War Phase 1 — emergent military" (bot-priority tuning, proven macro-inert over 3 attempts; see `docs/PROJECT_LEDGER.md` 2026-06-01 closeout). Grounded in ICTY-sourced research (Karadžić IT-95-5/18-T, Mladić IT-09-92, Prlić et al. IT-04-74-T, Halilović IT-01-48; UNSCR 942) + grand-strategy design precedent.

## 1. The player's role
The player is the unnamed **president** — the political leader of one faction (RBiH / RS / HRHB). They command the war **politically, through their generals — never as a general.** The design soul is unchanged: negative-sum, constrained agency, no power fantasy, "authorship of the tragedy." Determinism is sacred; the bot/commander layer remains historically faithful (it is the calibrated backdrop the player's choices play against). **Divergence comes from the president's strategic-political choices flowing through a living command chain — not from the bot fighting a different war, and not from the president micromanaging operations.**

## 2. The five command levers (1.0)

| # | Lever | What the president does | Build status |
|---|---|---|---|
| 1 | **Authorize op** | Approve an operation a commander proposes | EXISTS (back-the-officer / proposal approval) |
| 2 | **Request op** | Direct a commander toward a strategic objective ("take Bihać"), even against his military judgment | NEW — reuses the merged op staging/injection substrate (#100/#101/#102) |
| 3 | **Stop op** | Halt a live operation to bank political capital | NEW |
| 4 | **Authorize elite deployment** | Release elite/special units to a front or operation | NEW |
| 5 | **Replace a corps CO** | Sack / install a commander, at a cost | NEW |

**Out of scope for 1.0 → post-1.0 / DLC:** the president does NOT pick brigades/axes or plan operations himself. That is the general's domain. The merged author-op *engine* (validated staging + injection) is 1.0 substrate; the brigade-picker *UX* on top of it is deferred to DLC.

## 3. Two resolved design questions

### 3.1 "Refuse a patron demand" is NOT a sixth lever — it is the event layer
Refusing the patron stays a **response option inside a triggered patron-demand decision-event**, resolving into the existing `patron_confidence` dimension → supply chain, faction-scaled. A standing "defy patron" button is flavorless — a refusal is only a real decision when there is a concrete demand on the table with a known price (accept this map / stand down this corps / accept this ceasefire). History was *both* discrete (Pale's Aug-1994 rejection of the Contact Group plan → the Belgrade blockade, UNSCR 942) and continuous (Milošević's slow distancing from Karadžić), and the repo already encodes both layers. Game precedent: EU4 overlord interactions / CK3 liege demands / Suzerain narrative demand-events (event-shaped refusal = good) vs HOI4's autonomy slider (meter-only = the flavorless anti-pattern).

**⚠ Build prerequisite:** two parallel patron meters exist — `negotiation.patron_relationships[].override_authority` and `faction.patron_state.material_support_level`. Verify refusal routes into a real SUPPLY consequence end-to-end before building any patron surface, or refusal silently no-ops (the dead-channel failure mode).

### 3.2 Forcing an op over objection: pushback shown BEFORE, consequence authored AFTER
When the president **requests/forces an op the commander recommends against**, the commander's objection is shown **pre-commit** — but as a **disposition-colored professional judgment** (competence / stubbornness / political-reliability / override-tolerance), never a clean win-%. The president forces it → pays political capital → the officer is cowed (degraded future judgment), or past tolerance resigns / launches autonomously / triggers a relief crisis → a **consequence-receipt** closes the "you were warned by [officer] on week N and overrode him" loop.

- Pure-before collapses into a solved puzzle ("always obey the red number") and sands down the political-vs-military tension.
- Pure-after reads as the engine hiding information — manufactured unfairness, not tragedy.
- The honest middle preserves agency without solving the puzzle: **the number is never the decision; the source is.** This is also the authentic friction — leaders rarely lacked warnings; they overrode sound warnings for political reasons.

## 4. Faction asymmetry (emerges from data, not `if faction ==`)

| | Request / force op | Replace a CO | Refuse patron |
|---|---|---|---|
| **RS** | high cost (Directive-7-style culpability) | **severe — officer-corps revolt risk (Mladić; Aug-95 7-day paralysis)** | **Milošević blockade → supply collapse (bites in 1995)** |
| **RBiH** | medium | usable (Halilović→Delić, Nov 1993, worked) | n/a — no coercive patron; constraint is the arms embargo |
| **HRHB** | low — Zagreb's call anyway | n/a — Zagreb sacks them (Boban→Zubak, Feb-94) | near-total dependence on Tuđman; steepest stakes (−25 patron_confidence already encoded) |

RS = constitutionally supreme but practically weak (every lever risks insubordination or a Belgrade blockade); RBiH = firmest civilian control; HRHB = barely autonomous, model as patron-gated. The mechanisms are symmetric; only the **data** (officer dispositions, patron dependence) differs.

## 5. Historical note — the Bihać "stop order"
The popular recollection that "Karadžić ordered Mladić to stop at Bihać" is **not verifiable** as a discrete order in the ICTY record. The documented reality: (a) the VRS deliberately **strangled rather than stormed** Bihać (~500 yds from the hospital, 27 Nov 1994) to avoid decisive NATO escalation; (b) the **Carter-brokered four-month ceasefire (Dec 1994), negotiated at Pale with Karadžić** — political leadership trading a winning battlefield position for diplomatic standing. The *lever* ("halt a winning op for political capital") is authentic; attribute it to the ceasefire / strangle-restraint, not a stop-order.

## 6. Open tuning (set during build, owner-adjustable)
- Command-authority cost per lever (request / stop / elite-deploy / replace-CO) and `patron_confidence` deltas. Engineer proposes values; owner adjusts.
- Whether **elite deployment** is a binary release gate or has tiers.

## 7. Build order
0. **Verify the two patron-meter wiring** (dead-channel check) — prerequisite, cheap.
1. **Request-op + Stop-op directives** — reuse the merged staging/injection engine; smallest, highest-flavor.
2. **Disposition-tinted pushback card** on force-op (AuthorizePhase) + authored consequence.
3. **Replace-CO at cost** — faction-asymmetric (RS revolt risk).
4. **Elite-deployment gate.**
5. **Patron-demand-event consolidation + consequence-receipt wiring.**

Each slice is player-only → historical/headless **byte-identical by construction** (a staging field absent in headless, like the merged `pending_authored_op`). Determinism: no `Math.random` / `Date.now`; sorted iteration via `strictCompare`.

## 8. Provenance
Owner direction 2026-06-01 (this session). Memory: `player_command_model.md`. Research agents: political-military command (ICTY-grounded), patron-lever design, pushback-timing design. Related design doc: `docs/plans/2026-06-01-free-war-model-design.md`.
