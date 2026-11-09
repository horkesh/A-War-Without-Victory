import { useId, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { t, type MessageKey } from '../i18n';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { useSettlementGeometry } from './settlement_geometry';
import {
    entityOf,
    entityShares,
    refusedPlanControllers,
    stageChanges,
    type BoundaryStage,
    type CellChange,
    type Controllers,
    type ReasonPackage,
    type StageId,
} from './boundary_stages';
import paper from './art/basemap-paper.webp';
import water from './art/basemap-water.webp';
import outline from './art/basemap-outline.webp';
import './boundary.css';

/**
 * The Boundary Map (DC A3) and the wall board's live line. Coloured by entity, because Dayton
 * drew the inter-entity line: the Federation in green, Republika Srpska in red, Croat-held
 * Federation ground hatched blue inside the green. Patterns and labels carry the meaning as
 * well as colour. The base map is Codex's registered survey plate; fills multiply onto its
 * paper and relief, water and the national outline sit above.
 */
// Light enough that the plate's relief reads through the multiply; the board line uses the same.
const FILL = { FED: '#a3c6aa', RS: '#e3a899', special: '#ece0bc', none: '#e2dac7' } as const;
// Distinct from the near-black "changed" outline.
const GHOST_COLORS = ['#7a2f8c', '#16708c', '#a0570f'];

const STAGE_KEYS: Record<StageId, MessageKey> = {
    front: 'dayton.boundary.stage.front',
    opening: 'dayton.boundary.stage.opening',
    draft: 'dayton.boundary.stage.draft',
    signed: 'dayton.boundary.stage.signed',
};

function fillFor(faction: string | null | undefined, special: boolean, patternId: string): string {
    if (special) return FILL.special;
    if (faction === 'HRHB') return `url(#${patternId})`;
    const e = entityOf(faction);
    return e ? FILL[e] : FILL.none;
}

function holderName(faction: string | null): string {
    if (faction === 'RBiH') return t('dayton.boundary.party.RBiH');
    if (faction === 'HRHB') return t('dayton.boundary.party.HRHB');
    if (faction === 'RS') return t('dayton.boundary.party.RS');
    return t('dayton.boundary.party.none');
}

function reasonText(change: CellChange): string {
    switch (change.reason.kind) {
        case 'mediator': return t('dayton.boundary.reason.mediator');
        case 'package': return t('dayton.boundary.reason.package', { name: change.reason.name });
        case 'treaty': return t('dayton.boundary.reason.treaty');
        default: return t('dayton.boundary.reason.adjusted');
    }
}

function HatchPattern({ id, scale }: { id: string; scale: number }) {
    return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={scale} height={scale} patternTransform="rotate(45)">
            <rect width={scale} height={scale} fill={FILL.FED} />
            <rect width={scale * 0.45} height={scale} fill="#7094c0" />
        </pattern>
    );
}

/** The live line on the wall board: entity fills only, multiplied onto the pinned paper. */
/** `fit` keeps the map's proportions inside a box of another shape (the signing document, DC A5). */
export function BoardLine({ controllers, fit }: { controllers: Controllers | undefined; fit?: boolean }) {
    const { geometry } = useSettlementGeometry();
    const patternId = `${useId().replace(/:/g, '')}-hatch`;
    if (!geometry || !controllers) return null;
    return (
        <svg className="dayton-board-line" viewBox={geometry.viewBox} preserveAspectRatio={fit ? 'xMidYMid meet' : 'none'} aria-hidden="true" data-testid="dayton-board-line">
            <defs><HatchPattern id={patternId} scale={0.035} /></defs>
            {geometry.paths.map(({ id, d }) => (
                <path key={id} d={d} fill={fillFor(controllers[id], false, patternId)} fillRule="evenodd" />
            ))}
        </svg>
    );
}

export interface BoundaryMapProps {
    stages: readonly BoundaryStage[];
    initial?: StageId;
    packages?: readonly ReasonPackage[];
    refusedPlans?: ReadonlyArray<{ id: string; label: string }>;
    special?: readonly string[];
}

