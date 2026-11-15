#!/bin/sh
# Usage: tests/lighthouse-all.sh  (server must be running on :4173)
cd "$(dirname "$0")/.." && mkdir -p docs/lighthouse && export CHROME_PATH=/usr/bin/google-chrome
for pg in index about teams fixtures news events gallery sponsors ground contact join; do
  for f in mobile desktop; do
    P=""; [ $f = desktop ] && P="--preset=desktop"
    npx lighthouse http://127.0.0.1:4173/$pg.html $P --chrome-flags="--headless=new --no-sandbox" --output=json --output-path=docs/lighthouse/$pg-$f.json --quiet >/dev/null 2>&1
  done
done
node -e "
const fs=require('fs');const rows=[];for(const f of fs.readdirSync('docs/lighthouse').sort()){if(!f.endsWith('.json'))continue;const j=JSON.parse(fs.readFileSync('docs/lighthouse/'+f));const c=j.categories;rows.push([f.replace('.json',''),...['performance','accessibility','best-practices','seo'].map(k=>Math.round(c[k].score*100)),j.audits['largest-contentful-paint'].displayValue,j.audits['cumulative-layout-shift'].displayValue,j.audits['total-blocking-time'].displayValue])}
console.log('page | perf | a11y | best | seo | LCP | CLS | TBT');rows.forEach(r=>console.log(r.join(' | ')));fs.writeFileSync('docs/lighthouse/SUMMARY.md','| page | perf | a11y | best-practices | seo | LCP | CLS | TBT |\n|---|---|---|---|---|---|---|---|\n'+rows.map(r=>'| '+r.join(' | ')+' |').join('\n')+'\n')"
