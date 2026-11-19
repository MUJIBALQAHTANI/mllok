import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
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
 assert.equal(TRAINING_VERSION,'GK_TRAINING_APPROVED_4.0.0');
 assert.equal(TRAINING_UNITS.length,8);assert.equal(BUILDING_CONFIG.stable.unitIds.length,3);
 assert.deepEqual(TRAINING_UNITS.map(u=>u.id).sort(),Object.keys(reference).sort());
 assert.throws(()=>q('ArcherCavalry'));
 for(const u of TRAINING_UNITS){
  assert.deepEqual([u.attack,u.def,u.cavDef,u.referenceBaseSeconds,...RESOURCES.map(k=>u.referenceBaseResources[k])],reference[u.id]);
  assert.equal(u.proposal,u.building==='workshop');
  assert.equal(u.baseReductionPercent,70);
  assert.equal(u.timeBaseReductionPercent,70);assert.equal(u.resourceIncreasePercent,70);
  assert.equal(u.baseSeconds,u.referenceBaseSeconds*3/10);
  for(const k of RESOURCES){assert.equal(u.previousBaseResources[k],u.referenceBaseResources[k]*3/10);assert.equal(u.baseResources[k],u.referenceBaseResources[k]*51/100);}
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
  assert.equal(a.unitResources.wheat,Math.ceil(u.baseResources.wheat));assert.equal(a.unitResources.wood,Math.ceil(u.baseResources.wood));
  assert.deepEqual(a.unitResources,{wheat:Math.ceil(u.baseResources.wheat),wood:Math.ceil(u.baseResources.wood),clay:0,iron:0});
  assert.deepEqual(b.unitResources,{...a.unitResources,clay:Math.ceil(u.baseResources.clay)});assert.deepEqual(c.unitResources,b.unitResources);
  assert.deepEqual(d.unitResources,Object.fromEntries(RESOURCES.map(k=>[k,Math.ceil(u.baseResources[k])])));
  assert.equal(b.resourceTotal-a.resourceTotal,Math.ceil(u.baseResources.clay));assert.equal(d.resourceTotal-c.resourceTotal,Math.ceil(u.baseResources.iron));
 }
 assert.deepEqual(q('CamelCavalry',7).unitResources,{wheat:220,wood:220,clay:110,iron:0});
});


test('resources rise70percent from the exact V3 base, with one final per-unit ceiling after forge',()=>{
 assert.equal(RULES.baseResourceFactor,.51);assert.equal(RULES.previousBaseResourceFactor,.3);assert.equal(RULES.resourceIncreasePercent,70);
 const base=q('LightInfantry',10,0),f4=q('LightInfantry',10,4);
 assert.equal(base.previousBaseUnitResources.wheat,30);assert.equal(base.baseUnitResources.wheat,51);assert.equal(base.unitResources.wheat,51);
 assert.equal(base.referenceBaseUnitResources.iron,25);assert.equal(base.previousBaseUnitResources.iron,7.5);assert.equal(base.baseUnitResources.iron,12.75);assert.equal(base.unitResources.iron,13);
 assert.equal(f4.unitResources.iron,16);assert.notEqual(f4.unitResources.iron,Math.ceil(13*1.24));
 for(const u of TRAINING_UNITS)for(const f of [0,4,20,30]){
  const quote=q(u.id,10,f,100);
  for(const k of RESOURCES){const exact=u.referenceBaseResources[k]*51*(100+6*f)/10000;near(quote.baseUnitResources[k],quote.previousBaseUnitResources[k]*1.7);assert.ok(quote.unitResources[k]>=exact-1e-10);assert.ok(quote.unitResources[k]-exact<1);assert.equal(quote.resources[k],quote.unitResources[k]*100);}
 }
});

