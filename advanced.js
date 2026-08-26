(()=>{
'use strict';
const cfg=window.LAXMAN_PHOTO_CONFIG||{};
const idle=window.requestIdleCallback||((fn)=>setTimeout(fn,120));

// PWA + install UX
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;window.dispatchEvent(new CustomEvent('laxman:install-ready'))});
window.laxmanInstall=async()=>{if(!deferredPrompt)return false;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;return true};

// Faster repeat visits: warm the next two viewer images only.
const warm=()=>{const imgs=[...document.querySelectorAll('.card img')].slice(0,6);imgs.forEach(i=>{const u=i.currentSrc||i.src;if(u){const x=new Image();x.decoding='async';x.src=u}})};
window.addEventListener('load',()=>idle(warm));

// Network-aware image priority.
const tune=()=>document.querySelectorAll('.card img').forEach((img,i)=>{img.decoding='async';img.fetchPriority=i<4?'high':'low'});
new MutationObserver(tune).observe(document.body,{childList:true,subtree:true});

// Share the currently displayed image where supported.
window.laxmanShare=async()=>{const img=document.querySelector('#viewerImg');if(!img)return false;const data={title:'Laxman Nepal Photos',text:document.querySelector('#vname')?.textContent||'Photo',url:img.currentSrc||img.src};if(navigator.share){try{await navigator.share(data);return true}catch(e){}}try{await navigator.clipboard.writeText(data.url);return true}catch(e){return false}};

// Touch swipe for the fullscreen viewer.
let sx=0,sy=0;document.addEventListener('touchstart',e=>{if(document.querySelector('#viewer.open')){sx=e.changedTouches[0].clientX;sy=e.changedTouches[0].clientY}},{passive:true});
document.addEventListener('touchend',e=>{if(!document.querySelector('#viewer.open'))return;const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)){document.querySelector(dx<0?'#next':'#prev')?.click()}},{passive:true});

// Double-click/tap fullscreen image to zoom.
document.addEventListener('dblclick',e=>{if(e.target?.id==='viewerImg')document.querySelector('#zoom')?.click()});

// Register manifest dynamically so the existing HTML does not need to be rebuilt.
if(!document.querySelector('link[rel="manifest"]')){const l=document.createElement('link');l.rel='manifest';l.href='./manifest.webmanifest';document.head.appendChild(l)}
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
})();