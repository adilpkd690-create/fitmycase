import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "/vendor/react-jsx-runtime.js";
import { useEffect, useId, useLayoutEffect, useRef, useState } from '/vendor/react.js';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Filter, Info, Minus } from '/vendor/lucide-react.js';
import { METHODS, compactMoney, dateLabel, money, num, rangeLabel } from '../data.js';
function smoothPath(points) {
    if (!points.length)
        return '';
    const parts = [`M${points[0].x},${points[0].y}`];
    const slopes = points.slice(1).map((p, i) => (p.y - points[i].y) / (p.x - points[i].x));
    const tangents = points.map((_, i) => {
        const a = slopes[i - 1], b = slopes[i];
        if (a === undefined)
            return b ?? 0;
        if (b === undefined)
            return a;
        return a * b > 0 ? 2 * a * b / (a + b) : 0;
    });
    for (let i = 1; i < points.length; i++) {
        const l = points[i - 1], r = points[i], dx = (r.x - l.x) / 3;
        parts.push(`C${l.x + dx},${l.y + tangents[i - 1] * dx} ${r.x - dx},${r.y - tangents[i] * dx} ${r.x},${r.y}`);
    }
    return parts.join(' ');
}
function toArea(line, coords, base) {
    return coords.length > 1 ? `${line} L${coords.at(-1).x},${base} L${coords[0].x},${base} Z` : '';
}
export function PanelTitle({ title, description, action }) {
    return _jsxs("div", { className: "panel-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: title }), description && _jsx("p", { children: description })] }), action] });
}
export function EmptyState({ title, children, action }) {
    return _jsxs("div", { className: "empty-state", children: [_jsx("span", { className: "empty-icon", children: _jsx(BarChart3, { size: 20 }) }), _jsx("strong", { children: title }), children && _jsx("p", { children: children }), action] });
}
function Sparkline({ series }) {
    const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const high = Math.max(...series, 0), low = Math.min(...series);
    if (series.length < 2 || high <= 0)
        return null;
    const points = series.map((v, i) => ({ x: 2 + i / (series.length - 1) * 62, y: 25 - (high === low ? .5 : (v - low) / (high - low)) * 18 }));
    const line = smoothPath(points);
    return _jsxs("svg", { "aria-hidden": "true", viewBox: "0 0 67 29", className: "sparkline", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: id, x2: "0", y2: "100%", children: [_jsx("stop", { offset: "0%", stopColor: "currentColor", stopOpacity: ".21" }), _jsx("stop", { offset: "100%", stopColor: "currentColor", stopOpacity: "0" })] }) }), _jsx("path", { d: toArea(line, points, 29), fill: `url(#${id})` }), _jsx("path", { d: line, fill: "none", stroke: "currentColor", strokeWidth: "1.45", strokeLinecap: "round" }), _jsx("circle", { cx: points.at(-1).x, cy: points.at(-1).y, r: "1.55", fill: "currentColor" })] });
}
export function KpiGrid({ cards, hasPrior }) {
    return _jsx("section", { className: "kpi-grid", "aria-label": "Key performance indicators", children: cards.map(({ label, value, previous, series, icon: Icon, color, kind, hint }) => {
            const cmp = hasPrior && previous !== 0 ? Math.round((value - previous) / Math.abs(previous) * 1000) / 10 : null;
            const change = cmp === null ? 0 : Math.sign(cmp);
            const TrendIcon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
            const compareText = cmp === null ? (hasPrior ? 'No prior activity' : 'No prior data') : 'vs prior period';
            return _jsxs("article", { className: `panel kpi-card kpi-${color}`, children: [_jsxs("div", { className: "kpi-heading", children: [_jsx("span", { className: "kpi-icon", children: _jsx(Icon, { size: 17, strokeWidth: 2 }) }), _jsx("h2", { title: hint, children: label })] }), _jsxs("div", { className: "kpi-number-row", children: [_jsx("p", { className: "kpi-number motion-value", children: kind === 'count' ? num(value) : money(value) }, value), _jsx(Sparkline, { series: series })] }), _jsxs("div", { className: "kpi-comparison", children: [_jsx("span", { className: `trend-badge ${change > 0 ? 'up' : change < 0 ? 'down' : 'flat'}`, children: cmp === null ? '—' : _jsxs(_Fragment, { children: [_jsx(TrendIcon, { size: 12, strokeWidth: 2.4 }), change > 0 ? '+' : change < 0 ? '−' : '', Math.abs(cmp).toFixed(1), "%"] }) }), _jsx("span", { children: compareText })] })] }, label);
        }) });
}
function chartTicks(max, min) {
    const goal = (max - min) / 4;
    const magn = Math.pow(10, Math.floor(Math.log10(goal || 100)));
    const step = ([1, 2, 2.5, 5, 10].find(n => n * magn >= goal) ?? 10) * magn;
    const ceiling = Math.ceil(max / step) * step || (min < 0 ? 0 : step * 3);
    const floor = Math.floor(min / step) * step;
    return { ceiling, floor, ticks: Array.from({ length: Math.round((ceiling - floor) / step) + 1 }, (_, n) => floor + n * step) };
}
export function TrendChart({ points, hasPrior, granularity, onGranularity, payments = false, hasRows, filterKey }) {
    const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const screenReaderId = useId();
    const plot = useRef(null);
    const [width, setWidth] = useState(580);
    const [hover, setHover] = useState(null);
    const keyboard = useRef(false);
    useLayoutEffect(() => {
        const node = plot.current;
        if (!node)
            return;
        const measure = () => setWidth(Math.max(1, node.clientWidth));
        measure();
        const resize = new ResizeObserver(measure);
        resize.observe(node);
        return () => resize.disconnect();
    }, [hasRows, hasPrior]);
    useEffect(() => setHover(null), [filterKey, granularity]);
    const H = 185, hasData = hasRows || (hasPrior && points.some(p => p.prior > 0));
    const label = payments ? 'Collected' : 'Net sales';
    const left = width < 355 ? 38 : 46, right = 14, top = 9, base = H - 28;
    const w = Math.max(1, width - left - right);
    const max = Math.max(...points.map(p => Math.max(p.current, hasPrior ? p.prior : 0)), 0);
    const min = Math.min(...points.map(p => Math.min(p.current, hasPrior ? p.prior : 0)), 0);
    const { ceiling, floor, ticks } = chartTicks(max, min);
    const y = (val) => base - ((val - floor) / (ceiling - floor)) * (base - top);
    const x = (i) => left + (points.length < 2 ? .5 : i / (points.length - 1)) * w;
    const current = points.map((p, i) => ({ x: x(i), y: y(p.current) }));
    const prior = points.map((p, i) => ({ x: x(i), y: y(p.prior) }));
    const line = smoothPath(current), compare = smoothPath(prior);
    const tickCount = Math.min(points.length, Math.max(2, Math.min(7, Math.floor(w / 83) + 1)));
    const indices = tickCount === 1 ? [0] : Array.from({ length: tickCount }, (_, i) => Math.round(i * (points.length - 1) / (tickCount - 1)));
    const index = hover === null ? null : Math.max(0, Math.min(hover, points.length - 1));
    const active = index === null ? null : points[index];
    const activeX = index === null ? 0 : x(index), activeY = active === null ? 0 : y(active.current);
    const displayTooltip = active && index !== null;
    const tooltipWidth = 190;
    const tooltipX = Math.max(0, activeX + tooltipWidth + 14 <= width ? activeX + 13 : activeX - tooltipWidth - 10);
    function pointAt(e) {
        keyboard.current = false;
        const rect = e.currentTarget.getBoundingClientRect();
        setHover(Math.max(0, Math.min(points.length - 1, Math.round((e.clientX - rect.left - left) / w * (points.length - 1)))));
    }
    return _jsxs("section", { className: "panel chart-panel trend-panel", "aria-label": payments ? 'Collections trend' : 'Sales trend', children: [_jsx(PanelTitle, { title: payments ? 'Collections trend' : 'Sales trend', description: payments ? 'Payments received over time' : 'Net sales over time', action: _jsx("div", { className: "segmented", role: "group", "aria-label": "Chart interval", children: ['daily', 'weekly'].map(g => _jsx("button", { type: "button", "aria-pressed": granularity === g, className: granularity === g ? 'segment-active' : '', onClick: () => onGranularity(g), children: g === 'daily' ? 'Daily' : 'Weekly' }, g)) }) }), _jsxs("div", { className: "trend-legend", children: [_jsxs("span", { children: [_jsx("i", { className: "key-line" }), label] }), hasPrior && _jsxs("span", { children: [_jsx("i", { className: "key-line key-line-compare" }), "Previous period"] })] }), hasData ? _jsxs("div", { className: "trend-plot", ref: plot, tabIndex: 0, role: "group", "aria-label": `${label} chart`, "aria-describedby": screenReaderId, onPointerMove: e => { if (e.pointerType !== 'touch')
                    pointAt(e); }, onPointerDown: pointAt, onPointerLeave: e => { if (e.pointerType !== 'touch' && !keyboard.current)
                    setHover(null); }, onFocus: e => { if (e.currentTarget.matches(':focus-visible')) {
                    keyboard.current = true;
                    setHover(i => i ?? points.length - 1);
                } }, onBlur: () => setHover(null), onKeyDown: e => {
                    if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(e.key)) {
                        e.preventDefault();
                        keyboard.current = true;
                        setHover(old => e.key === 'Escape' ? null : e.key === 'Home' ? 0 : e.key === 'End' ? points.length - 1 : Math.max(0, Math.min(points.length - 1, (old ?? 0) + (e.key === 'ArrowRight' ? 1 : -1))));
                    }
                }, children: [_jsx("span", { className: "sr-only", id: screenReaderId, children: "Use the left and right arrow keys to explore values." }), _jsxs("svg", { viewBox: `0 0 ${width} ${H}`, width: width, height: H, "aria-hidden": "true", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: `fill-${id}`, x1: "0", x2: "0", y1: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "var(--line)", stopOpacity: ".19" }), _jsx("stop", { offset: "100%", stopColor: "var(--line)", stopOpacity: ".012" })] }) }), ticks.map(tick => _jsxs("g", { children: [_jsx("text", { className: "axis-text", x: left - 9, y: y(tick), dominantBaseline: "middle", textAnchor: "end", children: tick < 0 ? `−${compactMoney(-tick)}` : compactMoney(tick) }), _jsx("line", { className: tick === 0 ? 'grid-base' : 'grid-line', x1: left, x2: width - right, y1: y(tick), y2: y(tick) })] }, tick)), indices.map((i, k) => _jsx("text", { className: "axis-text", x: x(i), y: H - 9, textAnchor: tickCount === 1 ? 'middle' : k === 0 ? 'start' : k === indices.length - 1 ? 'end' : 'middle', children: dateLabel(points[i].start) }, i)), _jsxs("g", { className: "chart-redraw", children: [current.length > 1 ? _jsx("path", { d: toArea(line, current, y(0)), fill: `url(#fill-${id})` }) : null, hasPrior && (prior.length > 1 ? _jsx("path", { className: "compare-line", d: compare, fill: "none", strokeDasharray: "4 5", strokeWidth: "1.7", strokeLinecap: "round" }) : prior[0] && _jsx("circle", { cx: prior[0].x, cy: prior[0].y, r: "3.6", fill: "var(--line-prior)" })), current.length > 1 ? _jsx("path", { className: "primary-line", d: line, fill: "none", strokeWidth: "2.65", strokeLinecap: "round", strokeLinejoin: "round" }) : current[0] && _jsx("circle", { cx: current[0].x, cy: current[0].y, r: "4.2", fill: "var(--line)" })] }, `${filterKey}-${granularity}-${payments}`), displayTooltip && _jsxs("g", { className: "hover-mark", children: [_jsx("line", { x1: activeX, x2: activeX, y1: top - 3, y2: base, className: "crosshair" }), hasPrior && _jsx("circle", { cx: activeX, cy: y(active.prior), r: "3.5", fill: "var(--surface)", stroke: "var(--line-prior)", strokeWidth: "1.9" }), _jsx("circle", { cx: activeX, cy: activeY, r: "5", fill: "var(--surface)", stroke: "var(--line)", strokeWidth: "2.6" })] })] }), displayTooltip && _jsxs("div", { className: "chart-tooltip line-tooltip", role: "status", style: { left: tooltipX, top: Math.max(1, Math.min(activeY - (hasPrior ? 44 : 25), H - (hasPrior ? 102 : 70))), width: tooltipWidth }, children: [_jsx("strong", { children: rangeLabel(active, false) }), _jsxs("span", { children: [_jsx("i", { className: "dot dot-current" }), label, _jsx("b", { children: money(active.current) })] }), hasPrior && _jsxs("span", { children: [_jsx("i", { className: "dot dot-prior" }), rangeLabel({ start: active.priorStart, end: active.priorEnd }, false), _jsx("b", { children: money(active.prior) })] })] })] }) : _jsx(EmptyState, { title: payments ? 'No collections to show' : 'No sales to show', children: "Try a different date range or category." })] });
}
export function PaymentChart({ totals, filterKey, action, footer = "Excludes unpaid invoice balances" }) {
    const [hover, setHover] = useState(null);
    const [selected, setSelected] = useState(null);
    useEffect(() => { setHover(null); setSelected(null); }, [filterKey]);
    const active = hover ?? selected;
    const radius = 65, circumference = Math.PI * 2 * radius, cx = 80;
    const nonzero = METHODS.filter(m => totals.methods[m.id] > 0).length;
    let startAt = 0;
    const arcs = METHODS.map(method => {
        const amount = totals.methods[method.id], share = totals.paid ? amount / totals.paid : 0;
        const slice = share * circumference;
        const gap = nonzero === 1 ? 0 : Math.min(5, slice * .18);
        const offset = startAt + gap / 2;
        startAt += slice;
        return { ...method, amount, share, slice: slice - gap, offset };
    });
    const focal = arcs.find(a => a.id === active);
    return _jsxs("section", { className: "panel chart-panel payment-panel", "aria-label": "Payment methods", children: [_jsx(PanelTitle, { title: "Payment mix", description: "Collections by payment method", action: action }), totals.paid ? _jsxs("div", { className: "payment-plot", children: [_jsxs("div", { className: "donut-wrap", onMouseLeave: () => setHover(null), children: [_jsxs("svg", { className: "donut", viewBox: "0 0 160 160", "aria-hidden": "true", onMouseLeave: () => setHover(null), children: [_jsx("circle", { cx: cx, cy: cx, r: radius, fill: "none", stroke: "var(--track)", strokeWidth: "15" }), arcs.map(arc => _jsx("circle", { cx: cx, cy: cx, r: radius, transform: `rotate(-90 ${cx} ${cx})`, className: `donut-arc ${arc.id === active ? 'arc-active' : ''}`, style: { opacity: arc.slice <= 0 ? 0 : active && active !== arc.id ? .36 : 1, pointerEvents: arc.slice <= 0 ? 'none' : 'stroke' }, fill: "none", stroke: arc.color, strokeWidth: "15", strokeDasharray: `${arc.slice} ${circumference}`, strokeDashoffset: -arc.offset, onMouseEnter: () => setHover(arc.id), onMouseLeave: () => setHover(null), onClick: () => setSelected(prev => prev === arc.id ? null : arc.id) }, arc.id))] }), _jsxs("div", { className: "donut-center", "aria-hidden": "true", children: [_jsx("strong", { className: "motion-value", children: money(focal?.amount ?? totals.paid) }, focal?.amount ?? totals.paid), _jsx("span", { children: focal?.name ?? 'Total collected' })] }), focal && _jsxs("div", { className: "chart-tooltip donut-tooltip", role: "status", children: [_jsxs("strong", { children: [_jsx("i", { className: "dot", style: { background: focal.color } }), focal.name, " ", _jsxs("b", { children: [(focal.share * 100).toFixed(1), "%"] })] }), _jsxs("span", { children: [money(focal.amount), " collected"] })] })] }), _jsx("div", { className: "donut-legend", "aria-label": `Total collected: ${money(totals.paid)}`, children: arcs.map(arc => _jsxs("button", { type: "button", "aria-pressed": selected === arc.id, "aria-label": `${arc.name}, ${money(arc.amount)} collected, ${(arc.share * 100).toFixed(1)} percent`, className: `donut-legend-row ${active === arc.id ? 'legend-active' : ''}`, onMouseEnter: () => setHover(arc.id), onMouseLeave: () => setHover(null), onFocus: () => setHover(arc.id), onBlur: () => setHover(null), onKeyDown: e => { if (e.key === 'Escape') {
                                setSelected(null);
                                setHover(null);
                            } }, onClick: () => setSelected(prev => prev === arc.id ? null : arc.id), children: [_jsxs("span", { children: [_jsx("i", { className: "dot", style: { background: arc.color } }), arc.name] }), _jsxs("b", { children: [(arc.share * 100).toFixed(1), "%"] })] }, arc.id)) })] }) : _jsx(EmptyState, { title: "No payments to show", children: "Collections appear here when payments are recorded." }), _jsxs("div", { className: "payment-foot", children: [_jsx(Info, { size: 14 }), _jsx("span", { children: footer })] })] });
}
const BAR_COLORS = ['var(--line)', '#9071f3', '#a083f4', '#b49af6', '#c6b2f7', '#d4c5f9'];
export function CategoryChart({ rows, segment, onSelect, onOpen }) {
    const max = rows[0]?.net ?? 0, total = rows.reduce((sum, r) => sum + r.net, 0);
    const [focus, setFocus] = useState(null);
    useEffect(() => setFocus(null), [segment, total]);
    return _jsxs("section", { className: "panel chart-panel category-panel", "aria-label": "Sales by category", children: [_jsx(PanelTitle, { title: "Sales by category", description: "Net sales by product segment", action: onOpen && _jsx("button", { type: "button", className: "icon-button sub-action", "aria-label": "Open category analytics", title: "Open category analytics", onClick: onOpen, children: _jsx(ArrowRight, { size: 17 }) }) }), max ? _jsx("div", { className: "category-bars", children: rows.map((row, i) => {
                    const share = total ? row.net / total * 100 : 0;
                    return _jsxs("button", { type: "button", className: "category-bar", onClick: () => onSelect(row.category.id), onMouseEnter: () => setFocus(row.category.id), onMouseLeave: () => setFocus(null), onFocus: () => setFocus(row.category.id), onBlur: () => setFocus(null), "aria-pressed": segment === row.category.id, "aria-label": `${row.category.name}: ${money(row.net)}, ${num(row.count)} invoices. ${segment === row.category.id ? 'Clear' : 'Apply'} category filter`, children: [_jsxs("span", { className: "bar-label", children: [_jsx("span", { children: row.category.name }), _jsx("b", { children: money(row.net) })] }), _jsx("span", { className: "bar-track", children: _jsx("span", { className: "bar-fill", style: { width: `${row.net / max * 100}%`, '--bar-color': BAR_COLORS[i % BAR_COLORS.length] } }) }), focus === row.category.id && _jsxs("span", { className: "chart-tooltip bar-tooltip", role: "status", children: [_jsx("strong", { children: row.category.name }), _jsxs("span", { children: [share.toFixed(1), "% of net sales \u00B7 ", num(row.count), " invoices"] })] })] }, row.category.id);
                }) }) : _jsx(EmptyState, { title: "No category sales", children: "Try expanding the date range or clearing the category filter." }), max > 0 && _jsxs("div", { className: "category-foot", children: [_jsx(Filter, { size: 13 }), _jsx("span", { children: segment === 'all' ? 'Select a bar to filter all views' : 'Select the bar again to clear the category' })] })] });
}
