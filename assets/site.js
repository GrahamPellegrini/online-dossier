(function(){
  const prefetched=new Set();
  const canPrefetch=link=>{
    if(!link||prefetched.has(link.href))return false;
    const url=new URL(link.href,location.href);
    return url.origin===location.origin;
  };
  const prefetch=link=>{
    if(!canPrefetch(link))return;
    prefetched.add(link.href);
    const hint=document.createElement("link");
    hint.rel="prefetch";
    hint.href=link.href;
    hint.as=link.dataset.prefetchAs||"document";
    document.head.appendChild(hint);
  };
  document.querySelectorAll("a[data-prefetch]").forEach(link=>{
    let timer=0;
    link.addEventListener("pointerenter",()=>{
      timer=window.setTimeout(()=>prefetch(link),65);
    });
    link.addEventListener("pointerleave",()=>{
      if(timer)window.clearTimeout(timer);
    });
    link.addEventListener("touchstart",()=>prefetch(link),{passive:true});
    link.addEventListener("focus",()=>prefetch(link));
  });
  document.querySelectorAll("a[data-preview-src]").forEach(link=>{
    const url=new URL(link.dataset.previewSrc,location.href);
    link.style.setProperty("--preview-image",`url("${url.href}")`);
  });
})();
