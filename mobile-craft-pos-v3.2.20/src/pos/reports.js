import { addDays, dayCount, priorRange } from '../data.js';
import { ACCOUNTS, EXPENSES, TENDERS, accountBalances, shortProduct, stockMap, today } from './engine.js';
export const storeRange = (days = 7, end = today()) => ({ start: addDays(end, 1 - days), end });
export function storePresets(end = today()) {
    const month = `${end.slice(0, 7)}-01`, lastMonthEnd = addDays(month, -1);
    return [{ label: 'Today', range: storeRange(1, end) }, { label: 'Yesterday', range: storeRange(1, addDays(end, -1)) }, { label: 'Last 7 days', range: storeRange(7, end) }, { label: 'This month', range: { start: month, end } }, { label: 'Last month', range: { start: `${lastMonthEnd.slice(0, 7)}-01`, end: lastMonthEnd } }, { label: 'Last 30 days', range: storeRange(30, end) }];
}
export const isIn = (d, { start, end }) => d >= start && d <= end;
export function report(book, range) {
    const balance = Object.fromEntries(ACCOUNTS.map(a => [a.id, 0]));
    const methods = Object.fromEntries(TENDERS.map(t => [t.id, 0]));
    const dates = new Map(), tops = new Map();
    let invoices = 0;
    for (const j of book.journals)
        if (isIn(j.date, range))
            for (const line of j.lines)
                balance[line.account] += line.debit - line.credit;
    for (const s of book.sales)
        if (isIn(s.date, range)) {
            invoices++;
            dates.set(s.date, (dates.get(s.date) ?? 0) + s.total);
            for (const t of TENDERS)
                methods[t.id] += s.payments[t.id];
            for (const l of s.items) {
                const p = tops.get(l.productId) ?? { id: l.productId, name: l.name, qty: 0, amount: 0 };
                p.qty += l.qty;
                p.amount += l.net;
                tops.set(l.productId, p);
            }
        }
    for (const r of book.returns)
        if (isIn(r.date, range)) {
            dates.set(r.date, (dates.get(r.date) ?? 0) - r.amount);
            for (const l of r.lines) {
                const p = tops.get(l.productId) ?? { id: l.productId, name: book.products.find(x => x.id === l.productId)?.name ?? 'Product', qty: 0, amount: 0 };
                p.qty -= l.qty;
                p.amount -= l.amount;
                tops.set(l.productId, p);
            }
        }
    for (const r of book.receipts)
        if (r.type === 'customer' && isIn(r.date, range))
            methods[r.method] += r.amount;
    const sales = -balance['4000'] || 0, returned = balance['4100'], netSales = sales - returned, cogs = balance['5000'], gross = netSales - cogs, otherIncome = -balance['4900'] || 0, expense = EXPENSES.reduce((sum, e) => sum + balance[e.id], 0), purchases = book.purchases.filter(p => isIn(p.date, range)).reduce((s, p) => s + p.total, 0);
    return { sales, returned, netSales, cogs, gross, otherIncome, expense, net: gross + otherIncome - expense, purchases, invoices, methods, dates,
        top: [...tops.values()].filter(x => x.qty > 0).sort((a, b) => b.amount - a.amount), paid: Object.values(methods).reduce((a, b) => a + b, 0), expenseBreakdown: EXPENSES.map(e => ({ ...e, value: balance[e.id] })) };
}
export function dailyPoints(book, range, weekly) {
    const previous = priorRange(range), a = report(book, range).dates, b = report(book, previous).dates, n = dayCount(range);
    return Array.from({ length: Math.ceil(n / (weekly ? 7 : 1)) }, (_, row) => {
        const i = row * (weekly ? 7 : 1), count = Math.min(n - i, weekly ? 7 : 1);
        const start = addDays(range.start, i), priorStart = addDays(previous.start, i);
        let current = 0, prior = 0;
        for (let j = 0; j < count; j++) {
            current += a.get(addDays(start, j)) ?? 0;
            prior += b.get(addDays(priorStart, j)) ?? 0;
        }
        return { start, end: addDays(start, count - 1), priorStart, priorEnd: addDays(priorStart, count - 1), current, prior };
    });
}
export function statusFor(balance, totalAfterReturns) { return balance <= 0 ? 'Paid' : balance < totalAfterReturns ? 'Partial' : 'Unpaid'; }
export function inventory(book) {
    const stock = stockMap(book);
    return book.products.map(p => ({ ...p, ...stock.get(p.id) }));
}
export function trial(book) {
    const balance = accountBalances(book);
    return Object.values(balance).reduce((t, n) => ({ debit: t.debit + Math.max(n, 0), credit: t.credit + Math.max(-n, 0) }), { debit: 0, credit: 0 });
}
export function ledger(book, account, party) {
    const normal = ACCOUNTS.find(a => a.id === account)?.normal === 'credit' ? -1 : 1;
    let bal = 0;
    return book.journals.map((j, i) => ({ j, i })).sort((a, b) => a.j.date.localeCompare(b.j.date) || a.i - b.i)
        .flatMap(({ j }) => j.lines.filter(l => l.account === account && (!party || l.party === party)).map((l, i) => {
        bal += normal * (l.debit - l.credit);
        return { id: `${j.id}:${i}`, date: j.date, ref: j.ref, note: j.note, debit: l.debit, credit: l.credit, balance: bal };
    }));
}
export function cashActivity(book, when) {
    const lines = (journal) => journal.lines.filter((l) => l.account === '1001');
    const opening = accountBalances(book, addDays(when, -1))['1001'];
    const day = book.journals.filter(j => j.date === when).flatMap(lines);
    const received = day.reduce((sum, l) => sum + l.debit, 0), paid = day.reduce((sum, l) => sum + l.credit, 0);
    return { opening, received, paid, expected: opening + received - paid };
}
export function exportFile(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const cell = (x) => {
    const s = typeof x === 'string' && /^[\s]*[=+@-]/.test(x) ? `'${x}` : String(x);
    return `"${s.replaceAll('"', '""')}"`;
};
export const rupees = (n) => n / 100;
export function csv(head, rows) { return '\ufeff' + [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n'); }
export function stockCsv(book) { return csv(['SKU', 'Product', 'Category', 'Barcode', 'Quantity', 'Stock value (INR)', 'Selling price (INR)'], inventory(book).map(p => [p.sku, shortProduct(p), p.group, p.barcode, p.qty, rupees(p.value), rupees(p.price)])); }
export function salesCsv(book, range) {
    const rows = book.sales.filter(s => isIn(s.date, range)).map(s => [s.date, s.number, s.customer, 'Sale', rupees(s.total), rupees(s.paid), rupees(s.credit)]);
    for (const r of book.returns.filter(r => isIn(r.date, range))) {
        const s = book.sales.find(s => s.id === r.saleId);
        rows.push([r.date, s.number, s.customer, 'Return', rupees(-r.amount), rupees(-r.refund), rupees(-r.credit)]);
    }
    return csv(['Date', 'Invoice', 'Customer', 'Type', 'Sales (INR)', 'Checkout payments / refunds (INR)', 'Change in receivable (INR)'], rows.sort((a, b) => String(b[0]).localeCompare(String(a[0]))));
}
export function pnlCsv(book, range) {
    const p = report(book, range);
    return csv(['Period start', 'Period end', 'Metric', 'Amount (INR)'], [['Gross sales', p.sales], ['Returns', p.returned], ['Net sales', p.netSales], ['Cost of goods sold', p.cogs], ['Gross profit', p.gross], ['Other income', p.otherIncome], ['Expenses', p.expense], ['Net profit', p.net]].map(([label, value]) => [range.start, range.end, label, rupees(Number(value))]));
}
