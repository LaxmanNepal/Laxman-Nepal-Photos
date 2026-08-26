const CACHE='laxman-photos-v1';
const APP=['./','./index.html','./performance.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET')return;
 if(u.hostname==='cdn.jsdelivr.net'||u.hostname==='wsrv.nl'){
  e.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(e.request);const net=fetch(e.request).then(r=>{if(r.ok)c.put(e.request,r.clone());return r}).catch(()=>hit);return hit||net;}));
 }
});