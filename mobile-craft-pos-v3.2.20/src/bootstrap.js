const root = document.getElementById('root');
let failed = false;

function showBootFailure(kind) {
  if (!root || root.dataset.appReady === 'true' || failed) return;
  failed = true;
  const safeKind = String(kind).replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 48) || 'LOAD-ERROR';
  console.error('[Mobile Craft POS startup]', safeKind);
  root.innerHTML = `
    <main id="mc-boot-screen" role="alert" aria-live="assertive">
      <div class="mc-boot-mark" aria-hidden="true">MC</div>
      <p class="mc-boot-kicker">MOBILE CRAFT POS</p>
      <h1>Could not open the shop workspace</h1>
      <p class="mc-boot-copy">The app did not finish loading. Your shop data has not been changed. Check the connection and try again.</p>
      <p class="mc-boot-error">Startup check: ${safeKind}</p>
      <button class="mc-boot-retry" data-mc-boot-retry type="button">Reload Mobile Craft</button>
    </main>`;
  root.querySelector('[data-mc-boot-retry]')?.addEventListener('click', () => {
    try { sessionStorage.removeItem('mc-pos-boot-recovered'); } catch { /* optional storage */ }
    window.location.reload();
  });
}

window.addEventListener('error', (event) => {
  if (root?.dataset.appReady === 'true') return;
  if (event.error || event.target instanceof HTMLScriptElement) {
    showBootFailure(event.error?.name || 'SCRIPT-LOAD-ERROR');
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  if (root?.dataset.appReady !== 'true') {
    showBootFailure(event.reason?.name || 'STARTUP-REJECTION');
  }
});

const startupTimer = window.setTimeout(() => {
  if (root?.dataset.appReady !== 'true') showBootFailure('STARTUP-TIMEOUT');
}, 16000);

import('/src/cloud/main.js').catch((error) => {
  window.clearTimeout(startupTimer);
  showBootFailure(error?.name || 'MODULE-IMPORT-ERROR');
});
