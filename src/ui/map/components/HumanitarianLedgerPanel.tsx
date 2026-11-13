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
 *   - NO responsible-side column. The engine's `caused_by` is not a reliable
 *     perpetrator: siege and encirclement displacement (`src/state/displacement.ts`,
 *     the pressure path) is booked to the side HOLDING the besieged municipality,
 *     for every census group in it, so a "responsible" column would pin the
 *     besieger's victims on the defender. The second table therefore sums
 *     `displacement_humanitarian_aggregates` over every `caused_by` key and shows
 *     one row per victim group. The side labels (`humanitarianLedger.side.*`)
 *     ship as keys for the engine follow-up that fixes siege attribution, which
 *     needs its own §6 panel before a responsible column may return.
 *   - Rows stay in key order, never sorted by value; no highlight of the largest
 *     row; no marker on the player's side.
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

type HumanitarianAggregates = NonNullable<LoadedGameState['nationalDisplacement']>['humanitarianAggregates'];

/**
 * Displaced-or-killed and killed per victim group, summed over every `caused_by`
 * key (no responsible side is shown; see the header). Key order, never by value.
 */
export function displacedOrKilledByPeople(
  aggregates: HumanitarianAggregates | undefined,
): Array<{ victim: string; displaced: number; killed: number }> {
  const byVictim = new Map<string, { victim: string; displaced: number; killed: number }>();
  for (const victims of Object.values(aggregates ?? {})) {
    for (const [victim, agg] of Object.entries(victims)) {
      const row = byVictim.get(victim) ?? { victim, displaced: 0, killed: 0 };
      row.displaced += agg.refugeesCreated;
      row.killed += agg.civilianCasualtiesCaused;
      byVictim.set(victim, row);
    }
  }
  return [...byVictim.values()]
    .filter((r) => r.displaced > 0 || r.killed > 0)
    .sort((a, b) => strictCompare(a.victim, b.victim));
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

  const byPerpetrator = useMemo(
    () => displacedOrKilledByPeople(nd?.humanitarianAggregates),
    [nd?.humanitarianAggregates],
  );

  const overTime = nd?.refugeesByTurn ?? [];
  const maxWeek = useMemo(() => overTime.reduce((m, p) => Math.max(m, p.refugeesCreated), 0), [overTime]);

  if (!open) return null;

  const hasAny = byPeople.rows.length > 0 || byPerpetrator.length > 0 || overTime.length > 0;

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

                  {/* Displaced or killed, by people (no responsible side; see header) */}
                  {byPerpetrator.length > 0 && (
                    <SurfaceSection label={t('humanitarianLedger.section.byPerpetrator')}>
                      <SurfacePanel>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-[#262b35]">
                              <th className={`${TH} text-left`}>{t('humanitarianLedger.col.people')}</th>
                              <th className={`${TH} px-3 text-right`}>{t('humanitarianLedger.col.displaced')}</th>
                              <th className={`${TH} text-right`}>{t('humanitarianLedger.col.killedShort')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {byPerpetrator.map((r) => (
                              <tr key={r.victim} className="border-b border-[#262b35]/60 last:border-b-0">
                                <td className={`${TD} text-left text-[#f1e6c8]`}>{peopleLabel(r.victim)}</td>
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
