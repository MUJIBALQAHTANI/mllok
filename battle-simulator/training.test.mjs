import test from 'node:test';
import assert from 'node:assert/strict';
import {UNITS,ECONOMY,RESOURCES,trainingQuote as legacyQuote} from './engine.mjs';
import {TRAINING_VERSION,BUILDING_CONFIG,TRAINING_UNITS,resourceEra,capacity,quoteTraining,levelRows,encodeTraining,decodeTraining} from './training-engine.mjs';

const sum = obj => Object.values(obj).reduce((a,b)=>a+b,0);
const input = (unitId='LightInfantry', buildingLevel=1, forge=1, count=1) => ({unitId,buildingLevel,forge,count});
const almost = (a,b,label) => assert.ok(Math.abs(a-b)<1e-7,label+': '+a+' ≠ '+b);
const expectedCapacity=(building,level)=>Number(BigInt({barracks:100,stable:150,workshop:75}[building])*5n**BigInt(level-1)/4n**BigInt(level-1));

test('training catalog covers precisely the nine existing combat units',()=>{
 assert.equal(typeof TRAINING_VERSION,'string');
 assert.deepEqual(TRAINING_UNITS.map(x=>x.id).sort(),UNITS.map(x=>x.id).sort());
 for(const u of UNITS)assert.ok(BUILDING_CONFIG[ECONOMY[u.id].building]);
});

test('resources follow BUILDING levels 1–4 / 5–9 / 10–30 for all troop types and forge levels',()=>{
 for(const u of UNITS)for(let b=1;b<=30;b++)for(let f=1;f<=30;f++){
  const q=quoteTraining(input(u.id,b,f,1));
  const allowed=b<5?['wheat','wood']:b<10?['wheat','wood','clay']:RESOURCES;
  assert.deepEqual(q.unlockedResources,allowed,u.id+' B'+b+' F'+f);
  for(const k of RESOURCES){assert.ok(Number.isSafeInteger(q.unitResources[k]));assert.equal(q.unitResources[k]>0,allowed.includes(k),u.id+' B'+b+' F'+f+' '+k);}
 }
});

test('advanced cavalry and siege have no clay before 5 and no iron before 10',()=>{
 for(const id of ['LightCavalry','CamelCavalry','HeavyCavalry','ArcherCavalry','BatteringRam','FireCatapult']){
  for(const f of [1,20,30]){
   assert.equal(quoteTraining(input(id,4,f,100)).resources.clay,0);
   assert.equal(quoteTraining(input(id,4,f,100)).resources.iron,0);
   assert.ok(quoteTraining(input(id,5,f,100)).resources.clay>0);
   assert.equal(quoteTraining(input(id,9,f,100)).resources.iron,0);
   assert.ok(quoteTraining(input(id,10,f,100)).resources.iron>0);
  }
 }
});

test('changing resource era conserves total equipment budget instead of dropping locked resources',()=>{
 for(const u of UNITS)for(let f=1;f<=30;f++){
  const expected=sum(legacyQuote(input(u.id,1,f,1)).unitResources);
  for(const b of [1,4,5,9,10,30]){
   const q=quoteTraining(input(u.id,b,f,123));
   assert.equal(q.resourceBudgetPerUnit,expected);
   assert.equal(sum(q.unitResources),expected);
   assert.equal(sum(q.resources),123*expected);
   for(const k of RESOURCES)assert.equal(q.resources[k],q.unitResources[k]*123);
  }
 }
});

test('capacity uses previous project baseline exactly and grows through thirty levels',()=>{
 const expected30={barracks:64623,stable:96935,workshop:48467};
 for(const building of ['barracks','stable','workshop']){
  let last=0;
  for(let level=1;level<=30;level++){
   const c=capacity(building,level);assert.equal(c,expectedCapacity(building,level));assert.ok(c>last);last=c;
  }
  assert.equal(last,expected30[building]);
 }
});

test('capacity counts soldiers or machines rather than population weights',()=>{
 for(const id of ['LightCavalry','HeavyCavalry']){
  const q=quoteTraining(input(id,1,1,150));assert.equal(q.capacity,150);assert.equal(q.batches,1);
 }
 const ram=quoteTraining(input('BatteringRam',1,1,75));assert.equal(ram.batches,1);
});

test('base infantry single recruit costs one optional gold; normal gold is zero',()=>{
 const q=quoteTraining(input());assert.equal(q.totalGold,1);assert.equal(q.normalGold,0);assert.equal(q.seconds,20);assert.equal(q.capacity,100);
 assert.equal(sum(q.resources),100);
});

test('one thousand recruits at barracks1 really require ten orders and reset quantity discounts',()=>{
 const q=quoteTraining(input('LightInfantry',1,1,1000));
 assert.equal(q.batches,10);assert.equal(q.totalGold,1000);assert.equal(q.seconds,20000);
 assert.equal(q.fullBatches,10);assert.equal(q.remainder,0);
 assert.equal(q.batchPlan.length,1);assert.equal(q.batchPlan[0].repeats,10);assert.equal(q.batchPlan[0].count,100);
});

