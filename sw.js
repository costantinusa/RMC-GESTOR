const CACHE='rmc-gestion-v12-cloud-documents';
const ASSETS=['./','./index.html','./cuenta.html','./manifest.webmanifest','./rmc-logo.jpg','./ocr-v2.js','./cloud-docs.js','./cloud-index.js'];
const OLD_LOGO='<div><div class="brand">RMC<span>.</span></div><div class="tag">CLIMATIZACIÓN · INSTALACIÓN · MANTENIMIENTO</div></div>';
const NEW_LOGO='<div><img class="rmc-logo" src="./rmc-logo.jpg?v=1" alt="RMC Climatización"></div>';
const DOC_BOOT='<script src="./cloud-docs.js?v=2"><\/script>';
const INDEX_BOOT='<script src="./cloud-index.js?v=1"><\/script>';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))]))});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(u.origin===location.origin && u.pathname.endsWith('/documentos.html')){
  e.respondWith(fetch(e.request,{cache:'no-store'}).then(async r=>{let t=await r.text();t=t.replace(OLD_LOGO,NEW_LOGO).replace('</style>','.rmc-logo{width:100%;max-width:102mm;height:auto;display:block}</style>');if(!t.includes('cloud-docs.js'))t=t.replace('</body>',DOC_BOOT+'</body>');const h=new Headers(r.headers);h.set('content-type','text/html; charset=utf-8');h.set('cache-control','no-store');return new Response(t,{status:r.status,statusText:r.statusText,headers:h})}));return;
 }
 if(u.origin===location.origin && (u.pathname.endsWith('/RMC-GESTOR/')||u.pathname.endsWith('/index.html'))){
  e.respondWith(fetch(e.request,{cache:'no-store'}).then(async r=>{let t=await r.text();if(!t.includes('cloud-index.js'))t=t.replace('</body>',INDEX_BOOT+'</body>');const h=new Headers(r.headers);h.set('content-type','text/html; charset=utf-8');h.set('cache-control','no-store');return new Response(t,{status:r.status,statusText:r.statusText,headers:h})}));return;
 }
 e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)));
});
