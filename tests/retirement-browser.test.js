const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..');
const server = http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=path.join(root,pathname==='/'?'index.html':pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,body)=>{
  if(error){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');res.end(body);
 });
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.FIRE_TEST_URL||`http://127.0.0.1:${server.address().port}/`);
  await page.click('#retirementTabBtn');
  await page.waitForFunction(()=>document.querySelector('#rCalculationStatus').textContent.includes('Calculating'));
  const start=Date.now();await page.click('#fireTabBtn');
  assert(await page.locator('#firePanel').evaluate(el=>el.classList.contains('active')));
  assert(Date.now()-start<1000,'Tab switch must respond within one second during full calculations');
  await page.click('#retirementTabBtn');
  await page.waitForFunction(()=>window.__retirementReady,{},{timeout:120000});
  assert.match(await page.locator('#rFullMcCaption').innerText(),/1,500 simulations/);
  assert.match(await page.locator('#rLifeSustainableCaption').innerText(),/800 sims/);
  assert.equal(await page.locator('#rAuditTests').innerText(),'12/12 passed');
  // An uncached result finishing later must never replace the latest selection.
  await page.evaluate(()=>{const input=document.querySelector('#rLifeCustom');input.value=47000;input.dispatchEvent(new Event('change'));document.querySelector('#rLife60').click();});
  await page.waitForFunction(()=>document.querySelector('#rLifestyleLab').dataset.annual==='60000');
  await page.waitForFunction(()=>retirementPending.size===0);
  assert.equal(await page.locator('#rLifestyleLab').getAttribute('data-annual'),'60000');
  assert.equal(await page.locator('#rLifeMcSuccess').innerText(),await page.locator('#rFullMcDefault').innerText());
  assert.equal(await page.locator('#rLifestyleLab').getAttribute('aria-busy'),'false');
  const cached=await page.evaluate(async()=>{
   const d=await (await fetch('retirement-data.json')).json();const f=await (await fetch('data.json')).json();rSyncRetirementFromFire(d,f);
   const options={opening:d._engineOpening,simulations:10,endYear:2040};
   const first=rWorkerCall('monteCarlo',d,options),second=rWorkerCall('monteCarlo',d,options);await first;return first===second;
  });assert(cached,'Identical requests share their promise');
  // Simulate a worker loading error; recovery must remain asynchronous and usable.
  await page.evaluate(()=>retirementWorker.onerror(new Event('error')));
  await page.fill('#rLifeCustom','48000');await page.locator('#rLifeCustom').dispatchEvent('change');
  await page.waitForFunction(()=>document.querySelector('#rLifestyleLab').dataset.annual==='48000');
  assert.equal(errors.length,0,errors.join('\n'));
  await page.setViewportSize({width:390,height:844});
  await page.click('#fireTabBtn');await page.click('#retirementTabBtn');
  assert(await page.locator('#retirementPanel').evaluate(el=>el.classList.contains('active')));
  console.log('Browser: full counts, responsive tabs, latest selection, cache, worker recovery and mobile navigation passed');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
