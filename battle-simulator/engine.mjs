/* GloryKings Battle Lab. Experimental simulator, not a production server.
 * Powers, victory, loss budgets and allocations use exact integer arithmetic.
 * Never send simulate() output to a player. Use projectReport() on the SERVER.
 * In this local lab BOTH armies are deliberately supplied by the operator. */
export const VERSION='GK_BATTLE_REPORTS_2.0.0';
export const POLICY_VERSION='GK_REPORT_PRIVACY_2';
export const RESOURCES=['wheat','wood','clay','iron'];
export const UNITS=Object.freeze([
 {id:'LightInfantry',name:'مقاتل بهراوة',short:'بهراوة',attack:10,def:15,cavDef:45,pop:1,group:'infantry',icon:'spear',role:'مشاة تصد الفرسان؛ هجوم منخفض'},
 {id:'Archer',name:'رامي السهام',short:'سهام',attack:35,def:30,cavDef:10,pop:1,group:'infantry',icon:'bow',role:'دفاع عام؛ أضعف أمام الفرسان'},
 {id:'SpearInfantry',name:'أبو فأسين',short:'فأسين',attack:40,def:10,cavDef:5,pop:1,group:'infantry',icon:'axes',role:'مشاة هجومية؛ دفاع ضعيف'},
 {id:'LightCavalry',name:'فارس العرب',short:'العرب',attack:130,def:30,cavDef:40,pop:4,group:'cavalry',icon:'horse',role:'فرسان هجومية سريعة'},
 {id:'CamelCavalry',name:'فارس الجمل',short:'الجمل',attack:80,def:105,cavDef:185,pop:5,group:'cavalry',icon:'camel',role:'فرسان دفاعية ضد الفرسان'},
 {id:'HeavyCavalry',name:'سلاح الفرسان',short:'الثقيل',attack:150,def:200,cavDef:80,pop:6,group:'cavalry',icon:'heavy',role:'فرسان ثقيلة قوية ضد المشاة'},
 {id:'ArcherCavalry',name:'رامي الخيل',short:'رامي خيل',attack:110,def:110,cavDef:105,pop:5,group:'cavalry',icon:'horsebow',role:'فرسان متوازنة في الهجوم والدفاع'},
 {id:'BatteringRam',name:'كبش الحصار',short:'كبش',attack:2,def:20,cavDef:50,pop:5,group:'siege',icon:'ram',role:'يضعف مكافأة السور؛ الناجون يكسرون المتانة'},
 {id:'FireCatapult',name:'المنجنيق',short:'منجنيق',attack:95,def:90,cavDef:55,pop:8,group:'siege',icon:'catapult',role:'قصف وحريق للسور؛ لا يهدم مستويات المباني'}
].map(Object.freeze));
export const IDS=UNITS.map(u=>u.id);
const MAP=Object.fromEntries(UNITS.map(u=>[u.id,u]));
const clone=v=>JSON.parse(JSON.stringify(v));
const fail=m=>{throw new Error(m);};
const integer=(v,min,max,label)=>{if(!Number.isSafeInteger(v)||v<min||v>max)fail(label+' يجب أن يكون عددًا صحيحًا بين '+min+' و'+max);return v;};
const str=(s,label)=>{if(typeof s!=='string'||s.length>60)fail(label+' غير صالح');return s.trim()||label;};
export function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
export const forgeBonus=f=>5*(integer(f,1,30,'الحداد')-1);
export const forgeFactor=f=>1+forgeBonus(f)/100;
export function blankArmy(f=1){return Object.fromEntries(IDS.map(id=>[id,{count:0,forge:f,carry:null}]));}
export function wallStats(level,hp){integer(level,0,30,'مستوى السور');const max=1000*level;integer(hp,0,max,'متانة السور');return {level,max,hp,nominalPercent:level,intactPercent:max?100*hp/max:0,availablePercent:max?level*hp/max:0};}
export function normalize(s){
 if(!s||s.schema!==VERSION)fail('ملف التشكيلة لا يطابق إصدار المحاكي');
 const army=(a,label)=>{if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).some(k=>!IDS.includes(k)))fail('تشكيلة '+label+' غير صالحة');return Object.fromEntries(IDS.map(id=>{const v=a[id];if(!v)fail('بيانات جندي ناقصة');return [id,{count:integer(v.count,0,1000000,'عدد '+MAP[id].name),forge:integer(v.forge,1,30,'حداد '+MAP[id].name),carry:v.carry===null?null:integer(v.carry,0,10000,'حمولة '+MAP[id].name)}];}));};
 const a=army(s.attacker,'المهاجم'),d=army(s.defender,'المدافع');
 if(!IDS.some(id=>a[id].count))fail('أدخل قوات مهاجمة أولًا');
 if(!s.wall||!s.loot)fail('إعدادات السور أو الموارد ناقصة');
 const w=wallStats(s.wall.level,s.wall.hp);if(typeof s.wall.siege!=='boolean')fail('خيار الحصار غير صالح');
 const usedDirect=integer(s.wall.usedDirect,0,w.max,'ضرر آخر 60 ثانية');
 const usedHour=integer(s.wall.usedHour,0,w.max,'ضرر آخر 60 دقيقة');
 if(usedDirect>usedHour)fail('ضرر آخر دقيقة لا يمكن أن يتجاوز ضرر آخر ساعة');
 const stock={},protectedResources={};for(const k of RESOURCES){stock[k]=integer(s.loot.stock?.[k],0,1000000000,'رصيد المورد');protectedResources[k]=integer(s.loot.protected?.[k],0,1000000000,'حماية المورد');}
 if(!['strict','limited'].includes(s.policy))fail('سياسة الكشف غير معروفة');
 return {schema:VERSION,attackerName:str(s.attackerName,'المهاجم'),defenderName:str(s.defenderName,'المدافع'),attacker:a,defender:d,wall:{level:w.level,hp:w.hp,siege:s.wall.siege,usedDirect,usedHour},loot:{stock,protected:protectedResources,bonusPercent:integer(s.loot.bonusPercent,0,200,'مكافأة الحمولة'),occupied:integer(s.loot.occupied,0,1000000000,'الحمولة المحجوزة'),carrySource:['example','custom','missing'].includes(s.loot.carrySource)?s.loot.carrySource:'missing'},policy:s.policy};
}
function sqrt(n){if(n<2n)return n;let x=1n<<BigInt(Math.ceil(n.toString(2).length/2)),y=(x+n/x)>>1n;while(y<x){x=y;y=(x+n/x)>>1n;}return x;}
export function lossBudget(total,weak,strong){if(!total||weak===0n)return 0;const n=BigInt(total)**2n*weak**3n,d=strong**3n;let k=sqrt(n/d);if(4n*n>=(2n*k+1n)**2n*d)k++;return Math.min(total,Number(k));}
export function allocate(army,budget){const total=IDS.reduce((n,id)=>n+army[id].count,0);if(!total)return Object.fromEntries(IDS.map(id=>[id,{count:0,lost:0,survived:0}]));let used=0;const rows=IDS.map((id,i)=>{const n=BigInt(army[id].count)*BigInt(budget),d=BigInt(total),lost=Number(n/d);used+=lost;return {id,i,count:army[id].count,lost,rem:n%d};});const order=[...rows].sort((a,b)=>a.rem===b.rem?a.id.localeCompare(b.id,'en'):a.rem>b.rem?-1:1);for(let i=0;i<budget-used;i++)order[i].lost++;return Object.fromEntries(rows.map(r=>[r.id,{count:r.count,lost:r.lost,survived:r.count-r.lost}]));}
export function equalLoot(available,limit){const out=Object.fromEntries(RESOURCES.map(k=>[k,0]));let remaining=Math.min(limit,RESOURCES.reduce((s,k)=>s+available[k],0));let active=RESOURCES.filter(k=>available[k]>0);while(remaining&&active.length){const q=Math.floor(remaining/active.length);if(!q){for(const k of active){if(!remaining)break;out[k]++;remaining--;}break;}for(const k of active){const n=Math.min(q,available[k]-out[k]);out[k]+=n;remaining-=n;}active=active.filter(k=>out[k]<available[k]);}return out;}
function fortification(s){const {level:L,hp,siege}=s.wall,M=L*1000;if(!L)return {n:0n,d:1n,suppression:0};const k=siege?BigInt(s.attacker.BatteringRam.count*(100+forgeBonus(s.attacker.BatteringRam.forge))):0n;const n=BigInt(L*hp)*(k+BigInt(2000*L)),d=BigInt(100*M)*2n*(k+BigInt(1000*L));return {n,d,suppression:Number(k)/Number(2n*(k+BigInt(1000*L)))};}
function unitRows(army,allocated,wall=0){return UNITS.map(u=>{const x=army[u.id],loss=allocated[u.id],f=forgeFactor(x.forge);return {...loss,id:u.id,forge:x.forge,forgePercent:forgeBonus(x.forge),baseAttack:u.attack,baseDefense:u.def,baseCavalryDefense:u.cavDef,attack:u.attack*f,defense:u.def*f,cavalryDefense:u.cavDef*f,fortifiedDefense:u.def*f*(1+wall),fortifiedCavalryDefense:u.cavDef*f*(1+wall),combinedDefensePercent:((f*(1+wall))-1)*100,carry:x.carry};});}
function summary(rows){return {total:rows.reduce((s,x)=>s+x.count,0),lost:rows.reduce((s,x)=>s+x.lost,0),survived:rows.reduce((s,x)=>s+x.survived,0),dead:null,wounded:null,population:rows.reduce((s,x)=>s+x.count*MAP[x.id].pop,0),survivingPopulation:rows.reduce((s,x)=>s+x.survived*MAP[x.id].pop,0)};}
function sizeBand(n){if(!n)return 'لا تقدير';const bounds=[1,10,50,200,1000,5000,20000,50000,200000,1000000,10000000];for(let i=0;i<bounds.length-1;i++)if(n<bounds[i+1])return bounds[i]+'–'+(bounds[i+1]-1);return 'أكثر من 10000000';}
function intelGate(own,enemy,powerOwn,powerEnemy){return own.survived>0&&own.population>=100&&own.survivingPopulation>=Math.max(20,Math.ceil(own.population*.1))&&enemy.population>0&&own.population*10>=enemy.population&&powerOwn*10>=powerEnemy&&enemy.total>0&&enemy.lost*10>=enemy.total;}
export function simulate(input,generatedAt=new Date().toISOString()){
 const s=normalize(input),f=fortification(s);let ag=0n,ac=0n,di=0n,dc=0n;
 for(const u of UNITS){let x=s.attacker[u.id];const v=BigInt(x.count)*BigInt(u.attack)*BigInt(100+forgeBonus(x.forge));if(u.group==='cavalry')ac+=v;else ag+=v;x=s.defender[u.id];const n=BigInt(x.count)*BigInt(100+forgeBonus(x.forge));di+=n*BigInt(u.def);dc+=n*BigInt(u.cavDef);}
 const aa=ag+ac,a=aa*aa*f.d,d=(di*ag+dc*ac)*(f.d+f.n),den=100n*aa*f.d;
 const winner=a>d?'attacker':a<d?'defender':'tie';const na=IDS.reduce((n,id)=>n+s.attacker[id].count,0),nd=IDS.reduce((n,id)=>n+s.defender[id].count,0);
 const aLost=winner==='attacker'?lossBudget(na,d,a):na,dLost=winner==='defender'?lossBudget(nd,a,d):nd;
 const allocA=allocate(s.attacker,aLost),allocD=allocate(s.defender,dLost),fort=Number(f.n)/Number(f.d);
 const rowsA=unitRows(s.attacker,allocA),rowsD=unitRows(s.defender,allocD,fort),sumA=summary(rowsA),sumD=summary(rowsD);
 const ws=wallStats(s.wall.level,s.wall.hp),M=ws.max;
 const ram100=BigInt(allocA.BatteringRam.survived)*BigInt(100+forgeBonus(s.attacker.BatteringRam.forge)),cat100=BigInt(allocA.FireCatapult.survived)*BigInt(100+forgeBonus(s.attacker.FireCatapult.forge));
 const raw=s.wall.siege&&winner==='attacker'?Number((12n*ram100+6n*cat100)/100n):0;
 const direct=Math.min(raw,ws.hp,Math.max(0,Math.floor(M*.10)-s.wall.usedDirect),Math.max(0,Math.floor(M*.25)-s.wall.usedHour));
 const fire=direct&&s.wall.siege?Math.max(0,Math.floor(Math.min(Number(3n*cat100)/100,M*.02,direct*.5,ws.hp-direct,Math.max(0,Math.floor(M*.25)-s.wall.usedHour-direct)))):0;
 const wall={...ws,appliedPercent:fort*100,suppressionPercent:f.suppression*100,directRaw:raw,direct,prevented:raw-direct,firePotential:fire,fireMinutes:30,hpAfter:ws.hp-direct,hpAfterFire:ws.hp-direct-fire,directCap:Math.floor(M*.10),hourCap:Math.floor(M*.25),usedDirect:s.wall.usedDirect,usedHour:s.wall.usedHour,experimentalSiege:s.wall.siege};
 let missing=rowsA.filter(r=>r.count>0&&r.carry===null).map(r=>r.id);let before=0,after=0;
 if(!missing.length){before=Number(BigInt(rowsA.reduce((n,r)=>n+r.count*r.carry,0))*BigInt(100+s.loot.bonusPercent)/100n);after=Number(BigInt(rowsA.reduce((n,r)=>n+r.survived*r.carry,0))*BigInt(100+s.loot.bonusPercent)/100n);}
 const occupied=Math.min(s.loot.occupied,after),free=Math.max(0,after-occupied),available=Object.fromEntries(RESOURCES.map(k=>[k,Math.max(0,s.loot.stock[k]-s.loot.protected[k])]));
 const availableTotal=RESOURCES.reduce((n,k)=>n+available[k],0),canLoot=winner==='attacker'&&sumA.survived>0;
 const total=missing.length?null:(canLoot?Math.min(free,availableTotal):0),amounts=total===null?null:equalLoot(available,total);
 const loot={status:missing.length?'missing':'calculated',missing,source:s.loot.carrySource,before:missing.length?null:before,after:missing.length?null:after,occupied:missing.length?null:occupied,discardedOccupied:missing.length?null:s.loot.occupied-occupied,free:missing.length?null:free,total,amounts,utilization:missing.length?null:(free?100*total/free:0),survivingCapacityPercent:missing.length?null:(before?100*after/before:0),bonusPercent:s.loot.bonusPercent,stock:s.loot.stock,protected:s.loot.protected,available,availableTotal,stockAfter:amounts?Object.fromEntries(RESOURCES.map(k=>[k,s.loot.stock[k]-amounts[k]])):null};
 const attackPower=Number(a)/Number(den),defensePower=Number(d)/Number(den),baseDefense=Number(di*ag+dc*ac)/Number(100n*aa);
 return freeze({version:VERSION,policyVersion:POLICY_VERSION,generatedAt,winner,scenario:s,rows:{attacker:rowsA,defender:rowsD},summary:{attacker:sumA,defender:sumD},power:{attacker:attackPower,defender:defensePower,baseDefense,cavalryPercent:Number(ac)*100/Number(aa),ratio:defensePower?attackPower/defensePower:null},wall,loot,exposure:{attacker:intelGate(sumA,sumD,attackPower,defensePower),defender:intelGate(sumD,sumA,defensePower,attackPower)},exact:{attackNumerator:a.toString(),defenseNumerator:d.toString(),denominator:den.toString()}});
}
/* Deny-by-default DTO; hidden data NEVER copied into this object. Analyst projection
 * is a separate explicitly public-input mode, not a player permission. No exact enemy
 * roster/buffs are disclosed by an attack, including in the experimental estimate mode. */
