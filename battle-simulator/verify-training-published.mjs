import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {setTimeout} from 'node:timers/promises';
const base=process.env.PUBLIC_TRAINING_URL;
if(!base)throw new Error('PUBLIC_TRAINING_URL is required');
const hash=b=>createHash('sha256').update(b).digest('hex');
const names=['training.html','training.css','training-engine.mjs','training-ui.mjs','engine.mjs'];
const expected=Object.fromEntries(await Promise.all(names.map(async name=>[name,hash(await readFile(new URL(name,import.meta.url)))])));
await mkdir(new URL('docs/',import.meta.url),{recursive:true});
let last=[];
for(let attempt=1;attempt<=45;attempt++){
  last=await Promise.all(names.map(async name=>{
    const url=base.replace(/\/$/,'')+'/'+(name==='training.html'?'':name);
    try{
      const response=await fetch(url+'?gk='+expected[name].slice(0,12),{signal:AbortSignal.timeout(12000),headers:{'Cache-Control':'no-cache'}});
      const actual=hash(Buffer.from(await response.arrayBuffer()));
      return {name,url:response.url,httpStatus:response.status,sha256:actual,expected:expected[name],sourceMatches:response.ok&&actual===expected[name]};
    }catch(e){return {name,url,sourceMatches:false,error:e.message};}
  }));
  if(last.every(x=>x.sourceMatches)){
    await writeFile(new URL('docs/training-published-assets.json',import.meta.url),JSON.stringify({status:'PASS',verifiedAt:new Date().toISOString(),attempt,results:last},null,2));
    console.log('TRAINING_PUBLISHED_ASSETS_PASS '+names.length+'/'+names.length);process.exit(0);
  }
  console.log('Waiting for training deployment '+attempt+'/45: '+last.filter(x=>!x.sourceMatches).map(x=>x.name).join(', '));
  if(attempt<45)await setTimeout(8000);
}
await writeFile(new URL('docs/training-published-assets.json',import.meta.url),JSON.stringify({status:'FAIL',verifiedAt:new Date().toISOString(),results:last},null,2));
throw new Error('Published training files did not match this commit');
