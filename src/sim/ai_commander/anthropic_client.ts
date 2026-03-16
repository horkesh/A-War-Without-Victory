// src/sim/ai_commander/anthropic_client.ts
/**
 * Anthropic Claude API client.
 * Wraps @anthropic-ai/sdk with retry, error handling, and cost tracking.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AiClient } from './ai_client.js';
import type { AiPrompt, AiResponse } from './ai_types.js';

export class AnthropicClient implements AiClient {
    private client: Anthropic;
    readonly provider = 'anthropic';

    constructor(apiKey: string) {
        this.client = new Anthropic({ apiKey });
    }

    isAvailable(): boolean {
        return true;
    }

    async generateDecision(prompt: AiPrompt): Promise<AiResponse> {
        const startMs = Date.now();
        try {
            const response = await this.client.messages.create({
                model: prompt.model,
                max_tokens: prompt.max_tokens,
                temperature: prompt.temperature,
                system: prompt.system,
                messages: [{ role: 'user', content: prompt.user }],
            });

            const text = response.content
                .filter((block): block is Anthropic.TextBlock => block.type === 'text')
                .map(block => block.text)
                .join('');

            return {
                content: text,
                model: response.model,
                prompt_tokens: response.usage.input_tokens,
                completion_tokens: response.usage.output_tokens,
                latency_ms: Date.now() - startMs,
            };
        } catch (error) {
            if (error instanceof Anthropic.APIError) {
                throw new Error(`Anthropic API error (${error.status}): ${error.message}`);
            }
            throw error;
        }
    }
}
