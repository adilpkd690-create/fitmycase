import { isUuid } from './api.js';
const encode = (bytes) => {
    let part = '';
    for (let i = 0; i < bytes.length; i += 8192)
        part += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(part);
};
const decode = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const additionalData = new TextEncoder().encode('mobile-craft-encrypted/1');
async function key(secret, salt) {
    if (secret.length < 12 || secret.length > 256)
        throw Error('Use a passphrase between 12 and 256 characters.');
    const root = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'PBKDF2' }, false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: 600_000, salt }, root, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function seal(secret, content) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, await key(secret, salt), new TextEncoder().encode(JSON.stringify(content)));
    return { format: 'mobile-craft-encrypted/1', salt: encode(salt), iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) };
}
export async function unseal(secret, data) {
    if (data?.format !== 'mobile-craft-encrypted/1' || typeof data.ciphertext !== 'string' || data.ciphertext.length > 64 * 1024 * 1024)
        throw Error('This encrypted file is not supported.');
    try {
        const salt = decode(data.salt), iv = decode(data.iv);
        if (salt.length !== 16 || iv.length !== 12)
            throw Error('Invalid encryption parameters');
        return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData }, await key(secret, salt), decode(data.ciphertext))));
    }
    catch {
        throw Error('Could not unlock. Check the passphrase or file.');
    }
}
export async function openNotebook(secret, data) {
    const n = await unseal(secret, data);
    if (n?.type !== 'mobile-craft-counter/1' || !isUuid(n.actor) || !isUuid(n.branch) || typeof n.shop !== 'string' || !Array.isArray(n.catalogue) || n.catalogue.length > 10000 || !Number.isFinite(Date.parse(n.refreshedAt)) ||
        n.catalogue.some(p => !isUuid(p.id) || p.branch_id !== n.branch || typeof p.name !== 'string' || typeof p.barcode !== 'string' || typeof p.sku !== 'string' || !Number.isSafeInteger(p.qty) || p.qty < 0))
        throw Error('The local notebook is invalid.');
    if (n.draft && (!isUuid(n.draft.id) || !n.draft.lines || Object.keys(n.draft.lines).length > 100 || Object.entries(n.draft.lines).some(([id, q]) => !isUuid(id) || !Number.isInteger(q) || q < 1 || q > 1_000_000)))
        throw Error('The saved draft is invalid.');
    return n;
}
let opening;
function open() {
    if (opening)
        return opening;
    opening = new Promise((resolve, reject) => {
        const req = indexedDB.open('mobile-craft-encrypted-counter', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('counter');
        req.onsuccess = () => { req.result.onversionchange = () => { req.result.close(); opening = undefined; }; resolve(req.result); };
        req.onerror = () => reject(Error('This browser could not open the offline notebook.'));
        req.onblocked = () => reject(Error('Close other Mobile Craft tabs and try again.'));
    }).catch(e => { opening = undefined; throw e; });
    return opening;
}
export async function loadVault(slot = 'shop') {
    const db = await open();
    return new Promise((resolve, reject) => {
        const req = db.transaction('counter').objectStore('counter').get(slot);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(Error('Could not read the offline notebook.'));
    });
}
export async function writeVault(expected, data, slot = 'shop') {
    const db = await open();
    let tr;
    try {
        tr = db.transaction('counter', 'readwrite', { durability: 'strict' });
    }
    catch {
        tr = db.transaction('counter', 'readwrite');
    }
    return new Promise((resolve, reject) => {
        const store = tr.objectStore('counter'), req = store.get(slot);
        let conflict = false;
        req.onsuccess = () => {
            if ((req.result?.ciphertext ?? null) !== (expected?.ciphertext ?? null)) {
                conflict = true;
                tr.abort();
                return;
            }
            if (data)
                store.put(data, slot);
            else
                store.delete(slot);
        };
        tr.oncomplete = () => resolve();
        tr.onabort = () => reject(Error(conflict ? 'The notebook changed in another tab. Close and reopen it.' : 'Could not save the notebook. No save was confirmed.'));
    });
}
