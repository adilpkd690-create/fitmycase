import { PDFDocument, StandardFonts, rgb } from '/vendor/pdf-lib.js';
import JsBarcode from '/vendor/jsbarcode.js';
const pt = (mm) => mm * 72 / 25.4;
const safe = (s) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
const fit = (text, font, max, size) => {
    let out = safe(text), fontSize = size;
    while (out && font.widthOfTextAtSize(out, fontSize) > max && fontSize > 5)
        fontSize -= .25;
    while (out && font.widthOfTextAtSize(out, fontSize) > max)
        out = out.slice(0, -1);
    return { text: out, fontSize };
};
function barcodePng(code) {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, code, { format: 'CODE128', lineColor: '#111111', background: '#ffffff', width: 1.2, height: 58, displayValue: true, font: 'Arial', fontSize: 11, margin: 3 });
    return canvas;
}
export async function createBarcodeLabelsPdf(items, copies, includePrice, widthMm, heightMm) {
    if (!items.length)
        throw Error('Choose at least one product for barcode labels.');
    if (!Number.isInteger(copies) || copies < 1 || copies > 10)
        throw Error('Choose 1–10 copies per SKU.');
    if (!Number.isFinite(widthMm) || widthMm < 25 || widthMm > 110 || !Number.isFinite(heightMm) || heightMm < 18 || heightMm > 150)
        throw Error('Enter a label width of 25–110 mm and height of 18–150 mm.');
    if (items.some(x => !x.barcode || !x.sku || !x.name))
        throw Error('A selected item is missing its SKU or barcode.');
    const pdf = await PDFDocument.create();
    pdf.setTitle('Mobile Craft · Barcode labels');
    pdf.setSubject('Product barcode labels for 4BarCode');
    pdf.setCreator('Mobile Craft POS');
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const w = pt(widthMm), h = pt(heightMm), pad = pt(2), bottom = includePrice ? pt(5) : pt(2);
    for (const item of items) {
        for (let i = 0; i < copies; i++) {
            const page = pdf.addPage([w, h]);
            page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: rgb(1, 1, 1) });
            const title = fit(item.name, bold, w - pad * 2, 8.5);
            page.drawText(title.text, { x: pad, y: h - pad - title.fontSize, size: title.fontSize, font: bold, color: rgb(.08, .08, .08) });
            const sku = fit(item.sku, regular, w - pad * 2, 6.5);
            page.drawText(sku.text, { x: pad, y: h - pad - pt(4.2), size: sku.fontSize, font: regular, color: rgb(.25, .25, .25) });
            const canvas = barcodePng(item.barcode);
            const imageBlob = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('Could not render the barcode image.')), 'image/png'));
            const png = await pdf.embedPng(new Uint8Array(await imageBlob.arrayBuffer()));
            const boxX = pad, boxY = includePrice ? bottom + pt(1) : pad, boxW = w - pad * 2, boxH = h - pt(11.5) - boxY;
            const scale = Math.min(boxW / png.width, boxH / png.height);
            const drawW = png.width * scale, drawH = png.height * scale;
            page.drawImage(png, { x: (w - drawW) / 2, y: boxY + (boxH - drawH) / 2, width: drawW, height: drawH });
            if (includePrice) {
                const price = `Rs. ${(item.price_pa / 100).toFixed(2)}`;
                const p = fit(price, bold, w - pad * 2, 7.5);
                page.drawText(p.text, { x: (w - bold.widthOfTextAtSize(p.text, p.fontSize)) / 2, y: pad, size: p.fontSize, font: bold, color: rgb(.08, .08, .08) });
            }
        }
    }
    return new Blob([await pdf.save()], { type: 'application/pdf' });
}
export function downloadBarcodeLabelsPdf(blob) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url;
    a.download = 'mobile-craft-barcode-labels.pdf';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export async function shareBarcodeLabelsPdf(blob) {
    const file = new File([blob], 'mobile-craft-barcode-labels.pdf', { type: 'application/pdf' });
    const nav = navigator;
    if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: 'Mobile Craft barcode labels', text: 'Product barcode labels · Open with 4BarCode to print.' });
        return 'shared';
    }
    downloadBarcodeLabelsPdf(blob);
    return 'downloaded';
}
