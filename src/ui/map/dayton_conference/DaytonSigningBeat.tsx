import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { DaytonAgreementRecord } from '../../../state/negotiation_types.js';
import { t, type MessageKey } from '../i18n';
import { formatCount, turnToDateString } from '../utils/formatters';
import { BoardLine, BoundaryMap } from './BoundaryMap';
import { TreatyLedger } from './TreatyLedger';
import { useWideFraming } from './DaytonRoomBackdrop';
import standardBlocking from './art/signing-blocking-4k.json';
import wideBlocking from './art/signing-blocking-ultrawide.json';
import standardPlate from './art/signing-table-4k.webp';
import widePlate from './art/signing-table-ultrawide.webp';
import './room.css';
import './boundary.css';
import './signing.css';

/** Signature blocks on the plate, left to right (Codex, dayton-signing-table-v1). */
const SIGNATORIES = [
    { id: 'sig_rbih', faction: 'RBiH' },
    { id: 'sig_hrhb', faction: 'HRHB' },
    { id: 'sig_rs', faction: 'RS' },
] as const;

/** A pen stroke per delegation: initials are runtime marks, never names of real people. */
const STROKES: Record<string, string> = {
    RBiH: 'M4 30 C14 6 22 6 24 24 S34 40 42 18 C46 8 54 10 52 26 C50 36 62 34 70 20 C76 12 84 16 96 22',
    HRHB: 'M4 26 C10 10 20 34 28 14 C32 6 40 30 48 22 C56 14 58 32 68 26 C76 20 84 10 96 18',
    RS: 'M4 22 C16 34 22 8 32 18 C40 26 44 36 54 20 C60 10 70 32 78 22 C84 14 90 20 96 16',
};

const PATRON_KEYS: Record<string, MessageKey> = {
    united_states: 'dayton.folder.patron.RBiH',
    belgrade: 'dayton.folder.patron.RS',
    zagreb: 'dayton.folder.patron.HRHB',
};

type Hotspot = { id: string; outline: number[][] };

/** Percent box of a plate hotspot (blocking is in plate pixels). */
function box(blocking: { width: number; height: number; hotspots: Hotspot[] }, id: string): CSSProperties {
    const outline = blocking.hotspots.find(h => h.id === id)?.outline ?? [[0, 0]];
    const xs = outline.map(p => p[0] ?? 0);
    const ys = outline.map(p => p[1] ?? 0);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    return {
        left: left / blocking.width * 100 + '%',
        top: top / blocking.height * 100 + '%',
        width: (Math.max(...xs) - left) / blocking.width * 100 + '%',
        height: (Math.max(...ys) - top) / blocking.height * 100 + '%',
    };
}

interface DaytonSigningBeatProps {
    agreement: DaytonAgreementRecord;
    /** Fallback date when the record predates the signing stamp. */
    fallbackDate: string;
    onContinue: () => void;
}

/**
 * The signature lands (DC A5): one beat between final review and the Verdict. Codex's
 * blank signing document carries no text; the signed map, the date, the war's cost line
 * and the three initials are drawn here at the plate's registered rectangles. The treaty
 * against the mediator's draft sits beside it.
 */
