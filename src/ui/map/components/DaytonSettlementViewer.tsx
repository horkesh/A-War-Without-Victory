import { useEffect, useId, useState } from 'react';
import type { FeatureCollection, Position } from 'geojson';
import type { DaytonAgreementRecord } from '../../../state/negotiation_types.js';
import { COMPETENCY_PACKAGES } from '../../../sim/negotiation/competency_packages.js';
import { CONSTITUTIONAL_CHOICES, RETURN_JUSTICE_CHOICES } from '../../../sim/negotiation/constitutional_packages.js';
import { getAllInstitutionalPackages } from '../../../sim/negotiation/institutional_packages.js';
import { loadOperationalSettlements } from '../data/DataLoader';
import { t } from '../i18n';

const colors: Record<string, string> = { RBiH: '#558463', HRHB: '#547ca7', RS: '#b35e53' };
const dialKeys = {
    confederation: 'dayton.dial.confederation',
    'dayton-historical': 'dayton.dial.daytonHistorical',
    federalized: 'dayton.dial.federalized',
    unitary: 'dayton.dial.unitary',
} as const;

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
    return { paths, ids: new Set(paths.map(path => path.id)), viewBox: [west - .04, -north - .04, east - west + .08, north - south + .08].join(' ') };
}

const brckoKeys = { arbitration: 'dayton.brckoArbitration', rs: 'dayton.brckoRs', federation: 'dayton.brckoFederation' } as const;

function Territory({ map, brcko }: { map: DaytonAgreementRecord['map']; brcko: DaytonAgreementRecord['terms']['brcko_status'] }) {
    const [geometry, setGeometry] = useState<ReturnType<typeof mapPaths> | null>(null);
    const [failed, setFailed] = useState(false);
    const [wartime, setWartime] = useState(false);
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
    return (
        <section aria-label={t('dayton.agreement.territory')}>
            <h3 className="font-bold">{t('dayton.agreement.territory')}</h3>
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
            {geometry ? (
                <svg className="block w-full max-h-[28rem] rounded bg-[#211f1b]" viewBox={geometry.viewBox}
                    role="img" aria-label={t(wartime ? 'dayton.agreement.front' : 'dayton.agreement.territory')}>
                    {geometry.paths.map(({ id, d }) => {
                        const holder = wartime ? map.wartimeControllers[id] : map.controllers[id];
                        const isSpecial = !wartime && special.has(id);
                        return (
                            <path key={id} d={d} fill={isSpecial ? '#dec590' : colors[holder ?? ''] ?? '#595650'}
                                fillRule="evenodd" stroke={isSpecial ? '#fff4d2' : '#262523'}
                                strokeWidth={isSpecial ? '.85' : '.35'} vectorEffect="non-scaling-stroke">
                                <title>{id} · {isSpecial ? t('dayton.agreement.arbitration') : holder ?? t('dayton.agreement.unavailable')}</title>
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
                            <li key={id}>{id} · {map.wartimeControllers[id] ?? '—'} → {map.controllers[id] ?? '—'}
                                {special.has(id) ? ' · ' + t('dayton.agreement.arbitration') : ''}
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </section>
    );
}

function Institutions({ terms }: { terms: DaytonAgreementRecord['terms'] }) {
    const options = [...CONSTITUTIONAL_CHOICES, ...RETURN_JUSTICE_CHOICES];
    const policy = { ...terms.constitutional_choices, ...terms.return_justice };
    const competencies = terms.competency_allocation ?? {};
    const rows = [
        ...(terms.entity_autonomy ? [{
            id: 'autonomy', label: t('dayton.dialTitle'), value: t(dialKeys[terms.entity_autonomy]),
        }] : []),
        ...Object.keys(terms.institutional_choices).sort().map(id => ({
            id, label: getAllInstitutionalPackages().find(pkg => pkg.id === id)?.name ?? id,
            value: t(`verdict.dayton.institutionValue.${terms.institutional_choices[id]}`),
        })),
        ...Object.keys(competencies).sort().map(id => ({
            id, label: COMPETENCY_PACKAGES.find(pkg => pkg.id === id)?.label ?? id, value: t(`dayton.owner.${competencies[id]}`),
        })),
        ...Object.keys(policy).sort().map(id => {
            const option = policy[id];
            const choice = options.find(item => item.id === id);
            return { id, label: choice?.label ?? id, value: choice?.options.find(item => item.id === option)?.label ?? option };
        }),
    ];
    return (
        <section aria-label={t('dayton.agreement.institutions')}>
            <h3 className="font-bold">{t('dayton.agreement.institutions')}</h3>
            <dl className="mt-2 divide-y divide-current/15">
                {rows.map(({ id, label, value }) => (
                    <div key={id} className="grid grid-cols-2 gap-2 py-1.5">
                        <dt>{label}</dt><dd className="font-medium">{value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

export function DaytonSettlementViewer({ agreement, mode, view }: {
    agreement: DaytonAgreementRecord;
    mode: 'draft' | 'signed';
    view?: 'territory' | 'institutions';
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
                <div id={panelId} className={`mt-3 grid gap-5 text-sm ${view ? '' : 'lg:grid-cols-2'}`}>
                    {view !== 'institutions' && <Territory map={agreement.map} brcko={agreement.terms.brcko_status} />}
                    {view !== 'territory' && <Institutions terms={agreement.terms} />}
                </div>
            )}
        </section>
    );
}
