// All monetary values in posted records are integer paise. Only display code accepts decimals.
export const TENDERS = [
    { id: 'cash', name: 'Cash', account: '1001' }, { id: 'upi', name: 'UPI', account: '1002' },
    { id: 'bank', name: 'Bank transfer', account: '1003' }, { id: 'card', name: 'Card', account: '1004' },
];
export const EXPENSES = [
    { id: '5100', name: 'Rent' }, { id: '5200', name: 'Electricity' }, { id: '5300', name: 'Salaries' },
    { id: '5400', name: 'Travel & transport' }, { id: '5500', name: 'Internet' }, { id: '5600', name: 'Packaging' }, { id: '5900', name: 'Loss & damage' },
];
export const ACCOUNT_TYPES = ['Assets', 'Liabilities', 'Equity', 'Income', 'Expenses'];
export const ACCOUNTS = [
    ...TENDERS.map(t => ({ id: t.account, name: t.name, type: 'Assets', normal: 'debit' })),
    { id: '1100', name: 'Customer receivables', type: 'Assets', normal: 'debit' },
    { id: '1200', name: 'Inventory', type: 'Assets', normal: 'debit' },
    { id: '2000', name: 'Supplier payables', type: 'Liabilities', normal: 'credit' },
    { id: '3000', name: 'Owner’s capital', type: 'Equity', normal: 'credit' },
    { id: '4000', name: 'Sales revenue', type: 'Income', normal: 'credit' },
    { id: '4100', name: 'Sales returns', type: 'Income', normal: 'debit' },
    { id: '4900', name: 'Other income & adjustments', type: 'Income', normal: 'credit' },
    { id: '5000', name: 'Cost of goods sold', type: 'Expenses', normal: 'debit' },
    ...EXPENSES.map(e => ({ id: e.id, name: e.name, type: 'Expenses', normal: 'debit' })),
];
export const PRODUCT_GROUPS = ['Cases & covers', 'Chargers & cables', 'Screen protectors', 'Audio & Bluetooth', 'Power banks', 'Mounts & stands', 'Adapters & OTG', 'Perfumes', 'Other accessories', 'Services'];
const LIMIT = 10_000_000_000; // ₹10 crore per validated input; balances still checked as safe integers.
const countLimit = 1_000_000;
const businessDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
export const today = () => businessDate.format(new Date());
export class BookError extends Error {
}
function requireValue(ok, message) { if (!ok)
    throw new BookError(message); }
