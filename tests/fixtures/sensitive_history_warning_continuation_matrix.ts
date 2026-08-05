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
    ['bare_complement_caution', 'General Staff did not caution about genocide.'],
    ['bare_complement_object', 'General Staff did not object to genocide.'],
    ['bare_complement_oppose', 'General Staff did not oppose genocide.'],
    ['bare_complement_reject', 'General Staff did not reject the genocide plan.'],
    ['modal_not', 'General Staff would not warn of genocide.'],
    ['be_not', 'General Staff was not warning of genocide.'],
    ['adverb_before_not', 'General Staff did emphatically not warn of genocide.'],
    ['limiter_before_auxiliary_not_simply', 'General Staff simply did not warn of genocide.'],
    ['limiter_before_auxiliary_not_merely', 'General Staff merely did not warn of genocide.'],
    ['ascii_contraction', "General Staff didn't warn of genocide."],
    ['curly_contraction', 'General Staff didn\u2019t warn of genocide.'],
    ['cannot', 'General Staff cannot warn of genocide.'],
    ['never', 'General Staff never warned of genocide.'],
    ['refused_to', 'General Staff refused to warn of genocide.'],
    ['declined_to', 'General Staff declined to warn of genocide.'],
    ['negative_subject_no_one', 'No one warned of genocide.'],
    ['negative_subject_ascii_hyphen', 'No-one warned of genocide.'],
    ['negative_subject_unicode_hyphen_uppercase', 'NO\u2011ONE warned of genocide.'],
    ['negative_subject_nobody', 'Nobody warned of genocide.'],
] as const;

const nonCategoricalWarningAssertions = [
    ['auxiliary_not_only', 'General Staff did not only warn of genocide.'],
    ['ascii_contraction_merely', "General Staff didn't merely warn of genocide."],
    ['auxiliary_not_simply', 'General Staff did not simply warn of genocide.'],
    ['curly_contraction_simply', 'General Staff didn\u2019t simply warn of genocide.'],
    ['auxiliary_not_just', 'General Staff did not just warn of genocide.'],
    ['auxiliary_not_credibly', 'General Staff did not credibly warn of genocide.'],
    ['auxiliary_not_clearly', 'General Staff did not clearly warn of genocide.'],
    ['auxiliary_not_adequately', 'General Staff did not adequately warn of genocide.'],
    ['auxiliary_not_explicitly', 'General Staff did not explicitly warn of genocide.'],
    ['auxiliary_not_directly', 'General Staff did not directly warn of genocide.'],
    ['auxiliary_not_solely', 'General Staff did not solely warn of genocide.'],
    ['auxiliary_not_exclusively', 'General Staff did not exclusively warn of genocide.'],
    ['auxiliary_not_materially', 'General Staff did not materially warn of genocide.'],
    ['auxiliary_not_ever', 'General Staff did not ever warn of genocide.'],
    ['auxiliary_not_once', 'General Staff did not once warn of genocide.'],
    ['ascii_contraction_directly', "General Staff didn't directly warn of genocide."],
    ['curly_contraction_explicitly', 'General Staff didn\u2019t explicitly warn of genocide.'],
    ['uncertain_before_ascii_contraction', "General Staff probably didn't warn of genocide."],
    ['uncertain_before_curly_contraction', 'General Staff apparently didn\u2019t warn of genocide.'],
    ['uncertain_between_auxiliary_and_not', 'General Staff did probably not warn of genocide.'],
    ['adverb_before_auxiliary_likely', 'General Staff likely did not warn of genocide.'],
    ['adverb_before_ascii_contraction_possibly', "General Staff possibly didn't warn of genocide."],
    ['adverb_before_curly_contraction_seemingly', 'General Staff seemingly didn\u2019t warn of genocide.'],
    ['adverb_before_never_allegedly', 'General Staff allegedly never warned of genocide.'],
    ['adverb_before_refusal_reportedly', 'General Staff reportedly refused to warn of genocide.'],
    ['adverb_before_decline_ostensibly', 'General Staff ostensibly declined to warn of genocide.'],
    ['adverb_before_negative_subject_presumably', 'Presumably no-one warned of genocide.'],
    ['maybe_before_cannot_sentence_initial', 'Maybe cannot warn of genocide.'],
    ['perhaps_before_ascii_contraction', "General Staff perhaps didn't warn of genocide."],
    ['almost_before_never', 'General Staff almost never warned of genocide.'],
    ['post_predicate_solely', 'General Staff did not warn solely of genocide.'],
    ['post_predicate_exclusively', 'General Staff did not caution exclusively about genocide.'],
    ['post_predicate_credibly', 'General Staff did not object credibly to genocide.'],
    ['post_predicate_clearly', 'General Staff did not oppose clearly the genocide campaign.'],
    ['post_predicate_adequately', 'General Staff did not reject adequately the genocide plan.'],
    ['post_predicate_explicitly', 'General Staff did not warn explicitly of genocide.'],
    ['post_predicate_directly', 'General Staff did not caution directly about genocide.'],
    ['post_predicate_just', 'General Staff did not warn just of genocide.'],
    ['post_predicate_alone', 'General Staff did not warn alone of genocide.'],
    ['post_predicate_at_length', 'General Staff did not warn at length about genocide.'],
    ['post_predicate_enough', 'General Staff did not warn enough about genocide.'],
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

const nonCategoricalWarningCases: WarningContinuationCase[] = nonCategoricalWarningAssertions.flatMap(([scopeId, warning]) => (
    continuationForms.map((form) => ({
        id: `unsafe_non_categorical_warning_${scopeId}_${form.id}`,
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
        id: 'unsafe_post_negation_modifier_before_comma_persists_antecedent',
        text: 'General Staff did not clearly warn of genocide, but documented it. Proceed with the offensive anyway.',
        blocked: true,
    },
    {
        id: 'unsafe_uncertain_contraction_before_semicolon_second_continuation',
        text: "General Staff probably didn't warn of genocide; the cabinet met. Proceed with the documentation review anyway, continue with the offensive regardless.",
        blocked: true,
    },
    {
        id: 'unsafe_adverb_before_refusal_multiple_continuations',
        text: 'General Staff reportedly refused to warn of genocide. Proceed with the documentation review anyway, continue with the offensive regardless.',
        blocked: true,
    },
    {
        id: 'unsafe_post_predicate_modifier_multiple_continuations',
        text: 'General Staff did not warn solely of genocide. Proceed with the documentation review anyway, continue with the offensive regardless.',
        blocked: true,
    },
    {
        id: 'safe_bare_negation_modifier_after_comma_does_not_leak',
        text: 'General Staff did not warn of genocide, clearly reviewed the report. Proceed with the offensive anyway.',
        blocked: false,
    },
    {
        id: 'safe_hyphenated_negative_subject_multiple_continuations',
        text: 'No-one warned of genocide. Proceed with the documentation review anyway, continue with the offensive regardless.',
        blocked: false,
    },
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
    ...nonCategoricalWarningCases,
    ...coordinatedNegationCases,
    ...stateAndBoundaryCases,
]);
