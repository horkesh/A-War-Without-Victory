import { RootErrorBoundary } from './RootErrorBoundary';
import {
  TacticalMapViewport,
  type TacticalMapInteractionReadiness,
} from './TacticalMapViewport';
import type { FieldOperationPlanTarget } from '../utils/fieldInspectionTarget';

interface CampaignTacticalViewportOwnerProps {
  active: boolean;
  loaded: boolean;
  campaignViewportEpoch: number;
  onInteractionReadyChange?: (readiness: TacticalMapInteractionReadiness) => void;
  operationPlanFocus?: FieldOperationPlanTarget | null;
  onReturnToOperationDossier?: () => void;
}

/** Remounts graphics at the App-owned campaign epoch, including pre-viewport loads. */
export function CampaignTacticalViewportOwner({
  active,
  loaded,
  campaignViewportEpoch,
  onInteractionReadyChange,
  operationPlanFocus,
  onReturnToOperationDossier,
}: CampaignTacticalViewportOwnerProps) {
  if (!loaded) return null;
  return (
    <RootErrorBoundary key={campaignViewportEpoch} zone="map">
      <TacticalMapViewport
        active={active}
        onInteractionReadyChange={onInteractionReadyChange}
        operationPlanFocus={operationPlanFocus}
        onReturnToOperationDossier={onReturnToOperationDossier}
      />
    </RootErrorBoundary>
  );
}
