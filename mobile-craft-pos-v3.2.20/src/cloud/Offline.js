import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "/vendor/react-jsx-runtime.js";
import { useEffect, useState } from '/vendor/react.js';
import { ArrowDownToLine, FileLock2, ScanLine, WifiOff } from '/vendor/lucide-react.js';
import { Dialog } from '../components/Controls.js';
import { BarcodeScanner } from '../pos/BarcodeScanner.js';
import { lookupBarcode } from '../pos/barcode-match.js';
import { lookupFeedback } from '../pos/barcode.js';
import { Warning, inr } from '../pos/ui.js';
import { errorText, when } from './api.js';
import { loadVault, openNotebook, seal, unseal, writeVault } from './vault.js';
export function OfflineNotebook({ close, source, onUse }) {
    const [stored, setStored] = useState(null), [data, setData] = useState(null), [pass, setPass] = useState(''), [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false), [issue, setIssue] = useState(''), [note, setNote] = useState(''), [cart, setCart] = useState({}), [term, setTerm] = useState(''), [camera, setCamera] = useState(false), [changed, setChanged] = useState(false);
    useEffect(() => { let current = true; void loadVault().then(x => { if (current)
        setStored(x); }).catch(e => { if (current)
        setIssue(errorText(e)); }).finally(() => { if (current)
        setLoading(false); }); return () => { current = false; }; }, []);
    const matches = Boolean(data && source && data.actor === source.actor && data.branch === source.branch);
    const run = async (fn) => { if (busy)
        return; setBusy(true); setIssue(''); setNote(''); try {
        await fn();
    }
    catch (e) {
        setIssue(errorText(e));
    }
    finally {
        setBusy(false);
    } };
    const write = async (n) => { const entry = await seal(pass, n); await writeVault(stored, entry); setStored(entry); setData(n); setChanged(false); };
    const open = async (e) => {
        e.preventDefault();
        await run(async () => {
            if (stored) {
                const n = await openNotebook(pass, stored);
                setData(n);
                setCart(n.draft?.lines ?? {});
                return;
            }
            if (!source)
                throw Error('Prepare this browser from the signed-in counter first.');
            const n = { type: 'mobile-craft-counter/1', actor: source.actor, branch: source.branch, shop: source.shop, catalogue: source.products, refreshedAt: new Date().toISOString(), draft: null };
            await write(n);
            // Best-effort: the browser can decline persistent storage. Never promise device-loss recovery.
            void navigator.storage?.persist?.().catch(() => false);
            setNote('Offline notebook is ready on this browser.');
        });
    };
    const add = (p) => {
        const have = cart[p.id] ?? 0;
        if (!p.active || have >= p.qty)
            return { tone: 'warning', title: 'Not enough in the cached count', detail: p.name };
        if (!have && Object.keys(cart).length >= 100)
            return { tone: 'warning', title: 'A draft can hold at most 100 lines' };
        setCart(prev => ({ ...prev, [p.id]: Math.min(p.qty, (prev[p.id] ?? 0) + 1) }));
        setChanged(true);
        setIssue('');
        return { tone: 'success', title: 'Added to draft', detail: p.name };
    };
    const remove = (id) => { setCart(q => { const n = { ...q }; if (n[id] > 1)
        n[id]--;
    else
        delete n[id]; return n; }); setChanged(true); };
    const scan = (code) => { const m = lookupBarcode(data?.catalogue ?? [], code); return m.kind === 'found' ? add(m.product) : lookupFeedback(m.kind); };
    const closeSafely = () => !busy && (!changed || confirm('Close without saving your draft edits?'));
    return _jsxs(Dialog, { title: "Offline counter notebook", onClose: close, beforeClose: closeSafely, children: [_jsxs("p", { className: "cloud-hint", children: [_jsx(WifiOff, { size: 16 }), " Cache available stock and save one encrypted draft on this trusted device. A pending draft is not a bill or an inventory movement."] }), issue && _jsx(Warning, { tone: "error", children: issue }), note && _jsx("p", { role: "status", className: "cloud-scan-note", children: note }), loading ? _jsx("p", { role: "status", children: "Checking this device\u2026" }) : !data ? stored || source ? _jsxs("form", { className: "cloud-op-form", onSubmit: e => void open(e), children: [_jsxs("label", { children: ["Offline passphrase", _jsx("input", { type: "password", required: true, minLength: 12, maxLength: 256, autoComplete: stored ? 'current-password' : 'new-password', value: pass, onChange: e => setPass(e.target.value) })] }), _jsx("small", { children: "At least 12 characters. Use a separate passphrase and keep it privately; we cannot recover it. Do not prepare a public/shared browser." }), _jsxs("button", { className: "button primary-button", disabled: busy, type: "submit", children: [_jsx(FileLock2, { size: 16 }), stored ? 'Unlock notebook' : 'Prepare this device'] })] }) : _jsx(Warning, { children: "No notebook here yet. Connect, sign in and open Offline counter on the intended device once." }) : _jsxs(_Fragment, { children: [_jsxs("div", { className: "cloud-op-summary", children: [_jsxs("div", { children: [_jsx("b", { children: data.shop }), _jsxs("small", { children: ["Catalogue saved ", when(data.refreshedAt), " \u00B7 not live quantities"] })] }), _jsx("span", { className: "cloud-state", children: changed ? 'Unsaved edits' : data.draft ? 'Pending Sync' : 'No saved draft' })] }), source && !matches && _jsx(Warning, { children: "This notebook belongs to another shop or operator on this device. It cannot be sent using this login." }), _jsxs("div", { className: "cloud-search", children: [_jsx("input", { "aria-label": "Find or scan cached stock", value: term, onChange: e => setTerm(e.target.value), placeholder: "Scan or search cached stock", onKeyDown: e => { if (e.key === 'Enter' && !e.repeat && term.trim()) {
                                    e.preventDefault();
                                    const f = scan(term.trim());
                                    setNote([f.title, f.detail].filter(Boolean).join(' · '));
                                    setTerm('');
                                } } }), _jsxs("button", { className: "button", onClick: () => setCamera(true), type: "button", children: [_jsx(ScanLine, { size: 16 }), " Scan"] })] }), _jsxs("div", { className: "cloud-off-grid", children: [_jsxs("div", { className: "cloud-op-list", "aria-label": "Cached catalogue", children: [data.catalogue.filter(p => p.active && `${p.name} ${p.sku} ${p.barcode}`.toLowerCase().includes(term.toLowerCase().trim())).slice(0, 30).map(p => _jsxs("div", { children: [_jsxs("span", { children: [_jsx("b", { children: p.name }), _jsxs("small", { children: [p.qty, " cached \u00B7 ", inr(p.price_pa), " listed"] })] }), _jsx("button", { "aria-label": `Draft ${p.name}`, className: "button", type: "button", disabled: busy || p.qty < 1, onClick: () => add(p), children: "Add" })] }, p.id)), !data.catalogue.length && _jsx("p", { children: "There were no products when this catalogue was saved." })] }), _jsxs("div", { className: "cloud-op-list", "aria-label": "Saved sale items", children: [Object.entries(cart).map(([id, q]) => _jsxs("div", { children: [_jsxs("span", { children: [data.catalogue.find(p => p.id === id)?.name ?? 'Previously saved item', " \u00D7 ", q] }), _jsx("button", { className: "button", "aria-label": `Remove one ${data.catalogue.find(p => p.id === id)?.name ?? 'item'} from draft`, onClick: () => remove(id), children: "\u2212" })] }, id)), !Object.keys(cart).length && _jsx("p", { children: "No draft items." })] })] }), _jsxs("div", { className: "cloud-tools cloud-op-actions", children: [_jsxs("button", { className: "button primary-button", disabled: busy || !changed || !Object.keys(cart).length, onClick: () => void run(async () => {
                                    // Preserve its ID when saving unchanged/reloaded items. Once loaded for online posting, the server checks the same ID.
                                    const draft = { id: data.draft?.id ?? crypto.randomUUID(), lines: cart, savedAt: new Date().toISOString() };
                                    await write({ ...data, draft });
                                    setNote('Draft saved on this device. No bill was issued.');
                                }), children: [_jsx(ArrowDownToLine, { size: 16 }), " Save pending draft"] }), matches && data.draft && onUse && _jsx("button", { className: "button", disabled: busy || changed, onClick: () => void run(async () => {
                                    if (await onUse(data.draft)) {
                                        await write({ ...data, draft: null });
                                        setCart({});
                                        setNote('Already posted once. This saved draft was closed.');
                                    }
                                    else
                                        close();
                                }), children: "Review draft online" }), matches && source && _jsx("button", { className: "button", disabled: busy || changed, onClick: () => void run(async () => { await write({ ...data, catalogue: source.products, refreshedAt: new Date().toISOString() }); setNote('Catalogue refreshed from this shop.'); }), children: "Refresh offline catalogue" }), data.draft && _jsx("button", { className: "button", disabled: busy, onClick: () => { if (confirm('Discard the local draft? An already posted bill, if any, is not changed.'))
                                    void run(async () => { await write({ ...data, draft: null }); setCart({}); }); }, children: "Discard local draft" }), _jsx("button", { className: "button", disabled: busy || changed, onClick: () => void run(async () => { if (confirm('Remove the encrypted stock and draft from this browser? Online records are not affected.')) {
                                    await writeVault(stored, null);
                                    setStored(null);
                                    setData(null);
                                    setCart({});
                                    setPass('');
                                } }), children: "Remove notebook" })] }), _jsx("small", { children: "Clearing site data, losing the device, or forgetting the passphrase can lose unsynced drafts. Reopen this exact site/browser profile to access the notebook." })] }), camera && _jsx(BarcodeScanner, { purpose: "Add an item to the offline draft; nothing is posted.", onClose: () => setCamera(false), onBarcode: r => scan(r.value) })] });
}
export function BackupViewer({ close }) {
    const [result, setResult] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    async function inspect(e) {
        e.preventDefault();
        if (busy)
            return;
        setError('');
        setResult(null);
        const f = new FormData(e.currentTarget), file = f.get('backup');
        setBusy(true);
        try {
            if (!(file instanceof File) || file.size < 1 || file.size > 120 * 1024 * 1024)
                throw Error('Choose a Mobile Craft encrypted snapshot under 120 MB.');
            const output = await unseal(String(f.get('pass')), JSON.parse(await file.text()));
            if (output?.format !== 'mobile-craft-cloud-branch/2' || !output.branch?.name || !Number.isFinite(Date.parse(output.exported_at)) || ![output.products, output.sales, output.postings].every(Array.isArray))
                throw Error('This is not a supported shop snapshot.');
            setResult({ shop: output.branch.name, at: output.exported_at, products: output.products.length, sales: output.sales.length, postings: output.postings.length });
        }
        catch (e) {
            setError(errorText(e));
        }
        finally {
            setBusy(false);
        }
    }
    return _jsxs(Dialog, { title: "Verify encrypted shop snapshot", onClose: close, children: [_jsx("p", { children: "Opens this backup locally to verify that it can be decrypted. It does not restore or overwrite the live database." }), error && _jsx(Warning, { tone: "error", children: error }), _jsxs("form", { className: "cloud-op-form", onSubmit: e => void inspect(e), children: [_jsxs("label", { children: ["Snapshot file", _jsx("input", { type: "file", name: "backup", accept: ".json,application/json", required: true })] }), _jsxs("label", { children: ["Backup passphrase", _jsx("input", { type: "password", name: "pass", required: true, minLength: 12, maxLength: 256 })] }), _jsx("button", { className: "button primary-button", type: "submit", disabled: busy, children: busy ? 'Checking…' : 'Verify snapshot' })] }), result && _jsxs("p", { role: "status", className: "cloud-scan-note", children: [result.shop, " \u00B7 ", when(result.at), " \u00B7 ", result.products, " products \u00B7 ", result.sales, " sales \u00B7 ", result.postings, " ledger entries."] })] });
}
