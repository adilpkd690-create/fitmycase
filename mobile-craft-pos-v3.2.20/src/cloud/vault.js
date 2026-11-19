import { isUuid } from './api.js';
const encode = (bytes) => {
    let part = '';
    for (let i = 0; i < bytes.length; i += 8192)
        part += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(part);
};
const decode = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const additionalData = new TextEncoder().encode('mobile-craft-encrypted/1');
const r2AdditionalData = (branch) => new TextEncoder().encode(`mobile-craft-r2-backup/1:${branch}`);
const r2DbName = 'mobile-craft-r2-backup';
let r2DbOpening;
function openR2Db() {
    if (r2DbOpening) return r2DbOpening;
    r2DbOpening = new Promise((resolve, reject) => {
        const req = indexedDB.open(r2DbName, 1);
        req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('keys')) req.result.createObjectStore('keys'); };
        req.onsuccess = () => { req.result.onversionchange = () => { req.result.close(); r2DbOpening = undefined; }; resolve(req.result); };
        req.onerror = () => reject(Error('This browser could not open the encrypted R2 backup key store.'));
        req.onblocked = () => reject(Error('Close other Mobile Craft tabs and retry R2 backup setup.'));
    }).catch(e => { r2DbOpening = undefined; throw e; });
    return r2DbOpening;
}
async function r2Read(branch) {
    const db = await openR2Db();
    return new Promise((resolve, reject) => {
        const req = db.transaction('keys').objectStore('keys').get(branch);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(Error('Could not read the local encrypted R2 backup settings.'));
    });
}
async function r2Write(branch, value) {
    const db = await openR2Db();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('keys', 'readwrite');
        tx.objectStore('keys').put(value, branch);
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () => reject(Error('Could not save the local encrypted R2 backup settings.'));
    });
}
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
    const supported = ['mobile-craft-encrypted/1', 'mobile-craft-r2-encrypted/1'];
    if (!supported.includes(data?.format) || typeof data.ciphertext !== 'string' || data.ciphertext.length > 120 * 1024 * 1024)
        throw Error('This encrypted file is not supported.');
    try {
        const salt = decode(data.salt), iv = decode(data.iv);
        if (salt.length !== 16 || iv.length !== 12)
            throw Error('Invalid encryption parameters');
        const aad = data.format === 'mobile-craft-r2-encrypted/1' ? r2AdditionalData(data.branchId) : additionalData;
        let plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, await key(secret, salt), decode(data.ciphertext)));
        if (data.format === 'mobile-craft-r2-encrypted/1') {
            if (data.encoding !== 'gzip' || typeof DecompressionStream === 'undefined')
                throw Error('Compressed R2 backup is not supported by this browser.');
            const stream = new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'));
            plain = new Uint8Array(await new Response(stream).arrayBuffer());
            if (plain.length > 256 * 1024 * 1024)
                throw Error('The decrypted snapshot is too large to open safely in this browser.');
        }
        return JSON.parse(new TextDecoder().decode(plain));
    }
    catch {
        throw Error('Could not unlock. Check the passphrase or file.');
    }
}
export async function enableR2AutoBackup(branchId, secret) {
    if (!isUuid(branchId)) throw Error('The selected shop branch is invalid.');
    let record = await r2Read(branchId);
    if (record?.salt && record?.verifierIv && record?.verifierCiphertext) {
        const salt = decode(record.salt), derived = await key(secret, salt);
        try {
            const check = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(record.verifierIv), additionalData: r2AdditionalData(branchId) }, derived, decode(record.verifierCiphertext)));
            if (check !== `Mobile Craft R2 backup key verified:${branchId}`) throw Error('Passphrase mismatch');
        } catch { throw Error('This device already has an R2 backup key. Enter its original passphrase.'); }
        record = { ...record, key: derived, enabled: true };
    } else {
        const salt = crypto.getRandomValues(new Uint8Array(16)), verifierIv = crypto.getRandomValues(new Uint8Array(12));
        const derived = await key(secret, salt);
        const marker = new TextEncoder().encode(`Mobile Craft R2 backup key verified:${branchId}`);
        const verifierCiphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: verifierIv, additionalData: r2AdditionalData(branchId) }, derived, marker));
        record = { branchId, salt: encode(salt), verifierIv: encode(verifierIv), verifierCiphertext: encode(verifierCiphertext), key: derived, enabled: true, lastBackupAt: null, createdAt: new Date().toISOString() };
    }
    await r2Write(branchId, record);
    return { enabled: true, lastBackupAt: record.lastBackupAt ?? null };
}
export async function getR2AutoBackupInfo(branchId) {
    const record = await r2Read(branchId);
    if (!record?.enabled || record.branchId !== branchId || !record.key) return record ? { enabled: Boolean(record.enabled), lastBackupAt: record.lastBackupAt ?? null } : null;
    return { enabled: true, lastBackupAt: record.lastBackupAt ?? null, createdAt: record.createdAt ?? null };
}
export async function sealR2Backup(branchId, content) {
    const record = await r2Read(branchId);
    if (!record?.enabled || record.branchId !== branchId || !record.key) throw Error('The encrypted R2 backup key is not set up on this device.');
    if (typeof CompressionStream === 'undefined') throw Error('This browser does not support encrypted compressed R2 backups. Use a current Chrome or Edge browser.');
    const raw = new TextEncoder().encode(JSON.stringify(content));
    const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: r2AdditionalData(branchId) }, record.key, compressed));
    return { format: 'mobile-craft-r2-encrypted/1', branchId, encoding: 'gzip', salt: record.salt, iv: encode(iv), ciphertext: encode(ciphertext) };
}
export async function setR2AutoBackupLastRun(branchId, at) {
    const record = await r2Read(branchId);
    if (!record?.enabled || record.branchId !== branchId) throw Error('R2 backup is not enabled on this device.');
    await r2Write(branchId, { ...record, lastBackupAt: at });
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
