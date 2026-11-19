import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "/vendor/react-jsx-runtime.js";
import { useState } from '/vendor/react.js';
import { ArrowDownToLine, ArrowRight, Boxes, ChartNoAxesCombined, ClipboardList, Clock3, Package, PackageX, IndianRupee, TrendingDown, TrendingUp, TriangleAlert } from '/vendor/lucide-react.js';
import { errorText, when } from '../api.js';
import { trailing } from '../business.js';
import { categories } from './Catalogue.js';
import { Dialog, inr, invRead, moveLabels, Opt, Pager, Panel, shopDay, ShopDate, short, Table, useInv, val, Wait, Warning } from './core.js';
import { vendors } from './Purchases.js';
import { exportFile } from './files.js';
const titles = { ledger: 'Movement detail', summary: 'Stock summary', valuation: 'Valuation', low: 'Low stock', out: 'Out of stock', profit: 'Item profit', fast: 'Fast moving', slow: 'Slow moving', ageing: 'Stock ageing', reconcile: 'Reconciliation' };
const inventoryAsAt = new Set(['valuation', 'low', 'out', 'ageing', 'reconcile']);
const curatedTypes = Object.entries(moveLabels).map(([id, name]) => ({ id, name }));
const tz = 'Asia/Kolkata';
const stamp = (t) => { const stampParts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t)); const x = Object.fromEntries(stampParts.map(y => [y.type, y.value])); return `${x.year}-${x.month}-${x.day} ${x.hour}:${x.minute}:${x.second}`; };
const moveLabel = (x) => moveLabels[x.source_kind] ?? x.source_kind;
const dbView = (r) => ['valuation', 'low', 'out'].includes(r) ? 'stock' : r;
const currency = (p) => p / 100;
const margin = (p) => p.net_pa > 0 ? Math.round((10000 * p.gross_pa) / p.net_pa) / 100 : null;
const rangeFor = (r) => ['ledger', 'summary', 'profit', 'fast', 'slow'].includes(r);
const descriptions = {
    ledger: 'Running sellable balances from committed movements. Transfer in/out is shown per location; branch totals do not change on a transfer.',
    summary: 'Opening balance at start of period plus posted opening, purchase, sales, sellable returns, supplier returns and corrections. Closing uses ledger value at the period end.',
    valuation: 'Current sellable stock at moving weighted-average carrying cost. Listed retail value is not profit and excludes the effect of tax, discounts and future returns.',
    low: 'Active variants with units above zero but at or below their minimum.', out: 'Active variants with zero sellable units.',
    profit: 'Net sales excluding GST minus historical sale COGS. Sellable returns reverse their original saved cost; non-sellable returns do not. Excludes operating expenses.',
    fast: 'Ranked by net units sold in the date range (posted sales minus all invoice returns). Positive net units only.', slow: 'Active variants still carrying stock, ranked from lowest net units sold during the selected dates.',
    ageing: 'Estimated age of current units from most recent inbound cohorts (FIFO depletion assumption for age only). Cost always uses moving weighted average, not FIFO. Transfers do not reset age.',
    reconcile: 'Compares branch quantities and stock value with the movement ledger and location allocations. Also checks the inventory account and overall trial balance.',
};
const itemCell = (x) => _jsxs(_Fragment, { children: [_jsx("b", { children: x.name }), _jsxs("small", { children: [x.sku, x.category ? ` · ${x.category}` : ''] })] });
function moveRows(items, s) { return items.map(x => ({ key: x.row_key, cells: [_jsxs(_Fragment, { children: [when(x.at), _jsx("small", { children: x.operator || 'System allocation' })] }), itemCell(x), _jsxs(_Fragment, { children: [moveLabel(x), _jsx("small", { children: x.location ?? '—' })] }), Math.max(0, x.qty_delta), Math.max(0, -x.qty_delta), x.after_qty, _jsx("button", { type: "button", className: "pos-link", onClick: () => s.openDoc({ kind: x.source_kind, id: x.ref }), children: x.reason ?? short(x.ref) })] })); }
const ledgerHeads = ['Posted / operator', 'Item / SKU', 'Movement / location', 'In', 'Out', 'Balance', 'Source document'];
export function InventoryDashboard({ s }) {
    const today = shopDay(), d = useInv(s, 'dashboard'), recent = useInv(s, 'ledger', { limit: 8 }), span = trailing(30);
    const fast = useInv(s, 'fast', { ...span, limit: 4 }), slow = useInv(s, 'slow', { ...span, limit: 4 });
    const f = d.data;
    const tiles = f ? [
        { label: 'Active products', value: f.products, detail: 'Sellable variants / SKUs', icon: Package, to: () => s.go('items', { view: 'stock', status: 'active' }) },
        { label: 'Sellable stock', value: f.units, detail: 'Units across all locations', icon: Boxes, to: () => s.go('stock') },
        { label: 'Stock at cost', value: inr(f.value_pa), detail: 'Moving weighted average', icon: IndianRupee, to: () => s.go('reports', { view: 'valuation' }) },
        { label: 'Listed retail value', value: inr(f.retail_pa), detail: 'Units × listed selling price', icon: ChartNoAxesCombined, to: () => s.go('reports', { view: 'valuation' }) },
        { label: 'Low stock', value: f.low, detail: 'At or below minimum, not zero', icon: TriangleAlert, to: () => s.go('alerts', { view: 'stock', status: 'low' }) },
        { label: 'Out of stock', value: f.out, detail: 'Active SKUs at zero', icon: PackageX, to: () => s.go('alerts', { view: 'stock', status: 'out' }) },
        { label: 'Purchased today', value: f.purchase_qty, detail: 'Units confirmed received', icon: TrendingUp, to: () => s.go('purchases', { view: 'purchases', from: today, to: today }) },
        { label: 'Sold today', value: f.sales_qty, detail: 'Confirmed checkout units', icon: TrendingDown, to: () => s.go('reports', { view: 'ledger', kind: 'sale', from: today, to: today }) },
        { label: 'Damaged today', value: f.damaged, detail: 'Approved damage + damaged returns', icon: ClipboardList, to: () => s.go('adjustments', { view: 'adjustments', kind: 'damaged', from: today, to: today, status: 'posted' }) },
        { label: 'Non-sellable held', value: f.quarantine, detail: 'Returns excluded from inventory', icon: Clock3, to: () => s.go('adjustments', { view: 'quarantine', status: 'held' }) },
    ] : [];
    return _jsxs("div", { className: "biz-stack", children: [_jsx(Panel, { title: "Dashboard", hint: `${s.branch.name} · Shared inventory · India business dates`, tools: _jsxs("button", { type: "button", className: "button", onClick: s.onSettings, children: ["Shop settings ", _jsx(ArrowRight, { size: 15 })] }), children: f ? _jsx("div", { className: "biz-stats inv-metrics", children: tiles.map(({ label, value, detail, icon: Icon, to }) => _jsxs("button", { type: "button", className: "panel biz-stat inv-metric", onClick: to, children: [_jsxs("span", { children: [_jsx(Icon, { size: 16 }), " ", label, _jsx(ArrowRight, { size: 13, className: "inv-metric-arrow" })] }), _jsx("strong", { children: typeof value === 'number' ? value.toLocaleString('en-IN') : value }), _jsx("small", { children: detail })] }, label)) }) : _jsx(Wait, { online: s.online, issue: d.issue }) }), _jsx("div", { className: "biz-two", children: [{ key: 'fast', title: 'Fast-moving items', data: fast }, { key: 'slow', title: 'Slow-moving stock', data: slow }].map(({ key, title, data }) => _jsx(Panel, { title: title, hint: "Last 30 days \u00B7 net sold units", tools: _jsxs("button", { type: "button", className: "button", onClick: () => s.go('reports', { view: key, ...span }), children: ["Open report ", _jsx(ArrowRight, { size: 15 })] }), children: data.data ? _jsx(Table, { label: title, heads: ['Item / SKU', 'Net sold', 'Stock'], rows: data.data.map(p => ({ key: p.id, cells: [itemCell(p), p.net_units, p.qty] })) }) : _jsx(Wait, { online: s.online, issue: data.issue }) }, key)) }), _jsx(Panel, { title: "Recent stock movements", hint: "Newest committed entries first.", tools: _jsxs("button", { type: "button", className: "button", onClick: () => s.go('reports', { view: 'ledger' }), children: ["Open movement detail ", _jsx(ArrowRight, { size: 15 })] }), children: recent.data ? _jsx(Table, { label: "Recent stock movements", heads: ledgerHeads, rows: moveRows(recent.data, s) }) : _jsx(Wait, { online: s.online, issue: recent.issue }) })] });
}
function columns(view) {
    if (view === 'ledger')
        return ['Posted IST', 'Variant', 'SKU', 'Movement', 'Operator', 'Location', 'In', 'Out', 'Balance', 'Stock value change INR', 'Source ID', 'Source note'];
    if (view === 'summary')
        return ['Variant', 'SKU', 'Category', 'Opening balance', 'Opened in period', 'Purchased', 'Sold', 'Restocked returns', 'Supplier returns', 'Adjustments (net)', 'Closing units', 'Closing value INR'];
    if (view === 'profit')
        return ['Variant', 'SKU', 'Category', 'Net units sold', 'Received value INR', 'Net sales ex GST INR', 'Historical COGS INR', 'Gross profit INR', 'Margin %'];
    if (view === 'ageing')
        return ['Variant', 'SKU', 'Category', 'Sellable units', '0–30 days', '31–90 days', 'Over 90 days', 'Unknown age', 'Oldest days', 'Current value INR'];
    if (view === 'fast' || view === 'slow')
        return ['Variant', 'SKU', 'Category', 'Net units sold', 'Current units', 'Net sales ex GST INR'];
    return ['Variant', 'SKU', 'Category', 'Preferred supplier', 'Sellable units', 'Minimum', 'Stock carrying value INR', 'Listed value INR'];
}
function exportRow(view, row) {
    if (view === 'ledger') {
        const x = row;
        return [stamp(x.at), x.name, x.sku, moveLabel(x), x.operator, x.location, Math.max(0, x.qty_delta), Math.max(0, -x.qty_delta), x.after_qty, currency(x.value_delta_pa), x.ref, x.reason];
    }
    const p = row, common = [p.name, p.sku, p.category];
    if (view === 'summary')
        return [...common, p.beginning, p.opened, p.purchased, p.sold, p.returned, p.supplier_returned, p.adjusted, p.ending, currency(p.ending_pa)];
    if (view === 'profit')
        return [...common, p.net_units, currency(p.purchased_pa), currency(p.net_pa), currency(p.cogs_pa), currency(p.gross_pa), margin(p)];
    if (view === 'ageing')
        return [...common, p.qty, p.age_0_30, p.age_31_90, p.age_over_90, p.age_unknown, p.oldest_days, currency(p.value_pa)];
    if (view === 'slow' || view === 'fast')
        return [...common, p.net_units, p.qty, currency(p.net_pa)];
    const v = row, q = v.location_qty ?? v.qty;
    return [...common, v.supplier, q, v.minimum, currency(v.value_pa ?? 0), currency(v.price_pa * v.qty)];
}
function tableRows(view, items, s) {
    if (view === 'ledger')
        return moveRows(items, s);
    return items.map(r => {
        const x = r, v = r, cells = [itemCell(x)];
        if (view === 'summary')
            cells.push(x.beginning, x.opened, x.purchased, x.sold, x.returned, x.supplier_returned, x.adjusted, x.ending, inr(x.ending_pa));
        else if (view === 'profit')
            cells.push(x.net_units, inr(x.purchased_pa), inr(x.net_pa), inr(x.cogs_pa), inr(x.gross_pa), margin(x) == null ? '—' : `${margin(x)}%`);
        else if (view === 'ageing')
            cells.push(x.qty, x.age_0_30, x.age_31_90, x.age_over_90, x.age_unknown, x.oldest_days ?? '—', inr(x.value_pa));
        else if (view === 'fast' || view === 'slow')
            cells.push(x.net_units, x.qty, inr(x.net_pa));
        else
            cells.push(v.supplier ?? '—', v.qty, v.minimum, inr(v.value_pa ?? 0), inr(v.price_pa * v.qty));
        cells.push(_jsx("button", { type: "button", className: "button", onClick: () => s.go('reports', { view: 'ledger', product_id: x.id }), children: "Movements" }));
        return { key: x.id, cells };
    });
}
function viewHeads(r) { return r === 'ledger' ? ledgerHeads : ['Item / SKU / category', ...columns(r).slice(3), '']; }
const statements = (r) => [['Stock quantity / value mismatches', r.qty_or_value_mismatches], ['Location mismatches', r.location_mismatches], ['Ledger inventory balance INR', currency(r.inventory_journal_pa)], ['Catalogue carrying value INR', currency(r.stock_value_pa)], ['Trial difference INR', currency(r.trial_difference_pa)]];
export function StockReports({ s, intent }) {
    const defaults = trailing(30);
    const [view, setView] = useState(intent && Object.hasOwn(titles, intent.view) ? intent.view : 'summary'), [filter, setFilter] = useState({ from: intent?.from ?? defaults.from, to: intent?.to ?? defaults.to, search: intent?.search ?? '', category: intent?.category ?? '', supplier: intent?.supplier ?? '', product_id: intent?.product_id ?? '', kind: intent?.kind ?? '', actor_id: '', location_id: intent?.location_id ?? '' });
    const [offset, setOffset] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const args = { search: filter.search, category: filter.category, supplier: filter.supplier, ...(rangeFor(view) ? { from: filter.from, to: filter.to } : {}), ...(view === 'ledger' ? { product_id: filter.product_id, kind: filter.kind, actor_id: filter.actor_id, location_id: filter.location_id } : {}), ...(['low', 'out'].includes(view) ? { status: view } : {}) };
    const result = useInv(s, dbView(view), { ...args, offset }, view !== 'reconcile'), rec = useInv(s, 'reconcile', {}, view === 'reconcile');
    const choose = (v) => { setView(v); setOffset(0); setError(''); };
    const read = (e) => { e.preventDefault(); const f = new FormData(e.currentTarget), patch = Object.fromEntries(Array.from(f.keys()).map(k => [k, val(f, k)])); setOffset(0); setError(''); setFilter(x => ({ ...x, ...patch })); };
    const dl = async (type) => {
        setError('');
        setBusy(true);
        try {
            const cap = type === 'pdf' ? 500 : 5000, name = `mobile-craft-${s.branch.slug}-${view}-${shopDay()}`;
            let rows;
            if (view === 'reconcile')
                rows = [['Check', 'Value'], ...statements(await invRead(s, view)).map(x => [...x])];
            else {
                const read = await invRead(s, dbView(view), { ...args, limit: cap + 1 });
                if (read.length > cap)
                    throw Error(`More than ${cap} rows match. Narrow the filters before exporting.`);
                rows = [columns(view), ...read.map(x => exportRow(view, x))];
            }
            await exportFile(type, name, `Mobile Craft · ${titles[view]}`, `${s.branch.name} · ${rangeFor(view) ? `${filter.from} to ${filter.to} IST` : `as of ${shopDay()} IST`}`, rows);
        }
        catch (e) {
            setError(errorText(e));
        }
        finally {
            setBusy(false);
        }
    };
    const rr = rec.data, ok = rr && rr.qty_or_value_mismatches === 0 && rr.location_mismatches === 0 && rr.stock_value_pa === rr.inventory_journal_pa && rr.trial_difference_pa === 0;
    return _jsxs(Panel, { title: "Stock Reports", hint: "Filter committed stock and item performance. Export the same filtered dataset to CSV, Excel or PDF.", tools: _jsx(_Fragment, { children: ['csv', 'xlsx', 'pdf'].map(v => _jsxs("button", { type: "button", className: "button", disabled: busy || !s.online || (!result.data && !rr), onClick: () => void dl(v), children: [_jsx(ArrowDownToLine, { size: 15 }), " ", v === 'xlsx' ? 'Excel' : v.toUpperCase()] }, v)) }), children: [_jsx("div", { className: "biz-presets inv-report-tabs", "aria-label": "Inventory report types", children: Object.entries(titles).map(([id, label]) => _jsx("button", { className: "button", type: "button", "aria-pressed": view === id, onClick: () => choose(id), children: label }, id)) }), _jsx("h3", { className: "inv-subhead", children: titles[view] }), _jsx("p", { children: descriptions[view] }), view !== 'reconcile' && _jsxs("form", { className: "biz-range", onSubmit: read, children: [rangeFor(view) && _jsxs(_Fragment, { children: [_jsx("div", { className: "biz-presets", "aria-label": "Report period", children: [[1, 'Today'], [7, '7 days'], [30, '30 days'], [90, '90 days']].map(([days, label]) => _jsx("button", { type: "button", className: "button", onClick: () => { setFilter(p => ({ ...p, ...trailing(Number(days)) })); setOffset(0); }, children: label }, days)) }), _jsx(ShopDate, { name: "from", label: "From", initial: filter.from }), _jsx(ShopDate, { name: "to", label: "To", initial: filter.to })] }), _jsxs("label", { className: "biz-grow", children: ["Item / SKU / barcode", _jsx("input", { name: "search", maxLength: 120, defaultValue: filter.search })] }), _jsx(Opt, { name: "category", label: "Category", opts: categories(s.meta), initial: filter.category, empty: "All categories" }), _jsx(Opt, { name: "supplier", label: "Supplier", opts: vendors(s), initial: filter.supplier, empty: "All suppliers" }), view === 'ledger' && _jsxs(_Fragment, { children: [_jsx(Opt, { name: "kind", label: "Movement type", opts: curatedTypes, initial: filter.kind, empty: "All movements" }), _jsx(Opt, { name: "actor_id", label: "Operator", opts: s.meta.operators, initial: filter.actor_id, empty: "All operators" }), _jsx(Opt, { name: "location_id", label: "Location", opts: s.meta.locations, initial: filter.location_id, empty: "Branch-wide ledger" }), filter.product_id && _jsx("button", { className: "button", type: "button", onClick: () => { setFilter(f => ({ ...f, product_id: '' })); setOffset(0); }, children: "Clear exact item" })] }), _jsx("button", { type: "submit", className: "button primary-button", disabled: !s.online, children: "Apply report filters" })] }, `${view}:${JSON.stringify(filter)}`), inventoryAsAt.has(view) && _jsx("small", { className: "inv-asof", children: "Current snapshot \u00B7 not a backdated stock valuation" }), error && _jsx(Warning, { tone: "error", children: error }), busy && _jsx("p", { role: "status", children: "Preparing export\u2026" }), view === 'reconcile' ? rr ? _jsxs(_Fragment, { children: [_jsx("p", { className: ok ? 'cloud-scan-note' : 'cloud-low', role: "status", children: ok ? 'Reconciled · quantities, inventory value and journal agree.' : 'Reconciliation needs review. Do not correct this by editing database rows.' }), _jsx(Table, { label: "Reconciliation checks", heads: ['Check', 'Value'], rows: statements(rr).map(([k, v]) => ({ key: k, cells: [k, k.endsWith('INR') ? inr(Math.round(v * 100)) : v] })) })] }) : _jsx(Wait, { online: s.online, issue: rec.issue }) : result.data ? _jsxs(_Fragment, { children: [_jsx(Table, { label: titles[view], heads: viewHeads(view), rows: tableRows(view, result.data, s) }), _jsx(Pager, { offset: offset, count: result.data.length, onChange: setOffset })] }) : _jsx(Wait, { online: s.online, issue: result.issue })] });
}
export function SourceDetails({ s, source, close }) {
    const r = useInv(s, 'document', { id: source.id, kind: source.kind }), d = r.data;
    const show = (key) => typeof d?.[key] === 'string' ? d[key] : '—';
    const n = (key) => typeof d?.[key] === 'number' ? d[key] : null;
    const text = (label, key) => ({ key, cells: [label, show(key)] }), qty = (label, key) => ({ key, cells: [label, n(key) ?? '—'] }), cash = (label, key) => ({ key, cells: [label, n(key) == null ? '—' : inr(n(key))] });
    const date = (label, key) => ({ key, cells: [label, show(key) === '—' ? '—' : when(show(key))] });
    const kind = source.kind;
    const fields = kind === 'transfer' ? [text('Item', 'item'), text('SKU', 'sku'), text('From', 'source'), text('To', 'destination'), qty('Transferred units', 'qty'), qty('Branch units', 'branch_qty'), text('Reason', 'reason'), date('Posted', 'at')] :
        kind === 'opening' ? [text('Item', 'item'), text('SKU', 'sku'), text('Location', 'location'), qty('Opening units', 'qty'), cash('Total opening cost', 'cost_pa'), text('Observed date', 'observed_date'), date('Posted', 'at')] :
            kind === 'purchase_return' ? [qty('Units removed', 'qty'), cash('Supplier credit', 'credit_pa'), cash('Inventory cost removed', 'inventory_pa'), cash('Payable reduced', 'reduced_due_pa'), { key: 'refund', cells: ['Excess refund', inr((n('credit_pa') ?? 0) - (n('reduced_due_pa') ?? 0))] }, text('Refund / credit method', 'method'), text('Reason', 'reason'), date('Posted', 'at')] :
                kind === 'stock_reversal' ? [text('Original adjustment', 'id'), qty('Original quantity before', 'before_qty'), qty('Original quantity after', 'after_qty'), cash('Original value change', 'value_delta_pa'), date('Reversed on', 'reversed_at'), text('Reversal reason', 'reversal_note')] :
                    kind === 'stock_adjust' ? [text('Note', 'note'), qty('Change', 'qty_delta'), cash('Value change', 'value_delta_pa'), text('Reason', 'reason')] : [text('Source', 'label'), text('Item', 'item'), qty('Allocated at upgrade', 'recorded_qty'), date('Recorded', 'at')];
    return _jsx(Dialog, { title: `${moveLabels[kind] ?? kind} · ${short(source.id)}`, onClose: close, children: d ? _jsxs(_Fragment, { children: [_jsx(Table, { label: "Source details", heads: ['Field', 'Recorded value'], rows: fields }), kind === 'purchase_return' && typeof d.purchase_id === 'string' && _jsx("button", { className: "button", onClick: () => s.openDoc({ kind: 'purchase', id: d.purchase_id }), children: "Open original purchase" }), kind === 'stock_reversal' && typeof d.id === 'string' && _jsx("button", { className: "button", onClick: () => s.openDoc({ kind: 'stock_adjust', id: d.id }), children: "Open original adjustment" })] }) : _jsx(Wait, { online: s.online, issue: r.issue }) });
}
