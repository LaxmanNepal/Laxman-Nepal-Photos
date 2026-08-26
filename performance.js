(()=>{
const CDN='https://cdn.jsdelivr.net/gh/LaxmanNepal/Laxman-Nepal-Photos@main/Images/';
const proxy=(src,w=900)=>{if(!src||!src.includes('/Images/'))return src;const file=src.split('/Images/').pop();return 'https://wsrv.nl/?url='+encodeURIComponent(CDN+decodeURIComponent(file))+'&w='+w+'&q=78&output=webp&il';};
const optimize=img=>{if(img.dataset.optimized)return;const src=img.currentSrc||img.src;if(!src||!src.includes('/Images/'))return;img.dataset.optimized='1';const w=Math.min(1200,Math.max(480,Math.round((img.getBoundingClientRect().width||600)*devicePixelRatio)));img.src=proxy(src,w)};
const scan=()=>document.querySelectorAll('img').forEach(optimize);
new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',()=>{scan();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});});
})();