test('partial last batch is priced once and totals conserve all recruits and resources',()=>{
 for(const u of UNITS)for(const b of [1,4,5,9,10,20,30])for(const count of [1,101,1001,1000000]){
  const q=quoteTraining(input(u.id,b,20,count));
  assert.ok(q.batchPlan.length<=2);assert.equal(q.batches,Math.ceil(count/q.capacity));
  assert.equal(q.batchPlan.reduce((n,x)=>n+x.count*x.repeats,0),count);
  assert.equal(q.batchPlan.reduce((n,x)=>n+x.repeats,0),q.batches);
  assert.equal(q.batchPlan.reduce((n,x)=>n+x.gold*x.repeats,0),q.totalGold);
  assert.equal(q.batchPlan.reduce((n,x)=>n+x.seconds*x.repeats,0),q.seconds);
  for(const p of q.batchPlan){
   assert.ok(p.count>0&&p.count<=q.capacity);assert.ok(Number.isSafeInteger(p.repeats)&&p.repeats>0);
   const old=legacyQuote(input(u.id,b,20,p.count));
   assert.equal(p.gold,old.gold);assert.equal(p.seconds,old.seconds);
  }
 }
});

test('adding a soldier never reduces gold or total time across tier and capacity boundaries',()=>{
 for(const u of UNITS)for(const b of [1,5,10,20,30])for(const f of [1,20,30]){
  const c=capacity(ECONOMY[u.id].building,b);
  const points=new Set([1,99,100,101,999,1000,1001,4999,5000,9999,10000,49999,50000,c-1,c,c+1,2*c-1,2*c,999999]);
  for(const n of points){if(n<1||n>=1000000)continue;
   const a=quoteTraining(input(u.id,b,f,n)),z=quoteTraining(input(u.id,b,f,n+1));
   assert.ok(z.totalGold>=a.totalGold,u.id+' '+b+' '+f+' '+n);assert.ok(z.seconds>=a.seconds);
  }
 }
});

test('forge raises total resource budget, effort and each combat property consistently',()=>{
 for(const u of UNITS)for(const b of [1,5,10,30]){
  let prev;
  for(let f=1;f<=30;f++){
   const q=quoteTraining(input(u.id,b,f,1000));
   if(prev){assert.ok(q.resourceBudgetPerUnit>=prev.resourceBudgetPerUnit);assert.ok(q.seconds>=prev.seconds);assert.ok(q.totalGold>=prev.totalGold);}
   const factor=1+.05*(f-1);
   almost(q.combat.perUnit.attack,u.attack*factor,'attack');almost(q.combat.perUnit.defense,u.def*factor,'defense');almost(q.combat.perUnit.cavalryDefense,u.cavDef*factor,'cavalryDefense');
   for(const key of ['attack','defense','cavalryDefense'])almost(q.combat.total[key],1000*q.combat.perUnit[key],key+' total');
   prev=q;
  }
 }
});

test('building development affects training effort and capacity but not combat strength',()=>{
 for(const u of UNITS){
  const a=quoteTraining(input(u.id,1,20,1)),z=quoteTraining(input(u.id,30,20,1));
  assert.deepEqual(a.combat,z.combat);assert.equal(z.buildingBonusPercent,70);assert.ok(z.perUnitTime<a.perUnitTime);
  almost(z.perUnitTime,a.perUnitTime/1.7,'level30 training time');
 }
});

test('level table changes exactly one independent axis and contains all thirty levels',()=>{
 for(const axis of ['building','forge']){
  const rows=levelRows({...input('HeavyCavalry',5,20,150),axis});assert.equal(rows.length,30);
  rows.forEach((q,i)=>{assert.equal(q.level,i+1);assert.equal(q.buildingLevel,axis==='building'?i+1:5);assert.equal(q.forge,axis==='forge'?i+1:20);assert.equal(q.count,150);});
 }
});

test('quote output is deterministic and all monetary counts are safe integers at maximum input',()=>{
 for(const u of UNITS){
  const args=input(u.id,30,30,1000000),q=quoteTraining(args);
  assert.deepEqual(quoteTraining(args),q);
  for(const n of [q.totalGold,q.seconds,q.batches,...Object.values(q.resources)])assert.ok(Number.isSafeInteger(n)&&n>=0);
 }
});

test('invalid unit, mismatched building, unknown building and malformed numbers reject rather than silently correcting',()=>{
 assert.throws(()=>quoteTraining({...input(),unitId:'__proto__'}));
 assert.throws(()=>quoteTraining({...input('HeavyCavalry'),building:'barracks'}));
 assert.throws(()=>quoteTraining({...input(),building:'unknown'}));
 for(const key of ['count','forge','buildingLevel'])for(const value of [NaN,Infinity,-1,1.5,'5',null])assert.throws(()=>quoteTraining({...input(),[key]:value}),key+' '+value);
 for(const key of ['forge','buildingLevel'])for(const value of [0,31])assert.throws(()=>quoteTraining({...input(),[key]:value}));
 for(const count of [0,1000001])assert.throws(()=>quoteTraining({...input(),count}));
 assert.throws(()=>capacity('unknown',1));assert.throws(()=>capacity('barracks',31));assert.throws(()=>levelRows({...input(),axis:'both'}));
});


test('shared training inputs are allowlisted and invalid payloads fail validation',()=>{
 const original={...input('HeavyCavalry',5,20,150),building:'stable',secret:'discard me',html:'<script>bad</script>'};
 const restored=decodeTraining(encodeTraining(original));
 assert.deepEqual(restored,{unitId:'HeavyCavalry',count:150,forge:20,buildingLevel:5,building:'stable'});
 assert.equal(Object.hasOwn(restored,'secret'),false);assert.equal(Object.hasOwn(restored,'html'),false);
 for(const payload of ['',null,'<script>','x'.repeat(2049),'@@@'])assert.throws(()=>decodeTraining(payload));
 const bad=btoa(JSON.stringify({version:TRAINING_VERSION,...input(),count:'1'})).replace(/=/g,'');
 assert.throws(()=>decodeTraining(bad));
});
