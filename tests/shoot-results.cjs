const puppeteer=require('/tmp/pp/node_modules/puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 for(const [label,w,h,m] of [['desktop',1440,900,false],['mobile',390,844,true]]){
  const p=await b.newPage(); await p.setViewport({width:w,height:h,deviceScaleFactor:m?2:1,isMobile:m});
  await p.goto('http://127.0.0.1:4173/index.html',{waitUntil:'networkidle0'});
  await p.evaluate(()=>document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-in')));
  await new Promise(r=>setTimeout(r,1200));
  const el=await p.$('section[aria-labelledby="results-title"]');
  await el.screenshot({path:`shots/results-section-${label}.png`});
 }
 await b.close();})();
