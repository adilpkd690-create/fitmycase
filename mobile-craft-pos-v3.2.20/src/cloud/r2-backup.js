import { enableR2AutoBackup, getR2AutoBackupInfo, sealR2Backup, setR2AutoBackupLastRun } from './vault.js';

// Dedicated private Worker. It validates the Supabase access token and owner branch role.
export const R2_BACKUP_API = 'https://mobile-craft-r2-backup.adilpkd690.workers.dev';
const isoFileTime = () => new Date().toISOString().replace(/[:.]/g, '-');

export async function checkR2BackupWorker() {
    let response;
    try { response = await fetch(`${R2_BACKUP_API}/health`, { cache: 'no-store' }); }
    catch { throw new Error('R2 backup Worker is not deployed yet. Activate R2 and deploy the Worker first.'); }
    let data;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok || data?.ok !== true || data?.storage !== true || data?.auth !== true)
        throw new Error(data?.error || 'R2 bucket binding is not ready. Finish the Cloudflare R2 setup first.');
    return data;
}

async function workerRequest(path, token, init = {}) {
    let response;
    try {
        response = await fetch(`${R2_BACKUP_API}${path}`, {
            ...init,
            headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
    } catch {
        throw new Error('R2 backup service is not reachable yet. Activate R2 and deploy the backup Worker first.');
    }
    let body = null;
    try { body = await response.json(); } catch { /* non-JSON Worker response */ }
    if (!response.ok || body?.ok === false)
        throw new Error(body?.error || `R2 backup request failed (${response.status}).`);
    return body;
}

async function currentAccessToken(sb) {
    const { data, error } = await sb.auth.getSession();
    const token = data?.session?.access_token;
    if (error || !token)
        throw new Error('Your shop login expired. Sign in again before backing up.');
    return token;
}

async function exportSnapshot(sb, branch) {
    const { data, error } = await sb.rpc('mc_export_branch', { p_branch: branch.id }).abortSignal(AbortSignal.timeout(120000));
    if (error || data?.format !== 'mobile-craft-cloud-branch/2')
        throw new Error('Could not prepare the complete owner-only shop snapshot. No R2 backup was uploaded.');
    return data;
}

export async function uploadR2Snapshot(sb, branch, snapshot) {
    const info = await getR2AutoBackupInfo(branch.id);
    if (!info?.enabled)
        throw new Error('Enable encrypted R2 backup on this owner device first.');
    const token = await currentAccessToken(sb);
    const encrypted = await sealR2Backup(branch.id, snapshot);
    const result = await workerRequest(`/api/backups?branchId=${encodeURIComponent(branch.id)}`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-MC-Backup-Format': 'mobile-craft-r2-encrypted/1', 'X-MC-Backup-Branch': branch.id },
        body: JSON.stringify(encrypted),
    });
    await setR2AutoBackupLastRun(branch.id, result.uploadedAt ?? new Date().toISOString());
    return result;
}

export async function enableAndUploadR2(sb, branch, passphrase) {
    await checkR2BackupWorker();
    await enableR2AutoBackup(branch.id, passphrase);
    const snapshot = await exportSnapshot(sb, branch);
    return uploadR2Snapshot(sb, branch, snapshot);
}

export async function runDailyR2Backup(sb, branch) {
    const info = await getR2AutoBackupInfo(branch.id);
    if (!info?.enabled)
        return null;
    const last = info.lastBackupAt ? Date.parse(info.lastBackupAt) : 0;
    if (Number.isFinite(last) && Date.now() - last < 23 * 60 * 60 * 1000)
        return null;
    if (!navigator.locks?.request)
        throw new Error('Daily backup needs a recent Chrome or Edge browser with Web Locks support.');
    return navigator.locks.request(`mc-r2-backup:${branch.id}`, async () => {
        const latest = await getR2AutoBackupInfo(branch.id);
        const previous = latest?.lastBackupAt ? Date.parse(latest.lastBackupAt) : 0;
        if (!latest?.enabled || (Number.isFinite(previous) && Date.now() - previous < 23 * 60 * 60 * 1000))
            return null;
        const snapshot = await exportSnapshot(sb, branch);
        return uploadR2Snapshot(sb, branch, snapshot);
    });
}

export async function listR2Backups(sb, branch) {
    const token = await currentAccessToken(sb);
    return workerRequest(`/api/backups?branchId=${encodeURIComponent(branch.id)}`, token);
}

export async function downloadR2Backup(sb, branch, key) {
    const token = await currentAccessToken(sb);
    let response;
    try {
        response = await fetch(`${R2_BACKUP_API}/api/backups/download?branchId=${encodeURIComponent(branch.id)}&key=${encodeURIComponent(key)}`, {
            headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
        });
    } catch { throw new Error('R2 backup service is not reachable.'); }
    if (!response.ok) {
        let body = null; try { body = await response.json(); } catch { /* non-JSON error */ }
        throw new Error(body?.error || `R2 backup download failed (${response.status}).`);
    }
    const blob = await response.blob();
    if (!blob.size || blob.size > 90 * 1024 * 1024 || !/application\/json/i.test(blob.type))
        throw new Error('The downloaded R2 snapshot is empty, too large, or not a JSON backup.');
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url;
    a.download = `mobile-craft-${branch.slug}-${isoFileTime()}.encrypted.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return { downloaded: true, bytes: blob.size };
}
