import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engine.mjs';

const stamp='2026-11-18T12:00:00.000Z';
const copy=x=>JSON.parse(JSON.stringify(x));
const sum=xs=>xs.reduce((n,x)=>n+x,0);
const humanIds=E.UNITS.filter(u=>u.group!=='siege').map(u=>u.id);
const rowsFor=losses=>E.IDS.map((id,i)=>({id,count:losses[i]??0,lost:losses[i]??0,survived:0,forge:1,carry:10}));
const quote=(count,forge=1,buildingLevel=1,unitId='LightInfantry')=>E.trainingQuote({unitId,count,forge,buildingLevel});
function random(seed){return n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};}
function emptyBattle(){const s=E.example();s.attacker=E.blankArmy();s.defender=E.blankArmy();for(const side of ['attacker','defender'])for(const id of E.IDS)s[side][id].carry=10;s.wall={level:0,hp:0,siege:false,usedDirect:0,usedHour:0};return s;}

test('hospital fixed endpoints and every intermediate capacity are integer and increasing',()=>{
  assert.equal(E.hospitalCapacity(0),0);
  assert.equal(E.hospitalCapacity(1),5000);
  assert.equal(E.hospitalCapacity(30),500000);
  let previous=0;
  for(let level=1;level<=30;level++){
    const n=E.hospitalCapacity(level);
    assert.ok(Number.isSafeInteger(n)&&n>previous&&n%500===0);
    previous=n;
  }
  for(const value of [-1,31,1.5,NaN,Infinity,'1'])assert.throws(()=>E.hospitalCapacity(value));
});

test('a single human type allocates 60 percent eligible without population weighting',()=>{
  for(const id of humanIds){
    const rows=rowsFor(E.IDS.map(x=>x===id?1000:0));
    const r=E.resolveHospital(rows,{level:1,occupied:0});
    assert.equal(r.hospital.humanLost,1000);
    assert.equal(r.hospital.eligible,600);
    assert.equal(r.hospital.admitted,600);
    const unit=r.rows.find(x=>x.id===id);
    assert.equal(unit.wounded,600);assert.equal(unit.dead,400);assert.equal(unit.destroyed,0);
  }
});

test('equal combat powers and equal hospitals give equal wounded counts to both sides',()=>{
  const s=emptyBattle();s.attacker.LightInfantry.count=3000;s.defender.SpearInfantry.count=3000;
  s.hospitals={attacker:{level:1,occupied:0},defender:{level:1,occupied:0}};
  const r=E.simulate(s,stamp);
  assert.equal(r.winner,'tie');
  assert.equal(r.summary.attacker.wounded,1800);assert.equal(r.summary.defender.wounded,1800);
  assert.equal(r.summary.attacker.dead,1200);assert.equal(r.summary.defender.dead,1200);
});

test('human wounded rounding happens once across mixed units, not independently per row',()=>{
  const r=E.resolveHospital(rowsFor([1,1,1,1,1,0,0,0,0]),{level:1,occupied:0});
  assert.equal(r.hospital.eligible,3);assert.equal(r.hospital.admitted,3);
  assert.equal(sum(r.rows.map(x=>x.wounded)),3);
});

test('mixed troops receive nearly proportional admissions and cannot be prioritized by reordering rows',()=>{
  const rows=rowsFor([600,300,0,100,0,0,0,0,0]);
  const a=E.resolveHospital(rows,{level:1,occupied:4700});
  assert.deepEqual(a.rows.map(x=>x.woundEligible),[360,180,0,60,0,0,0,0,0]);
  assert.deepEqual(a.rows.map(x=>x.wounded),[180,90,0,30,0,0,0,0,0]);
  const b=E.resolveHospital([...rows].reverse(),{level:1,occupied:4700});
  assert.deepEqual(Object.fromEntries(a.rows.map(x=>[x.id,x.wounded])),Object.fromEntries(b.rows.map(x=>[x.id,x.wounded])));
});

