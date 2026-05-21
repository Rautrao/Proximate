import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// StrictMode is intentionally omitted: Leaflet's imperative map instance
// reacts poorly to React 18's double-mount in dev (the first map is
// destroyed before the second can initialize cleanly).
createRoot(document.getElementById('root')!).render(<App />);
