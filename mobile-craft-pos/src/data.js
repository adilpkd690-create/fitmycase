export const DEMO_END = '2026-11-18';
const DAY = 86_400_000;
export const asDate = (key) => new Date(`${key}T00:00:00Z`);
export const dateKey = (date) => date.toISOString().slice(0, 10);
export const addDays = (key, n) => dateKey(new Date(asDate(key).getTime() + n * DAY));
export const dayCount = ({ start, end }) => Math.round((asDate(end).getTime() - asDate(start).getTime()) / DAY) + 1;
export const lastDays = (days) => ({ start: addDays(DEMO_END, 1 - days), end: DEMO_END });
export const priorRange = (range) => ({ start: addDays(range.start, -dayCount(range)), end: addDays(range.start, -1) });
export const DEMO_RANGE = lastDays(180);
export const DEFAULT_RANGE = lastDays(30);
export const PRESETS = [
    { label: 'Today', range: lastDays(1) },
    { label: 'Yesterday', range: { start: addDays(DEMO_END, -1), end: addDays(DEMO_END, -1) } },
    { label: 'Last 7 days', range: lastDays(7) },
    { label: 'Last 14 days', range: lastDays(14) },
    { label: 'Last 30 days', range: DEFAULT_RANGE },
    { label: 'This month', range: { start: `${DEMO_END.slice(0, 7)}-01`, end: DEMO_END } },
    { label: 'Last 90 days', range: lastDays(90) },
    { label: 'All demo data', range: DEMO_RANGE },
];
export const sameRange = (a, b) => a.start === b.start && a.end === b.end;
export const hasBaseline = (range) => priorRange(range).start >= DEMO_RANGE.start;
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function dateLabel(key, withYear = false) {
    const d = asDate(key);
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]}${withYear ? ` ${d.getUTCFullYear()}` : ''}`;
}
export function rangeLabel(range, withYear = true) {
    if (range.start === range.end)
        return dateLabel(range.start, withYear);
    const a = asDate(range.start), b = asDate(range.end);
    const aYear = a.getUTCFullYear(), bYear = b.getUTCFullYear();
    if (aYear !== bYear)
        return `${dateLabel(range.start, withYear)} – ${dateLabel(range.end, withYear)}`;
    if (a.getUTCMonth() === b.getUTCMonth())
        return `${a.getUTCDate()}–${dateLabel(range.end, withYear)}`;
    return `${dateLabel(range.start)} – ${dateLabel(range.end, withYear)}`;
}
const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
export const num = (amount) => number.format(amount);
export const money = (paise, exact = false) => `${paise < 0 ? '−' : ''}₹${(exact ? decimal : number).format(Math.abs(paise) / 100)}`;
export function compactMoney(paise) {
    const rupees = paise / 100;
    const trimmed = (n) => n.toFixed(1).replace(/\.0$/, '');
    if (rupees >= 100_000)
        return `₹${trimmed(rupees / 100_000)}L`;
    if (rupees >= 1000)
        return `₹${trimmed(rupees / 1000)}k`;
    return money(paise);
}
export const CATEGORIES = [
    { id: 'cases', name: 'Cases & covers', color: '#7957f2', products: [
            ['Clear TPU Case · iPhone 16', 449, 198], ['MagSafe Matte Case · iPhone 15', 799, 395], ['Rugged Grip Case · Galaxy A55', 649, 295], ['Silicone Case · OnePlus 13R', 549, 245], ['Wallet Cover · Redmi Note 14', 399, 181], ['Armor Case · Pixel 9a', 749, 345],
        ] },
    { id: 'charging', name: 'Chargers & cables', color: '#9769f4', products: [
            ['Braided USB-C Cable · 1 m', 349, 154], ['20 W USB-C Wall Charger', 749, 378], ['33 W Fast-Charging Kit', 1099, 619], ['Dual USB Car Charger', 599, 282], ['45 W GaN Adapter', 1399, 798], ['Lightning Cable · 1 m', 499, 237],
        ] },
    { id: 'protectors', name: 'Screen protectors', color: '#ac82f4', products: [
            ['9H Tempered Glass · iPhone 16', 299, 82], ['Privacy Glass · iPhone 15', 449, 176], ['Full Glue Glass · Galaxy A55', 349, 103], ['Camera Lens Guard · 3-pack', 249, 89], ['Matte Hydrogel Film', 399, 115], ['Edge-to-Edge Glass · Redmi', 249, 77],
        ] },
    { id: 'audio', name: 'Audio & Bluetooth', color: '#8673ee', products: [
            ['Type-C Wired Earphones', 499, 276], ['BassFit TWS Earbuds', 1299, 826], ['Pocket Bluetooth Speaker', 899, 539], ['Sport ANC Earbuds', 1899, 1213], ['Wireless Neckband', 999, 614], ['Compact 5 W Speaker', 749, 441],
        ] },
    { id: 'fragrance', name: 'Perfumes', color: '#b996f6', products: [
            ['Citrus Drift EDP · 30 ml', 499, 238], ['Oud Noir EDP · 50 ml', 899, 432], ['Coastal Mist EDP · 30 ml', 599, 286], ['Vanilla Amber Pocket Spray', 349, 142],
        ] },
    { id: 'service', name: 'Repairs & services', color: '#c4abf4', products: [
            ['Charging Port Cleaning', 249, 63], ['Display Diagnostic', 349, 128], ['Battery Replacement Service', 1199, 629], ['Device Setup & Transfer', 599, 196],
        ] },
];
export const categoryName = (id) => id === 'all' ? 'All categories' : CATEGORIES.find(c => c.id === id).name;
export const METHODS = [
    { id: 'upi', name: 'UPI', color: '#7956f2' },
    { id: 'cash', name: 'Cash', color: '#2ebda7' },
    { id: 'card', name: 'Card', color: '#5b9df4' },
    { id: 'bank', name: 'Bank transfer', color: '#f1ad58' },
];
const CUSTOMERS = ['Ananya Nair', 'Arjun Menon', 'Nisha Thomas', 'Varun Pillai', 'Priya Suresh', 'Rohan Mathew', 'Meera Nair', 'Adil Rahman', 'Divya Krishnan', 'Akhil Babu', 'Fathima Ali', 'Neha Raj', 'Anoop Das', 'Sneha George', 'Vivek Kumar', 'Ishaan Jose', 'Amal Nair', 'Keerthi Mohan', 'Jishnu S.', 'Riya Jacob', 'Salim Khan', 'Sandra Biju', 'Mithun Prasad'];
const seedRng = (seed) => () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
function weightedIndex(weights, draw) {
    let point = weights.reduce((a, b) => a + b, 0) * draw;
    for (let i = 0; i < weights.length; i++) {
        point -= weights[i];
        if (point < 0)
            return i;
    }
    return weights.length - 1;
}
function chooseTender(draw) {
    return METHODS[weightedIndex([0.56, 0.248, 0.15, 0.042], draw)].id;
}
export function generateInvoices(seed = 104229) {
    const rnd = seedRng(seed);
    const rows = [];
    const dayTotal = dayCount(DEMO_RANGE);
    let seq = 1700;
    for (let i = 0; i < dayTotal; i++) {
        const date = addDays(DEMO_RANGE.start, i);
        const day = asDate(date).getUTCDay();
        const recent = i >= dayTotal - 30;
        const traffic = [1.28, .77, .84, .87, .96, 1.12, 1.29][day];
        const rhythm = 1 + .13 * Math.sin(i * .56) + .09 * Math.sin(i * 1.1 + 3);
        const promo = .26 * Math.exp(-((i - 162) ** 2) / 6) + .37 * Math.exp(-((i - 170) ** 2) / 4);
        const count = Math.max(4, Math.round((9.8 + 5.4 * i / dayTotal + (recent ? 1.8 : 0)) * traffic * (rhythm + promo) + rnd() * 4 - 2));
        const times = Array.from({ length: count }, () => 600 + Math.floor(rnd() * 610)).sort((a, b) => a - b);
        for (let n = 0; n < count; n++) {
            const c = CATEGORIES[weightedIndex(recent ? [28, 23, 27, 13, 6, 3] : [27, 23, 21, 19, 7, 3], rnd())];
            const items = [];
            const lines = rnd() < .19 ? 2 : 1;
            let picked = -1;
            for (let l = 0; l < lines; l++) {
                let idx = Math.floor(rnd() * c.products.length);
                if (idx === picked)
                    idx = (idx + 1) % c.products.length;
                picked = idx;
                const [name, price, cost] = c.products[idx];
                const qty = c.id !== 'service' && rnd() < .12 ? 2 : 1;
                const discount = rnd() < (recent ? .22 : .13) ? (price >= 700 ? 50 : 20) * qty * 100 : 0;
                items.push({ name, sku: `MC-${c.id.slice(0, 3).toUpperCase()}-${String(idx + 1).padStart(2, '0')}`, qty, unit: price * 100, discount, cost: cost * 100 });
            }
            const net = items.reduce((a, item) => a + item.unit * item.qty - item.discount, 0);
            const cost = items.reduce((a, item) => a + item.cost * item.qty, 0);
            const draw = rnd();
            const lastIndex = count - 1 - n;
            const status = date === DEMO_END && lastIndex < 5
                ? ['Paid', 'Paid', 'Partial', 'Paid', 'Unpaid'][lastIndex]
                : draw < .028 ? 'Unpaid' : draw < .101 ? 'Partial' : 'Paid';
            const ratio = rnd();
            const paid = status === 'Paid' ? net : status === 'Unpaid' ? 0 : Math.min(net - 100, Math.round(net / 100 * (.28 + .52 * ratio)) * 100);
            const payments = { upi: 0, cash: 0, card: 0, bank: 0 };
            const tender = chooseTender(rnd());
            if (rnd() < .115 && paid > 100) {
                const other = tender === 'cash' ? 'upi' : 'cash';
                const first = Math.round(paid * .61 / 100) * 100;
                payments[tender] = first;
                payments[other] = paid - first;
            }
            else
                payments[tender] = paid;
            const cust = Math.floor(rnd() * CUSTOMERS.length);
            const walkIn = rnd() < .27;
            const customer = date === DEMO_END && lastIndex < 5
                ? ['Ananya Nair', 'Walk-in customer', 'Rohan Mathew', 'Meera Nair', 'Akhil Babu'][lastIndex]
                : status === 'Paid' && walkIn ? 'Walk-in customer' : CUSTOMERS[cust];
            const minutes = times[n];
            const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
            seq++;
            rows.push({ id: `MC-${seq.toString().padStart(4, '0')}`, seq, date, time, customer, category: c.id, items, net, cost, paid, status, payments });
        }
    }
    return rows;
}
export const INVOICES = generateInvoices();
export function getTotals(rows) {
    const totals = { net: 0, gross: 0, cost: 0, count: rows.length, avg: 0, units: 0, paid: 0, balance: 0, methods: { upi: 0, cash: 0, card: 0, bank: 0 } };
    for (const row of rows) {
        totals.net += row.net;
        totals.cost += row.cost;
        totals.paid += row.paid;
        totals.units += row.items.reduce((sum, item) => sum + item.qty, 0);
        for (const { id } of METHODS)
            totals.methods[id] += row.payments[id];
    }
    totals.gross = totals.net - totals.cost;
    totals.avg = rows.length ? Math.round(totals.net / rows.length) : 0;
    totals.balance = totals.net - totals.paid;
    return totals;
}
export function selectRange(rows, { start, end }, category) {
    return rows.filter(r => r.date >= start && r.date <= end && (category === 'all' || r.category === category));
}
export function categoryTotals(rows, segment) {
    return CATEGORIES.filter(c => segment === 'all' || segment === c.id).map(c => ({ category: c, ...getTotals(rows.filter(r => r.category === c.id)) })).sort((a, b) => b.net - a.net);
}
export function trendSeries(range, current, prior, metric, granularity) {
    const days = dayCount(range);
    const step = granularity === 'daily' ? 1 : 7;
    const toBuckets = (rows, start) => {
        const arr = Array.from({ length: Math.ceil(days / step) }, () => []);
        for (const row of rows) {
            const n = Math.floor((asDate(row.date).getTime() - asDate(start).getTime()) / (DAY * step));
            if (arr[n])
                arr[n].push(row);
        }
        return arr.map(getTotals).map(t => metric in t.methods ? t.methods[metric] : t[metric]);
    };
    const earlier = priorRange(range);
    const a = toBuckets(current, range.start), b = toBuckets(prior, earlier.start);
    return a.map((amt, i) => {
        const n = i * step;
        const end = Math.min(days - 1, n + step - 1);
        return { start: addDays(range.start, n), end: addDays(range.start, end), priorStart: addDays(earlier.start, n), priorEnd: addDays(earlier.start, end), current: amt, prior: b[i] };
    });
}
export const INITIAL_TABLE = { query: '', status: 'All statuses', key: 'date', order: 'desc' };
const collator = new Intl.Collator('en-IN', { numeric: true, sensitivity: 'base' });
export function selectTable(rows, { query, status, key, order }) {
    const needle = query.trim().toLowerCase();
    return rows.filter(r => (status === 'All statuses' || r.status === status) && (!needle || `${r.id} #${r.id} ${r.customer} ${categoryName(r.category)} ${r.items.map(i => `${i.name} ${i.sku}`).join(' ')}`.toLowerCase().includes(needle)))
        .sort((a, b) => {
        const diff = key === 'net' ? a.net - b.net : key === 'id' ? a.seq - b.seq : key === 'date' ? collator.compare(`${a.date} ${a.time}`, `${b.date} ${b.time}`) : collator.compare(a[key], b[key]);
        return (order === 'asc' ? diff : -diff) || b.seq - a.seq;
    });
}
function csvCell(v) {
    let text = String(v);
    if (typeof v === 'string' && /^[\s]*[=+@-]/.test(v))
        text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}
export function invoiceCsv(rows) {
    const headers = ['Invoice', 'Date (IST)', 'Time (IST)', 'Customer', 'Category', 'Status', 'Net sales (INR)', 'Collected (INR)', 'Outstanding (INR)', 'UPI (INR)', 'Cash (INR)', 'Card (INR)', 'Bank transfer (INR)'];
    const inr = (paise) => (paise / 100).toFixed(2);
    return '\ufeff' + [headers, ...rows.map(r => [r.id, r.date, r.time, r.customer, categoryName(r.category), r.status, inr(r.net), inr(r.paid), inr(r.net - r.paid), ...METHODS.map(m => inr(r.payments[m.id]))])].map(row => row.map(csvCell).join(',')).join('\r\n');
}
