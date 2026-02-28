import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// StrictMode intentionally omitted — MapLibre GL's imperative WebGL lifecycle
// (addProtocol, map.on('load'), canvas management) is incompatible with
// React 18 StrictMode's mount-cleanup-remount cycle in development.
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

