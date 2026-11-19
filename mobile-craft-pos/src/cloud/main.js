import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "/vendor/react-jsx-runtime.js";
import { StrictMode, useEffect, useMemo, useRef, useState } from '/vendor/react.js';
import { createRoot } from '/vendor/react-dom-client.js';
import { ArrowRight, Building2, Cloud, Database, FileDown, LockKeyhole, LogOut, Moon, Package, Plus, Printer, RefreshCw, ScanLine, Share2, ShieldCheck, Smartphone, Store, Sun, WifiOff, Settings2 } from '/vendor/lucide-react.js';
import { Dialog } from '../components/Controls.js';
import { BarcodeScanner } from '../pos/BarcodeScanner.js';
import { barcodeValue, lookupBarcode } from '../pos/barcode-match.js';
import { lookupFeedback } from '../pos/barcode.js';
import { Warning, inr } from '../pos/ui.js';
import { BarcodeGraphic, PrintPortal, printDocument } from '../pos/printing.js';
import { branches, client, context, draftStatus, errorText as msg, methods, readPending, resolvePending, rupees, stock, submit, when } from './api.js';
import { billLimit, quoteLine, taxTotal, zeroTax } from './amounts.js';
import { BackupViewer, OfflineNotebook } from './Offline.js';
import { AccountsPage, ExpensesPage, InvoiceRegister, Overview, PartiesPage, ProductsPage, PurchasesPage, ReportsPage, SettingsSummary, WorkspaceMenu } from './BusinessPages.js';
import { PartyForm } from './BusinessForms.js';
import { InventoryMenu, InventoryView, OpenedSource } from './inventory/Workspace.js';
import { ItemDetails, ItemEntry } from './inventory/Catalogue.js';
import { conditions, useInv, Wait } from './inventory/core.js';
import { OfflineQueue } from './inventory/OfflineQueue.js';
import { TestModePanel } from './TestModePanel.js';
import { createReceiptPdf, downloadReceiptPdf, shareReceiptPdf } from './receipt-pdf.js';
import { ContactEntry, ExportEntry, OwnerDesk, ProductEntry, ProfileEntry, PurchaseEntry, ReturnEntry, SettlementEntry } from './StoreForms.js';





const release = '3.2.4';
const webRelease = "1" === '1';
const blankPay = () => ({ cash: '', upi: '', card: '', bank: '' });
const states = [['32', 'Kerala'], ['33', 'Tamil Nadu'], ['29', 'Karnataka'], ['36', 'Telangana'], ['37', 'Andhra Pradesh'], ['27', 'Maharashtra'], ['07', 'Delhi'], ['01', 'Jammu and Kashmir'], ['02', 'Himachal Pradesh'], ['03', 'Punjab'], ['04', 'Chandigarh'], ['05', 'Uttarakhand'], ['06', 'Haryana'], ['08', 'Rajasthan'], ['09', 'Uttar Pradesh'], ['10', 'Bihar'], ['11', 'Sikkim'], ['12', 'Arunachal Pradesh'], ['13', 'Nagaland'], ['14', 'Manipur'], ['15', 'Mizoram'], ['16', 'Tripura'], ['17', 'Meghalaya'], ['18', 'Assam'], ['19', 'West Bengal'], ['20', 'Jharkhand'], ['21', 'Odisha'], ['22', 'Chhattisgarh'], ['23', 'Madhya Pradesh'], ['24', 'Gujarat'], ['26', 'Dadra and Nagar Haveli and Daman and Diu'], ['30', 'Goa'], ['31', 'Lakshadweep'], ['34', 'Puducherry'], ['35', 'Andaman and Nicobar Islands'], ['38', 'Ladakh']];
const stateLabel = (code) => `${states.find(([id]) => id === code)?.[1] ?? 'State'} (${code})`;
const asReceipt = (r) => Boolean(r.branch && r.number && r.posted_at && Array.isArray(r.lines) && r.payments);
if (webRelease && 'serviceWorker' in navigator && window.isSecureContext)
    void navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' }).catch(() => { });
