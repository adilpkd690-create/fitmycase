import { useEffect, useState } from '/vendor/react.js';
export const zone = 'Asia/Kolkata';
const parts = new Intl.DateTimeFormat('en', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' });
export function shopDay(date = new Date()) {
    const p = Object.fromEntries(parts.formatToParts(date).map(x => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
}
export const niceDay = (s) => new Intl.DateTimeFormat('en-IN', { timeZone: zone, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${s}T12:00:00Z`));
export function trailing(days) {
    const to = shopDay(), d = new Date(to + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - (days - 1));
    return { from: d.toISOString().slice(0, 10), to };
}
export const expenseLabels = { rent: 'Rent', utilities: 'Electricity & utilities', travel: 'Transport', payroll: 'Staff wages', meals: 'Food & refreshments', maintenance: 'Maintenance', other: 'Other' };
export const accountLabels = { cash: 'Cash drawer', upi: 'UPI', card: 'Card clearing', bank: 'Bank', inventory: 'Inventory', receivable: 'Customer receivable', payable: 'Supplier payable', opening_equity: 'Opening equity', owner_funds: 'Owner funds', stock_equity: 'Stock correction equity', sales: 'Sales', sales_returns: 'Sales returns', cogs: 'Cost of goods sold', other_income: 'Other income', operating_expense: 'Operating expense', inventory_loss: 'Stock loss', cgst_output: 'CGST output', sgst_output: 'SGST output', igst_output: 'IGST output' };
export const creditAccounts = new Set(['payable', 'opening_equity', 'owner_funds', 'stock_equity', 'sales', 'other_income', 'cgst_output', 'sgst_output', 'igst_output']);
export const operationLabels = { opening: 'Opening stock', sale: 'Sale', purchase: 'Purchase', purchase_return: 'Supplier return', stock_reversal: 'Stock correction reversal', return: 'Return', collection: 'Customer collection', supplier_payment: 'Supplier payment', expense: 'Expense', funds: 'Owner deposit', transfer: 'Transfer', other_income: 'Other income', cash_close: 'Daily cash count', stock_adjust: 'Stock adjustment', contact_details: 'Opening contact balance' };
export const nameOf = (s) => accountLabels[s] ?? s;
export const labelOf = (s) => operationLabels[s] ?? s;
export const categoryOf = (s) => s && expenseLabels[s] || s || 'Other';
export const rollup = (data) => data.daily.reduce((a, b) => ({ bills: a.bills + b.bills, sales_pa: a.sales_pa + b.sales_pa, returns_pa: a.returns_pa + b.returns_pa,
    cogs_pa: a.cogs_pa + b.cogs_pa, expenses_pa: a.expenses_pa + b.expenses_pa, other_pa: a.other_pa + b.other_pa, tax_pa: a.tax_pa + b.tax_pa }), { bills: 0, sales_pa: 0, returns_pa: 0, cogs_pa: 0, expenses_pa: 0, other_pa: 0, tax_pa: 0 });
export function profitLines(data) {
    const s = rollup(data), sales = s.sales_pa - s.returns_pa, gross = sales - s.cogs_pa;
    return [['Sales before GST', s.sales_pa], ['Sales returns', -s.returns_pa], ['Net sales before GST', sales], ['Cost of goods sold', -s.cogs_pa], ['Gross profit', gross], ['Other income', s.other_pa], ['Operating expenses & stock loss', -s.expenses_pa], ['Net profit', gross + s.other_pa - s.expenses_pa]];
}
export const pageSize = 50;
export function useRead(sb, fn, args, revision, enabled = true) {
    const serial = JSON.stringify(args), key = `${fn}:${serial}:${revision}:${enabled}`;
    const [state, setState] = useState({ key: '' });
    useEffect(() => {
        if (!enabled)
            return;
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
        let live = true;
        void (async () => {
            try {
                const { error, data } = await sb.rpc(fn, JSON.parse(serial)).abortSignal(controller.signal);
                if (error || data == null)
                    throw Error('Could not read this information. Check connection, shop access and the database update; then Refresh.');
                if (live)
                    setState({ key, data: data });
            }
            catch (e) {
                if (live)
                    setState({ key, issue: e instanceof Error ? e.message : 'Could not read this page.' });
            }
            finally {
                clearTimeout(timeout);
            }
        })();
        return () => { live = false; clearTimeout(timeout); controller.abort(); };
    }, [sb, fn, serial, enabled, key]);
    return !enabled || state.key !== key ? {} : state;
}
export async function readExport(sb, branch, view, range) {
    const { data, error } = await sb.rpc('mc_shop_export', { p_branch: branch, p_view: view, p_from: range.from, p_to: range.to }).abortSignal(AbortSignal.timeout(25000));
    if (error || !Array.isArray(data))
        throw Error(error?.code === 'P0001' ? error.message : 'Export not available. Check connection and the database update.');
    return data;
}
export function csvText(rows) {
    return '\uFEFF' + rows.map(row => row.map(cell => {
        if (typeof cell === 'number') {
            if (!Number.isFinite(cell))
                throw Error('Invalid CSV number.');
            return String(cell);
        }
        let s = String(cell ?? '');
        if (/^[\s\u0000-\u001f]*[=+\-@]/.test(s) || /^[\t\r\n]/.test(s))
            s = "'" + s;
        return '"' + s.replace(/"/g, '""') + '"';
    }).join(',')).join('\r\n') + '\r\n';
}
export function saveCsv(name, rows) {
    const url = URL.createObjectURL(new Blob([csvText(rows)], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}