test('freeing one hospital bed never removes an existing type admission: Alabama regression',()=>{
  const rows=rowsFor([2500,2500,1500,833,833,334,0,0,0]);
  const a=E.resolveHospital(rows,{level:1,occupied:4975});
  const b=E.resolveHospital(rows,{level:1,occupied:4974});
  assert.equal(a.hospital.admitted,25);assert.equal(b.hospital.admitted,26);
  for(let i=0;i<E.IDS.length;i++)assert.ok(b.rows[i].wounded>=a.rows[i].wounded,`${E.IDS[i]} lost a bed`);
});

test('every capacity from 0 to 100 is monotone for mixed admissions',()=>{
  const cases=[[2500,2500,1500,833,833,334,0],[97,43,13,12,7,3,1],[1,1,1,1,1,1,1],[10000,1,1,1,1,1,1]];
  for(const losses of cases){
    let previous=E.IDS.map(()=>0);
    for(let free=0;free<=100;free++){
      const r=E.resolveHospital(rowsFor(losses),{level:1,occupied:5000-free});
      for(let i=0;i<E.IDS.length;i++)assert.ok(r.rows[i].wounded>=previous[i],`free=${free}, ${E.IDS[i]}`);
      previous=r.rows.map(x=>x.wounded);
    }
  }
});

test('occupied beds and overflow are conserved, not double counted as additional losses',()=>{
  const r=E.resolveHospital(rowsFor([1000,0,0,0,0,0,0,0,0]),{level:1,occupied:4600});
  assert.equal(r.hospital.admitted,400);assert.equal(r.hospital.overflow,200);
  assert.equal(r.hospital.occupiedAfter,5000);
  const x=r.rows[0];assert.equal(x.dead,600);assert.equal(x.overflow,200);
  assert.equal(x.lost,x.wounded+x.dead+x.destroyed);
});

test('zero or full hospital admits nobody without deleting eligible wounded or losses',()=>{
  for(const config of [{level:0,occupied:0},{level:1,occupied:5000}]){
    const r=E.resolveHospital(rowsFor([1000]),config);
    assert.equal(r.hospital.admitted,0);assert.equal(r.hospital.eligible,600);
    assert.equal(r.hospital.overflow,600);assert.equal(r.rows[0].dead,1000);
  }
});

test('siege machines occupy no beds and are reported as destroyed equipment',()=>{
  const r=E.resolveHospital(rowsFor([0,0,0,0,0,0,0,1000,1000]),{level:30,occupied:0});
  assert.equal(r.hospital.humanLost,0);assert.equal(r.hospital.admitted,0);
  for(const row of r.rows.slice(-2)){
    assert.equal(row.destroyed,1000);assert.equal(row.dead,0);assert.equal(row.wounded,0);assert.equal(row.woundEligible,0);
  }
  for(const unitId of ['BatteringRam','FireCatapult'])assert.throws(()=>E.healingQuote({unitId,count:1,forge:1,hospitalLevel:1}));
});

test('hospital rejects overfilled, negative or malformed configurations',()=>{
  const rows=rowsFor([100]);
  for(const value of [{level:0,occupied:1},{level:1,occupied:5001},{level:1,occupied:-1},{level:1,occupied:0.1},{level:31,occupied:0},null,[]])assert.throws(()=>E.resolveHospital(rows,value));
  assert.throws(()=>E.resolveHospital(rows.slice(1),{level:1,occupied:0}));
  const duplicate=copy(rows);duplicate[1].id=duplicate[0].id;assert.throws(()=>E.resolveHospital(duplicate,{level:1,occupied:0}));
});

