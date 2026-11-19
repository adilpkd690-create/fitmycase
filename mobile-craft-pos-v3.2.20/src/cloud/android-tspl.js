const LABEL_WIDTH_MM = 38.1;
const LABEL_HEIGHT_MM = 24.892;
const LABEL_GAP_MM = 2.03;
const MAX_BARCODE_LENGTH = 9;
const MAX_LABELS_PER_BATCH = 100;

function safeBarcode(item) {
    const code = String(item?.barcode ?? '').normalize('NFKC').replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z0-9._/+%$-]{1,9}$/.test(code)) {
        throw new Error(`${String(item?.sku || item?.name || 'A product')}: direct HQ450L printing needs a short barcode of 1–9 supported characters. Use Generate short code (MC + 6 digits).`);
    }
    return code;
}

function priceText(item) {
    const pa = Number(item?.price_pa ?? item?.price ?? 0);
    if (!Number.isSafeInteger(pa) || pa < 0) {
        throw new Error(`${String(item?.sku || item?.name || 'A product')}: selling price is invalid.`);
    }
    const value = (pa / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return `${value}/-`;
}

function textCommand(x, y, text) {
    const width = Math.max(1, String(text).length) * 12;
    const left = Math.max(0, Math.round((304 - width) / 2));
    return `TEXT ${left},${y},"0",0,1,1,"${text}"\r\n`;
}

function labelCommand(item, includePrice) {
    const code = safeBarcode(item);
    const price = priceText(item);
    let out = 'CLS\r\n';
    out += textCommand(0, 8, 'Mobile Craft');
    out += `BARCODE 10,38,"128",78,1,0,2,4,"${code}"\r\n`;
    if (includePrice) out += textCommand(0, 155, price);
    out += 'PRINT 1,1\r\n';
    return out;
}

export function buildTsplLabelCommands(items, copies = 1, includePrice = true) {
    if (!Array.isArray(items) || !items.length) throw new Error('Choose at least one product label.');
    if (!Number.isInteger(copies) || copies < 1 || copies > 10) throw new Error('Copies per product must be between 1 and 10.');
    if (items.length * copies > 1000) throw new Error('Print at most 1,000 labels per job. Split larger jobs into smaller selections.');
    const header = `SIZE ${LABEL_WIDTH_MM} mm,${LABEL_HEIGHT_MM} mm\r\nGAP ${LABEL_GAP_MM} mm,0 mm\r\nDIRECTION 0\r\nREFERENCE 0,0\r\n`;
    const commands = items.flatMap(item => Array.from({ length: copies }, () => labelCommand(item, includePrice)));
    return { header, commands };
}

export function androidBluetoothPrintAvailable() {
    return typeof navigator !== 'undefined' && !!navigator.serial?.requestPort && !!navigator.serial?.getPorts;
}

export async function printAndroidBluetoothLabels(items, copies = 1, includePrice = true) {
    if (!androidBluetoothPrintAvailable()) {
        throw new Error('Android Bluetooth direct print needs Chrome 138 or newer with Web Serial support. Open Mobile Craft in Chrome, not an in-app browser.');
    }
    const { header, commands } = buildTsplLabelCommands(items, copies, includePrice);
    const encoder = new TextEncoder();
    const portList = await navigator.serial.getPorts();
    const port = portList.length === 1 ? portList[0] : await navigator.serial.requestPort();
    let writer;
    let confirmed = 0;
    try {
        await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' });
        if (!port.writable) throw new Error('The selected Bluetooth printer did not expose a writable serial connection.');
        writer = port.writable.getWriter();
        for (let offset = 0; offset < commands.length; offset += MAX_LABELS_PER_BATCH) {
            const batch = commands.slice(offset, offset + MAX_LABELS_PER_BATCH);
            const data = encoder.encode((offset === 0 ? header : '') + batch.join(''));
            await writer.write(data);
            confirmed += batch.length;
        }
        return { printedLabels: confirmed, printer: 'Bluetooth serial printer', widthMm: LABEL_WIDTH_MM, heightMm: LABEL_HEIGHT_MM };
    } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown Bluetooth print error.';
        if (confirmed) throw new Error(`${confirmed} labels were sent before the connection stopped. Check the printed roll before retrying the whole job. ${detail}`);
        throw error;
    } finally {
        try { writer?.releaseLock(); } catch { /* connection may already be closed */ }
        try { if (port.readable || port.writable) await port.close(); } catch { /* Android may already close the serial port */ }
    }
}
