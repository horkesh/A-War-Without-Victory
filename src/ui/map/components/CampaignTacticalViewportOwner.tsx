import { RootErrorBoundary } from './RootErrorBoundary';
import {
  TacticalMapViewport,
  type TacticalMapInteractionReadiness,
} from './TacticalMapViewport';

interface CampaignTacticalViewportOwnerProps {
  active: boolean;
  loaded: boolean;
  campaignViewportEpoch: number;
  onInteractionReadyChange?: (readiness: TacticalMapInteractionReadiness) => void;
}

/** Remounts graphics at the App-owned campaign epoch, including pre-viewport loads. */
export function CampaignTacticalViewportOwner({
  active,
  loaded,
  campaignViewportEpoch,
  onInteractionReadyChange,
}: CampaignTacticalViewportOwnerProps) {
  if (!loaded) return null;
  return (
    <RootErrorBoundary key={campaignViewportEpoch} zone="map">
      <TacticalMapViewport
        active={active}
        onInteractionReadyChange={onInteractionReadyChange}
      />
    </RootErrorBoundary>
  );
}
