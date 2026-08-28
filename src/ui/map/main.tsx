import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { CRASH_DIAGNOSTICS_APP_VERSION, installCrashDiagnosticsCapture } from './services/telemetry/crashCapture';

installCrashDiagnosticsCapture({
    appVersion: CRASH_DIAGNOSTICS_APP_VERSION,
    uiSurface: 'tactical_map',
});

function EmbeddedAppRoot() {
    useEffect(() => {
        const embedded = new URLSearchParams(window.location.search).get('embedded') === '1';
        if (!embedded || window.parent === window) return;
        window.parent.postMessage({ type: 'awwv-shell:ready' }, '*');
    }, []);

    return <App />;
}

// StrictMode intentionally omitted Ã¢â‚¬â€ MapLibre GL's imperative WebGL lifecycle
// (addProtocol, map.on('load'), canvas management) is incompatible with
// React 18 StrictMode's mount-cleanup-remount cycle in development.
ReactDOM.createRoot(document.getElementById('root')!).render(<EmbeddedAppRoot />);
