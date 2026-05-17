import { Component, type ErrorInfo, type ReactNode } from 'react';

type RootErrorBoundaryProps = {
  zone: string;
  children?: ReactNode;
};

type RootErrorBoundaryState = {
  error: Error | null;
};

function formatZoneLabel(zone: string): string {
  return zone.charAt(0).toUpperCase() + zone.slice(1);
}

export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[RootErrorBoundary] ${this.props.zone} failed to render`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children ?? null;

    const zoneLabel = formatZoneLabel(this.props.zone);

    return (
      <div
        role="status"
        aria-label={`${this.props.zone} unavailable`}
        data-testid={`root-error-boundary-${this.props.zone.replace(/\s+/g, '-')}`}
        className="pointer-events-auto fixed right-4 top-28 z-[7600] max-w-[18rem] rounded border border-red-500 bg-panel-bg/95 px-3 py-2 text-xs text-gray-100 shadow-lg"
      >
        <div className="font-semibold text-red-300">{zoneLabel} unavailable</div>
        <div className="mt-1 text-gray-300">Open another panel or reload the map.</div>
      </div>
    );
  }
}
