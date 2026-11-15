const puppeteer=require('/tmp/pp/node_modules/puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:false,args:['--no-sandbox']});
 const p=await b.newPage(); await p.setViewport({width:1440,height:900});
 for(const [n,u] of [['srh','https://www.sunrisershyderabad.in/'],['sec','https://www.sunriserseasterncape.co.za/'],['yorks','https://www.yorkshireccc.com/'],['rr','https://www.rajasthanroyals.com/'],['csk','https://www.chennaisuperkings.com/']]){
  try{await p.goto(u,{waitUntil:'domcontentloaded',timeout:30000});await new Promise(r=>setTimeout(r,6000));
  await p.screenshot({path:`refs/${n}.png`});await p.evaluate(()=>window.scrollBy(0,900));await new Promise(r=>setTimeout(r,2000));await p.screenshot({path:`refs/${n}-2.png`});console.log('ok',n)}catch(e){console.log('fail',n,e.message)}
 }
 await b.close();})();
