// Mobile Craft POS v3.2.20 early-start recovery.
// Classic script by design: the watchdog must still work if an ES module fails to load.
(function () {
  'use strict';

  var root = document.getElementById('root');
  var recoveryKey = 'mc-pos-boot-recovered';
  var recoveryAlreadyUsed = false;
  var reloading = false;

  function isReady() {
    return !!(root && root.dataset && root.dataset.appReady === 'true');
  }

  function showRecoveryFailure() {
    if (!root || isReady()) return;
    root.innerHTML =
      '<main id="mc-boot-screen" role="alert" aria-live="assertive">' +
      '<div class="mc-boot-mark" aria-hidden="true">MC</div>' +
      '<p class="mc-boot-kicker">MOBILE CRAFT POS</p>' +
      '<h1>Workspace could not start</h1>' +
      '<p class="mc-boot-copy">The app could not finish loading after a safe cache refresh. Your shop data was not cleared or changed. Check your connection and retry.</p>' +
      '<button class="mc-boot-retry" data-mc-retry type="button">Try again</button>' +
      '</main>';
    var button = root.querySelector('[data-mc-retry]');
    if (button) {
      button.addEventListener('click', function () {
        try { sessionStorage.removeItem(recoveryKey); } catch (e) { /* optional storage */ }
        window.location.reload();
      });
    }
  }

  try {
    recoveryAlreadyUsed = sessionStorage.getItem(recoveryKey) === '1';
  } catch (e) {
    // The startup fallback still works when session storage is blocked.
    recoveryAlreadyUsed = false;
  }

  // On the one retry, do not immediately register the worker we just removed.
  // This lets the app attempt a clean network load without a stale controller.
  if (!recoveryAlreadyUsed && 'serviceWorker' in navigator && window.isSecureContext) {
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' })
      .catch(function (error) {
        console.warn('[Mobile Craft POS] Service Worker registration failed; online startup continues.', error);
      });

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController || reloading || isReady()) return;
      reloading = true;
      window.location.reload();
    });
  }

  function recoverOnce() {
    if (!root || isReady()) return;

    if (recoveryAlreadyUsed) {
      showRecoveryFailure();
      return;
    }

    try {
      sessionStorage.setItem(recoveryKey, '1');
    } catch (e) {
      showRecoveryFailure();
      return;
    }

    var removeWorkers = Promise.resolve();
    if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
      removeWorkers = navigator.serviceWorker.getRegistrations().then(function (registrations) {
        var owned = registrations.filter(function (registration) {
          try {
            var scope = new URL(registration.scope);
            return scope.origin === location.origin && scope.pathname === '/';
          } catch (e) {
            return false;
          }
        });
        return Promise.all(owned.map(function (registration) {
          return registration.unregister().catch(function () { return false; });
        }));
      }).catch(function (error) {
        console.warn('[Mobile Craft POS] Could not remove old Service Worker.', error);
      });
    }

    removeWorkers.then(function () {
      if (!('caches' in window)) return;
      return caches.keys().then(function (names) {
        var owned = names.filter(function (name) { return name.indexOf('mc-pos-shell-') === 0; });
        return Promise.all(owned.map(function (name) {
          return caches.delete(name).catch(function () { return false; });
        }));
      });
    }).catch(function (error) {
      // A cache cleanup failure must not block the network retry.
      console.warn('[Mobile Craft POS] Cache recovery was incomplete.', error);
    }).then(function () {
      if (!isReady() && !reloading) {
        reloading = true;
        window.location.reload();
      }
    });
  }

  // Start immediately. Do not depend on window.load: a stalled module graph can delay it.
  window.setTimeout(recoverOnce, 18000);
})();
