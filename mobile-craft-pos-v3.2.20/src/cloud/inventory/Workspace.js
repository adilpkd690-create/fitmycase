import { jsx as _jsx, jsxs as _jsxs } from "/vendor/react-jsx-runtime.js";
import { useEffect, useState } from '/vendor/react.js';
import { ArrowLeftRight, Barcode, BarChart3, Boxes, Building2, ChevronDown, ClipboardCheck, ClipboardList, IndianRupee, LayoutDashboard, Link2, Menu, Package, ReceiptText, Settings2, ShoppingCart, Smartphone, Tags, TriangleAlert, Truck, UsersRound, WalletCards, Wrench } from '/vendor/lucide-react.js';
import { PartiesPage } from '../BusinessPages.js';
import { CataloguePage, CompatibilityPage, MastersPage } from './Catalogue.js';
import { PurchaseDetail, Purchases, VendorHint } from './Purchases.js';
import { AdjustmentDetail, Adjustments, CountDetail, Counts, LocationSettings, Transfers } from './StockOps.js';
import { InventoryDashboard, SourceDetails, StockReports } from './Reports.js';
import { Dialog, useInv, Wait, Warning } from './core.js';
const groups = [
    { name: 'Counter', links: [['inv-dashboard', 'Dashboard', LayoutDashboard, 'owner'], ['stock', 'Billing', ShoppingCart], ['receipts', 'Bills / invoices', ReceiptText]] },
    { name: 'Inventory', links: [['inv-stock', 'Stock overview', Boxes], ['inv-items', 'Products', Package], ['inv-categories', 'Categories', Tags], ['inv-models', 'Phone Models', Smartphone], ['inv-compatibility', 'Product Compatibility', Link2], ['inv-barcodes', 'Barcode labels', Barcode], ['inv-purchases', 'Stock-in / Purchases', ClipboardList, 'owner'], ['inv-suppliers', 'Suppliers', Truck, 'owner'], ['inv-adjustments', 'Stock Adjustment', Wrench, 'owner'], ['inv-transfers', 'Stock Transfer', ArrowLeftRight, 'owner'], ['inv-alerts', 'Low Stock Alerts', TriangleAlert, 'owner'], ['inv-reports', 'Stock Reports', BarChart3, 'owner'], ['inv-counts', 'Physical Stock Audit', ClipboardCheck, 'count']] },
    { name: 'Finance', links: [['overview', 'Financial overview', Building2, 'owner'], ['customers', 'Customers', UsersRound, 'owner'], ['expenses', 'Expenses', IndianRupee, 'owner'], ['accounts', 'Accounts', WalletCards, 'owner'], ['reports', 'Financial reports', BarChart3, 'owner']] },
    { name: 'Workspace', links: [['inv-settings', 'Settings', Settings2, 'owner']] },
];
export function InventoryMenu({ tab, owner, canCount, onPick }) {
    const [expanded, setExpanded] = useState(false);
    return _jsx("aside", { className: "cloud-side inv-side", children: _jsxs("nav", { "aria-label": "Workspace navigation", className: "cloud-side-nav", children: [groups.map((g, i) => {
                    const links = g.links.filter(([, , , access]) => !access || owner || access === 'count' && canCount);
                    return links.length > 0 && _jsxs("div", { className: `cloud-side-section ${i > 0 && !expanded ? 'inv-mobile-collapsed' : ''}`, children: [_jsx("p", { children: g.name }), _jsx("div", { children: links.map(([id, label, Icon]) => _jsxs("button", { type: "button", "aria-current": id === tab ? 'page' : undefined, className: `cloud-side-item ${id === tab ? 'selected' : ''}`, onClick: () => { onPick(id); setExpanded(false); }, children: [_jsx(Icon, { size: 17, "aria-hidden": "true" }), label] }, id)) })] }, g.name);
                }), _jsxs("button", { type: "button", className: "button inv-show-nav", "aria-expanded": expanded, onClick: () => setExpanded(!expanded), children: [_jsx(Menu, { size: 16 }), " ", expanded ? 'Hide workspace menus' : 'Browse workspace menus', " ", _jsx(ChevronDown, { size: 14 })] })] }) });
}
export function InventoryView({ s, view, intent, settings }) {
    const owner = s.branch.role === 'owner';
    if (view === 'stock' || view === 'items' || view === 'alerts' || view === 'barcodes')
        return owner || view !== 'alerts' ? _jsx(CataloguePage, { s: s, mode: view, intent: intent }) : null;
    if (view === 'categories' || view === 'models')
        return _jsx(MastersPage, { s: s, mode: view });
    if (view === 'compatibility')
        return _jsx(CompatibilityPage, { s: s, intent: intent });
    if (view === 'counts')
        return s.meta.can_count ? _jsx(Counts, { s: s }) : _jsx(Warning, { children: "Physical count access is not assigned." });
    if (!owner)
        return _jsx(Warning, { children: "Owner access is required for this page." });
    if (view === 'dashboard')
        return _jsx(InventoryDashboard, { s: s });
    if (view === 'purchases')
        return _jsx(Purchases, { s: s, intent: intent });
    if (view === 'suppliers')
        return _jsxs("div", { className: "biz-stack", children: [_jsx(VendorHint, { s: s }), _jsx(PartiesPage, { ...s, side: "supplier", onReceipt: s.onReceipt, onSettle: s.onSettle })] });
    if (view === 'adjustments')
        return _jsx(Adjustments, { s: s, intent: intent });
    if (view === 'transfers')
        return _jsx(Transfers, { s: s });
    if (view === 'reports')
        return _jsx(StockReports, { s: s, intent: intent });
    if (view === 'settings')
        return _jsxs("div", { className: "biz-stack", children: [_jsx(LocationSettings, { s: s }), settings] });
    return null;
}
function SourceReceipt({ s, source, close }) {
    const r = useInv(s, 'document', { kind: source.kind, id: source.id });
    const { onReceipt } = s;
    useEffect(() => { if (r.data?.number && r.data.lines) {
        onReceipt(r.data);
        close();
    } }, [r.data, onReceipt, close]);
    return _jsx(Dialog, { title: "Opening original document", onClose: close, children: _jsx(Wait, { online: s.online, issue: r.issue }) });
}
function SourceAdjustment({ s, source, close }) {
    const r = useInv(s, 'adjustments', { id: source.id, limit: 1 });
    return r.data?.length ? _jsx(AdjustmentDetail, { s: s, id: source.id, close: close }) : r.data ? _jsx(SourceDetails, { s: s, source: source, close: close }) : _jsx(Dialog, { title: "Opening adjustment", onClose: close, children: _jsx(Wait, { online: s.online, issue: r.issue }) });
}
export function OpenedSource({ s, source, close }) {
    if (source.kind === 'sale' || source.kind === 'return')
        return _jsx(SourceReceipt, { s: s, source: source, close: close });
    if (source.kind === 'purchase')
        return _jsx(PurchaseDetail, { s: s, id: source.id, close: close });
    if (source.kind === 'count')
        return _jsx(CountDetail, { s: s, id: source.id, close: close });
    if (source.kind === 'stock_adjust')
        return _jsx(SourceAdjustment, { s: s, source: source, close: close });
    return _jsx(SourceDetails, { s: s, source: source, close: close });
}
