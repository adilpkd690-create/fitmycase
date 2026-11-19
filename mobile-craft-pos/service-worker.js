// Static shell only. No Supabase request, bearer token, catalogue, or invoice is cached here.
const version='mc-pos-shell-v3-2-4-sw-install-fix'
const assets=new Set(["/","/404.html","/THIRD-PARTY-NOTICES.txt","/assets/barcode-Chrj_VP3.js","/assets/es-Cu6rIZmf.js","/assets/react-runtime-BRQKxcQO.js","/assets/supabase-Boh_l_kx.js","/brand.svg","/fonts/Inter-OFL.txt","/fonts/PlusJakartaSans-OFL.txt","/fonts/inter-latin-ext.woff2","/fonts/inter-latin.woff2","/fonts/jakarta-latin-ext.woff2","/fonts/jakarta-latin.woff2","/manifest.webmanifest","/mobile-craft-logo.jpg","/pwa/icon-192.png","/pwa/icon-512.png","/robots.txt","/src/App.js","/src/cloud/BusinessForms.js","/src/cloud/BusinessPages.js","/src/cloud/Offline.js","/src/cloud/StoreForms.js","/src/cloud/TestModePanel.js","/src/cloud/amounts.js","/src/cloud/api.js","/src/cloud/business.css","/src/cloud/business.js","/src/cloud/cloud.css","/src/cloud/inventory/Catalogue.js","/src/cloud/inventory/Import.js","/src/cloud/inventory/OfflineQueue.js","/src/cloud/inventory/Purchases.js","/src/cloud/inventory/Reports.js","/src/cloud/inventory/StockOps.js","/src/cloud/inventory/Workspace.js","/src/cloud/inventory/barcode-label-pdf.js","/src/cloud/inventory/core.js","/src/cloud/inventory/files.js","/src/cloud/inventory/inventory.css","/src/cloud/inventory/queue.js","/src/cloud/main.js","/src/cloud/receipt-pdf.js","/src/cloud/vault.js","/src/components/Charts.js","/src/components/Controls.js","/src/components/Transactions.js","/src/data.js","/src/main.js","/src/pos/BarcodeScanner.js","/src/pos/Dashboard.js","/src/pos/Finance.js","/src/pos/Inventory.js","/src/pos/Sales.js","/src/pos/Settings.js","/src/pos/Workspace.js","/src/pos/barcode-match.js","/src/pos/barcode.js","/src/pos/context.js","/src/pos/engine.js","/src/pos/mode.js","/src/pos/pos.css","/src/pos/printing.js","/src/pos/reports.js","/src/pos/scanner.css","/src/pos/seed.js","/src/pos/storage.js","/src/pos/ui.js","/src/pos/zxing.browser.js","/src/styles.css","/sw-update.js","/vendor/fflate.js","/vendor/jsbarcode.js","/vendor/lucide-react.js","/vendor/pako.min.js","/vendor/pdf-lib.js","/vendor/react-dom-client.js","/vendor/react-dom.js","/vendor/react-jsx-runtime.js","/vendor/react.js","/vendor/supabase.js","/vendor/zxing-barcode-format.js","/vendor/zxing-binary-bitmap.js","/vendor/zxing-decode-hint-type.js","/vendor/zxing-global-binarizer.js","/vendor/zxing-not-found.js","/vendor/zxing-one-d-reader.js","/vendor/zxing-rgb-luminance.js","/vendor/zxing.js"])
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(version)
    try{
      await cache.addAll([...assets].map(path=>new Request(path,{cache:'reload'})))
      await self.skipWaiting()
    }catch(error){
      await caches.delete(version)
      throw error
    }
  })())
})
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('mc-pos-shell-')&&k!==version).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))
})
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url)
  if(req.method!=='GET'||url.origin!==self.location.origin)return
  if(req.mode==='navigate'&&['/','/index.html','/cloud','/cloud/'].includes(url.pathname)){
    event.respondWith((async()=>{
      const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),3500)
      try{const r=await fetch(req,{signal:controller.signal});if(r.ok||r.status<500)return r}catch{/* Fall back to our version's installation snapshot. */}finally{clearTimeout(timer)}
      const cache=await caches.open(version)
      return await cache.match('/')??new Response('Connect to finish installing Mobile Craft POS.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})
    })());return
  }
  if(assets.has(url.pathname)&&url.pathname!=='/')event.respondWith(caches.open(version).then(async cache=>await cache.match(url.pathname)??fetch(req)))
})
