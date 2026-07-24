/**
 * National Humanitarian Ledger (Item 2).
 *
 * §6-ADJACENT: this surface DISPLAYS atrocity magnitudes (killed, fled abroad,
 * forced displacement, perpetrator attribution). It is a pure read-model view of
 * `LoadedGameState.nationalDisplacement`, which the adapter exposes VERBATIM from
 * persisted engine state. No figure is derived, scaled, or invented here.
 *
 * Register/tone: this is a LEDGER OF HUMAN COST, not a scoreboard. Framing is
 * tragic/factual and victim-neutral; there is no celebratory or "achievement"
 * styling, no winner, no ranking-for-reward. User-facing COPY/TONE is PENDING
 * OWNER SIGN-OFF before release (see the i18n keys under `humanitarianLedger.*`).
 */
import { useMemo } from 'react';
import type { LoadedGameState } from '../data/types';
import { t } from '../i18n';
import { strictCompare } from '../../../state/validateGameState';
import { turnToDateString } from '../utils/formatters';

interface HumanitarianLedgerPanelProps {
  state: LoadedGameState;
  open: boolean;
  onClose: () => void;
}

const UNKNOWN_CAUSER_BUCKET = '_unknown';

/** Map ethnicity-aligned faction id to the people-name. Victim-neutral. */
function peopleLabel(key: string): string {
  switch (key) {
    case 'RBiH': return 'Bosniaks';
    case 'RS': return 'Serbs';
    case 'HRHB': return 'Croats';
    case UNKNOWN_CAUSER_BUCKET: return 'Unattributed';
    default: return key;
  }
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

export function HumanitarianLedgerPanel({ state, open, onClose }: HumanitarianLedgerPanelProps) {
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

  const byPerpetrator = useMemo(() => {
    const rows: Array<{ perpetrator: string; victim: string; displaced: number; killed: number }> = [];
    for (const [perpetrator, victims] of Object.entries(nd?.humanitarianAggregates ?? {}).sort((a, b) => strictCompare(a[0], b[0]))) {
      for (const [victim, agg] of Object.entries(victims).sort((a, b) => strictCompare(a[0], b[0]))) {
        if (agg.refugeesCreated <= 0 && agg.civilianCasualtiesCaused <= 0) continue;
        rows.push({ perpetrator, victim, displaced: agg.refugeesCreated, killed: agg.civilianCasualtiesCaused });
      }
    }
    return rows;
  }, [nd?.humanitarianAggregates]);

  const overTime = nd?.refugeesByTurn ?? [];
  const maxWeek = useMemo(() => overTime.reduce((m, p) => Math.max(m, p.refugeesCreated), 0), [overTime]);

  if (!open) return null;

  const hasAny = byPeople.rows.length > 0 || byPerpetrator.length > 0 || overTime.length > 0;

  return (
    <div
      className="absolute right-4 top-16 z-30 w-[26rem] rounded-lg border border-panel-border bg-panel-bg/95 backdrop-blur-sm shadow-xl overflow-hidden"
      style={{ direction: 'ltr' }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card border-b border-panel-border">
        <div>
          <div className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
            {t('humanitarianLedger.title')}
          </div>
          <div className="text-xs text-text-secondary italic mt-0.5">{t('humanitarianLedger.subtitle')}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-text-secondary hover:text-interactive text-sm leading-none"
          aria-label="Close"
        >
          x
        </button>
      </div>

      <div className="max-h-[34rem] overflow-auto p-3 space-y-3">
        {!hasAny ? (
          <div className="text-xs text-text-secondary italic">{t('humanitarianLedger.empty')}</div>
        ) : (
          <>
            {/* Killed + fled abroad, by people */}
            {byPeople.rows.length > 0 && (
              <div className="rounded border border-panel-border bg-panel-card/70 p-3 space-y-2">
                <div className="text-xs uppercase tracking-wide text-text-secondary font-semibold">
                  {t('humanitarianLedger.section.byPeople')}
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-text-secondary">
                      <th className="text-left font-medium py-0.5">{t('humanitarianLedger.col.people')}</th>
                      <th className="text-right font-medium py-0.5 px-2">{t('humanitarianLedger.col.killed')}</th>
                      <th className="text-right font-medium py-0.5">{t('humanitarianLedger.col.fledAbroad')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byPeople.rows.map((r) => (
                      <tr key={r.faction} className="border-t border-panel-border/30">
                        <td className="text-left py-0.5 text-text-primary">{peopleLabel(r.faction)}</td>
                        <td className="text-right py-0.5 px-2 font-mono tabular-nums text-red-300">{fmt(r.killed)}</td>
                        <td className="text-right py-0.5 font-mono tabular-nums text-amber-300">{fmt(r.fledAbroad)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-panel-border/60">
                      <td className="text-left py-0.5 text-text-secondary">{t('humanitarianLedger.label.total')}</td>
                      <td className="text-right py-0.5 px-2 font-mono tabular-nums text-red-300">{fmt(byPeople.total.killed)}</td>
                      <td className="text-right py-0.5 font-mono tabular-nums text-amber-300">{fmt(byPeople.total.fledAbroad)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Forced displacement, by responsible side x victim */}
            {byPerpetrator.length > 0 && (
              <div className="rounded border border-panel-border bg-panel-card/70 p-3 space-y-2">
                <div className="text-xs uppercase tracking-wide text-text-secondary font-semibold">
                  {t('humanitarianLedger.section.byPerpetrator')}
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-text-secondary">
                      <th className="text-left font-medium py-0.5">{t('humanitarianLedger.col.perpetrator')}</th>
                      <th className="text-left font-medium py-0.5 px-2">{t('humanitarianLedger.col.victims')}</th>
                      <th className="text-right font-medium py-0.5 px-2">{t('humanitarianLedger.col.displaced')}</th>
                      <th className="text-right font-medium py-0.5">{t('humanitarianLedger.col.killedShort')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byPerpetrator.map((r) => (
                      <tr key={`${r.perpetrator}|${r.victim}`} className="border-t border-panel-border/30">
                        <td className="text-left py-0.5 text-text-primary">{peopleLabel(r.perpetrator)}</td>
                        <td className="text-left py-0.5 px-2 text-text-secondary">{peopleLabel(r.victim)}</td>
                        <td className="text-right py-0.5 px-2 font-mono tabular-nums text-amber-300">{fmt(r.displaced)}</td>
                        <td className="text-right py-0.5 font-mono tabular-nums text-red-300">{fmt(r.killed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Displaced per week sparkline */}
            {overTime.length > 0 && (
              <div className="rounded border border-panel-border bg-panel-card/70 p-3 space-y-2">
                <div className="text-xs uppercase tracking-wide text-text-secondary font-semibold">
                  {t('humanitarianLedger.section.overTime')}
                </div>
                <div className="flex items-end gap-[2px] h-20" role="img" aria-label={t('humanitarianLedger.section.overTime')}>
                  {overTime.map((p) => {
                    const heightPct = maxWeek > 0 ? Math.max(2, (p.refugeesCreated / maxWeek) * 100) : 2;
                    return (
                      <div
                        key={p.turn}
                        className="flex-1 bg-amber-400/50 rounded-t"
                        style={{ height: `${heightPct}%` }}
                        title={`${turnToDateString(p.turn)}: ${fmt(p.refugeesCreated)}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="text-xs text-text-secondary/80 italic">{t('humanitarianLedger.note.verbatim')}</div>
          </>
        )}
      </div>
    </div>
  );
}
