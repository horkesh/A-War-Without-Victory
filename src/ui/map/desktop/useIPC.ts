import { useMemo } from 'react';
import { createDesktopBridgeClient, getAwwvBridge } from './bridge';

export function useIPC() {
  return useMemo(() => createDesktopBridgeClient(getAwwvBridge()), []);
}
