// src/sim/ai_commander/ai_config.ts
/**
 * AI Commander configuration.
 * Player-facing settings + model routing.
 */

export type AiCommanderMode = 'commander' | 'officer' | 'recruit' | 'cadet';

export interface AiCommanderConfig {
    mode: AiCommanderMode;
    anthropic_api_key?: string;
    /** Estimated cost accumulator for this game session. */
    session_cost_estimate: number;
}

/** Model selection per mode. Anthropic-only for v0.4.5. */
export const MODEL_ROUTING: Record<AiCommanderMode, { army: string; corps_routine: string; corps_ops: string; advisor: string }> = {
    commander: {
        army: 'claude-opus-4-6',
        corps_routine: 'claude-haiku-4-5-20251001',
        corps_ops: 'claude-opus-4-6',
        advisor: 'claude-opus-4-6',
    },
    officer: {
        army: 'claude-sonnet-4-6',
        corps_routine: 'claude-haiku-4-5-20251001',
        corps_ops: 'claude-haiku-4-5-20251001',
        advisor: 'claude-sonnet-4-6',
    },
    recruit: {
        army: 'claude-haiku-4-5-20251001',
        corps_routine: 'claude-haiku-4-5-20251001',
        corps_ops: 'claude-haiku-4-5-20251001',
        advisor: 'claude-haiku-4-5-20251001',
    },
    cadet: {
        army: 'formula',
        corps_routine: 'formula',
        corps_ops: 'formula',
        advisor: 'formula',
    },
};

export const AI_DEFAULTS: AiCommanderConfig = {
    mode: 'cadet',
    session_cost_estimate: 0,
};

/** Max tokens for each call type. */
export const MAX_TOKENS = {
    army: 1024,
    corps_routine: 512,
    corps_ops: 768,
    advisor: 1024,
};

export const AI_TEMPERATURE = 0;
