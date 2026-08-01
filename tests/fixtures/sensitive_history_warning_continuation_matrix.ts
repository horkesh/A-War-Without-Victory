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
    ['ascii_contraction', "General Staff didn't warn of genocide."],
    ['curly_contraction', 'General Staff didn\u2019t warn of genocide.'],
    ['never', 'General Staff never warned of genocide.'],
    ['negative_subject_no_one', 'No one warned of genocide.'],
    ['negative_subject_nobody', 'Nobody warned of genocide.'],
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
    ...coordinatedNegationCases,
    ...stateAndBoundaryCases,
]);