test('500 seeded mixed hospital cases preserve humans, machinery, available beds and integer counts',()=>{
  const rng=random(713739);
  for(let i=0;i<500;i++){
    const rows=rowsFor(E.IDS.map(()=>rng(1000001))),level=rng(31),capacity=E.hospitalCapacity(level),occupied=rng(capacity+1);
    const r=E.resolveHospital(rows,{level,occupied});
    assert.equal(r.hospital.eligible,Math.round(r.hospital.humanLost*.6));
    assert.equal(r.hospital.admitted,Math.min(r.hospital.eligible,capacity-occupied));
    assert.equal(sum(r.rows.map(x=>x.wounded)),r.hospital.admitted);
    assert.equal(r.hospital.occupiedAfter,occupied+r.hospital.admitted);
    assert.ok(r.hospital.occupiedAfter<=capacity);
    for(const x of r.rows){
      assert.equal(x.lost,x.wounded+x.dead+x.destroyed);
      assert.equal(x.woundEligible,x.wounded+x.overflow);
      for(const k of ['dead','wounded','destroyed','overflow','woundEligible'])assert.ok(Number.isSafeInteger(x[k])&&x[k]>=0);
    }
  }
});

test('normal recruitment requires no gold; one baseline instant recruit costs one gold',()=>{
  const q=quote(1);assert.equal(q.gold,1);assert.equal(q.normalGold,0);assert.equal(q.seconds,20);
  assert.deepEqual(q.resources,{wheat:35,wood:65,clay:0,iron:0});
  assert.equal(q.resourceTotal,100);
});

test('the three opening infantry classes train and heal using wheat and wood at every equipment level',()=>{
  for(const unitId of ['LightInfantry','Archer','SpearInfantry'])for(let forge=1;forge<=30;forge++){
    const q=quote(1000,forge,1,unitId),h=E.healingQuote({unitId,count:1000,forge,hospitalLevel:1});
    assert.equal(q.resources.clay,0);assert.equal(q.resources.iron,0);assert.equal(h.resources.clay,0);assert.equal(h.resources.iron,0);
    assert.ok(q.resources.wheat>0&&q.resources.wood>0);
  }
});

test('zero recruits have zero time, resources and gold for every unit',()=>{
  for(const unitId of E.IDS){const q=quote(0,30,30,unitId);assert.equal(q.gold,0);assert.equal(q.seconds,0);assert.equal(q.resourceTotal,0);assert.equal(q.averageGold,0);}
});

test('published marginal gold brackets calculate the agreed quantities exactly',()=>{
  for(const [count,gold]of [[1,1],[100,100],[1000,982],[5000,4782],[10000,9282],[50000,43282],[100000,83282]])assert.equal(quote(count).gold,gold,`quantity ${count}`);
  for(const boundary of [100,1000,5000,10000,50000]){
    const a=quote(boundary),b=quote(boundary+1);
    assert.ok(b.gold>=a.gold);assert.ok(b.gold-a.gold<=1);
    assert.ok(b.theoreticalDiscountPercent>=a.theoreticalDiscountPercent);
  }
});

test('all 30 equipment levels preserve the approved power increase and raise resource and training effort',()=>{
  for(const unitId of E.IDS){let previous=null;
    for(let forge=1;forge<=30;forge++){
      const q=quote(1000,forge,1,unitId);
      assert.equal(E.forgeBonus(forge),5*(forge-1));
      assert.equal(q.resourceFactor,(100+6*(forge-1))/100);
      assert.equal(q.effortFactor,(100+4*(forge-1))/100);
      if(previous){assert.ok(q.resourceTotal>=previous.resourceTotal);assert.ok(q.seconds>=previous.seconds);assert.ok(q.gold>=previous.gold);}
      previous=q;
    }
  }
});

test('training building speed grows to 1.70 times instead of removing 70 percent of duration',()=>{
  assert.equal(E.buildingSpeed(1),1);assert.equal(E.buildingSpeed(30),1.7);
  for(const unitId of E.IDS){const q1=quote(1000,20,1,unitId),q30=quote(1000,20,30,unitId);assert.equal(q30.seconds,Math.ceil(q1.seconds/1.7));assert.ok(q30.seconds>q1.seconds*.5);assert.ok(q30.gold<=q1.gold);}
});

