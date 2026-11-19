// Reload the open POS tab once a newly installed service worker takes control.
// This prevents the old cached Catalogue.js from staying mounted after a deployment.
if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}
