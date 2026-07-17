/**
 * Dayton Institutional-Architecture dimensions (Phase 3 UI of the
 * institutional-architecture expansion, build spec
 * docs/plans/2026-06-07-dayton-institutional-expansion-build-spec.md).
 *
 * Renders the four structural dimensions the player AUTHORS at the table, on top
 * of the territorial packages + legacy 6-toggle autonomy already in the modal:
 *   - DIMENSION 2  the entity-autonomy master DIAL (confederation … unitary).
 *   - DIMENSION 3  the 16-competency jurisdiction grid (state | entity | shared).
 *   - DIMENSION 4  the 5 constitutional sub-choices (presidency … OHR).
 *   - DIMENSION 5  the 2 return/justice choices (refugee return, ICTY cooperation).
 *
 * Costs are AUTHORITATIVE by construction: this component imports the very same
 * Phase-1/2 cost functions the engine uses (finalCompetencyCost / dial multiplier /
 * declaration cost / reachability) rather than re-mirroring them — so there is no
 * client/engine drift to pin. The historical Annex-4 default is always FREE, so an
 * untouched settlement spends 0 and stays byte-identical (40w 2221700edf20621e).
 *
 * The anti-power-fantasy gate (§1.3): an option a faction's earned capital cannot
 * afford is locked via isOptionReachable — a losing-capital faction literally
 * cannot reach the most sovereign flips. The budget is earned in the war, not
 * entered at the table.
 *
 * Pure presentation: every authoritative outcome still comes from the engine when
 * the player Probes or Submits. No negotiation logic lives here.
 */
import {
    COMPETENCY_PACKAGES,
    type CompetencyOwner,
} from '../../../sim/negotiation/competency_packages.js';
import {
    CONSTITUTIONAL_CHOICES,
    RETURN_JUSTICE_CHOICES,
    getDefaultOptionId,
    type ConstitutionalChoice,
} from '../../../sim/negotiation/constitutional_packages.js';
import {
    finalCompetencyCost,
    finalConstitutionalCost,
    finalReturnJusticeCost,
    getDialDeclarationCost,
    isOptionReachable,
} from '../../../sim/negotiation/dayton_dial_cost.js';
import type {
    EntityAutonomySetting,
    CompetencyOwnerChoice,
} from '../../../state/negotiation_types.js';
import { t } from '../i18n';

// ── Public selection shape (lifted into the modal's state) ───────────────────

export interface InstitutionalSelections {
    /** DIMENSION 2 master dial. */
    dial: EntityAutonomySetting;
    /** DIMENSION 3: competency id -> chosen owner (only non-defaults matter). */
    competency: Record<string, CompetencyOwnerChoice>;
    /** DIMENSION 4: constitutional choice id -> chosen option id. */
    constitutional: Record<string, string>;
    /** DIMENSION 5: return/justice choice id -> chosen option id. */
    returnJustice: Record<string, string>;
}

/** The four dial settings, in canonical display order (entity-ward → state-ward). */
const DIAL_ORDER: readonly EntityAutonomySetting[] = [
    'confederation',
    'dayton-historical',
    'federalized',
    'unitary',
];

const DIAL_LABEL_KEY = {
    confederation: 'dayton.dial.confederation',
    'dayton-historical': 'dayton.dial.daytonHistorical',
    federalized: 'dayton.dial.federalized',
    unitary: 'dayton.dial.unitary',
} as const satisfies Record<EntityAutonomySetting, string>;

const OWNER_ORDER: readonly CompetencyOwner[] = ['entity', 'shared', 'state'];

const OWNER_LABEL_KEY = {
    entity: 'dayton.owner.entity',
    shared: 'dayton.owner.shared',
    state: 'dayton.owner.state',
} as const satisfies Record<CompetencyOwner, string>;

