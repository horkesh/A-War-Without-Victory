/**
 * D1 Claude-as-President API surface (LANE-NIGHTSHIFT-D1-D2-CLAUDE-PERSONAS).
 *
 * Mirrors `api_commander.ts` at the political-directive layer. When the
 * faction-specific opt-in env flag is set AND a persona file exists for
 * that faction's president, this module makes a Claude API call producing
 * a structured political directive (verb, optional target_corps_id,
 * scratchpad reasoning).
 *
 * Output schema (returned from `producePresidentDirective`):
 *   {
 *     verb: PoliticalDirectiveVerb,
 *     target_corps_id?: string,
 *     scratchpad_reasoning: string,
 *     model_used, prompt_tokens, completion_tokens, latency_ms
 *   }
 *
 * Default-off contract: when no env flag is set, returns null without
 * touching the Anthropic SDK. The deterministic B1 producer (44053a32)
 * runs unchanged in that case.
 *
 * Predecessors: A1 18136710 / A2 ba6955bf / A3 c8ff93d8 / A4 93c75b1d /
 * B1 44053a32 / B2 d019bef7 / C1 5084071d / C2 f24ad5d7 / Q1 6cbcaa00 /
 * Q2 3bab0eb0 / Q3 aa30f349 / API-Bridge a2d564e6 / drina-fix 03ef9cd4.
 *
 * Sensitive-history compliance: Ring 0 / tooling-only QA harness; no engine
 * touch; no §6 surface. Faction-symmetric mechanism. Persona system prompt
 * is professional-diplomatic register; persona JSON files supply the voice.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { GameState } from '../../src/state/game_state.js';
import { strictCompare } from '../../src/state/validateGameState.js';
import { loadPersona, type Persona, type PersonaFaction } from './persona_loader.js';

// Local widening of Anthropic ContentBlock to support narrowed text-block
// extraction. The SDK's ContentBlock is a union (text | thinking | tool_use
// | etc.); we want only the text-typed entries.
type AnthropicTextBlock = { type: 'text'; text: string };

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * Closed enum of political-directive verbs the API path is permitted to
 * emit. Mirrors B1 producer's verb space; subset of operational+political
 * idiom that the deterministic substrate already understands.
 */
export type PoliticalDirectiveVerb =
    | 'hold_corridor'
    | 'consolidate_drina'
    | 'maintain_siege'
    | 'reject_partition_plan'
    | 'selective_advance'
    | 'defend_enclave'
    | 'negotiate'
    | 'preserve_republic'
    | 'accept_ceasefire'
    | 'mobilize_general'
    | 'consolidate_herzegovina'
    | 'hold_central_bosnia'
    | 'screen_arbih_axis'
    | 'accept_zagreb_directive'
    | 'accept_washington_framework'
    | 'no_directive';

const VALID_VERBS: ReadonlySet<string> = new Set<PoliticalDirectiveVerb>([
    'hold_corridor', 'consolidate_drina', 'maintain_siege', 'reject_partition_plan',
    'selective_advance', 'defend_enclave', 'negotiate', 'preserve_republic',
    'accept_ceasefire', 'mobilize_general', 'consolidate_herzegovina',
    'hold_central_bosnia', 'screen_arbih_axis', 'accept_zagreb_directive',
    'accept_washington_framework', 'no_directive',
]);

export interface ApiPresidentDirective {
    faction: PersonaFaction;
    leader_name: string;
    turn: number;
    verb: PoliticalDirectiveVerb;
    target_corps_id?: string;
    scratchpad_reasoning: string;
    model_used: string;
    prompt_tokens: number;
    completion_tokens: number;
    latency_ms: number;
}

// ─── Persona ID lookup per faction ─────────────────────────────────────────

const FACTION_TO_PRESIDENT_PERSONA_ID: Record<PersonaFaction, string> = {
    RBiH: 'izetbegovic',
    RS: 'karadzic',
    HRHB: 'boban',
};

const FACTION_LONG_NAMES: Record<PersonaFaction, string> = {
    RBiH: 'Republic of Bosnia and Herzegovina',
    RS: 'Republika Srpska',
    HRHB: 'Croatian Republic of Herzeg-Bosnia',
};

// ─── Env-flag opt-in gate ──────────────────────────────────────────────────

/**
 * Returns true iff the per-faction president-layer opt-in flag is set, OR
 * the wildcard ALL flag is set. Mirrors the api_commander.ts env-flag idiom.
 */
export function isPresidentLayerEnabled(faction: PersonaFaction): boolean {
    if (process.env.CLAUDE_AS_ALL === 'true') return true;
    if (process.env[`CLAUDE_AS_ALL_LAYERS_${faction}`] === 'true') return true;
    if (process.env[`CLAUDE_AS_PRESIDENT_${faction}`] === 'true') return true;
    return false;
}

// ─── Prompt assembly ───────────────────────────────────────────────────────

/**
 * Build the system prompt for the president-layer API call. Splices the
 * persona's `system_prompt_template` with a uniform schema-output stub.
 *
 * Determinism: pure function over (persona). No IO, no env reads, no random.
 */
