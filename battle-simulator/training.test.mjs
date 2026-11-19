import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAINING_VERSION,TRAINING_UNITS,BUILDING_CONFIG,RULES,RESOURCES,buildingTimeReduction,buildingTimeDetails,resourceEra,capacity,quoteTraining,levelRows,encodeTraining,decodeTraining} from './training-engine.mjs';
const q=(unitId='LightInfantry',buildingLevel=1,forge=0,count=1,extra={})=>quoteTraining({unitId,buildingLevel,forge,count,...extra});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const reference={
 LightInfantry:[52.4,29.4,12.2,96,100,100,50,25],
 Archer:[17.9,46.6,75.4,151,160,160,85,40],
 SpearInfantry:[75.4,40.9,40.9,162,250,250,120,65],
 LightCavalry:[109.8,69.6,52.4,284,360,360,190,95],
 CamelCavalry:[76,150.7,116.2,380,430,430,215,110],
 HeavyCavalry:[243.3,111.1,105.3,463,550,550,270,140],
 BatteringRam:[2,20,50,480,600,600,300,150],
 FireCatapult:[95,90,55,600,750,750,375,190],
};

test('approved roster is exactly eight units, with the six reference mappings and distinct siege proposals',()=>{
 assert.equal(TRAINING_VERSION,'GK_TRAINING_APPROVED_3.0.0');
 assert.equal(TRAINING_UNITS.length,8);assert.equal(BUILDING_CONFIG.stable.unitIds.length,3);
 assert.deepEqual(TRAINING_UNITS.map(u=>u.id).sort(),Object.keys(reference).sort());
 assert.throws(()=>q('ArcherCavalry'));
 for(const u of TRAINING_UNITS){
  assert.deepEqual([u.attack,u.def,u.cavDef,u.referenceBaseSeconds,...RESOURCES.map(k=>u.referenceBaseResources[k])],reference[u.id]);
  assert.equal(u.proposal,u.building==='workshop');
  assert.equal(u.baseReductionPercent,70);
  assert.equal(u.baseSeconds,u.referenceBaseSeconds*3/10);
  for(const k of RESOURCES)assert.equal(u.baseResources[k],u.referenceBaseResources[k]*3/10);
  for(const key of ['health','hp','upkeep','population'])assert.equal(Object.hasOwn(u,key),false);
 }
});

test('all 7440 type/building/forge combinations obey resource gates and fixed movement/cargo',()=>{
 for(const u of TRAINING_UNITS)for(let b=1;b<=30;b++)for(let f=0;f<=30;f++){
  const quote=q(u.id,b,f),keys=b<5?['wheat','wood']:b<10?['wheat','wood','clay']:RESOURCES;
  assert.deepEqual(quote.unlockedResources,keys);
  for(const k of RESOURCES){assert.equal(quote.unitResources[k]>0,keys.includes(k));assert.ok(Number.isSafeInteger(quote.unitResources[k]));}
  const pair=u.building==='barracks'?[10,10]:u.building==='stable'?[20,20]:[3,30];
  assert.deepEqual([quote.movementSpeed,quote.cargo],pair);
 }
});

test('resource amounts are additive at 5 and 10, never redistributed from locked materials',()=>{
 for(const u of TRAINING_UNITS){
  const a=q(u.id,4),b=q(u.id,5),c=q(u.id,9),d=q(u.id,10);
  assert.equal(a.unitResources.wheat,u.baseResources.wheat);assert.equal(a.unitResources.wood,u.baseResources.wood);
  assert.deepEqual(a.unitResources,{wheat:u.baseResources.wheat,wood:u.baseResources.wood,clay:0,iron:0});
  assert.deepEqual(b.unitResources,{...a.unitResources,clay:Math.ceil(u.baseResources.clay)});assert.deepEqual(c.unitResources,b.unitResources);
  assert.deepEqual(d.unitResources,Object.fromEntries(RESOURCES.map(k=>[k,Math.ceil(u.baseResources[k])])));
  assert.equal(b.resourceTotal-a.resourceTotal,Math.ceil(u.baseResources.clay));assert.equal(d.resourceTotal-c.resourceTotal,Math.ceil(u.baseResources.iron));
 }
 assert.deepEqual(q('CamelCavalry',7).unitResources,{wheat:129,wood:129,clay:65,iron:0});
});


