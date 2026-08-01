export interface WarningContinuationCase {
    id: string;
    text: string;
    blocked: boolean;
}

const continuationForms = [
    {
        id: 'marker_after_action',
        render: (action: string, purpose: string) => `${action} with ${purpose} anyway.`,
    },
    {
        id: 'marker_before_action',
        render: (action: string, purpose: string) => `Regardless ${action.toLowerCase()} with ${purpose}.`,
    },
    {
        id: 'marker_before_comma',
        render: (action: string, purpose: string) => `Regardless, ${action.toLowerCase()} with ${purpose}.`,
    },
] as const;

const warningNegations = [
    ['auxiliary_not', 'General Staff did not warn of genocide.'],
    ['adverb_before_not', 'General Staff did emphatically not warn of genocide.'],
    ['adverb_after_not', 'General Staff did not credibly warn of genocide.'],
    ['limiter_before_auxiliary_not_simply', 'General Staff simply did not warn of genocide.'],
    ['limiter_before_auxiliary_not_merely', 'General Staff merely did not warn of genocide.'],
    ['ascii_contraction', "General Staff didn't warn of genocide."],
    ['curly_contraction', 'General Staff didn\u2019t warn of genocide.'],
    ['never', 'General Staff never warned of genocide.'],
    ['negative_subject_no_one', 'No one warned of genocide.'],
    ['negative_subject_ascii_hyphen', 'No-one warned of genocide.'],
    ['negative_subject_unicode_hyphen_uppercase', 'NO\u2011ONE warned of genocide.'],
    ['negative_subject_nobody', 'Nobody warned of genocide.'],
] as const;

const focusLimitedWarningAssertions = [
    ['auxiliary_not_only', 'General Staff did not only warn of genocide.'],
    ['ascii_contraction_merely', "General Staff didn't merely warn of genocide."],
    ['auxiliary_not_simply', 'General Staff did not simply warn of genocide.'],
    ['curly_contraction_simply', 'General Staff didn\u2019t simply warn of genocide.'],
    ['auxiliary_not_just', 'General Staff did not just warn of genocide.'],
] as const;

const markerPositionCases: WarningContinuationCase[] = ['Proceed', 'Continue'].flatMap((action) => (
    continuationForms.map((form) => ({
        id: `unsafe_${form.id}_${action.toLowerCase()}`,
        text: `General Staff warned of genocide. ${form.render(action, 'the offensive')}`,
        blocked: true,
    }))
));

const negatedWarningCases: WarningContinuationCase[] = warningNegations.flatMap(([negationId, warning]) => (
    continuationForms.map((form) => ({
        id: `safe_negated_warning_${negationId}_${form.id}`,
        text: `${warning} ${form.render('Proceed', 'the offensive')}`,
        blocked: false,
    }))
));

const focusLimitedWarningCases: WarningContinuationCase[] = focusLimitedWarningAssertions.flatMap(([focusId, warning]) => (
    continuationForms.map((form) => ({
        id: `unsafe_focus_limited_warning_${focusId}_${form.id}`,
        text: `${warning} ${form.render('Proceed', 'the offensive')}`,
        blocked: true,
    }))
));

const coordinatedNegationCases: WarningContinuationCase[] = ['and', 'or', 'nor'].flatMap((connector) => (
    [
        ['proceed', 'continue'],
        ['continue', 'proceed'],
    ].map(([firstAction, secondAction]) => ({
        id: `safe_coordinated_negation_${firstAction}_${connector}_${secondAction}`,
        text: `General Staff warned of genocide. Do not ${firstAction} ${connector} ${secondAction} with the offensive anyway.`,
        blocked: false,
    }))
));

const stateAndBoundaryCases: WarningContinuationCase[] = [
    {
        id: 'unsafe_focus_limiter_before_comma_persists_antecedent',
        text: 'General Staff did not only warn of genocide, but also documented it. Proceed with the offensive anyway.',
        blocked: true,
    },
    {
        id: 'unsafe_focus_limiter_before_semicolon_persists_antecedent',
        text: "General Staff didn't merely warn of genocide; the cabinet met. Proceed with the offensive anyway.",
        blocked: true,
    },
    {
        id: 'safe_comma_limiter_does_not_retroactively_change_negation',
        text: 'General Staff did not warn, only reviewed genocide evidence. Proceed with the offensive anyway.',
        blocked: false,
    },
    {
        id: 'safe_semicolon_limiter_does_not_retroactively_change_negation',
        text: 'General Staff did not warn of genocide; the cabinet merely reviewed the report. Proceed with the offensive anyway.',
        blocked: false,
    },
    {
        id: 'unsafe_focus_limited_warning_second_of_two_continuations',
        text: 'General Staff did not only warn of genocide. Proceed with the documentation review anyway, continue with the offensive regardless.',
        blocked: true,
    },
    {
        id: 'safe_negated_warning_multiple_continuations',
        text: 'General Staff simply did not warn of genocide. Proceed with the documentation review anyway, continue with the offensive regardless.',
        blocked: false,
    },
    {
        id: 'unsafe_multiple_commas_semicolon_leading_marker',
        text: 'General Staff warned of genocide. The cabinet met, reviewed the report, and adjourned; Regardless, proceed with the offensive.',
        blocked: true,
    },
    {
        id: 'unsafe_neutral_and_refusal_interveners',
        text: 'General Staff warned of genocide. The cabinet reviewed the report. Do not delay; continue with the campaign regardless.',
        blocked: true,
    },
    {
        id: 'unsafe_second_of_two_continuations',
        text: 'General Staff warned of genocide. Proceed with the documentation review anyway, continue with the offensive regardless.',
        blocked: true,
    },
    {
        id: 'unsafe_comma_resets_negation_scope',
        text: 'General Staff warned of genocide. Do not proceed with the documentation review, continue with the offensive regardless.',
        blocked: true,
    },
    {
        id: 'unsafe_semicolon_resets_negation_scope',
        text: 'General Staff warned of genocide. Do not proceed with the documentation review; continue with the offensive regardless.',
        blocked: true,
    },
] as const;

export const warningContinuationMatrix: readonly WarningContinuationCase[] = Object.freeze([
    ...markerPositionCases,
    ...negatedWarningCases,
    ...focusLimitedWarningCases,
    ...coordinatedNegationCases,
    ...stateAndBoundaryCases,
]);
