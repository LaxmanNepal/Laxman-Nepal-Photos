(()=>{
const qs=s=>document.querySelector(s);
window.PhotoFeatures={
  share:async p=>{try{if(navigator.share){await navigator.share({title:p.name,url:p.url})}else{await navigator.clipboard.writeText(p.url);alert('Photo link copied')}}catch(e){}},
  fullscreen:el=>{if(document.fullscreenElement)document.exitFullscreen?.();else el?.requestFullscreen?.()},
  network:()=>navigator.connection?.effectiveType||'unknown',
  reducedMotion:()=>matchMedia('(prefers-reduced-motion: reduce)').matches,
  saveScroll:()=>sessionStorage.setItem('photo-scroll',scrollY),
  restoreScroll:()=>{const y=sessionStorage.getItem('photo-scroll');if(y)requestAnimationFrame(()=>scrollTo({top:+y,behavior:'instant'}))}
};
window.addEventListener('pagehide',PhotoFeatures.saveScroll);
})();