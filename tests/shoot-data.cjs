const puppeteer=require('/tmp/pp/node_modules/puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 for(const [label,w,h,m] of [['desktop',1440,900,false],['mobile',390,844,true]]){
  const p=await b.newPage(); await p.setViewport({width:w,height:h,deviceScaleFactor:m?2:1,isMobile:m});
  const go=async(u)=>{await p.goto('http://127.0.0.1:4173/'+u,{waitUntil:'networkidle0'});await p.evaluate(()=>document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-in')));await new Promise(r=>setTimeout(r,1200));await p.evaluate(()=>{for(const e of document.querySelectorAll('.masthead,.skip'))e.style.position='static'});};
  await go('index.html');
  await (await p.$('section[aria-labelledby="results-title"]')).screenshot({path:`shots/home-recent-matches-${label}.png`});
  await (await p.$('section[aria-labelledby="teams-title"]')).screenshot({path:`shots/home-squads-${label}.png`});
  await go('fixtures.html');
  await p.screenshot({path:`shots/fixtures-${label}-full.png`,fullPage:true});
  await p.select('#league-select','mcl-f40-div-b'); await new Promise(r=>setTimeout(r,300));
  await (await p.$('#results')).screenshot({path:`shots/fixtures-league-select-div-b-${label}.png`});
  await go('teams.html');
  await p.screenshot({path:`shots/teams-${label}-full.png`,fullPage:true});
 }
 await b.close();})();