test('resource70percent reduction stays fractional until one final per-unit ceiling after forge',()=>{
 const base=q('LightInfantry',10,0),f3=q('LightInfantry',10,3);
 assert.equal(base.referenceBaseUnitResources.iron,25);assert.equal(base.baseUnitResources.iron,7.5);assert.equal(base.unitResources.iron,8);
 assert.equal(f3.unitResources.iron,9);assert.notEqual(f3.unitResources.iron,Math.ceil(8*1.18));
 for(const u of TRAINING_UNITS)for(const f of [0,3,20,30]){
  const quote=q(u.id,10,f,100);
  for(const k of RESOURCES){const exact=u.referenceBaseResources[k]*3*(100+6*f)/1000;assert.ok(quote.unitResources[k]>=exact-1e-10);assert.ok(quote.unitResources[k]-exact<1);assert.equal(quote.resources[k],quote.unitResources[k]*100);}
 }
});

test('at the batch cap each building splits cap+1 and preserves the exact full-cap order',()=>{
 for(const building of Object.keys(BUILDING_CONFIG))for(const b of [1,10,30]){
  const id=BUILDING_CONFIG[building].unitIds[0],cap=capacity(building,b);
  const full=q(id,b,0,cap),over=q(id,b,0,cap+1);
  assert.equal(full.batches,1);assert.equal(over.batches,2);
  assert.equal(over.batchPlan[0].count,cap);assert.equal(over.batchPlan[1].count,1);
  assert.equal(over.batchPlan[0].gold,full.totalGold);assert.equal(over.batchPlan[0].seconds,full.seconds);
 }
});
test('forge0 retains exact image stats and forge1/2/30 match the source card increments',()=>{
 for(const u of TRAINING_UNITS){
  const a=q(u.id,1,0),one=q(u.id,1,1),two=q(u.id,1,2),max=q(u.id,1,30);
  assert.equal(a.seconds,Math.ceil(u.baseSeconds));near(a.perUnitTime,u.referenceBaseSeconds*.3);assert.equal(a.forgeBonusPercent,0);
  assert.equal(one.forgeBonusPercent,5);assert.equal(two.forgeBonusPercent,10);assert.equal(max.forgeBonusPercent,150);
  for(const [key,base] of Object.entries(a.combat.base)){assert.equal(a.combat.perUnit[key],base);near(one.combat.perUnit[key],base*1.05);near(two.combat.perUnit[key],base*1.10);near(max.combat.perUnit[key],base*2.5);}
 }
 assert.equal(q('LightInfantry',1,1).combat.perUnit.attack,55.02);
 assert.equal(q('HeavyCavalry',1,30).combat.perUnit.attack,608.25);
});

test('each building level reduces exact unit time, totals reach94percent and later levels gain more points',()=>{
 assert.equal(buildingTimeReduction(1),0);assert.equal(buildingTimeReduction(30),.8);
 let lastIncrement=0;
 for(let b=2;b<=30;b++){
  const details=buildingTimeDetails(b);assert.ok(details.incrementPercentagePoints>lastIncrement);lastIncrement=details.incrementPercentagePoints;
  for(const u of TRAINING_UNITS)for(const f of [0,3,20,30])assert.ok(q(u.id,b,f).perUnitTime<q(u.id,b-1,f).perUnitTime,`${u.id} B${b} F${f}`);
 }
 for(const u of TRAINING_UNITS)for(const f of [0,20,30])near(q(u.id,30,f).perUnitTime,q(u.id,1,f).perUnitTime*.2);
 assert.equal(q('LightInfantry',30,0).seconds,6);assert.equal(q('FireCatapult',30,0).seconds,36);
 for(const u of TRAINING_UNITS){const end=q(u.id,30,0);near(end.perUnitTime,u.referenceBaseSeconds*.06);assert.equal(end.totalTimeReductionVsReferencePercent,94);assert.equal(end.baseReductionPercent,70);} 
});