test('500 seeded quotes are monotone and splitting a same-equipment order never buys more cheaply',()=>{
  const rng=random(381573);
  for(let i=0;i<500;i++){
    const unitId=E.IDS[rng(E.IDS.length)],forge=rng(30)+1,buildingLevel=rng(30)+1,a=rng(500000),b=rng(500001);
    const qa=quote(a,forge,buildingLevel,unitId),qb=quote(b,forge,buildingLevel,unitId),both=quote(a+b,forge,buildingLevel,unitId);
    assert.ok(both.gold<=qa.gold+qb.gold,JSON.stringify({unitId,forge,buildingLevel,a,b}));
    assert.ok(both.gold>=Math.max(qa.gold,qb.gold));
    assert.equal(both.resourceTotal,qa.resourceTotal+qb.resourceTotal);
    assert.ok(both.seconds<=qa.seconds+qb.seconds);
    assert.ok(both.theoreticalDiscountPercent>=0&&both.theoreticalDiscountPercent<=20);
    assert.ok(both.gold<=both.goldBeforeDiscount);
    for(const k of ['gold','goldBeforeDiscount','seconds','resourceTotal'])assert.ok(Number.isSafeInteger(both[k])&&both[k]>=0);
  }
});

test('paid retrofit exactly closes the resource difference and prevents cheap stockpiling followed by a free forge buff',()=>{
  const rng=random(531);
  for(let i=0;i<200;i++){
    const unitId=E.IDS[rng(E.IDS.length)],count=rng(100000)+1,fromForge=rng(29)+1,toForge=fromForge+rng(31-fromForge),buildingLevel=rng(30)+1;
    const old=quote(count,fromForge,buildingLevel,unitId),fresh=quote(count,toForge,buildingLevel,unitId),upgrade=E.retrofitQuote({unitId,count,fromForge,toForge,buildingLevel});
    for(const key of E.RESOURCES)assert.equal(old.resources[key]+upgrade.resources[key],fresh.resources[key]);
    assert.ok(old.seconds+upgrade.seconds>=fresh.seconds&&old.seconds+upgrade.seconds<=fresh.seconds+1);
    assert.ok(old.gold+upgrade.gold>=fresh.gold);
    const middle=Math.floor((fromForge+toForge)/2),step1=E.retrofitQuote({unitId,count,fromForge,toForge:middle,buildingLevel}),step2=E.retrofitQuote({unitId,count,fromForge:middle,toForge,buildingLevel});
    for(const key of E.RESOURCES)assert.equal(step1.resources[key]+step2.resources[key],upgrade.resources[key]);
    assert.ok(step1.gold+step2.gold>=upgrade.gold);
  }
});

test('same-level retrofit does no work, and downgrades or invalid training inputs are rejected',()=>{
  const r=E.retrofitQuote({unitId:'HeavyCavalry',count:100,fromForge:20,toForge:20,buildingLevel:30});
  assert.equal(r.gold,0);assert.equal(r.seconds,0);assert.equal(r.resourceTotal,0);
  assert.throws(()=>E.retrofitQuote({unitId:'HeavyCavalry',count:100,fromForge:20,toForge:19}));
  for(const count of [-1,1.5,1000001,NaN,Infinity,'1'])assert.throws(()=>quote(count));
  for(const forge of [0,31,1.5])assert.throws(()=>quote(1,forge));
  for(const level of [0,31,1.5])assert.throws(()=>quote(1,1,level));
  for(const unitId of ['unknown','__proto__','constructor'])assert.throws(()=>quote(1,1,1,unitId));
});

test('healing prices use the wounded cohort equipment and 40 percent resources / 35 percent effort',()=>{
  for(const unitId of humanIds){
    const fresh=quote(1000,20,10,unitId),heal=E.healingQuote({unitId,count:1000,forge:20,hospitalLevel:10});
    for(const key of E.RESOURCES)assert.equal(heal.unitResources[key],Math.ceil(fresh.unitResources[key]*.4));
    assert.equal(heal.workPercent,35);assert.equal(heal.resourcePercent,40);assert.equal(heal.building,'hospital');
    assert.ok(heal.resourceTotal<fresh.resourceTotal);assert.ok(heal.seconds<fresh.seconds);assert.ok(heal.gold<=fresh.gold);
  }
});

