/**
 * National Humanitarian Ledger (Item 2).
 *
 * §6-ADJACENT: this surface DISPLAYS atrocity magnitudes (killed, fled abroad,
 * forced displacement, perpetrator attribution). It is a pure read-model view of
 * `LoadedGameState.nationalDisplacement`, which the adapter exposes VERBATIM from
 * persisted engine state. No figure is scaled or invented here; the only
 * arithmetic is the plain sum described below for the second table.
 *
 * Register/tone: this is a LEDGER OF HUMAN COST, not a scoreboard. Framing is
 * tragic/factual and victim-neutral; there is no celebratory or "achievement"
 * styling, no winner, no ranking-for-reward. Copy (EN + BCS) was ruled on by the
 * Pyrrhic sensitive-history panel on 2026-11-13; the record and its binding
 * conditions live in docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md (§4 and the
 * §6 "Sensitive-copy lane" record). In short:
 *   - Victims are named as peoples.
 *   - The second table names the SIDE CONTROLLING THE AREA (displacement attribution
 *     lane, eight-seat bright-line panel, 2026-11-13, unanimous GO). The live writers
 *     book `caused_by` to the side that took or held control after a takeover, or that
 *     carried out a paramilitary sweep; that is control, not culpability, and the
 *     header says so. The dormant siege path now books the besieger, never the holder.
 *     Siege and shelling harm is not modelled, so the scope note (`note.scope`) says it
 *     is not counted and that these figures understate the harm done by besieging
 *     forces. Both notes sit inside the table block, above the rows, so a crop of the
 *     rows carries them. A lane that revives the siege path or models siege harm must
 *     rewrite this header, the section title and the note, and re-convene the panel.
 *   - Rows: one per (side, people) pair with displaced-or-killed or killed > 0, read
 *     only from `refugeesCreated` / `civilianCasualtiesCaused` (never `refugeesReceived`,
 *     which would create false same-side rows). "Responsible side not recorded" only
 *     when non-zero, and last.
 *   - Rows stay in key order, never sorted by value; no totals or subtotals per side;
 *     no highlight of the largest row; no marker on the player's side.
 *
 * Surface redesign, step 4 (2026-11-12): one surface in the Command Surface style
 * (was a small translucent panel at the right edge). LAYOUT ONLY: every string,
 * figure, row order and colour role (killed red, displaced amber) is unchanged;
 * nothing is ranked, highlighted or framed as a result.
 */
import { useMemo } from 'react';
import type { LoadedGameState } from '../data/types';
import { t, useLocale, type MessageKey } from '../i18n';
import { strictCompare } from '../../../state/validateGameState';
import { turnToDateString } from '../utils/formatters';
import {
  SurfaceCloseButton,
  SurfaceColumns,
  SurfaceContent,
  SurfaceFrame,
  SurfaceHeader,
  SurfacePanel,
  SurfaceSection,
  SurfaceSections,
} from './surface/Surface';
import { useDialogFocus } from '../../shared/Modal';
import { useSurfaceEscape } from './surface/useSurfaceEscape';
import { SurfaceModalLayer } from './surface/SurfaceModalLayer';

interface HumanitarianLedgerPanelProps {
  state: LoadedGameState;
  open: boolean;
  onClose: () => void;
}

/** Victims, by people. Keys are ethnicity-aligned faction ids. */
const PEOPLE_KEYS: Record<string, MessageKey> = {
  RBiH: 'humanitarianLedger.people.RBiH',
  RS: 'humanitarianLedger.people.RS',
  HRHB: 'humanitarianLedger.people.HRHB',
};

function peopleLabel(key: string): string {
  const messageKey = PEOPLE_KEYS[key];
  return messageKey ? t(messageKey) : key;
}

/** Side controlling the area, named as forces. Keys are `caused_by` faction ids. */
const SIDE_KEYS: Record<string, MessageKey> = {
  RBiH: 'humanitarianLedger.side.RBiH',
  RS: 'humanitarianLedger.side.RS',
  HRHB: 'humanitarianLedger.side.HRHB',
};

/** Any `caused_by` key that is not a faction (the engine's `_unknown` bucket) reads "not recorded". */
function sideLabel(key: string): string {
  const messageKey = SIDE_KEYS[key];
  return messageKey ? t(messageKey) : t('humanitarianLedger.side.notRecorded');
}

