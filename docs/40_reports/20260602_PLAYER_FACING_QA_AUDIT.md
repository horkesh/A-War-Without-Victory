# Player-Facing UI QA Audit — 2026-06-02

Six parallel cluster audits of every player-facing surface (Desk/Command/Decision-Room, Army HQ, Decisions/Events/Inbox, Codex/Chronicle/Records/Aftermath, Diplomacy/HUD, + a dedicated raw-ID sweep). Goal (owner directive): **no raw internal IDs or leaked dev diagnostics anywhere in player-facing UI**; thorough pass for jargon, placeholders, and localization gaps.

**Key finding:** the codebase already has comprehensive resolvers (`getPlayerSafeCorpsName`, `getPlayerSafeMilitaryFactionName`/`PoliticalFactionName`, `getOsidDisplayName`/`humanizeOsid`, `getPlayerSafeEnclaveName`, `formatCombatOutcome`, sector `display_name`, etc.). Almost every surface uses them. The leaks below are (1) spots where a resolver exists but wasn't wired, (2) a few dev diagnostics that aren't dev-gated, (3) a systemic hardcoded-English/i18n gap. All fixes are **UI-display-only → byte-identical** to the simulation.

---

## P1 — Raw-ID / slug leaks + un-gated dev diagnostics (the core "no raw IDs" directive)

### Batch A — Operation slug names (highest-leverage; ~7 sites, one adapter fix)
Engine code paths produce slug/ID names that flow straight to the player: `Emergency Defense (arbih_1st_corps)`, `probe_arbih_1st_corps_t12`, `HQ: …`, `cmd_<corps>_t<turn>`, `sync_<corps>_<corps>` (corps_operation_helpers.ts / army_hq_*.ts). Rendered raw in OperationsSection, ArmyHQCorpsCard, OperationsPanel, CorpsDetail, CorpsFrontPanel.
- **Fix:** new `getPlayerSafeOperationName(op)` (pass authored catalog names; humanize slug names — resolve embedded `corps_id` via `getPlayerSafeCorpsName`, drop `_t<turn>`). Apply at the adapter boundary `GameStateAdapter.ts:1146` so all consumers are safe. (UI boundary only — do NOT change the engine `op.name`, that would break determinism.)

### Batch B — DirectiveCard + Decision-Room corps/target captions
- `DirectiveCard.tsx:55-63` `targetLabel()` falls through to raw `directive.corpsId` (replace_co/request_op → "Replace commander · arbih_1st_corps"), raw `proposalId` (authorize_op), raw `brigadeId` (elite_deploy). Render sites `:325/:343`.
  **Fix:** resolve `corpsId` → `gameState.formations.find(f=>f.id===corpsId)?.name`; return `null` (omit ` · {tgt}`) for proposal/brigade cases. Cleaner: read-model populates a display-only `payload.targetLabel`.
- `presidentialDecisionRoom.ts:767` elite-deploy title `'Reserve request: {corps}'` passes raw `request.corps_id` → "Reserve request: arbih_1st_corps". Sibling replace_co/request_op (`:721/:840`) already resolve via `formation.name`. **Fix:** resolve from `state.formations`.
- `DirectiveCard.tsx:421` request-op input placeholder/aria: "Target settlement (OSID, e.g. bihac_1)" — asks the player to type a raw OSID. **Fix:** drop "OSID", use a settlement example/name; longer-term a settlement picker.

### Batch C — Diplomacy / Patron Relations faction slugs + map OSID
- `diplomacyView.ts:96-110/239/242` + `DiplomacyPanel.tsx:91` (`diplomacy.factionChannel`) interpolate raw `RS`/`RBiH`/`HRHB` into stance summaries, "{faction} channel", timeline detail. **Fix:** route every `actor.faction` through `getPlayerSafeMilitaryFactionName` (one helper clears all three P1 slug leaks).
- `MapContainer.tsx:3493` radial-menu OSID label `osid.split(':').pop().replace(/_/g,' ')` → raw fragment. **Fix:** `getOsidDisplayName(osid, osidDisplayNames)`.
- `DiplomacyOverview.tsx:36/93/113` `PATRON_LABELS[faction] ?? faction` slug fallback → `getPlayerSafeMilitaryFactionName`.

