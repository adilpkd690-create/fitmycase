import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from '/vendor/react-jsx-runtime.js';
import { useEffect, useState } from '/vendor/react.js';
import { Cable, CheckCircle2, Printer, RefreshCw, Settings2 } from '/vendor/lucide-react.js';
import { androidBluetoothPrintAvailable, printAndroidBluetoothLabels } from './android-tspl.js';
import { DEFAULT_PRINT_BRIDGE_URL, discoverWindowsPrinters, getPrintBridgeConfig, savePrintBridgeConfig, sendWindowsLabels } from './print-bridge.js';
import { Warning } from '../pos/ui.js';

export function DirectPrintControl({ items, copies = 1, includePrice = true, widthMm = 38.1, heightMm = 24.892 }) {
    const [saved, setSaved] = useState(() => getPrintBridgeConfig());
    const [baseUrl, setBaseUrl] = useState(saved?.baseUrl ?? DEFAULT_PRINT_BRIDGE_URL);
    const [token, setToken] = useState(saved?.token ?? '');
    const [printerName, setPrinterName] = useState(saved?.printerName ?? '');
    const [printers, setPrinters] = useState([]);
    const isWindows = typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent || navigator.platform || '');
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');
    const [androidBusy, setAndroidBusy] = useState(false), [androidIssue, setAndroidIssue] = useState(''), [androidNotice, setAndroidNotice] = useState('');
    const [showSetup, setShowSetup] = useState(!saved && isWindows);
    const [busy, setBusy] = useState(false);
    const [issue, setIssue] = useState('');
    const [notice, setNotice] = useState('');
    useEffect(() => { const current = getPrintBridgeConfig(); if (current) { setSaved(current); setShowSetup(false); } }, []);
    if (isAndroid) return _jsxs('section', { className: 'mc-direct-print', children: [
        _jsxs('div', { className: 'mc-direct-print-head', children: [_jsxs('span', { children: [_jsx(Cable, { size: 17 }), ' Android Bluetooth direct print'] }), _jsx('span', { className: 'mc-direct-print-status', children: androidBluetoothPrintAvailable() ? 'Chrome Web Serial ready' : 'Chrome Web Serial unavailable' })] }),
        _jsx('p', { className: 'cloud-form-help', children: androidBluetoothPrintAvailable() ? 'Pair HQ450L in Android Bluetooth settings first. Tap below and select the paired printer. Sends TSPL label commands directly, without creating a PDF. Uses 9600 baud, 8-N-1.' : 'Open this site in current Google Chrome on Android (Chrome 138+). This browser does not expose Bluetooth serial printing. PDF remains available as a fallback.' }),
        _jsx('button', { type: 'button', className: 'button primary-button mc-direct-print-action', disabled: androidBusy || !androidBluetoothPrintAvailable(), onClick: () => { if (androidBusy) return; setAndroidBusy(true); setAndroidIssue(''); setAndroidNotice(''); void printAndroidBluetoothLabels(items, copies, includePrice).then(r => setAndroidNotice(`${r.printedLabels} label(s) sent directly to the Bluetooth printer.`)).catch(e => setAndroidIssue(e instanceof Error ? e.message : 'Android Bluetooth printing failed.')).finally(() => setAndroidBusy(false)); }, children: [_jsx(Cable, { size: 16 }), ' ', androidBusy ? 'Connecting / printing…' : `Connect & print ${items.length * copies} label(s)`] }),
        androidIssue && _jsx(Warning, { tone: 'error', children: androidIssue }),
        androidNotice && _jsx('p', { role: 'status', className: 'mc-direct-print-notice', children: androidNotice })
    ]);
    if (!isWindows) return _jsx('p', { className: 'cloud-form-help mc-direct-print-mobile-note', children: 'Windows 10/11 USB direct print and Android Chrome Bluetooth serial direct print are supported. On iPhone or a browser without Web Serial, use the PDF fallback.' });
    const discover = async () => {
        if (busy) return;
        setBusy(true); setIssue(''); setNotice('');
        try {
            const found = await discoverWindowsPrinters(baseUrl, token.trim());
            setPrinters(found);
            const best = found.find(p => /HQ[- ]?450L/i.test(p.name || '') || /HQ[- ]?450L/i.test(p.driver || ''));
            if (!printerName && best) setPrinterName(best.name);
            setNotice(found.length ? `${found.length} Windows printer queue(s) found.` : 'No Windows printers were found. Install the HQ450L driver and reconnect USB.');
        } catch (e) { setIssue(e instanceof Error ? e.message : 'Could not find the Windows printer.'); }
        finally { setBusy(false); }
    };
    const connect = async () => {
        if (busy) return;
        setBusy(true); setIssue(''); setNotice('');
        try {
            const found = await discoverWindowsPrinters(baseUrl, token.trim());
            if (!found.some(p => p.name === printerName.trim())) throw new Error('That printer queue is not present in Windows. Check the name and USB connection.');
            const config = savePrintBridgeConfig({ baseUrl, token, printerName });
            setPrinters(found); setSaved(config); setShowSetup(false); setNotice(`Connected to ${config.printerName}.`);
        } catch (e) { setIssue(e instanceof Error ? e.message : 'Could not connect to the Windows printer.'); }
        finally { setBusy(false); }
    };
    const print = async () => {
        if (busy) return;
        setBusy(true); setIssue(''); setNotice('');
        try {
            const config = saved ?? savePrintBridgeConfig({ baseUrl, token, printerName });
            const result = await sendWindowsLabels(config, items, copies, includePrice, widthMm, heightMm);
            setNotice(`${result.printedLabels} label(s) sent to ${result.printerName}${result.batches > 1 ? ` in ${result.batches} batches` : ''}.`);
        } catch (e) { setIssue(e instanceof Error ? e.message : 'Direct printing failed.'); }
        finally { setBusy(false); }
    };
    return _jsxs('section', { className: 'mc-direct-print', children: [
        _jsxs('div', { className: 'mc-direct-print-head', children: [
            _jsxs('span', { children: [_jsx(Printer, { size: 17 }), ' Windows USB direct print'] }),
            _jsx('button', { type: 'button', className: 'button', onClick: () => { setShowSetup(v => !v); setIssue(''); }, children: [_jsx(Settings2, { size: 14 }), ' ', showSetup ? 'Hide setup' : saved ? 'Printer setup' : 'Connect printer'] }),
        ] }),
        saved && !showSetup && _jsxs('p', { className: 'mc-direct-print-status', children: [_jsx(CheckCircle2, { size: 15 }), ` ${saved.printerName}`] }),
        showSetup && _jsxs(_Fragment, { children: [
            _jsx('p', { className: 'cloud-form-help', children: 'Windows 10/11 laptop-ൽ Mobile Craft Print Bridge install ചെയ്ത് അവിടെ ലഭിക്കുന്ന token ഇവിടെ paste ചെയ്യുക. Android ഉപകരണത്തിൽ ഈ Windows bridge ഉപയോഗിക്കില്ല; Android Chrome Bluetooth direct print section വേറെയാണ്.' }),
            _jsxs('label', { children: ['Local bridge address', _jsx('input', { value: baseUrl, onChange: e => setBaseUrl(e.target.value), spellCheck: false, autoCapitalize: 'off' })] }),
            _jsxs('label', { children: ['Windows bridge token', _jsx('input', { type: 'password', value: token, onChange: e => setToken(e.target.value), autoComplete: 'off', spellCheck: false, placeholder: 'Paste token from Install-Bridge.ps1' })] }),
            _jsxs('label', { children: ['Printer queue', _jsxs('div', { className: 'mc-direct-print-select', children: [
                printers.length ? _jsxs('select', { value: printerName, onChange: e => setPrinterName(e.target.value), children: [_jsx('option', { value: '', children: 'Choose printer' }), printers.map(p => _jsx('option', { value: p.name, children: `${p.name} · ${p.port}` }, p.name))] }) : _jsx('input', { value: printerName, onChange: e => setPrinterName(e.target.value), placeholder: 'HQ450L' }),
                _jsx('button', { type: 'button', className: 'button', disabled: busy || token.trim().length < 32, onClick: () => void discover(), children: [_jsx(RefreshCw, { size: 14 }), ' Find'] }),
            ] })] }),
            _jsx('button', { type: 'button', className: 'button', disabled: busy || !token.trim() || !printerName.trim(), onClick: () => void connect(), children: busy ? 'Connecting…' : 'Connect & save printer' }),
        ] }),
        _jsx('button', { type: 'button', className: 'button primary-button mc-direct-print-action', disabled: busy || !saved, onClick: () => void print(), children: [_jsx(Printer, { size: 16 }), ' ', busy ? 'Sending…' : `Direct print ${items.length * copies} label(s)`] }),
        issue && _jsx(Warning, { tone: 'error', children: issue }),
        notice && _jsx('p', { role: 'status', className: 'mc-direct-print-notice', children: notice }),
    ] });
}