export function DaytonSigningBeat({ agreement, fallbackDate, onContinue }: DaytonSigningBeatProps) {
    const wide = useWideFraming();
    const blocking = wide ? wideBlocking : standardBlocking;
    const [mapOpen, setMapOpen] = useState(false);
    const heading = useRef<HTMLHeadingElement>(null);
    const mapButton = useRef<HTMLButtonElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);
    useLayoutEffect(() => { heading.current?.focus(); }, []);
    const table = useRef<HTMLDivElement>(null);
    const aside = useRef<HTMLElement>(null);
    useLayoutEffect(() => {
        // The map panel is modal over the table: the document and its buttons leave the tab order.
        table.current?.toggleAttribute('inert', mapOpen);
        aside.current?.toggleAttribute('inert', mapOpen);
        if (mapOpen) closeButton.current?.focus();
        else if (returnToMap.current) { returnToMap.current = false; mapButton.current?.focus(); }
    }, [mapOpen]);
    const returnToMap = useRef(false);
    const closeMap = () => { returnToMap.current = true; setMapOpen(false); };

    const signing = agreement.signing;
    const date = signing ? turnToDateString(signing.turn) : fallbackDate;
    const imposed = agreement.terms.imposed;
    const war = signing?.war;

    return (
        <div className="dayton-live dayton-signing" data-testid="dayton-signing-beat" onKeyDown={event => {
            if (event.key === 'Escape' && mapOpen) {
                event.preventDefault();
                event.stopPropagation();
                closeMap();
            }
        }}>
            <div className="dayton-room-window" data-wide={wide} ref={table}>
                <div className="dayton-room-frame dayton-signing-frame">
                    <img src={wide ? widePlate : standardPlate} alt="" data-testid="dayton-signing-plate" />
                    <button type="button" ref={mapButton} className="dayton-signing-map" style={box(blocking, 'map_thumb')}
                        data-testid="dayton-signing-map" aria-label={t('dayton.signing.openMap')} onClick={() => setMapOpen(true)}>
                        <BoardLine controllers={agreement.map.controllers} fit />
                    </button>
                    <p className="dayton-signing-line dayton-signing-date" style={box(blocking, 'date')} data-testid="dayton-signing-date">
                        {t('dayton.signing.date', { date })}
                    </p>
                    <p className="dayton-signing-line dayton-signing-cost" style={box(blocking, 'cost')} data-testid="dayton-signing-cost">
                        {war
                            ? t('dayton.signing.cost', {
                                weeks: formatCount(war.weeks),
                                military: formatCount(war.dead.military),
                                civilian: formatCount(war.dead.civilian),
                                displaced: formatCount(war.displaced),
                            })
                            : t('dayton.signing.costUnavailable')}
                    </p>
                    {SIGNATORIES.map(({ id, faction }) => {
                        const coerced = imposed?.on_faction === faction;
                        return (
                            <div key={id} className="dayton-signing-signature" style={box(blocking, id)}
                                data-testid={`dayton-signing-${faction}`} data-imposed={coerced || undefined}>
                                <svg viewBox="0 0 100 40" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
                                    <path d={STROKES[faction]} />
                                </svg>
                                <span>{t(`dayton.signing.for.${faction}` as 'dayton.signing.for.RBiH')}</span>
                                {coerced && imposed && (
                                    <span className="dayton-signing-imposed">
                                        {t('dayton.signing.imposed', { patron: t(PATRON_KEYS[imposed.by] ?? 'dayton.folder.patron.RBiH') })}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <aside ref={aside} className="dayton-signing-aside" aria-labelledby="dayton-signing-title">
                <p className="dayton-live-kicker">{t('dayton.signing.kicker')}</p>
                <h2 id="dayton-signing-title" ref={heading} tabIndex={-1}>
                    {t(imposed ? 'dayton.signing.titleImposed' : 'dayton.signing.title')}
                </h2>
                <TreatyLedger treaty={agreement.treaty} signed />
                <div className="dayton-live-actions">
                    <button type="button" className="dayton-live-button" onClick={() => setMapOpen(true)}>
                        {t('dayton.signing.openMap')}
                    </button>
                    <button type="button" className="dayton-live-button dayton-live-primary" data-testid="dayton-signing-continue" onClick={onContinue}>
                        {t('dayton.signing.continue')}
                    </button>
                </div>
            </aside>
            {mapOpen && (
                <section className="dayton-live-panel" aria-labelledby="dayton-signing-map-title">
                    <header className="dayton-live-panel-heading">
                        <div>
                            <p className="dayton-live-kicker">{t('dayton.signing.kicker')}</p>
                            <h2 id="dayton-signing-map-title">{t('dayton.signing.map')}</h2>
                        </div>
                        <button type="button" className="dayton-live-button" ref={closeButton}
                            onClick={closeMap}>
                            {t('dayton.signing.close')}
                        </button>
                    </header>
                    <div className="dayton-live-panel-body px-5 py-4">
                        <BoundaryMap special={agreement.map.specialOsids} stages={[
                            { id: 'front', controllers: agreement.map.wartimeControllers },
                            { id: 'signed', controllers: agreement.map.controllers },
                        ]} />
                    </div>
                </section>
            )}
        </div>
    );
}