### Batch D — Authored-Choices / Chronicle / Verdict diagnostics + ids
- **`DecisionHistoryOverlay.tsx:194` `[family={family}]` renders on EVERY Authored-Choices row, NOT dev-gated** (P1 — same class PR #130 just dev-gated in the Codex). **Fix:** dev-gate (`devMode`) or remove.
- `DecisionHistoryOverlay.tsx:245-254` "downstream descendants" renders raw event ids → resolve titles via `eventCatalog.get(id)?.title`.
- `VerdictScreen.tsx:510` renders `{g.ghost_id}` slug → humanize/title (keep slug only in `data-*`).
- `generateChronicleEntries.ts:420` chronicle title falls back to raw `event.id` → `getPlayerSafeDisplayLabel`.
- `decisionConsequenceLedger.ts` reserveDetail `humanizeToken(record.corps_id)` → "Arbih 1st Corps" (faction slug leaks as a word); peace/dayton/paramilitary/convoy details render raw faction slugs. **Fix:** formation/faction resolvers.
- `VerdictScreen.tsx:799/807/814` Dayton join paths render raw keys (the `formatDaytonPackageLabel`/`formatDaytonPatronOverride` helpers exist but aren't called).

### Batch E — Decision modals (faction/enclave/diagnostics/enums)
- `CounterOfferModal.tsx:38/101-102` raw faction slug in title + split headings → `getPlayerSafePoliticalFactionName` (special-case `PLAYER`).
- `ConvoyDecisionModal.tsx:77` raw enclave id as title → `getPlayerSafeEnclaveName` (exists, unused).
- `ParamilitaryReviewModal.tsx:132` raw `request.faction` → faction resolver.
- **`EventDecisionModal.tsx:374/382` "Family: X | Source: Y" + "Ancestry: <raw event_ids>" diagnostics** (+ `:293/308` "calibration"/"bot-controlled factions" designer language; `:440` "player-facing" leaks). **Fix:** dev-gate the diagnostic block; reframe the historical-default copy in-world; resolve ancestry ids → titles.
- `EventDecisionModal.tsx:135` / `EventModal.tsx:92` `negotiation_capital` shows raw `effect.dimension` id (`patron_confidence` etc.) → dimension display-name helper.
- `PeacePlanModal.tsx:200` bot responses render raw enum "accepted/rejected" → keyed/labeled.
- `inboxItems.ts:201` "Sensitive History Design Gate" internal term in a player subtitle → remove/reframe.

### Batch F — Army HQ enums + faction slugs
- `CorpsFrontPanel.tsx:499` `sector.opposing_factions` raw `{f}` → `getPlayerSafeMilitaryFactionName`.
- Raw enums shown via `.replace(/_/g,' ')` / `.toUpperCase()` where resolvers exist: `commander_assessment` (CorpsFrontPanel:709, OperationsSection:323), `recovery_reason` (OperationsSection:439), corps/sector stance (CorpsDetail:377, CorpsFrontPanel:305 — `STANCE_LABELS`/`formatPosture` exist), battle/engagement outcome (SectorsSection:154, OrbatSection:196 — `formatCombatOutcome` exists, unused), axis status (OperationsSection:386), AAR grade-factor keys (OperationsSection:467-470), `min_attack_outcome` (OperationsPanel:427).
- `OperationsSection.tsx:639` request-op "Objective OSID (e.g. bihac_1)" raw-OSID text box (same as Batch B's DirectiveCard one).

---

## P2/P3 — Jargon, placeholders, formatting (thorough-pass polish)
- **Jargon to reword/gloss:** "OSID" (VerdictScreen:731, generateChronicle:139, the two OSID input boxes), "Patron Override Authority"/"Negotiation Capital" + raw "(Composite: 123)" (DiplomacyOverview), "foreclosed" (DecisionHistoryOverlay:209), "SITREP", "ORBAT", `IVP` (banded OK), `severity` enum in WarroomStatusBar:101.
- **Placeholder/unfinished:** `cat_home_front` category permanently empty (presidentialCategories.ts:97 — wire sources or empty-state); Autonomy levels 2/3 permanent "soon" tags; "Territory/Casualty summary unavailable" (SituationTab — verify intentional).
- **Formatting:** raw turn numbers `T{turn}`/`W{n}` vs dates; snake_case enums surfaced by `.replace(/_/g,' ')` across many components; `entry.phase.slice(0,5)` truncation (OperationsSection:218).

## i18n gap (large, systemic — own effort)
Hardcoded English (renders English under BCS) in: `DirectiveCard.tsx`, `presidentialCategories.ts`, `PresidentDeskShell`/`DeskPacket`/`ConsequenceStrip`, the 5 secondary decision modals (Paramilitary/Officer/Intelligence/Reserve/CounterOffer), `PeacePlanModal.tsx`, `decisionSurfaceRegistry.ts` copy, `DecisionHistoryOverlay.tsx`, two `CodexPanel` sections, all of `generateChronicleEntries.ts`, `DiplomacyOverview.tsx`, `mapModes.ts` + the map-layer toggles, the PersonnelContent mobilization/trait labels, ORBAT/CorpsDetail literals, the Army-HQ request-op/pushback flow.
- **Recommendation:** add EN keys now; defer BCS (sensitive-content gate) — same EN-keys-now/BCS-falls-back pattern used elsewhere today. Track separately; do NOT block the P1 leak fixes on it.

---

## Fix sequencing
P1 batches A–F are largely disjoint by file (shared helpers: only Batch A edits `playerSafeText.ts` to add `getPlayerSafeOperationName`; enum-label maps live in each batch's own files or `formatters.ts`; P1 fixes avoid new i18n keys — they swap raw ids for resolved names via existing helpers). Dispatch in 2 waves (3 at a time) to manage CI + worktree collisions. All byte-identical (UI-only). Jargon + i18n follow as separate tracked efforts.
