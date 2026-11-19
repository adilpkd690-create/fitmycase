import { jsx as _jsx } from "/vendor/react-jsx-runtime.js";
import { StrictMode } from '/vendor/react.js';
import { createRoot } from '/vendor/react-dom-client.js';
import App from './App.js';
import { PosProvider } from './pos/context.js';

createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(PosProvider, { children: _jsx(App, {}) }) }));