function Auth() {
    const [session, setSession] = useState(null), [pending, setPending] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const [offlineOpen, setOfflineOpen] = useState(false), [backupOpen, setBackupOpen] = useState(false), [queueOpen, setQueueOpen] = useState(false);
    const [dark, setDark] = useState(() => { try {
        return localStorage.getItem('mc-theme') === 'dark';
    }
    catch {
        return false;
    } });
    useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; try {
        localStorage.setItem('mc-theme', dark ? 'dark' : 'light');
    }
    catch { /* optional */ } }, [dark]);
    useEffect(() => {
        if (!client) {
            setPending(false);
            return;
        }
        const { data: { subscription } } = client.auth.onAuthStateChange((_e, next) => { setSession(next); setPending(false); });
        return () => subscription.unsubscribe();
    }, []);
    const signIn = async (e) => {
        e.preventDefault();
        if (!client || busy)
            return;
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError('');
        try {
            const result = await client.auth.signInWithPassword({ email: String(f.get('email')).trim(), password: String(f.get('password')) });
            if (result.error)
                setError('Could not sign in. Check your email and password, or contact the branch owner.');
        }
        catch {
            setError('Could not reach sign-in. Check your internet connection.');
        }
        finally {
            setBusy(false);
        }
    };
    const signOut = async () => { if (!client || busy)
        return; setBusy(true); setError(''); try {
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error)
            setError('Sign-out could not finish. Try again or close this tab.');
    }
    catch {
        setError('Sign-out could not finish. Try again or close this tab.');
    }
    finally {
        setBusy(false);
    } };
    return _jsxs("div", { className: "cloud-wrap", children: [_jsxs("header", { className: "cloud-header", children: [_jsxs("div", { className: "cloud-brand", children: [_jsx("span", { children: _jsx(Store, { size: 21 }) }), _jsxs("div", { children: [_jsx("strong", { children: "Mobile Craft" }), _jsx("small", { children: "Retail workspace" })] })] }), _jsxs("div", { className: "cloud-tools", children: [_jsxs("span", { className: "cloud-badge", children: [_jsx("i", {}), webRelease ? 'Online POS' : 'Setup preview'] }), _jsx("button", { type: "button", className: "icon-button", "aria-label": dark ? 'Switch to light mode' : 'Switch to dark mode', onClick: () => setDark(!dark), children: dark ? _jsx(Sun, { size: 17 }) : _jsx(Moon, { size: 17 }) }), session && _jsxs("button", { type: "button", className: "button", disabled: busy, onClick: () => void signOut(), children: [_jsx(LogOut, { size: 15 }), " Sign out"] })] })] }), _jsx("main", { className: "cloud-main", children: pending ? _jsx("p", { role: "status", children: "Opening workspace\u2026" }) : session && client ? _jsxs(_Fragment, { children: [_jsx(SessionView, { sb: client, session: session }, session.user.id), error && _jsx(Warning, { tone: "error", children: error })] }) : _jsxs("section", { className: "cloud-login-layout", children: [_jsxs("div", { className: "cloud-login-intro", children: [_jsxs("span", { className: "cloud-eyebrow", children: [_jsx(Cloud, { size: 16 }), " MOBILE CRAFT ONLINE"] }), _jsxs("h1", { children: ["Your shop.", _jsx("br", {}), "One stock book."] }), _jsx("p", { children: "Sign in to check stock, scan products and ring up sales at your shop." }), _jsxs("ul", { children: [_jsxs("li", { children: [_jsx(Building2, { size: 17 }), " Your shop\u2019s stock and receipts"] }), _jsxs("li", { children: [_jsx(ShieldCheck, { size: 17 }), " Separate owner and staff access"] }), _jsxs("li", { children: [_jsx(Smartphone, { size: 17 }), " Desktop and Android browser"] })] })] }), _jsxs("section", { className: "panel cloud-login-card", "aria-label": "Sign in", children: [_jsx("span", { className: "cloud-login-lock", children: _jsx(LockKeyhole, { size: 20 }) }), _jsx("h2", { children: "Sign in to Mobile Craft" }), _jsx("p", { children: "Use the owner or staff account set up for your shop." }), !client ? _jsx(Warning, { children: "Cloud configuration is missing. See the setup guide for the public project URL and publishable key." }) : _jsxs("form", { onSubmit: e => void signIn(e), children: [_jsxs("label", { children: ["Email address", _jsx("input", { name: "email", type: "email", autoComplete: "username", maxLength: 254, required: true, placeholder: "you@example.com" })] }), _jsxs("label", { children: ["Password", _jsx("input", { name: "password", type: "password", autoComplete: "current-password", maxLength: 256, required: true, placeholder: "Enter your password" })] }), error && _jsx(Warning, { tone: "error", children: error }), _jsxs("button", { type: "submit", className: "button primary-button", disabled: busy, children: [busy ? 'Signing in…' : 'Sign in', _jsx(ArrowRight, { size: 17 })] })] }), _jsx("small", { children: "Accounts are created by a shop administrator. No public signup." }), _jsxs("div", { className: "cloud-login-actions", children: [_jsxs("button", { className: "button", type: "button", onClick: () => setOfflineOpen(true), children: [_jsx(WifiOff, { size: 16 }), " Offline counter"] }), _jsxs("button", { className: "button", type: "button", onClick: () => setQueueOpen(true), children: [_jsx(WifiOff, { size: 16 }), " Offline queue"] }), _jsx("button", { className: "button", type: "button", onClick: () => setBackupOpen(true), children: "Verify backup file" })] })] })] }) }), _jsxs("footer", { className: "cloud-footer", children: [_jsx(Database, { size: 14 }), " ", webRelease ? 'Account access only · Internet required for posting' : 'Setup preview · No real billing here'] }), offlineOpen && _jsx(OfflineNotebook, { close: () => setOfflineOpen(false) }), queueOpen && _jsx(OfflineQueue, { close: () => setQueueOpen(false) }), backupOpen && _jsx(BackupViewer, { close: () => setBackupOpen(false) })] });
}
function SessionView({ sb, session }) {
    const [list, setList] = useState([]), [chosen, setChosen] = useState(''), [issue, setIssue] = useState(''), [loading, setLoading] = useState(true), [nonce, bump] = useState(0);
    const [guard, setGuard] = useState(false);
    useEffect(() => { let current = true; void branches(sb).then(data => { if (!current)
        return; setList(data); setChosen(before => data.some(b => b.id === before) ? before : data[0]?.id ?? ''); setIssue(''); }).catch(e => { if (current) {
        setList([]);
        setIssue(msg(e));
    } }).finally(() => { if (current)
        setLoading(false); }); return () => { current = false; }; }, [sb, nonce]);
    const branch = list.find(b => b.id === chosen);
    return _jsxs(_Fragment, { children: [_jsxs("div", { className: "cloud-heading", children: [_jsxs("div", { children: [_jsxs("span", { className: "cloud-eyebrow", children: [_jsx(Building2, { size: 15 }), " STORE WORKSPACE"] }), _jsx("h1", { children: branch?.name ?? 'Shop access' }), _jsx("p", { children: branch ? `${branch.role === 'owner' ? 'Owner' : 'Staff'} access · ${session.user.email ?? 'Signed in'}` : loading ? 'Checking the shops assigned to your account.' : 'Access is limited to the shops assigned by an administrator.' })] }), list.length > 1 && _jsxs("label", { className: "cloud-select", children: ["Branch", _jsxs("select", { "aria-label": "Branch", value: chosen, onChange: e => {
                                    if (guard && !confirm('Leave the current cart? Unconfirmed checkout requests remain saved under this branch.'))
                                        return;
                                    setChosen(e.target.value);
                                    setGuard(false);
                                }, children: [_jsx("option", { value: "", disabled: true, children: "Select branch" }), list.map(b => _jsx("option", { value: b.id, children: b.name }, b.id))] })] })] }), loading ? _jsx("p", { role: "status", children: "Checking branch access\u2026" }) : issue ? _jsxs(_Fragment, { children: [_jsx(Warning, { tone: "error", children: issue }), _jsx("button", { className: "button", onClick: () => { setLoading(true); bump(n => n + 1); }, children: "Retry access" })] }) : !branch ? _jsx(Warning, { children: "No branch access yet. An administrator must link this account to a branch before it can view stock." }) : _jsx(BranchView, { sb: sb, branch: branch, actor: session.user.id, setGuard: setGuard }, branch.id)] });
}
function BranchView({ sb, branch, actor, setGuard }) {
    const [products, setProducts] = useState(null), [ctx, setCtx] = useState(null), [synced, setSynced] = useState(''), [issue, setIssue] = useState(''), [term, setTerm] = useState('');
    const [cart, setCart] = useState({}), [pay, setPay] = useState(blankPay), [scanFeedback, setScanFeedback] = useState(null), [receipt, setReceipt] = useState(null);
    const [quoted, setQuoted] = useState({});
    const [customer, setCustomer] = useState(''), [pos, setPos] = useState('32'), [buyer, setBuyer] = useState({ name: '', gstin: '', address: '' }), [imported, setImported] = useState(null);
    const [busy, setBusy] = useState(false), [postingIssue, setPostingIssue] = useState(''), [notice, setNotice] = useState(''), [pending, setPending] = useState(null), [storageIssue, setStorageIssue] = useState('');
    const [tab, setTab] = useState(branch.role === 'owner' ? 'overview' : 'stock'), [intent, setIntent] = useState({ key: 0 }), [source, setSource] = useState(null);
    const [counterAt, setCounterAt] = useState(''), startupRoute = useRef(false);
    const go = (v, args) => { setTab(`inv-${v}`); setIntent(p => ({ key: p.key + 1, args })); };
    const choose = (t) => { setIntent(p => ({ key: p.key + 1 })); setTab(t); };
    const [scanner, setScanner] = useState(false), [label, setLabel] = useState(null), [edit, setEdit] = useState(null), [modal, setModal] = useState(null), [balance, setBalance] = useState(null), [returning, setReturning] = useState(null);
    const [tick, setTick] = useState(0), [online, setOnline] = useState(navigator.onLine);
    const writing = useRef(false), k = `mc-shop-request-v2:${actor}:${branch.id}`;
    const owner = branch.role === 'owner', profile = ctx?.profile, regular = profile?.gst_mode === 'regular', menuReady = ctx?.menu_version === 1, inventoryReady = menuReady && ctx?.inventory_version === 1;
    const readScope = { sb, branch, tick, online };
    const locations = ctx?.inventory_locations ?? [], location = locations.find(l => l.id === counterAt) ?? locations[0];
    const meta = useInv(readScope, 'meta', {}, inventoryReady);
    const slots = useInv(readScope, 'pos_location', { location_id: location?.id }, inventoryReady && !!location);
    const posReady = !inventoryReady || Boolean(slots.data);
    const counterProducts = useMemo(() => !inventoryReady ? products ?? [] : (products ?? []).map(p => ({ ...p, qty: slots.data?.[p.id] ?? 0 })), [inventoryReady, products, slots.data]);
    // A periodic reload must not silently turn a reviewed price/payment into a new quote or credit.
    const quoteStamp = (p) => JSON.stringify([profile?.revision ?? 0, p.price_pa, ...(regular ? [p.hsn, p.gst_bps, p.price_includes_gst] : [])]);
    const updatePending = () => { try {
        setPending(readPending(k));
        setStorageIssue('');
    }
    catch (e) {
        setStorageIssue(msg(e));
    } };
    useEffect(() => {
        updatePending();
        const update = (e) => { if (!e.key || e.key === k)
            updatePending(); };
        window.addEventListener('storage', update);
        return () => window.removeEventListener('storage', update);
    }, [k]);
    const units = Object.values(cart).reduce((s, q) => s + q, 0);
    useEffect(() => { setGuard(units > 0 || pending !== null || busy); return () => setGuard(false); }, [units, pending, busy, setGuard]);
    useEffect(() => {
        const refresh = () => { setOnline(navigator.onLine); if (navigator.onLine)
            setTick(n => n + 1); };
        const interval = window.setInterval(() => { if (!document.hidden && navigator.onLine)
            setTick(n => n + 1); }, 30000);
        window.addEventListener('online', refresh);
        window.addEventListener('offline', refresh);
        return () => { clearInterval(interval); window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh); };
    }, []);
    useEffect(() => {
        if (!online)
            return;
        let current = true;
        void Promise.all([stock(sb, branch.id), context(sb, branch.id)]).then(([p, c]) => { if (current) {
            setProducts(p);
            setCtx(c);
            setSynced(when(new Date().toISOString()));
            setIssue('');
            if (c.inventory_version === 1 && !startupRoute.current) {
                startupRoute.current = true;
                setTab(t => owner && t === 'overview' ? 'inv-dashboard' : t);
            }
        } }).catch(e => { if (current)
            setIssue(msg(e)); });
        return () => { current = false; };
    }, [sb, branch.id, tick, online, owner]);
    const recordImpl = async (kind, payload, id = crypto.randomUUID(), exactReplay = false) => {
        if (!online || writing.current || storageIssue || issue)
            throw Error('Reconnect, refresh the shop and resolve any saved request before posting.');
        writing.current = true;
        setBusy(true);
        setPostingIssue('');
        setNotice('');
        try {
            const r = await submit(sb, k, branch.id, { id, kind }, payload, exactReplay);
            setTick(n => n + 1);
            setNotice(r.label ? `${r.label} · recorded` : 'Saved in this shop.');
            return r;
        }
        finally {
            writing.current = false;
            setBusy(false);
            updatePending();
        }
    };
    const record = (kind, payload, id) => recordImpl(kind, payload, id);
    const clearSale = () => { setCart({}); setQuoted({}); setImported(null); setPay(blankPay()); setCustomer(''); setBuyer({ name: '', gstin: '', address: '' }); setScanFeedback(null); };
    const resolve = async () => {
        if (!pending || writing.current || !online)
            return;
        writing.current = true;
        setBusy(true);
        setPostingIssue('');
        setNotice('');
        try {
            const r = await resolvePending(sb, k, branch.id, pending);
            if (r) {
                setNotice('Already recorded. No second transaction was posted.');
                if (asReceipt(r))
                    setReceipt(r);
                if (pending.kind === 'sale')
                    clearSale();
            }
            else {
                setNotice('Not posted. This request ID is closed; review before starting a new operation.');
                if (pending.kind === 'sale')
                    setImported(null);
            }
            setTick(n => n + 1);
        }
        catch (e) {
            setPostingIssue(msg(e));
        }
        finally {
            writing.current = false;
            setBusy(false);
            updatePending();
        }
    };
    const fenceQueued = async (j) => {
        if (!online || writing.current || storageIssue)
            throw Error('Reconnect and resolve the counter before closing this ID.');
        writing.current = true;
        setBusy(true);
        try {
            const r = await resolvePending(sb, k, branch.id, { id: j.id, kind: 'sale' }, true);
            setTick(n => n + 1);
            return r;
        }
        finally {
            writing.current = false;
            setBusy(false);
            updatePending();
        }
    };
    const blocked = busy || Boolean(pending) || Boolean(storageIssue) || Boolean(issue) || !online;
    const add = (p) => {
        if (blocked || !posReady)
            return { tone: 'warning', title: 'Online cart unavailable', detail: 'Use Offline counter to save a draft, or resolve the pending request.' };
        if (!p.active || p.qty < 1 || (cart[p.id] ?? 0) >= p.qty)
            return { tone: 'warning', title: 'Item not added', detail: `${p.name} · ${p.active ? `${p.qty} available` : 'Inactive'}` };
        if (Object.keys(cart).length >= 100 && !cart[p.id])
            return { tone: 'warning', title: 'This sale already has 100 lines' };
        if (!cart[p.id])
            setQuoted(old => ({ ...old, [p.id]: quoteStamp(p) }));
        const q = (cart[p.id] ?? 0) + 1;
        setCart(prev => ({ ...prev, [p.id]: Math.min(p.qty, (prev[p.id] ?? 0) + 1) }));
        return { tone: 'success', title: 'Added to cart', detail: `${p.name} · ${q} in cart` };
    };
    const scan = (raw, sku = false) => {
        const match = lookupBarcode(counterProducts, raw);
        if (match.kind === 'found')
            return add(match.product);
        const exact = sku && match.kind === 'unknown' && counterProducts.find(p => p.sku === barcodeValue(raw));
        return exact ? add(exact) : lookupFeedback(match.kind);
    };
    const useDraft = async (draft) => {
        if (blocked || !products || !profile || !posReady)
            throw Error('Sign in and refresh this shop before reviewing an offline draft.');
        const status = await draftStatus(sb, branch.id, draft.id);
        if (status.status === 'posted' && status.result && asReceipt(status.result)) {
            setReceipt(status.result);
            return true;
        }
        if (status.status === 'not_posted')
            throw Error('The server confirmed this saved ID never posted and is closed. Discard this local draft only after taking note of the items, then start a fresh cart.');
        if (units && !confirm('Replace the current online cart with the saved draft?'))
            throw Error('Current cart was kept.');
        if (Object.entries(draft.lines).some(([id, q]) => !counterProducts.some(p => p.id === id && p.active && p.qty >= q)))
            throw Error('A cached quantity or product has changed. Review the live stock and edit the saved draft before posting.');
        setCart(draft.lines);
        setQuoted(Object.fromEntries(counterProducts.filter(p => draft.lines[p.id]).map(p => [p.id, quoteStamp(p)])));
        setImported(draft);
        setTab('stock');
        setPay(blankPay());
        setCustomer('');
        setBuyer({ name: '', gstin: '', address: '' });
        setPos('32');
        setNotice('Offline draft loaded. Review current prices, taxes, customer and payment before confirming. No sale has posted yet.');
        return false;
    };
    const lines = counterProducts.filter(p => cart[p.id]), tax = zeroTax();
    const reviewNeeded = lines.some(p => quoted[p.id] !== quoteStamp(p));
    let errors = '', amounts = { cash: 0, upi: 0, card: 0, bank: 0 }, isPayValid = true;
    try {
        for (const p of lines) {
            if (regular && !p.hsn)
                throw Error(`Add an HSN for ${p.name}.`);
            const x = quoteLine(p.price_pa, cart[p.id], p.gst_bps, p.price_includes_gst, regular, pos === '32');
            tax.net_pa += x.net_pa;
            tax.cgst_pa += x.cgst_pa;
            tax.sgst_pa += x.sgst_pa;
            tax.igst_pa += x.igst_pa;
            if (taxTotal(tax) > billLimit)
                throw Error('Invoice exceeds the supported bill limit.');
        }
    }
    catch (e) {
        errors = msg(e);
    }
    try {
        amounts = { cash: rupees(pay.cash), upi: rupees(pay.upi), card: rupees(pay.card), bank: rupees(pay.bank) };
        if (Object.values(amounts).some(v => v > billLimit))
            isPayValid = false;
    }
    catch {
        isPayValid = false;
    }
    const total = taxTotal(tax), due = total - Object.values(amounts).reduce((s, n) => s + n, 0);
    const needBuyer = regular && (total >= 5_000_000 || pos !== '32' || Boolean(buyer.gstin?.trim())), buyerValid = !needBuyer || Boolean(buyer.name?.trim() && buyer.address?.trim());
    const canPost = Boolean(profile) && !blocked && posReady && !reviewNeeded && isPayValid && !errors && buyerValid && due >= 0 && (due === 0 || (owner && !!customer)) && total > 0 && total <= billLimit && lines.length === Object.keys(cart).length && lines.every(p => p.active && p.qty >= cart[p.id]);
    const checkout = async () => {
        if (!canPost || !profile)
            return;
        setPostingIssue('');
        try {
            const result = await record('sale', { profile_revision: profile.revision, items: lines.map(p => ({ product_id: p.id, qty: cart[p.id], price_pa: p.price_pa, hsn: p.hsn, gst_bps: p.gst_bps, price_includes_gst: p.price_includes_gst, warranty_days: p.warranty_days, warranty_terms: p.warranty_terms })),
                payments: amounts, total_pa: total, customer_id: owner && customer ? customer : null, buyer: regular ? buyer : null, pos: regular ? pos : null, ...(inventoryReady ? { inventory_location: location?.id } : {}) }, imported?.id);
            if (!asReceipt(result))
                throw Error('Confirmation did not include a receipt. Check Receipts before trying again.');
            setReceipt(result);
            clearSale();
        }
        catch (e) {
            setPostingIssue(msg(e));
            setTick(n => n + 1);
        }
    };
    const active = counterProducts.filter(p => p.active), shown = active.filter(p => `${p.name} ${p.sku} ${p.barcode}`.toLowerCase().includes(term.trim().toLowerCase()));
    const customers = ctx?.contacts?.filter(p => p.kind === 'customer') ?? [];
    const suppliers = ctx?.contacts?.filter(p => p.kind === 'supplier') ?? [], balances = ctx?.balances ?? [];
    const writeScope = { ...readScope, post: record, blocked: blocked || !ctx };
    const invScope = inventoryReady && ctx && meta.data ? { ...writeScope, ctx, products: products ?? [], meta: meta.data, onReceipt: setReceipt, onSettle: setBalance, onSettings: () => go('settings'), openDoc: setSource, go } : null;
    const identity = { actor, branch: branch.id, shop: branch.name };
    const queueSource = inventoryReady && profile && location && products && posReady && online && !issue ? { ...identity, location, catalogue: counterProducts, profile: { revision: profile.revision, gst_mode: profile.gst_mode } } : undefined;
    const queueWire = inventoryReady && online && !storageIssue ? { ...identity, sync: (j) => recordImpl('sale', j.intent, j.id, true), verify: (j) => draftStatus(sb, branch.id, j.id), fence: fenceQueued } : undefined;
    const settings = _jsxs("div", { className: "biz-stack", children: [_jsx(SettingsSummary, { ctx: ctx, build: release, online: online, openOffline: () => setModal(inventoryReady ? 'queue' : 'offline') }), inventoryReady && ctx && _jsx(TestModePanel, { sb: sb, branch: branch, ctx: ctx, online: online, pendingKey: k, onChanged: () => setTick(n => n + 1) }), inventoryReady && _jsx("button", { className: "button", onClick: () => setModal('offline'), children: "Open legacy draft notebook" }), _jsx(OwnerDesk, { ctx: ctx ?? { profile: null }, products: products ?? [], onProfile: () => setModal('profile'), onPurchase: () => inventoryReady ? go('purchases') : setModal('purchase'), onContact: () => setModal('contact'), onBackup: () => setModal('backup'), onSettle: setBalance, onReceipt: setReceipt, blocked: blocked || !ctx })] });
    const contactDue = receipt ? balances.find(b => b.id === receipt.id && b.kind === 'receivable') : undefined;
    const requireMenu = !['stock', 'receipts', 'products', 'settings'].includes(tab);
    return _jsxs(_Fragment, { children: [!online && _jsx(Warning, { tone: "error", children: "Internet is unavailable. Save a draft in the Offline queue or legacy notebook. No sale posts while disconnected." }), ctx?.test_mode && _jsxs("div", { className: "mc-test-banner", role: "alert", children: [_jsx("b", { children: "TEST MODE" }), _jsx("span", { children: "\u0D08 branch-\u0D7D \u0D07\u0D2A\u0D4D\u0D2A\u0D4B\u0D7E \u0D1A\u0D47\u0D7C\u0D15\u0D4D\u0D15\u0D41\u0D28\u0D4D\u0D28 sales, purchases, expenses, products \u0D0E\u0D28\u0D4D\u0D28\u0D3F\u0D35 \u0D24\u0D3E\u0D7D\u0D15\u0D4D\u0D15\u0D3E\u0D32\u0D3F\u0D15\u0D2E\u0D3E\u0D23\u0D4D. \u0D2F\u0D25\u0D3E\u0D7C\u0D24\u0D4D\u0D25 \u0D15\u0D1F\u0D2F\u0D3F\u0D32\u0D46 \u0D07\u0D1F\u0D2A\u0D3E\u0D1F\u0D41\u0D15\u0D7E \u0D30\u0D47\u0D16\u0D2A\u0D4D\u0D2A\u0D46\u0D1F\u0D41\u0D24\u0D4D\u0D24\u0D30\u0D41\u0D24\u0D4D. \u0D2A\u0D30\u0D3F\u0D36\u0D4B\u0D27\u0D28 \u0D15\u0D34\u0D3F\u0D1E\u0D4D\u0D1E\u0D3E\u0D7D Settings-\u0D7D Clear test data & go live \u0D09\u0D2A\u0D2F\u0D4B\u0D17\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D15." })] }), storageIssue && _jsx(Warning, { tone: "error", children: storageIssue }), pending && _jsxs("div", { className: "panel cloud-pending", children: [_jsxs("div", { children: [_jsx("strong", { children: "Request not confirmed" }), _jsxs("p", { children: ["Reference ", pending.id.slice(0, 8), " \u00B7 Check whether this posted before starting anything new."] })] }), _jsx("button", { type: "button", className: "button primary-button", disabled: !online || busy || Boolean(storageIssue), onClick: () => void resolve(), children: "Resolve saved request" })] }), postingIssue && _jsx(Warning, { tone: "error", children: postingIssue }), notice && _jsx("p", { role: "status", className: "cloud-scan-note", children: notice }), issue && _jsx(Warning, { tone: "error", children: issue }), ctx && !profile && _jsxs("div", { className: "panel cloud-pending", children: [_jsxs("div", { children: [_jsx("strong", { children: "Finish shop settings" }), _jsx("p", { children: owner ? 'Set the business name, address and whether to issue GST invoices before billing.' : 'Ask the owner to set up the shop before billing.' })] }), owner && _jsxs("button", { className: "button primary-button", disabled: blocked, onClick: () => setModal('profile'), children: [_jsx(Settings2, { size: 16 }), " Shop and GST"] })] }), _jsxs("div", { className: "cloud-workspace", children: [inventoryReady ? _jsx(InventoryMenu, { tab: tab, owner: owner, canCount: Boolean(ctx?.inventory_can_count), onPick: choose }) : _jsx(WorkspaceMenu, { tab: tab.startsWith('inv-') ? (owner ? 'overview' : 'stock') : tab, owner: owner, onPick: choose }), _jsxs("div", { className: "cloud-workspace-body", children: [_jsxs("div", { className: "cloud-workspace-toolbar", children: [_jsxs("div", { children: [_jsxs("b", { children: [branch.name, " workspace"] }), _jsx("small", { children: synced ? `Stock updated ${synced}` : 'Working from the current shop database' })] }), _jsxs("div", { className: "cloud-tools", children: [_jsxs("button", { type: "button", className: "button", disabled: !online, onClick: () => setTick(n => n + 1), children: [_jsx(RefreshCw, { size: 15 }), " Refresh"] }), _jsxs("button", { type: "button", className: "button", onClick: () => setModal(inventoryReady ? 'queue' : 'offline'), children: [_jsx(WifiOff, { size: 15 }), " ", inventoryReady ? 'Offline queue' : 'Offline counter'] })] })] }), owner && requireMenu && (!menuReady || !ctx) ? !ctx ? _jsxs("section", { className: "panel cloud-panel", children: [_jsx("h2", { children: "Store workspace" }), _jsx("p", { role: "status", children: issue ? 'Refresh to reconnect to the shop.' : 'Checking the shop database…' })] }) :
                                _jsxs("section", { className: "panel cloud-panel", children: [_jsx("h2", { children: "Enable the full menu" }), _jsx("p", { children: "Install the Mobile Craft 3.1 full-menu migration in the existing Supabase project, then Refresh here. Current stock, POS and receipts are still available." }), _jsxs("div", { className: "cloud-tools cloud-op-actions", children: [_jsx("button", { className: "button primary-button", onClick: () => setTab('stock'), children: "Open billing" }), _jsx("button", { className: "button", onClick: () => setTab('settings'), children: "Shop settings" })] })] }) : null, tab === 'overview' && owner && menuReady && ctx && _jsx(Overview, { ...readScope, ctx: ctx, products: products ?? [], onPick: setTab, onReceipt: setReceipt }), tab === 'products' && _jsx(ProductsPage, { ...writeScope, products: products ?? [], loaded: !!products, ready: menuReady, onAdd: () => setModal('add'), onPrice: setEdit, onLabel: setLabel }), tab === 'receipts' && _jsx(InvoiceRegister, { ...readScope, ready: menuReady, onReceipt: setReceipt }), tab === 'purchases' && owner && menuReady && _jsx(PurchasesPage, { ...writeScope, canReceive: active.length > 0 && suppliers.length > 0, balances: balances, onReceive: () => setModal('purchase'), onSupplier: () => setModal('supplier'), onSettle: setBalance }), (tab === 'customers' || tab === 'suppliers') && owner && menuReady && ctx && _jsx(PartiesPage, { ...writeScope, ctx: ctx, side: tab === 'customers' ? 'customer' : 'supplier', onReceipt: setReceipt, onSettle: setBalance }, tab), tab === 'expenses' && owner && menuReady && _jsx(ExpensesPage, { ...writeScope }), tab === 'accounts' && owner && menuReady && _jsx(AccountsPage, { ...writeScope }), tab === 'reports' && owner && menuReady && _jsx(ReportsPage, { ...readScope }), tab === 'settings' && owner && settings, inventoryReady && tab.startsWith('inv-') && (invScope ? _jsx(InventoryView, { s: invScope, view: tab.slice(4), intent: intent.args, settings: settings }, `${tab}:${intent.key}`) : _jsx("section", { className: "panel cloud-panel", children: _jsx(Wait, { online: online, issue: meta.issue }) })), tab === 'stock' && _jsxs(_Fragment, { children: [inventoryReady && _jsxs("div", { className: "panel cloud-panel inv-pos-location", children: [_jsxs("div", { className: "biz-range", children: [_jsxs("label", { children: ["Billing location", _jsx("select", { "aria-label": "Billing location", value: location?.id ?? '', disabled: busy || Boolean(pending), onChange: e => { if (units && !confirm('Switch location and clear the current unposted cart?'))
                                                                    return; clearSale(); setCounterAt(e.target.value); }, children: locations.map(l => _jsx("option", { value: l.id, children: l.name }, l.id)) })] }), _jsx("small", { children: "Sales deduct from this location only." })] }), !posReady && _jsx(Wait, { online: online, issue: slots.issue })] }), _jsxs("div", { className: "cloud-summary", "aria-label": "Shop stock summary", children: [_jsxs("div", { className: "panel", children: [_jsx(Package, { size: 18 }), _jsxs("span", { children: ["Active products", _jsx("b", { children: products && posReady ? active.length : '—' })] })] }), _jsxs("div", { className: "panel", children: [_jsx(Store, { size: 18 }), _jsxs("span", { children: ["Units available", _jsx("b", { children: products && posReady ? active.reduce((s, p) => s + p.qty, 0) : '—' })] })] }), _jsxs("div", { className: "panel", children: [_jsx(ScanLine, { size: 18 }), _jsxs("span", { children: ["Low / no stock", _jsx("b", { children: products && posReady ? active.filter(p => p.qty <= p.minimum).length : '—' })] })] })] }), _jsxs("div", { className: "cloud-grid", children: [_jsxs("section", { className: "panel cloud-panel", "aria-label": "Branch stock", children: [_jsxs("div", { className: "cloud-panel-head", children: [_jsxs("div", { children: [_jsx("h2", { children: "Branch stock" }), _jsx("p", { children: synced ? `Updated ${synced}` : 'Waiting for the shop catalogue' })] }), owner && _jsxs("button", { className: "button", disabled: blocked || !products || (inventoryReady && !invScope), onClick: () => setModal('add'), children: [_jsx(Plus, { size: 16 }), " Add product"] })] }), _jsxs("div", { className: "cloud-search", children: [_jsx("input", { "aria-label": "Search or scan branch stock", value: term, onChange: e => { setTerm(e.target.value); setScanFeedback(null); }, placeholder: "Search name, SKU or barcode\u2026", spellCheck: false, onKeyDown: e => { if (e.key === 'Enter' && !e.repeat && !e.nativeEvent.isComposing && term.trim()) {
                                                                    e.preventDefault();
                                                                    setScanFeedback(scan(term, true));
                                                                    setTerm('');
                                                                } } }), _jsxs("button", { type: "button", className: "button scan-launch", disabled: !products || blocked || !posReady, onClick: () => setScanner(true), children: [_jsx(ScanLine, { size: 17 }), " Scan barcode"] })] }), scanFeedback && _jsxs("p", { role: "status", className: "cloud-scan-note", children: [_jsx("b", { children: scanFeedback.title }), scanFeedback.detail && ` · ${scanFeedback.detail}`] }), !products || !posReady ? _jsx("p", { role: "status", children: issue || slots.issue || !online ? 'Stock is not available.' : 'Loading stock…' }) : !shown.length ? _jsx("p", { children: active.length ? 'No products match the search.' : 'No products yet at this branch.' }) : _jsx("div", { className: "cloud-stock-list", children: shown.map(p => _jsxs("div", { className: "cloud-stock-row", children: [_jsxs("div", { children: [_jsx("strong", { children: p.name }), _jsxs("small", { children: [p.sku, " \u00B7 ", p.barcode] }), _jsxs("span", { className: p.qty <= p.minimum ? 'cloud-low' : '', children: [p.qty, " in stock \u00B7 ", inr(p.price_pa), regular && p.price_includes_gst === false ? ' + GST' : ''] })] }), _jsxs("div", { className: "cloud-tools", children: [_jsx("button", { type: "button", className: "button", onClick: () => setLabel(p), "aria-label": `Barcode label for ${p.name}`, children: "Label" }), owner && _jsx("button", { type: "button", className: "button", "aria-label": `Edit ${p.name} selling price and GST`, disabled: blocked || (inventoryReady && !invScope), onClick: () => setEdit(p), children: "Edit" }), _jsxs("button", { type: "button", className: "button", "aria-label": `Add ${p.name} to cloud cart`, disabled: !p.qty || blocked, onClick: () => setScanFeedback(add(p)), children: [_jsx(Plus, { size: 16 }), " Add"] })] })] }, p.id)) })] }), _jsxs("section", { className: "panel cloud-panel cloud-cart", "aria-label": "Cloud cart", children: [_jsx("h2", { children: "Current sale" }), _jsx("p", { children: units ? `${units} in cart` : 'Scan or select a product to start.' }), imported && _jsx("p", { className: "cloud-scan-note", children: "Pending Sync \u00B7 Review this offline draft and confirm online." }), lines.map(p => _jsxs("div", { className: "cloud-cart-row", children: [_jsxs("div", { children: [_jsx("b", { children: p.name }), _jsxs("small", { children: [cart[p.id], " \u00D7 ", inr(p.price_pa), cart[p.id] > p.qty ? ' · quantity exceeds stock' : ''] })] }), _jsx("button", { type: "button", className: "button", disabled: busy || Boolean(pending), "aria-label": `Remove a unit of ${p.name}`, onClick: () => setCart(q => { const next = { ...q }; if (next[p.id] > 1)
                                                                    next[p.id]--;
                                                                else
                                                                    delete next[p.id]; return next; }), children: "\u2212" }), _jsx("button", { type: "button", className: "button", disabled: blocked || !p.active || cart[p.id] >= p.qty, "aria-label": `Add a unit of ${p.name}`, onClick: () => add(p), children: "+" })] }, p.id)), lines.length !== Object.keys(cart).length && _jsx(Warning, { tone: "error", children: "A product in the cart is no longer available. Clear and review this cart before posting." }), units > 0 && _jsx("button", { className: "button cloud-fill", type: "button", disabled: busy || Boolean(pending), onClick: () => { if (confirm('Clear the active cart? A saved offline notebook is not deleted.'))
                                                            clearSale(); }, children: "Clear cart" }), regular && _jsxs("div", { className: "cloud-op-form cloud-checkout-settings", children: [_jsxs("label", { children: ["Place of supply", _jsx("select", { "aria-label": "Place of supply", value: pos, onChange: e => { setPos(e.target.value); setPay(blankPay()); }, disabled: blocked, children: states.map(([code, name]) => _jsxs("option", { value: code, children: [name, " (", code, ")"] }, code)) })] }), _jsxs("details", { open: needBuyer || undefined, children: [_jsxs("summary", { children: ["GST recipient details", needBuyer ? ' · required' : ''] }), _jsxs("div", { className: "cloud-op-form", children: [_jsxs("label", { children: ["Recipient name", _jsx("input", { value: buyer.name ?? '', maxLength: 120, onChange: e => setBuyer({ ...buyer, name: e.target.value }) })] }), _jsxs("label", { children: ["Recipient billing / delivery address", _jsx("input", { value: buyer.address ?? '', maxLength: 300, onChange: e => setBuyer({ ...buyer, address: e.target.value }) })] }), _jsxs("label", { children: ["Recipient GSTIN (if registered)", _jsx("input", { value: buyer.gstin ?? '', maxLength: 15, onChange: e => setBuyer({ ...buyer, gstin: e.target.value }) })] })] })] })] }), owner && customers.length > 0 && _jsxs("label", { className: "cloud-op-form", children: ["Credit customer", _jsxs("select", { "aria-label": "Credit customer", value: customer, onChange: e => setCustomer(e.target.value), disabled: blocked, children: [_jsx("option", { value: "", children: "Walk-in \u00B7 pay in full" }), customers.map(c => _jsx("option", { value: c.id, children: c.name }, c.id))] })] }), regular && _jsxs("div", { className: "cloud-tax-summary", children: [_jsxs("span", { children: ["Taxable ", inr(tax.net_pa)] }), pos === '32' ? _jsxs(_Fragment, { children: [_jsxs("span", { children: ["CGST ", inr(tax.cgst_pa)] }), _jsxs("span", { children: ["SGST ", inr(tax.sgst_pa)] })] }) : _jsxs("span", { children: ["IGST ", inr(tax.igst_pa)] })] }), reviewNeeded && _jsxs(_Fragment, { children: [_jsx(Warning, { children: "Price or shop tax settings changed since the cart was loaded. Review the new amounts before continuing." }), _jsx("button", { type: "button", className: "button", disabled: blocked, onClick: () => { setQuoted(Object.fromEntries(lines.map(p => [p.id, quoteStamp(p)]))); setPay(blankPay()); }, children: "Accept updated quote" })] }), _jsxs("div", { className: "cloud-total", children: [_jsx("span", { children: "Total" }), _jsx("b", { children: inr(total) })] }), _jsx("div", { className: "cloud-pay", children: methods.map(m => _jsxs("label", { children: [m.label, " (\u20B9)", _jsx("input", { inputMode: "decimal", value: pay[m.id], disabled: blocked, maxLength: 13, placeholder: "0.00", onChange: e => setPay({ ...pay, [m.id]: e.target.value }) })] }, m.id)) }), _jsx("button", { type: "button", className: "button cloud-fill", disabled: !total || blocked || reviewNeeded || Boolean(errors), onClick: () => setPay({ ...blankPay(), cash: (total / 100).toFixed(2) }), children: "Fill cash total" }), _jsx("p", { children: errors || (!isPayValid ? 'Use valid rupee amounts.' : due < 0 ? 'Payment exceeds the sale total.' : due > 0 ? `${owner && customer ? 'Credit to customer' : 'Remaining'}: ${inr(due)}` : 'Records payment only; does not charge the customer.') }), _jsx("button", { type: "button", className: "button primary-button", disabled: !canPost, onClick: () => void checkout(), children: busy ? 'Checking sale…' : 'Complete sale' }), _jsx("small", { children: "Stock and the receipt update only after server confirmation." })] })] })] })] })] }), scanner && _jsx(BarcodeScanner, { purpose: `Scan for the ${branch.name} cart.`, onClose: () => setScanner(false), itemCount: units, onBarcode: r => scan(r.value) }), (edit || modal === 'add') && owner && (inventoryReady ? invScope && (edit ? _jsx(ItemDetails, { s: invScope, id: edit.id, editFirst: true, close: () => setEdit(null), onLabel: setLabel }) : _jsx(ItemEntry, { s: invScope, close: () => setModal(null) })) : _jsx(ProductEntry, { products: products ?? [], product: edit ?? undefined, post: record, close: () => { setModal(null); setEdit(null); } })), source && invScope && _jsx(OpenedSource, { s: invScope, source: source, close: () => setSource(null) }, `${source.kind}:${source.id}`), modal === 'queue' && _jsx(OfflineQueue, { close: () => setModal(null), source: queueSource, wire: queueWire, openReceipt: setReceipt }), modal === 'profile' && owner && _jsx(ProfileEntry, { current: profile ?? null, branch: branch, post: record, close: () => setModal(null) }), modal === 'contact' && owner && _jsx(ContactEntry, { post: record, close: () => setModal(null) }), modal === 'supplier' && owner && menuReady && _jsx(PartyForm, { kind: "supplier", post: record, close: () => setModal(null) }), modal === 'purchase' && owner && _jsx(PurchaseEntry, { products: products ?? [], suppliers: suppliers, post: record, close: () => setModal(null) }), modal === 'backup' && owner && _jsx(ExportEntry, { sb: sb, branch: branch, close: () => setModal(null) }), modal === 'offline' && _jsx(OfflineNotebook, { close: () => setModal(null), source: online && products && !issue ? { actor, branch: branch.id, shop: branch.name, products } : undefined, onUse: useDraft }), balance && owner && _jsx(SettlementEntry, { balance: balance, post: record, close: () => setBalance(null) }), returning && owner && _jsx(ReturnEntry, { sb: sb, branch: branch, receipt: returning, locations: locations, post: record, close: () => setReturning(null), onDone: r => { setReturning(null); if (asReceipt(r))
                    setReceipt(r); } }), receipt && _jsx(ReceiptView, { receipt: receipt, onClose: () => setReceipt(null), onCollect: owner && !blocked && contactDue ? () => { setReceipt(null); setBalance(contactDue); } : undefined, onReturn: owner && !blocked && !receipt.original_number ? () => { setReturning(receipt); setReceipt(null); } : undefined }), label && _jsxs(Dialog, { title: "Product barcode", onClose: () => setLabel(null), children: [_jsxs("div", { className: "barcode-preview", children: [_jsx("strong", { children: label.name }), _jsx(BarcodeGraphic, { code: label.barcode })] }), _jsxs("button", { type: "button", className: "button", onClick: () => printDocument('label'), children: [_jsx(Printer, { size: 16 }), " Print label"] }), _jsx(PrintPortal, { children: _jsxs("article", { className: "pos-print pos-label-print", children: [_jsx("b", { children: label.name }), _jsx(BarcodeGraphic, { code: label.barcode }), _jsx("strong", { children: inr(label.price_pa) })] }) })] })] });
}
function ReceiptView({ receipt: r, onClose, onReturn, onCollect }) {
    const gst = r.document === 'tax_invoice' || r.document === 'gst_credit_note';
    const title = r.document === 'tax_invoice' ? 'GST Tax Invoice' : r.document === 'gst_credit_note' ? 'GST Credit Note' : r.original_number ? 'Retail return' : 'Retail receipt';
    const [paper, setPaper] = useState(gst ? 'a4' : '80'), [pdfBusy, setPdfBusy] = useState(false), [pdfError, setPdfError] = useState(''), [pdfNotice, setPdfNotice] = useState('');
    const filename = `${r.number.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`;
    const makePdf = async () => { setPdfBusy(true); setPdfError(''); setPdfNotice(''); try {
        return await createReceiptPdf(r);
    }
    catch (e) {
        setPdfError(e instanceof Error ? e.message : 'Could not prepare invoice PDF.');
        throw e;
    }
    finally {
        setPdfBusy(false);
    } };
    const doDownload = async () => { try {
        const blob = await makePdf();
        downloadReceiptPdf(blob, filename);
        setPdfNotice('Invoice PDF downloaded.');
    }
    catch { /* error is shown above */ } };
    const doShare = async () => { setPdfBusy(true); setPdfError(''); setPdfNotice(''); try {
        const blob = await createReceiptPdf(r);
        const result = await shareReceiptPdf(blob, r);
        setPdfNotice(result === 'shared' ? 'PDF opened in the Android share menu. Choose WhatsApp and the customer.' : 'PDF downloaded. Open WhatsApp and attach this PDF to the customer chat.');
    }
    catch (e) {
        if (e instanceof Error && e.name === 'AbortError')
            return;
        setPdfError(e instanceof Error ? e.message : 'Could not share the invoice PDF.');
    }
    finally {
        setPdfBusy(false);
    } };
    const details = _jsxs(_Fragment, { children: [_jsxs("header", { className: "cloud-receipt-header", children: [_jsx("img", { className: "cloud-receipt-logo", src: "/mobile-craft-logo.jpg", alt: "Mobile Craft logo" }), _jsxs("div", { className: "cloud-receipt-header-copy", children: [_jsx("h3", { children: r.merchant?.legal_name ?? `Mobile Craft · ${r.branch}` }), r.merchant?.address && _jsx("p", { children: r.merchant.address }), r.merchant?.gstin && _jsxs("p", { children: ["GSTIN ", r.merchant.gstin, " \u00B7 Kerala (32)"] }), _jsx("strong", { children: title }), _jsxs("p", { children: [r.number, " \u00B7 ", when(r.posted_at)] })] })] }), r.original_number && _jsxs("p", { children: ["Against ", r.original_number, " \u00B7 ", r.original_posted_at ? when(r.original_posted_at) : '', r.reason && ` · ${r.reason}`] }), r.buyer?.name && _jsxs("p", { children: ["Recipient: ", r.buyer.name, r.buyer.address && ` · ${r.buyer.address}`, r.buyer.gstin && ` · GSTIN ${r.buyer.gstin}`] }), gst && r.buyer?.pos && _jsxs("p", { children: ["Place of supply: ", stateLabel(r.buyer.pos), " \u00B7 Reverse charge: No"] }), _jsxs("table", { className: "cloud-bill-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Item" }), _jsx("th", { children: "Qty" }), _jsx("th", { children: "Amount" })] }) }), _jsx("tbody", { children: r.lines.map(l => _jsxs("tr", { children: [_jsxs("td", { children: [l.name, r.original_number && _jsx("small", { className: "cloud-bill-meta", children: l.restocked ? 'Restocked' : conditions[l.condition ?? 'unspecified'] ?? 'Not restocked' }), l.warranty_days && l.warranty_days > 0 && _jsxs("small", { className: "cloud-bill-meta cloud-warranty", children: ["Warranty: ", l.warranty_days, " days", l.warranty_until ? ` · valid until ${l.warranty_until}` : '', l.warranty_terms ? ` · ${l.warranty_terms}` : ''] }), gst && _jsxs("small", { className: "cloud-bill-meta", children: ["HSN ", l.hsn, " \u00B7 ", (l.gst_bps ?? 0) / 100, "% \u00B7 taxable ", inr(l.net_pa ?? 0), l.igst_pa ? ` · IGST ${inr(l.igst_pa)}` : ` · CGST ${inr(l.cgst_pa ?? 0)} · SGST ${inr(l.sgst_pa ?? 0)}`] })] }), _jsxs("td", { children: [l.qty, " ", gst ? l.uqc : l.unit && l.unit !== 'piece' ? l.unit : ''] }), _jsx("td", { children: inr(l.total_pa) })] }, l.product_id)) })] }), gst && _jsxs("div", { className: "cloud-tax-summary", children: [_jsxs("span", { children: ["Taxable ", inr(r.net_pa ?? 0)] }), r.buyer?.pos === '32' ? _jsxs(_Fragment, { children: [_jsxs("span", { children: ["CGST ", inr(r.cgst_pa ?? 0)] }), _jsxs("span", { children: ["SGST ", inr(r.sgst_pa ?? 0)] })] }) : _jsxs("span", { children: ["IGST ", inr(r.igst_pa ?? 0)] })] }), _jsxs("div", { className: "cloud-total", children: [_jsx("b", { children: "Total" }), _jsx("b", { children: inr(r.total_pa) })] }), methods.filter(m => (r.payments[m.id] ?? 0) > 0).map(m => _jsxs("p", { children: [m.label, " \u00B7 ", inr(r.payments[m.id] ?? 0)] }, m.id)), Boolean(r.initial_due_pa) && _jsxs("p", { children: ["Original credit due \u00B7 ", inr(r.initial_due_pa ?? 0)] }), r.original_number && _jsxs("p", { children: ["Credit reduced ", inr(r.credit_reversed_pa ?? 0), " \u00B7 Refund ", inr(r.refund_pa ?? 0), " ", r.refund_method && `(${r.refund_method.toUpperCase()})`] }), gst ? _jsx("p", { className: "cloud-signature", children: "Authorised signature ____________________" }) : _jsx("small", { children: "Not a GST tax invoice" })] });
    return _jsxs(Dialog, { title: `Receipt ${r.number}`, onClose: onClose, children: [_jsx("div", { className: "cloud-bill", children: details }), _jsxs("div", { className: "cloud-tools cloud-op-actions", children: [_jsxs("label", { className: "cloud-select", children: ["Receipt paper", _jsxs("select", { "aria-label": "Receipt paper", value: paper, onChange: e => setPaper(e.target.value), children: [_jsx("option", { value: "80", children: "80 mm thermal" }), _jsx("option", { value: "58", children: "58 mm thermal" }), _jsx("option", { value: "a4", children: "A4" })] })] }), _jsxs("button", { type: "button", className: "button", disabled: pdfBusy, onClick: () => void doDownload(), children: [_jsx(FileDown, { size: 16 }), " Download PDF"] }), _jsxs("button", { type: "button", className: "button primary-button", disabled: pdfBusy, onClick: () => void doShare(), children: [_jsx(Share2, { size: 16 }), " ", pdfBusy ? 'Preparing…' : 'Share PDF / WhatsApp'] }), _jsxs("button", { type: "button", className: "button", onClick: () => printDocument(paper), children: [_jsx(Printer, { size: 16 }), " Print"] }), onReturn && _jsx("button", { className: "button", type: "button", onClick: onReturn, children: "Record return" }), onCollect && _jsx("button", { className: "button", type: "button", onClick: onCollect, children: "Collect balance" })] }), pdfError && _jsx(Warning, { tone: "error", children: pdfError }), pdfNotice && _jsx("p", { role: "status", className: "cloud-scan-note", children: pdfNotice }), _jsx(PrintPortal, { children: _jsx("article", { className: "pos-print pos-receipt-print", children: details }) })] });
}
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(Auth, {}) }));
