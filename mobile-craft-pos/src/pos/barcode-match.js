export const barcodeValue = (raw) => raw.trim().toUpperCase();
export const canRegisterBarcode = (raw) => /^[A-Z0-9._ /+%$-]{1,48}$/.test(barcodeValue(raw));
// Some scanners expose the same GTIN as UPC-A or as EAN-13 with a leading zero.
// Keep leading zeroes. Never pick one product if the two representations belong to different items.
export function retailAlias(value) {
    if (!/^\d{12}$|^0\d{12}$/.test(value))
        return null;
    const digits = value.replace(/^0(?=\d{12}$)/, '');
    const checksum = Array.from(digits.slice(0, -1)).reduce((sum, digit, i) => sum + Number(digit) * (i % 2 === 0 ? 3 : 1), 0);
    if ((10 - (checksum % 10)) % 10 !== Number(digits[11]))
        return null;
    return value.length === 12 ? `0${value}` : digits;
}
export function lookupBarcode(products, raw) {
    const code = barcodeValue(raw);
    if (!code)
        return { kind: 'unknown' };
    const alias = retailAlias(code);
    let match;
    for (const product of products) {
        const candidate = barcodeValue(product.barcode);
        if (candidate !== code && candidate !== alias)
            continue;
        if (match)
            return { kind: 'ambiguous' };
        match = product;
    }
    return match ? { kind: 'found', product: match } : { kind: 'unknown' };
}
