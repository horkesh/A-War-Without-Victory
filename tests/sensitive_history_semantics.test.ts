import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
    isCanonAllowedParamilitaryChoice,
    isDirectRefusedSensitiveChoice,
} = require('../tools/diagnostics/sensitive_history_semantics.cjs') as {
    isCanonAllowedParamilitaryChoice: (
        eventId: string | null,
        family: string | null,
        optionId: string | null,
        text: string,
    ) => boolean;
    isDirectRefusedSensitiveChoice: (text: string) => boolean;
};

describe('sensitive-history choice semantics', () => {
    it.each([
        'Murder the non-Serb residents',
        'Execute the displaced families',
        'Order the population killed',
        'Commit genocide',
        'Kill civilians',
        'Always allow paramilitary deployment',
        'Authorize paramilitary standing orders',
        'General Staff warned of genocide. Proceed anyway and make it swift.',
    ])('classifies a direct refused instruction: %s', (text) => {
        expect(isDirectRefusedSensitiveChoice(text)).toBe(true);
    });

    it.each([
        'Record reports of systematic cleansing',
        'Document evidence of maximum displacement',
        'Investigate systematic cleansing',
        'Prevent maximum displacement',
        'Authorize an investigation of concentration camps',
        'Do not authorize detention camps',
        'Do not order the population killed',
        'Refuse to order the population killed',
        'Do not authorize, approve, or conduct genocide',
        'Authorize prosecutors to investigate concentration camps',
        'Never authorize or approve concentration camps',
        'Order inspectors to inspect detention camps',
        'Proceed with the command review. Document genocide allegations.',
        'Document genocide allegations. Proceed with the command review.',
        'Forbid commanders to murder civilians',
        'Decline to authorize concentration camps',
        'Cannot authorize concentration camps',
        'The objective is to document genocide allegations. Proceed anyway with the command review.',
        'General Staff warned of genocide. Proceed anyway with the command review.',
        'General Staff warned of genocide. Continue regardless with the documentation review.',
        'General Staff warned of genocide. Continue with the documentation review regardless.',
        'General Staff warned of genocide. Proceed to review the offensive regardless.',
    ])('keeps documentation, accountability, and refusal prose contextual: %s', (text) => {
        expect(isDirectRefusedSensitiveChoice(text)).toBe(false);
    });

    it.each([
        'Record reports of systematic cleansing and kill civilians',
        'Document evidence of maximum displacement, then murder the residents',
        'Authorize concentration camps and investigate the chain of command',
        'Do not authorize detention camps, then kill civilians',
        'Refuse to deploy paramilitary forces, then execute the displaced families',
        'Authorize an investigation of concentration camps, then commit genocide',
        'Do not authorize or approve concentration camps, then kill civilians',
        'Authorize prosecutors to investigate concentration camps, but commit genocide',
        'Do not authorize detention camps: kill civilians',
        'Refuse to deploy paramilitary forces — execute the displaced families',
        'Refuse to deploy paramilitary forces – execute the displaced families',
        'Forbid commanders to murder civilians: kill civilians',
        'Decline to authorize concentration camps — commit genocide',
        'Cannot authorize concentration camps: execute the displaced families',
        'General Staff warned of genocide. Proceed with the offensive anyway.',
        'General Staff warned of genocide. Continue the operation regardless.',
        'General Staff warned of genocide. Continue regardless with the offensive.',
        'General Staff warned of genocide. Proceed anyway with the command review. Then kill civilians.',
        'General Staff warned of genocide. Proceed with the offensive anyway and review the result.',
        'General Staff warned of genocide. Proceed with direct action regardless and review the result.',
    ])('does not let contextual language sanitize a later or prior directive: %s', (text) => {
        expect(isDirectRefusedSensitiveChoice(text)).toBe(true);
    });

    it.each([
        ['rs_paramilitary_policy_1992', 'rs_paramilitary_policy', 'always_allow', 'Always allow paramilitary deployment'],
        ['rs_paramilitary_policy_1992', 'rs_paramilitary_policy', 'ask', 'Ask per deployment'],
        ['rs_paramilitary_policy_1992', 'rs_paramilitary_policy', 'always_deny', 'Always deny paramilitary deployment'],
        ['rbih_paramilitary_policy_1992', 'rbih_paramilitary_policy', 'always_allow', 'Authorize paramilitary standing orders'],
        ['rbih_paramilitary_policy_1992', 'rbih_paramilitary_policy', 'ask', 'Review each deployment'],
        ['rbih_paramilitary_policy_1992', 'rbih_paramilitary_policy', 'always_deny', 'Refuse paramilitary deployment'],
    ])('allows only the exact bounded paramilitary-policy label: %s/%s/%s', (eventId, family, optionId, text) => {
        expect(isCanonAllowedParamilitaryChoice(eventId, family, optionId, text)).toBe(true);
    });

    it.each([
        ['rs_paramilitary_policy_1992', 'rs_paramilitary_policy', 'commit', 'Commit genocide'],
        ['rs_paramilitary_policy_1992', 'rs_paramilitary_policy', 'kill', 'Kill civilians'],
        ['rs_paramilitary_policy_1992', 'rs_paramilitary_policy', 'always_allow', 'Always allow paramilitary deployment and kill civilians'],
        ['fake_policy', 'rs_paramilitary_policy', 'always_allow', 'Always allow paramilitary deployment'],
        ['rs_paramilitary_policy_1992', 'fake_family', 'always_allow', 'Always allow paramilitary deployment'],
    ])('rejects an identity, option, or prose expansion outside the bounded exception: %s/%s/%s', (eventId, family, optionId, text) => {
        expect(isCanonAllowedParamilitaryChoice(eventId, family, optionId, text)).toBe(false);
    });
});
