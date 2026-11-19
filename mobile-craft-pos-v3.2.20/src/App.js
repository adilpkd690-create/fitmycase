import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "/vendor/react-jsx-runtime.js";
import { useEffect, useMemo, useRef, useState } from '/vendor/react.js';
import { ArrowDownToLine, ArrowRight, Bell, Box, CalendarRange, ChartNoAxesCombined, Check, ChevronRight, CircleHelp, CreditCard, GitCompareArrows, IndianRupee, Layers3, LayoutGrid, Menu, Moon, ReceiptText, ScanLine, ShoppingBag, Store, Sun, Wallet, WalletCards, ShoppingCart, X } from '/vendor/lucide-react.js';
import { CategoryChart, KpiGrid, PanelTitle, PaymentChart, TrendChart } from './components/Charts.js';
import { DateControl, Dialog, SegmentControl } from './components/Controls.js';
import { InvoiceDialog, TransactionsTable } from './components/Transactions.js';
import { DEFAULT_RANGE, DEMO_RANGE, INVOICES, INITIAL_TABLE, categoryName, categoryTotals, dateLabel, dayCount, getTotals, hasBaseline, invoiceCsv, money, num, priorRange, rangeLabel, sameRange, selectRange, selectTable, trendSeries } from './data.js';
import { shopOnly } from './pos/mode.js';
import { usePos } from './pos/context.js';
import { inventory } from './pos/reports.js';
import { Tag } from './pos/ui.js';
import { PosInvoice } from './pos/Sales.js';
import { Workspace, isStoreView, mobileTabs, storeViews } from './pos/Workspace.js';

