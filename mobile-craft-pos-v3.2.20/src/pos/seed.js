import { addDays } from '../data.js';
import { buildBook, today } from './engine.js';
export function practiceBook(anchor = today()) {
    const events = [];
    let count = 0;
    function put(action, id) {
        const date = 'date' in action ? action.date : addDays(anchor, -49);
        const hour = 8 + (count % 8);
        events.push({ id: id ?? `practice-${count + 1}`, at: `${date}T${String(hour).padStart(2, '0')}:20:00.000Z`, action });
        count++;
    }
    const initial = addDays(anchor, -49);
    put({ type: 'capital', date: initial, method: 'cash', amount: 30_000_00, note: 'Practice opening cash float' });
    put({ type: 'capital', date: initial, method: 'bank', amount: 75_000_00, note: 'Practice bank opening balance' });
    const products = [
        ['MagSafe Matte Case', 'iPhone 15 · Smoke', 'CASE-IP15', 'Cases & covers', 699, 285, 52, 5],
        ['Rugged Grip Cover', 'Galaxy A55 · Black', 'CASE-A55', 'Cases & covers', 499, 205, 50, 5],
        ['20W PD Wall Charger', 'White', 'CHG-20W', 'Chargers & cables', 899, 450, 53, 6],
        ['Braided USB-C Cable', '1 m · Graphite', 'CBL-C1M', 'Chargers & cables', 349, 134, 60, 8],
        ['9H Tempered Glass', 'iPhone 16', 'GLS-IP16', 'Screen protectors', 299, 86, 63, 8],
        ['BassFit TWS Earbuds', 'Carbon', 'AUD-TWS', 'Audio & Bluetooth', 1399, 740, 44, 5],
        ['Pocket Bluetooth Speaker', 'Ocean Blue', 'AUD-SPK', 'Audio & Bluetooth', 1099, 530, 48, 4],
        ['Citrus Drift EDP', '30 ml', 'PER-CD30', 'Perfumes', 549, 208, 59, 6],
        ['10,000 mAh Power Bank', 'Midnight', 'PWR-10K', 'Power banks', 1499, 834, 5, 7],
        ['Privacy Screen Glass', 'Pixel 9a', 'GLS-PX9', 'Screen protectors', 449, 136, 3, 5],
        ['Dashboard Mount', 'Magnetic', 'MNT-CAR', 'Mounts & stands', 599, 248, 0, 4],
        ['USB-C to USB-A Adapter', 'Silver', 'ADP-OTG', 'Adapters & OTG', 249, 69, 46, 6],
    ];
    products.forEach(([name, variant, sku, group, price, cost, opening, minimum], i) => put({ type: 'product', name, variant, sku, group, barcode: '', price: price * 100, cost: cost * 100, active: true, opening, minimum, date: initial }, `p${i}`));
    const customers = ['Ananya Nair', 'Rohan Mathew', 'Fathima Ali', 'Arjun Menon', 'Meera Thomas', 'Akhil Babu'];
    customers.forEach((name, i) => put({ type: 'party', side: 'customer', name, phone: '', note: 'Synthetic practice customer', date: initial, opening: i === 1 ? 200_00 : 0 }, `c${i}`));
    const suppliers = ['Malabar Mobile Wholesale', 'Orbit Accessories', 'Coastal Fragrances'];
    suppliers.forEach((name, i) => put({ type: 'party', side: 'supplier', name, phone: '', note: 'Synthetic practice supplier', date: initial, opening: i === 1 ? 1350_00 : 0 }, `s${i}`));
    const channels = ['upi', 'cash', 'upi', 'card', 'upi', 'cash', 'upi', 'bank'];
    const sold = [0, 1, 2, 3, 4, 5, 6, 7, 11];
    let state = 1997;
    const roll = () => { state = Math.imul(state, 1664525) + 1013904223 | 0; return (state >>> 0) / 2 ** 32; };
    for (let i = 0; i < 44; i++) {
        const date = addDays(anchor, i - 43);
        if ([0, 15, 28, 39].includes(i)) {
            const items = sold.filter((_, j) => (j + i) % 3 !== 0 || i === 39).map(n => ({ id: `p${n}`, qty: i === 39 ? 16 : 13, unit: products[n][5] * 100 + (i ? 700 : 0) }));
            const total = items.reduce((s, p) => s + p.qty * p.unit, 0);
            put({ type: 'purchase', date, supplierId: `s${i % 3}`, reference: `SAMPLE-${i + 10}`, items, method: 'bank', paid: i < 15 ? total : Math.floor(total * .73) });
        }
        if (i % 5 === 1)
            put({ type: 'expense', date, category: i % 2 ? '5400' : '5600', method: 'cash', amount: (180 + i * 8) * 100, note: 'Practice counter expense' });
        const transactions = 4 + Math.floor(roll() * 6) + (i === 40 || i === 42 ? 6 : 0);
        for (let j = 0; j < transactions; j++) {
            const n = sold[Math.floor(roll() * sold.length)];
            const qty = roll() < .13 ? 2 : 1;
            const discount = roll() < .24 ? 2000 : 0, total = products[n][4] * 100 * qty - discount;
            const customerId = roll() < .6 ? `c${Math.floor(roll() * customers.length)}` : '';
            const remaining = customerId && roll() < .15 ? 12000 : 0;
            const pay = total - remaining, method = channels[Math.floor(roll() * channels.length)];
            const split = roll() < .11 && method !== 'cash' ? 10000 : 0;
            put({ type: 'sale', date, customerId, items: [{ id: `p${n}`, qty }], discount, tenders: { [method]: pay - split, ...(split ? { cash: split } : {}) } });
        }
    }
    return buildBook(events);
}