export function buildPresidentSystemPrompt(persona: Persona): string {
    return `${persona.system_prompt_template}

Your output MUST be valid JSON matching this schema:
{
  "verb": "<one of the closed verb enum>",
  "target_corps_id": "<optional corps_id from your faction OOB>",
  "scratchpad_reasoning": "<2-3 sentences of your reasoning, in your voice>"
}

Use plain JSON. No markdown outside JSON.`;
}

/**
 * Build the user prompt for the president-layer API call. Surfaces:
 *   - Turn, faction, leader name.
 *   - Faction's territory share (placeholder — full state read is delegated
 *     to api_commander.ts; we keep this minimal because the political layer
 *     reasons over a coarser picture than the army-CO layer).
 *   - Recent fired events (last 5).
 *   - Schema reminder.
 *
 * Determinism: sorted iteration via strictCompare; no Math.random.
 */
export function buildPresidentUserPrompt(
    state: GameState,
    faction: PersonaFaction,
): string {
    const turn = state.meta.turn;
    const lines: string[] = [];
    lines.push(`Turn: ${turn}. Faction: ${faction} (${FACTION_LONG_NAMES[faction]}).`);

    // Coarse territory snapshot (count-based; area-weighted is delegated to
    // the army-CO layer). Determinism: sorted OSID iteration.
    const pc = state.political?.political_controllers ?? {};
    const counts: Record<string, number> = { RS: 0, RBiH: 0, HRHB: 0 };
    let total = 0;
    const osids = Object.keys(pc).sort(strictCompare);
    for (const osid of osids) {
        const f = pc[osid];
        total += 1;
        if (f !== null && counts[f as string] !== undefined) counts[f as string] += 1;
    }
    lines.push('');
    lines.push('TERRITORY (OSID count):');
    for (const f of (['RBiH', 'RS', 'HRHB'] as PersonaFaction[])) {
        const pct = total > 0 ? ((counts[f] / total) * 100).toFixed(1) : '0';
        lines.push(`  ${f}: ${counts[f]} OSIDs (${pct}%)`);
    }

    // Recent fired events.
    const firedEvents = state.military.fired_event_ids ?? [];
    if (firedEvents.length > 0) {
        lines.push('');
        lines.push(`RECENT EVENTS (last 5): ${firedEvents.slice(-5).join(', ')}`);
    }

    // Schema.
    lines.push('');
    lines.push(`Respond with ONLY valid JSON:
{
  "verb": "<one of the closed verb enum>",
  "target_corps_id": "<optional corps_id>",
  "scratchpad_reasoning": "<2-3 sentences>"
}`);

    return lines.join('\n');
}

// ─── Main entry ────────────────────────────────────────────────────────────

/**
 * Produce a political directive for the given faction's president via Claude
 * API call. Returns null when:
 *   - The per-faction env flag is not set, OR
 *   - No persona file exists for the requested president.
 *
 * Otherwise calls the Anthropic client with the persona system prompt + a
 * coarse state snapshot user prompt, parses the response, and returns the
 * structured directive.
 */
export async function producePresidentDirective(
    client: Anthropic | null,
    state: GameState,
    faction: PersonaFaction,
    opts: {
        model?: string;
        dirOverride?: string;
    } = {},
): Promise<ApiPresidentDirective | null> {
    if (!isPresidentLayerEnabled(faction)) return null;
    if (!client) return null;

    const personaId = FACTION_TO_PRESIDENT_PERSONA_ID[faction];
    const persona = loadPersona(personaId, { role: 'president', dirOverride: opts.dirOverride });
    if (!persona) return null;

    const model = opts.model ?? 'claude-haiku-4-5-20251001';
    const systemPrompt = buildPresidentSystemPrompt(persona);
    const userPrompt = buildPresidentUserPrompt(state, faction);

    const startMs = Date.now();
    const response = await client.messages.create({
        model,
        max_tokens: 512,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
    });
    const latencyMs = Date.now() - startMs;

    const text = (response.content as Array<{ type: string }>)
        .filter((block): block is AnthropicTextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

    const parsed = safeParseJson(text);
    const verb: PoliticalDirectiveVerb = parsed && typeof parsed.verb === 'string' && VALID_VERBS.has(parsed.verb)
        ? (parsed.verb as PoliticalDirectiveVerb)
        : 'no_directive';
    const targetCorpsId = parsed && typeof parsed.target_corps_id === 'string' && parsed.target_corps_id.length > 0
        ? parsed.target_corps_id
        : undefined;
    const scratchpad = parsed && typeof parsed.scratchpad_reasoning === 'string'
        ? parsed.scratchpad_reasoning
        : '';

    return {
        faction,
        leader_name: persona.name,
        turn: state.meta.turn,
        verb,
        target_corps_id: targetCorpsId,
        scratchpad_reasoning: scratchpad,
        model_used: response.model,
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        latency_ms: latencyMs,
    };
}

function safeParseJson(text: string): { verb?: string; target_corps_id?: string; scratchpad_reasoning?: string } | null {
    const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    const cleaned = match ? match[1].trim() : text.trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        return null;
    }
}