test('resources-only V4 preserves the actual V3 time gold combat movement and queue results for all7440 combinations',()=>{
 // Captured from the unmodified GK_TRAINING_APPROVED_3.0.0 engine before the resources-only edit.
 // Each case uses capacity+101 units, so batch boundaries, remainder timing and gold all participate.
 const expectedV3='6c02227b9e6b1db76366489818f26ed0fdf8cdb15e86ae7e6d4442508fb1b3e4';
 const fields=['unitId','buildingLevel','forge','count','combat','baseSeconds','referenceBaseSeconds','baseReductionPercent','timeBeforeBuildingSeconds','referenceTimeBeforeBuildingSeconds','unitTimeSavedSeconds','unitTimeSavedVsReferenceSeconds','totalTimeReductionVsReferencePercent','totalTimeFactorVsReference','trainingReductionPercent','timeFactor','buildingBonusPercent','buildingFactor','capacity','capacityNextLevel','batches','fullBatches','remainder','batchGold','totalGold','goldBeforeDiscount','goldSaved','undiscountedGold','discountedGold','averageGold','effectiveDiscountPercent','theoreticalDiscountPercent','seconds','perUnitTime','singleUnitSeconds','normalGold','movementSpeed','cargo','totalCargo','canTrainSingleBatch','availability','queueAssumption'];
 const digest=createHash('sha256');let cases=0;
 for(const u of TRAINING_UNITS)for(let b=1;b<=30;b++)for(let f=0;f<=30;f++){
  const quote=q(u.id,b,f,capacity(u.building,b)+101);
  const snapshot=Object.fromEntries(fields.map(k=>[k,quote[k]]));
  snapshot.batchPlan=quote.batchPlan.map(({resources,...rest})=>rest);
  digest.update(JSON.stringify(snapshot)+'\n');cases++;
 }
 assert.equal(cases,7440);assert.equal(digest.digest('hex'),expectedV3);
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
 for(const payload of ['',null,'x'.repeat(2049),'@@@',...['GK_TRAINING_APPROVED_2.0.0','GK_TRAINING_APPROVED_3.0.0'].map(version=>btoa(JSON.stringify({...input,version})).replace(/=/g,''))])assert.throws(()=>decodeTraining(payload));
 for(const u of TRAINING_UNITS){const max=q(u.id,30,30,1000000);for(const v of [max.seconds,max.totalGold,...Object.values(max.resources)])assert.ok(Number.isSafeInteger(v)&&v>0);}
});

/* Append to training.test.mjs; aliases avoid collisions with its existing tests. */
import wallTest from 'node:test';
import wallAssert from 'node:assert/strict';
import {quoteWall as quoteConditionalWall, TRAINING_UNITS as WALL_TEST_UNITS} from './training-engine.mjs';
const wallFixture = (patch = {}) => ({level: 10, hp: 10000, defenderUnitId: 'Archer', defenderCount: 100, defenderForge: 0, arrivingRams: 0, survivingRams: 0, ramForge: 0, survivingCatapults: 0, catapultForge: 0, attackerWon: false, usedDirect: 0, usedHour: 0, ...patch});
const wallNear = (a, b) => wallAssert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

wallTest('wall: fixed durability and intact defense at every level including absent wall', () => {
  for (let level = 0; level <= 30; level++) {
    const q = quoteConditionalWall(wallFixture({level, hp: level * 1000}));
    wallAssert.equal(q.wall.max, level * 1000);
    wallNear(q.wall.nominalPercent, level); wallNear(q.wall.availablePercent, level); wallNear(q.wall.appliedPercent, level);
    wallAssert.equal(q.wall.direct, 0); wallAssert.equal(q.wall.firePotential, 0);
    wallNear(q.defender.fortifiedTotal.defense, q.defender.total.defense * (1 + level / 100));
  }
});

wallTest('wall: half durability halves only the wall bonus and broken wall adds no defense', () => {
  const half = quoteConditionalWall(wallFixture({level: 30, hp: 15000}));
  wallAssert.equal(half.wall.availablePercent, 15); wallNear(half.wall.appliedPercent, 15);
  const broken = quoteConditionalWall(wallFixture({level: 30, hp: 0, arrivingRams: 1000, survivingRams: 100, survivingCatapults: 100, attackerWon: true}));
  wallAssert.equal(broken.wall.appliedPercent, 0); wallAssert.equal(broken.wall.direct, 0); wallAssert.equal(broken.wall.firePotential, 0);
  wallNear(broken.defender.fortifiedTotal.defense, broken.defender.total.defense);
});

