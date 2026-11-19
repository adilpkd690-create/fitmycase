const STORAGE_KEY = 'mc-hq450l-windows-bridge-v1';
export const DEFAULT_PRINT_BRIDGE_URL = 'http://127.0.0.1:17845';
function cleanBase(value) {
    const url = new URL(String(value || DEFAULT_PRINT_BRIDGE_URL).trim());
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port !== '17845' || url.pathname !== '/' || url.search || url.hash)
        throw new Error('For safety, the print bridge must use http://127.0.0.1:17845 only.');
    return url.origin;
}
export function getPrintBridgeConfig() {
    try {
        const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (!value || typeof value.token !== 'string' || !value.printerName) return null;
        return { baseUrl: cleanBase(value.baseUrl), token: value.token, printerName: value.printerName };
    } catch { return null; }
}
export function savePrintBridgeConfig(value) {
    const config = { baseUrl: cleanBase(value.baseUrl), token: String(value.token || '').trim(), printerName: String(value.printerName || '').trim() };
    if (config.token.length < 32 || config.token.length > 160) throw new Error('Paste the complete local bridge token from the Windows installer.');
    if (!config.printerName || config.printerName.length > 160) throw new Error('Choose the HQ450L Windows printer queue.');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return config;
}
async function readResponse(response) {
    let body;
    try { body = await response.json(); } catch { body = null; }
    if (!response.ok || body?.ok === false) throw new Error(body?.error || `Windows print bridge responded with ${response.status}.`);
    return body;
}
export async function discoverWindowsPrinters(baseUrl, token) {
    const base = cleanBase(baseUrl);
    let health;
    try { health = await fetch(`${base}/health`, { cache: 'no-store' }); }
    catch { throw new Error('Windows print bridge is not running. Start the Mobile Craft Print Bridge on the laptop.'); }
    const healthData = await readResponse(health);
    if (healthData?.service !== 'mobile-craft-hq450l-bridge') throw new Error('The local service is not the Mobile Craft printer bridge.');
    const response = await fetch(`${base}/printers`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const data = await readResponse(response);
    return Array.isArray(data.printers) ? data.printers : [];
}
export async function sendWindowsLabels(config, items, copies = 1, includePrice = true, widthMm = 38.1, heightMm = 24.892) {
    if (!config?.token || !config?.printerName) throw new Error('Connect the Windows HQ450L printer first.');
    if (!Array.isArray(items) || !items.length) throw new Error('Choose at least one product label.');
    if (!Number.isInteger(copies) || copies < 1 || copies > 10) throw new Error('Copies per product must be between 1 and 10.');
    if (Math.abs(Number(widthMm) - 38.1) > 0.01 || Math.abs(Number(heightMm) - 24.892) > 0.01) throw new Error('HQ450L labels are fixed at 38.1 × 24.892 mm.');
    const payloadItems = items.map(item => {
        const pricePa = Number(item?.price_pa ?? item?.price ?? 0);
        if (!Number.isSafeInteger(pricePa) || pricePa < 0) throw new Error(`Invalid selling price for ${String(item?.sku || 'this product')}.`);
        const barcode = String(item?.barcode || '').normalize('NFKC').replace(/\s+/g, '').toUpperCase();
        if (!/^[A-Z0-9._/+%$-]{1,48}$/.test(barcode)) throw new Error(`A valid barcode is missing for ${String(item?.sku || item?.name || 'this product')}.`);
        if (barcode.length > 9) throw new Error(`Barcode for ${String(item?.sku || item?.name || 'this product')} is too long for the 38.1 mm HQ450L label. Generate and save an MC + 6-digit short barcode first.`);
        return { name: String(item?.name || ''), sku: String(item?.sku || ''), barcode, price_pa: pricePa };
    });
    const base = cleanBase(config.baseUrl);
    const maxLabelsPerJob = 200;
    const productsPerBatch = Math.max(1, Math.floor(maxLabelsPerJob / copies));
    const totalLabels = payloadItems.length * copies;
    let printedLabels = 0;
    let batches = 0;
    for (let offset = 0; offset < payloadItems.length; offset += productsPerBatch) {
        const batch = payloadItems.slice(offset, offset + productsPerBatch);
        let response;
        try {
            response = await fetch(`${base}/print`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ printerName: config.printerName, widthMm: 38.1, heightMm: 24.892, copies, includePrice, items: batch }),
                cache: 'no-store',
            });
        } catch {
            throw new Error(`${printedLabels} labels in earlier batches were confirmed. The current batch may have reached the printer but its reply was lost. Check that the bridge is running, then inspect the printed roll and printer queue before retrying; do not resend the full selection blindly.`);
        }
        let result;
        try { result = await readResponse(response); }
        catch (error) {
            const reason = error instanceof Error ? error.message : 'Unknown print failure.';
            if (printedLabels) throw new Error(`${printedLabels} labels in earlier batches were confirmed. The current batch result is uncertain. The next batch failed: ${reason} Inspect the printed roll and queue before retrying; do not resend the full selection blindly.`);
            throw error;
        }
        const expected = batch.length * copies;
        if (Number(result?.printedLabels) !== expected) {
            throw new Error(`${printedLabels} labels in previous batches were confirmed. Batch ${batches + 1} did not confirm ${expected} labels; its outcome is uncertain. Check the printed roll and printer queue before retrying.`);
        }
        printedLabels += expected;
        batches += 1;
    }
    return { ok: true, printedLabels, totalLabels, batches, printerName: config.printerName };
}
