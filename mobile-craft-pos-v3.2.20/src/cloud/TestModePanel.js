import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "/vendor/react-jsx-runtime.js";
import { useEffect, useState } from '/vendor/react.js';
import { AlertTriangle, Beaker, CheckCircle2, Trash2 } from '/vendor/lucide-react.js';
import { readPending } from './api.js';
import { queueLoad } from './inventory/queue.js';
export function TestModePanel({ sb, branch, ctx, online, pendingKey, onChanged }) {
    const [busy, setBusy] = useState(false), [phrase, setPhrase] = useState(''), [localPending, setLocalPending] = useState(false), [queuePresent, setQueuePresent] = useState(false), [queueUnknown, setQueueUnknown] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const test = ctx.test_mode === true, required = `RESET ${branch.slug.toUpperCase()} TEST DATA`;
    useEffect(() => {
        let active = true;
        try {
            setLocalPending(Boolean(readPending(pendingKey)));
        }
        catch {
            setLocalPending(true);
        }
        void queueLoad().then(v => { if (active) {
            setQueuePresent(Boolean(v));
            setQueueUnknown(false);
        } }).catch(() => { if (active) {
            setQueueUnknown(true);
            setQueuePresent(true);
        } });
        return () => { active = false; };
    }, [pendingKey]);
    const run = async (action) => {
        if (busy || !online)
            return;
        setBusy(true);
        setError('');
        setNotice('');
        try {
            if (action === 'start') {
                if (!window.confirm('Enable Test Mode for this branch? The app will show a warning. When testing is complete, use Clear test data & go live to remove the temporary records.'))
                    return;
                const { data, error } = await sb.rpc('mc_set_test_mode', { p_branch: branch.id, p_enabled: true });
                if (error)
                    throw error;
                setNotice(typeof data?.message === 'string' ? data.message : 'Test Mode enabled.');
            }
            else {
                if (localPending)
                    throw Error('This device has an unresolved posting request. Resolve it before clearing test data.');
                if (queuePresent || queueUnknown)
                    throw Error('This device has an offline queue. Open Offline queue and remove or sync it before reset.');
                if (phrase !== required)
                    throw Error(`Type exactly: ${required}`);
                if (!window.confirm('PERMANENT RESET: This removes all products, test bills, customers, suppliers, purchases, expenses, stock movements, adjustments, transfers and reports for this branch. It keeps the Owner/Staff accounts, branch, shop/GST settings, Main Shop location and default categories. Have you checked offline queues on every device?'))
                    return;
                const { data, error } = await sb.rpc('mc_reset_test_data', { p_branch: branch.id, p_confirmation: phrase });
                if (error)
                    throw error;
                setPhrase('');
                setNotice('Test data cleared. The branch is now in live mode.');
            }
            onChanged();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Could not update Test Mode. Check the connection and permissions.');
        }
        finally {
            setBusy(false);
        }
    };
    return _jsxs("section", { className: "panel cloud-panel mc-test-mode", "aria-label": "Test mode and test data reset", children: [_jsxs("div", { className: "cloud-panel-head", children: [_jsxs("div", { children: [_jsxs("h2", { children: [_jsx(Beaker, { size: 17 }), " Test mode & clean start"] }), _jsx("p", { children: "Safely try the POS before recording real shop transactions." })] }), _jsx("span", { className: `cloud-state ${test ? 'mc-test-state' : 'mc-live-state'}`, children: test ? 'TEST MODE' : 'LIVE MODE' })] }), test ? _jsxs(_Fragment, { children: [_jsxs("div", { className: "mc-test-warning", children: [_jsx(AlertTriangle, { size: 18 }), _jsxs("div", { children: [_jsxs("b", { children: ["Testing is active for ", branch.name, "."] }), _jsx("p", { children: "Sales, purchases, expenses, customers, suppliers and inventory entries created now are temporary. Do not enter real shop transactions until you clear test data and switch to live mode." })] })] }), _jsxs("div", { className: "cloud-op-form", children: [_jsxs("label", { children: ["Type the reset phrase to enable the clean-start action", _jsx("input", { value: phrase, onChange: e => setPhrase(e.target.value), autoCapitalize: "characters", spellCheck: false, placeholder: required })] }), _jsxs("small", { children: ["Required phrase: ", _jsx("b", { children: required })] })] }), (localPending || queuePresent || queueUnknown) && _jsxs("div", { className: "mc-test-warning", children: [_jsx(AlertTriangle, { size: 17 }), _jsxs("div", { children: [_jsx("b", { children: "Offline / pending items must be cleared first." }), _jsxs("p", { children: [localPending ? 'This device has a pending server request. ' : '', queueUnknown ? 'This device’s offline queue could not be checked. ' : queuePresent ? 'An encrypted offline queue exists on this device. ' : '', "Also check every other phone, tablet and counter device. The server cannot inspect another device\u2019s local queue."] })] })] }), _jsxs("button", { className: "button mc-danger-button", type: "button", disabled: !online || busy || phrase !== required || localPending || queuePresent || queueUnknown, onClick: () => void run('reset'), children: [_jsx(Trash2, { size: 16 }), busy ? 'Clearing test data…' : 'Clear all test data & go live'] }), _jsx("small", { className: "biz-note", children: "Reset keeps Owner/Staff logins, Ramanattukara branch, shop identity/GST settings, Main Shop and default categories. It deletes the branch catalogue and all temporary business records." })] }) : _jsxs(_Fragment, { children: [_jsx("p", { children: "Test Mode is off. You can enable it only before real sales, purchases, customers/suppliers, invoice numbering or stock movement is recorded. Existing zero-stock setup products may be cleared when you finish testing." }), _jsxs("button", { className: "button primary-button", type: "button", disabled: !online || busy, onClick: () => void run('start'), children: [_jsx(Beaker, { size: 16 }), busy ? 'Enabling…' : 'Enable Test Mode'] })] }), error && _jsx("p", { role: "alert", className: "mc-test-error", children: error }), notice && _jsxs("p", { role: "status", className: "mc-test-notice", children: [_jsx(CheckCircle2, { size: 15 }), notice] })] });
}
