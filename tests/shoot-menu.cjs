const puppeteer=require('/tmp/pp/node_modules/puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 const p=await b.newPage(); await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
 await p.goto('http://127.0.0.1:4173/index.html',{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,2600));
 await p.screenshot({path:process.argv[2]+'/index-m-fold.png'});
 await p.click('.menu-toggle'); await new Promise(r=>setTimeout(r,600));
 await p.screenshot({path:process.argv[2]+'/menu-m2.png'});
 await p.setViewport({width:1024,height:768}); await p.goto('http://127.0.0.1:4173/index.html',{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,2600));
 await p.screenshot({path:process.argv[2]+'/index-t-fold.png'});
 await b.close();})();
