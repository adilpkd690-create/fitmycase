import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "/vendor/react-jsx-runtime.js";
import { ArrowDownUp, ChartNoAxesCombined, ClipboardList, LayoutGrid, Package, ReceiptText, Settings as SettingsIcon, ShoppingCart, Truck, UsersRound, WalletCards } from '/vendor/lucide-react.js';
import { usePos } from './context.js';
import { StoreDashboard } from './Dashboard.js';
import { Accounts, Expenses, Parties, Reports } from './Finance.js';
import { Products, Purchases } from './Inventory.js';
import { SaleTerminal, SalesHistory } from './Sales.js';
import { Settings } from './Settings.js';
import { Warning } from './ui.js';
export const storeViews = [
    { id: 'store', label: 'Overview', title: 'Store overview', icon: LayoutGrid, group: 'OPERATIONS', shortcut: 'F9', description: 'Review sales, stock and account balances across your store.' },
    { id: 'pos', label: 'Point of sale', title: 'Point of sale', icon: ShoppingCart, group: 'OPERATIONS', shortcut: 'F2', description: 'Scan or select products, take payment, and create a receipt.' },
    { id: 'sales-history', label: 'Invoices', title: 'Invoices', icon: ReceiptText, group: 'OPERATIONS', shortcut: '', description: 'Find a posted sale, collect a balance, or return items.' },
    { id: 'products', label: 'Products & stock', title: 'Products & stock', icon: Package, group: 'OPERATIONS', shortcut: 'F3', description: 'Manage products, inventory movements, and barcode labels.' },
    { id: 'purchases', label: 'Purchases', title: 'Purchases', icon: ClipboardList, group: 'OPERATIONS', shortcut: 'F4', description: 'Receive stock and reconcile supplier credit purchases.' },
    { id: 'customers', label: 'Customers', title: 'Customers', icon: UsersRound, group: 'OPERATIONS', shortcut: '', description: 'Review receivables and record collections against customer ledgers.' },
    { id: 'suppliers', label: 'Suppliers', title: 'Suppliers', icon: Truck, group: 'OPERATIONS', shortcut: '', description: 'Track supplier balances and settle outstanding payments.' },
    { id: 'expenses', label: 'Expenses', title: 'Expenses', icon: ArrowDownUp, group: 'FINANCE', shortcut: '', description: 'Record store expenses and review spending by period.' },
    { id: 'accounts', label: 'Accounts', title: 'Accounts', icon: WalletCards, group: 'FINANCE', shortcut: '', description: 'Inspect the journal, transfer funds, and count the cash drawer.' },
    { id: 'reports', label: 'Reports', title: 'Reports', icon: ChartNoAxesCombined, group: 'FINANCE', shortcut: 'F8', description: 'View period profit and loss, daily sales, and export records.' },
    { id: 'settings', label: 'Settings', title: 'Settings', icon: SettingsIcon, group: 'WORKSPACE', shortcut: '', description: 'Manage the business profile, offline workspaces, and backups.' },
];
export const isStoreView = (v) => storeViews.some(row => row.id === v);
export const mobileTabs = [
    { id: 'store', label: 'Overview', icon: LayoutGrid }, { id: 'pos', label: 'POS', icon: ShoppingCart }, { id: 'products', label: 'Stock', icon: Package }, { id: 'sales-history', label: 'Invoices', icon: ReceiptText }, { id: 'reports', label: 'Reports', icon: ChartNoAxesCombined },
];
export function Workspace({ view, navigate, notify, cart, onCart, onInvoice }) {
    const { ready, writable, limitation } = usePos();
    if (!ready)
        return _jsxs("div", { className: "panel pos-loading", role: "status", children: [_jsx("span", {}), "Opening local workspace\u2026"] });
    return _jsxs(_Fragment, { children: [!writable && _jsx("div", { className: "storage-warning", children: _jsx(Warning, { children: limitation }) }), view === 'store' && _jsx(StoreDashboard, { onRoute: navigate, onInvoice: onInvoice }), view === 'pos' && _jsx(SaleTerminal, { cart: cart, onCart: onCart, onInvoice: onInvoice, onProducts: () => navigate('products') }), view === 'sales-history' && _jsx(SalesHistory, { onInvoice: onInvoice }), view === 'products' && _jsx(Products, { notify: notify }), view === 'purchases' && _jsx(Purchases, { notify: notify }), view === 'customers' && _jsx(Parties, { side: "customer", notify: notify, onInvoice: onInvoice }, "customers"), view === 'suppliers' && _jsx(Parties, { side: "supplier", notify: notify, onInvoice: onInvoice }, "suppliers"), view === 'expenses' && _jsx(Expenses, { notify: notify }), view === 'accounts' && _jsx(Accounts, { notify: notify }), view === 'reports' && _jsx(Reports, {}), view === 'settings' && _jsx(Settings, { notify: notify })] });
}
