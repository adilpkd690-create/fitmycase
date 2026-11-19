import { jsx as _jsx, jsxs as _jsxs } from "/vendor/react-jsx-runtime.js";
import { useLayoutEffect, useRef, useState } from '/vendor/react.js';
import { createPortal } from '/vendor/react-dom.js';
import JsBarcode from '/vendor/jsbarcode.js';
import { dateLabel } from '../data.js';
import { TENDERS, shortProduct } from './engine.js';
import { inr } from './ui.js';
let restoreTimer;
/** Render print content inside the active modal. Portaling it to document.body
 * while a native <dialog> is open leaves it outside the modal's top layer and
 * Android Chrome can produce a completely blank print preview. */
export function PrintPortal({ children }) {
    const [target, setTarget] = useState(null);
    useLayoutEffect(() => {
        const host = document.querySelector('dialog[open] .dialog-print-target')
            ?? document.querySelector('dialog .dialog-print-target')
            ?? document.body;
        setTarget(host);
    }, []);
    return target ? createPortal(children, target) : null;
}
export function printDocument(mode) {
    document.getElementById('mc-pos-page-style')?.remove();
    const style = document.createElement('style');
    style.id = 'mc-pos-page-style';
    style.textContent = `@page { size: ${mode === 'a4' || mode === 'label' ? 'A4 portrait' : `${mode}mm 210mm`}; margin: ${mode === 'a4' || mode === 'label' ? '12mm' : '2mm'}; }`;
    document.head.appendChild(style);
    document.body.dataset.posPrint = mode;
    const cleanup = () => { delete document.body.dataset.posPrint; style.remove(); window.removeEventListener('afterprint', cleanup); if (restoreTimer)
        window.clearTimeout(restoreTimer); };
    window.addEventListener('afterprint', cleanup, { once: true });
    // Browsers that block printing in an embedded frame may not emit afterprint.
    restoreTimer = window.setTimeout(cleanup, 120_000);
    try {
        window.print();
    }
    catch {
        cleanup();
    }
}
export function ReceiptPrint({ sale, due }) {
    return _jsx(PrintPortal, { children: _jsxs("article", { className: "pos-print pos-receipt-print", children: [_jsxs("header", { children: [_jsx("h1", { children: sale.profile.name }), sale.profile.address && _jsx("p", { children: sale.profile.address }), sale.profile.phone && _jsx("p", { children: sale.profile.phone })] }), _jsxs("div", { className: "receipt-print-meta", children: [_jsxs("b", { children: ["Sales receipt \u00B7 ", sale.number] }), _jsx("span", { children: dateLabel(sale.date, true) }), _jsx("span", { children: sale.customer })] }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Item" }), _jsx("th", { children: "Qty" }), _jsx("th", { children: "Amount" })] }) }), _jsx("tbody", { children: sale.items.map(i => _jsxs("tr", { children: [_jsx("td", { children: i.name }), _jsx("td", { children: i.qty }), _jsx("td", { children: inr(i.net) })] }, i.id)) })] }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "Subtotal" }), _jsx("dd", { children: inr(sale.subtotal) })] }), sale.discount > 0 && _jsxs("div", { children: [_jsx("dt", { children: "Discount" }), _jsx("dd", { children: inr(sale.discount) })] }), _jsxs("div", { children: [_jsx("dt", { children: _jsx("b", { children: "Invoice total" }) }), _jsx("dd", { children: _jsx("b", { children: inr(sale.total) }) })] }), TENDERS.filter(t => sale.payments[t.id] > 0).map(t => _jsxs("div", { children: [_jsxs("dt", { children: [t.name, " at checkout"] }), _jsx("dd", { children: inr(sale.payments[t.id]) })] }, t.id)), sale.credit > 0 && _jsxs("div", { children: [_jsx("dt", { children: "Original balance" }), _jsx("dd", { children: inr(sale.credit) })] }), due !== sale.credit && _jsxs("div", { children: [_jsx("dt", { children: "Current balance" }), _jsx("dd", { children: inr(due) })] })] }), _jsx("p", { className: "receipt-print-note", children: "Retail receipt \u00B7 Not a GST tax invoice" })] }) });
}
export function BarcodeGraphic({ code }) {
    const svg = useRef(null);
    useLayoutEffect(() => { if (svg.current)
        JsBarcode(svg.current, code, { format: 'CODE128', lineColor: '#151220', background: '#fff', width: 1.75, height: 48, fontSize: 13, margin: 8 }); }, [code]);
    return _jsx("svg", { ref: svg, className: "pos-barcode", role: "img", "aria-label": `Barcode ${code}` });
}
export function LabelPrint({ product }) {
    return _jsx(PrintPortal, { children: _jsxs("article", { className: "pos-print pos-label-print", children: [_jsx("b", { children: shortProduct(product) }), _jsx(BarcodeGraphic, { code: product.barcode }), _jsx("strong", { children: inr(product.price) })] }) });
}
