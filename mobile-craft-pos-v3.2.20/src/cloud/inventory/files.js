import { strFromU8, strToU8, unzipSync, zipSync } from '/vendor/fflate.js';
import { csvText } from '../business.js';
const give = (blob, name) => { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); };
const bytesBlob = (bytes, mime) => new Blob([new Uint8Array(bytes).buffer], { type: mime });
export function parseCsv(raw) {
    const rows = [];
    let row = [], cell = '', quoted = false, closed = false;
    const push = () => { row.push(cell); cell = ''; closed = false; if (row.length > 40)
        throw Error('Too many columns.'); };
    const line = () => { push(); if (row.some(s => s.trim()))
        rows.push(row.map(text => ({ text, numeric: false }))); row = []; if (rows.length > 51)
        throw Error('Use up to 50 items per import.'); };
    const s = raw.replace(/^\uFEFF/, '');
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (quoted) {
            if (c === '"') {
                if (s[i + 1] === '"') {
                    cell += '"';
                    i++;
                }
                else {
                    quoted = false;
                    closed = true;
                }
            }
            else
                cell += c;
            continue;
        }
        if (c === ',') {
            push();
            continue;
        }
        if (c === '\r' || c === '\n') {
            if (c === '\r' && s[i + 1] === '\n')
                i++;
            line();
            continue;
        }
        if (closed)
            throw Error('Unexpected text after a quoted CSV field.');
        if (c === '"') {
            if (cell)
                throw Error('Invalid CSV quote.');
            quoted = true;
            continue;
        }
        cell += c;
    }
    if (quoted)
        throw Error('An imported CSV field is not closed.');
    if (row.length || cell || closed)
        line();
    return rows;
}
const xml = (x) => {
    const str = strFromU8(x);
    if (/<!DOCTYPE|<!ENTITY/i.test(str))
        throw Error('Unsupported Excel XML.');
    const d = new DOMParser().parseFromString(str, 'application/xml');
    if (d.querySelector('parsererror'))
        throw Error('Could not read Excel XML. Use the supplied template.');
    return d;
};
const elements = (d, t) => Array.from(d.getElementsByTagNameNS('*', t));
export function parseWorkbook(bytes) {
    let entries = 0, total = 0;
    const files = unzipSync(bytes, { filter: f => {
            entries++;
            total += f.originalSize;
            if (entries > 260 || total > 8_000_000 || f.originalSize > 3_000_000 || /vbaProject|externalLinks|embeddings|\.\.\//i.test(f.name))
                throw Error('Only a small local .xlsx workbook without macros or external links is supported.');
            return ['xl/worksheets/sheet1.xml', 'xl/sharedStrings.xml'].includes(f.name);
        } });
    if (!files['xl/worksheets/sheet1.xml'])
        throw Error('Put Inventory in the first worksheet of a plain .xlsx file.');
    const sheet = xml(files['xl/worksheets/sheet1.xml']), share = files['xl/sharedStrings.xml'] ? elements(xml(files['xl/sharedStrings.xml']), 'si').map(el => elements(el, 't').map(x => x.textContent).join('')) : [];
    if (elements(sheet, 'f').length)
        throw Error('Import accepts values only. Paste formulas as values first.');
    const out = [];
    for (const r of elements(sheet, 'row')) {
        const row = [];
        for (const c of elements(r, 'c')) {
            const address = c.getAttribute('r') ?? '', letters = /^([A-Z]{1,3})\d+$/.exec(address)?.[1];
            if (!letters)
                throw Error('An Excel cell address is invalid.');
            const pos = [...letters].reduce((a, b) => a * 26 + b.charCodeAt(0) - 64, 0) - 1;
            if (pos >= 40)
                throw Error('Too many worksheet columns.');
            const typ = c.getAttribute('t') ?? 'n', v = elements(c, 'v')[0]?.textContent ?? '';
            if (!['inlineStr', 'n', 's', 'str'].includes(typ))
                throw Error('Use text or numeric cells, not errors, date objects or booleans.');
            const text = typ === 'inlineStr' ? elements(c, 't').map(x => x.textContent).join('') : typ === 's' ? share[Number(v)] : v;
            if (text == null)
                throw Error('Invalid Excel shared string.');
            row[pos] = { text, numeric: typ === 'n' && text !== '' };
        }
        if (row.some(c => c?.text.trim()))
            out.push(Array.from(row, c => c ?? { text: '', numeric: false }));
        if (out.length > 51)
            throw Error('Use up to 50 items per import.');
    }
    return out;
}
export async function spreadsheet(file) {
    if (file.size < 1 || file.size > 1_500_000)
        throw Error('Use a CSV or .xlsx file under 1.5 MB.');
    if (/\.csv$/i.test(file.name))
        return parseCsv(await file.text());
    if (/\.xlsx$/i.test(file.name))
        return parseWorkbook(new Uint8Array(await file.arrayBuffer()));
    throw Error('Choose a CSV or .xlsx workbook, not old .xls or macro-enabled files.');
}
const esc = (s) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const col = (i) => i < 26 ? String.fromCharCode(65 + i) : col(Math.floor(i / 26) - 1) + col(i % 26);
const rel = 'http://schemas.openxmlformats.org/package/2006/relationships', ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', office = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export function workbook(rows) {
    const data = rows.map((r, i) => `<row r="${i + 1}">${r.map((c, k) => { const ref = `${col(k)}${i + 1}`; return typeof c === 'number' && Number.isFinite(c) ? `<c r="${ref}"><v>${c}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(String(c ?? ''))}</t></is></c>`; }).join('')}</row>`).join('');
    const f = {
        '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
        '_rels/.rels': `<Relationships xmlns="${rel}"><Relationship Id="rId1" Type="${office}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
        'xl/workbook.xml': `<workbook xmlns="${ns}" xmlns:r="${office}"><sheets><sheet name="Inventory" sheetId="1" r:id="rId1"/></sheets></workbook>`,
        'xl/_rels/workbook.xml.rels': `<Relationships xmlns="${rel}"><Relationship Id="rId1" Type="${office}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
        'xl/worksheets/sheet1.xml': `<worksheet xmlns="${ns}"><sheetData>${data}</sheetData></worksheet>`
    };
    return zipSync(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, strToU8('<?xml version="1.0" encoding="UTF-8"?>' + v)])), { level: 6 });
}
export async function exportFile(type, name, title, subtitle, rows) {
    if (type === 'csv') {
        give(new Blob([csvText(rows)], { type: 'text/csv;charset=utf-8' }), `${name}.csv`);
        return;
    }
    if (type === 'xlsx') {
        give(bytesBlob(workbook(rows), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), `${name}.xlsx`);
        return;
    }
    if (rows.length > 501)
        throw Error('PDF limit: 500 data rows. Narrow the filters or use Excel/CSV.');
    const { PDFDocument } = await import('/vendor/pdf-lib.js'), pdf = await PDFDocument.create();
    pdf.setTitle(title);
    pdf.setProducer('Mobile Craft POS');
    const w = 1680, h = 1190, g = 52, rowHeight = 30, per = 30, cols = rows[0]?.length || 1;
    for (let off = 1; off < Math.max(rows.length, 2); off += per) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const c = canvas.getContext('2d');
        if (!c)
            throw Error('Browser could not render the PDF canvas.');
        c.fillStyle = '#fff';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#1d1b2e';
        c.font = 'bold 44px sans-serif';
        c.fillText(title, g, 70, w - 2 * g);
        c.fillStyle = '#514c66';
        c.font = '22px sans-serif';
        c.fillText(subtitle, g, 106, w - 2 * g);
        const first = (w - 2 * g) / Math.max(cols, 5) * 1.55, rem = (w - 2 * g - first) / Math.max(cols - 1, 1);
        const draw = (r, y, head) => {
            if (head) {
                c.fillStyle = '#efebff';
                c.fillRect(g, y - 23, w - 2 * g, 28);
            }
            else if (Math.floor(y / rowHeight) % 2 === 0) {
                c.fillStyle = '#f7f7fb';
                c.fillRect(g, y - 23, w - 2 * g, 28);
            }
            c.fillStyle = '#171525';
            c.font = `${head ? 'bold ' : ''}${cols > 10 ? 15 : 19}px sans-serif`;
            r.forEach((v, k) => c.fillText(String(v ?? '—').replace(/\s+/g, ' '), g + 7 + (k === 0 ? 0 : first + (k - 1) * rem), y, Math.max((k === 0 ? first : rem) - 14, 20)));
        };
        draw(rows[0] ?? [], 155, true);
        rows.slice(off, off + per).forEach((r, i) => draw(r, 155 + (i + 1) * rowHeight, false));
        if (rows.length < 2) {
            c.font = '24px sans-serif';
            c.fillText('No matching records', g, 209);
        }
        c.fillStyle = '#514c66';
        c.font = '20px sans-serif';
        c.fillText(`Mobile Craft · Page ${Math.floor((off - 1) / per) + 1} of ${Math.max(1, Math.ceil((rows.length - 1) / per))}`, g, h - 37);
        const content = await new Promise((resolve, reject) => canvas.toBlob(x => x ? resolve(x) : reject(Error('Could not create PDF page.')), 'image/jpeg', 0.91));
        const img = await pdf.embedJpg(await content.arrayBuffer()), pg = pdf.addPage([842, 595]);
        pg.drawImage(img, { x: 0, y: 0, width: 842, height: 595 });
        canvas.width = 0;
        canvas.height = 0;
    }
    give(bytesBlob(await pdf.save(), 'application/pdf'), `${name}.pdf`);
}
export async function thumbnail(file) {
    if (file.size > 8_000_000 || !/^image\/(jpeg|png|webp)$/.test(file.type))
        throw Error('Choose a JPEG, PNG or WebP photo under 8 MB.');
    const bmp = await createImageBitmap(file);
    try {
        if (!bmp.width || !bmp.height || bmp.width * bmp.height > 32_000_000)
            throw Error('Choose a smaller photo.');
        const ratio = Math.min(1, 400 / Math.max(bmp.width, bmp.height)), canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bmp.width * ratio));
        canvas.height = Math.max(1, Math.round(bmp.height * ratio));
        const c = canvas.getContext('2d');
        if (!c)
            throw Error('Could not resize photo.');
        c.fillStyle = 'white';
        c.fillRect(0, 0, canvas.width, canvas.height);
        c.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        for (const quality of [.72, .56, .38]) {
            const s = canvas.toDataURL('image/jpeg', quality);
            const encoded = s.split(',')[1];
            if (s.startsWith('data:image/jpeg;') && encoded?.length <= 64000)
                return encoded;
        }
        throw Error('Photo is too detailed for the thumbnail limit. Crop and try again.');
    }
    finally {
        bmp.close();
    }
}
