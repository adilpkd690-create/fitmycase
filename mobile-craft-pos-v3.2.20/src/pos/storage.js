import { BookError, commit, freshBook, revisionOf } from './engine.js';
import { lookupBarcode } from './barcode-match.js';
import { practiceBook } from './seed.js';
const STORE = 'books';
const DB_NAME = 'mobile-craft-local-pos-v1';
let dbPromise;
function open() {
    if (dbPromise)
        return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onerror = () => reject(request.error ?? new BookError('Local storage is unavailable.'));
        request.onblocked = () => reject(new BookError('Close other Mobile Craft tabs and try again.'));
        request.onsuccess = () => {
            request.result.onversionchange = () => { request.result.close(); dbPromise = undefined; };
            resolve(request.result);
        };
    }).catch(error => { dbPromise = undefined; throw error; });
    return dbPromise;
}
let initialPractice;
export function defaultBook(kind) { return kind === 'practice' ? (initialPractice ??= practiceBook()) : freshBook(); }
async function transact(kind, mutate) {
    const db = await open();
    // IndexedDB serializes overlapping read/write transactions, including across tabs.
    // Request strict durability where supported before acknowledging a posted invoice.
    let transaction;
    try {
        transaction = db.transaction(STORE, 'readwrite', { durability: 'strict' });
    }
    catch {
        transaction = db.transaction(STORE, 'readwrite');
    }
    return new Promise((resolve, reject) => {
        const store = transaction.objectStore(STORE), request = store.get(kind);
        let error, result;
        request.onsuccess = () => {
            try {
                const current = request.result;
                if (current && current.version !== 1)
                    throw new BookError('This database was created by a different Mobile Craft version.');
                const start = current ?? defaultBook(kind);
                const next = mutate(start);
                result = next.result;
                if (next.book || !current)
                    store.put(next.book ?? start, kind);
            }
            catch (e) {
                error = e;
                transaction.abort();
            }
        };
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () => reject(error ?? transaction.error ?? new BookError('Could not save locally. No changes were committed.'));
        transaction.onerror = () => { };
    });
}
export const loadBook = (kind) => transact(kind, current => ({ result: current }));
export const postEvent = (kind, event) => transact(kind, current => {
    const output = commit(current, event);
    if (!output.replayed && event.action.type === 'product') {
        // Validate the new assignment in the same transaction, against the freshest
        // catalogue. Do not reinterpret existing records or old backup events.
        const id = event.action.id ?? event.id;
        const saved = output.book.products.find(p => p.id === id);
        const previous = current.products.find(p => p.id === id);
        if (saved && saved.barcode !== previous?.barcode && lookupBarcode(output.book.products, saved.barcode).kind === 'ambiguous') {
            throw new BookError('This UPC-A / EAN-13 barcode is already assigned to another product.');
        }
    }
    return { book: output.replayed ? undefined : output.book, result: output };
});
export const replaceBook = (kind, book, expectedRevision) => transact(kind, current => {
    if (revisionOf(current) !== expectedRevision)
        throw new BookError('The workspace changed in another window. Review it before restoring or resetting.');
    return { book, result: book };
});
