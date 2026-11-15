const puppeteer=require('/tmp/pp/node_modules/puppeteer-core');
const fs=require('fs');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:false,args:['--no-sandbox']});
 const p=await b.newPage();
 await p.setViewport({width:1440,height:900});
 const urls=process.argv.slice(2);
 for(const u of urls){
  try{
   await p.goto(u,{waitUntil:'networkidle2',timeout:45000});
   await new Promise(r=>setTimeout(r,5000));
   const name=u.replace(/https?:\/\/[^/]+/,'').replace(/[^a-z0-9]+/gi,'_')||'home';
   fs.writeFileSync('/workspace/standard-athletic-site/research/'+name+'.txt',(await p.title())+'\n'+u+'\n'+await p.evaluate(()=>document.body.innerText));
   fs.writeFileSync('/workspace/standard-athletic-site/research/'+name+'.html',await p.content());
   const links=await p.evaluate(()=>[...document.querySelectorAll('a')].map(a=>a.innerText.trim().replace(/\s+/g,' ')+' => '+a.href));
   fs.writeFileSync('/workspace/standard-athletic-site/research/'+name+'.links',links.join('\n'));
   await p.screenshot({path:'/workspace/standard-athletic-site/research/'+name+'.png'});
   console.log('ok',u,name);
  }catch(e){console.log('fail',u,e.message)}
 }
 await b.close();
})();
