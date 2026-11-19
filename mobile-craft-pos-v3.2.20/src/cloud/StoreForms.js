import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "/vendor/react-jsx-runtime.js";
import { useEffect, useState } from '/vendor/react.js';
import { FileLock2, PackagePlus, Plus, ReceiptText, ScanLine, Settings2, Wallet } from '/vendor/lucide-react.js';
import { Dialog } from '../components/Controls.js';
import { BarcodeScanner } from '../pos/BarcodeScanner.js';
import { barcodeValue, canRegisterBarcode, lookupBarcode } from '../pos/barcode-match.js';
import { lookupFeedback } from '../pos/barcode.js';
import { Warning, inr } from '../pos/ui.js';
import { billLimit, returnSlice, taxTotal, zeroTax } from './amounts.js';
import { download, errorText, methods, returnStatus, rupees, when } from './api.js';
import { seal } from './vault.js';
import { checkR2BackupWorker, downloadR2Backup, enableAndUploadR2, listR2Backups } from './r2-backup.js';
const field = (f, k) => String(f.get(k) ?? '').trim();
const rupeeInput = (n) => (n / 100).toFixed(2);
function useAction() {
    const [busy, setBusy] = useState(false), [issue, setIssue] = useState('');
    const run = async (fn) => { if (busy)
        return; setBusy(true); setIssue(''); try {
        await fn();
    }
    catch (e) {
        setIssue(errorText(e));
    }
    finally {
        setBusy(false);
    } };
    return { busy, issue, run };
}
export function Entry({ title, close, disabled, submit, button, hint, children }) {
    const { busy, issue, run } = useAction();
    return _jsxs(Dialog, { title: title, onClose: close, beforeClose: () => !busy, children: [hint && _jsx("p", { className: "cloud-form-help", children: hint }), issue && _jsx(Warning, { tone: "error", children: issue }), _jsxs("form", { className: "cloud-op-form", onSubmit: (e) => { e.preventDefault(); if (disabled || busy)
                    return; const data = new FormData(e.currentTarget); void run(() => submit(data)); }, children: [children, _jsx("button", { className: "button primary-button", type: "submit", disabled: busy || disabled, children: busy ? 'Saving…' : button })] })] });
}
export function MethodSelect({ label = 'Payment method', name = 'method', defaultValue = 'cash' }) {
    return _jsxs("label", { children: [label, _jsx("select", { "aria-label": label, name: name, defaultValue: defaultValue, children: methods.map(m => _jsx("option", { value: m.id, children: m.label }, m.id)) })] });
}
export function ProfileEntry({ current, branch, post, close }) {
    const [registered, setRegistered] = useState(current?.gst_mode === 'regular');
    return _jsxs(Entry, { title: "Shop and GST settings", close: close, button: "Save shop settings", hint: "Choose Retail receipt (No GST) only when it matches the shop’s actual registration and tax obligations. Choose Regular GST only for a registered shop; enter the correct GSTIN, invoice series, product HSN and rate. Confirm with your accountant before changing the tax mode.", submit: async (f) => {
            await post('profile', { legal_name: field(f, 'legal_name'), address: field(f, 'address'), gst_mode: registered ? 'regular' : 'retail', gstin: registered ? field(f, 'gstin') : null, series: registered ? field(f, 'series') : null, gst_reviewed: f.has('gst_reviewed'), expected_revision: current?.revision ?? 0 });
            close();
        }, children: [_jsxs("label", { children: ["Legal shop name", _jsx("input", { name: "legal_name", required: true, maxLength: 120, defaultValue: current?.legal_name ?? `Mobile Craft · ${branch.name}` })] }), _jsxs("label", { children: ["Shop address", _jsx("textarea", { name: "address", minLength: 4, maxLength: 300, required: true, defaultValue: current?.address ?? '' })] }), _jsxs("label", { children: ["GST mode", _jsxs("select", { "aria-label": "GST mode", value: registered ? 'regular' : 'retail', onChange: e => setRegistered(e.target.value === 'regular'), children: [_jsx("option", { value: "retail", children: "Retail receipt · GST not calculated" }), _jsx("option", { value: "regular", children: "Regular Kerala GST \u00B7 Goods" })] })] }), registered && _jsxs(_Fragment, { children: [_jsxs("div", { className: "cloud-form-columns", children: [_jsxs("label", { children: ["Kerala GSTIN", _jsx("input", { name: "gstin", required: true, minLength: 15, maxLength: 15, defaultValue: current?.gstin ?? '', spellCheck: false })] }), _jsxs("label", { children: ["Unique invoice series (2\u20133)", _jsx("input", { name: "series", required: true, minLength: 2, maxLength: 3, defaultValue: current?.series ?? '', spellCheck: false })] })] }), _jsxs("label", { className: "cloud-check", children: [_jsx("input", { name: "gst_reviewed", type: "checkbox", required: true }), " I checked the registration, series and goods tax settings with the accountant."] }), _jsx("small", { children: "Composition, reverse charge, cess, e-invoice/IRN, e-way bills, filing and verified input tax credit are not supported here. Series and tax ID lock after the first tax document." })] })] });
}
export function ProductEntry({ products, product, post, close, initialBarcode = '' }) {
    const [barcode, setBarcode] = useState(product?.barcode ?? initialBarcode ?? ''), [scan, setScan] = useState(false);
    return _jsxs(_Fragment, { children: [_jsxs(Entry, { title: product ? 'Edit selling price & GST' : 'Add product', close: close, button: "Save product", hint: product ? `${product.name} · ${product.sku}. To increase stock for an existing product, record a purchase.` : 'Opening stock is for new products. Later replenishment is recorded as a supplier purchase.', submit: async (f) => {
                    const hsn = field(f, 'hsn'), rate = field(f, 'rate'), price = rupees(field(f, 'price'));
                    if (!price)
                        throw Error('Enter a positive selling price.');
                    if (!product && barcode.trim() && !canRegisterBarcode(barcode))
                        throw Error('Enter a valid barcode or capture it with the scanner.');
                    if (!product && barcode.trim() && lookupBarcode(products, barcode).kind !== 'unknown')
                        throw Error('Barcode is already assigned to a product.');
                    if (Boolean(hsn) !== Boolean(rate))
                        throw Error('Enter both the correct HSN and GST rate for a Regular GST product, or leave both blank for a Retail product.');
                    await post('product', { id: product?.id ?? null, name: field(f, 'name'), sku: field(f, 'sku'), barcode: barcodeValue(barcode), price_pa: price, cost_pa: rupees(field(f, 'cost')),
                        qty: Number(field(f, 'qty')), minimum: Number(field(f, 'minimum')), hsn: hsn || null, gst_bps: rate ? rupees(rate) : null, price_includes_gst: field(f, 'basis') === 'inclusive',
                        expected_price_pa: product?.price_pa, expected_hsn: product?.hsn, expected_gst_bps: product?.gst_bps, expected_includes: product?.price_includes_gst });
                    close();
                }, children: [!product && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Product name", _jsx("input", { name: "name", required: true, maxLength: 90 })] }), _jsxs("div", { className: "cloud-form-columns", children: [_jsxs("label", { children: ["SKU", _jsx("input", { name: "sku", required: true, maxLength: 40 })] }), _jsxs("label", { children: ["Barcode", _jsxs("span", { className: "cloud-input-action", children: [_jsx("input", { name: "barcode", placeholder: "Generate if blank", maxLength: 48, value: barcode, onChange: e => setBarcode(e.target.value) }), _jsx("button", { className: "button", type: "button", "aria-label": "Capture product barcode", onClick: () => setScan(true), children: _jsx(ScanLine, { size: 16 }) })] })] })] }), _jsx("small", { className: "mc-form-tip", children: "ഒരേ product type-ന് ഒരേ barcode. Save ചെയ്ത ശേഷം barcode label print ചെയ്ത് product-ൽ ഒട്ടിക്കുക." }), _jsxs("div", { className: "cloud-form-columns", children: [_jsxs("label", { children: ["Opening units", _jsx("input", { name: "qty", type: "number", defaultValue: "0", min: "0", max: "1000000", step: "1", required: true })] }), _jsxs("label", { children: ["Low stock at", _jsx("input", { name: "minimum", type: "number", defaultValue: "1", min: "0", max: "1000000", step: "1", required: true })] }), _jsxs("label", { children: ["Unit opening cost \u20B9", _jsx("input", { name: "cost", required: true, inputMode: "decimal", defaultValue: "0.00", maxLength: 12 })] })] })] }), _jsxs("label", { children: ["Selling price \u20B9", _jsx("input", { name: "price", inputMode: "decimal", required: true, maxLength: 12, defaultValue: product ? rupeeInput(product.price_pa) : '' })] }), _jsxs("div", { className: "cloud-form-columns", children: [_jsxs("label", { children: ["HSN (optional in retail mode)", _jsx("input", { name: "hsn", inputMode: "numeric", maxLength: 8, defaultValue: product?.hsn ?? '' })] }), _jsxs("label", { children: ["GST rate %", _jsx("input", { name: "rate", inputMode: "decimal", maxLength: 5, defaultValue: product?.gst_bps != null ? rupeeInput(product.gst_bps) : '' })] })] }), _jsxs("label", { children: ["Price basis", _jsxs("select", { "aria-label": "Price basis", name: "basis", defaultValue: product?.price_includes_gst === false ? 'exclusive' : 'inclusive', children: [_jsx("option", { value: "inclusive", children: "GST included in list price" }), _jsx("option", { value: "exclusive", children: "GST added to list price" })] })] })] }), scan && _jsx(BarcodeScanner, { purpose: "Capture the product's packaging barcode.", onClose: () => setScan(false), confirm: true, onBarcode: r => { setBarcode(r.value); setScan(false); return { tone: 'success', title: 'Barcode captured' }; } })] });
}
export function OwnerDesk({ ctx, products, onProfile, onPurchase, onContact, onBackup, onSettle, onReceipt, blocked }) {
    const [query, setQuery] = useState('');
    const contacts = ctx.contacts ?? [], balances = ctx.balances ?? [], name = (b) => contacts.find(c => b.party_id === c.id)?.name ?? b.doc_label;
    const filtered = balances.filter(b => `${name(b)} ${b.doc_label}`.toLowerCase().includes(query.toLowerCase().trim()));
    const receivable = balances.filter(b => b.kind === 'receivable').reduce((sum, b) => sum + b.due_pa, 0), payable = balances.filter(b => b.kind === 'payable').reduce((sum, b) => sum + b.due_pa, 0);
    return _jsxs("section", { className: "cloud-owner", "aria-label": "Owner desk", children: [_jsxs("div", { className: "panel cloud-panel", children: [_jsxs("div", { className: "cloud-panel-head", children: [_jsxs("div", { children: [_jsx("h2", { children: "Owner desk" }), _jsx("p", { children: "Stock intake, customer balances, supplier payments and recovery." })] }), _jsxs("button", { className: "button", type: "button", onClick: onProfile, disabled: blocked, children: [_jsx(Settings2, { size: 16 }), " Shop and GST"] })] }), _jsxs("div", { className: "cloud-tools cloud-op-actions", children: [_jsxs("button", { className: "button primary-button", disabled: blocked || !products.length || !contacts.some(c => c.kind === 'supplier'), onClick: onPurchase, children: [_jsx(PackagePlus, { size: 16 }), " Receive purchase"] }), _jsxs("button", { className: "button", disabled: blocked, onClick: onContact, children: [_jsx(Plus, { size: 16 }), " Add customer or supplier"] }), _jsxs("button", { className: "button", disabled: blocked, onClick: onBackup, children: [_jsx(FileLock2, { size: 16 }), " Encrypted backup"] })] }), !contacts.some(c => c.kind === 'supplier') && _jsx("small", { children: "Add a supplier first to receive purchases. Create products in Stock & billing." }), _jsxs("p", { className: "cloud-hint", children: [ctx.profile ? `${ctx.profile.legal_name} · ${ctx.profile.gst_mode === 'regular' ? 'Regular GST' : 'Retail receipts'}` : 'Shop settings must be saved before checkout.', " \u00B7 ", contacts.length, " customer/supplier records"] })] }), _jsxs("div", { className: "cloud-owner-grid", children: [_jsxs("section", { className: "panel cloud-panel", children: [_jsxs("div", { className: "cloud-panel-head", children: [_jsxs("div", { children: [_jsx("h2", { children: "Open balances" }), _jsxs("p", { children: ["Receivable ", inr(receivable), " \u00B7 Payable ", inr(payable)] })] }), _jsx(Wallet, { size: 19 })] }), _jsxs("label", { className: "cloud-op-form", children: ["Find a balance", _jsx("input", { "aria-label": "Find a balance", value: query, onChange: e => setQuery(e.target.value), placeholder: "Name or document reference" })] }), _jsxs("div", { className: "cloud-op-list", children: [filtered.map(b => _jsxs("div", { children: [_jsxs("span", { children: [_jsxs("b", { children: [name(b), " \u00B7 ", inr(b.due_pa)] }), _jsxs("small", { children: [b.kind === 'receivable' ? 'Customer' : 'Supplier', " \u00B7 ", b.doc_label] })] }), _jsx("button", { className: "button", disabled: blocked, "aria-label": `${b.kind === 'receivable' ? 'Collect' : 'Pay'} ${b.doc_label}`, onClick: () => onSettle(b), children: b.kind === 'receivable' ? 'Collect' : 'Pay' })] }, b.id)), !filtered.length && _jsx("p", { children: "No open balances to show." })] })] }), _jsxs("section", { className: "panel cloud-panel", children: [_jsxs("div", { className: "cloud-panel-head", children: [_jsxs("div", { children: [_jsx("h2", { children: "Recent operations" }), _jsx("p", { children: "Purchases, returns, collections and supplier payments." })] }), _jsx(ReceiptText, { size: 19 })] }), _jsxs("div", { className: "cloud-op-list", children: [(ctx.activity ?? []).map(a => _jsxs("div", { children: [_jsxs("span", { children: [_jsxs("b", { children: [a.result.label ?? a.result.number ?? a.kind, " \u00B7 ", inr(a.result.total_pa ?? 0)] }), _jsxs("small", { children: [a.kind.replace('_', ' '), " \u00B7 ", when(a.at)] })] }), a.kind === 'return' && _jsx("button", { className: "button", onClick: () => onReceipt(a.result), children: "View note" })] }, a.request_id)), !ctx.activity?.length && _jsx("p", { children: "No operations yet." })] })] })] })] });
}
export function ContactEntry({ post, close }) {
    return _jsxs(Entry, { title: "Add customer or supplier", close: close, button: "Save contact", hint: "The contact name identifies balances in this shop. No email or message is sent.", submit: async (f) => { await post('contact', { name: field(f, 'name'), kind: field(f, 'kind') }); close(); }, children: [_jsxs("label", { children: ["Contact type", _jsxs("select", { "aria-label": "Contact type", name: "kind", children: [_jsx("option", { value: "customer", children: "Customer" }), _jsx("option", { value: "supplier", children: "Supplier" })] })] }), _jsxs("label", { children: ["Contact name", _jsx("input", { name: "name", required: true, maxLength: 100 })] })] });
}
const line = () => ({ key: crypto.randomUUID(), id: '', qty: '1', cost: '' });
export function PurchaseEntry({ products, suppliers, post, close }) {
    const [rows, setRows] = useState(() => [line()]), [paid, setPaid] = useState('0.00'), [scanner, setScanner] = useState(false);
    const scan = (code) => {
        const m = lookupBarcode(products, code);
        if (m.kind !== 'found')
            return lookupFeedback(m.kind);
        const id = m.product.id, available = 1_000_000 - m.product.qty, existing = rows.find(r => r.id === id), empty = rows.find(r => !r.id);
        const q = existing ? Number(existing.qty) + 1 : 1;
        if (!Number.isSafeInteger(q) || q < 1 || q > available)
            return { tone: 'warning', title: 'Check purchase quantity', detail: m.product.name };
        if (!existing && !empty && rows.length >= 100)
            return { tone: 'warning', title: 'Purchase limit reached' };
        setRows(prev => { const row = prev.find(r => r.id === id), blank = prev.find(r => !r.id); if (row)
            return prev.map(r => r.key === row.key ? { ...r, qty: String(Math.min(Number(r.qty) + 1, available)) } : r); if (blank)
            return prev.map(r => r.key === blank.key ? { ...r, id, qty: '1' } : r); return prev.length >= 100 ? prev : [...prev, { ...line(), id }]; });
        return { tone: 'success', title: 'Added to purchase', detail: `${m.product.name} · ${q} units` };
    };
    const update = (key, patch) => setRows(old => old.map(x => x.key === key ? { ...x, ...patch } : x));
    let total = 0, paidPa = 0, valid = true;
    try {
        for (const x of rows) {
            const q = Number(x.qty);
            if (!Number.isInteger(q) || q < 1 || q > 1_000_000) {
                valid = false;
                break;
            }
            total += q * rupees(x.cost);
            if (total > billLimit) {
                valid = false;
                break;
            }
        }
        paidPa = rupees(paid);
        if (paidPa > total)
            valid = false;
    }
    catch {
        valid = false;
    }
    return _jsxs(_Fragment, { children: [_jsxs(Entry, { title: "Receive purchase", close: close, button: "Post purchase", disabled: !valid, hint: "Use landed unit cost (including nonrecoverable charges). This adds inventory and records paid amounts and supplier balance; it does not claim GST input credit.", submit: async (f) => {
                    if (new Set(rows.map(x => x.id)).size !== rows.length || rows.some(x => !x.id || !x.cost.trim()))
                        throw Error('Select a distinct product and enter the unit cost on every line.');
                    if (!confirm(`Post ${inr(total)} · paid ${inr(paidPa)} · supplier due ${inr(total - paidPa)}?`))
                        return;
                    await post('purchase', { supplier_id: field(f, 'supplier'), reference: field(f, 'reference'), items: rows.map(x => ({ product_id: x.id, qty: Number(x.qty), unit_cost_pa: rupees(x.cost) })), method: field(f, 'method'), total_pa: total, paid_pa: paidPa });
                    close();
                }, children: [_jsxs("div", { className: "cloud-form-columns", children: [_jsxs("label", { children: ["Supplier", _jsxs("select", { "aria-label": "Supplier", name: "supplier", required: true, defaultValue: "", children: [_jsx("option", { value: "", disabled: true, children: "Choose supplier" }), suppliers.map(s => _jsx("option", { value: s.id, children: s.name }, s.id))] })] }), _jsxs("label", { children: ["Supplier invoice / reference", _jsx("input", { name: "reference", required: true, maxLength: 70 })] })] }), _jsxs("button", { className: "button", type: "button", onClick: () => setScanner(true), children: [_jsx(ScanLine, { size: 16 }), " Scan purchase barcode"] }), rows.map((x, i) => _jsxs("fieldset", { className: "cloud-line-form", children: [_jsxs("legend", { children: ["Purchase line ", i + 1] }), _jsxs("label", { children: ["Product", _jsxs("select", { "aria-label": "Product", value: x.id, required: true, onChange: e => update(x.key, { id: e.target.value }), children: [_jsx("option", { value: "", children: "Select product" }), products.filter(p => p.active).map(p => _jsxs("option", { value: p.id, children: [p.name, " \u00B7 ", p.sku] }, p.id))] })] }), _jsxs("div", { className: "cloud-form-columns", children: [_jsxs("label", { children: ["Units", _jsx("input", { type: "number", step: "1", min: "1", max: "1000000", required: true, value: x.qty, onChange: e => update(x.key, { qty: e.target.value }) })] }), _jsxs("label", { children: ["Unit landed cost \u20B9", _jsx("input", { required: true, inputMode: "decimal", value: x.cost, onChange: e => update(x.key, { cost: e.target.value }) })] })] }), rows.length > 1 && _jsxs("button", { className: "button", type: "button", onClick: () => setRows(prev => prev.filter(y => y.key !== x.key)), children: ["Remove line ", i + 1] })] }, x.key)), _jsxs("button", { className: "button", type: "button", disabled: rows.length >= 100, onClick: () => setRows(prev => [...prev, line()]), children: [_jsx(Plus, { size: 16 }), " Add purchase line"] }), _jsxs("div", { className: "cloud-form-columns", children: [_jsx(MethodSelect, {}), _jsxs("label", { children: ["Paid now \u20B9", _jsx("input", { name: "paid", inputMode: "decimal", value: paid, onChange: e => setPaid(e.target.value) })] })] }), _jsxs("div", { className: "cloud-op-summary", children: [_jsx("b", { children: valid ? inr(total) : 'Check amounts' }), _jsxs("span", { children: ["Supplier due ", valid ? inr(total - paidPa) : '—'] })] })] }), scanner && _jsx(BarcodeScanner, { title: "Scan purchase barcode", purpose: "Scan a registered product into this purchase draft.", onClose: () => setScanner(false), onBarcode: r => scan(r.value) })] });
}
export function SettlementEntry({ balance, post, close }) {
    const customer = balance.kind === 'receivable';
    return _jsxs(Entry, { title: customer ? 'Record customer collection' : 'Record supplier payment', close: close, button: customer ? 'Record collection' : 'Record payment', hint: `${balance.doc_label} · remaining ${inr(balance.due_pa)}. This records a payment already made; it does not move money.`, submit: async (f) => {
            const amount = rupees(field(f, 'amount'));
            if (!amount || amount > balance.due_pa)
                throw Error('Enter an amount within the remaining balance.');
            await post(customer ? 'collection' : 'supplier_payment', { document_id: balance.id, amount_pa: amount, method: field(f, 'method') });
            close();
        }, children: [_jsxs("label", { children: ["Payment amount \u20B9", _jsx("input", { name: "amount", maxLength: 12, inputMode: "decimal", defaultValue: rupeeInput(balance.due_pa), required: true })] }), _jsx(MethodSelect, {})] });
}
export function ReturnEntry({ sb, branch, receipt, post, onDone, close, locations = [] }) {
    const [previous, setPrevious] = useState(null), [issue, setIssue] = useState(''), [selected, setSelected] = useState({});
    useEffect(() => { let live = true; void returnStatus(sb, branch.id, receipt.id).then(x => { if (live)
        setPrevious(x); }).catch(e => { if (live)
        setIssue(errorText(e)); }); return () => { live = false; }; }, [sb, branch.id, receipt.id]);
    let amount = 0, valid = Boolean(previous), count = 0;
    if (previous)
        try {
            for (const l of receipt.lines) {
                const q = Number(selected[l.product_id]?.qty ?? 0);
                if (!q)
                    continue;
                count += q;
                amount += taxTotal(returnSlice({ net_pa: l.net_pa ?? l.total_pa, cgst_pa: l.cgst_pa ?? 0, sgst_pa: l.sgst_pa ?? 0, igst_pa: l.igst_pa ?? 0 }, l.qty, previous.returned[l.product_id] ?? { qty: 0, ...zeroTax() }, q));
            }
        }
        catch {
            valid = false;
        }
    const credit = Math.min(amount, previous?.due_pa ?? 0), refund = amount - credit, enhanced = locations.length > 0;
    return _jsxs(Entry, { title: `Return items · ${receipt.number}`, close: close, button: "Post return", disabled: !valid || count < 1, hint: "Return against the original sale. Only sellable items are restocked; record other conditions separately. Refund amounts are recorded, not sent.", submit: async (f) => {
            if (!valid || !count)
                throw Error('Select valid return quantities.');
            const items = receipt.lines.filter(l => Number(selected[l.product_id]?.qty) > 0).map(l => { const row = selected[l.product_id]; return { product_id: l.product_id, qty: Number(row.qty), restocked: row.condition === 'resellable', ...(enhanced ? { condition: row.condition } : {}) }; });
            if (!confirm(`Record ${inr(refund)} refund and ${inr(credit)} credit reduction?`))
                return;
            onDone(await post('return', { sale_id: receipt.id, reason: field(f, 'reason'), method: field(f, 'method'), items, expected_credit_pa: credit, expected_refund_pa: refund, ...(enhanced ? { inventory_location: field(f, 'location') } : {}) }));
        }, children: [enhanced && _jsxs("label", { children: ["Return location", _jsx("select", { name: "location", required: true, defaultValue: locations.find(l => l.id === receipt.inventory_location)?.id ?? locations[0].id, children: locations.map(l => _jsx("option", { value: l.id, children: l.name }, l.id)) })] }), issue ? _jsx(Warning, { tone: "error", children: issue }) : !previous ? _jsx("p", { role: "status", children: "Checking earlier returns and credit\u2026" }) : receipt.lines.map(l => {
                const left = l.qty - (previous.returned[l.product_id]?.qty ?? 0), state = selected[l.product_id] ?? { qty: '0', condition: 'resellable' };
                const set = (next) => setSelected(prev => ({ ...prev, [l.product_id]: { ...state, ...next } }));
                return _jsxs("fieldset", { className: "cloud-line-form", children: [_jsxs("legend", { children: [l.name, " \u00B7 ", left, " returnable"] }), _jsxs("div", { className: "cloud-form-columns", children: [_jsxs("label", { children: ["Return units ", l.name, _jsx("input", { type: "number", min: "0", max: left, step: "1", value: state.qty, disabled: !left, onChange: e => set({ qty: e.target.value }) })] }), _jsxs("label", { children: ["Condition", _jsxs("select", { "aria-label": "Condition", value: state.condition, disabled: !left, onChange: e => set({ condition: e.target.value }), children: [_jsx("option", { value: "resellable", children: "Sellable \u00B7 restock" }), _jsx("option", { value: "damaged", children: "Damaged \u00B7 no restock" }), enhanced && _jsxs(_Fragment, { children: [_jsx("option", { value: "defective", children: "Defective \u00B7 no restock" }), _jsx("option", { value: "warranty", children: "Warranty \u00B7 no restock" })] })] })] })] })] }, l.product_id);
            }), _jsxs("label", { children: ["Return reason", _jsx("input", { name: "reason", required: true, maxLength: 160 })] }), _jsx(MethodSelect, { label: "Refund method" }), _jsxs("div", { className: "cloud-op-summary", children: [_jsxs("b", { children: ["Refund ", inr(refund)] }), _jsxs("span", { children: ["Credit reduction ", inr(credit)] })] })] });
}
export function ExportEntry({ sb, branch, close }) {
    const [automatic, setAutomatic] = useState(false), [r2Ready, setR2Ready] = useState(null);
    const [r2List, setR2List] = useState([]), [r2Issue, setR2Issue] = useState(''), [r2Busy, setR2Busy] = useState(false);
    const refreshR2 = async () => {
        if (r2Busy) return;
        setR2Busy(true); setR2Issue('');
        try {
            await checkR2BackupWorker();
            const result = await listR2Backups(sb, branch);
            setR2Ready(true); setR2List(result.backups ?? []);
        } catch (e) { setR2Ready(false); setR2Issue(errorText(e)); }
        finally { setR2Busy(false); }
    };
    return _jsxs(Entry, { title: "Encrypted shop backup", close: close, button: automatic ? "Enable daily R2 backup + upload now" : "Download encrypted snapshot", hint: "The snapshot is encrypted before storage. Keep the passphrase separately. This is a branch data snapshot, not a full Supabase Auth or schema backup.", submit: async (f) => {
            const pw = String(f.get('pass') ?? '');
            if (pw !== String(f.get('again'))) throw Error('Passphrases do not match.');
            if (automatic) {
                const uploaded = await enableAndUploadR2(sb, branch, pw);
                close();
                return uploaded;
            }
            const { data, error } = await sb.rpc('mc_export_branch', { p_branch: branch.id }).abortSignal(AbortSignal.timeout(120000));
            if (error || data?.format !== 'mobile-craft-cloud-branch/2') throw Error('Could not prepare the shop snapshot.');
            await download(await seal(pw, data), `mobile-craft-${branch.slug}-${new Date().toISOString().slice(0, 10)}.encrypted.json`);
            close();
        }, children: [
            _jsxs("label", { children: ["Backup passphrase", _jsx("input", { type: "password", name: "pass", required: true, minLength: 12, maxLength: 256, autoComplete: "new-password" })] }),
            _jsxs("label", { children: ["Repeat passphrase", _jsx("input", { type: "password", name: "again", required: true, minLength: 12, maxLength: 256, autoComplete: "new-password" })] }),
            _jsxs("label", { className: "inv-check", children: [_jsx("input", { type: "checkbox", checked: automatic, onChange: e => setAutomatic(e.target.checked) }), " Enable automatic daily encrypted R2 backup on this device"] }),
            _jsx("p", { className: "cloud-form-help", children: "Daily backup runs when the owner opens this POS browser and it is online. The passphrase is not saved; a non-exportable encryption key is stored in this browser's IndexedDB. R2 Worker and private bucket must be deployed first." }),
            _jsxs("div", { className: "cloud-tools cloud-op-actions", children: [
                _jsx("button", { type: "button", className: "button", disabled: r2Busy, onClick: () => void refreshR2(), children: r2Busy ? "Checking R2…" : "Check R2 backups" }),
                r2List.length > 0 && _jsx("button", { type: "button", className: "button", disabled: r2Busy, onClick: () => void downloadR2Backup(sb, branch, r2List[0].key).catch(e => setR2Issue(errorText(e))), children: "Download latest R2 backup" })
            ] }),
            r2Issue && _jsx(Warning, { tone: "error", children: r2Issue }),
            r2Ready && _jsx("p", { role: "status", className: "cloud-scan-note", children: `${r2List.length} encrypted R2 backup(s) available. Downloaded snapshots can be checked with Verify backup file; this does not restore the live database.` }),
        ] });
}
