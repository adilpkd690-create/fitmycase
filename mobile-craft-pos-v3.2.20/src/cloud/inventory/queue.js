import { isUuid, methods } from '../api.js';
import { billLimit, quoteLine, taxTotal, zeroTax } from '../amounts.js';
import { loadVault, seal, unseal, writeVault } from '../vault.js';
export const queueCap = 60;
const isPa = (x) => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0 && x <= billLimit;
const goodDate = (x) => typeof x === 'string' && Number.isFinite(Date.parse(x));
const safeQty = (n) => typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 1000000;
const locationOk = (l) => l && isUuid(l.id) && typeof l.name === 'string' && typeof l.code === 'string';
export const queueLoad = () => loadVault('queue-v1');
export const queueWrite = async (pass, before, box) => {
    const envelope = box ? await seal(pass, box) : null;
    await writeVault(before, envelope, 'queue-v1');
    return envelope;
};
export async function queueOpen(pass, entry) {
    const b = await unseal(pass, entry);
    if (b?.format !== 'mobile-craft-queue/1' || !isUuid(b.actor) || !isUuid(b.branch) || !locationOk(b.location) || !goodDate(b.cached) || typeof b.shop !== 'string' || !b.profile || !Number.isInteger(b.profile.revision) || !['regular', 'retail'].includes(b.profile.gst_mode) || !Array.isArray(b.catalogue) || b.catalogue.length > 10000 || !Array.isArray(b.jobs) || b.jobs.length > queueCap)
        throw Error('This queue is not valid for this release.');
    if (b.catalogue.some(p => !p || !isUuid(p.id) || p.branch_id !== b.branch || typeof p.name !== 'string' || typeof p.sku !== 'string' || typeof p.barcode !== 'string' || p.warranty_days != null && (!Number.isInteger(p.warranty_days) || p.warranty_days < 0 || p.warranty_days > 3650) || p.warranty_terms != null && (typeof p.warranty_terms !== 'string' || p.warranty_terms.length > 180) || !Number.isInteger(p.qty) || p.qty < 0 || p.qty > 1000000 || !isPa(p.price_pa)))
        throw Error('The encrypted offline catalogue is invalid.');
    const ids = new Set();
    for (const j of b.jobs) {
        const p = j?.intent;
        if (!j || !isUuid(j.id) || ids.has(j.id) || !goodDate(j.saved) || !['pending', 'synced', 'failed'].includes(j.status) || typeof j.closed !== 'boolean' || !Number.isInteger(j.attempts) || j.attempts < 0 || (j.revised_to != null && !isUuid(j.revised_to)) || j.issue != null && typeof j.issue !== 'string' || !locationOk(j.location) || !p || !Number.isInteger(p.profile_revision) || j.location.id !== p.inventory_location || !isPa(p.total_pa) || p.total_pa < 1 || !Array.isArray(p.items) || !p.items.length || p.items.length > 100 || p.items.some(x => !x || !isUuid(x.product_id) || !safeQty(x.qty) || !isPa(x.price_pa) || x.warranty_days != null && (!Number.isInteger(x.warranty_days) || x.warranty_days < 0 || x.warranty_days > 3650) || x.warranty_terms != null && (typeof x.warranty_terms !== 'string' || x.warranty_terms.length > 180)) || new Set(p.items.map(x => x.product_id)).size !== p.items.length || !p.payments || methods.some(k => !isPa(p.payments[k.id])) || methods.reduce((sum, k) => sum + p.payments[k.id], 0) !== p.total_pa || p.customer_id !== null || p.buyer !== null || p.pos !== null && p.pos !== '32' || !Array.isArray(j.label) || j.label.length !== p.items.length || j.label.some(x => !x || !isUuid(x.id) || !safeQty(x.qty) || typeof x.name !== 'string' || typeof x.sku !== 'string') || j.status === 'synced' && (!j.receipt || !isUuid(j.receipt.id) || typeof j.receipt.number !== 'string' || !goodDate(j.receipt.posted_at) || j.receipt.total_pa !== p.total_pa))
            throw Error('An encrypted queue entry is invalid. Do not recreate the sale without checking its server receipt.');
        ids.add(j.id);
    }
    return b;
}
export const prepareQueue = (s) => ({ ...s, format: 'mobile-craft-queue/1', cached: new Date().toISOString(), jobs: [] });
export function makeJob(b, cart, method, id = crypto.randomUUID()) {
    const tax = zeroTax(), items = [], label = [], regular = b.profile.gst_mode === 'regular';
    const dict = new Map(b.catalogue.map(p => [p.id, p])), rows = Object.entries(cart);
    if (!rows.length || rows.length > 100 || !methods.some(x => x.id === method))
        throw Error('Choose 1–100 sale lines and a payment method for review.');
    for (const [id, qty] of rows) {
        const x = dict.get(id);
        if (!x?.active || !safeQty(qty) || qty > x.qty)
            throw Error('A quantity exceeds this cached location or the item is inactive. Edit the draft or refresh the offline catalogue.');
        if (regular && (!x.hsn || x.gst_bps == null))
            throw Error(`${x.name}: Regular GST billing needs both the correct HSN and GST rate. Verify the product tax settings, or ask the owner to confirm Retail mode only if the shop is not GST-registered.`);
        const l = quoteLine(x.price_pa, qty, x.gst_bps, x.price_includes_gst, regular, true);
        tax.net_pa += l.net_pa;
        tax.cgst_pa += l.cgst_pa;
        tax.sgst_pa += l.sgst_pa;
        tax.igst_pa += l.igst_pa;
        if (taxTotal(tax) > billLimit)
            throw Error('Amount exceeds the sale limit.');
        label.push({ id: x.id, name: x.name, sku: x.sku, qty });
        items.push({ product_id: x.id, qty, price_pa: x.price_pa, hsn: x.hsn, gst_bps: x.gst_bps, price_includes_gst: x.price_includes_gst, warranty_days: x.warranty_days, warranty_terms: x.warranty_terms });
    }
    const total = taxTotal(tax);
    if (total <= 0 || regular && total >= 5000000)
        throw Error('Use online checkout for GST buyer details, credit and higher-value bills.');
    const payments = { cash: 0, upi: 0, bank: 0, card: 0 };
    payments[method] = total;
    return { id, saved: new Date().toISOString(), status: 'pending', closed: false, attempts: 0, issue: null, revised_to: null, location: b.location, label, intent: { profile_revision: b.profile.revision, inventory_location: b.location.id, items, payments, total_pa: total, buyer: null, customer_id: null, pos: regular ? '32' : null }, receipt: null };
}
export function confirmed(r, c) {
    if (!isUuid(r.id) || !r.number || !r.branch || !r.payments || !goodDate(r.posted_at) || !Array.isArray(r.lines) || r.total_pa !== c.intent.total_pa || r.lines.length !== c.intent.items.length || c.intent.items.some(l => !r.lines?.some(x => x.product_id === l.product_id && x.qty === l.qty)))
        throw Error('The reply was not a matching receipt. Keep this request and check it again.');
    return r;
}
