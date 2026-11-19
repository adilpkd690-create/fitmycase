import { PDFDocument } from '/vendor/pdf-lib.js';
import { when, methods } from './api.js';
const PAGE_W = 1240, PAGE_H = 1754;
const money = (pa) => `₹ ${(Number(pa ?? 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const safe = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const dateText = (s) => { try {
    return when(s);
}
catch {
    return s;
} };
async function loadBrandLogo() {
    const image = new Image();
    image.decoding = 'async';
    image.src = '/mobile-craft-logo.jpg';
    await new Promise((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(Error('The Mobile Craft logo could not be loaded. Refresh the shop and try again.')); });
    return image;
}
function newPage(r, index, logo) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw Error('This browser cannot render the invoice PDF.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    ctx.fillStyle = '#171717';
    ctx.textBaseline = 'top';
    const margin = 76;
    let y = 76;
    const brandX = margin + 132, brandWidth = PAGE_W - margin - brandX;
    ctx.drawImage(logo, margin, y, 104, 104);
    ctx.font = 'bold 38px Arial, sans-serif';
    ctx.fillText(safe(r.merchant?.legal_name || `Mobile Craft · ${r.branch}`), brandX, y, brandWidth);
    y += 48;
    ctx.font = '22px Arial, sans-serif';
    ctx.fillStyle = '#454545';
    const address = safe(r.merchant?.address);
    if (address) {
        y = drawWrapped(ctx, address, brandX, y, brandWidth, 27, 2);
    }
    if (r.merchant?.gstin) {
        ctx.fillText(`GSTIN: ${r.merchant.gstin}`, brandX, y, brandWidth);
        y += 29;
    }
    y = Math.max(y, 76 + 104) + 18;
    ctx.fillStyle = '#171717';
    ctx.font = 'bold 28px Arial, sans-serif';
    const title = r.document === 'tax_invoice' ? 'GST TAX INVOICE' : r.document === 'gst_credit_note' ? 'GST CREDIT NOTE' : r.original_number ? 'RETAIL RETURN' : 'RETAIL RECEIPT';
    ctx.fillText(index > 1 ? `${title} · CONTINUED` : title, margin, y + 5);
    y += 52;
    ctx.font = '22px Arial, sans-serif';
    ctx.fillStyle = '#333';
    ctx.fillText(`Invoice: ${safe(r.number)}`, margin, y);
    ctx.fillText(`Date: ${dateText(r.posted_at)}`, PAGE_W / 2, y);
    y += 34;
    if (r.buyer?.name) {
        y = drawWrapped(ctx, `Customer: ${safe(r.buyer.name)}`, margin, y, PAGE_W - 2 * margin, 29, 1);
    }
    if (r.buyer?.address) {
        y = drawWrapped(ctx, `Address: ${safe(r.buyer.address)}`, margin, y, PAGE_W - 2 * margin, 29, 2);
    }
    if (r.buyer?.gstin) {
        ctx.fillText(`Customer GSTIN: ${r.buyer.gstin}`, margin, y);
        y += 32;
    }
    if (r.buyer?.pos) {
        ctx.fillText(`Place of supply: ${r.buyer.pos}`, margin, y);
        y += 32;
    }
    if (r.original_number) {
        ctx.fillText(`Original invoice: ${r.original_number}`, margin, y);
        y += 32;
    }
    if (r.reason) {
        y = drawWrapped(ctx, `Reason: ${safe(r.reason)}`, margin, y, PAGE_W - 2 * margin, 28, 2);
    }
    y += 18;
    ctx.fillStyle = '#f1f2f4';
    ctx.fillRect(margin, y, PAGE_W - 2 * margin, 46);
    ctx.fillStyle = '#222';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText('ITEM / SKU', margin + 12, y + 12);
    ctx.fillText('QTY', PAGE_W - 430, y + 12);
    ctx.fillText('RATE', PAGE_W - 320, y + 12);
    ctx.fillText('AMOUNT', PAGE_W - 180, y + 12);
    y += 58;
    return { canvas, ctx, y };
}
function drawWrapped(ctx, text, x, y, max, lineH, maxLines = 3) {
    const words = text.split(/\s+/);
    let line = '', lines = 0;
    for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > max && line) {
            ctx.fillText(line, x, y);
            y += lineH;
            lines++;
            line = word;
            if (lines >= maxLines)
                return y;
        }
        else
            line = test;
    }
    if (line && lines < maxLines) {
        ctx.fillText(line, x, y);
        y += lineH;
    }
    return y;
}
function row(page, line) {
    const { ctx, canvas } = page, margin = 76;
    let y = page.y;
    if (page.y > canvas.height - 300)
        return true;
    ctx.fillStyle = '#171717';
    ctx.font = 'bold 22px Arial, sans-serif';
    y = drawWrapped(ctx, safe(line.name), margin + 10, y, 650, 29, 2);
    ctx.font = '17px Arial, sans-serif';
    ctx.fillStyle = '#686868';
    ctx.fillText(`SKU ${safe(line.sku)}`, margin + 10, y);
    y += 25;
    if (line.warranty_days && line.warranty_days > 0) {
        ctx.fillStyle = '#244b37';
        ctx.font = 'bold 17px Arial, sans-serif';
        const until = line.warranty_until ? ` · valid until ${safe(line.warranty_until)}` : '';
        y = drawWrapped(ctx, `Warranty: ${line.warranty_days} days${until}`, margin + 10, y, 650, 23, 2);
        if (line.warranty_terms) {
            ctx.font = '16px Arial, sans-serif';
            ctx.fillStyle = '#454545';
            y = drawWrapped(ctx, `Terms: ${safe(line.warranty_terms)}`, margin + 10, y, 650, 22, 2);
        }
    }
    if (line.hsn) {
        ctx.font = '15px Arial, sans-serif';
        ctx.fillStyle = '#777';
        y = drawWrapped(ctx, `HSN ${line.hsn} · GST ${((line.gst_bps ?? 0) / 100).toFixed(2)}%`, margin + 10, y, 650, 20, 1);
    }
    ctx.fillStyle = '#222';
    ctx.font = '20px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${line.qty}`, PAGE_W - 420, page.y + 3);
    ctx.fillText(money(line.price_pa), PAGE_W - 290, page.y + 3);
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText(money(line.total_pa), PAGE_W - 88, page.y + 3);
    ctx.textAlign = 'left';
    const h = Math.max(y - page.y, 54) + 14;
    ctx.strokeStyle = '#e2e2e2';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, page.y + h);
    ctx.lineTo(PAGE_W - margin, page.y + h);
    ctx.stroke();
    page.y += h + 12;
    return false;
}
function totals(page, r) {
    const { ctx, canvas } = page;
    let y = page.y + 18;
    const x = PAGE_W - 455;
    if (r.net_pa != null) {
        ctx.font = '20px Arial';
        ctx.fillStyle = '#333';
        ctx.fillText(`Taxable value: ${money(r.net_pa)}`, x, y);
        y += 32;
    }
    if (r.cgst_pa || r.sgst_pa || r.igst_pa) {
        for (const [label, val] of [['CGST', r.cgst_pa], ['SGST', r.sgst_pa], ['IGST', r.igst_pa]]) {
            if (val) {
                ctx.fillText(`${label}: ${money(val)}`, x, y);
                y += 31;
            }
        }
    }
    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = '#161616';
    ctx.fillText(`TOTAL: ${money(r.total_pa)}`, x, y + 6);
    y += 55;
    ctx.font = '20px Arial';
    ctx.fillStyle = '#333';
    for (const m of methods) {
        const v = r.payments?.[m.id] ?? 0;
        if (v > 0) {
            ctx.fillText(`${m.label}: ${money(v)}`, x, y);
            y += 30;
        }
    }
    if (r.initial_due_pa) {
        ctx.fillText(`Credit due: ${money(r.initial_due_pa)}`, x, y);
        y += 30;
    }
    if (r.refund_pa) {
        ctx.fillText(`Refund: ${money(r.refund_pa)}${r.refund_method ? ` (${r.refund_method.toUpperCase()})` : ''}`, x, y);
        y += 30;
    }
    if (r.credit_reversed_pa) {
        ctx.fillText(`Credit reversed: ${money(r.credit_reversed_pa)}`, x, y);
        y += 30;
    }
    y += 52;
    ctx.font = '17px Arial';
    ctx.fillStyle = '#666';
    if (r.document === 'tax_invoice')
        ctx.fillText('Authorised signature: ______________________________', 76, y);
    else
        ctx.fillText('Thank you for shopping with Mobile Craft.', 76, y);
    ctx.fillText('Generated by Mobile Craft POS', 76, canvas.height - 65);
    ctx.textAlign = 'right';
    ctx.fillText('Keep this invoice for warranty and service enquiries.', PAGE_W - 76, canvas.height - 65);
    ctx.textAlign = 'left';
}
export async function createReceiptPdf(r) {
    if (typeof document === 'undefined')
        throw Error('PDF export is available in the browser.');
    const logo = await loadBrandLogo();
    const pages = [];
    let p = newPage(r, 1, logo);
    pages.push(p);
    for (const line of r.lines) {
        if (row(p, line)) {
            p = newPage(r, pages.length + 1, logo);
            pages.push(p);
            row(p, line);
        }
    }
    if (p.y > PAGE_H - 430) {
        p = newPage(r, pages.length + 1, logo);
        pages.push(p);
    }
    totals(p, r);
    const pdf = await PDFDocument.create();
    pdf.setTitle(`${r.number} · ${r.merchant?.legal_name ?? 'Mobile Craft'}`);
    pdf.setSubject('Mobile Craft sales invoice / receipt');
    pdf.setCreator('Mobile Craft POS');
    for (const pg of pages) {
        const url = pg.canvas.toDataURL('image/png'), data = Uint8Array.from(atob(url.split(',')[1]), c => c.charCodeAt(0));
        const image = await pdf.embedPng(data), page = pdf.addPage([595.28, 841.89]);
        page.drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 });
    }
    const bytes = await pdf.save();
    return new Blob([bytes], { type: 'application/pdf' });
}
export function downloadReceiptPdf(blob, filename) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function shareReceiptPdf(blob, r) {
    const filename = `${r.number.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`, file = new File([blob], filename, { type: 'application/pdf' });
    const nav = navigator;
    if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: `Mobile Craft invoice ${r.number}`, text: `${r.merchant?.legal_name ?? 'Mobile Craft'} · ${r.number} · ${money(r.total_pa)}` });
        return 'shared';
    }
    downloadReceiptPdf(blob, filename);
    return 'downloaded';
}