test('level tables cover all 30 levels with independent equipment and building speed fields',()=>{
  const rows=E.levelTable('HeavyCavalry',100,12);
  assert.equal(rows.length,30);assert.equal(rows[0].level,1);assert.equal(rows[29].level,30);
  for(const row of rows){assert.equal(row.quote.forge,row.level);assert.equal(row.quote.buildingLevel,12);assert.equal(row.hospitalCapacity,E.hospitalCapacity(row.level));}
});

test('battle economy groups queues by building and replaces permanent losses, not wounded twice',()=>{
  const r=E.simulate(E.example(),stamp);
  for(const side of ['attacker','defender']){
    const e=r.economy[side],rows=r.rows[side];
    assert.equal(e.completionSeconds,Math.max(...Object.values(e.queues)));
    for(const building of ['barracks','stable','workshop'])assert.equal(e.queues[building],sum(e.training.filter(q=>q.building===building).map(q=>q.seconds)));
    assert.equal(e.replacement.count,r.summary[side].dead+r.summary[side].destroyed);
    assert.equal(e.healing.count,r.summary[side].wounded);
    for(const q of e.replacement.quotes){const row=rows.find(x=>x.id===q.unitId);assert.equal(q.count,row.dead+row.destroyed);}
    for(const q of e.healing.quotes){assert.ok(humanIds.includes(q.unitId));assert.equal(q.count,rows.find(x=>x.id===q.unitId).wounded);}
  }
});

test('wounded returning home grant neither loot capacity nor intelligence to a wiped attacker',()=>{
  const s=E.example('small');s.policy='limited';s.hospitals.attacker={level:30,occupied:0};
  const r=E.simulate(s,stamp),p=E.projectReport(r,'attacker');
  assert.equal(r.summary.attacker.survived,0);assert.equal(r.summary.attacker.wounded,1200);
  assert.equal(r.loot.total,0);assert.equal(r.loot.after,0);assert.equal(r.exposure.attacker,false);assert.equal(p.estimate,null);
});

test('attacker and defender report exports include only their own hospital and economy',()=>{
  const r=E.simulate(E.example(),stamp);
  for(const view of ['attacker','defender']){
    const p=E.projectReport(r,view),enemy=view==='attacker'?'defender':'attacker',q=E.decodePayload(E.encodePayload(p));
    assert.equal(q.hospital[enemy],null);assert.equal(q.economy[enemy],null);assert.equal(q.sides[enemy].rows,null);
    assert.equal(q.hospital[view].admitted,q.sides[view].summary.wounded);assert.ok(q.economy[view].training);
  }
  const full=E.projectReport(r,'analyst');assert.ok(full.economy.attacker&&full.economy.defender);
});

test('altering hidden enemy hospital capacity or training speed cannot leak through the own report',()=>{
  for(const view of ['attacker','defender']){
    const s=E.example('small'),enemy=view==='attacker'?'defender':'attacker';
    const p1=E.projectReport(E.simulate(s,stamp),view);
    s.hospitals[enemy]={level:30,occupied:499999};s.training[enemy]={barracks:30,stable:30,workshop:30};
    const p2=E.projectReport(E.simulate(s,stamp),view);
    assert.deepEqual(p1,p2);
  }
});

test('V2 scenarios migrate explicitly to no hospital without inventing historical capacity',()=>{
  const s=E.example();s.schema=E.LEGACY_VERSION;delete s.hospitals;delete s.training;
  const migrated=E.normalize(s);
  assert.equal(migrated.schema,E.VERSION);assert.equal(migrated.migratedFrom,E.LEGACY_VERSION);
  assert.deepEqual(migrated.hospitals,{attacker:{level:0,occupied:0},defender:{level:0,occupied:0}});
  const r=E.simulate(migrated,stamp);assert.equal(r.summary.attacker.wounded,0);assert.equal(r.summary.defender.wounded,0);
  const invalid=E.example();delete invalid.hospitals;assert.throws(()=>E.normalize(invalid));
});