const views = [
    { id: 'overview', label: 'Overview', title: 'Business overview', icon: LayoutGrid, description: 'Track sales, profit, and payments across your store.' },
    { id: 'transactions', label: 'Transactions', title: 'Transactions', icon: ReceiptText, description: 'Review invoices, search for a customer, and check payment status.' },
    { id: 'categories', label: 'Product categories', title: 'Product categories', icon: Layers3, description: 'See how each product segment contributes to store performance.' },
    { id: 'payments', label: 'Payments', title: 'Payments', icon: WalletCards, description: 'Follow collections by payment method and see what’s still outstanding.' },
];
const currentView = () => (shopOnly ? storeViews : [...views, ...storeViews]).find(v => `#${v.id}` === window.location.hash)?.id ?? 'store';
function BrandMark() {
    return _jsxs("svg", { className: "brand-mark", width: "38", height: "38", viewBox: "0 0 40 40", "aria-hidden": "true", children: [_jsx("rect", { x: "0", y: "0", width: "40", height: "40", rx: "11", fill: "transparent" }), _jsxs("g", { fill: "none", stroke: "#fff", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "12.75", y: "8.5", width: "14.5", height: "23", rx: "3.3" }), _jsx("path", { d: "M15.7 21.1l3.3-3.3 2.35 2.35 3.05-4M18.5 27.9h3" })] })] });
}
function Navigation({ view, onNavigate, onHelp }) {
    const local = isStoreView(view);
    const navLink = ({ id, label, icon: Icon, shortcut }) => _jsxs("a", { href: `#${id}`, className: `nav-link ${id === view ? 'nav-active' : ''}`, "aria-current": id === view ? 'page' : undefined, onClick: e => { e.preventDefault(); onNavigate(id); }, children: [_jsx(Icon, { size: 17, strokeWidth: 1.9 }), _jsx("span", { children: label }), shortcut ? _jsx("kbd", { "aria-hidden": "true", children: shortcut }) : id === view ? _jsx("i", { className: "nav-indicator" }) : null] }, id);
    return _jsxs("nav", { className: `sidebar-nav ${local ? 'pos-sidebar-nav' : ''}`, "aria-label": "Workspace navigation", children: [local ? _jsxs(_Fragment, { children: [['OPERATIONS', 'FINANCE', 'WORKSPACE'].map(group => _jsxs("div", { className: "pos-nav-group", children: [_jsx("div", { className: "nav-label", children: group }), storeViews.filter(v => v.group === group).map(navLink)] }, group)), !shopOnly && navLink({ id: 'overview', label: 'Analytics demo', icon: ChartNoAxesCombined })] }) : _jsxs(_Fragment, { children: [_jsx("div", { className: "nav-label", children: "ANALYTICS DEMO" }), views.map(navLink), _jsx("div", { className: "nav-label support-label", children: "WORKSPACE" }), navLink({ id: 'store', label: 'Store & POS', icon: ShoppingCart })] }), _jsxs("button", { type: "button", className: "nav-link", onClick: onHelp, children: [_jsx(CircleHelp, { size: 17, strokeWidth: 1.9 }), _jsx("span", { children: "Help & guide" })] })] });
}
function StoreCard({ analytics }) {
    const { book, kind, writable, ready } = usePos();
    return _jsxs("div", { className: "sidebar-bottom", children: [_jsxs("div", { className: "store-meta", children: [_jsx("span", { className: "store-icon", children: _jsx(Store, { size: 17, strokeWidth: 1.85 }) }), _jsxs("div", { children: [_jsx("strong", { title: book.profile.name, children: book.profile.name || 'Mobile Craft' }), _jsx("span", { children: analytics ? 'Sample analytics' : 'Local retail workspace' })] })] }), _jsxs("div", { className: "workspace-tag", children: [_jsx("i", { className: "dot" }), analytics ? 'Demo workspace' : !ready ? 'Opening workspace' : !writable ? 'Read-only preview' : kind === 'practice' ? 'Practice workspace' : 'Shop workspace'] })] });
}
const salesMetrics = [
    { label: 'Net sales', metric: 'net', color: 'violet', icon: IndianRupee, hint: 'Invoice line totals after discounts, including unpaid invoices.' },
    { label: 'Gross profit', metric: 'gross', color: 'green', icon: ChartNoAxesCombined, hint: 'Net sales minus the recorded cost of the sold items. Operating expenses are not deducted.' },
    { label: 'Invoices', metric: 'count', kind: 'count', color: 'blue', icon: ReceiptText, hint: 'Count of invoices issued in the selected period and category.' },
    { label: 'Avg. order value', metric: 'avg', color: 'orange', icon: ShoppingBag, hint: 'Net sales divided by the number of invoices.' },
];
const categoryMetrics = [...salesMetrics.slice(0, 3), { label: 'Units sold', metric: 'units', kind: 'count', color: 'orange', icon: Box, hint: 'Total item quantity across invoices, including services.' }];
const paymentMetrics = [
    { label: 'Total collected', metric: 'paid', color: 'violet', icon: Wallet, hint: 'Recorded payments on the selected invoices, excluding unpaid balances.' },
    { label: 'UPI collections', metric: 'upi', color: 'green', icon: ScanLine, hint: 'Total collected through UPI, including split payments.' },
    { label: 'Card collections', metric: 'card', color: 'blue', icon: CreditCard, hint: 'Total collected via card payments.' },
    { label: 'Outstanding', metric: 'balance', color: 'orange', icon: ReceiptText, hint: 'The unpaid portion of the selected invoices.' },
];
const readMetric = (totals, metric) => metric in totals.methods ? totals.methods[metric] : totals[metric];
function CategoryDetails({ rows, segment, onSelect }) {
    const total = rows.reduce((sum, row) => sum + row.net, 0);
    return _jsxs("section", { className: "panel category-detail", "aria-label": "Category performance", children: [_jsx(PanelTitle, { title: "Category performance", description: "Select a category to filter the dashboard" }), _jsx("div", { className: "table-scroll", children: _jsxs("table", { className: "category-table", "aria-label": "Category sales and profit", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: "Category" }), _jsx("th", { scope: "col", children: "Invoices" }), _jsx("th", { scope: "col", children: "Net sales" }), _jsx("th", { scope: "col", children: "Gross profit" }), _jsx("th", { scope: "col", children: "Sales share" })] }) }), _jsx("tbody", { children: rows.map(row => _jsxs("tr", { children: [_jsx("td", { children: _jsxs("button", { className: "category-table-link", type: "button", "aria-pressed": segment === row.category.id, onClick: () => onSelect(row.category.id), children: [_jsx("i", { className: "dot", style: { background: row.category.color } }), row.category.name, _jsx(ChevronRight, { size: 14 })] }) }), _jsx("td", { children: num(row.count) }), _jsx("td", { children: money(row.net) }), _jsx("td", { children: money(row.gross) }), _jsxs("td", { children: [total ? (row.net / total * 100).toFixed(1) : '0.0', "%"] })] }, row.category.id)) })] }) })] });
}
function App() {
    const [view, setView] = useState(currentView);
    const pos = usePos();
    const isLocal = isStoreView(view);
    const [cart, setCart] = useState([]);
    const [posInvoice, setPosInvoice] = useState(null);
    const [stockOpen, setStockOpen] = useState(false);
    const replenishment = useMemo(() => isLocal && pos.ready ? inventory(pos.book).filter(p => p.active && p.qty <= p.minimum).sort((a, b) => a.qty - b.qty) : [], [isLocal, pos.ready, pos.book]);
    useEffect(() => { setCart([]); setPosInvoice(null); }, [pos.kind]);
    const [range, setRange] = useState(DEFAULT_RANGE);
    const [segment, setSegment] = useState('all');
    const [tableFilters, setTableFilters] = useState(INITIAL_TABLE);
    const [granularity, setGranularity] = useState('daily');
    const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    const [invoice, setInvoice] = useState(null);
    const [menu, setMenu] = useState(false);
    const [help, setHelp] = useState(false);
    const [toast, setToast] = useState(null);
    const main = useRef(null);
    const title = useRef(null);
    const activeView = [...views, ...storeViews].find(v => v.id === view);
    const isPayments = view === 'payments';
    const touchesTable = view !== 'categories';
    const earlier = useMemo(() => priorRange(range), [range]);
    const baseline = hasBaseline(range);
    const { rows, previous, totals, priorTotals, categories } = useMemo(() => {
        const rows = selectRange(INVOICES, range, segment), previous = baseline ? selectRange(INVOICES, earlier, segment) : [];
        return { rows, previous, totals: getTotals(rows), priorTotals: getTotals(previous), categories: categoryTotals(rows, segment) };
    }, [range, earlier, segment, baseline]);
    const tableRows = useMemo(() => selectTable(rows, tableFilters), [rows, tableFilters]);
    const points = useMemo(() => trendSeries(range, rows, previous, isPayments ? 'paid' : 'net', granularity), [range, rows, previous, isPayments, granularity]);
    const cards = useMemo(() => {
        const schema = isPayments ? paymentMetrics : view === 'categories' ? categoryMetrics : salesMetrics;
        const sparkInterval = dayCount(range) > 35 ? 'weekly' : 'daily';
        return schema.map(s => ({ ...s, value: readMetric(totals, s.metric), previous: readMetric(priorTotals, s.metric), series: trendSeries(range, rows, previous, s.metric, sparkInterval).map(p => p.current) }));
    }, [view, isPayments, range, rows, previous, totals, priorTotals]);
    const filterKey = `${range.start}_${range.end}_${segment}`;
    const isFiltered = segment !== 'all' || !sameRange(range, DEFAULT_RANGE);
    useEffect(() => {
        const onHash = () => { setView(currentView()); window.scrollTo({ top: 0 }); requestAnimationFrame(() => title.current?.focus({ preventScroll: true })); };
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);
    useEffect(() => { document.title = `${activeView.label} · Mobile Craft`; }, [activeView.label]);
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#14131c' : '#f6f7fc');
        try {
            localStorage.setItem('mc-theme', theme);
        }
        catch { /* Storage may be blocked in an embedded preview. */ }
    }, [theme]);
    useEffect(() => {
        if (!toast)
            return;
        const timeout = window.setTimeout(() => setToast(null), 4900);
        return () => window.clearTimeout(timeout);
    }, [toast]);
    const navigate = (next) => {
        if (shopOnly && !isStoreView(next))
            return;
        setMenu(false);
        if (view !== next) {
            setView(next);
            const hash = `#${next}`;
            if (window.location.hash !== hash)
                window.location.hash = hash;
        }
        else
            window.scrollTo({ top: 0, behavior: 'instant' });
    };
    useEffect(() => {
        const shortcut = (e) => {
            const next = storeViews.find(v => v.shortcut && v.shortcut === e.key);
            if (!next || e.altKey || e.ctrlKey || e.metaKey || document.querySelector('dialog[open]'))
                return;
            e.preventDefault();
            navigate(next.id);
            if (next.id === 'pos')
                requestAnimationFrame(() => document.getElementById('pos-scan')?.focus({ preventScroll: true }));
        };
        window.addEventListener('keydown', shortcut);
        return () => window.removeEventListener('keydown', shortcut);
    });
    const handleRange = (next) => {
        setRange(next);
        if (dayCount(next) > 62)
            setGranularity('weekly');
        if (dayCount(next) < 8)
            setGranularity('daily');
    };
    const reset = () => { setSegment('all'); setRange(DEFAULT_RANGE); setGranularity('daily'); };
    const selectCategory = (id) => setSegment(old => old === id ? 'all' : id);
    const exportRows = touchesTable ? tableRows : rows;
    const download = () => {
        if (!exportRows.length)
            return;
        const url = URL.createObjectURL(new Blob([invoiceCsv(exportRows)], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `mobile-craft-demo_${segment}_${range.start}_${range.end}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setToast({ text: `Exported ${num(exportRows.length)} ${exportRows.length === 1 ? 'invoice' : 'invoices'}` });
    };
    const showHelp = () => { setMenu(false); setHelp(true); };
    const table = (compact) => _jsx(TransactionsTable, { rows: tableRows, filters: tableFilters, onFilters: setTableFilters, onInvoice: setInvoice, compact: compact, onOpen: compact ? () => navigate('transactions') : undefined }, compact ? 'compact' : view);
    const charts = _jsxs("div", { className: "chart-grid", children: [_jsx(TrendChart, { points: points, hasPrior: baseline, granularity: granularity, onGranularity: setGranularity, payments: isPayments, hasRows: isPayments ? totals.paid > 0 : totals.count > 0, filterKey: filterKey }), _jsx(PaymentChart, { totals: totals, filterKey: filterKey, action: !isPayments && _jsx("button", { type: "button", className: "icon-button sub-action", "aria-label": "Open payments", title: "Open payments", onClick: () => navigate('payments'), children: _jsx(ArrowRight, { size: 17 }) }) })] });
    return _jsxs("div", { className: `app-shell ${isLocal ? 'pos-shell' : ''}`, children: [_jsx("a", { className: "skip-link", href: "#main-content", onClick: e => { e.preventDefault(); main.current?.focus(); }, children: "Skip to dashboard" }), _jsxs("aside", { className: "sidebar", children: [_jsxs("a", { href: isLocal ? "#store" : "#overview", className: "brand", onClick: e => { e.preventDefault(); navigate(isLocal ? 'store' : 'overview'); }, "aria-label": "Mobile Craft overview", children: [_jsx(BrandMark, {}), _jsxs("span", { children: [_jsx("strong", { children: "Mobile Craft" }), _jsx("small", { children: isLocal ? 'Retail POS' : 'Retail analytics' })] })] }), _jsx(Navigation, { view: view, onNavigate: navigate, onHelp: showHelp }), _jsx(StoreCard, { analytics: !isLocal })] }), _jsxs("div", { className: "main-shell", children: [_jsx("header", { className: "topbar", children: _jsxs("div", { className: "topbar-inner", children: [_jsxs("div", { className: "top-left", children: [_jsx("button", { type: "button", className: "icon-button mobile-menu", "aria-label": "Open navigation", onClick: () => setMenu(true), children: _jsx(Menu, { size: 21 }) }), _jsxs("a", { href: isLocal ? "#store" : "#overview", className: "mobile-brand", "aria-label": "Mobile Craft overview", onClick: e => { e.preventDefault(); navigate(isLocal ? 'store' : 'overview'); }, children: [_jsx(BrandMark, {}), _jsx("span", { children: "Mobile Craft" })] }), _jsxs("div", { className: "breadcrumbs", "aria-label": "Current page", children: [_jsx("span", { children: isLocal ? 'Workspace' : 'Analytics' }), _jsx(ChevronRight, { size: 14 }), _jsx("strong", { children: activeView.label })] })] }), _jsxs("div", { className: "top-actions", children: [isLocal ? _jsxs("button", { type: "button", className: `demo-pill workspace-pill ${pos.kind === 'store' ? 'shop-pill' : ''}`, title: "Manage local workspace", onClick: () => navigate('settings'), children: [_jsx("i", { className: "dot" }), pos.kind === 'practice' ? 'Practice data' : 'Local shop'] }) : _jsxs("span", { className: "demo-pill", title: "This workspace uses simulated retail data", children: [_jsx("i", { className: "dot" }), "Demo data"] }), _jsx("span", { className: "top-divider" }), isLocal && _jsxs("button", { type: "button", className: "icon-button stock-bell", "aria-label": `Stock alerts: ${replenishment.length}`, title: "Stock alerts", onClick: () => setStockOpen(true), children: [_jsx(Bell, { size: 17 }), replenishment.length > 0 && _jsx("span", { "aria-hidden": "true", className: "bell-count", children: replenishment.length > 99 ? '99+' : replenishment.length })] }), _jsx("button", { type: "button", className: "icon-button theme-button", "aria-label": theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', title: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', onClick: () => setTheme(old => old === 'dark' ? 'light' : 'dark'), children: theme === 'dark' ? _jsx(Sun, { size: 18 }) : _jsx(Moon, { size: 18 }) })] })] }) }), _jsxs("main", { className: "dashboard", id: "main-content", tabIndex: -1, ref: main, children: [_jsxs("div", { className: "page-intro", children: [_jsxs("div", { children: [_jsx("h1", { tabIndex: -1, ref: title, children: activeView.title }), _jsx("p", { children: activeView.description })] }), isLocal ? view === 'store' && _jsxs("button", { type: "button", className: "button primary-button sale-cta", onClick: () => navigate('pos'), children: [_jsx(ShoppingCart, { size: 17 }), _jsx("span", { children: "New sale" }), _jsx("kbd", { children: "F2" })] }) : _jsxs("button", { type: "button", className: "button primary-button export-button", disabled: !exportRows.length, onClick: download, "aria-label": "Export CSV", title: "Download the matching demo invoices as a CSV", children: [_jsx(ArrowDownToLine, { size: 17 }), _jsx("span", { children: "Export CSV" })] })] }), isLocal ? _jsxs(_Fragment, { children: [_jsx("div", { className: `store-view ${view === 'store' ? 'store-view-home' : ''}`, children: _jsx(Workspace, { view: view, navigate: navigate, notify: text => setToast({ text }), cart: cart, onCart: setCart, onInvoice: setPosInvoice }, pos.kind) }), _jsxs("footer", { className: "dashboard-footer pos-footer", children: [_jsxs("span", { children: [_jsx("i", { className: "dot" }), pos.kind === 'practice' ? 'Practice data · Isolated from shop' : 'Shop workspace · This browser only'] }), _jsx("span", { children: "INR \u00B7 IST" })] })] }) : _jsxs(_Fragment, { children: [_jsxs("section", { className: "filter-bar", "aria-label": "Dashboard filters", children: [_jsxs("div", { className: "filter-controls", children: [_jsx(DateControl, { value: range, onChange: handleRange }), _jsx(SegmentControl, { value: segment, onChange: setSegment }), isFiltered && _jsxs("button", { type: "button", className: "reset-filters", onClick: reset, "aria-label": "Reset dashboard filters", title: "Reset dashboard filters", children: [_jsx(X, { size: 14 }), _jsx("span", { children: "Reset" })] })] }), _jsxs("div", { className: "compare-period", "aria-live": "polite", title: baseline ? `Previous ${dayCount(range)} days` : 'The demo does not have a complete prior period for this selection', children: [_jsx(GitCompareArrows, { size: 15 }), _jsx("span", { children: baseline ? _jsxs(_Fragment, { children: ["vs. ", _jsx("b", { children: rangeLabel(earlier, false) })] }) : 'No full prior period' })] })] }), _jsx(KpiGrid, { cards: cards, hasPrior: baseline }), view === 'overview' && _jsxs(_Fragment, { children: [charts, _jsxs("div", { className: "detail-grid", children: [_jsx(CategoryChart, { rows: categories, segment: segment, onSelect: selectCategory, onOpen: () => navigate('categories') }), table(true)] })] }), view === 'transactions' && table(false), view === 'categories' && _jsxs("div", { className: "detail-grid category-view", children: [_jsx(CategoryChart, { rows: categories, segment: segment, onSelect: selectCategory }), _jsx(CategoryDetails, { rows: categories, segment: segment, onSelect: selectCategory })] }), view === 'payments' && _jsxs(_Fragment, { children: [charts, table(false)] }), _jsxs("footer", { className: "dashboard-footer", children: [_jsxs("span", { children: [_jsx("i", { className: "dot" }), "Simulated retail data \u00B7 INR \u00B7 IST"] }), _jsxs("span", { children: ["Data through ", dateLabel(DEMO_RANGE.end, true)] })] }), _jsxs("span", { className: "sr-only", role: "status", children: [num(rows.length), " invoices from ", rangeLabel(range), " for ", categoryName(segment), "."] })] })] })] }), isLocal && _jsx("nav", { className: "pos-mobile-tabs", "aria-label": "Quick navigation", children: mobileTabs.map(({ id, label, icon: Icon }) => _jsxs("a", { href: `#${id}`, "aria-current": view === id ? 'page' : undefined, onClick: e => { e.preventDefault(); navigate(id); }, children: [_jsx(Icon, { size: 19 }), label] }, id)) }), menu && _jsxs(Dialog, { title: "Mobile Craft", variant: "mobile-nav", onClose: () => setMenu(false), children: [_jsx(Navigation, { view: view, onNavigate: navigate, onHelp: showHelp }), _jsx(StoreCard, { analytics: !isLocal })] }), invoice && _jsx(InvoiceDialog, { invoice: invoice, onClose: () => setInvoice(null) }), posInvoice && _jsx(PosInvoice, { id: posInvoice, onClose: () => setPosInvoice(null) }, posInvoice), stockOpen && _jsxs(Dialog, { title: "Stock alerts", onClose: () => setStockOpen(false), children: [_jsx("p", { className: "pos-dialog-intro", children: "These active products are at or below their stock threshold." }), _jsx("div", { className: "stock-alerts stock-alert-dialog", children: replenishment.length ? replenishment.map(p => _jsxs("div", { children: [_jsx("span", { className: "alert-stock-icon", children: _jsx(Box, { size: 16 }) }), _jsxs("span", { children: [_jsx("strong", { children: p.name }), _jsx("small", { children: p.variant || p.sku })] }), _jsx(Tag, { tone: p.qty > 0 ? 'amber' : 'red', children: p.qty > 0 ? `${p.qty} left` : 'Out of stock' })] }, p.id)) : _jsx("div", { className: "pos-empty", children: "No low or out-of-stock products." }) }), _jsx("div", { className: "pos-invoice-actions", children: _jsxs("button", { type: "button", className: "button primary-button", onClick: () => { setStockOpen(false); navigate('products'); }, children: ["Open products ", _jsx(ArrowRight, { size: 15 })] }) })] }), help && isLocal && _jsxs(Dialog, { title: "Mobile Craft guide", onClose: () => setHelp(false), children: [_jsx("p", { className: "help-intro", children: shopOnly ? _jsxs(_Fragment, { children: ["This file keeps an independent single-device Shop book. It never syncs to the web POS. Open ", _jsx("b", { children: "Settings" }), " to export a backup."] }) : _jsxs(_Fragment, { children: ["Practice records are separate from the local shop workspace. Open ", _jsx("b", { children: "Settings" }), " to change workspace or export a backup."] }) }), _jsxs("ul", { className: "help-list", children: [_jsxs("li", { children: [_jsx(ReceiptText, { size: 19 }), _jsxs("div", { children: [_jsx("strong", { children: "Billing" }), _jsx("p", { children: "Press F2 to open POS. Use Scan barcode for a camera or photo, focus the search field for a keyboard scanner, or choose a product. A balance on credit requires a registered customer." })] })] }), _jsxs("li", { children: [_jsx(Box, { size: 19 }), _jsxs("div", { children: [_jsx("strong", { children: "Stock and purchases" }), _jsx("p", { children: "F3 opens products; F4 opens purchases. Each variant has its own stock ledger. Post returns from the original invoice, rather than editing a receipt." })] })] }), _jsxs("li", { children: [_jsx(WalletCards, { size: 19 }), _jsxs("div", { children: [_jsx("strong", { children: "Reports and accounts" }), _jsx("p", { children: "F8 opens reports and F9 returns here. Money collected against a customer balance is not a new sale." })] })] }), _jsxs("li", { children: [_jsx(ArrowDownToLine, { size: 19 }), _jsxs("div", { children: [_jsx("strong", { children: "Desktop and data" }), _jsx("p", { children: "Use the downloaded file in Chrome or Edge for offline use. This is a local, single-device application. Keep JSON backups outside your browser." })] })] })] })] }), help && !isLocal && _jsxs(Dialog, { title: "Dashboard guide", onClose: () => setHelp(false), children: [_jsxs("p", { className: "help-intro", children: ["This dashboard uses sample invoices from ", rangeLabel(DEMO_RANGE), ". It is not connected to a live billing system."] }), _jsxs("ul", { className: "help-list", children: [_jsxs("li", { children: [_jsx(CalendarRange, { size: 19 }), _jsxs("div", { children: [_jsx("strong", { children: "Choose a date range and category" }), _jsx("p", { children: "These filters apply to every view. Trends compare the same category against the immediately preceding period of equal length." })] })] }), _jsxs("li", { children: [_jsx(ChartNoAxesCombined, { size: 19 }), _jsxs("div", { children: [_jsx("strong", { children: "Explore your charts" }), _jsx("p", { children: "Hover, tap, or focus a chart to see details. On the line chart, use the left and right arrow keys to move through dates." })] })] }), _jsxs("li", { children: [_jsx(ReceiptText, { size: 19 }), _jsxs("div", { children: [_jsx("strong", { children: "Review or export invoices" }), _jsx("p", { children: "Sort by a column, filter by payment status, or open an invoice to see its items and payments. CSV export includes all matching invoices, not just the current page." })] })] }), _jsxs("li", { children: [_jsx(WalletCards, { size: 19 }), _jsxs("div", { children: [_jsx("strong", { children: "Sales are not collections" }), _jsx("p", { children: "Net sales are invoice totals after discounts. Gross profit subtracts item costs. Collections count only money received, including split payments." })] })] })] })] }), toast && _jsxs("div", { className: "toast", role: "status", children: [_jsx("span", { className: "toast-check", children: _jsx(Check, { size: 17 }) }), _jsx("strong", { children: toast.text }), _jsx("button", { type: "button", className: "icon-button", "aria-label": "Dismiss notification", onClick: () => setToast(null), children: _jsx(X, { size: 17 }) })] })] });
}
export default App;
