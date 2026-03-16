// src/sim/ai_commander/ai_client.ts
/**
 * Abstract AI client interface.
 * Anthropic-only for v0.4.5. Interface enables future providers (OpenAI, Gemini).
 */

import type { AiPrompt, AiResponse } from './ai_types.js';

export interface AiClient {
    /** Send a prompt and get a response. Throws on unrecoverable failure. */
    generateDecision(prompt: AiPrompt): Promise<AiResponse>;
    /** Check if the client is configured and available. */
    isAvailable(): boolean;
    /** Provider name for logging. */
    readonly provider: string;
}

/** Create the appropriate AI client based on config. Returns null if no API key configured. */
export async function createAiClient(apiKey?: string): Promise<AiClient | null> {
    if (!apiKey) return null;
    // Lazy import to avoid loading SDK when not needed
    const { AnthropicClient } = await import('./anthropic_client.js');
    return new AnthropicClient(apiKey);
}
