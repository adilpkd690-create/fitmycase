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

function barcodeCanvas(code, sku, heightMm) {
    const canvas = document.createElement('canvas');
    try {
        JsBarcode(canvas, String(code), {
            format: 'CODE128', lineColor: '#111111', background: '#ffffff',
            width: 1.2, height: Math.max(24, Math.min(58, heightMm * 2.4)),
            displayValue: true, font: 'Arial',
            fontSize: Math.max(6, Math.min(11, heightMm * 0.36)), margin: 2
        });
    } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown barcode rendering error';
        throw new Error(`Barcode rendering failed for SKU ${safe(sku)}: ${detail}`);
    }
    return canvas;
}

function pngBytesFromCanvas(canvas, sku) {
    if (typeof canvas.toDataURL !== 'function') {
        throw new Error('This browser cannot export the barcode image. Open Mobile Craft in Chrome and retry.');
    }
    let dataUrl;
    try {
        dataUrl = canvas.toDataURL('image/png');
    } catch (error) {
        const detail = error instanceof Error ? error.message : 'PNG export failed';
        throw new Error(`Could not export barcode PNG for SKU ${safe(sku)}: ${detail}`);
    }
    const prefix = 'data:image/png;base64,';
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith(prefix)) {
        throw new Error(`The barcode image for SKU ${safe(sku)} was not encoded as PNG.`);
    }
    let binary;
    try {
        binary = atob(dataUrl.slice(prefix.length));
    } catch {
        throw new Error(`The barcode PNG for SKU ${safe(sku)} contains invalid Base64 data.`);
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (bytes.length < 40 || signature.some((value, i) => bytes[i] !== value)) {
        throw new Error(`The barcode PNG for SKU ${safe(sku)} is empty or invalid.`);
    }
    return bytes;
}

async function validatePdfBytes(bytes, expectedPages, widthMm, heightMm, embeddedImages) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 500) {
        throw new Error('The barcode PDF output is empty or incomplete. Please prepare it again.');
    }
    const header = new TextDecoder().decode(bytes.subarray(0, 5));
    const tail = new TextDecoder().decode(bytes.subarray(Math.max(0, bytes.length - 2048)));
    if (header !== '%PDF-' || !tail.includes('%%EOF')) {
        throw new Error('The generated barcode file is not a complete PDF. Please retry.');
    }
    if (embeddedImages !== expectedPages) {
        throw new Error('One or more barcode images could not be embedded in the PDF. No file was prepared.');
    }
    let reopened;
    try {
        reopened = await PDFDocument.load(bytes, { updateMetadata: false });
    } catch (error) {
        const detail = error instanceof Error ? error.message : 'PDF parser rejected the file';
        throw new Error(`PDF integrity check failed: ${detail}`);
    }
    const pages = reopened.getPages();
    if (pages.length !== expectedPages) {
        throw new Error(`PDF integrity check failed: expected ${expectedPages} pages but found ${pages.length}.`);
    }
    const expectedWidth = pt(widthMm), expectedHeight = pt(heightMm);
    for (let index = 0; index < pages.length; index++) {
        const page = pages[index];
        const { width, height } = page.getSize();
        if (!Number.isFinite(width) || !Number.isFinite(height) ||
            Math.abs(width - expectedWidth) > 0.1 || Math.abs(height - expectedHeight) > 0.1) {
            throw new Error(`PDF integrity check failed: label page ${index + 1} has unexpected dimensions.`);
        }
    }
    return bytes;
}

export async function createBarcodeLabelsPdf(items, copies, includePrice, widthMm, heightMm) {
    if (!Array.isArray(items) || !items.length)
        throw new Error('Choose at least one product for barcode labels.');
    if (!Number.isInteger(copies) || copies < 1 || copies > 10)
        throw new Error('Choose 1–10 copies per SKU.');
    if (!Number.isFinite(widthMm) || widthMm < 25 || widthMm > 110 ||
        !Number.isFinite(heightMm) || heightMm < 18 || heightMm > 150)
        throw new Error('Enter a label width of 25–110 mm and height of 18–150 mm.');
    if (items.some(item => !item || !safe(item.barcode) || !safe(item.sku) || !safe(item.name)))
        throw new Error('A selected item is missing its name, SKU or barcode.');

    const expectedPages = items.length * copies;
    const pdf = await PDFDocument.create();
    pdf.setTitle('Mobile Craft · Barcode labels');
    pdf.setSubject('Product barcode labels');
    pdf.setCreator('Mobile Craft POS');
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const width = pt(widthMm), height = pt(heightMm);
    const pad = Math.min(pt(2), height * 0.07);
    const titleSize = Math.min(10, Math.max(6.5, height * 0.15));
    const priceSize = Math.min(7.5, Math.max(5, height * 0.12));
    let embeddedImages = 0;

    for (const item of items) {
        for (let copy = 0; copy < copies; copy++) {
            const page = pdf.addPage([width, height]);
            page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
            const title = fit('Mobile Craft', bold, width - pad * 2, titleSize);
            const titleY = height - pad - title.fontSize;
            page.drawText(title.text, {
                x: (width - bold.widthOfTextAtSize(title.text, title.fontSize)) / 2,
                y: titleY,
                size: title.fontSize, font: bold, color: rgb(.08, .08, .08)
            });

            const canvas = barcodeCanvas(item.barcode, item.sku, heightMm);
            const pngBytes = pngBytesFromCanvas(canvas, item.sku);
            let png;
            try {
                png = await pdf.embedPng(pngBytes);
            } catch (error) {
                const detail = error instanceof Error ? error.message : 'PNG embedding failed';
                throw new Error(`Could not embed barcode for SKU ${safe(item.sku)}: ${detail}`);
            }
            if (!png || !png.width || !png.height)
                throw new Error(`Barcode image for SKU ${safe(item.sku)} has invalid dimensions.`);
            embeddedImages++;

            const boxX = pad;
            const priceBandTop = includePrice ? pad + priceSize + pt(1) : 0;
            const boxY = includePrice ? priceBandTop + pt(1) : pad + pt(0.8);
            const boxW = width - pad * 2;
            const boxTop = titleY - title.fontSize - pt(2);
            const boxH = boxTop - boxY;
            if (boxW <= 0 || boxH <= 0)
                throw new Error('The selected label size leaves no room for the barcode. Increase the label dimensions.');
            const scale = Math.min(boxW / png.width, boxH / png.height);
            const drawW = png.width * scale, drawH = png.height * scale;
            page.drawImage(png, {
                x: (width - drawW) / 2,
                y: boxY + (boxH - drawH) / 2,
                width: drawW, height: drawH
            });
            if (includePrice) {
                const rawPrice = (Number(item.price_pa || 0) / 100).toFixed(2).replace(/\\.00$/, '');
                const price = `${rawPrice}/-`;
                const p = fit(price, bold, width - pad * 2, priceSize);
                page.drawText(p.text, {
                    x: (width - bold.widthOfTextAtSize(p.text, p.fontSize)) / 2,
                    y: pad, size: p.fontSize, font: bold, color: rgb(.08, .08, .08)
                });
            }
        }
    }

    let bytes;
    try {
        bytes = await pdf.save();
    } catch (error) {
        const detail = error instanceof Error ? error.message : 'PDF serialization failed';
        throw new Error(`Could not finish the barcode PDF: ${detail}`);
    }
    await validatePdfBytes(bytes, expectedPages, widthMm, heightMm, embeddedImages);
    return new Blob([bytes], { type: 'application/pdf' });
}