test('current shared reports preserve each perspective and all validated hospital and economy numbers',()=>{
  const r=E.simulate(E.example(),stamp);
  for(const view of ['analyst','attacker','defender']){
    const p=E.projectReport(r,view),q=E.readSharedReport(E.decodePayload(E.encodePayload(p)));
    assert.equal(q.view,view);assert.equal(q.schema,'GK_REPORT_3');assert.equal(q.generatedAt,stamp);
    assert.deepEqual(q.sides,p.sides);assert.deepEqual(q.hospital,p.hospital);assert.deepEqual(q.economy,p.economy);
    assert.ok(Object.isFrozen(q));assert.equal(q.verification,'SIMULATOR_ONLY_NOT_SERVER_SIGNED');
  }
});

test('shared report validation cannot reintroduce hidden opponent data into either player perspective',()=>{
  const r=E.simulate(E.example(),stamp),full=E.projectReport(r,'analyst');
  for(const view of ['attacker','defender']){
    const p=copy(E.projectReport(r,view)),enemy=view==='attacker'?'defender':'attacker';
    p.sides[enemy]=copy(full.sides[enemy]);p.hospital[enemy]=copy(full.hospital[enemy]);p.economy[enemy]=copy(full.economy[enemy]);
    p.power=copy(full.power);p.wall=copy(full.wall);p.loot=copy(full.loot);
    p.scenario=r.scenario;p.internalSecret='never copy';p.sides[view].privateKey='never copy';
    const q=E.readSharedReport(p);
    assert.equal(q.sides[enemy].rows,null);assert.equal(q.sides[enemy].summary,null);assert.equal(q.hospital[enemy],null);assert.equal(q.economy[enemy],null);
    assert.equal(q.power,null);assert.equal(q.internalSecret,undefined);assert.equal(q.scenario,undefined);assert.equal(q.sides[view].privateKey,undefined);
    if(view==='attacker'){assert.equal(q.wall,null);for(const key of ['stock','protected','available','availableTotal','stockAfter'])assert.equal(q.loot[key],undefined);}
    else{assert.equal(q.wall.suppressionPercent,undefined);assert.equal(q.wall.appliedPercent,undefined);assert.equal(q.loot.after,undefined);}
  }
});

test('shared report validation rejects malformed counts, inconsistent loss totals and injectable numeric strings',()=>{
  const p=E.projectReport(E.simulate(E.example(),stamp),'attacker');
  const mutations=[
    v=>v.sides.attacker.rows[0].wounded='<img src=x onerror=alert(1)>',
    v=>v.sides.attacker.rows[0].count=-1,
    v=>v.sides.attacker.rows[0].count+=1,
    v=>v.sides.attacker.rows[0].id='UnknownUnit',
    v=>v.sides.attacker.rows[1].id=v.sides.attacker.rows[0].id,
    v=>v.sides.attacker.summary.wounded+=1,
    v=>v.hospital.attacker.admitted+=1,
    v=>v.hospital.attacker.occupiedBefore=-1,
    v=>v.economy.attacker.training[0].gold='12<script>',
    v=>v.economy.attacker.training[0].count+=1,
    v=>v.economy.attacker.training[0].resources.wood+=1,
    v=>v.economy.attacker.training[0].goldSaved+=1,
    v=>v.view='admin',
    v=>v.generatedAt='not-a-date'
  ];
  for(const mutate of mutations){const bad=copy(p);mutate(bad);assert.throws(()=>E.readSharedReport(bad));}
});

function legacyReport(view){
  const p=copy(E.projectReport(E.simulate(E.example(),stamp),view));
  p.schema='GK_REPORT_2';p.ruleVersion=E.LEGACY_VERSION;p.policyVersion='GK_REPORT_PRIVACY_2';
  for(const side of ['attacker','defender'])if(p.sides[side].visible){
    for(const row of p.sides[side].rows)for(const key of ['wounded','dead','destroyed','woundEligible','overflow'])delete row[key];
    for(const key of ['destroyed','woundEligible','overflow','humanLost'])delete p.sides[side].summary[key];
    p.sides[side].summary.dead=null;p.sides[side].summary.wounded=null;
  }
  p.hospital={status:'coming_soon',capacity:null,wounded:null,dead:null};delete p.economy;
  return p;
}

