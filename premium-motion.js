/* PRO DETAILERS V4.29.0 — subtle mobile gyroscope/parallax. */
(function(){
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = document.querySelector(".hero");
  if(!hero || reduce) return;
  let active=false, raf=0, targetX=0, targetY=0, currentX=0, currentY=0;
  function render(){
    raf=0; currentX+=(targetX-currentX)*0.12; currentY+=(targetY-currentY)*0.12;
    hero.style.setProperty("--hero-parallax-x", currentX.toFixed(2)+"px");
    hero.style.setProperty("--hero-parallax-y", currentY.toFixed(2)+"px");
    if(Math.abs(targetX-currentX)>0.08 || Math.abs(targetY-currentY)>0.08) raf=requestAnimationFrame(render);
  }
  function onOrientation(e){
    if(!active) return;
    const gamma=Number(e.gamma||0), beta=Number(e.beta||0);
    targetX=Math.max(-9,Math.min(9,gamma*0.32));
    targetY=Math.max(-7,Math.min(7,(beta-45)*0.10));
    if(!raf) raf=requestAnimationFrame(render);
  }
  function enable(){if(active)return; active=true; window.addEventListener("deviceorientation",onOrientation,{passive:true});}
  const needsPermission=typeof DeviceOrientationEvent!=="undefined" && typeof DeviceOrientationEvent.requestPermission==="function";
  if(needsPermission){
    const request=async()=>{try{if(await DeviceOrientationEvent.requestPermission()==="granted") enable();}catch(_){} };
    window.addEventListener("pointerdown",request,{once:true,passive:true});
  }else enable();
  document.addEventListener("visibilitychange",()=>{if(document.hidden){targetX=0;targetY=0;if(!raf)raf=requestAnimationFrame(render);}});
})();