type HumanitarianAggregates = NonNullable<LoadedGameState['nationalDisplacement']>['humanitarianAggregates'];

/**
 * One row per (side controlling the area, people) pair with displaced-or-killed or
 * killed > 0. Key order (side, then people); sides that are not factions come last.
 * Never sorted by value, never totalled per side (Ring 3 #7).
 */
export function displacedOrKilledBySide(
  aggregates: HumanitarianAggregates | undefined,
): Array<{ side: string; victim: string; displaced: number; killed: number }> {
  const rows: Array<{ side: string; victim: string; displaced: number; killed: number }> = [];
  for (const [side, victims] of Object.entries(aggregates ?? {})) {
    for (const [victim, agg] of Object.entries(victims)) {
      const displaced = agg.refugeesCreated;
      const killed = agg.civilianCasualtiesCaused;
      if (displaced > 0 || killed > 0) rows.push({ side, victim, displaced, killed });
    }
  }
  const sideRank = (side: string): number => (SIDE_KEYS[side] ? 0 : 1);
  return rows.sort(
    (a, b) =>
      sideRank(a.side) - sideRank(b.side) ||
      strictCompare(a.side, b.side) ||
      strictCompare(a.victim, b.victim),
  );
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

const TH = 'py-2 text-[15px] font-semibold text-[#b9ad94]';
const TD = 'py-2.5 text-[16px]';
const NUM = 'font-mono font-semibold tabular-nums';

export function HumanitarianLedgerPanel({ state, open, onClose }: HumanitarianLedgerPanelProps) {
  useLocale();
  useSurfaceEscape(open, onClose);
  const dialogFocus = useDialogFocus(open);
  const nd = state.nationalDisplacement;

  const byPeople = useMemo(() => {
    const rows = Object.entries(nd?.civilianCasualtiesByEthnicity ?? {})
      .map(([faction, v]) => ({ faction, killed: v.killed, fledAbroad: v.fledAbroad }))
      .sort((a, b) => strictCompare(a.faction, b.faction));
    const total = rows.reduce(
      (acc, r) => ({ killed: acc.killed + r.killed, fledAbroad: acc.fledAbroad + r.fledAbroad }),
      { killed: 0, fledAbroad: 0 },
    );
    return { rows, total };
  }, [nd?.civilianCasualtiesByEthnicity]);

  const bySide = useMemo(
    () => displacedOrKilledBySide(nd?.humanitarianAggregates),
    [nd?.humanitarianAggregates],
  );

  const overTime = nd?.refugeesByTurn ?? [];
  const maxWeek = useMemo(() => overTime.reduce((m, p) => Math.max(m, p.refugeesCreated), 0), [overTime]);

  if (!open) return null;

  const hasAny = byPeople.rows.length > 0 || bySide.length > 0 || overTime.length > 0;

  return (
    <SurfaceModalLayer>
    <SurfaceFrame
      layerClassName=""
      ref={dialogFocus.ref}
      onKeyDownCapture={dialogFocus.onKeyDown}
      data-testid="humanitarian-ledger-panel"
      aria-modal="true"
      aria-labelledby="humanitarian-ledger-title"
      style={{ direction: 'ltr' }}
    >
      <SurfaceHeader
        eyebrow={t('humanitarianLedger.subtitle')}
        title={<span id="humanitarian-ledger-title">{t('humanitarianLedger.title')}</span>}
        close={<SurfaceCloseButton onClick={onClose} />}
      />
      <SurfaceColumns layout="single">
        <SurfaceContent>
          <SurfaceSections className="max-w-[88rem]">
            {!hasAny ? (
              <p className="m-0 text-[17px] italic text-[#b9ad94]">{t('humanitarianLedger.empty')}</p>
            ) : (
              <>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,32rem),1fr))] gap-x-8 gap-y-7">
                  {/* Killed + fled abroad, by people */}
                  {byPeople.rows.length > 0 && (
                    <SurfaceSection label={t('humanitarianLedger.section.byPeople')}>
                      <SurfacePanel>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-[#262b35]">
                              <th className={`${TH} text-left`}>{t('humanitarianLedger.col.people')}</th>
                              <th className={`${TH} px-3 text-right`}>{t('humanitarianLedger.col.killed')}</th>
                              <th className={`${TH} text-right`}>{t('humanitarianLedger.col.fledAbroad')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {byPeople.rows.map((r) => (
                              <tr key={r.faction} className="border-b border-[#262b35]/60">
                                <td className={`${TD} text-left text-[#f1e6c8]`}>{peopleLabel(r.faction)}</td>
                                <td className={`${TD} ${NUM} px-3 text-right text-red-300`}>{fmt(r.killed)}</td>
                                <td className={`${TD} ${NUM} text-right text-amber-300`}>{fmt(r.fledAbroad)}</td>
                              </tr>
                            ))}
                            <tr className="border-t border-[#3a4150]">
                              <td className={`${TD} text-left text-[#b9ad94]`}>{t('humanitarianLedger.label.total')}</td>
                              <td className={`${TD} ${NUM} px-3 text-right text-red-300`}>{fmt(byPeople.total.killed)}</td>
                              <td className={`${TD} ${NUM} text-right text-amber-300`}>{fmt(byPeople.total.fledAbroad)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </SurfacePanel>
                    </SurfaceSection>
                  )}

                  {/* Displaced or killed, by side controlling the area (see header) */}
                  {bySide.length > 0 && (
                    <SurfaceSection label={t('humanitarianLedger.section.byPerpetrator')}>
                      <SurfacePanel>
                        <div data-testid="humanitarian-ledger-side-notes" className="mb-3 flex flex-col gap-2">
                          <p className="m-0 text-[14px] italic leading-relaxed text-[#b9ad94]">{t('humanitarianLedger.note.scope')}</p>
                          <p className="m-0 text-[14px] italic leading-relaxed text-[#b9ad94]">{t('humanitarianLedger.note.verbatim')}</p>
                        </div>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-[#262b35]">
                              <th className={`${TH} text-left`}>{t('humanitarianLedger.col.perpetrator')}</th>
                              <th className={`${TH} px-3 text-left`}>{t('humanitarianLedger.col.victims')}</th>
                              <th className={`${TH} px-3 text-right`}>{t('humanitarianLedger.col.displaced')}</th>
                              <th className={`${TH} text-right`}>{t('humanitarianLedger.col.killedShort')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bySide.map((r) => (
                              <tr key={`${r.side}|${r.victim}`} className="border-b border-[#262b35]/60 last:border-b-0">
                                <td className={`${TD} text-left text-[#f1e6c8]`}>{sideLabel(r.side)}</td>
                                <td className={`${TD} px-3 text-left text-[#f1e6c8]`}>{peopleLabel(r.victim)}</td>
                                <td className={`${TD} ${NUM} px-3 text-right text-amber-300`}>{fmt(r.displaced)}</td>
                                <td className={`${TD} ${NUM} text-right text-red-300`}>{fmt(r.killed)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </SurfacePanel>
                    </SurfaceSection>
                  )}
                </div>

                {/* Displaced per week */}
                {overTime.length > 0 && (
                  <SurfaceSection label={t('humanitarianLedger.section.overTime')}>
                    <SurfacePanel>
                      <div className="flex h-36 items-end gap-[2px]" role="img" aria-label={t('humanitarianLedger.section.overTime')}>
                        {overTime.map((p) => {
                          const heightPct = maxWeek > 0 ? Math.max(2, (p.refugeesCreated / maxWeek) * 100) : 2;
                          return (
                            <div
                              key={p.turn}
                              className="flex-1 rounded-t bg-amber-300/55"
                              style={{ height: `${heightPct}%` }}
                              title={`${turnToDateString(p.turn)}: ${fmt(p.refugeesCreated)}`}
                            />
                          );
                        })}
                      </div>
                    </SurfacePanel>
                  </SurfaceSection>
                )}

                <p className="m-0 max-w-[60rem] text-[15px] italic leading-relaxed text-[#b9ad94]">{t('humanitarianLedger.note.verbatim')}</p>
              </>
            )}
          </SurfaceSections>
        </SurfaceContent>
      </SurfaceColumns>
    </SurfaceFrame>
    </SurfaceModalLayer>
  );
}
