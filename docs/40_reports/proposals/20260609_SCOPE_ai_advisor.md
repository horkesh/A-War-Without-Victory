# Scope — AI Advisor feature (orphaned-wiring finding #1)

**Date:** 2026-06-09
**Type:** READ-ONLY scope. No code changed.
**Source finding:** `docs/40_reports/proposals/20260609_ORPHANED_WIRING_AUDIT_ui.md` #1 — "AI Advisor feature wholly unreachable."
**Question for owner:** ship the AI Advisor for 1.0, cut it, or defer it.

---

## TL;DR

The AI Advisor (and its sibling AI-Commander **config** panel) is **built end-to-end and is functionally complete**, except for **one thing: there is no UI entry point**. No toolbar button, menu item, or hotkey opens either the advisor panel or the settings panel that holds the API key. The backend (prompt builder, Anthropic client, response parser, IPC handler) is real and wired — it just can never be invoked from the running app.

**Recommendation: DEFER past 1.0 (do not cut, do not ship as a default-on 1.0 feature).** Shelve it cleanly behind a dev-only entry point and document it as a post-1.0 premium feature. Reasoning below. The wire-up to make it *reachable* is small (~25–40 LOC) but the *shippable-for-1.0* bar is much higher (BYOK key UX, cost/consent, fog-safety review, offline polish) and it does not fit the core "president commands through generals" loop that 1.0 is built around.

---

## 1. What exists (completeness trace)

The chain is **complete end-to-end** — not stubbed. Verified file-by-file:

| Layer | File | State |
|---|---|---|
| Panel (render) | `src/ui/map/components/AiAdvisorPanel.tsx` | **Complete.** Renders commander name, assessment, sorted recommendations (deterministic `strictCompare` tiebreak), loading spinner, dismiss. Graceful `if (!response) return null`. i18n keys present in EN + BCS (`advisor.*`, `messages.en.ts:2099-2105`). |
| Panel mount | `src/ui/map/App.tsx:1544-1549` | **Mounted** but gated on `aiAdvisorOpen` state (`:492-493`). |
| Open trigger | — | **MISSING.** `setAiAdvisorOpen(true)` is never called anywhere. `setAiAdvisorResponse(...)` is only ever called with `null` (the onClose at `:1548`). Grep over `src/` confirms zero callers outside App.tsx's own declaration/mount/onClose. |
| Renderer IPC | `src/ui/map/desktop/useIPC.ts:211,477-479` | **Declared + wired** to `awwv.getAdvisorRecommendation`, with a non-desktop no-op fallback. **Never invoked by any component.** |
| Preload bridge | `src/desktop/preload.cjs:110` | **Wired** — `getAdvisorRecommendation` → `ipcRenderer.invoke('get-advisor-recommendation', payload)`. |
| Main handler | `src/desktop/electron-main.cjs:3175-3192` | **Fully built.** Deserializes state, reads `ai_commander_config`, refuses in `cadet` mode, resolves faction (`payload.faction ?? player_faction ?? 'RBiH'`), lazy-imports `ai_client` + `player_advisor`, calls `getAdvisorRecommendation`, returns the result or an `{error}` shape. |
| Advisor backend | `src/sim/ai_commander/player_advisor.ts` | **Complete.** (Audit said `.js` — that's the compiled artifact the handler imports; source is `.ts`.) Builds prompt, calls client, parses, logs decision, returns `AdvisorResponse`. Returns a graceful "AI Commander is not available" `AdvisorResponse` when `client` is null/unavailable. |
| Prompt builder | `src/sim/ai_commander/prompt_builder.ts:66-84,217-225` | **Complete.** `buildAdvisorPrompt` reuses the army-prompt state serialization, framed advisory: "The player commands `<faction>`. Analyze … top 3 priorities." Asks for strict JSON. |
| Anthropic client | `src/sim/ai_commander/anthropic_client.ts` | **Complete.** Wraps `@anthropic-ai/sdk` (`package.json` dep `^0.78.0`, present), `messages.create`, extracts text blocks, surfaces usage tokens + latency. |
| Client factory | `src/sim/ai_commander/ai_client.ts` | **Complete.** `createAiClient(apiKey)` returns `null` when no key (lazy SDK import). Interface abstracts provider (Anthropic-only today). |
| Parser | `src/sim/ai_commander/response_parser.ts:121-137` | **Complete.** `parseAdvisorResponse` strips code fences, safe-parses JSON, validates faction/context, returns `null` on unrecoverable failure. |
| Config + routing | `src/sim/ai_commander/ai_config.ts` | **Complete.** 4 modes (commander/officer/recruit/cadet). Advisor model routing: Opus 4.6 / Sonnet 4.6 / Haiku / `formula`. Default `cadet` (off). |
| Config panel | `src/ui/map/components/AiSettingsPanel.tsx` | **Complete** — API-key input, mode radios w/ cost labels. Calls `ipc.setAiCommanderConfig`. |
| Config panel mount | `src/ui/map/App.tsx:1527-1529` | **Mounted**, gated on `aiSettingsOpen` (`:489`). |
| Config IPC + handler | `useIPC.ts:469-475`, `preload.cjs`, `electron-main.cjs:3151,3164-3173` | **Wired** — get/set persist `state.meta.ai_commander_config`. |

**Completeness verdict: COMPLETE end-to-end, two missing entry points.** Both `setAiAdvisorOpen(true)` AND `setAiSettingsOpen(true)` are never called. This means the orphan is **deeper than the audit stated**: not only can you not open the advisor, you can't open the settings panel to enter an API key or leave `cadet` mode. So even if the advisor open-trigger were wired, it would always hit the `cadet`-mode refusal in the handler (`electron-main.cjs:3181`) unless the config panel is *also* made reachable. Test coverage exists and passes for the backend (`tests/ai_commander_*.test.ts`, `tests/ai_advisor_panel.test.ts`, `tests/ai_commander_ipc.test.ts`) — the dead wiring is purely the renderer entry point, which tests don't catch.

---

## 2. The missing entry point (what's needed to make it reachable)

Two triggers are needed (advisor depends on config being reachable first):

**(a) Open the AI settings panel** — so the player can enter a key + leave `cadet` mode.
**(b) Open the advisor + invoke the IPC** — a "Ask Chief of Staff" / "Counsel" action that:
  1. `setAiAdvisorOpen(true)` (panel shows loading spinner via `loading={!aiAdvisorResponse}`),
  2. `await ipc.getAdvisorRecommendation({ faction: playerFaction, context_type: 'situation_analysis' })`,
  3. `setAiAdvisorResponse(result)` (panel renders; `{error}` shapes fall through `response.assessment` gracefully — the panel reads `response.assessment ?? noAssessment`, but an `{error}` object has no `assessment`, so see "guard" below).

**Where it lives.** The codebase already has the exact pattern: `App.tsx`'s action dispatcher (`:1237-1240`) opens `AutonomyPanel` via an `action === 'autonomy_panel'` string, and `PresidentialToolbar` takes `onOpenDesk`/`onOpenRecords`/`onOpenCodex` callback props (`PresidentialToolbar.tsx:121-128`). The natural home is:
  - **Settings:** an `onOpenAiSettings` callback prop on `PresidentialToolbar` (or a dev-drawer entry — the toolbar already has a `devDrawerOpen`), → `setAiSettingsOpen(true)`.
  - **Advisor:** a "Counsel" button in the **Presidential Decision Room / warroom desk** (fits the "ask your Chief of Staff" framing — `advisor.title` is already "Chief-of-Staff Counsel"), or an inbox action. → the open+invoke handler above.

**Entry-point lift:**

| Piece | LOC |
|---|---|
| `onOpenAiSettings` prop + wire `setAiSettingsOpen(true)` (or dev-drawer item) | ~6 |
| Advisor trigger button in warroom/decision-room | ~10 |
| `handleAskAdvisor` async handler (open → invoke IPC → setResponse, with try/catch) | ~12 |
| Graceful guard so an `{error}` IPC shape renders as an assessment instead of a blank panel | ~6 |
| **Total to make it REACHABLE** | **~25–40 LOC** |

No sim/calibration path is touched — the advisor reads state read-only inside the Electron main process and never mutates `GameState` (it only appends to a decision log; it is not on the turn pipeline). **Determinism: SAFE** — confirmed it is an advisory overlay, invoked on-demand from the renderer, never from `war_phases.ts` or any turn step.

---

## 3. LLM dependency / offline degradation

- **Requires a live Anthropic API key + network.** `createAiClient(apiKey)` returns `null` without a key; `AnthropicClient` hits `api.anthropic.com` via `@anthropic-ai/sdk`.
- **Offline / no-key behavior is graceful at the data layer:**
  - No key → `player_advisor.ts:20-28` returns a well-formed `AdvisorResponse`: *"AI Commander is not available. Check your API key in settings."* with empty recommendations.
  - `cadet` mode → handler returns `{ error: 'AI Commander is in cadet mode…' }` (`electron-main.cjs:3181`).
  - Network/API error → `player_advisor.ts:59-68` catches and returns *"Communication error. Please try again."*
  - **Gap:** the `cadet`/`no-state` paths return a bare `{ error }` object, but `AiAdvisorPanel` reads `response.assessment` — an `{error}` shape has none, so the panel would render "No assessment available." rather than the error text. The ~6-LOC guard in §2 (map `{error}` → an assessment string before `setAiAdvisorResponse`) closes this.
- **No hard-fail offline.** Nothing throws to the renderer; worst case is the panel showing an empty/awaiting state. For a shippable desktop 1.0, an LLM feature that *requires* network is acceptable **only as opt-in** — the default (`cadet`) is already fully offline and the game is 100% playable without it. That is the right posture.

---

## 4. Fit + risk

**Product fit (1.0 = "president commands through generals"):**
- **Tension, not a clean fit.** The 1.0 frame is the player as *president* exercising 5 strategic levers *through* generals — the generals are the intelligence layer; the player's agency is constrained and political. An LLM "advisor that tells you the top 3 priorities" risks **flattening that constraint** into an optimizer's checklist ("attack here, fortify there"), which is closer to the AI-Commander *paradigm-shift* vision (a separate, larger, post-1.0 feature per `CLAUDE_AI_COMMANDER_DESIGN.md`) than to the tragic-agency 1.0 loop. The existing in-engine **Chief-of-Staff briefings / corps assessments** already deliver the diegetic "your generals advise you" experience *deterministically and offline*. The LLM advisor is largely redundant with that for 1.0.
- The naming was already softened toward fit: `advisor.title` = **"Chief-of-Staff Counsel"**, framed as staff counsel rather than an oracle. That's the right framing *if* it ships.

**Cost / latency / safety:**
- Cost (per design doc): advisor is the cheapest lane (~$0.005/call, on-demand only, ~$0.10/game). BYOK = zero cost to the studio. Real risk is **the broader AI-Commander program's per-game cost** ($1–$13/game), but the *advisor alone* is negligible.
- Latency: one synchronous round-trip per "Ask"; the panel already shows a spinner. Acceptable.
- Safety/content: design doc §"Content rating" flags military-strategic-only output; the system prompt should carry a content guard (atrocity content sensitivity). Not currently asserted in `buildAdvisorPrompt` — would need a guard line before ship.

**Fog / player-safe risk (IMPORTANT):**
- **The advisor prompt is NOT fog-filtered.** `buildAdvisorUserPrompt` reuses `buildArmyUserPrompt` (`prompt_builder.ts:223`), which serializes **`political_controllers` for ALL OSIDs** (full-map territory %, every corps' stance + active ops, both factions' supply reserves, negotiation breakdown incl. enemy `war_crimes_events`). It is built from **omniscient `GameState`, not the player's fog-of-war view.** Routed to the player's own faction, an LLM advisor would therefore **leak hidden enemy dispositions** into player-visible text ("VRS 2nd Krajina is at offensive stance toward Brčko"). For a player-facing advisor this is a **fog-safety defect**, not just a polish gap. Shippable advisor MUST build its prompt from the player-safe / adapter view (the same fog the UI renders), not raw `GameState`. This is additional, non-trivial work (a fog-filtered advisor prompt builder) beyond the entry-point wire-up.

---

## 5. Effort, done-definition, recommendation

**Effort tiers:**

| Tier | Scope | LOC / effort |
|---|---|---|
| **Reachable (dev/demo only)** | Wire both open-triggers + invoke + error guard. Gate behind dev-drawer so it's not a default 1.0 surface. | ~25–40 LOC, ~0.25 session |
| **Shippable as 1.0 player feature** | The above **+** fog-filtered advisor prompt (don't leak hidden enemy state) **+** BYOK key UX & consent ("this sends game state to Anthropic; costs apply") **+** content-safety system-prompt guard **+** polish the `{error}` → assessment degradation **+** a "premium/optional" framing in settings | ~0.5–1 session of code **plus** a fog-safety design pass + a privacy/consent decision (sending state off-device) |

**"Shippable" means:** opt-in, offline-safe by default (cadet), no hidden-info leak through the advisor text, explicit consent that state is sent to a third-party API, and graceful error rendering. The minimum *reachable* lift does **not** clear this bar — specifically it would ship a fog leak.

**Recommendation: DEFER (post-1.0), shelve cleanly. Do not cut, do not ship default-on for 1.0.**

Reasoning:
1. **It does not pull its weight in the 1.0 loop.** The deterministic Chief-of-Staff briefings + corps assessments already deliver "your generals advise you," in character, offline, free, fog-correct. The LLM advisor is redundant-to-mildly-dissonant with the president-through-generals frame for 1.0.
2. **The cheap part (reachability, ~30 LOC) is not the expensive part.** The fog-safety filter + BYOK consent UX + content guard are the real cost and risk, and they're the kind of thing that should not be rushed into a 1.0 desktop ship.
3. **It's a natural premium / post-1.0 hook.** The whole AI-Commander program (`CLAUDE_AI_COMMANDER_DESIGN.md`, v0.4.5/v0.5.4 plan) is explicitly designed as an optional premium layer with BYOK billing. The advisor belongs with that program, not bolted on for 1.0.
4. **Don't cut** — the backend is complete, tested, and determinism-safe; deleting it discards real, working work and a clear post-1.0 differentiator.

**Concrete defer action (cheap, honest):** leave the backend in place; either (a) gate a single entry point behind the existing dev-drawer so it's demoable but not a player-facing 1.0 surface, or (b) add a one-line "AI Commander — coming after 1.0" note where settings would live. Document in the roadmap that the advisor ships with the AI-Commander program and that the **fog-filtered prompt + BYOK consent are prerequisites**. If owner instead wants it in 1.0, the gating item is the fog-safety prompt rewrite, not the entry-point LOC.

---

## Determinism note

The advisor is invoked on-demand from the renderer, runs in the Electron main process, reads state read-only, and never mutates `GameState` or participates in any turn-phase step. It is **off the sim/calibration path entirely**. `anthropic_client.ts` uses `Date.now()` for latency telemetry — that lives in the non-deterministic command/IPC layer (same class as player input), not in sim code, so it does not violate the determinism rule. No calibration impact from wiring or shelving this feature.
