const puppeteer=require('/tmp/pp/node_modules/puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 const p=await b.newPage(); await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await p.goto('http://127.0.0.1:4173/index.html',{waitUntil:'networkidle0'});
 await p.click('.menu-toggle'); await new Promise(r=>setTimeout(r,800));
 await p.screenshot({path:process.argv[2]+'/menu-m.png'});
 await b.close();})();