export function projectReport(r,view='attacker'){
 if(!['analyst','attacker','defender'].includes(view))fail('منظور التقرير غير صالح');const full=view==='analyst';
 const sides={};for(const side of ['attacker','defender']){const visible=full||view===side;sides[side]={name:r.scenario[side+'Name'],visible,summary:visible?clone(r.summary[side]):null,rows:visible?clone(r.rows[side]):null};if(!full&&view===side&&side==='defender')for(const x of sides[side].rows){delete x.fortifiedDefense;delete x.fortifiedCavalryDefense;delete x.combinedDefensePercent;}}
 let estimate=null;if(!full&&r.scenario.policy==='limited'&&r.exposure[view]){const other=view==='attacker'?'defender':'attacker';estimate={initialTroopBand:sizeBand(r.summary[other].total),label:'تقدير واسع لعدد المشاركين وقت المعركة؛ لا يكشف الأنواع أو الحداد أو الناجين'};}
 let loot;if(full)loot=clone(r.loot);else if(view==='attacker'){const l=r.loot;loot={status:l.status,source:l.source,before:l.before,after:l.after,occupied:l.occupied,discardedOccupied:l.discardedOccupied,free:l.free,total:l.total,amounts:l.amounts?clone(l.amounts):null,utilization:l.utilization,survivingCapacityPercent:l.survivingCapacityPercent,bonusPercent:l.bonusPercent};}else{const l=r.loot;loot={status:l.status,total:l.total,amounts:l.amounts?clone(l.amounts):null,stock:clone(l.stock),protected:clone(l.protected),stockAfter:l.stockAfter?clone(l.stockAfter):null};}
 let wall=null;if(full)wall=clone(r.wall);else if(view==='defender'){const w=r.wall;wall={level:w.level,max:w.max,hp:w.hp,nominalPercent:w.nominalPercent,availablePercent:w.availablePercent,direct:w.direct,firePotential:w.firePotential,fireMinutes:w.fireMinutes,hpAfter:w.hpAfter,hpAfterFire:w.hpAfterFire};}
 return freeze({schema:'GK_REPORT_2',ruleVersion:r.version,policyVersion:r.policyVersion,generatedAt:r.generatedAt,view,policy:r.scenario.policy,winner:r.winner,sides,power:full?clone(r.power):null,wall,loot,estimate,hospital:{status:'coming_soon',capacity:null,wounded:null,dead:null},notice:full?'تحليل مدخلات معروفة؛ ليس تقرير لاعب':'معلومات الخصم محجوبة. لا سهام مقارنة ولا أعداد قتل ولا قوة مشتقة للخصم.',verification:'SIMULATOR_ONLY_NOT_SERVER_SIGNED'});
}
export function encodePayload(value){const bytes=new TextEncoder().encode(JSON.stringify(value));let s='';for(const x of bytes)s+=String.fromCharCode(x);return btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
export function decodePayload(text){if(typeof text!=='string'||text.length>150000||!/^[A-Za-z0-9_-]+$/.test(text))fail('رابط غير صالح أو طويل جدًا');const b=atob(text.replaceAll('-','+').replaceAll('_','/'));const v=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(b,c=>c.charCodeAt(0))));return v;}
export function example(kind='forge'){
 const s={schema:VERSION,attackerName:'جيشك',defenderName:'الخصم',attacker:blankArmy(5),defender:blankArmy(15),wall:{level:10,hp:10000,siege:true,usedDirect:0,usedHour:0},loot:{stock:{wheat:80000,wood:60000,clay:25000,iron:15000},protected:{wheat:10000,wood:10000,clay:5000,iron:5000},bonusPercent:0,occupied:0,carrySource:'example'},policy:'strict'};
 const demo=[60,30,40,80,60,50,50,0,0];IDS.forEach((id,i)=>{s.attacker[id].carry=demo[i];s.defender[id].carry=demo[i];});
 s.attacker.LightInfantry.count=1000;s.attacker.SpearInfantry.count=1800;s.attacker.LightCavalry.count=350;s.attacker.BatteringRam.count=80;s.attacker.FireCatapult.count=20;
 s.defender.LightInfantry.count=1200;s.defender.Archer.count=400;s.defender.HeavyCavalry.count=100;
 if(kind==='probe'||kind==='small'){for(const id of IDS){s.attacker[id].count=0;s.defender[id].count=0;}s.attacker.LightInfantry.count=kind==='probe'?1:2000;s.defender.LightInfantry.count=50000;s.wall.level=30;s.wall.hp=30000;}
 if(kind==='loot'){for(const id of IDS){s.attacker[id].count=0;s.defender[id].count=0;}s.attacker.LightCavalry.count=400;s.defender.SpearInfantry.count=100;s.wall.level=5;s.wall.hp=5000;}
 if(kind==='siege'){s.attacker.SpearInfantry.count=15000;s.attacker.BatteringRam.count=300;s.attacker.FireCatapult.count=60;s.wall.level=30;s.wall.hp=30000;}
 return s;
}