/** Resolve the effective owner of a competency (chosen, else Annex-4 default). */
function effectiveOwner(
    sel: InstitutionalSelections,
    compId: string,
    defaultOwner: CompetencyOwner,
): CompetencyOwnerChoice {
    return sel.competency[compId] ?? defaultOwner;
}

/** Resolve the effective option of a constitutional/rj choice (chosen, else default). */
function effectiveOption(
    chosen: Record<string, string>,
    choice: ConstitutionalChoice,
): string {
    return chosen[choice.id] ?? choice.options.find((o) => o.is_default)?.id ?? '';
}

/**
 * Total institutional capital cost to the player of the current selections —
 * declaration + Dim-3 + Dim-4 + Dim-5, each at the post-dial rate, summed for the
 * player's own faction. 0 at the all-default settlement (every term is 0 there).
 * AUTHORITATIVE: uses the engine cost functions directly.
 */
export function computeInstitutionalCost(
    sel: InstitutionalSelections,
    faction: string | null | undefined,
): number {
    if (!faction) return 0;
    let total = getDialDeclarationCost(sel.dial, faction);
    for (const comp of COMPETENCY_PACKAGES) {
        const owner = effectiveOwner(sel, comp.id, comp.default_owner);
        total += finalCompetencyCost(comp.id, owner as CompetencyOwner, faction, sel.dial);
    }
    for (const choice of CONSTITUTIONAL_CHOICES) {
        const opt = effectiveOption(sel.constitutional, choice);
        total += finalConstitutionalCost(choice.id, opt, faction, sel.dial);
    }
    for (const choice of RETURN_JUSTICE_CHOICES) {
        const opt = effectiveOption(sel.returnJustice, choice);
        total += finalReturnJusticeCost(choice.id, opt, faction, sel.dial);
    }
    return total;
}

interface DimensionsProps {
    selections: InstitutionalSelections;
    onChange: (next: InstitutionalSelections) => void;
    playerFaction: string | null;
    /** The player's total earned capital — gates reachability. */
    capitalAvailable: number;
}

