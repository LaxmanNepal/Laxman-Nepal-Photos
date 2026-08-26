(()=>{
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
window.PhotoTimeline={
 group(photos){const groups=new Map();for(const p of photos){const d=p.date?new Date(p.date):null;const key=d&&!isNaN(d)?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`:'Unknown';if(!groups.has(key))groups.set(key,{key,title:d?`${MONTHS[d.getMonth()]} ${d.getFullYear()}`:'Date unavailable',photos:[]});groups.get(key).photos.push(p)}return [...groups.values()].sort((a,b)=>b.key.localeCompare(a.key));},
 years(photos){return [...new Set(photos.map(p=>p.date?.slice(0,4)).filter(Boolean))].sort().reverse();},
 search(photos,q){q=(q||'').trim().toLowerCase();if(!q)return photos;return photos.filter(p=>`${p.name} ${p.path} ${p.date||''}`.toLowerCase().includes(q));}
};
})();