wallTest('wall: current eight-unit catalog and forge-zero baseline are applied once', () => {
  for (const unit of WALL_TEST_UNITS) {
    const q0 = quoteConditionalWall(wallFixture({defenderUnitId: unit.id, defenderForge: 0}));
    const q30 = quoteConditionalWall(wallFixture({defenderUnitId: unit.id, defenderForge: 30}));
    wallNear(q0.defender.perUnit.attack, unit.attack); wallNear(q0.defender.perUnit.defense, unit.def);
    wallNear(q30.defender.perUnit.attack, unit.attack * 2.5); wallNear(q30.defender.perUnit.defense, unit.def * 2.5);
    wallAssert.equal(q30.defender.forgeBonusPercent, 150);
    wallAssert.equal(q30.defender.fortifiedTotal.attack, q30.defender.total.attack);
  }
  wallAssert.throws(() => quoteConditionalWall(wallFixture({defenderUnitId: 'ArcherCavalry'})));
  const fixture = quoteConditionalWall(wallFixture({level: 30, hp: 30000, defenderCount: 1, defenderForge: 20}));
  wallNear(fixture.defender.fortifiedPerUnit.defense, 121.16);
  wallNear(fixture.defender.fortifiedPerUnit.cavalryDefense, 196.04);
});

wallTest('wall: participating rams suppress only the bonus and cannot remove native defense', () => {
  const q = quoteConditionalWall(wallFixture({arrivingRams: 100, ramForge: 0}));
  wallNear(q.wall.suppressionPercent, 25); wallNear(q.wall.appliedPercent, 7.5);
  const high = quoteConditionalWall(wallFixture({arrivingRams: 1000000, ramForge: 30}));
  wallAssert.ok(high.wall.suppressionPercent < 50);
  wallAssert.ok(high.wall.appliedPercent > high.wall.availablePercent / 2);
  wallAssert.ok(high.defender.fortifiedTotal.defense >= high.defender.total.defense);
  wallAssert.equal(q.wall.direct, 0);
});

wallTest('wall: surviving siege after victory obeys minute/hour caps and separates potential fire', () => {
  const q = quoteConditionalWall(wallFixture({arrivingRams: 100, survivingRams: 100, survivingCatapults: 20, attackerWon: true}));
  wallAssert.equal(q.wall.directRaw, 1320); wallAssert.equal(q.wall.direct, 1000);
  wallAssert.equal(q.wall.prevented, 320); wallAssert.equal(q.wall.firePotential, 60);
  wallAssert.equal(q.wall.hpAfter, 9000); wallAssert.equal(q.wall.hpAfterFire, 8940); wallAssert.equal(q.wall.fireMinutes, 30);
});

wallTest('wall: equipment level30 uses factor2.50 for structural damage rather than old2.45', () => {
  const q0 = quoteConditionalWall(wallFixture({level: 30, hp: 30000, arrivingRams: 10, survivingRams: 10, survivingCatapults: 10, attackerWon: true}));
  const q30 = quoteConditionalWall(wallFixture({level: 30, hp: 30000, arrivingRams: 10, survivingRams: 10, survivingCatapults: 10, ramForge: 30, catapultForge: 30, attackerWon: true}));
  wallAssert.equal(q0.wall.directRaw, 180); wallAssert.equal(q30.wall.directRaw, 450);
  wallAssert.equal(q0.wall.firePotential, 30); wallAssert.equal(q30.wall.firePotential, 75);
});

wallTest('wall: integer damage floors once after combining fractional engine contributions', () => {
  const q = quoteConditionalWall(wallFixture({arrivingRams: 1, survivingRams: 1, ramForge: 1, survivingCatapults: 1, catapultForge: 2, attackerWon: true}));
  wallAssert.equal(q.wall.directRaw, 19); // floor(12.6 + 6.6), not floor(12.6) + floor(6.6).
  wallAssert.equal(q.wall.firePotential, 3);
});

wallTest('wall: used budgets and half-direct limit constrain fire without postponing excess', () => {
  const minute = quoteConditionalWall(wallFixture({arrivingRams: 100, survivingRams: 100, survivingCatapults: 20, attackerWon: true, usedDirect: 990, usedHour: 2000}));
  wallAssert.equal(minute.wall.direct, 10); wallAssert.equal(minute.wall.firePotential, 5);
  const hour = quoteConditionalWall(wallFixture({arrivingRams: 100, survivingRams: 100, survivingCatapults: 20, attackerWon: true, usedHour: 2497}));
  wallAssert.equal(hour.wall.direct, 3); wallAssert.equal(hour.wall.firePotential, 0);
  const exhausted = quoteConditionalWall(wallFixture({arrivingRams: 100, survivingRams: 100, survivingCatapults: 20, attackerWon: true, usedDirect: 1000, usedHour: 2500}));
  wallAssert.equal(exhausted.wall.direct, 0); wallAssert.equal(exhausted.wall.firePotential, 0);
});

