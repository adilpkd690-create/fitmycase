import { jsx as _jsx, jsxs as _jsxs } from "/vendor/react-jsx-runtime.js";
import { useEffect, useRef, useState } from '/vendor/react.js';
import { FileLock2, RotateCcw, WifiOff } from '/vendor/lucide-react.js';
import { lookupBarcode } from '../../pos/barcode-match.js';
import { errorText, methods, PostingRejected, when } from '../api.js';
import { Dialog, inr, ScanButton, short, Warning } from './core.js';
import { confirmed, makeJob, prepareQueue, queueCap, queueLoad, queueOpen, queueWrite } from './queue.js';
const labels = { pending: 'Pending Sync', synced: 'Synced', failed: 'Failed' };
const tender = (j) => methods.find(m => j.intent.payments[m.id] > 0)?.label ?? '—';
const lineText = (j) => j.label.map(x => `${x.name} (${x.sku}) × ${x.qty}`).join(', ');
export function OfflineQueue({ close, source, wire, openReceipt }) {
    const [sealed, setSealed] = useState(null), [box, setBox] = useState(null), [pass, setPass] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [issue, setIssue] = useState(''), [note, setNote] = useState('');
    const [cart, setCart] = useState({}), [method, setMethod] = useState('cash'), [term, setTerm] = useState(''), [chosen, setChosen] = useState(null), [revising, setRevising] = useState(null);
    const active = useRef(false), valid = useRef(true), previous = useRef(null), latest = useRef(null);
    useEffect(() => { valid.current = true; let keep = true; void queueLoad().then(x => { if (keep) {
        previous.current = x;
        setSealed(x);
    } }).catch(e => { if (keep)
        setIssue(errorText(e)); }).finally(() => { if (keep)
        setLoading(false); }); return () => { keep = false; valid.current = false; }; }, []);
    const same = (s) => !!(box && s && s.actor === box.actor && s.branch === box.branch);
    const matched = same(wire), canRefresh = same(source), selection = box?.jobs.find(j => j.id === chosen);
    const run = async (fn) => { if (active.current)
        return; active.current = true; setBusy(true); setIssue(''); setNote(''); try {
        await fn();
    }
    catch (e) {
        if (valid.current)
            setIssue(errorText(e));
    }
    finally {
        active.current = false;
        if (valid.current)
            setBusy(false);
    } };
    const write = async (value) => {
        const x = await queueWrite(pass, previous.current, value);
        previous.current = x;
        latest.current = value;
        if (valid.current) {
            setSealed(x);
            setBox(value);
        }
    };
    const unlock = async (e) => {
        e.preventDefault();
        await run(async () => {
            if (sealed) {
                const value = await queueOpen(pass, sealed);
                latest.current = value;
                setBox(value);
                return;
            }
            if (!source)
                throw Error('Connect and prepare the queue once from this counter before using it offline.');
            await write(prepareQueue(source));
            void navigator.storage?.persist?.().catch(() => false);
            setNote('Encrypted queue ready in this browser.');
        });
    };
    const patch = async (id, p) => { const value = latest.current; if (!value)
        throw Error('Reopen the encrypted queue.'); await write({ ...value, jobs: value.jobs.map(j => j.id === id ? { ...j, ...p } : j) }); };
    const add = (x) => {
        const q = cart[x.id] ?? 0;
        if (!x.active || q >= x.qty) {
            setIssue(`${x.name}: no additional units in this cached location.`);
            return false;
        }
        if (!q && Object.keys(cart).length >= 100) {
            setIssue('A draft can have at most 100 lines.');
            return false;
        }
        setCart(p => ({ ...p, [x.id]: Math.min(x.qty, (p[x.id] ?? 0) + 1) }));
        setIssue('');
        setNote(`${x.name} added to an unposted draft.`);
        return true;
    };
    const scan = (value) => { const m = lookupBarcode(box?.catalogue ?? [], value); if (m.kind !== 'found') {
        setIssue('Exact barcode was not found in this cached catalogue.');
        return false;
    } return add(m.product); };
    const syncReceipt = async (j, r, show = false) => {
        const real = confirmed(r, j);
        await patch(j.id, { status: 'synced', closed: true, issue: null, receipt: { id: real.id, number: real.number, posted_at: real.posted_at, total_pa: real.total_pa } });
        if (valid.current) {
            setNote(`Synced · ${real.number} · confirmed by the server.`);
            if (show && openReceipt) {
                close();
                openReceipt(real);
            }
        }
    };
    const sync = (j) => run(async () => {
        if (!matched || !wire)
            throw Error('Reconnect with the same operator and branch before syncing.');
        // Record the attempt durably BEFORE sending a request. Replaying the encrypted payload always uses this exact ID.
        await patch(j.id, { attempts: j.attempts + 1, status: 'pending', issue: null });
        let r;
        try {
            r = await wire.sync(j);
        }
        catch (e) {
            const rejected = e instanceof PostingRejected;
            await patch(j.id, { status: rejected ? 'failed' : 'pending', issue: errorText(e) });
            throw e;
        }
        await syncReceipt(j, r);
    });
    const verify = (j) => run(async () => {
        if (!matched || !wire)
            throw Error('Reconnect with the same operator and branch to verify.');
        const status = await wire.verify(j);
        if (status.status === 'posted' && status.result) {
            await syncReceipt(j, status.result, j.status === 'synced');
            return;
        }
        if (status.status === 'not_posted') {
            await patch(j.id, { status: 'failed', closed: true, issue: 'Server confirms this request was closed without posting.' });
            return;
        }
        setNote('No receipt is recorded for this ID yet. A delayed request may still be in flight. Replay the exact request, or close it on the server before starting over.');
    });
    const fence = (j, revise) => run(async () => {
        if (!matched || !wire)
            throw Error('Use the same online login to check and close this request safely.');
        if (revise && j.revised_to)
            throw Error('A revised request already exists. Review it instead.');
        if (revise && !source)
            throw Error('Refresh online stock before revising a failed request.');
        if (revise && source && source.location.id !== j.location.id)
            throw Error(`Select ${j.location.name} in POS, refresh the queue and then revise this draft.`);
        if (revise && Object.keys(cart).length)
            throw Error('Save or clear your unsubmitted draft before revising another.');
        if (!confirm(revise ? 'Check the original request and start a new draft only if it did not post?' : 'Check for a receipt and close this ID only if no sale posted?'))
            return;
        const r = await wire.fence(j);
        if (r) {
            await syncReceipt(j, r);
            return;
        }
        const value = latest.current;
        await write({ ...value, ...(revise && source ? { location: source.location, catalogue: source.catalogue, profile: source.profile, cached: new Date().toISOString() } : {}), jobs: value.jobs.map(old => old.id === j.id ? { ...old, status: 'failed', closed: true, issue: 'Closed by server without a sale. Original payload retained.' } : old) });
        if (revise && source) {
            setRevising(j.id);
            setCart(Object.fromEntries(j.label.map(x => [x.id, x.qty])));
            setChosen(null);
            setTerm('');
            setNote('Original ID closed. Review current stock, quantity and price before saving a new request.');
        }
        else
            setNote('Server confirmed that this ID was closed without posting.');
    });
    const safeClose = () => !active.current && (!Object.keys(cart).length || confirm('Close without saving the active offline draft?'));
    const catalogue = box?.catalogue.filter(p => p.active && `${p.name} ${p.sku} ${p.barcode}`.toLowerCase().includes(term.toLowerCase().trim())).slice(0, 24) ?? [];
    const itemCount = Object.values(cart).reduce((a, b) => a + b, 0);
    let estimate = null;
    if (box && itemCount)
        try {
            estimate = makeJob(box, cart, method, 'preview').intent.total_pa;
        }
        catch { /* draft needs review */ }
    return _jsxs(Dialog, { title: "Offline sale queue", onClose: close, beforeClose: safeClose, children: [_jsxs("p", { className: "cloud-hint", children: [_jsx(WifiOff, { size: 16 }), " Save encrypted sale intents before reconnecting. They do not reserve stock, record payment or issue a receipt until confirmed online."] }), issue && _jsx(Warning, { tone: "error", children: issue }), note && _jsx("p", { role: "status", className: "cloud-scan-note", children: note }), loading ? _jsx("p", { role: "status", children: "Checking this browser\u2026" }) : !box ? sealed || source ? _jsxs("form", { className: "cloud-op-form", onSubmit: e => void unlock(e), children: [_jsxs("label", { children: ["Queue passphrase", _jsx("input", { type: "password", value: pass, onChange: e => setPass(e.target.value), minLength: 12, maxLength: 256, autoComplete: sealed ? 'current-password' : 'new-password', required: true })] }), _jsx("small", { children: "At least 12 characters. Use a separate passphrase, keep it privately, and never prepare a shared browser. A lost passphrase cannot be recovered." }), _jsxs("button", { className: "button primary-button", type: "submit", disabled: busy, children: [_jsx(FileLock2, { size: 16 }), " ", sealed ? 'Unlock sale queue' : 'Prepare sale queue'] })] }) : _jsx(Warning, { children: "Queue not prepared. Sign in online, open this counter and prepare the sale queue while its stock is current." }) : _jsxs("div", { className: "biz-stack", children: [_jsxs("div", { className: "cloud-op-summary", children: [_jsxs("div", { children: [_jsxs("b", { children: [box.shop, " \u00B7 ", box.location.name] }), _jsxs("small", { children: ["Stock snapshot ", when(box.cached), " \u00B7 can be outdated"] })] }), _jsxs("span", { className: "cloud-state", children: [box.jobs.filter(j => j.status === 'pending').length, " Pending \u00B7 ", box.jobs.filter(j => j.status === 'synced').length, " Synced \u00B7 ", box.jobs.filter(j => j.status === 'failed').length, " Failed"] })] }), !matched && _jsx(Warning, { children: "Offline editing only. To post, sign in as the same operator and branch. This queue does not log you in." }), canRefresh && source && _jsxs("button", { type: "button", className: "button", disabled: busy || itemCount > 0, onClick: () => void run(async () => { await write({ ...prepareQueue(source), jobs: box.jobs }); setNote('Cached catalogue refreshed. Saved sale quotes were not changed.'); }), children: [_jsx(RotateCcw, { size: 15 }), " Refresh queued-draft catalogue"] }), _jsxs("details", { open: !box.jobs.length || itemCount > 0 || undefined, className: "inv-inset", children: [_jsxs("summary", { children: ["Build a new offline draft ", itemCount ? `· ${itemCount} units` : ''] }), _jsxs("div", { className: "cloud-search", children: [_jsx("input", { "aria-label": "Find or scan queue stock", maxLength: 100, value: term, placeholder: "Search or scan cache", onChange: e => setTerm(e.target.value), onKeyDown: e => { if (e.key === 'Enter' && !e.repeat && term.trim()) {
                                            e.preventDefault();
                                            if (scan(term))
                                                setTerm('');
                                        } } }), _jsx(ScanButton, { purpose: "Scan the exact variant from the encrypted snapshot. Nothing is posted.", onCode: x => { const ok = scan(x); if (ok)
                                            setTerm(''); return ok; }, disabled: busy, children: "Scan" })] }), _jsxs("div", { className: "cloud-off-grid", children: [_jsxs("div", { className: "cloud-op-list", "aria-label": "Offline queue catalogue", children: [catalogue.map(p => _jsxs("div", { children: [_jsxs("span", { children: [_jsx("b", { children: p.name }), _jsxs("small", { children: [p.sku, " \u00B7 ", p.qty, " cached \u00B7 ", inr(p.price_pa), " listed"] })] }), _jsx("button", { className: "button", type: "button", disabled: busy || p.qty < 1, onClick: () => add(p), "aria-label": `Queue ${p.name}`, children: "Add" })] }, p.id)), !catalogue.length && _jsx("p", { children: "No cached items match." })] }), _jsxs("div", { className: "cloud-op-list", "aria-label": "Active offline draft", children: [Object.entries(cart).map(([id, n]) => { const p = box.catalogue.find(x => x.id === id); return _jsxs("div", { children: [_jsxs("span", { children: [p?.name ?? short(id), " \u00D7 ", n, (!p?.active || n > p.qty) && _jsx("small", { className: "cloud-low", children: "Needs quantity review" })] }), _jsx("button", { type: "button", className: "button", "aria-label": `Remove one queued ${p?.name ?? 'item'}`, disabled: busy, onClick: () => setCart(prev => { const next = { ...prev }; if (next[id] > 1)
                                                            next[id]--;
                                                        else
                                                            delete next[id]; return next; }), children: "\u2212" })] }, id); }), !itemCount && _jsx("p", { children: "No units on this draft." })] })] }), _jsx("div", { className: "cloud-op-form", children: _jsxs("label", { children: ["Payment method to verify online", _jsx("select", { value: method, onChange: e => setMethod(e.target.value), disabled: busy, children: methods.map(m => _jsx("option", { value: m.id, children: m.label }, m.id)) })] }) }), _jsxs("div", { className: "cloud-tools cloud-op-actions", children: [_jsxs("button", { type: "button", className: "button primary-button", disabled: busy || !itemCount || box.jobs.length >= queueCap, onClick: () => void run(async () => { const j = makeJob(box, cart, method); await write({ ...box, jobs: [...box.jobs.map(x => x.id === revising ? { ...x, revised_to: j.id } : x), j] }); setCart({}); setRevising(null); setChosen(j.id); setNote('Pending invoice saved encrypted. Nothing was posted.'); }), children: ["Save pending sale ", estimate == null ? '' : `· ${inr(estimate)}`] }), itemCount > 0 && _jsx("button", { className: "button", type: "button", disabled: busy, onClick: () => { setCart({}); setRevising(null); }, children: "Clear unsaved draft" })] }), _jsx("small", { children: "Walk-in sales with one tender and local Kerala GST only. No offline credit, customer details or stock changes. Do not create another bill for a queued customer until the original ID is verified." })] }), _jsxs("section", { "aria-label": "Saved offline sale intents", className: "cloud-op-list", children: [box.jobs.map(j => _jsxs("div", { children: [_jsxs("span", { children: [_jsx("b", { children: j.receipt?.number ?? short(j.id) }), _jsxs("small", { children: [when(j.saved), " \u00B7 ", j.location.name, " \u00B7 ", inr(j.intent.total_pa)] })] }), _jsx("span", { className: "cloud-state", children: labels[j.status] }), _jsx("button", { className: "button", type: "button", disabled: busy, "aria-expanded": chosen === j.id, "aria-label": `Review queue request ${short(j.id)}`, onClick: () => setChosen(chosen === j.id ? null : j.id), children: "Review" })] }, j.id)), !box.jobs.length && _jsx("p", { children: "No saved sale intents." })] }), selection && _jsxs("section", { "aria-label": "Queue request details", className: "inv-inset biz-stack", children: [_jsxs("p", { children: [_jsxs("b", { children: [short(selection.id), " \u00B7 ", labels[selection.status]] }), _jsx("br", {}), lineText(selection), _jsx("br", {}), inr(selection.intent.total_pa), " \u00B7 ", tender(selection), " \u00B7 ", selection.location.name] }), selection.revised_to && _jsxs("p", { children: ["A revised draft was saved as ", short(selection.revised_to), "."] }), selection.issue && _jsx(Warning, { tone: selection.status === 'failed' ? 'error' : 'warning', children: selection.issue }), selection.receipt && _jsxs("p", { children: ["Confirmed receipt: ", _jsx("b", { children: selection.receipt.number }), " \u00B7 ", when(selection.receipt.posted_at)] }), selection.status !== 'synced' && !selection.closed && _jsx("p", { children: "Review the actual payment and items. Sync uses the saved quote; changed prices, tax, stock or closed cash days block the posting." }), _jsxs("div", { className: "cloud-tools", children: [selection.status !== 'synced' && !selection.closed && _jsx("button", { type: "button", className: "button primary-button", disabled: busy || !matched, onClick: () => void sync(selection), children: selection.attempts ? 'Replay exact request' : 'Confirm and sync sale' }), !selection.closed && _jsx("button", { type: "button", className: "button", disabled: busy || !matched, onClick: () => void fence(selection, false), children: "Close only if unposted" }), selection.status === 'failed' && _jsx("button", { type: "button", className: "button", disabled: busy || !matched || !source || !!selection.revised_to, onClick: () => void fence(selection, true), children: "Review live stock & revise" }), _jsx("button", { type: "button", className: "button", disabled: busy || !matched, onClick: () => void verify(selection), children: selection.status === 'synced' ? 'Open confirmed receipt' : 'Check server status' }), selection.closed && _jsx("button", { type: "button", className: "button", disabled: busy, onClick: () => { if (confirm('Remove this closed request from this browser only? Server history is unchanged.'))
                                            void run(async () => { await write({ ...box, jobs: box.jobs.filter(j => j.id !== selection.id) }); setChosen(null); }); }, children: "Remove local entry" })] })] }), _jsxs("small", { children: [box.jobs.length, "/", queueCap, " local entries. Site-data removal or device loss can erase drafts; confirmed receipts remain online. No automatic posting."] }), _jsx("button", { type: "button", className: "button", disabled: busy || box.jobs.some(j => !j.closed) || itemCount > 0, onClick: () => { if (confirm('Remove this queue and its offline catalogue from this browser? Server documents remain.'))
                            void run(async () => { await write(null); setPass(''); setChosen(null); }); }, children: "Remove local queue" })] })] });
}
