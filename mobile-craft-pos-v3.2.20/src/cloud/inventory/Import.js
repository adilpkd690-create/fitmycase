import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "/vendor/react-jsx-runtime.js";
import { useState } from '/vendor/react.js';
import { ArrowDownToLine, FileUp } from '/vendor/lucide-react.js';
import { barcodeValue, canRegisterBarcode, retailAlias } from '../../pos/barcode-match.js';
import { errorText, rupees } from '../api.js';
import { apply, Entry, inr, phoneLabel, shopDay, Table, unitNames, Warning, Where } from './core.js';
import { exportFile, spreadsheet } from './files.js';
const headers = ['name', 'sku', 'barcode', 'category', 'subcategory', 'brand', 'variant', 'unit', 'purchase_price', 'sale_price', 'mrp', 'minimum', 'opening_qty', 'opening_cost', 'opening_date', 'rack', 'models', 'hsn', 'gst_percent'];
const canonical = (v) => { const code = barcodeValue(v), alt = retailAlias(code); return alt && code.length === 13 ? alt : code; };
export function ImportEntry({ s, close }) {
    const [rows, setRows] = useState([]), [issue, setIssue] = useState(''), [busy, setBusy] = useState(false);
    const preview = async (file) => {
        setIssue('');
        setRows([]);
        setBusy(true);
        try {
            const all = await spreadsheet(file), keys = all[0]?.map(c => c.text.trim().toLowerCase()) ?? [];
            if (new Set(keys.filter(Boolean)).size !== keys.filter(Boolean).length || keys.some(x => x && !headers.includes(x)) || !['name', 'sku', 'sale_price', 'minimum'].every(k => keys.includes(k)))
                throw Error('Use the template headers. Required columns: name, sku, sale_price, minimum.');
            if (all.length < 2)
                throw Error('Add at least one item beneath the header row.');
            const skuSeen = new Set(s.products.map(p => p.sku.toUpperCase())), barSeen = new Set(s.products.map(p => canonical(p.barcode)));
            const loaded = all.slice(1).map((cols, i) => {
                const errors = [], get = (key) => cols[keys.indexOf(key)]?.text.trim() ?? '', numberCell = (key) => cols[keys.indexOf(key)]?.numeric === true;
                for (let n = 0; n < cols.length; n++)
                    if (!keys[n] && cols[n]?.text.trim())
                        errors.push('Value in a column without a recognized header');
                const text = (k, max, req = false) => { const t = get(k); if (req && !t || t.length > max)
                    errors.push(`${k}: ${req ? 'required, ' : ''}max ${max} characters`); return t || null; };
                const quantity = (k, req = false) => { const v = get(k); if ((req || v) && (!/^\d{1,7}$/.test(v) || Number(v) > 1000000))
                    errors.push(`${k}: 0–1,000,000 whole units`); return v ? Number(v) : null; };
                const money = (k, low = 0, req = false) => { const v = get(k); if (!v && !req)
                    return null; try {
                    const p = rupees(v);
                    if (!v || p < low || p > 100000000)
                        throw Error();
                    return p;
                }
                catch {
                    errors.push(`${k}: invalid price in rupees`);
                    return null;
                } };
                const name = text('name', 90, true) ?? '', sku = (text('sku', 40, true) ?? '').toUpperCase(), barcode = (text('barcode', 48) ?? '').toUpperCase();
                if (['barcode', 'sku', 'hsn'].some(k => get(k) && numberCell(k)))
                    errors.push('SKU, barcode and HSN must be Excel Text cells to preserve digits and leading zeros');
                if (skuSeen.has(sku))
                    errors.push('Duplicate SKU in the branch or file');
                if (sku)
                    skuSeen.add(sku);
                if (barcode) {
                    const key = canonical(barcode);
                    if (!canRegisterBarcode(barcode))
                        errors.push('Unsupported barcode');
                    if (barSeen.has(key))
                        errors.push('Duplicate barcode or UPC/EAN alias');
                    barSeen.add(key);
                }
                const cat = text('category', 70), sub = text('subcategory', 70);
                if (sub && !cat)
                    errors.push('Subcategory needs its parent category');
                const hsn = text('hsn', 8), gst = get('gst_percent'), rate = Number(gst);
                if (Boolean(hsn) !== Boolean(gst) || (hsn && !/^\d{4}(?:\d{2}){0,2}$/.test(hsn)) || (gst && (!/^\d{1,2}(?:\.\d{1,2})?$/.test(gst) || rate > 40)))
                    errors.push('Use a valid HSN together with a GST rate of 0–40%, or leave both blank for a Retail product');
                const min = quantity('minimum', true), open = quantity('opening_qty'), buy = money('purchase_price'), cost = money('opening_cost') ?? buy, date = get('opening_date') || shopDay(), unit = (get('unit') || 'piece').toLowerCase();
                if (open != null && cost == null)
                    errors.push('Opening stock needs opening_cost or purchase_price (0 allowed)');
                if (get('opening_date') && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '2000-01-01' || date > shopDay() || !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date || numberCell('opening_date')))
                    errors.push('Use opening_date as text YYYY-MM-DD (not future)');
                if (!unitNames.includes(unit))
                    errors.push(`unit: ${unitNames.join(', ')}`);
                const modelIds = [], modelText = text('models', 600);
                for (const token of modelText?.split(';') ?? []) {
                    if (!token.trim())
                        continue;
                    const parts = token.split('|').map(x => x.trim().toLowerCase()), matches = s.meta.models.filter(p => parts.length >= 2 && parts[0] === p.brand.toLowerCase() && parts[1] === p.name.toLowerCase() && (parts.length === 2 || parts.length === 3 && parts[2] === p.edition.toLowerCase()));
                    if (matches.length !== 1)
                        errors.push(`Unknown or ambiguous phone: ${token.trim()}`);
                    else
                        modelIds.push(matches[0].id);
                }
                const input = { name, sku, barcode: barcode || null, category: cat, subcategory: sub, brand: text('brand', 50), variant: text('variant', 60), unit, buy_pa: buy, price_pa: money('sale_price', 1, true), mrp_pa: money('mrp', 1), minimum: min,
                    opening_qty: open, opening_cost_pa: cost, observed_date: date, rack: text('rack', 70), model_ids: [...new Set(modelIds)], hsn, gst_bps: gst ? Math.round(rate * 100) : null, price_includes_gst: true };
                return { line: i + 2, name, sku, barcode, errors, input };
            });
            setRows(loaded);
        }
        catch (e) {
            setIssue(errorText(e));
        }
        finally {
            setBusy(false);
        }
    };
    const bad = rows.filter(r => r.errors.length).length;
    return _jsxs(Entry, { title: "Import product variants", close: close, button: `Confirm import${rows.length ? ` · ${rows.length} items` : ''}`, disabled: s.blocked || busy || !rows.length || bad > 0, hint: "Preview up to 50 new SKUs per file. Existing items never get overwritten. A server validation error rolls back every row.", submit: async (f) => {
            await apply(s, 'import', { rows: rows.map(r => ({ ...r.input, location_id: String(f.get('location_id')) })) });
            close();
        }, children: [_jsx("div", { className: "cloud-tools", children: ['csv', 'xlsx'].map(t => _jsxs("button", { className: "button", type: "button", onClick: () => { void exportFile(t, 'mobile-craft-item-template', 'Inventory import', s.branch.name, [headers]).catch(e => setIssue(errorText(e))); }, children: [_jsx(ArrowDownToLine, { size: 15 }), " ", t.toUpperCase(), " template"] }, t)) }), _jsxs("small", { children: ["Use CSV UTF-8 or values-only .xlsx. Preserve SKU, barcode and HSN as Text. Models link to existing exact records: ", _jsx("b", { children: "Brand|Model|Edition;Brand|Model" }), ". Categories and subcategories are created if missing. Prices are in rupees; GST selling prices are inclusive on import."] }), _jsxs("div", { className: "cloud-form-columns", children: [_jsxs("label", { children: [_jsx(FileUp, { size: 15 }), " Import file", _jsx("input", { type: "file", accept: ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", disabled: busy, onChange: e => { const f = e.target.files?.[0]; if (f)
                                    void preview(f); } })] }), _jsx(Where, { label: "Opening location for all rows", locations: s.meta.locations })] }), issue && _jsx(Warning, { tone: "error", children: issue }), busy && _jsx("p", { role: "status", children: "Checking the file\u2026" }), rows.length > 0 && _jsxs(_Fragment, { children: [_jsxs("div", { className: "cloud-op-summary", children: [_jsxs("b", { children: [rows.length - bad, " ready \u00B7 ", bad, " need changes"] }), _jsx("small", { children: "Opening quantities apply only after confirmation." })] }), _jsx(Table, { label: "Import preview", heads: ['Row', 'Item / SKU', 'Barcode', 'Price / opening', 'Models', 'Validation'], rows: rows.map(r => ({ key: String(r.line), cells: [r.line, _jsxs(_Fragment, { children: [_jsx("b", { children: r.name || '—' }), _jsx("small", { children: r.sku || '—' })] }), r.barcode || 'Generated', `${typeof r.input.price_pa === 'number' ? inr(r.input.price_pa) : '—'} / ${r.input.opening_qty ?? 'none'}`, s.meta.models.filter(m => r.input.model_ids.includes(m.id)).map(phoneLabel).join(', ') || '—', r.errors.length ? _jsx("span", { className: "cloud-low", children: r.errors.join('; ') }) : 'Ready'] })) })] })] });
}
