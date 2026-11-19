import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "/vendor/react-jsx-runtime.js";
import { useState } from '/vendor/react.js';
import { AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, Search } from '/vendor/lucide-react.js';
import { DateControl } from '../components/Controls.js';
import { PanelTitle } from '../components/Charts.js';
import { money, num } from '../data.js';
import { TENDERS, today } from './engine.js';
import { usePos } from './context.js';
import { storePresets } from './reports.js';
export const inr = (v) => v < 0 ? `−${money(-v, v % 100 !== 0)}` : money(v, v % 100 !== 0);
export const value = (f, key) => String(f.get(key) ?? '');
export const qtyInput = (f, key) => Number(value(f, key));
export const humanError = (e) => e instanceof Error ? e.message : 'Nothing was saved. Please try again.';
export const fieldDate = (f) => value(f, 'date') || today();
export const matchText = (q, ...values) => values.some(v => v.toLocaleLowerCase().includes(q.trim().toLocaleLowerCase()));
export function DatePicker({ range, onChange }) {
    const end = today();
    return _jsx(DateControl, { value: range, onChange: onChange, bounds: { start: '2000-01-01', end }, presets: storePresets(end), maxDays: 366 });
}
export function Field({ label, children, help, wide }) {
    return _jsxs("label", { className: `pos-field ${wide ? 'field-wide' : ''}`, children: [_jsx("span", { children: label }), children, help && _jsx("small", { children: help })] });
}
export function DateField({ label = 'Business date', min, start }) {
    return _jsx(Field, { label: label, children: _jsx("input", { type: "date", name: "date", defaultValue: start ?? today(), max: today(), min: min ?? '2000-01-01', required: true }) });
}
export function AmountInput({ name = 'amount', initial, required }) {
    return _jsx("input", { inputMode: "decimal", name: name, placeholder: "0.00", defaultValue: initial, maxLength: 13, required: required });
}
export function MethodOptions() { return TENDERS.map(t => _jsx("option", { value: t.id, children: t.name }, t.id)); }
export function Warning({ children, tone = 'warning' }) {
    return _jsxs("div", { className: `pos-warning pos-warning-${tone}`, role: tone === 'error' ? 'alert' : undefined, children: [_jsx(AlertTriangle, { size: 17 }), _jsx("div", { children: children })] });
}
export function SearchBox({ placeholder, term, onTerm }) {
    return _jsxs("label", { className: "pos-search", children: [_jsx(Search, { size: 17 }), _jsx("span", { className: "sr-only", children: placeholder }), _jsx("input", { type: "search", placeholder: placeholder, value: term, onChange: e => onTerm(e.target.value) })] });
}
export function PosPanel({ title, description, action, children, className = '' }) {
    return _jsxs("section", { className: `panel pos-panel ${className}`, "aria-label": title, children: [_jsx(PanelTitle, { title: title, description: description, action: action }), children] });
}
export function Table({ heads, rows, label, empty = 'Nothing to show yet.', limit = 12 }) {
    const [paging, setPaging] = useState({ page: 0, rows });
    const pages = Math.max(1, Math.ceil(rows.length / limit)), page = Math.min(pages - 1, paging.rows === rows ? paging.page : 0);
    if (!rows.length)
        return _jsx("div", { className: "pos-empty", children: empty });
    return _jsxs(_Fragment, { children: [_jsx("div", { className: "table-scroll", children: _jsxs("table", { className: "pos-table", "aria-label": label, children: [_jsx("thead", { children: _jsx("tr", { children: heads.map((h, i) => _jsx("th", { scope: "col", children: h || _jsx("span", { className: "sr-only", children: "Actions" }) }, i)) }) }), _jsx("tbody", { children: rows.slice(page * limit, (page + 1) * limit).map(r => _jsx("tr", { children: r.cells.map((cell, i) => _jsx("td", { children: cell }, i)) }, r.key)) })] }) }), pages > 1 && _jsxs("div", { className: "table-footer", children: [_jsxs("span", { children: ["Showing ", num(page * limit + 1), "\u2013", num(Math.min(rows.length, (page + 1) * limit)), " of ", num(rows.length)] }), _jsxs("div", { className: "table-pages", children: [_jsx("button", { type: "button", className: "icon-button", "aria-label": "Previous page", disabled: page === 0, onClick: () => setPaging({ page: page - 1, rows }), children: _jsx(ChevronLeft, { size: 17 }) }), _jsxs("span", { children: [page + 1, " / ", pages] }), _jsx("button", { type: "button", className: "icon-button", "aria-label": "Next page", disabled: page >= pages - 1, onClick: () => setPaging({ page: page + 1, rows }), children: _jsx(ChevronRight, { size: 17 }) })] })] })] });
}
export function LinkButton({ onClick, children, label }) {
    return _jsxs("button", { type: "button", className: "pos-link", "aria-label": label, onClick: onClick, children: [children, _jsx(ArrowRight, { size: 14 })] });
}
export function PostingForm({ children, action, submit, onSuccess, disabled, danger }) {
    const { writable, busy, write } = usePos();
    const [error, setError] = useState('');
    const post = async (e) => {
        e.preventDefault();
        if (busy || !writable || disabled)
            return;
        const f = new FormData(e.currentTarget);
        setError('');
        try {
            const result = await write(action(f));
            onSuccess(result.ref);
        }
        catch (e) {
            setError(humanError(e));
        }
    };
    return _jsxs("form", { onSubmit: post, className: "pos-form", children: [_jsx("div", { className: "pos-form-fields", children: children }), error && _jsx(Warning, { tone: "error", children: error }), _jsx("div", { className: "pos-form-actions", children: _jsx("button", { className: `button ${danger ? 'danger-button' : 'primary-button'}`, disabled: !writable || busy || disabled, children: busy ? 'Saving…' : submit }) })] });
}
export function Tag({ children, tone = 'neutral' }) {
    return _jsxs("span", { className: `pos-tag tag-${tone}`, children: [_jsx("i", { className: "dot" }), children] });
}