export function DaytonInstitutionalDimensions({
    selections,
    onChange,
    playerFaction,
    capitalAvailable,
}: DimensionsProps) {
    const faction = playerFaction ?? '';
    const dial = selections.dial;

    const setDial = (next: EntityAutonomySetting) =>
        onChange({ ...selections, dial: next });

    const setCompetency = (compId: string, owner: CompetencyOwnerChoice, defaultOwner: CompetencyOwner) => {
        const next = { ...selections.competency };
        if (owner === defaultOwner) delete next[compId];
        else next[compId] = owner;
        onChange({ ...selections, competency: next });
    };

    const setConstitutional = (choiceId: string, optionId: string, isDefault: boolean) => {
        const next = { ...selections.constitutional };
        if (isDefault) delete next[choiceId];
        else next[choiceId] = optionId;
        onChange({ ...selections, constitutional: next });
    };

    const setReturnJustice = (choiceId: string, optionId: string, isDefault: boolean) => {
        const next = { ...selections.returnJustice };
        if (isDefault) delete next[choiceId];
        else next[choiceId] = optionId;
        onChange({ ...selections, returnJustice: next });
    };

    return (
        <>
            {/* DIMENSION 2 — entity-autonomy master dial */}
            <div className="px-8 py-4 border-b border-[#c8b898]/40">
                <div className="text-xs uppercase tracking-widest text-[#8a7a60] font-bold mb-1">
                    {t('dayton.dialTitle')}
                </div>
                <div className="text-xs text-[#6a5a40] italic mb-3 leading-tight">
                    {t('dayton.dialHint')}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DIAL_ORDER.map((setting) => {
                        const active = dial === setting;
                        const declCost = getDialDeclarationCost(setting, faction);
                        const reachable = declCost <= Math.max(0, capitalAvailable);
                        return (
                            <button
                                key={setting}
                                type="button"
                                disabled={!reachable && !active}
                                onClick={() => setDial(setting)}
                                className={`text-xs px-2 py-2 rounded border font-bold text-center leading-tight ${
                                    active
                                        ? 'bg-[#8a6a3a] text-white border-[#8a6a3a]'
                                        : reachable
                                            ? 'text-[#6a5a40] border-[#8a7a60]/40 hover:bg-[#e8dcc4]'
                                            : 'text-[#b0a890] border-[#c8b898]/30 bg-[#e8dcc4]/20 cursor-not-allowed line-through'
                                }`}
                                style={{ fontFamily: 'Courier New, monospace' }}
                                title={!reachable && !active ? t('dayton.optionLocked') : undefined}
                            >
                                {t(DIAL_LABEL_KEY[setting])}
                                {declCost > 0 && <span className="block text-xs opacity-80 mt-0.5">−{declCost}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* DIMENSION 3 — competency (jurisdiction) matrix */}
            <div className="px-8 py-4 border-b border-[#c8b898]/40">
                <div className="text-xs uppercase tracking-widest text-[#8a7a60] font-bold mb-1">
                    {t('dayton.competencyTitle')}
                </div>
                <div className="text-xs text-[#6a5a40] italic mb-3 leading-tight">
                    {t('dayton.competencyHint')}
                </div>
                <div className="space-y-1.5">
                    {COMPETENCY_PACKAGES.map((comp) => {
                        const chosen = effectiveOwner(selections, comp.id, comp.default_owner);
                        return (
                            <div key={comp.id} className="flex items-center justify-between gap-2 p-2 rounded border border-[#c8b898]/50 bg-[#e8dcc4]/30">
                                <span className="text-xs font-bold text-[#2a2016] flex-1 min-w-0" title={comp.citation}>
                                    {comp.label}
                                </span>
                                <div className="flex gap-1 shrink-0">
                                    {OWNER_ORDER.map((owner) => {
                                        const active = chosen === owner;
                                        const isDefault = owner === comp.default_owner;
                                        const cost = finalCompetencyCost(comp.id, owner, faction, dial);
                                        const reachable = isOptionReachable('competency', comp.id, owner, faction, capitalAvailable, dial);
                                        const locked = !reachable && !active;
                                        return (
                                            <button
                                                key={owner}
                                                type="button"
                                                disabled={locked}
                                                onClick={() => setCompetency(comp.id, owner, comp.default_owner)}
                                                className={`text-xs px-1.5 py-1 rounded border font-bold uppercase ${
                                                    active
                                                        ? 'bg-[#4a5a8a] text-white border-[#4a5a8a]'
                                                        : locked
                                                            ? 'text-[#b0a890] border-[#c8b898]/30 cursor-not-allowed'
                                                            : 'text-[#4a5a8a] border-[#4a5a8a]/40 hover:bg-[#d0d8e8]'
                                                }`}
                                                style={{ fontFamily: 'Courier New, monospace' }}
                                                title={locked ? t('dayton.optionLocked') : isDefault ? t('dayton.historicalDefault') : undefined}
                                            >
                                                {t(OWNER_LABEL_KEY[owner])}
                                                {cost > 0 && <span className="ml-0.5 opacity-80">{cost}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* DIMENSION 4 — constitutional architecture */}
            <ChoiceSection
                title={t('dayton.constitutionalTitle')}
                hint={t('dayton.constitutionalHint')}
                choices={CONSTITUTIONAL_CHOICES}
                dimension="constitutional"
                chosen={selections.constitutional}
                faction={faction}
                dial={dial}
                capitalAvailable={capitalAvailable}
                onPick={setConstitutional}
            />

            {/* DIMENSION 5 — return & justice */}
            <ChoiceSection
                title={t('dayton.returnJusticeTitle')}
                hint={t('dayton.returnJusticeHint')}
                choices={RETURN_JUSTICE_CHOICES}
                dimension="return_justice"
                chosen={selections.returnJustice}
                faction={faction}
                dial={dial}
                capitalAvailable={capitalAvailable}
                onPick={setReturnJustice}
            />
        </>
    );
}

/** A list of mutually-exclusive option rows for Dim-4 / Dim-5. */
function ChoiceSection({
    title,
    hint,
    choices,
    dimension,
    chosen,
    faction,
    dial,
    capitalAvailable,
    onPick,
}: {
    title: string;
    hint: string;
    choices: readonly ConstitutionalChoice[];
    dimension: 'constitutional' | 'return_justice';
    chosen: Record<string, string>;
    faction: string;
    dial: EntityAutonomySetting;
    capitalAvailable: number;
    onPick: (choiceId: string, optionId: string, isDefault: boolean) => void;
}) {
    const costFn = dimension === 'constitutional' ? finalConstitutionalCost : finalReturnJusticeCost;
    return (
        <div className="px-8 py-4 border-b border-[#c8b898]/40">
            <div className="text-xs uppercase tracking-widest text-[#8a7a60] font-bold mb-1">{title}</div>
            <div className="text-xs text-[#6a5a40] italic mb-3 leading-tight">{hint}</div>
            <div className="space-y-2">
                {choices.map((choice) => {
                    const activeOption = effectiveOption(chosen, choice);
                    return (
                        <div key={choice.id} className="p-2.5 rounded border border-[#c8b898]/50 bg-[#e8dcc4]/30">
                            <div className="text-xs font-bold text-[#2a2016] mb-1.5" title={choice.citation}>
                                {choice.label}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {choice.options.map((opt) => {
                                    const active = activeOption === opt.id;
                                    const cost = costFn(choice.id, opt.id, faction, dial);
                                    const reachable = isOptionReachable(dimension, choice.id, opt.id, faction, capitalAvailable, dial);
                                    const locked = !reachable && !active;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            disabled={locked}
                                            onClick={() => onPick(choice.id, opt.id, opt.is_default)}
                                            className={`text-xs px-2 py-1 rounded border font-bold ${
                                                active
                                                    ? 'bg-[#8a6a3a] text-white border-[#8a6a3a]'
                                                    : locked
                                                        ? 'text-[#b0a890] border-[#c8b898]/30 cursor-not-allowed'
                                                        : 'text-[#8a6a3a] border-[#8a6a3a]/40 hover:bg-[#e8dcc4]'
                                            }`}
                                            style={{ fontFamily: 'Courier New, monospace' }}
                                            title={locked ? t('dayton.optionLocked') : opt.is_default ? t('dayton.historicalDefault') : undefined}
                                        >
                                            {opt.label}
                                            {cost > 0 && <span className="ml-1 opacity-80">−{cost}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/** Build the optional, byte-identity-preserving proposal fields from selections. */
export function buildInstitutionalProposalFields(sel: InstitutionalSelections): {
    entity_autonomy?: EntityAutonomySetting;
    competency_allocation?: Record<string, CompetencyOwnerChoice>;
    constitutional_choices?: Record<string, string>;
    return_justice?: Record<string, string>;
} {
    const out: ReturnType<typeof buildInstitutionalProposalFields> = {};
    if (sel.dial !== 'dayton-historical') out.entity_autonomy = sel.dial;
    if (Object.keys(sel.competency).length > 0) out.competency_allocation = { ...sel.competency };
    if (Object.keys(sel.constitutional).length > 0) out.constitutional_choices = { ...sel.constitutional };
    if (Object.keys(sel.returnJustice).length > 0) out.return_justice = { ...sel.returnJustice };
    return out;
}

/** The default (all-historical) selections — spends 0, byte-identical settlement. */
export function defaultInstitutionalSelections(): InstitutionalSelections {
    return { dial: 'dayton-historical', competency: {}, constitutional: {}, returnJustice: {} };
}

export { getDefaultOptionId };