test('V2 historical reports keep wounded, dead and healing costs unknown without recalculation',()=>{
  for(const view of ['analyst','attacker','defender']){
    const p=legacyReport(view),q=E.readSharedReport(E.decodePayload(E.encodePayload(p)));
    assert.equal(q.schema,'GK_REPORT_2');assert.equal(q.ruleVersion,E.LEGACY_VERSION);assert.equal(q.generatedAt,p.generatedAt);
    assert.equal(q.hospital.status,'coming_soon');assert.equal(q.hospital.capacity,null);assert.equal(q.hospital.wounded,null);assert.equal(q.hospital.dead,null);assert.equal(q.economy,null);
    for(const side of ['attacker','defender'])if(q.sides[side].visible){
      assert.equal(q.sides[side].summary.total,p.sides[side].summary.total);assert.equal(q.sides[side].summary.lost,p.sides[side].summary.lost);
      assert.equal(q.sides[side].summary.wounded,null);assert.equal(q.sides[side].summary.dead,null);
      for(let i=0;i<q.sides[side].rows.length;i++){
        assert.equal(q.sides[side].rows[i].lost,p.sides[side].rows[i].lost);assert.equal(q.sides[side].rows[i].forge,p.sides[side].rows[i].forge);
        assert.equal(q.sides[side].rows[i].wounded,null);assert.equal(q.sides[side].rows[i].dead,null);
      }
    }
  }
});

test('injecting new hospital fields into a legacy snapshot does not invent historical wounded',()=>{
  const p=legacyReport('attacker');p.hospital={status:'simulated',attacker:{level:30,capacity:500000,admitted:9876}};p.economy={attacker:{goldTotal:9876}};
  const q=E.readSharedReport(p);assert.equal(q.hospital.status,'coming_soon');assert.equal(q.hospital.wounded,null);assert.equal(q.economy,null);
});

test('largest supported analyst report fits serialization limits without truncated costs',()=>{
  const s=E.example();
  for(const side of ['attacker','defender']){s[side+'Name']='ع'.repeat(60);for(const id of E.IDS){s[side][id].count=1000000;s[side][id].forge=30;s[side][id].carry=10000;}}
  const p=E.projectReport(E.simulate(s,stamp),'analyst'),encoded=E.encodePayload(p);
  assert.ok(encoded.length<=150000);const q=E.readSharedReport(E.decodePayload(encoded));
  assert.deepEqual(q.economy,p.economy);assert.deepEqual(q.hospital,p.hospital);
  for(const side of ['attacker','defender']){
    assert.equal(q.sides[side].summary.total,9000000);
    for(const row of q.sides[side].rows){assert.equal(row.count,row.survived+row.wounded+row.dead+row.destroyed);assert.ok(Number.isSafeInteger(row.count));}
    assert.ok(q.hospital[side].admitted<=q.hospital[side].freeBefore);
  }
});

test('hospital capacity changes recovery only, never battle powers, losses, winner or loot',()=>{
  const s=E.example();s.hospitals={attacker:{level:0,occupied:0},defender:{level:0,occupied:0}};
  const a=E.simulate(s,stamp);s.hospitals={attacker:{level:30,occupied:0},defender:{level:30,occupied:499999}};
  const b=E.simulate(s,stamp);
  assert.equal(a.winner,b.winner);assert.deepEqual(a.power,b.power);assert.deepEqual(a.loot,b.loot);assert.deepEqual(a.wall,b.wall);
  for(const side of ['attacker','defender'])for(let i=0;i<E.IDS.length;i++){
    assert.equal(a.rows[side][i].lost,b.rows[side][i].lost);assert.equal(a.rows[side][i].survived,b.rows[side][i].survived);
    assert.ok(b.rows[side][i].dead<=a.rows[side][i].dead);assert.ok(b.rows[side][i].wounded>=a.rows[side][i].wounded);
  }
});