wallTest('wall: a lost assault, ordinary troops, or siege with no survivors causes no structural damage', () => {
  const cases = [
    {arrivingRams: 500, survivingRams: 100, survivingCatapults: 50, attackerWon: false},
    {attackerWon: true},
    {arrivingRams: 500, survivingRams: 0, survivingCatapults: 0, attackerWon: true},
    {level: 0, hp: 0, arrivingRams: 1, survivingRams: 1, survivingCatapults: 1, attackerWon: true},
  ];
  for (const patch of cases) { const q = quoteConditionalWall(wallFixture(patch)); wallAssert.equal(q.wall.direct, 0); wallAssert.equal(q.wall.firePotential, 0); }
});

wallTest('wall: empty defenders receive no invented troops or native garrison strength', () => {
  const q = quoteConditionalWall(wallFixture({level: 30, hp: 30000, defenderCount: 0, defenderForge: 30}));
  wallAssert.equal(q.defender.count, 0);
  wallAssert.deepEqual(q.defender.total, {attack: 0, defense: 0, cavalryDefense: 0});
  wallAssert.deepEqual(q.defender.fortifiedTotal, {attack: 0, defense: 0, cavalryDefense: 0});
  wallAssert.equal(q.conditional, true); wallAssert.equal(q.source, 'retained_siege_proposal_not_production');
  wallAssert.equal(Object.hasOwn(q, 'winner'), false); wallAssert.equal(Object.hasOwn(q.defender, 'lost'), false);
});

wallTest('wall: rejects impossible survivors, malformed numbers, and inconsistent damage windows', () => {
  for (const patch of [
    {level: 31}, {level: -1}, {hp: 10001}, {hp: -1}, {level: 0, hp: 1},
    {defenderCount: -1}, {defenderCount: 1000001}, {defenderForge: 31}, {defenderForge: -1},
    {arrivingRams: 10, survivingRams: 11}, {arrivingRams: 0, survivingRams: 1},
    {arrivingRams: 1.5}, {ramForge: 31}, {catapultForge: 31}, {survivingCatapults: 1000001},
    {attackerWon: 'false'}, {usedDirect: 2, usedHour: 1}, {usedHour: 10001},
    {hp: NaN}, {defenderCount: Infinity}, {ramForge: null}, {defenderUnitId: '__proto__'},
  ]) wallAssert.throws(() => quoteConditionalWall(wallFixture(patch)));
  wallAssert.throws(() => quoteConditionalWall(null));
});

wallTest('wall: mixed retained-siege cases conserve durability and honor every shared cap', () => {
  for (let level = 1; level <= 30; level++) for (const forge of [0, 7, 30]) {
    const max = level * 1000, hp = Math.floor(max * .63), usedDirect = level * 31, usedHour = level * 109;
    const q = quoteConditionalWall(wallFixture({level, hp, defenderForge: forge, arrivingRams: 733, survivingRams: 211, ramForge: forge, survivingCatapults: 63, catapultForge: forge, attackerWon: true, usedDirect, usedHour}));
    wallAssert.ok(q.wall.direct <= q.wall.directCap - usedDirect);
    wallAssert.ok(q.wall.direct + q.wall.firePotential <= q.wall.hourCap - usedHour);
    wallAssert.equal(q.wall.hpAfterFire + q.wall.direct + q.wall.firePotential, hp);
    wallAssert.ok(q.wall.hpAfterFire >= 0); wallAssert.ok(q.wall.appliedPercent >= 0);
    for (const key of ['directRaw', 'direct', 'firePotential', 'hpAfter', 'hpAfterFire']) wallAssert.ok(Number.isSafeInteger(q.wall[key]));
    wallAssert.ok(Object.isFrozen(q)); wallAssert.ok(Object.isFrozen(q.wall)); wallAssert.ok(Object.isFrozen(q.defender.total));
  }
});
