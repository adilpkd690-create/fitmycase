import { jsx as _jsx, jsxs as _jsxs } from "/vendor/react-jsx-runtime.js";
import { useEffect, useId, useLayoutEffect, useRef, useState } from '/vendor/react.js';
import { CalendarDays, Check, ChevronDown, Layers3, X } from '/vendor/lucide-react.js';
import { CATEGORIES, DEMO_RANGE, PRESETS, dayCount, categoryName, rangeLabel, sameRange } from '../data.js';
function usePopover() {
    const [open, setOpen] = useState(false);
    const root = useRef(null);
    const trigger = useRef(null);
    const id = useId();
    useLayoutEffect(() => {
        if (!open)
            return;
        const popup = root.current?.querySelector('.popover');
        if (!popup)
            return;
        const keepInView = () => {
            popup.style.removeProperty('--popover-shift');
            const bounds = popup.getBoundingClientRect();
            const rightEdge = document.documentElement.clientWidth - 8;
            const shift = bounds.left < 8 ? 8 - bounds.left : bounds.right > rightEdge ? rightEdge - bounds.right : 0;
            popup.style.setProperty('--popover-shift', `${shift}px`);
        };
        keepInView();
        window.addEventListener('resize', keepInView);
        return () => window.removeEventListener('resize', keepInView);
    }, [open]);
    useEffect(() => {
        if (!open)
            return;
        const pointer = (event) => {
            if (event.target instanceof Node && !root.current?.contains(event.target))
                setOpen(false);
        };
        const keys = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
                trigger.current?.focus();
            }
        };
        document.addEventListener('pointerdown', pointer);
        document.addEventListener('keydown', keys);
        return () => {
            document.removeEventListener('pointerdown', pointer);
            document.removeEventListener('keydown', keys);
        };
    }, [open]);
    const close = () => { setOpen(false); trigger.current?.focus(); };
    return { open, setOpen, root, trigger, id, close };
}
export function DateControl({ value, onChange, bounds = DEMO_RANGE, presets = PRESETS, maxDays }) {
    const { open, setOpen, root, trigger, id, close } = usePopover();
    const [draft, setDraft] = useState(value);
    const valid = Boolean(draft.start && draft.end && draft.start >= bounds.start && draft.end <= bounds.end && draft.start <= draft.end && (!maxDays || dayCount(draft) <= maxDays));
    const choose = (range) => { onChange(range); close(); };
    return _jsxs("div", { className: "popover-root date-root", ref: root, children: [_jsxs("button", { type: "button", className: "button filter-button date-filter", ref: trigger, "aria-expanded": open, "aria-controls": open ? id : undefined, "aria-label": `Date range: ${rangeLabel(value)}`, onClick: () => { setDraft(value); setOpen(!open); }, children: [_jsx(CalendarDays, { size: 16, className: "control-icon" }), _jsx("span", { children: rangeLabel(value) }), _jsx(ChevronDown, { size: 14, className: `chevron ${open ? 'rotated' : ''}` })] }), open && _jsxs("div", { className: "popover date-popover", id: id, role: "region", "aria-label": "Select a date range", children: [_jsx("div", { className: "popover-title", children: "Date range" }), _jsx("div", { className: "presets", children: presets.map(p => _jsxs("button", { type: "button", className: `option ${sameRange(value, p.range) ? 'option-active' : ''}`, "aria-pressed": sameRange(value, p.range), onClick: () => choose(p.range), children: [p.label, sameRange(value, p.range) && _jsx(Check, { size: 14 })] }, p.label)) }), _jsxs("form", { className: "custom-range", onSubmit: e => { e.preventDefault(); if (valid)
                            choose(draft); }, children: [_jsx("span", { className: "popover-title", children: "Custom range" }), _jsxs("div", { className: "date-fields", children: [_jsxs("label", { children: ["Start date", _jsx("input", { type: "date", value: draft.start, min: bounds.start, max: bounds.end, onChange: e => setDraft({ ...draft, start: e.target.value }), required: true })] }), _jsxs("label", { children: ["End date", _jsx("input", { type: "date", value: draft.end, min: draft.start || bounds.start, max: bounds.end, onChange: e => setDraft({ ...draft, end: e.target.value }), required: true })] })] }), !valid && _jsxs("p", { className: "filter-error", role: "status", children: ["Choose valid dates in order", maxDays ? `, spanning no more than ${maxDays} days` : ", within the demo period", "."] }), _jsx("button", { type: "submit", className: "button primary-button apply-date", disabled: !valid, children: "Apply range" })] })] })] });
}
export function SelectControl({ label, value, options, onChange, icon, className = '' }) {
    const { open, setOpen, root, trigger, id, close } = usePopover();
    const text = options.find(o => o.value === value)?.label ?? value;
    const focusOption = (index) => root.current?.querySelectorAll('.list-option').item(index)?.focus();
    return _jsxs("div", { className: `popover-root ${className}`, ref: root, children: [_jsxs("button", { type: "button", className: "button filter-button select-filter", ref: trigger, "aria-expanded": open, "aria-controls": open ? id : undefined, "aria-label": `${label}: ${text}`, onClick: () => setOpen(!open), onKeyDown: e => {
                    if (!open && ['ArrowDown', 'ArrowUp'].includes(e.key)) {
                        e.preventDefault();
                        setOpen(true);
                        requestAnimationFrame(() => focusOption(e.key === 'ArrowDown' ? 0 : options.length - 1));
                    }
                }, children: [icon, _jsx("span", { children: text }), _jsx(ChevronDown, { size: 14, className: `chevron ${open ? 'rotated' : ''}` })] }), open && _jsxs("div", { className: "popover list-popover", id: id, role: "group", "aria-label": label, children: [_jsx("div", { className: "popover-title", children: label }), options.map((opt, i) => _jsxs("button", { type: "button", className: `option list-option ${value === opt.value ? 'option-active' : ''}`, "aria-pressed": value === opt.value, onClick: () => { onChange(opt.value); close(); }, onKeyDown: e => {
                            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                                e.preventDefault();
                                focusOption((options.length + i + (e.key === 'ArrowDown' ? 1 : -1)) % options.length);
                            }
                            if (e.key === 'Home' || e.key === 'End') {
                                e.preventDefault();
                                focusOption(e.key === 'Home' ? 0 : options.length - 1);
                            }
                        }, children: [_jsxs("span", { className: "option-name", children: [opt.color && _jsx("i", { className: "dot", style: { background: opt.color } }), opt.label] }), value === opt.value && _jsx(Check, { size: 14 })] }, opt.value))] })] });
}
const categoryOptions = [{ value: 'all', label: categoryName('all') }, ...CATEGORIES.map(c => ({ value: c.id, label: c.name, color: c.color }))];
export function SegmentControl({ value, onChange }) {
    return _jsx(SelectControl, { className: "segment-root", label: "Product category", value: value, options: categoryOptions, onChange: onChange, icon: _jsx(Layers3, { size: 16, className: "control-icon" }) });
}
export function Dialog({ title, children, onClose, beforeClose, variant }) {
    const ref = useRef(null);
    const id = useId();
    useEffect(() => {
        if (ref.current && !ref.current.open)
            ref.current.showModal();
    }, []);
    const dismiss = () => { if (beforeClose?.() !== false)
        ref.current?.close(); };
    return _jsx("dialog", { ref: ref, className: `dialog ${variant ? `dialog-${variant}` : ''}`, "aria-labelledby": id, onClose: onClose, onCancel: e => { if (beforeClose?.() === false)
            e.preventDefault(); }, onClick: e => { if (e.target === e.currentTarget)
            dismiss(); }, children: _jsxs("div", { className: "dialog-content", children: [_jsxs("div", { className: "dialog-heading", children: [_jsx("h2", { id: id, children: title }), _jsx("button", { type: "button", className: "icon-button", onClick: dismiss, "aria-label": "Close dialog", children: _jsx(X, { size: 20 }) })] }), children, _jsx("div", { className: "dialog-print-target" })] }) });
}
