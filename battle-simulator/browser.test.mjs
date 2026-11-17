import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url)),docs=path.join(root,'docs');await mkdir(docs,{recursive:true});
const checks=[];const check=(name,value)=>{assert.ok(value,name);checks.push({name,pass:true});};
const server=createServer(async(req,res)=>{try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!f.startsWith(root+path.sep))throw Error('path');const b=await readFile(f);res.setHeader('Content-Type',f.endsWith('.mjs')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(b);}catch{res.statusCode=404;res.end('Not found');}});await new Promise(r=>server.listen(4173,'127.0.0.1',r));
const browser=await chromium.launch();let failure=null;
try{
 for(const width of [320,390,428,768,1280]){
  const context=await browser.newContext({viewport:{width,height:900},permissions:['clipboard-read','clipboard-write']});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4173/');await page.locator('#a-LightInfantry').waitFor();
  check('workspace no horizontal overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===390)await page.screenshot({path:path.join(docs,'mobile-workspace.png'),fullPage:true});
  await page.locator('#calculate').click();await page.locator('#reportBtn').click();await page.locator('#reportDialog[open]').waitFor();
  check('dialog no horizontal overflow '+width,await page.locator('#reportDialog').evaluate(e=>e.scrollWidth<=e.clientWidth));
  check('forge comparison is20 and70 '+width,(await page.locator('#comparisonContent').innerText()).includes('20%')&&(await page.locator('#comparisonContent').innerText()).includes('70%'));
  check('point delta50 and relative41.67 '+width,(await page.locator('#comparisonContent').innerText()).includes('50 نقطة مئوية')&&(await page.locator('#comparisonContent').innerText()).includes('41.67%'));
  if(width===390||width===1280)await page.screenshot({path:path.join(docs,'report-'+width+'.png')});
  await page.locator('#reportContent .troop-report [data-unit="LightInfantry"]').click();await page.locator('#unitDialog[open]').waitFor();check('unit details no overflow '+width,await page.locator('#unitDialog').evaluate(e=>e.scrollWidth<=e.clientWidth));
  if(width===390)await page.screenshot({path:path.join(docs,'forge-detail-mobile.png')});await page.locator('[data-close="unitDialog"]').click();
  await page.locator('#reportView').selectOption('attacker');const text=await page.locator('#comparisonContent').innerText();check('attacker hidden forge and no arrows '+width,text.includes('؟؟؟')&&!text.includes('↑')&&!text.includes('↓'));
  check('hospital says coming soon '+width,(await page.locator('#reportContent .coming').innerText()).includes('قريبًا'));
  await page.locator('#shareReport').click();const url=await page.locator('#shareOutput').inputValue();check('report link created '+width,url.includes('#r='));
  const shared=await context.newPage();shared.on('pageerror',e=>errors.push(e.message));await shared.goto(url);await shared.locator('#reportDialog[open]').waitFor();check('shared report perspective locked '+width,await shared.locator('#reportView').isDisabled());check('shared page no editable scenario '+width,await shared.locator('#workspace').isHidden());check('shared report no enemy forge '+width,!(await shared.locator('#comparisonContent').innerText()).includes('70%'));await shared.close();
  const dp=page.waitForEvent('download');await page.locator('#exportReport').click();const dl=await dp;const jf=await dl.path();const report=JSON.parse(await readFile(jf,'utf8'));check('export has no enemy array '+width,report.sides.defender.rows===null&&report.power===null&&report.wall===null&&!('stock' in report.loot)&&!('scenario' in report));
  await page.locator('[data-close="reportDialog"]').click();await page.locator('[data-example="small"]').click();await page.locator('#calculate').click();await page.locator('#reportBtn').click();await page.locator('#reportDialog[open]').waitFor();
  check('2000 versus50000 report hides defender '+width,!(await page.locator('#reportContent').innerText()).includes('50,000')&&(await page.locator('#reportContent').innerText()).includes('لم يعد ناجون'));
  if(width===390)await page.screenshot({path:path.join(docs,'concealed-report-mobile.png')});
  await page.locator('[data-close="reportDialog"]').click();await page.locator('#a-LightInfantry').fill('2');check('input invalidates report '+width,await page.locator('#reportBtn').isDisabled());await page.locator('#a-LightInfantry').fill('-1');await page.locator('#calculate').click();check('negative input rejected '+width,await page.locator('#error').isVisible());
  await page.locator('[data-example="loot"]').click();await page.locator('#cargoDetails summary').click();await page.locator('#clearCarry').click();await page.locator('#calculate').click();await page.locator('#reportBtn').click();check('missing carry never invents loot '+width,(await page.locator('#reportContent').innerText()).includes('حسبة النهب غير مؤكدة'));
  await page.locator('[data-close="reportDialog"]').click();await page.locator('#guideBtn').click();check('guide opens '+width,await page.locator('#guideDialog[open]').isVisible());check('guide no horizontal overflow '+width,await page.locator('#guideDialog').evaluate(e=>e.scrollWidth<=e.clientWidth));await page.locator('[data-close="guideDialog"]').click();
  check('zero browser exceptions '+width,errors.length===0);await context.close();
 }
 // Validate deployed URL too when supplied; no login, no player data, read-only simulator inputs.
 if(process.env.PUBLIC_SIMULATOR_URL){const p=await browser.newPage({viewport:{width:390,height:844}});await p.goto(process.env.PUBLIC_SIMULATOR_URL);await p.locator('#calculate').click();await p.locator('#reportBtn').click();check('published simulator report works',await p.locator('#reportDialog[open]').isVisible());await p.screenshot({path:path.join(docs,'published-mobile.png')});await p.close();}
}catch(e){failure=e;console.error(e);}finally{await writeFile(path.join(docs,'browser-verification.json'),JSON.stringify({status:failure?'FAIL':'PASS',checks:checks.length,widths:[320,390,428,768,1280],engine:'Chromium desktop emulation, not physical iPhone',generatedAt:new Date().toISOString(),results:checks,error:failure?.stack??null},null,2));await browser.close();await new Promise(r=>server.close(r));}
if(failure)process.exit(1);console.log('BROWSER_PASS '+checks.length+' checks');
