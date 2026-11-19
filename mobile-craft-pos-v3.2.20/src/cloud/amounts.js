// Safe positive integer paise; JS BigInt keeps browser previews identical to SQL numeric rounding.
export const billLimit = 100_000_000_000;
export const roundShare = (amount, part, denom) => {
    if (![amount, part, denom].every(Number.isSafeInteger) || amount < 0 || part < 0 || denom < 1)
        throw Error('Invalid amount or quantity.');
    const a = BigInt(amount) * BigInt(part), d = BigInt(denom);
    return Number((a + d / 2n) / d);
};
export const zeroTax = () => ({ net_pa: 0, cgst_pa: 0, sgst_pa: 0, igst_pa: 0 });
export const taxTotal = (p) => p.net_pa + p.cgst_pa + p.sgst_pa + p.igst_pa;
export function quoteLine(unit, qty, rate, inclusive, regular, inside) {
    if (!Number.isInteger(qty) || qty < 1 || qty > 1_000_000 || !Number.isInteger(unit) || unit < 1 || unit > 100_000_000)
        throw Error('Invalid quantity or unit price.');
    const raw = unit * qty;
    if (!regular)
        return { ...zeroTax(), net_pa: raw };
    if (rate === null || !Number.isInteger(rate) || rate < 0 || rate > 4000)
        throw Error('A GST rate is missing. Set the correct GST rate in product settings before preparing a Regular GST bill.');
    const tax = roundShare(raw, rate, inclusive ? 10_000 + rate : 10_000);
    const cgst = inside ? Math.floor(tax / 2) : 0;
    return { net_pa: inclusive ? raw - tax : raw, cgst_pa: cgst, sgst_pa: inside ? tax - cgst : 0, igst_pa: inside ? 0 : tax };
}
export function returnSlice(original, qty, previous, take) {
    if (!Number.isInteger(take) || take < 0 || take > qty - previous.qty)
        throw Error('Return quantity exceeds the remaining units.');
    const share = (k) => roundShare(original[k], previous.qty + take, qty) - previous[k];
    return { net_pa: share('net_pa'), cgst_pa: share('cgst_pa'), sgst_pa: share('sgst_pa'), igst_pa: share('igst_pa') };
}