test('duration rounds the whole batch once, not each soldier before multiplication',()=>{
 const quote=q('LightInfantry',30,0,100);
 assert.equal(quote.perUnitTime,5.76);assert.equal(quote.singleUnitSeconds,6);
 assert.equal(quote.seconds,576);assert.notEqual(quote.seconds,100*quote.singleUnitSeconds);
 assert.equal(quote.totalGold,6);
});

test('gold keeps96seconds per coin so70percent time savings reduce bulk price and waiting stays free',()=>{
 const base=q();assert.equal(RULES.secondsPerGold,96);assert.equal(base.totalGold,1);assert.equal(base.normalGold,0);
 assert.equal(q('BatteringRam').totalGold,2);assert.equal(q('FireCatapult').totalGold,2);
 const bulk=q('LightInfantry',1,0,1000);assert.equal(bulk.batches,4);assert.equal(bulk.seconds,28800);assert.equal(bulk.totalGold,297);
});

test('quantity tiers are marginal and restart per actual capacity-bounded batch',()=>{
 const a=q('LightInfantry',30,0,100),b=q('LightInfantry',30,0,1000);
 assert.equal(a.discountedGold,6);near(b.discountedGold,58.92);assert.equal(b.totalGold,59);
 const limited=q('LightInfantry',1,0,1000);near(limited.theoreticalDiscountPercent,1.2);
 assert.equal(limited.batchPlan[0].count,300);assert.equal(limited.batchPlan[0].repeats,3);
});

test('capacity remains training queue capacity and is unrelated to reference population rows',()=>{
 for(const [building,base,last] of [['barracks',300,193870],['stable',150,96935],['workshop',75,48467]]){
  assert.equal(capacity(building,1),base);assert.equal(capacity(building,30),last);
 }
 assert.equal(q('HeavyCavalry',1,0,150).batches,1);assert.equal(q('BatteringRam',1,0,75).batches,1);
});

test('partial batches conserve counts, resources, time and per-batch integer gold',()=>{
 for(const u of TRAINING_UNITS)for(const b of [1,5,10,30])for(const count of [1,101,1001,1000000]){
  const quote=q(u.id,b,20,count);
  assert.equal(quote.batchPlan.reduce((sum,row)=>sum+row.count*row.repeats,0),count);
  assert.equal(quote.batchPlan.reduce((sum,row)=>sum+row.seconds*row.repeats,0),quote.seconds);
  assert.equal(quote.batchPlan.reduce((sum,row)=>sum+row.gold*row.repeats,0),quote.totalGold);
  for(const k of RESOURCES)assert.equal(quote.resources[k],quote.unitResources[k]*count);
  for(const row of quote.batchPlan){assert.ok(row.count<=quote.capacity);assert.ok(Number.isSafeInteger(row.gold));}
 }
});

test('larger quantities never reduce total gold or total time at tier and batch boundaries',()=>{
 for(const u of TRAINING_UNITS)for(const b of [1,5,10,20,30])for(const f of [0,20,30]){
  const cap=capacity(u.building,b),counts=new Set([1,99,100,101,999,1000,1001,4999,5000,9999,10000,49999,50000,cap-1,cap,cap+1,2*cap-1,2*cap,999999]);
  for(const n of counts){if(n<1||n>=1000000)continue;const a=q(u.id,b,f,n),z=q(u.id,b,f,n+1);assert.ok(z.totalGold>=a.totalGold);assert.ok(z.seconds>=a.seconds);}
 }
});

