import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "/vendor/react-jsx-runtime.js";
import { useEffect, useMemo, useRef, useState } from '/vendor/react.js';
import { ArrowDownToLine, Barcode, Cable, CirclePlus, Headphones, Minus, Package, Plus, Printer, ReceiptText, ArrowDown, ScanLine, Search, ShoppingCart, Smartphone, Trash2, UserRound, Wallet, Zap } from '/vendor/lucide-react.js';
import { PanelTitle } from '../components/Charts.js';
import { Dialog } from '../components/Controls.js';
import { dateLabel, num } from '../data.js';
import { usePos } from './context.js';
import { eventId, inputMoney, moneyInput, returnedQty, saleCredit, shortProduct, tenderAmounts, today, TENDERS } from './engine.js';
import { exportFile, inventory, isIn, salesCsv, statusFor, storeRange } from './reports.js';
import { AmountInput, DateField, DatePicker, Field, MethodOptions, PostingForm, SearchBox, Table, Tag, Warning, fieldDate, humanError, inr, matchText, qtyInput, value } from './ui.js';
import { ReceiptPrint, printDocument } from './printing.js';
import { BarcodeScanner } from './BarcodeScanner.js';
import { lookupBarcode } from './barcode-match.js';
import { lookupFeedback } from './barcode.js';
const groupIcons = { 'Cases & covers': Smartphone, 'Chargers & cables': Cable, 'Screen protectors': Smartphone, 'Audio & Bluetooth': Headphones, 'Power banks': Zap };
const groupTheme = { 'Cases & covers': 'violet', 'Chargers & cables': 'blue', 'Screen protectors': 'green', 'Audio & Bluetooth': 'orange', 'Power banks': 'blue', 'Perfumes': 'violet' };
function IconTile({ product }) {
    const Icon = groupIcons[product.group] ?? Package;
    return _jsx("div", { className: `catalog-icon catalog-${groupTheme[product.group] ?? 'violet'}`, children: _jsx(Icon, { size: 23, strokeWidth: 1.7 }) });
}
export function SaleStatus({ sale }) {
    const { book } = usePos(), returned = book.returns.filter(r => r.saleId === sale.id).reduce((s, r) => s + r.amount, 0);
    const remaining = saleCredit(book, sale), label = statusFor(remaining, sale.total - returned);
    return _jsx(Tag, { tone: returned === sale.total ? 'violet' : label === 'Paid' ? 'green' : label === 'Partial' ? 'amber' : 'red', children: returned === sale.total ? 'Returned' : label });
}
export function SaleTerminal({ cart, onCart, onInvoice, onProducts }) {
    const { book, busy, writable, write } = usePos();
    const catalogue = useMemo(() => inventory(book), [book]);
    const products = catalogue.filter(p => p.active);
    const [scannerOpen, setScannerOpen] = useState(false), [scanNotice, setScanNotice] = useState(null);
    const [filter, setFilter] = useState('All products'), [query, setQuery] = useState(''), [discount, setDiscount] = useState(''), [customerId, setCustomer] = useState('');
    const [payments, setPayments] = useState({ cash: '', upi: '', card: '', bank: '' });
    const [error, setError] = useState('');
    const attempt = useRef(null), search = useRef(null);
    const groups = [...new Set(products.map(p => p.group))];
    const filtered = products.filter(p => (filter === 'All products' || p.group === filter) && matchText(query, p.name, p.variant, p.sku, p.barcode));
    const lines = cart.flatMap(l => { const p = products.find(a => a.id === l.id); return p ? [{ ...l, product: p, amount: p.price * l.qty }] : []; });
    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    const units = lines.reduce((s, l) => s + l.qty, 0);
    let parsedDiscount = 0, inputError = '', paid = 0;
    const tender = tenderAmounts();
    try {
        parsedDiscount = moneyInput(discount);
        for (const t of TENDERS) {
            tender[t.id] = moneyInput(payments[t.id]);
            paid += tender[t.id];
        }
        if (parsedDiscount && parsedDiscount >= subtotal)
            inputError = 'Discount must be less than the cart subtotal.';
    }
    catch (e) {
        inputError = humanError(e);
    }
    const total = Math.max(0, subtotal - parsedDiscount), due = total - paid;
    const canSale = writable && !busy && lines.length > 0 && !inputError && due >= 0 && (due === 0 || Boolean(customerId)) && lines.every(l => l.qty <= l.product.qty);
    useEffect(() => { search.current?.focus({ preventScroll: true }); }, []);
    const add = (id) => {
        const p = products.find(a => a.id === id), found = cart.find(l => l.id === id), nextQty = (found?.qty ?? 0) + 1;
        if (busy)
            return { tone: 'warning', title: 'Wait for the current sale to finish' };
        if (!p || nextQty > p.qty) {
            const detail = p?.qty === 0 ? `${shortProduct(p)} is out of stock.` : p ? `Only ${p.qty} units of ${shortProduct(p)} are available.` : 'This product is no longer available.';
            return { tone: 'warning', title: 'Item not added', detail };
        }
        setError('');
        onCart(found ? cart.map(l => l.id === id ? { ...l, qty: nextQty } : l) : [...cart, { id, qty: 1 }]);
        return { tone: 'success', title: 'Added to cart', detail: `${shortProduct(p)} · ${nextQty} in cart` };
    };
    const addCatalogItem = (id) => {
        const result = add(id);
        setScanNotice(null);
        if (result.tone === 'warning')
            setError(result.detail ?? result.title);
    };
    const updateQty = (id, delta) => {
        if (delta > 0)
            addCatalogItem(id);
        else {
            setError('');
            setScanNotice(null);
            onCart(cart.map(l => l.id === id ? { ...l, qty: l.qty - 1 } : l).filter(l => l.qty > 0));
        }
    };
    const scannedItem = (reading, acceptSku = false) => {
        const match = lookupBarcode(catalogue, reading.value);
        if (match.kind === 'found')
            return match.product.active ? add(match.product.id) : { tone: 'warning', title: 'Product is inactive', detail: 'Reactivate it in Products & stock to sell it.' };
        if (match.kind === 'unknown' && acceptSku) {
            const bySku = catalogue.find(p => p.sku === reading.value.trim().toUpperCase());
            if (bySku)
                return bySku.active ? add(bySku.id) : { tone: 'warning', title: 'Product is inactive' };
        }
        return lookupFeedback(match.kind);
    };
    const scan = () => {
        const q = query.trim().toUpperCase();
        if (!q)
            return;
        const feedback = scannedItem({ value: q, format: 'Keyboard' }, true);
        setError('');
        if (feedback.title === 'Barcode not registered' && filtered.length)
            setScanNotice({ tone: 'warning', title: 'Select a catalogue item or enter an exact SKU / barcode.' });
        else {
            setScanNotice(feedback);
            setQuery('');
        }
        search.current?.focus({ preventScroll: true });
    };
    const closeScanner = () => { setScannerOpen(false); requestAnimationFrame(() => search.current?.focus({ preventScroll: true })); };
    const clear = () => { setScanNotice(null); onCart([]); setDiscount(''); setCustomer(''); setPayments({ cash: '', upi: '', card: '', bank: '' }); attempt.current = null; };
    const checkout = async (e) => {
        e.preventDefault();
        setError('');
        if (!canSale)
            return;
        const action = { type: 'sale', date: today(), customerId, items: lines.map(l => ({ id: l.id, qty: l.qty })), discount: parsedDiscount, tenders: tender };
        const key = JSON.stringify(action);
        if (attempt.current?.key !== key)
            attempt.current = { key, id: eventId() };
        try {
            const result = await write(action, attempt.current.id);
            const sale = result.book.sales.find(s => s.number === result.ref);
            clear();
            if (sale)
                onInvoice(sale.id);
        }
        catch (e) {
            setError(humanError(e));
        }
    };
    return _jsxs("div", { className: "terminal-layout", children: [_jsxs("section", { className: "panel terminal-catalog", "aria-label": "Product catalogue", children: [_jsx(PanelTitle, { title: "Product catalogue", description: "Search by product, SKU, or scan a barcode.", action: _jsxs(Tag, { tone: "violet", children: [products.length, " products"] }) }), _jsxs("div", { className: "pos-scan-toolbar", children: [_jsxs("div", { className: "terminal-search", role: "search", "aria-label": "Catalogue lookup", children: [_jsx(Search, { size: 19 }), _jsx("label", { className: "sr-only", htmlFor: "pos-scan", children: "Search or scan products" }), _jsx("input", { ref: search, id: "pos-scan", autoComplete: "off", spellCheck: false, value: query, onChange: e => { setQuery(e.target.value); setScanNotice(null); }, placeholder: "Search or scan products\u2026", onKeyDown: e => {
                                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                                e.preventDefault();
                                                if (!e.repeat)
                                                    scan();
                                            }
                                        } }), _jsx("span", { children: _jsx("kbd", { children: "Enter" }) })] }), _jsxs("button", { type: "button", className: "button scan-launch", "aria-label": "Scan barcode", onClick: () => { setError(''); setScannerOpen(true); }, children: [_jsx(ScanLine, { size: 18 }), _jsx("span", { children: "Scan barcode" })] })] }), scanNotice && _jsxs("p", { className: `scan-terminal-feedback ${scanNotice.tone === 'warning' ? 'is-warning' : ''}`, role: "status", children: [_jsx("strong", { children: scanNotice.title }), scanNotice.detail ? ` · ${scanNotice.detail}` : ''] }), _jsx("div", { className: "catalog-chips", "aria-label": "Product category", children: ['All products', ...groups].map(group => _jsx("button", { className: filter === group ? 'chip-active' : '', type: "button", "aria-pressed": filter === group, onClick: () => setFilter(group), children: group }, group)) }), filtered.length ? _jsx("div", { className: "catalog-grid", children: filtered.map(p => _jsxs("button", { type: "button", className: "catalog-card", disabled: !p.qty || busy, "aria-label": `Add ${shortProduct(p)} to cart`, onClick: () => addCatalogItem(p.id), children: [_jsxs("div", { className: "catalog-top", children: [_jsx(IconTile, { product: p }), _jsx("span", { className: `stock-counter ${p.qty === 0 ? 'sold-out' : p.qty <= p.minimum ? 'low' : ''}`, children: p.qty === 0 ? 'Out of stock' : `${p.qty} in stock` })] }), _jsx("strong", { children: p.name }), _jsx("small", { children: p.variant || p.sku }), _jsxs("div", { className: "catalog-price", children: [_jsx("b", { children: inr(p.price) }), p.qty > 0 ? _jsx(CirclePlus, { size: 19 }) : _jsx(Barcode, { size: 17 })] })] }, p.id)) }) : _jsx("div", { className: "pos-empty", children: products.length ? 'No products match your search.' : _jsxs(_Fragment, { children: [_jsx("p", { children: "Add a product and receive stock before making a sale." }), _jsx("button", { className: "button", type: "button", onClick: onProducts, children: "Open products" })] }) })] }), _jsxs("section", { id: "checkout", className: "panel checkout-panel", "aria-label": "Current sale", children: [_jsx(PanelTitle, { title: "Current sale", description: `${num(units)} ${units === 1 ? 'item' : 'items'} in cart`, action: _jsx("span", { className: "checkout-mark", children: _jsx(ShoppingCart, { size: 19 }) }) }), _jsx("div", { className: "cart-lines", children: lines.length ? lines.map(l => _jsxs("div", { className: "cart-line", children: [_jsxs("div", { children: [_jsx("strong", { children: l.product.name }), _jsxs("small", { children: [l.product.variant || l.product.sku, " \u00B7 ", inr(l.product.price), " each"] })] }), _jsxs("div", { className: "cart-line-right", children: [_jsx("b", { children: inr(l.amount) }), _jsxs("div", { className: "qty-step", children: [_jsx("button", { type: "button", "aria-label": `Decrease ${l.product.name}`, onClick: () => updateQty(l.id, -1), children: _jsx(Minus, { size: 13 }) }), _jsx("span", { children: l.qty }), _jsx("button", { type: "button", disabled: l.qty >= l.product.qty, "aria-label": `Increase ${l.product.name}`, onClick: () => updateQty(l.id, 1), children: _jsx(Plus, { size: 13 }) }), _jsx("button", { type: "button", className: "remove-line", "aria-label": `Remove ${l.product.name}`, onClick: () => onCart(cart.filter(x => x.id !== l.id)), children: _jsx(Trash2, { size: 14 }) })] })] })] }, l.id)) : _jsxs("div", { className: "cart-empty", children: [_jsx(ShoppingCart, { size: 24 }), _jsx("span", { children: "Cart is empty" }), _jsx("small", { children: "Choose a product from the catalogue." })] }) }), _jsxs("form", { className: "checkout-form", onSubmit: checkout, children: [_jsxs("div", { className: "checkout-fields", children: [_jsx(Field, { label: "Customer", children: _jsxs("select", { value: customerId, onChange: e => setCustomer(e.target.value), children: [_jsx("option", { value: "", children: "Walk-in customer" }), book.customers.map(c => _jsx("option", { value: c.id, children: c.name }, c.id))] }) }), _jsx(Field, { label: "Bill discount (\u20B9)", children: _jsx("input", { inputMode: "decimal", placeholder: "0.00", value: discount, onChange: e => setDiscount(e.target.value) }) })] }), _jsxs("div", { className: "checkout-total", children: [_jsxs("span", { children: ["Total due", _jsxs("small", { children: ["Subtotal ", inr(subtotal)] })] }), _jsx("strong", { children: inr(total) })] }), _jsxs("div", { className: "pay-heading", children: [_jsx("strong", { children: "Payment split" }), _jsx("span", { children: "INR" })] }), _jsx("div", { className: "tender-grid", children: TENDERS.map(t => _jsx(Field, { label: t.name, children: _jsxs("div", { className: "tender-input", children: [_jsx("input", { "aria-label": t.name, inputMode: "decimal", placeholder: "0.00", value: payments[t.id], onChange: e => setPayments({ ...payments, [t.id]: e.target.value }) }), _jsx("button", { type: "button", "aria-label": `Fill remaining amount in ${t.name}`, disabled: due <= 0 || Boolean(inputError), onClick: () => setPayments({ ...payments, [t.id]: inputMoney(tender[t.id] + due) }), children: "Fill" })] }) }, t.id)) }), _jsxs("div", { className: "due-line", children: [_jsx("span", { children: due < 0 ? 'Overpayment' : 'Balance / credit' }), _jsx("b", { children: inr(Math.abs(due)) })] }), error && _jsx(Warning, { tone: "error", children: error }), lines.length > 0 && !error && (inputError || due < 0 || (due > 0 && !customerId)) && _jsx("div", { className: "checkout-hint", children: inputError || (due < 0 ? 'Payments are higher than the bill total.' : 'Pay the full amount or choose a registered customer for credit.') }), _jsxs("button", { className: "button primary-button complete-sale", disabled: !canSale, children: [_jsx(ReceiptText, { size: 17 }), busy ? 'Posting sale…' : 'Complete sale'] })] })] }), scannerOpen && _jsx(BarcodeScanner, { purpose: "Scan an item to add one unit to the current sale.", onClose: closeScanner, onBarcode: reading => {
                    const result = scannedItem(reading);
                    setScanNotice(result);
                    setQuery('');
                    return result;
                }, itemCount: units }), units > 0 && _jsxs("button", { className: "button primary-button cart-jump", type: "button", onClick: () => document.getElementById('checkout')?.scrollIntoView({ block: 'start' }), children: [_jsx(ShoppingCart, { size: 16 }), num(units), " in cart \u00B7 ", inr(total), _jsx(ArrowDown, { size: 15 })] })] });
}
export function SalesHistory({ onInvoice }) {
    const { book, kind } = usePos();
    const [range, setRange] = useState(() => storeRange(30)), [query, setQuery] = useState(''), [status, setStatus] = useState('all');
    const rows = [...book.sales].reverse().filter(s => isIn(s.date, range) && matchText(query, s.number, s.customer, ...s.items.map(i => i.name)) && (status === 'all' || (status === 'due' ? saleCredit(book, s) > 0 : saleCredit(book, s) === 0)));
    return _jsxs("section", { className: "panel pos-panel record-panel", children: [_jsx(PanelTitle, { title: "Posted invoices", description: "Original invoices stay unchanged. Record a return or payment from invoice details.", action: _jsxs("button", { className: "button", type: "button", onClick: () => exportFile(`mobile-craft-${kind}-sales.csv`, salesCsv(book, range), 'text/csv;charset=utf-8;'), children: [_jsx(ArrowDownToLine, { size: 16 }), "Sales CSV"] }) }), _jsxs("div", { className: "pos-toolbar", children: [_jsx(SearchBox, { placeholder: "Search invoice or customer\u2026", term: query, onTerm: setQuery }), _jsx(DatePicker, { range: range, onChange: setRange }), _jsxs("label", { className: "filter-native", children: [_jsx("span", { className: "sr-only", children: "Invoice status" }), _jsxs("select", { value: status, onChange: e => setStatus(e.target.value), children: [_jsx("option", { value: "all", children: "All invoices" }), _jsx("option", { value: "due", children: "Outstanding" }), _jsx("option", { value: "settled", children: "No balance" })] })] })] }), _jsx(Table, { label: "Posted invoices", heads: ['Invoice', 'Customer', 'Date', 'Total', 'Outstanding', 'Status', ''], rows: rows.map(s => ({ key: s.id, cells: [_jsx("b", { children: s.number }), s.customer, dateLabel(s.date, true), _jsx("b", { children: inr(s.total) }), inr(saleCredit(book, s)), _jsx(SaleStatus, { sale: s }), _jsx("button", { type: "button", className: "pos-link", "aria-label": `Open invoice ${s.number}`, onClick: () => onInvoice(s.id), children: "Open" })] })), empty: "No invoices match these dates and filters." })] });
}
export function PosInvoice({ id, onClose }) {
    const { book } = usePos(), sale = book.sales.find(s => s.id === id);
    const [stage, setStage] = useState('read'), [paper, setPaper] = useState('a4'), [message, setMessage] = useState('');
    if (!sale)
        return null;
    const due = saleCredit(book, sale), returns = book.returns.filter(r => r.saleId === sale.id), collected = book.receipts.filter(r => r.allocations.some(a => a.saleId === sale.id)), outstanding = sale.items.map(i => ({ ...i, available: i.qty - returnedQty(book, sale.id, i.id) })).filter(i => i.available > 0);
    const toCopy = async () => {
        const receipt = [`${sale.profile.name} · ${sale.number}`, dateLabel(sale.date, true), sale.customer, ...sale.items.map(l => `${l.qty} × ${l.name} — ${inr(l.net)}`), `Total ${inr(sale.total)}`, `Current balance ${inr(due)}`].join('\n');
        try {
            await navigator.clipboard.writeText(receipt);
            setMessage('Receipt copied. You can paste it into a message.');
        }
        catch {
            setMessage('Clipboard is unavailable in this preview. Open the desktop file to copy or print.');
        }
    };
    return _jsx(Dialog, { title: stage === 'return' ? `Return · ${sale.number}` : stage === 'collect' ? `Collect · ${sale.number}` : `Invoice ${sale.number}`, variant: "sheet", onClose: onClose, children: stage === 'read' ? _jsxs(_Fragment, { children: [_jsxs("div", { className: "pos-invoice-meta", children: [_jsx(UserRound, { size: 16 }), _jsx("strong", { children: sale.customer }), _jsx("span", { children: dateLabel(sale.date, true) }), _jsx(SaleStatus, { sale: sale })] }), _jsx("div", { className: "invoice-items pos-invoice-items", children: sale.items.map(l => _jsxs("div", { className: "invoice-item", children: [_jsxs("div", { children: [_jsx("strong", { children: l.name }), _jsxs("small", { children: [l.sku, " \u00B7 ", l.qty, " \u00D7 ", inr(l.unit), l.discount ? ` · discount ${inr(l.discount)}` : ''] })] }), _jsx("b", { children: inr(l.net) })] }, l.id)) }), _jsxs("dl", { className: "invoice-total", children: [_jsxs("div", { children: [_jsx("dt", { children: "Checkout total" }), _jsx("dd", { children: inr(sale.total) })] }), TENDERS.filter(t => sale.payments[t.id]).map(t => _jsxs("div", { children: [_jsxs("dt", { children: [t.name, " at checkout"] }), _jsx("dd", { children: inr(sale.payments[t.id]) })] }, t.id)), collected.map(r => _jsxs("div", { children: [_jsxs("dt", { children: [TENDERS.find(t => t.id === r.method)?.name, " collection \u00B7 ", dateLabel(r.date)] }), _jsx("dd", { children: inr(r.allocations.find(a => a.saleId === sale.id).amount) })] }, r.id)), returns.map(r => _jsxs("div", { children: [_jsxs("dt", { children: ["Return \u00B7 ", dateLabel(r.date), " ", _jsxs("small", { children: ["(", r.reason, ")"] }), _jsxs("small", { className: "return-alloc", children: [r.credit ? `${inr(r.credit)} applied to credit` : '', r.credit && r.refund ? ' · ' : '', r.refund ? `${inr(r.refund)} refunded via ${TENDERS.find(t => t.id === r.method)?.name}` : ''] })] }), _jsxs("dd", { children: ["\u2212", inr(r.amount)] })] }, r.id)), _jsxs("div", { className: "balance-row", children: [_jsx("dt", { children: "Outstanding" }), _jsx("dd", { children: inr(due) })] })] }), _jsxs("div", { className: "pos-invoice-actions", children: [_jsxs("label", { className: "filter-native", children: [_jsx("span", { className: "sr-only", children: "Receipt paper" }), _jsxs("select", { value: paper, onChange: e => setPaper(e.target.value), children: [_jsx("option", { value: "a4", children: "A4 receipt" }), _jsx("option", { value: "80", children: "80 mm thermal" }), _jsx("option", { value: "58", children: "58 mm thermal" })] })] }), _jsxs("button", { className: "button primary-button", type: "button", onClick: () => printDocument(paper), children: [_jsx(Printer, { size: 16 }), " Print / PDF"] }), _jsx("button", { className: "button", type: "button", onClick: toCopy, children: "Copy receipt" })] }), _jsxs("div", { className: "pos-invoice-actions", children: [due > 0 && _jsxs("button", { className: "button", type: "button", onClick: () => { setMessage(''); setStage('collect'); }, children: [_jsx(Wallet, { size: 16 }), "Record payment"] }), outstanding.length > 0 && _jsx("button", { className: "button", type: "button", onClick: () => { setMessage(''); setStage('return'); }, children: "Return items" })] }), message && _jsx("p", { className: "pos-feedback", role: "status", children: message }), _jsx(ReceiptPrint, { sale: sale, due: due })] }) : _jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "pos-link pos-back", onClick: () => setStage('read'), children: "\u2190 Back to invoice" }), stage === 'collect' ? _jsxs(PostingForm, { action: f => ({ type: 'settle', side: 'customer', id: sale.customerId, saleId: sale.id, date: fieldDate(f), amount: moneyInput(value(f, 'amount'), true), method: value(f, 'method') }), submit: "Save payment", onSuccess: () => { setStage('read'); setMessage('Payment posted to the customer ledger.'); }, children: [_jsx(Field, { label: "Amount (\u20B9)", children: _jsx(AmountInput, { initial: inputMoney(due), required: true }) }), _jsx(Field, { label: "Payment method", children: _jsx("select", { name: "method", defaultValue: "upi", children: _jsx(MethodOptions, {}) }) }), _jsx(DateField, { min: sale.date })] }) : _jsxs(PostingForm, { action: f => ({ type: 'return', saleId: sale.id, date: fieldDate(f), method: value(f, 'method'), reason: value(f, 'reason'), lines: outstanding.map(l => ({ lineId: l.id, qty: qtyInput(f, `qty-${l.id}`), restock: f.has(`restock-${l.id}`) })).filter(l => l.qty > 0) }), submit: "Post return", onSuccess: () => { setStage('read'); setMessage('Return posted. The original invoice was not changed.'); }, children: [_jsx("div", { className: "field-wide return-rows", children: outstanding.map(l => _jsxs("div", { className: "return-row", children: [_jsxs("div", { children: [_jsx("strong", { children: l.name }), _jsxs("small", { children: [l.available, " eligible \u00B7 Discount is prorated"] })] }), _jsx(Field, { label: "Quantity", children: _jsx("input", { name: `qty-${l.id}`, type: "number", defaultValue: 0, min: 0, max: l.available }) }), _jsxs("label", { className: "pos-checkbox", children: [_jsx("input", { type: "checkbox", name: `restock-${l.id}`, defaultChecked: true }), " Restock"] })] }, l.id)) }), _jsx(Field, { label: "Refund method", children: _jsx("select", { name: "method", children: _jsx(MethodOptions, {}) }) }), _jsx(DateField, { min: sale.date }), _jsx(Field, { label: "Return reason", wide: true, children: _jsx("textarea", { name: "reason", maxLength: 180, required: true, placeholder: "Explain why the item was returned" }) }), _jsx("div", { className: "field-wide", children: _jsx(Warning, { tone: "info", children: "A return first reduces credit on this invoice. Any remainder is refunded using the selected method. Uncheck Restock for damaged items." }) })] })] }) });
}