export function BoundaryMap({ stages, initial, packages = [], refusedPlans = [], special = [] }: BoundaryMapProps) {
    const { geometry, failed } = useSettlementGeometry();
    const uid = useId().replace(/:/g, '');
    const patternId = `${uid}-hatch`;
    const startIndex = Math.max(0, stages.findIndex(s => s.id === initial));
    const [index, setIndex] = useState(initial ? startIndex : stages.length - 1);
    const [ghosts, setGhosts] = useState<string[]>([]);
    // A new stage (the first draft preview) brings the map forward to it.
    const stageKey = stages.map(s => s.id).join('>');
    const [seenKey, setSeenKey] = useState(stageKey);
    if (seenKey !== stageKey) {
        setSeenKey(stageKey);
        setIndex(stages.length - 1);
    }
    const current = stages[Math.min(index, stages.length - 1)];
    const previous = index > 0 ? stages[index - 1] : undefined;
    const specialSet = useMemo(() => new Set(special), [special]);
    const changes = useMemo(() => previous && current ? stageChanges(previous.controllers, current, packages) : [], [previous, current, packages]);
    const changed = useMemo(() => new Set(changes.map(c => c.osid)), [changes]);
    const shares = useMemo(() => current ? entityShares(current.controllers) : null, [current]);
    const front = stages.find(s => s.id === 'front')?.controllers;
    const ghostMaps = useMemo(() => ghosts.flatMap(id => {
        const map = front ? refusedPlanControllers(id, front) : null;
        return map ? [{ id, map }] : [];
    }), [ghosts, front]);
    if (!current) return null;

    const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        const next = Math.min(stages.length - 1, Math.max(0, index + (event.key === 'ArrowRight' ? 1 : -1)));
        setIndex(next);
        event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
    };
    const across = changes.filter(c => c.acrossLine).length;
    const groups = new Map<string, CellChange[]>();
    for (const c of changes) {
        const key = reasonText(c);
        groups.set(key, [...(groups.get(key) ?? []), c]);
    }

    return (
        <section className="dayton-boundary" aria-labelledby={`${uid}-title`}>
            <h3 id={`${uid}-title`} className="dayton-boundary-title">{t('dayton.boundary.title')}</h3>
            <div className="dayton-boundary-stages" role="radiogroup" aria-label={t('dayton.boundary.stages')} onKeyDown={onKey}>
                {stages.map((stage, i) => (
                    <button key={stage.id} type="button" role="radio" aria-checked={i === index} tabIndex={i === index ? 0 : -1}
                        data-dayton-stage={stage.id} onClick={() => setIndex(i)}>
                        <span className="dayton-boundary-step">{i + 1}</span>{t(STAGE_KEYS[stage.id])}
                    </button>
                ))}
            </div>
            {shares && (
                <p className="dayton-boundary-shares" role="status">
                    {t('dayton.boundary.shares', { fed: shares.FED.toFixed(1), rs: shares.RS.toFixed(1) })}
                </p>
            )}
            <div className="dayton-boundary-figure">
                <img src={paper} alt="" />
                {geometry ? (
                    <>
                        <svg className="dayton-boundary-fills" viewBox={geometry.viewBox} preserveAspectRatio="none"
                            role="img" aria-label={t('dayton.boundary.figure', { stage: t(STAGE_KEYS[current.id]) })}>
                            <defs><HatchPattern id={patternId} scale={0.022} /></defs>
                            {geometry.paths.map(({ id, d }) => (
                                <path key={id} d={d} fill={fillFor(current.controllers[id], current.id !== 'front' && specialSet.has(id), patternId)}
                                    fillRule="evenodd" data-dayton-osid={id} data-dayton-changed={changed.has(id) || undefined}>
                                    <title>{getOsidDisplayName(id, geometry.names)} · {holderName(current.controllers[id] ?? null)}</title>
                                </path>
                            ))}
                        </svg>
                        <svg className="dayton-boundary-overlay" viewBox={geometry.viewBox} preserveAspectRatio="none" aria-hidden="true">
                            <defs>
                                {ghostMaps.map(({ id }, i) => (
                                    <filter key={id} id={`${uid}-ghost-${id}`} x="-5%" y="-5%" width="110%" height="110%">
                                        <feMorphology in="SourceAlpha" operator="dilate" radius="0.008" result="grown" />
                                        <feComposite in="grown" in2="SourceAlpha" operator="out" result="ring" />
                                        <feFlood floodColor={GHOST_COLORS[i % GHOST_COLORS.length]} result="ink" />
                                        <feComposite in="ink" in2="ring" operator="in" />
                                    </filter>
                                ))}
                            </defs>
                            {geometry.paths.filter(p => changed.has(p.id)).map(({ id, d }) => (
                                <path key={id} d={d} className="dayton-boundary-pulse" fillRule="evenodd" vectorEffect="non-scaling-stroke" />
                            ))}
                            {ghostMaps.map(({ id, map }) => (
                                <g key={id} filter={`url(#${uid}-ghost-${id})`} data-dayton-ghost={id}>
                                    {geometry.paths.filter(p => map[p.id] === 'RS').map(({ id: osid, d }) => <path key={osid} d={d} fill="#000" />)}
                                </g>
                            ))}
                        </svg>
                    </>
                ) : <p className="dayton-boundary-loading" role="status">{t(failed ? 'dayton.agreement.geometryUnavailable' : 'dayton.agreement.loading')}</p>}
                <img src={water} alt="" />
                <img src={outline} alt="" />
            </div>
            <ul className="dayton-boundary-legend" aria-label={t('dayton.boundary.legend')}>
                <li><span className="swatch" data-swatch="fed" />{t('dayton.boundary.fed')}</li>
                <li><span className="swatch" data-swatch="hrhb" />{t('dayton.boundary.hrhb')}</li>
                <li><span className="swatch" data-swatch="rs" />{t('dayton.boundary.rs')}</li>
                {special.length > 0 && <li><span className="swatch" data-swatch="special" />{t('dayton.boundary.special')}</li>}
                <li><span className="swatch" data-swatch="changed" />{t('dayton.boundary.changedLegend')}</li>
            </ul>
            {refusedPlans.length > 0 && front && (
                <fieldset className="dayton-boundary-ghosts">
                    <legend>{t('dayton.boundary.ghostsTitle')}</legend>
                    <p>{t('dayton.boundary.ghostsHint')}</p>
                    {refusedPlans.map((plan, i) => (
                        <label key={plan.id}>
                            <input type="checkbox" checked={ghosts.includes(plan.id)} data-dayton-ghost-toggle={plan.id}
                                onChange={event => setGhosts(event.target.checked ? [...ghosts, plan.id].sort() : ghosts.filter(g => g !== plan.id))} />
                            <span className="swatch" style={{ borderColor: GHOST_COLORS[i % GHOST_COLORS.length] }} />{plan.label}
                        </label>
                    ))}
                </fieldset>
            )}
            <section className="dayton-boundary-changes" aria-label={t('dayton.boundary.changesTitle')}>
                <h4>{t('dayton.boundary.changesTitle')}</h4>
                {!previous ? <p>{t('dayton.boundary.firstStage')}</p>
                    : changes.length === 0 ? <p>{t('dayton.boundary.noChanges')}</p> : (
                        <>
                            <p>{t('dayton.boundary.changeSummary', { count: changes.length, across })}</p>
                            {[...groups.entries()].map(([reason, items]) => (
                                <details key={reason}>
                                    <summary>{reason} · {items.length}</summary>
                                    <ul>
                                        {items.map(c => (
                                            <li key={c.osid} data-dayton-change={c.osid}>
                                                {getOsidDisplayName(c.osid, geometry?.names ?? null)} · {holderName(c.from)} → {holderName(c.to)}
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            ))}
                        </>
                    )}
            </section>
            <p className="dayton-boundary-credit">
                {t('dayton.boundary.credit')} <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
            </p>
        </section>
    );
}
