const puppeteer=require('/tmp/pp/node_modules/puppeteer-core');
(async()=>{
 const [,, outdir, ...pages]=process.argv;
 const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 for(const [label,w,h,mobile] of [['d',1440,900,false],['m',390,844,true]]){
  const p=await b.newPage(); await p.setViewport({width:w,height:h,deviceScaleFactor:mobile?2:1,isMobile:mobile});
  p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('CONSOLE',m.text())});
  for(const pg of pages){
   await p.goto('http://127.0.0.1:4173/'+pg,{waitUntil:'networkidle0'});
   await new Promise(r=>setTimeout(r,2600));
   await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}window.scrollTo(0,0);document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-in'))});
   await new Promise(r=>setTimeout(r,900));
   const n=(pg||'index.html').replace('.html','');
   await p.screenshot({path:`${outdir}/${n}-${label}-fold.png`});
   await p.screenshot({path:`${outdir}/${n}-${label}-full.png`,fullPage:true});
  }
 }
 await b.close();})();