test('higher building levels never raise gold and do not alter combat or fixed movement',()=>{
 for(const u of TRAINING_UNITS)for(const f of [0,20,30])for(const count of [1,100,1000,10000,1000000]){
  let previous=q(u.id,1,f,count);
  for(let b=2;b<=30;b++){const next=q(u.id,b,f,count);assert.ok(next.totalGold<=previous.totalGold,`${u.id} B${b} F${f} N${count}`);assert.ok(next.seconds<=previous.seconds);assert.deepEqual(next.combat,previous.combat);previous=next;}
 }
});

test('forge growth affects resources effort and combat without changing movement or cargo',()=>{
 for(const u of TRAINING_UNITS){let previous=q(u.id,30,0,100);
  for(let f=1;f<=30;f++){const next=q(u.id,30,f,100);assert.ok(next.resourceTotal>previous.resourceTotal);assert.ok(next.seconds>previous.seconds);assert.ok(next.totalGold>=previous.totalGold);for(const k of Object.keys(next.combat.perUnit)){assert.ok(next.combat.perUnit[k]>previous.combat.perUnit[k]);near(next.combat.total[k],100*next.combat.perUnit[k]);}previous=next;}
 }
});

test('unlock checks use hero palace3/7/10 and workshop castle10 without changing resource-era previews',()=>{
 for(const [id,level] of [['LightCavalry',3],['CamelCavalry',7],['HeavyCavalry',10]]){
  const closed=q(id,4,0,1,{heroPalaceLevel:level-1}),open=q(id,4,0,1,{heroPalaceLevel:level});
  assert.equal(closed.availability.available,false);assert.equal(closed.availability.previewOnly,true);assert.equal(open.availability.available,true);assert.deepEqual(closed.unitResources,open.unitResources);assert.equal(open.unitResources.iron,0);
 }
 assert.equal(q('BatteringRam',1,0,1,{castleLevel:9}).availability.available,false);
 assert.equal(q('BatteringRam',1,0,1,{castleLevel:10}).availability.available,true);
});

test('axis comparison includes 30 building levels or baseline0 plus30 forge levels',()=>{
 const input={unitId:'HeavyCavalry',count:100,forge:20,buildingLevel:10};
 const b=levelRows({...input,axis:'building'}),f=levelRows({...input,axis:'forge'});
 assert.equal(b.length,30);assert.equal(f.length,31);
 b.forEach((row,i)=>{assert.equal(row.level,i+1);assert.equal(row.forge,20);});
 f.forEach((row,i)=>{assert.equal(row.level,i);assert.equal(row.buildingLevel,10);});
});

test('input validation and versioned sharing reject removed units, old links and malformed values',()=>{
 for(const key of ['count','forge','buildingLevel','castleLevel','heroPalaceLevel'])for(const value of [NaN,Infinity,-1,1.5,'5',null]){
  assert.throws(()=>quoteTraining({unitId:'LightInfantry',count:1,forge:0,buildingLevel:1,[key]:value}));
 }
 assert.throws(()=>q('ArcherCavalry'));assert.throws(()=>q('__proto__'));assert.throws(()=>q('HeavyCavalry',1,0,1,{building:'barracks'}));
 assert.throws(()=>q('LightInfantry',0));assert.throws(()=>q('LightInfantry',1,31));assert.throws(()=>q('LightInfantry',1,0,0));
 const input={unitId:'HeavyCavalry',count:150,forge:0,buildingLevel:5,castleLevel:20,heroPalaceLevel:10,secret:'discard'};
 const restored=decodeTraining(encodeTraining(input));assert.equal(restored.forge,0);assert.equal(restored.castleLevel,20);assert.equal(restored.heroPalaceLevel,10);assert.equal(Object.hasOwn(restored,'secret'),false);
 for(const payload of ['',null,'x'.repeat(2049),'@@@',btoa(JSON.stringify({...input,version:'GK_TRAINING_APPROVED_2.0.0'})).replace(/=/g,'')])assert.throws(()=>decodeTraining(payload));
 for(const u of TRAINING_UNITS){const max=q(u.id,30,30,1000000);for(const v of [max.seconds,max.totalGold,...Object.values(max.resources)])assert.ok(Number.isSafeInteger(v)&&v>0);}
});
