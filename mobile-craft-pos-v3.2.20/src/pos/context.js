import { jsx as _jsx } from "/vendor/react-jsx-runtime.js";
import { createContext, useContext, useEffect, useRef, useState } from '/vendor/react.js';
import { BookError, eventId, freshBook } from './engine.js';
import { shopOnly } from './mode.js';
import { defaultBook, loadBook, postEvent, replaceBook } from './storage.js';
const Context = createContext(null);
const key = 'mcpos-active-book';
export function PosProvider({ children }) {
    const [kind, setKind] = useState(() => { if (shopOnly)
        return 'store'; try {
        return localStorage.getItem(key) === 'store' ? 'store' : 'practice';
    }
    catch {
        return 'practice';
    } });
    const [state, setState] = useState(null);
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const channel = useRef(null);
    useEffect(() => {
        let active = true;
        const refresh = () => loadBook(kind).then(book => {
            if (active)
                setState({ kind, book, writable: true, limitation: '' });
        }).catch(e => {
            if (active) {
                const limitation = e instanceof BookError ? e.message : 'This preview cannot write to browser storage. Open the downloaded POS file in Chrome or Edge to save transactions.';
                setState({ kind, book: defaultBook(kind), writable: false, limitation });
            }
        });
        void refresh();
        try {
            const bus = new BroadcastChannel('mobile-craft-pos-books');
            channel.current = bus;
            bus.onmessage = e => { if (e.data === kind)
                void refresh(); };
        }
        catch { /* IndexedDB still serializes writes if messaging is unavailable. */ }
        return () => { active = false; channel.current?.close(); channel.current = null; };
    }, [kind]);
    const selectKind = (next) => {
        if (shopOnly || lock.current || next === kind)
            return;
        setKind(next);
        try {
            localStorage.setItem(key, next);
        }
        catch { /* Current session may still select a different book. */ }
    };
    const run = async (fn) => {
        if (lock.current)
            throw new BookError('A save is already in progress. Please wait.');
        if (!state?.writable || state.kind !== kind)
            throw new BookError('Local storage is not ready. No changes were saved.');
        lock.current = true;
        setBusy(true);
        try {
            return await fn();
        }
        catch (error) {
            if (error instanceof BookError)
                throw error;
            throw new BookError('Local storage could not save the transaction. No changes were committed. Check available storage or close other windows and retry.');
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    };
    const write = (action, id = eventId()) => run(async () => {
        const output = await postEvent(kind, { id, action, at: new Date().toISOString() });
        setState({ kind, book: output.book, writable: true, limitation: '' });
        channel.current?.postMessage(kind);
        return output;
    });
    const replace = (book, revision) => run(async () => {
        const output = await replaceBook(kind, book, revision);
        setState({ kind, book: output, writable: true, limitation: '' });
        channel.current?.postMessage(kind);
    });
    const ready = state?.kind === kind;
    return _jsx(Context.Provider, { value: { kind, book: ready ? state.book : freshBook(), writable: ready && state.writable, limitation: ready ? state.limitation : '', ready, busy, selectKind, write, replace }, children: children });
}
export function usePos() { const pos = useContext(Context); if (!pos)
    throw new Error('POS context not mounted'); return pos; }
