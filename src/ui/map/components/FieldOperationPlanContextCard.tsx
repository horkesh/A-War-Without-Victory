import type { FieldOperationPlanPresentation } from '../data/fieldOperationPlanFocus.js';
import { t } from '../i18n/index.js';
import type { FieldOperationFocusReceipt } from '../map/fieldOperationFocusController.js';

export function FieldOperationPlanContextCard({
  presentation,
  focusReceipt,
  onSelectObjective,
  onReturn,
}: {
  presentation: FieldOperationPlanPresentation;
  focusReceipt?: FieldOperationFocusReceipt | null;
  onSelectObjective: (osid: string) => void;
  onReturn: () => void;
}) {
  return (
    <aside
      data-awwv-counter-occluder="true"
      data-testid="field-operation-plan-context"
      data-field-operation-focus-key={focusReceipt?.key ?? ''}
      data-field-operation-focus-status={focusReceipt?.status ?? 'pending'}
      className="pointer-events-auto absolute right-5 top-24 z-30 w-[min(22rem,calc(100vw-2rem))] rounded border border-amber-400/35 bg-[#10151d]/95 p-3 shadow-2xl backdrop-blur-sm"
    >
      <div className="text-xs font-bold uppercase tracking-[0.12em] text-amber-300">
        {t('fieldOperationPlan.title')}
      </div>
      <div
        role="status"
        data-testid="field-operation-focus-status"
        className={`mt-1 text-xs font-semibold ${focusReceipt?.status === 'failed' ? 'text-red-300' : 'text-text-muted'}`}
      >
        {focusReceipt?.status === 'applied'
          ? t('fieldOperationPlan.focusApplied')
          : focusReceipt?.status === 'failed'
            ? t('fieldOperationPlan.focusFailed')
            : t('fieldOperationPlan.focusPending')}
      </div>
      <div className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-text-muted">
        {t('fieldOperationPlan.objectives', { count: presentation.objectives.length })}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {presentation.objectives.map((objective) => (
          <button
            key={objective.osid}
            type="button"
            data-testid="field-operation-objective"
            data-osid={objective.osid}
            onClick={() => onSelectObjective(objective.osid)}
            className="rounded border border-amber-300/45 bg-amber-300/10 px-2 py-1 text-left text-xs font-semibold text-amber-100 transition hover:bg-amber-300/20"
          >
            {objective.label}
          </button>
        ))}
      </div>
      {presentation.staging.length > 0 && (
        <>
          <div className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-text-muted">
            {t('fieldOperationPlan.staging', { count: presentation.staging.length })}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {presentation.staging.map((staging) => (
              <span
                key={staging.osid}
                data-testid="field-operation-staging"
                data-osid={staging.osid}
                className="rounded border border-sky-300/40 bg-sky-300/10 px-2 py-1 text-xs text-sky-100"
              >
                {staging.label}
              </span>
            ))}
          </div>
        </>
      )}
      <div className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-text-muted">
        {t('fieldOperationPlan.participants', { count: presentation.participants.length })}
      </div>
      <div className="mt-1 max-h-28 space-y-1 overflow-y-auto">
        {presentation.participants.length > 0 ? presentation.participants.map((participant) => (
          <div key={participant.id} className="flex items-center justify-between gap-2 text-xs text-text-secondary">
            <span className="truncate font-semibold text-text-primary">{participant.label}</span>
            <span className="shrink-0 text-text-muted">{participant.locationLabel}</span>
          </div>
        )) : (
          <div className="text-xs text-text-muted">{t('fieldOperationPlan.noReportedParticipants')}</div>
        )}
      </div>
      <button
        type="button"
        data-testid="field-operation-return-to-dossier"
        onClick={onReturn}
        className="mt-3 h-8 w-full rounded border border-amber-400/40 bg-amber-400/12 text-xs font-bold uppercase tracking-[0.08em] text-amber-300 transition hover:bg-amber-400/20"
      >
        {t('fieldOperationPlan.returnToDossier')}
      </button>
    </aside>
  );
}
