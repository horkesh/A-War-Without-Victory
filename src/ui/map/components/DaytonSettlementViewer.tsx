import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { FeatureCollection, Position } from 'geojson';
import type { DaytonAgreementRecord } from '../../../state/negotiation_types.js';
import { loadOperationalSettlements } from '../data/DataLoader';
import { t } from '../i18n';
import { brckoKeys, institutionalRows, recordedHolder, type DaytonClause } from '../dayton_conference/clauses';
import { buildOsidDisplayNameMap, getOsidDisplayName } from '../utils/osidDisplayName';

const colors: Record<string, string> = { RBiH: '#558463', HRHB: '#547ca7', RS: '#b35e53' };

function mapPaths(collection: FeatureCollection) {
    let west = Infinity, north = -Infinity, east = -Infinity, south = Infinity;
    // A local equirectangular projection keeps the country in proportion at this scale.
    const longitudeScale = Math.cos(44 * Math.PI / 180);
    function point([lon, lat]: Position): string {
        const x = lon * longitudeScale;
        west = Math.min(west, x);
        east = Math.max(east, x);
        north = Math.max(north, lat);
        south = Math.min(south, lat);
        return x.toFixed(5) + ' ' + (-lat).toFixed(5);
    }
    const paths = collection.features.flatMap(feature => {
        const geometry = feature.geometry;
        const id = feature.properties?.osid;
        if (typeof id !== 'string' || !geometry) return [];
        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates]
            : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
        if (!polygons.length) return [];
        const d = polygons.flatMap(polygon => polygon.filter(ring => ring.length > 2)
            .map(ring => 'M' + ring.map(point).join('L') + 'Z')).join('');
        return d ? [{ id, d }] : [];
    });
    if (!paths.length) throw new Error('No settlement polygons');
    return { paths, ids: new Set(paths.map(path => path.id)), names: buildOsidDisplayNameMap(collection), viewBox: [west - .04, -north - .04, east - west + .08, north - south + .08].join(' ') };
}

function Territory({ map, brcko, clause, openingMap, counterProjection }: {
    map: DaytonAgreementRecord['map']; brcko: DaytonAgreementRecord['terms']['brcko_status'];
    clause?: Extract<DaytonClause, { kind: 'map' }>; openingMap?: DaytonAgreementRecord['map']; counterProjection: boolean;
}) {
    const [geometry, setGeometry] = useState<ReturnType<typeof mapPaths> | null>(null);
    const [failed, setFailed] = useState(false);
    const [wartime, setWartime] = useState(false);
    const clauseHeading = useRef<HTMLHeadingElement>(null);
    useLayoutEffect(() => { clauseHeading.current?.focus(); }, [clause?.id]);
    useEffect(() => {
        let active = true;
        void loadOperationalSettlements().then(mapPaths).then(data => {
            if (active) setGeometry(data);
        }).catch(() => {
            if (active) setFailed(true);
        });
        return () => { active = false; };
    }, []);

    const changed = Object.keys(map.controllers).filter(id => map.wartimeControllers[id] !== map.controllers[id]).sort();
    const special = new Set(map.specialOsids);
    const missing = geometry ? Object.keys(map.controllers).filter(id => !geometry.ids.has(id)) : [];
    const listed = [...new Set([...(failed ? Object.keys(map.controllers) : [...changed, ...missing]), ...special])].sort();
    const members = new Set(clause?.osids);
    const paths = geometry && members.size
        ? [...geometry.paths.filter(path => !members.has(path.id)), ...geometry.paths.filter(path => members.has(path.id))]
        : geometry?.paths;
    return (
        <section aria-label={t('dayton.agreement.territory')}>
            <h3 className="font-bold">{t('dayton.agreement.territory')}</h3>
            {clause && (
                <div className="mt-2 rounded border border-[#8a6a3a] p-2">
                    <h4 className="font-bold" ref={clauseHeading} tabIndex={-1} data-dayton-autofocus>{clause.label}</h4>
                    <p>{counterProjection && <strong>{t('dayton.conference.counterTerms')} · </strong>}{clause.before} → {clause.after}</p>
                    {members.size > 0 ? <>
                        <p className="mt-1">{t(openingMap ? 'dayton.conference.compareHolders' : 'dayton.conference.clauseHolders')}</p>
                        <ul className="max-h-32 overflow-auto text-xs">
                            {[...members].map(id => (
                                <li key={id} data-dayton-clause-member={id}>
                                    {getOsidDisplayName(id, geometry?.names ?? null)} · {recordedHolder(map, id, true)} → {openingMap && `${recordedHolder(openingMap, id)} → `}{recordedHolder(map, id)}
                                    {(failed || geometry && !geometry.ids.has(id)) && ` · ${t('dayton.conference.missingGeometry')}`}
                                </li>
                            ))}
                        </ul>
                    </> : <p>{t('dayton.conference.membersUnavailable')}</p>}
                </div>
            )}
            {brcko && <p className="mt-2">{t('dayton.brckoTitle')} · {t(brckoKeys[brcko])}</p>}
            <p className="mt-2">{t('dayton.agreement.settledShares')}</p>
            <div className="my-2 flex flex-wrap gap-3">
                {Object.entries(colors).map(([faction, color]) => (
                    <span key={faction} className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true" className="inline-block size-3 rounded-sm" style={{ backgroundColor: color }} />
                        {faction}{map.territoryPct[faction] != null ? ' · ' + map.territoryPct[faction].toFixed(1) + '%' : ''}
                    </span>
                ))}
            </div>
            <p>{t('dayton.agreement.changed')} {changed.length} · {t('dayton.agreement.arbitration')} {special.size}</p>
            <label className="my-2 flex items-center gap-2">
                <input type="checkbox" checked={wartime} onChange={event => setWartime(event.target.checked)} />
                {t('dayton.agreement.front')}
            </label>
            {geometry && paths ? (
                <svg className="block w-full max-h-[28rem] rounded bg-[#211f1b]" viewBox={geometry.viewBox}
                    role="img" aria-label={t(wartime ? 'dayton.agreement.front' : 'dayton.agreement.territory')}>
                    {paths.map(({ id, d }) => {
                        const holder = wartime ? map.wartimeControllers[id] : map.controllers[id];
                        const isSpecial = !wartime && special.has(id);
                        const highlighted = members.has(id);
                        return (
                            <path key={id} d={d} fill={isSpecial ? '#dec590' : colors[holder ?? ''] ?? '#595650'}
                                fillRule="evenodd" stroke={highlighted ? '#ffedac' : isSpecial ? '#fff4d2' : '#262523'}
                                opacity={members.size && !highlighted ? '.58' : undefined}
                                strokeWidth={highlighted ? '1.35' : isSpecial ? '.85' : '.35'} vectorEffect="non-scaling-stroke"
                                data-dayton-osid={id} data-dayton-highlighted={highlighted || undefined}>
                                <title>{getOsidDisplayName(id, geometry.names)} · {recordedHolder(map, id, wartime)}</title>
                            </path>
                        );
                    })}
                </svg>
            ) : <p role="status">{t(failed ? 'dayton.agreement.geometryUnavailable' : 'dayton.agreement.loading')}</p>}
            {missing.length > 0 && <p>{t('dayton.agreement.geometryUnavailable')} ({missing.length})</p>}
            {listed.length > 0 && (
                <details className="mt-2">
                    <summary className="cursor-pointer">{t('dayton.agreement.assignments')}</summary>
                    <ul className="max-h-48 overflow-auto text-xs">
                        {listed.map(id => (
                            <li key={id}>{getOsidDisplayName(id, geometry?.names ?? null)} · {recordedHolder(map, id, true)} → {recordedHolder(map, id)}</li>
                        ))}
                    </ul>
                </details>
            )}
        </section>
    );
}