function text(value, field, max = 120, optional = false) {
    requireValue(typeof value === 'string', `${field} must be text.`);
    const result = value.trim();
    requireValue((optional || result.length > 0) && result.length <= max, `${field} ${optional ? 'cannot exceed' : 'is required and cannot exceed'} ${max} characters.`);
    return result;
}
function integer(value, field, min = 0, max = LIMIT) {
    requireValue(typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max, `Enter a valid ${field.toLowerCase()}.`);
    return value;
}
function safe(value) { requireValue(Number.isSafeInteger(value) && Math.abs(value) <= Math.floor(Number.MAX_SAFE_INTEGER / 32), 'Numeric limit exceeded. Nothing was saved.'); return value; }
function date(value, maxDate) {
    requireValue(typeof value === 'string' && /^20\d\d-\d\d-\d\d$/.test(value), 'Choose a valid business date.');
    const dt = new Date(`${value}T00:00:00Z`);
    requireValue(!isNaN(+dt) && dt.toISOString().slice(0, 10) === value && value <= maxDate, 'Choose a valid date no later than the posting day.');
    return value;
}
function method(value) { const tender = TENDERS.find(t => t.id === value); requireValue(tender, 'Choose a valid payment method.'); return tender; }
function partySide(value) { requireValue(value === 'customer' || value === 'supplier', 'Invalid ledger type.'); return value; }
function uniqueRows(rows, count = 0) { requireValue(Array.isArray(rows) && rows.length > count && rows.length <= 100 && rows.every(x => x && typeof x === 'object'), 'Add between 1 and 100 valid line items.'); return rows; }
export function moneyInput(textValue, required = false) {
    const v = textValue.trim();
    if (!v && !required)
        return 0;
    requireValue(/^\d{1,9}(\.\d{1,2})?$/.test(v), 'Enter an amount in rupees with at most two decimal places.');
    const [rupee, fraction = ''] = v.split('.');
    return integer(Number(rupee) * 100 + Number(fraction.padEnd(2, '0')), 'amount', required ? 1 : 0);
}
export const inputMoney = (paise) => (paise / 100).toFixed(2).replace(/\.00$/, '');
function portion(value, qty, total) {
    return Number((BigInt(value) * BigInt(qty) + BigInt(Math.floor(total / 2))) / BigInt(total));
}
export const shortProduct = (p) => p.variant ? `${p.name} · ${p.variant}` : p.name;
export const sepNumber = (prefix, sequence) => `${prefix}-${String(sequence).padStart(4, '0')}`;
export const tenderAmounts = () => ({ cash: 0, upi: 0, card: 0, bank: 0 });
export const freshBook = () => ({
    version: 1, rev: 0, nextSale: 1, nextPurchase: 1, nextBarcode: 1,
    profile: { name: 'Mobile Craft', address: 'Ramanattukara, Kerala', phone: '', prefix: 'INV', gstin: '' },
    products: [], customers: [], suppliers: [], sales: [], purchases: [], returns: [], receipts: [], expenses: [], movements: [], journals: [], audit: [], closings: [], events: [],
});
export function stockMap(book) {
    const by = new Map(book.products.map(p => [p.id, { qty: 0, value: 0 }]));
    for (const m of book.movements) {
        const entry = by.get(m.productId);
        if (!entry)
            continue;
        entry.qty = safe(entry.qty + m.qty);
        entry.value = safe(entry.value + m.value);
    }
    return by;
}
export function saleCredit(book, sale) {
    return sale.credit - book.returns.filter(r => r.saleId === sale.id).reduce((sum, r) => sum + r.credit, 0)
        - book.receipts.reduce((sum, r) => sum + r.allocations.filter(a => a.saleId === sale.id).reduce((t, a) => t + a.amount, 0), 0);
}
export function returnedQty(book, saleId, lineId) {
    return book.returns.filter(r => r.saleId === saleId).flatMap(r => r.lines).filter(l => l.lineId === lineId).reduce((sum, l) => sum + l.qty, 0);
}
export function accountBalances(book, end = '9999-12-31') {
    const by = Object.fromEntries(ACCOUNTS.map(a => [a.id, 0]));
    for (const j of book.journals)
        if (j.date <= end)
            for (const l of j.lines)
                by[l.account] = safe(by[l.account] + l.debit - l.credit);
    return by; // debit minus credit for every account
}
export function partyBalance(book, side, id, end = '9999-12-31') {
    const account = side === 'customer' ? '1100' : '2000';
    let balance = 0;
    for (const j of book.journals)
        if (j.date <= end)
            for (const l of j.lines)
                if (l.party === id && l.account === account)
                    balance = safe(balance + l.debit - l.credit);
    return (side === 'customer' ? balance : -balance) || 0;
}
export const getParty = (book, side, id) => (side === 'customer' ? book.customers : book.suppliers).find(p => p.id === id);
export const debit = (account, value, party) => ({ account, debit: value, credit: 0, ...(party ? { party } : {}) });
export const credit = (account, value, party) => ({ account, debit: 0, credit: value, ...(party ? { party } : {}) });
function recordJournal(book, id, when, note, ref, postings) {
    const lines = postings.filter(l => l.debit || l.credit);
    if (!lines.length)
        return;
    let d = 0, c = 0;
    for (const l of lines) {
        requireValue(Number.isSafeInteger(l.debit) && Number.isSafeInteger(l.credit) && l.debit >= 0 && l.credit >= 0 && ACCOUNTS.some(a => a.id === l.account), 'Invalid journal line.');
        requireValue(l.account !== '1100' && l.account !== '2000' || Boolean(l.party), 'A party is required for this ledger line.');
        d = safe(d + l.debit);
        c = safe(c + l.credit);
    }
    requireValue(d === c && d > 0, 'Journal is unbalanced. Nothing was saved.');
    requireValue(!lines.some(l => l.account === '1001') || !book.closings.some(x => x.date >= when), 'Cash is already closed for this date. Use an open date for new cash postings.');
    book.journals.push({ id, date: when, note, ref, lines });
}
function productBy(book, id) { const p = book.products.find(x => x.id === id); requireValue(p, 'Product not found. Refresh the catalogue.'); return p; }
function move(book, id, productId, delta, value, type, when, note, ref) {
    requireValue(!book.movements.some(m => m.productId === productId && m.date > when), 'Stock cannot be posted before a later movement on this product. Choose a more recent date.');
    book.movements.push({ id, productId, qty: delta, value, type, date: when, note, ref });
}
function nextBarcode(book) {
    let barcode;
    do {
        barcode = `MC${String(book.nextBarcode++).padStart(6, '0')}001`;
    } while (book.products.some(p => p.barcode === barcode));
    return barcode;
}
const regexpId = /^[A-Za-z0-9_-]{1,92}$/;
export const eventId = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : [...crypto.getRandomValues(new Uint8Array(16))].map(n => n.toString(16).padStart(2, '0')).join('');
function apply(book, event) {
    requireValue(event && typeof event === 'object' && typeof event.id === 'string' && regexpId.test(event.id) && typeof event.at === 'string', 'Invalid backup or event ID.');
    const stamp = new Date(event.at);
    requireValue(!isNaN(+stamp) && stamp.toISOString() === event.at, 'Invalid posting timestamp.');
    const maxDate = businessDate.format(stamp);
    const a = event.action, id = event.id;
    requireValue(a && typeof a === 'object' && typeof a.type === 'string', 'Invalid action.');
    let note = '', ref = id;
    switch (a.type) {
        case 'profile': {
            const p = a.profile;
            requireValue(p && typeof p === 'object', 'Invalid store profile.');
            const prefix = text(p.prefix, 'Invoice prefix', 10).toUpperCase();
            const gstin = text(p.gstin, 'GSTIN', 15, true).toUpperCase();
            requireValue(/^[A-Z0-9]{1,10}$/.test(prefix), 'Invoice prefix can use only letters and numbers.');
            requireValue(!gstin || /^[A-Z0-9]{15}$/.test(gstin), 'GSTIN, if entered, must contain 15 letters or digits.');
            book.profile = { name: text(p.name, 'Business name', 75), address: text(p.address, 'Address', 240, true), phone: text(p.phone, 'Phone', 30, true), prefix, gstin };
            note = 'Business profile updated';
            break;
        }
        case 'product': {
            const when = date(a.date, maxDate), current = a.id ? productBy(book, a.id) : undefined;
            const sku = text(a.sku, 'SKU', 40).toUpperCase();
            const barcode = text(a.barcode, 'Barcode', 48, true).toUpperCase() || current?.barcode || nextBarcode(book);
            requireValue(/^[A-Z0-9._ /+%$-]+$/.test(barcode), 'Use uppercase letters, numbers, spaces, or ._ /+%$- in the barcode.');
            requireValue(!book.products.some(p => p.id !== current?.id && p.sku === sku), 'That SKU is already in use.');
            requireValue(!book.products.some(p => p.id !== current?.id && p.barcode === barcode), 'That barcode is already in use.');
            requireValue(PRODUCT_GROUPS.includes(a.group), 'Choose a product category.');
            requireValue(typeof a.active === 'boolean', 'Invalid product status.');
            const product = { id: current?.id ?? id, name: text(a.name, 'Product name', 90), variant: text(a.variant, 'Variant', 60, true), sku, barcode, group: a.group,
                price: integer(a.price, 'selling price', 1), cost: integer(a.cost, 'unit cost'), minimum: integer(a.minimum, 'stock threshold', 0, countLimit), active: a.active };
            const opening = integer(a.opening, 'opening quantity', 0, countLimit);
            requireValue(!current || !opening, 'Opening stock cannot be changed on an existing product. Use a stock adjustment.');
            if (current)
                Object.assign(current, product);
            else
                book.products.push(product);
            if (opening) {
                const value = safe(opening * product.cost);
                move(book, id, product.id, opening, value, 'Opening stock', when, 'Product opening stock', product.sku);
                recordJournal(book, id, when, 'Opening stock', product.sku, [debit('1200', value), credit('3000', value)]);
            }
            ref = product.id;
            note = `${current ? 'Edited' : 'Added'} ${shortProduct(product)}`;
            break;
        }
        case 'delete-product': {
            const p = productBy(book, a.id);
            requireValue(!book.movements.some(m => m.productId === p.id), 'This product has stock history and cannot be deleted. Mark it inactive instead.');
            book.products = book.products.filter(x => x.id !== p.id);
            ref = p.id;
            note = `Deleted unused product ${shortProduct(p)}`;
            break;
        }
        case 'stock': {
            const p = productBy(book, a.id), when = date(a.date, maxDate), reason = text(a.reason, 'Reason', 180);
            requireValue(['in', 'out', 'damage', 'loss'].includes(a.mode), 'Choose a stock adjustment type.');
            const qty = integer(a.qty, 'quantity', 1, countLimit), st = stockMap(book).get(p.id);
            const incoming = a.mode === 'in';
            requireValue(incoming || qty <= st.qty, `Only ${st.qty} units of ${p.name} are in stock.`);
            const value = incoming ? safe(qty * integer(a.cost, 'unit cost')) : portion(st.value, qty, st.qty);
            move(book, id, p.id, incoming ? qty : -qty, incoming ? value : -value, a.mode === 'in' ? 'Stock added' : a.mode === 'out' ? 'Stock out' : a.mode === 'damage' ? 'Damage' : 'Loss', when, reason, p.sku);
            recordJournal(book, id, when, reason, p.sku, incoming ? [debit('1200', value), credit('4900', value)] : [debit('5900', value), credit('1200', value)]);
            ref = p.id;
            note = `${shortProduct(p)}: ${incoming ? '+' : '−'}${qty} (${reason})`;
            break;
        }
        case 'party': {
            const side = partySide(a.side), when = date(a.date, maxDate), list = side === 'customer' ? book.customers : book.suppliers;
            const existing = a.id ? getParty(book, side, a.id) : undefined;
            requireValue(!a.id || existing, 'The ledger record no longer exists.');
            const p = { id: existing?.id ?? id, name: text(a.name, 'Name', 80), phone: text(a.phone, 'Phone', 35, true), note: text(a.note, 'Notes', 220, true) };
            const opening = integer(a.opening, 'opening balance');
            requireValue(!existing || !opening, 'Opening balance is only entered when creating a ledger.');
            if (existing)
                Object.assign(existing, p);
            else
                list.push(p);
            if (opening)
                recordJournal(book, id, when, `Opening balance · ${p.name}`, p.name, side === 'customer' ? [debit('1100', opening, p.id), credit('3000', opening)] : [debit('3000', opening), credit('2000', opening, p.id)]);
            ref = p.id;
            note = `${existing ? 'Edited' : 'Added'} ${side} ${p.name}`;
            break;
        }
        case 'sale': {
            const when = date(a.date, maxDate), cart = uniqueRows(a.items), stock = stockMap(book);
            const customerId = text(a.customerId, 'Customer', 92, true), customer = customerId ? getParty(book, 'customer', customerId) : undefined;
            requireValue(!customerId || customer, 'Select an existing customer.');
            const seen = new Set();
            const items = cart.map((line, i) => {
                const p = productBy(book, line.id), qty = integer(line.qty, 'quantity', 1, countLimit), st = stock.get(p.id);
                requireValue(p.active && !seen.has(p.id), 'The cart contains a duplicate or inactive product.');
                seen.add(p.id);
                requireValue(qty <= st.qty, `Only ${st.qty} units of ${p.name} are in stock.`);
                return { id: `${id}:${i}`, productId: p.id, name: shortProduct(p), sku: p.sku, group: p.group, qty, unit: p.price, discount: 0, net: safe(p.price * qty), cost: portion(st.value, qty, st.qty) };
            });
            const subtotal = safe(items.reduce((s, l) => safe(s + l.net), 0)), discount = integer(a.discount, 'discount', 0, Math.min(LIMIT, subtotal - 1));
            let accumulated = 0, allocated = 0;
            for (const line of items) {
                accumulated += line.net;
                const part = portion(discount, accumulated, subtotal);
                line.discount = part - allocated;
                line.net -= line.discount;
                allocated = part;
            }
            const total = subtotal - discount, payments = tenderAmounts();
            requireValue(a.tenders && typeof a.tenders === 'object' && !Array.isArray(a.tenders) && Object.keys(a.tenders).every(k => TENDERS.some(t => t.id === k)), 'Invalid payment allocation.');
            for (const t of TENDERS)
                payments[t.id] = integer(a.tenders[t.id] ?? 0, `${t.name} amount`);
            const paid = safe(Object.values(payments).reduce((s, n) => s + n, 0));
            requireValue(paid <= total, 'Payments cannot exceed the invoice total.');
            const due = total - paid;
            requireValue(!due || customer, 'Select a registered customer before leaving a balance on credit.');
            ref = sepNumber(book.profile.prefix, book.nextSale++);
            const cost = safe(items.reduce((sum, l) => safe(sum + l.cost), 0));
            const sale = { id, number: ref, date: when, at: event.at, customerId, customer: customer?.name ?? 'Walk-in customer', profile: { ...book.profile }, items, subtotal, discount, total, payments, paid, credit: due };
            recordJournal(book, id, when, `Sale · ${sale.customer}`, ref, [...TENDERS.map(t => debit(t.account, payments[t.id])), debit('1100', due, customerId), credit('4000', total), debit('5000', cost), credit('1200', cost)]);
            for (const l of items)
                move(book, l.id, l.productId, -l.qty, -l.cost, 'Sale', when, sale.customer, ref);
            book.sales.push(sale);
            note = `Posted ${ref}`;
            break;
        }
        case 'return': {
            const when = date(a.date, maxDate), sale = book.sales.find(s => s.id === a.saleId), m = method(a.method), reason = text(a.reason, 'Return reason', 180);
            requireValue(sale && when >= sale.date, 'Select an invoice and a date on or after its sale date.');
            requireValue(!book.returns.some(r => r.saleId === sale.id && r.date > when) && !book.receipts.some(r => r.date > when && r.allocations.some(p => p.saleId === sale.id)), 'There is a later return or payment on this invoice. Choose a more recent date.');
            const input = uniqueRows(a.lines), seen = new Set();
            const old = book.returns.filter(r => r.saleId === sale.id).flatMap(r => r.lines);
            const lines = input.map((r) => {
                const l = sale.items.find(x => x.id === r.lineId), qty = integer(r.qty, 'return quantity', 1, countLimit);
                requireValue(l && !seen.has(l.id) && typeof r.restock === 'boolean', 'Invalid return item.');
                seen.add(l.id);
                const already = old.filter(x => x.lineId === l.id);
                const pastQty = already.reduce((sum, r) => sum + r.qty, 0);
                requireValue(qty <= l.qty - pastQty, `Only ${l.qty - pastQty} remaining units may be returned for ${l.name}.`);
                return { lineId: l.id, productId: l.productId, qty, restock: r.restock,
                    amount: portion(l.net, pastQty + qty, l.qty) - already.reduce((s, r) => s + r.amount, 0),
                    cost: portion(l.cost, pastQty + qty, l.qty) - already.reduce((s, r) => s + r.cost, 0) };
            });
            const sum = safe(lines.reduce((s, l) => s + l.amount, 0)), oldCredit = saleCredit(book, sale);
            const reduceCredit = Math.min(sum, oldCredit), refund = sum - reduceCredit, restock = safe(lines.filter(l => l.restock).reduce((s, l) => s + l.cost, 0)), loss = safe(lines.filter(l => !l.restock).reduce((s, l) => s + l.cost, 0));
            ref = sale.number;
            recordJournal(book, id, when, `Return · ${reason}`, ref, [debit('4100', sum), credit('1100', reduceCredit, sale.customerId), credit(m.account, refund), debit('1200', restock), debit('5900', loss), credit('5000', safe(restock + loss))]);
            for (const [i, l] of lines.entries())
                if (l.restock)
                    move(book, `${id}:${i}`, l.productId, l.qty, l.cost, 'Return', when, reason, ref);
            book.returns.push({ id, saleId: sale.id, date: when, lines, amount: sum, credit: reduceCredit, refund, method: m.id, reason });
            note = `Return on ${ref} · ${reason}`;
            break;
        }
        case 'purchase': {
            const when = date(a.date, maxDate), supplier = getParty(book, 'supplier', a.supplierId), m = method(a.method);
            requireValue(supplier, 'Choose a supplier.');
            const rows = uniqueRows(a.items), seen = new Set();
            const items = rows.map(r => {
                const p = productBy(book, r.id), qty = integer(r.qty, 'purchase quantity', 1, countLimit), unit = integer(r.unit, 'unit cost');
                requireValue(p.active && !seen.has(p.id), 'A product appears twice or is inactive.');
                seen.add(p.id);
                return { productId: p.id, name: shortProduct(p), qty, unit, total: safe(qty * unit) };
            });
            const total = safe(items.reduce((s, l) => safe(s + l.total), 0)), paid = integer(a.paid, 'payment amount', 0, Math.min(total, LIMIT)), reference = text(a.reference, 'Supplier reference', 90, true);
            ref = sepNumber('PUR', book.nextPurchase++);
            recordJournal(book, id, when, `Purchase · ${supplier.name}`, ref, [debit('1200', total), credit(m.account, paid), credit('2000', total - paid, supplier.id)]);
            for (const [i, l] of items.entries())
                move(book, `${id}:${i}`, l.productId, l.qty, l.total, 'Purchase', when, supplier.name, ref);
            book.purchases.push({ id, number: ref, date: when, supplierId: supplier.id, reference, items, total, paid, method: m.id });
            note = `Received ${ref} · ${supplier.name}`;
            break;
        }
        case 'settle': {
            const when = date(a.date, maxDate), side = partySide(a.side), p = getParty(book, side, a.id), m = method(a.method), amount = integer(a.amount, 'settlement amount', 1);
            requireValue(p, 'Ledger not found.');
            requireValue(amount <= partyBalance(book, side, p.id), 'The payment cannot exceed the outstanding balance.');
            requireValue(!book.journals.some(j => j.date > when && j.lines.some(l => l.party === p.id)), 'There are later postings on this ledger. Choose a more recent date for payment.');
            const allocations = [];
            if (side === 'customer') {
                const all = book.sales.filter(s => s.customerId === p.id);
                const candidates = a.saleId ? all.filter(s => s.id === a.saleId) : all;
                let pending = amount;
                if (a.saleId)
                    requireValue(candidates.length && candidates[0].date <= when && amount <= saleCredit(book, candidates[0]), 'The collection exceeds the balance on this invoice or is dated before the sale.');
                for (const s of candidates.sort((x, y) => x.date.localeCompare(y.date) || x.number.localeCompare(y.number))) {
                    if (!pending)
                        break;
                    if (s.date > when)
                        continue;
                    const applied = Math.min(pending, saleCredit(book, s));
                    if (applied > 0) {
                        pending -= applied;
                        allocations.push({ saleId: s.id, amount: applied });
                    }
                }
                const openingDue = partyBalance(book, 'customer', p.id) - all.reduce((s, sale) => s + saleCredit(book, sale), 0);
                requireValue(pending <= openingDue, 'Choose a date on or after the outstanding invoices.');
            }
            ref = a.saleId ? book.sales.find(s => s.id === a.saleId)?.number ?? p.name : p.name;
            note = side === 'customer' ? `Collection · ${p.name}` : `Supplier payment · ${p.name}`;
            recordJournal(book, id, when, note, ref, side === 'customer' ? [debit(m.account, amount), credit('1100', amount, p.id)] : [debit('2000', amount, p.id), credit(m.account, amount)]);
            book.receipts.push({ id, date: when, type: side, partyId: p.id, amount, method: m.id, allocations });
            break;
        }
        case 'expense': {
            const when = date(a.date, maxDate), n = text(a.note, 'Description', 180), amount = integer(a.amount, 'expense amount', 1), m = method(a.method), category = EXPENSES.find(e => e.id === a.category);
            requireValue(category, 'Choose an expense category.');
            note = `${category.name} · ${n}`;
            ref = category.name;
            recordJournal(book, id, when, note, ref, [debit(category.id, amount), credit(m.account, amount)]);
            book.expenses.push({ id, date: when, category: category.id, method: m.id, amount, note: n });
            break;
        }
        case 'capital':
        case 'income': {
            const when = date(a.date, maxDate), m = method(a.method), value = integer(a.amount, 'amount', 1);
            note = `${a.type === 'capital' ? 'Owner deposit' : 'Other income'} · ${text(a.note, 'Description', 180)}`;
            ref = m.name;
            recordJournal(book, id, when, note, ref, [debit(m.account, value), credit(a.type === 'capital' ? '3000' : '4900', value)]);
            break;
        }
        case 'transfer': {
            const when = date(a.date, maxDate), from = method(a.from), to = method(a.to), value = integer(a.amount, 'transfer amount', 1);
            requireValue(from.id !== to.id, 'Choose two different payment accounts.');
            note = `${from.name} → ${to.name} · ${text(a.note, 'Description', 180)}`;
            ref = 'Account transfer';
            recordJournal(book, id, when, note, ref, [debit(to.account, value), credit(from.account, value)]);
            break;
        }
        case 'close-cash': {
            const when = date(a.date, maxDate), counted = integer(a.counted, 'counted cash'), expected = accountBalances(book, when)['1001'];
            requireValue(!book.closings.some(c => c.date >= when), 'There is already a closing for this date or a later date.');
            note = text(a.note, 'Cash difference explanation', 180, expected === counted);
            book.closings.push({ date: when, counted, expected, note, ref: id });
            note = `Cash count saved${note ? ` · ${note}` : ''}`;
            break;
        }
        default: throw new BookError('Unknown action. Backup not restored.');
    }
    // Run safe-integer validation before a state is allowed to leave the engine.
    accountBalances(book);
    book.audit.push({ id, at: event.at, action: a.type, note, ref });
    book.events.push(event);
    book.rev++;
    return ref;
}
export function commit(book, event) {
    const prior = book.audit.find(x => x.id === event.id);
    if (prior) {
        requireValue(JSON.stringify(book.events.find(e => e.id === event.id)?.action) === JSON.stringify(event.action), 'That submission ID was already used for a different transaction.');
        return { book, ref: prior.ref, replayed: true };
    }
    const draft = structuredClone(book);
    const ref = apply(draft, structuredClone(event));
    return { book: draft, ref, replayed: false };
}
export function buildBook(events) {
    requireValue(Array.isArray(events) && events.length <= 25_000, 'This local backup exceeds the supported event count.');
    const draft = freshBook(), ids = new Set();
    for (const event of events) {
        requireValue(event && typeof event.id === 'string' && !ids.has(event.id), 'Invalid or duplicate posting in backup.');
        apply(draft, structuredClone(event));
        ids.add(event.id);
    }
    return draft;
}
export const revisionOf = (book) => `${book.rev}:${book.events.at(-1)?.id ?? 'empty'}`;
export function backupData(book, kind) {
    return JSON.stringify({ format: 'mobile-craft-pos-events/1', kind, exportedAt: new Date().toISOString(), events: book.events });
}
export function restoreData(json, kind) {
    requireValue(json.length <= 20_000_000, 'The backup is too large for this version.');
    let value;
    try {
        value = JSON.parse(json);
    }
    catch {
        throw new BookError('The file does not contain valid JSON.');
    }
    requireValue(value && typeof value === 'object' && 'format' in value && value.format === 'mobile-craft-pos-events/1', 'Choose a JSON backup made by this version of Mobile Craft. Older app files are not imported.');
    requireValue('kind' in value && value.kind === kind, 'Restore this backup into its original Practice or Shop workspace.');
    requireValue('events' in value && Array.isArray(value.events), 'This file is missing the posting history.');
    return buildBook(value.events);
}
