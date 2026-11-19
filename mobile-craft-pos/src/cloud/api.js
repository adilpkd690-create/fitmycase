/// <reference types="vite/client" />
import { createClient } from '/vendor/supabase.js';
export const methods = [{ id: 'cash', label: 'Cash' }, { id: 'upi', label: 'UPI' }, { id: 'card', label: 'Card' }, { id: 'bank', label: 'Bank' }];
export const kinds = ['profile', 'product', 'contact', 'sale', 'purchase', 'return', 'collection', 'supplier_payment', 'expense', 'funds', 'transfer', 'other_income', 'cash_close', 'stock_adjust', 'product_details', 'contact_details', 'inventory'];
export const isUuid = (s) => typeof s === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s);
const url = "https://ppqbgdvryhawxgxzzqnt.supabase.co"?.trim(), key = "sb_publishable_yIWPsJrbKhUrXkJJpLMg_A_eYgvhyMR"?.trim();
export const client = url && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) && /^sb_publishable_[A-Za-z0-9_-]+$/.test(key ?? '')
    ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }) : null;
export const errorText = (e) => e instanceof Error ? e.message : 'Could not finish. Try again.';
export const when = (s) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(s));
export async function branches(sb) {
    const { data, error } = await sb.rpc('mc_my_branches').abortSignal(AbortSignal.timeout(12000));
    if (error)
        throw Error('Could not load shop access. Check your connection and try again.');
    return data;
}
export async function stock(sb, id) {
    const all = [];
    for (let page = 0; page < 25; page++) {
        const { data, error } = await sb.from('mc_products').select('id,branch_id,name,sku,barcode,price_pa,qty,minimum,active,hsn,gst_bps,price_includes_gst,warranty_days,warranty_terms').eq('branch_id', id).order('name').order('id').range(page * 400, page * 400 + 399).abortSignal(AbortSignal.timeout(12000));
        if (error)
            throw Error('Could not refresh stock. Check connection, access and the current database migration.');
        all.push(...data);
        if (data.length < 400)
            return all;
    }
    throw Error('Catalogue limit reached. Ask the owner to verify stock before billing.');
}
export async function context(sb, branch) {
    const { data, error } = await sb.rpc('mc_shop_context', { p_branch: branch }).abortSignal(AbortSignal.timeout(12000));
    if (error || !data)
        throw Error('Could not load shop settings. Check access and the store migration.');
    return data;
}
export async function returnStatus(sb, branch, sale) {
    const { data, error } = await sb.rpc('mc_return_status', { p_branch: branch, p_sale: sale }).abortSignal(AbortSignal.timeout(12000));
    if (error || !data)
        throw Error('Could not verify remaining units and credit for this return.');
    return data;
}
export function rupees(text) {
    if (!text.trim())
        return 0;
    if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(text.trim()))
        throw Error('Use a rupee amount with at most two decimals.');
    const [major, minor = ''] = text.trim().split('.');
    return Number(major) * 100 + Number(minor.padEnd(2, '0'));
}
export function readPending(k) {
    const str = localStorage.getItem(k);
    if (!str)
        return null;
    let p;
    try {
        p = JSON.parse(str);
    }
    catch {
        throw Error('A local request reference could not be read. Ask the owner to reconcile before posting.');
    }
    if (!p || !isUuid(p.id) || !kinds.includes(p.kind))
        throw Error('Invalid local request reference. Ask the owner to reconcile before posting.');
    return p;
}
const result = (data) => {
    if (!data || typeof data !== 'object' || !('id' in data) || !isUuid(data.id))
        throw Error('Confirmation incomplete. Resolve the saved request.');
    return data;
};
export class PostingRejected extends Error {
}
export async function submit(sb, k, branch, p, payload, exactReplay = false) {
    if (!navigator.locks)
        throw Error('Posting needs a recent Chrome/Edge browser in a secure tab.');
    return navigator.locks.request(k, async () => {
        const existing = readPending(k);
        if (existing && !(exactReplay && p.kind === 'sale' && existing.id === p.id && existing.kind === p.kind))
            throw Error('A previous request needs to be resolved first.');
        // No customer name, address, Auth token or payload persisted here. SQL resolves/fences uncertain IDs.
        localStorage.setItem(k, JSON.stringify(p));
        const { data, error } = await sb.rpc('mc_apply_operation', { p_branch: branch, p_request: p.id, p_kind: p.kind, p_payload: payload }).abortSignal(AbortSignal.timeout(14000));
        if (error) {
            if (error.code === 'P0001' && !/^Request ID is already used/.test(error.message)) {
                localStorage.removeItem(k);
                throw new PostingRejected(error.message);
            }
            if (/^22[0-9A-Z]{3}$/.test(error.code ?? '')) {
                localStorage.removeItem(k);
                throw new PostingRejected('A submitted field is invalid. Review all numbers and choices.');
            }
            throw Error('Request not confirmed. Resolve the saved reference before posting again.');
        }
        const out = result(data);
        localStorage.removeItem(k);
        return out;
    });
}
export async function resolvePending(sb, k, branch, p, allowUnsavedSale = false) {
    if (!navigator.locks)
        throw Error('Request resolution needs a secure tab.');
    return navigator.locks.request(k, async () => {
        const old = readPending(k);
        if (old ? (old.id !== p.id || old.kind !== p.kind) : (!allowUnsavedSale || p.kind !== 'sale'))
            throw Error('The saved reference changed. Refresh the shop view.');
        const { data, error } = await sb.rpc('mc_resolve_operation', { p_branch: branch, p_request: p.id, p_kind: p.kind }).abortSignal(AbortSignal.timeout(16000));
        if (error)
            throw Error('Could not resolve this request. Keep it saved, reconnect and try again with the same login.');
        if (data?.status !== 'posted' && data?.status !== 'not_posted')
            throw Error('Incomplete reply. Try resolving again.');
        const out = data.status === 'posted' ? result(data.result) : null;
        localStorage.removeItem(k);
        return out;
    });
}
export async function download(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function draftStatus(sb, branch, request) {
    const { data, error } = await sb.rpc('mc_request_status', { p_branch: branch, p_request: request }).abortSignal(AbortSignal.timeout(12000));
    if (error || !['posted', 'new', 'not_posted'].includes(data?.status))
        throw Error('Could not check if the draft was already posted. Keep it and reconnect.');
    return { status: data.status, result: data.status === 'posted' ? result(data.result) : null };
}
