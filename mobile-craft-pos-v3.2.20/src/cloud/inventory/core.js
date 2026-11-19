import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "/vendor/react-jsx-runtime.js";
import { useEffect, useState } from '/vendor/react.js';
import { ChevronLeft, ChevronRight, ScanLine } from '/vendor/lucide-react.js';
import { Dialog } from '../../components/Controls.js';
import { BarcodeScanner } from '../../pos/BarcodeScanner.js';
import { lookupBarcode } from '../../pos/barcode-match.js';
import { lookupFeedback } from '../../pos/barcode.js';
import { Warning, inr } from '../../pos/ui.js';
import { errorText, rupees } from '../api.js';
import { Entry } from '../StoreForms.js';
import { shopDay } from '../business.js';
export { inr, shopDay, Entry, Warning, Dialog };
export const short = (id) => id?.slice(0, 8).toUpperCase() ?? '—';
export const unitNames = ['piece', 'set', 'pack', 'pair', 'box'];
export const adjustmentTypes = { damaged: 'Damaged stock', missing: 'Missing stock', count: 'Physical count correction', expired: 'Expired stock', found: 'Found stock', opening_correction: 'Opening correction', other: 'Other adjustment' };
export const moveLabels = { opening: 'Opening stock', sale: 'Sale', purchase: 'Purchase receipt', return: 'Sale return', purchase_return: 'Purchase return', stock_adjust: 'Stock adjustment', stock_reversal: 'Adjustment reversal', transfer: 'Location transfer', location_baseline: 'Location adopted on upgrade', count: 'Approved physical count' };
export const conditions = { damaged: 'Damaged', defective: 'Defective', warranty: 'Warranty return', unspecified: 'Not restocked (legacy/unspecified)' };
export const phoneLabel = (p) => [p.brand, p.name, p.edition].filter(Boolean).join(' · ');
export const val = (f, k) => String(f.get(k) ?? '').trim();
export const idVal = (f, k) => val(f, k) || null;
export const optionalNumber = (f, k) => val(f, k) ? Number(val(f, k)) : null;
export const optionalMoney = (f, k) => val(f, k) ? rupees(val(f, k)) : null;
export const amount = (p) => p == null ? '' : (p / 100).toFixed(2);
export const pageLength = 50;
export function useInv(scope, view, args = {}, enabled = true) {
    const serial = JSON.stringify(args), branch = scope.branch.id;
    const refresh = `${scope.tick}:${['stock', 'item'].includes(view) ? (scope.catalogueTick ?? 0) : 0}`;
    const k = `${branch}:${view}:${serial}:${refresh}`, on = scope.online && enabled;
    const [state, setState] = useState({ key: '' });
    useEffect(() => {
        if (!on)
            return;
        let active = true;
        const ctl = new AbortController(), timeout = setTimeout(() => ctl.abort(), 18000);
        void (async () => {
            try {
                const { data, error } = await scope.sb.rpc('mc_inventory_read', { p_branch: branch, p_view: view, p_args: JSON.parse(serial) }).abortSignal(ctl.signal);
                if (error || data == null)
                    throw Error(error?.code === 'P0001' ? error.message : 'Could not read this inventory view. Refresh or verify access.');
                if (active)
                    setState({ key: k, data: data });
            }
            catch (e) {
                if (active)
                    setState({ key: k, issue: errorText(e) });
            }
            finally {
                clearTimeout(timeout);
            }
        })();
        return () => { active = false; clearTimeout(timeout); ctl.abort(); };
    }, [scope.sb, refresh, branch, view, serial, k, on]);
    return on && state.key === k ? state : {};
}
export async function invRead(scope, view, args = {}) {
    const { data, error } = await scope.sb.rpc('mc_inventory_read', { p_branch: scope.branch.id, p_view: view, p_args: args }).abortSignal(AbortSignal.timeout(25000));
    if (error || data == null)
        throw Error(error?.code === 'P0001' ? error.message : 'Could not read this inventory view. Reconnect or verify access.');
    return data;
}
export const apply = (s, action, payload) => s.post('inventory', { ...payload, action });
export function Panel({ title, hint, tools, children }) {
    return _jsxs("section", { className: "panel cloud-panel inv-panel", "aria-label": title, children: [_jsxs("div", { className: "cloud-panel-head", children: [_jsxs("div", { children: [_jsx("h2", { children: title }), hint && _jsx("p", { children: hint })] }), tools && _jsx("div", { className: "cloud-tools", children: tools })] }), children] });
}
export function Wait({ online, issue }) { return !online ? _jsx(Warning, { children: "Reconnect to read committed inventory." }) : issue ? _jsx(Warning, { tone: "error", children: issue }) : _jsx("p", { role: "status", children: "Loading inventory\u2026" }); }
export function Table({ label, heads, rows, empty = 'No matching records.' }) {
    return rows.length ? _jsx("div", { className: "biz-table-scroll inv-scroll", role: "region", "aria-label": `${label} scroll area`, tabIndex: 0, children: _jsxs("table", { className: "biz-table inv-table", "aria-label": label, children: [_jsx("thead", { children: _jsx("tr", { children: heads.map((h, i) => _jsx("th", { scope: "col", children: h || _jsx("span", { className: "biz-sr", children: "Actions" }) }, i)) }) }), _jsx("tbody", { children: rows.map(r => _jsx("tr", { children: r.cells.map((c, i) => _jsx("td", { children: c }, i)) }, r.key)) })] }) }) : _jsx("p", { className: "biz-empty", children: empty });
}
export function Pager({ offset, count, onChange, size = pageLength }) {
    if (!offset && count < size)
        return null;
    return _jsxs("div", { className: "biz-pager", role: "group", "aria-label": "Inventory pages", children: [_jsxs("button", { type: "button", className: "button", "aria-label": "Previous page", disabled: !offset, onClick: () => onChange(Math.max(0, offset - size)), children: [_jsx(ChevronLeft, { size: 15 }), " Previous"] }), _jsxs("span", { children: ["Page ", Math.floor(offset / size) + 1] }), _jsxs("button", { type: "button", className: "button", "aria-label": "Next page", disabled: count < size, onClick: () => onChange(offset + size), children: ["Next ", _jsx(ChevronRight, { size: 15 })] })] });
}
export function Text({ name, label, max = 120, initial, required = false }) { return _jsxs("label", { children: [label, _jsx("input", { name: name, maxLength: max, defaultValue: initial ?? '', required: required })] }); }
export function Money({ name, label, initial, required = false }) { return _jsxs("label", { children: [label, _jsx("input", { name: name, inputMode: "decimal", maxLength: 13, defaultValue: amount(initial), placeholder: "0.00", required: required })] }); }
export function Qty({ name, label, initial, min = 0, max = 1000000, required = true }) { return _jsxs("label", { children: [label, _jsx("input", { name: name, type: "number", min: min, max: max, step: "1", defaultValue: initial ?? '', required: required })] }); }
export function ShopDate({ name, label, initial = shopDay(), required = true }) { return _jsxs("label", { children: [label, _jsx("input", { name: name, type: "date", min: "2000-01-01", max: shopDay(), defaultValue: initial, required: required })] }); }
export function Opt({ name, label, opts, initial, required = false, empty = 'Not selected' }) {
    return _jsxs("label", { children: [label, _jsxs("select", { name: name, required: required, defaultValue: initial ?? '', children: [_jsx("option", { value: "", children: empty }), opts.map(o => _jsx("option", { value: o.id, children: o.name }, o.id))] })] });
}
export function Where({ locations, label = 'Stock location', name = 'location_id', initial }) { return _jsx(Opt, { name: name, label: label, opts: locations, initial: initial ?? locations[0]?.id, required: true, empty: "Choose location" }); }
export function ScanButton({ purpose, children, onCode, disabled }) {
    const [open, setOpen] = useState(false);
    return _jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: "button", disabled: disabled, onClick: () => setOpen(true), children: [_jsx(ScanLine, { size: 16 }), " ", children ?? 'Scan barcode'] }), open && _jsx(BarcodeScanner, { title: children ?? 'Scan barcode', purpose: purpose, confirm: true, onClose: () => setOpen(false), onBarcode: r => { if (!onCode(r.value))
                    return lookupFeedback('unknown'); setOpen(false); return { tone: 'success', title: 'Barcode matched' }; } })] });
}
export function ItemPick({ products, value, onChange, label = 'Variant / item', name, includeInactive = false, scanner = true }) {
    const [q, setQ] = useState(''), pool = products.filter(p => includeInactive || p.active), lower = q.toLowerCase().trim();
    const chosen = pool.find(p => p.id === value), list = pool.filter(p => !lower || `${p.name} ${p.sku} ${p.barcode}`.toLowerCase().includes(lower)).slice(0, 120);
    if (chosen && !list.some(p => p.id === value))
        list.unshift(chosen);
    return _jsxs("div", { className: "inv-picker", children: [_jsxs("div", { className: "cloud-input-action", children: [_jsxs("label", { className: "inv-flex", children: [`Find ${label.toLowerCase()}`, _jsx("input", { value: q, onChange: e => setQ(e.target.value), maxLength: 100, placeholder: "Type name, SKU or barcode", onKeyDown: e => { if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const m = lookupBarcode(pool, q);
                                    if (m.kind === 'found')
                                        onChange(m.product.id);
                                    else if (list.length === 1)
                                        onChange(list[0].id);
                                } } })] }), scanner && _jsx(ScanButton, { purpose: "Choose the exact SKU. This does not post stock.", children: "Scan item", onCode: code => { const m = lookupBarcode(pool, code); if (m.kind !== 'found')
                            return false; onChange(m.product.id); setQ(''); return true; } })] }), _jsxs("label", { children: [label, _jsxs("select", { name: name, value: value, required: true, onChange: e => onChange(e.target.value), children: [_jsx("option", { value: "", children: "Choose exact SKU" }), list.map(p => _jsxs("option", { value: p.id, children: [p.name, " \u00B7 ", p.sku, !p.active ? ' (inactive)' : ''] }, p.id))] })] })] });
}
export function Action({ title, button, hint, close, run, noteRequired = false, disabled = false }) {
    return _jsx(Entry, { title: title, close: close, button: button, disabled: disabled, hint: hint, submit: async (f) => { await run(val(f, 'note')); close(); }, children: _jsxs("label", { children: [noteRequired ? 'Reason (required)' : 'Review note (optional)', _jsx("textarea", { name: "note", maxLength: 180, required: noteRequired })] }) });
}
export function BusyAction({ run, label, disabled = false }) {
    const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false);
    return _jsxs("div", { className: "inv-action", children: [_jsx("button", { type: "button", className: "button", disabled: disabled || busy, onClick: () => { setBusy(true); setErr(''); setDone(false); void run().then(() => setDone(true)).catch(e => setErr(errorText(e))).finally(() => setBusy(false)); }, children: busy ? 'Saving…' : label }), err && _jsx(Warning, { tone: "error", children: err }), done && _jsx("small", { role: "status", children: "Confirmed by server" })] });
}