function Institutions({ terms, clause, counterProjection }: { terms: DaytonAgreementRecord['terms']; clause?: DaytonClause; counterProjection: boolean }) {
    const rows = institutionalRows(terms);
    const target = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        target.current?.focus({ preventScroll: true });
        target.current?.scrollIntoView?.({ block: 'nearest' });
    }, [clause?.id, terms]);
    return (
        <section aria-label={t('dayton.agreement.institutions')}>
            <h3 className="font-bold">{t('dayton.agreement.institutions')}</h3>
            {clause && !rows.some(row => row.id === clause.id) && <p>{clause.label} · {t('dayton.conference.termUnavailable')}</p>}
            <dl className="mt-2 divide-y divide-current/15">
                {rows.map(({ id, label, value }) => (
                    <div key={id} className={`grid grid-cols-2 gap-2 py-1.5 ${clause?.id === id ? 'rounded bg-[#ead6a9] px-2' : ''}`}
                        ref={clause?.id === id ? target : undefined} tabIndex={clause?.id === id ? -1 : undefined}
                        data-dayton-term={id} data-dayton-autofocus={clause?.id === id || undefined}>
                        <dt>{label}</dt>
                        <dd className="font-medium">
                            {clause?.id === id && counterProjection && <span className="block text-xs">{t('dayton.conference.projectedTerm')}</span>}
                            {value}
                        </dd>
                        {clause?.id === id && (
                            <dd className="col-span-2 text-xs">
                                {counterProjection && <strong>{t('dayton.conference.counterTerms')} · </strong>}{clause.before} → {clause.after}
                            </dd>
                        )}
                    </div>
                ))}
            </dl>
        </section>
    );
}

export function DaytonSettlementViewer({ agreement, mode, view, clause, openingMap, counterProjection = false }: {
    agreement: DaytonAgreementRecord;
    mode: 'draft' | 'signed';
    view?: 'territory' | 'institutions' | 'both';
    clause?: DaytonClause;
    openingMap?: DaytonAgreementRecord['map'];
    counterProjection?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const title = t(`dayton.agreement.${mode}`);
    return (
        <section className={`rounded border border-current/25 p-3 ${mode === 'draft' ? 'text-[#352b20]' : 'text-text-primary'}`}>
            {view
                ? <h3 className="font-bold">{title}</h3>
                : <button type="button" className="font-bold underline" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>{title}</button>}
            {(view || open) && (
                <div id={panelId} className={`mt-3 grid gap-5 text-sm ${view === 'both' ? 'dayton-review-columns' : view ? '' : 'lg:grid-cols-2'}`}>
                    {view !== 'institutions' && <Territory map={agreement.map} brcko={agreement.terms.brcko_status} clause={clause?.kind === 'map' ? clause : undefined}
                        openingMap={openingMap} counterProjection={counterProjection} />}
                    {view !== 'territory' && <Institutions terms={agreement.terms} clause={clause?.kind === 'binder' ? clause : undefined}
                        counterProjection={counterProjection} />}
                </div>
            )}
        </section>
    );
}
