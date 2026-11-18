/* GloryKings Battle Lab. Experimental simulator, not a production server.
 * Powers, victory, loss budgets and allocations use exact integer arithmetic.
 * Never send simulate() output to a player. Use projectReport() on the SERVER.
 * In this local lab BOTH armies are deliberately supplied by the operator. */
export const VERSION='GK_BATTLE_REPORTS_3.0.0';
export const POLICY_VERSION='GK_REPORT_PRIVACY_3';
export const LEGACY_VERSION='GK_BATTLE_REPORTS_2.0.0';
export const WOUND_PERCENT=60;
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
export const BUILDINGS=Object.freeze(['barracks','stable','workshop']);
export const ECONOMY=Object.freeze(Object.fromEntries([
 ['LightInfantry',[35,65,0,0],20,'barracks','مشاة مضادة للفرسان'],
 ['Archer',[40,100,0,0],24,'barracks','رماة مشاة'],
 ['SpearInfantry',[45,105,0,0],22,'barracks','مشاة هجومية'],
 ['LightCavalry',[120,120,70,140],80,'stable','فرسان هجومية'],
 ['CamelCavalry',[170,150,120,210],100,'stable','فرسان دفاعية'],
 ['HeavyCavalry',[180,180,130,360],120,'stable','فرسان ثقيلة'],
 ['ArcherCavalry',[150,170,110,220],100,'stable','رماة فرسان'],
 ['BatteringRam',[100,300,200,200],100,'workshop','آلة حصار'],
 ['FireCatapult',[160,400,280,360],160,'workshop','آلة حصار نارية']
].map(([id,cost,baseSeconds,building,category])=>[id,Object.freeze({resources:Object.freeze(Object.fromEntries(RESOURCES.map((key,i)=>[key,cost[i]]))),baseSeconds,building,category,source:'proposal'})])));
export const GOLD_TIERS=Object.freeze([
 {from:1,to:100,discountPercent:0},
 {from:101,to:1000,discountPercent:2},
 {from:1001,to:5000,discountPercent:5},
 {from:5001,to:10000,discountPercent:10},
 {from:10001,to:50000,discountPercent:15},
 {from:50001,to:1000000,discountPercent:20}
].map(Object.freeze));
const clone=v=>JSON.parse(JSON.stringify(v));
const fail=m=>{throw new Error(m);};
const integer=(v,min,max,label)=>{if(!Number.isSafeInteger(v)||v<min||v>max)fail(label+' يجب أن يكون عددًا صحيحًا بين '+min+' و'+max);return v;};
const str=(s,label)=>{if(typeof s!=='string'||s.length>60)fail(label+' غير صالح');return s.trim()||label;};
export function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
export const forgeBonus=f=>5*(integer(f,1,30,'الحداد')-1);
export const forgeFactor=f=>1+forgeBonus(f)/100;
export function blankArmy(f=1){return Object.fromEntries(IDS.map(id=>[id,{count:0,forge:f,carry:null}]));}
const roundRatio=(n,d)=>(2n*n+d)/(2n*d);
const ceilRatio=(n,d)=>(n+d-1n)/d;
const resourceSum=r=>RESOURCES.reduce((n,k)=>n+r[k],0);
const zeroResources=()=>Object.fromEntries(RESOURCES.map(k=>[k,0]));
export function buildingSpeed(level){integer(level,1,30,'مستوى مبنى التدريب');return (290+7*(level-1))/290;}
function quoteCount(count){return integer(count,0,1000000,'عدد التدريب');}
function costCatalog(unitId){if(typeof unitId!=='string'||!Object.hasOwn(ECONOMY,unitId))fail('نوع جندي غير صالح للتدريب');return ECONOMY[unitId];}
function levelResources(unitId,forge){const e=costCatalog(unitId),rf=100+6*(integer(forge,1,30,'حداد التدريب')-1);return Object.fromEntries(RESOURCES.map(k=>[k,Number(ceilRatio(BigInt(e.resources[k])*BigInt(rf),100n))]));}
function quoteGold(count,unitWorkNumerator,unitWorkDenominator,speedNumerator){
 const tiers=GOLD_TIERS.map(t=>({...t,count:Math.max(0,Math.min(count,t.to)-t.from+1)})).filter(t=>t.count>0);
 const weightedHundredths=tiers.reduce((n,t)=>n+BigInt(t.count)*BigInt(100-t.discountPercent),0n);
 // Twenty seconds of effective work is one gold. Healing work also accounts
 // for the shared hospital throughput; a minimum patient duration can make
 // actual completion time longer. Marginal discounts never reprice a batch.
 const denominator=unitWorkDenominator*BigInt(speedNumerator)*20n*100n;
 const numerator=unitWorkNumerator*290n*weightedHundredths;
 const beforeNumerator=unitWorkNumerator*290n*BigInt(count)*100n;
 const gold=Number(ceilRatio(numerator,denominator)),goldBeforeDiscount=Number(ceilRatio(beforeNumerator,denominator));
 const nextTier=GOLD_TIERS.find(t=>count+1>=t.from&&count+1<=t.to)||GOLD_TIERS.at(-1);
 const undiscountedGold=Number(beforeNumerator)/Number(denominator),discountedGold=Number(numerator)/Number(denominator);
 return {gold,goldBeforeDiscount,undiscountedGold,discountedGold,goldSaved:goldBeforeDiscount-gold,averageGold:count?gold/count:0,effectiveDiscountPercent:undiscountedGold?Math.max(0,100*(1-gold/undiscountedGold)):0,theoreticalDiscountPercent:count?100*(1-Number(weightedHundredths)/(100*count)):0,nextMarginalDiscountPercent:nextTier.discountPercent,tiers};
}
function baseQuote({unitId,count,forge,buildingLevel,unitResources,effortHundredths,workPercent=100,kind='training'}){
 const e=costCatalog(unitId);quoteCount(count);integer(forge,1,30,'حداد التدريب');integer(buildingLevel,1,30,'مستوى مبنى التدريب');
 const speedNumerator=290+7*(buildingLevel-1),unitWorkNumerator=BigInt(e.baseSeconds)*BigInt(effortHundredths)*BigInt(workPercent),unitWorkDenominator=10000n;
 const resources=Object.fromEntries(RESOURCES.map(k=>[k,unitResources[k]*count]));
 const seconds=Number(ceilRatio(BigInt(count)*unitWorkNumerator*290n,unitWorkDenominator*BigInt(speedNumerator)));
 return {source:'proposal',kind,unitId,count,forge,buildingLevel,building:e.building,category:e.category,baseSeconds:e.baseSeconds,unitResources,resources,resourceTotal:resourceSum(resources),resourceFactor:(100+6*(forge-1))/100,effortFactor:effortHundredths/100,workPercent,speedFactor:speedNumerator/290,speedPercent:70*(buildingLevel-1)/29,unitSeconds:Number(unitWorkNumerator*290n)/Number(unitWorkDenominator*BigInt(speedNumerator)),seconds,normalGold:0,...quoteGold(count,unitWorkNumerator,unitWorkDenominator,speedNumerator)};
}
export function trainingQuote({unitId,count,forge,buildingLevel=1}={}){
 const unitResources=levelResources(unitId,forge);
 return freeze(baseQuote({unitId,count,forge,buildingLevel,unitResources,effortHundredths:100+4*(forge-1)}));
}
export function retrofitQuote({unitId,count,fromForge,toForge,buildingLevel=1}={}){
 integer(fromForge,1,30,'مستوى التجهيز السابق');integer(toForge,fromForge,30,'مستوى التجهيز الجديد');
 const before=levelResources(unitId,fromForge),after=levelResources(unitId,toForge),unitResources=Object.fromEntries(RESOURCES.map(k=>[k,after[k]-before[k]]));
 return freeze({...baseQuote({unitId,count,forge:toForge,buildingLevel,unitResources,effortHundredths:4*(toForge-fromForge),kind:'retrofit'}),fromForge,toForge,resourceFactorDifference:.06*(toForge-fromForge)});
}
export function healingQuote({unitId,count,forge,hospitalLevel=1}={}){
 if(costCatalog(unitId).building==='workshop')fail('آلات الحصار لا تعالج في المستشفى');
 integer(hospitalLevel,1,30,'مستوى المستشفى للعلاج');
 const recruitResources=levelResources(unitId,forge),unitResources=Object.fromEntries(RESOURCES.map(k=>[k,Number(ceilRatio(BigInt(recruitResources[k])*40n,100n))]));
 const serial=baseQuote({unitId,count,forge,buildingLevel:hospitalLevel,unitResources,effortHundredths:100+4*(forge-1),workPercent:35,kind:'healing'});
 const capacity=BigInt(hospitalCapacity(hospitalLevel)),speedNumerator=290+7*(hospitalLevel-1),unitWorkNumerator=BigInt(ECONOMY[unitId].baseSeconds)*BigInt(100+4*(forge-1))*35n,unitWorkDenominator=10000n;
 // One shared treatment pool serves cohorts serially. The capacity / 2500
 // throughput is continuous (e.g. 2.2 at level 2), without integer-team cliffs.
 // A small cohort cannot finish faster than treating one actual patient.
 const workCount=BigInt(count)*2500n,limitedCount=workCount>capacity?workCount:capacity;
 const seconds=count?Number(ceilRatio(unitWorkNumerator*290n*limitedCount,unitWorkDenominator*BigInt(speedNumerator)*capacity)):0;
 return freeze({...serial,building:'hospital',hospitalLevel,resourcePercent:40,parallelThroughput:hospitalThroughput(hospitalLevel),baseSerialSeconds:serial.seconds,seconds,...quoteGold(count,unitWorkNumerator*2500n,unitWorkDenominator*capacity,speedNumerator)});
}
function normalizedTraining(value){
 const v=value??{barracks:1,stable:1,workshop:1};
 if(typeof v!=='object'||Array.isArray(v))fail('مستويات مباني التدريب غير صالحة');
 return Object.fromEntries(BUILDINGS.map(k=>[k,integer(v[k],1,30,'مستوى مبنى '+k)]));
}
function combineQuotes(quotes,healing=false){
 const resources=zeroResources(),queues=Object.fromEntries(BUILDINGS.map(k=>[k,0]));let goldTotal=0,count=0,seconds=0;
 for(const q of quotes){for(const k of RESOURCES)resources[k]+=q.resources[k];goldTotal+=q.gold;count+=q.count;seconds+=q.seconds;if(!healing)queues[q.building]+=q.seconds;}
 return healing?{quotes,resourceTotal:resources,resourceSum:resourceSum(resources),goldTotal,seconds,count}:{quotes,resourceTotal:resources,resourceSum:resourceSum(resources),goldTotal,queues,completionSeconds:Math.max(...Object.values(queues)),count};
}
function armyEconomy(rows,training,hospitalLevel){
 const trainingQuotes=rows.map(r=>trainingQuote({unitId:r.id,count:r.count,forge:r.forge,buildingLevel:training[ECONOMY[r.id].building]}));
 const all=combineQuotes(trainingQuotes);
 const replacement=combineQuotes(rows.map(r=>trainingQuote({unitId:r.id,count:r.dead+r.destroyed,forge:r.forge,buildingLevel:training[ECONOMY[r.id].building]})));
 const healing=combineQuotes(rows.filter(r=>MAP[r.id].group!=='siege').map(r=>healingQuote({unitId:r.id,count:r.wounded,forge:r.forge,hospitalLevel:Math.max(1,hospitalLevel)})),true);
 return {source:'proposal',training:all.quotes,resourceTotal:all.resourceTotal,resourceSum:all.resourceSum,goldTotal:all.goldTotal,queues:all.queues,completionSeconds:all.completionSeconds,count:all.count,replacement,healing};
}
export function levelTable(unitId='LightInfantry',count=1,buildingLevel=1){
 costCatalog(unitId);quoteCount(count);integer(buildingLevel,1,30,'مستوى مبنى التدريب');
 return freeze(Array.from({length:30},(_,i)=>{const level=i+1;return{level,hospitalCapacity:hospitalCapacity(level),hospitalParallelThroughput:hospitalThroughput(level),forgePercent:forgeBonus(level),resourceFactor:1+.06*i,effortFactor:1+.04*i,buildingSpeedPercent:70*i/29,buildingSpeedFactor:buildingSpeed(level),quote:trainingQuote({unitId,count,forge:level,buildingLevel})};}));
}
export function hospitalCapacity(level){
 integer(level,0,30,'مستوى المستشفى');if(level===0)return 0;
 const t=BigInt(level-1);
 // Capacity milestones are proposed between the owner's two fixed endpoints.
 return Number(500n*roundRatio(5000n*841n+495000n*t*t,841n*500n));
}
export function hospitalThroughput(level){return hospitalCapacity(level)/2500;}
function normalizedHospital(value,label){
 if(!value||typeof value!=='object'||Array.isArray(value))fail('بيانات مستشفى '+label+' ناقصة');
 const level=integer(value.level,0,30,'مستوى مستشفى '+label),capacity=hospitalCapacity(level);
 return {level,occupied:integer(value.occupied,0,capacity,'أسرّة مستشفى '+label+' المشغولة')};
}
// Largest remainders allocates integer soldiers, not their population weights. A
// stable unit ID resolves exact ties, so row/input order cannot favour a unit.
function proportionalCounts(weights,budget){
 const total=IDS.reduce((n,id)=>n+weights[id],0),out=Object.fromEntries(IDS.map(id=>[id,0]));
 integer(budget,0,total,'العدد الموزّع');if(!total||!budget)return out;
 let used=0;const rows=IDS.map(id=>{const n=BigInt(weights[id])*BigInt(budget),d=BigInt(total),count=Number(n/d);out[id]=count;used+=count;return{id,rem:n%d};});
 rows.sort((a,b)=>a.rem===b.rem?(a.id<b.id?-1:a.id>b.id?1:0):a.rem>b.rem?-1:1);
 for(let i=0;i<budget-used;i++)out[rows[i].id]++;
 return out;
}
function monotoneAdmissions(weights,budget){
 const total=IDS.reduce((n,id)=>n+weights[id],0),out=Object.fromEntries(IDS.map(id=>[id,0]));
 integer(budget,0,total,'الأسرّة الموزّعة');if(!total||!budget)return out;
 // Jefferson / D'Hondt highest averages is house-monotone: increasing beds
 // never removes an admission from a unit type. Its lower quota is a safe
 // starting allocation; fewer than nine remaining seats need comparisons.
 let used=0;for(const id of IDS){out[id]=Number(BigInt(weights[id])*BigInt(budget)/BigInt(total));used+=out[id];}
 while(used<budget){let best=null;for(const id of IDS){if(out[id]>=weights[id])continue;if(best===null){best=id;continue;}const left=BigInt(weights[id])*BigInt(out[best]+1),right=BigInt(weights[best])*BigInt(out[id]+1);if(left>right||(left===right&&id<best))best=id;}
  if(best===null)fail('تعذر توزيع أسرّة المستشفى');out[best]++;used++;
 }
 return out;
}
export function resolveHospital(rows,hospital){
 const config=normalizedHospital(hospital,'الطرف'),capacity=hospitalCapacity(config.level),freeBefore=capacity-config.occupied;
 const losses=Object.fromEntries(IDS.map(id=>[id,0]));
 if(!Array.isArray(rows)||rows.length!==IDS.length||new Set(rows.map(r=>r.id)).size!==IDS.length)fail('صفوف القوات غير صالحة');
 for(const row of rows){if(!MAP[row.id])fail('نوع جندي غير معروف');integer(row.lost,0,1000000,'الخسائر');if(MAP[row.id].group!=='siege')losses[row.id]=row.lost;}
 const humanLost=IDS.reduce((n,id)=>n+losses[id],0),eligible=Number(roundRatio(BigInt(humanLost)*BigInt(WOUND_PERCENT),100n));
 const eligibleByUnit=proportionalCounts(losses,eligible),admitted=Math.min(eligible,freeBefore),admittedByUnit=monotoneAdmissions(eligibleByUnit,admitted);
 const resultRows=rows.map(row=>{const machine=MAP[row.id].group==='siege',wounded=admittedByUnit[row.id],woundEligible=eligibleByUnit[row.id];return {...row,woundEligible,wounded,overflow:woundEligible-wounded,dead:machine?0:row.lost-wounded,destroyed:machine?row.lost:0};});
 return {rows:resultRows,hospital:{level:config.level,capacity,parallelThroughput:hospitalThroughput(config.level),occupiedBefore:config.occupied,freeBefore,humanLost,eligible,admitted,overflow:eligible-admitted,occupiedAfter:config.occupied+admitted,woundPercent:WOUND_PERCENT}};
}
export function wallStats(level,hp){integer(level,0,30,'مستوى السور');const max=1000*level;integer(hp,0,max,'متانة السور');return {level,max,hp,nominalPercent:level,intactPercent:max?100*hp/max:0,availablePercent:max?level*hp/max:0};}
export function normalize(s){
 if(!s||![VERSION,LEGACY_VERSION].includes(s.schema))fail('ملف التشكيلة لا يطابق إصدار المحاكي');
 const legacy=s.schema===LEGACY_VERSION;
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
 const hospitalInput=legacy&&!s.hospitals?{attacker:{level:0,occupied:0},defender:{level:0,occupied:0}}:s.hospitals;
 const hospitals={attacker:normalizedHospital(hospitalInput?.attacker,'المهاجم'),defender:normalizedHospital(hospitalInput?.defender,'المدافع')};
 const training={attacker:normalizedTraining(s.training?.attacker),defender:normalizedTraining(s.training?.defender)};
 return {schema:VERSION,attackerName:str(s.attackerName,'المهاجم'),defenderName:str(s.defenderName,'المدافع'),attacker:a,defender:d,wall:{level:w.level,hp:w.hp,siege:s.wall.siege,usedDirect,usedHour},loot:{stock,protected:protectedResources,bonusPercent:integer(s.loot.bonusPercent,0,200,'مكافأة الحمولة'),occupied:integer(s.loot.occupied,0,1000000000,'الحمولة المحجوزة'),carrySource:['example','custom','missing'].includes(s.loot.carrySource)?s.loot.carrySource:'missing'},policy:s.policy,hospitals,training,migratedFrom:legacy?LEGACY_VERSION:s.migratedFrom===LEGACY_VERSION?LEGACY_VERSION:null};
}
function sqrt(n){if(n<2n)return n;let x=1n<<BigInt(Math.ceil(n.toString(2).length/2)),y=(x+n/x)>>1n;while(y<x){x=y;y=(x+n/x)>>1n;}return x;}
export function lossBudget(total,weak,strong){if(!total||weak===0n)return 0;const n=BigInt(total)**2n*weak**3n,d=strong**3n;let k=sqrt(n/d);if(4n*n>=(2n*k+1n)**2n*d)k++;return Math.min(total,Number(k));}
export function allocate(army,budget){const total=IDS.reduce((n,id)=>n+army[id].count,0);if(!total)return Object.fromEntries(IDS.map(id=>[id,{count:0,lost:0,survived:0}]));let used=0;const rows=IDS.map((id,i)=>{const n=BigInt(army[id].count)*BigInt(budget),d=BigInt(total),lost=Number(n/d);used+=lost;return {id,i,count:army[id].count,lost,rem:n%d};});const order=[...rows].sort((a,b)=>a.rem===b.rem?a.id.localeCompare(b.id,'en'):a.rem>b.rem?-1:1);for(let i=0;i<budget-used;i++)order[i].lost++;return Object.fromEntries(rows.map(r=>[r.id,{count:r.count,lost:r.lost,survived:r.count-r.lost}]));}
export function equalLoot(available,limit){const out=Object.fromEntries(RESOURCES.map(k=>[k,0]));let remaining=Math.min(limit,RESOURCES.reduce((s,k)=>s+available[k],0));let active=RESOURCES.filter(k=>available[k]>0);while(remaining&&active.length){const q=Math.floor(remaining/active.length);if(!q){for(const k of active){if(!remaining)break;out[k]++;remaining--;}break;}for(const k of active){const n=Math.min(q,available[k]-out[k]);out[k]+=n;remaining-=n;}active=active.filter(k=>out[k]<available[k]);}return out;}
function fortification(s){const {level:L,hp,siege}=s.wall,M=L*1000;if(!L)return {n:0n,d:1n,suppression:0};const k=siege?BigInt(s.attacker.BatteringRam.count*(100+forgeBonus(s.attacker.BatteringRam.forge))):0n;const n=BigInt(L*hp)*(k+BigInt(2000*L)),d=BigInt(100*M)*2n*(k+BigInt(1000*L));return {n,d,suppression:Number(k)/Number(2n*(k+BigInt(1000*L)))};}
function unitRows(army,allocated,wall=0){return UNITS.map(u=>{const x=army[u.id],loss=allocated[u.id],f=forgeFactor(x.forge);return {...loss,id:u.id,forge:x.forge,forgePercent:forgeBonus(x.forge),baseAttack:u.attack,baseDefense:u.def,baseCavalryDefense:u.cavDef,attack:u.attack*f,defense:u.def*f,cavalryDefense:u.cavDef*f,fortifiedDefense:u.def*f*(1+wall),fortifiedCavalryDefense:u.cavDef*f*(1+wall),combinedDefensePercent:((f*(1+wall))-1)*100,carry:x.carry};});}
function summary(rows){return {total:rows.reduce((s,x)=>s+x.count,0),lost:rows.reduce((s,x)=>s+x.lost,0),survived:rows.reduce((s,x)=>s+x.survived,0),dead:rows.reduce((s,x)=>s+x.dead,0),wounded:rows.reduce((s,x)=>s+x.wounded,0),destroyed:rows.reduce((s,x)=>s+x.destroyed,0),woundEligible:rows.reduce((s,x)=>s+x.woundEligible,0),overflow:rows.reduce((s,x)=>s+x.overflow,0),humanLost:rows.reduce((s,x)=>s+x.dead+x.wounded,0),population:rows.reduce((s,x)=>s+x.count*MAP[x.id].pop,0),survivingPopulation:rows.reduce((s,x)=>s+x.survived*MAP[x.id].pop,0)};}
function sizeBand(n){if(!n)return 'لا تقدير';const bounds=[1,10,50,200,1000,5000,20000,50000,200000,1000000,10000000];for(let i=0;i<bounds.length-1;i++)if(n<bounds[i+1])return bounds[i]+'–'+(bounds[i+1]-1);return 'أكثر من 10000000';}
function intelGate(own,enemy,powerOwn,powerEnemy){return own.survived>0&&own.population>=100&&own.survivingPopulation>=Math.max(20,Math.ceil(own.population*.1))&&enemy.population>0&&own.population*10>=enemy.population&&powerOwn*10>=powerEnemy&&enemy.total>0&&enemy.lost*10>=enemy.total;}
export function simulate(input,generatedAt=new Date().toISOString()){
 const s=normalize(input),f=fortification(s);let ag=0n,ac=0n,di=0n,dc=0n;
 for(const u of UNITS){let x=s.attacker[u.id];const v=BigInt(x.count)*BigInt(u.attack)*BigInt(100+forgeBonus(x.forge));if(u.group==='cavalry')ac+=v;else ag+=v;x=s.defender[u.id];const n=BigInt(x.count)*BigInt(100+forgeBonus(x.forge));di+=n*BigInt(u.def);dc+=n*BigInt(u.cavDef);}
 const aa=ag+ac,a=aa*aa*f.d,d=(di*ag+dc*ac)*(f.d+f.n),den=100n*aa*f.d;
 const winner=a>d?'attacker':a<d?'defender':'tie';const na=IDS.reduce((n,id)=>n+s.attacker[id].count,0),nd=IDS.reduce((n,id)=>n+s.defender[id].count,0);
 const aLost=winner==='attacker'?lossBudget(na,d,a):na,dLost=winner==='defender'?lossBudget(nd,a,d):nd;
 const allocA=allocate(s.attacker,aLost),allocD=allocate(s.defender,dLost),fort=Number(f.n)/Number(f.d);
 const hospitalA=resolveHospital(unitRows(s.attacker,allocA),s.hospitals.attacker),hospitalD=resolveHospital(unitRows(s.defender,allocD,fort),s.hospitals.defender);
 const rowsA=hospitalA.rows,rowsD=hospitalD.rows,sumA=summary(rowsA),sumD=summary(rowsD);
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
 const economy={source:'proposal',attacker:armyEconomy(rowsA,s.training.attacker,s.hospitals.attacker.level),defender:armyEconomy(rowsD,s.training.defender,s.hospitals.defender.level)};
 return freeze({version:VERSION,policyVersion:POLICY_VERSION,generatedAt,winner,scenario:s,rows:{attacker:rowsA,defender:rowsD},summary:{attacker:sumA,defender:sumD},hospital:{status:'simulated',woundPercent:WOUND_PERCENT,attacker:hospitalA.hospital,defender:hospitalD.hospital},economy,power:{attacker:attackPower,defender:defensePower,baseDefense,cavalryPercent:Number(ac)*100/Number(aa),ratio:defensePower?attackPower/defensePower:null},wall,loot,exposure:{attacker:intelGate(sumA,sumD,attackPower,defensePower),defender:intelGate(sumD,sumA,defensePower,attackPower)},exact:{attackNumerator:a.toString(),defenseNumerator:d.toString(),denominator:den.toString()}});
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
 const hospital={status:'simulated',woundPercent:WOUND_PERCENT,attacker:full||view==='attacker'?clone(r.hospital.attacker):null,defender:full||view==='defender'?clone(r.hospital.defender):null};
 const economy={source:'proposal',attacker:full||view==='attacker'?clone(r.economy.attacker):null,defender:full||view==='defender'?clone(r.economy.defender):null};
 return freeze({schema:'GK_REPORT_3',ruleVersion:r.version,policyVersion:r.policyVersion,generatedAt:r.generatedAt,view,policy:r.scenario.policy,winner:r.winner,sides,power:full?clone(r.power):null,wall,loot,estimate,hospital,economy,notice:full?'تحليل مدخلات معروفة؛ ليس تقرير لاعب':'معلومات الخصم محجوبة. لا سهام مقارنة ولا أعداد قتل ولا قوة مشتقة للخصم.',verification:'SIMULATOR_ONLY_NOT_SERVER_SIGNED'});
}
// Shared reports are unsigned historical documents, never trusted permissions.
// Only allowlisted typed fields survive this boundary; no current enemy state is
// fetched and neither old reports nor costs are recalculated under new rules.
function record(v,label){if(!v||typeof v!=='object'||Array.isArray(v))fail(label+' غير صالح');return v;}
function reportNumber(v,label,{nullable=false,integerOnly=false,max=Number.MAX_SAFE_INTEGER}={}){
 if(nullable&&v===null)return null;
 if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max||(integerOnly&&!Number.isSafeInteger(v)))fail(label+' غير صالح');
 return v;
}
function numberFields(v,keys,label,options={}){record(v,label);return Object.fromEntries(keys.map(k=>[k,reportNumber(v[k],label+' '+k,options)]));}
function reportResources(v,label,nullable=false){if(nullable&&v===null)return null;return numberFields(v,RESOURCES,label,{integerOnly:true,max:1000000000000});}
function sharedRows(value,legacy,side,full){
 if(!Array.isArray(value)||value.length!==IDS.length||new Set(value.map(x=>x?.id)).size!==IDS.length||value.some(x=>!Object.hasOwn(MAP,x?.id)))fail('تفاصيل القوات ناقصة أو مكررة');
 return IDS.map(id=>{const x=value.find(x=>x.id===id),r={id,...numberFields(x,['count','lost','survived'],'أعداد القوات',{integerOnly:true,max:1000000})};
  r.forge=integer(x.forge,1,30,'الحداد في التقرير');for(const k of ['forgePercent','baseAttack','baseDefense','baseCavalryDefense','attack','defense','cavalryDefense'])r[k]=reportNumber(x[k],k,{max:1000000000});r.carry=reportNumber(x.carry,'الحمولة',{nullable:true,integerOnly:true,max:10000});
  if(r.count!==r.lost+r.survived)fail('أعداد القوات في التقرير غير متسقة');
  for(const k of ['fortifiedDefense','fortifiedCavalryDefense','combinedDefensePercent']){if(full||side==='attacker'){if(x[k]!==undefined)r[k]=reportNumber(x[k],k,{max:1000000000});}}
  for(const k of ['woundEligible','wounded','overflow','dead','destroyed'])r[k]=legacy?null:reportNumber(x[k],k,{integerOnly:true,max:1000000});
  if(!legacy){if(r.lost!==r.wounded+r.dead+r.destroyed||r.woundEligible!==r.wounded+r.overflow)fail('خسائر القوات في التقرير غير متسقة');if(MAP[id].group==='siege'?(r.wounded!==0||r.dead!==0||r.destroyed!==r.lost):(r.destroyed!==0))fail('تمييز الجنود وآلات الحصار غير صالح');}
  return r;
 });
}
function sharedSummary(value,rows,legacy){
 const r=numberFields(value,['total','lost','survived','population','survivingPopulation'],'ملخص القوات',{integerOnly:true,max:100000000});
 for(const [sumKey,rowKey]of [['total','count'],['lost','lost'],['survived','survived']])if(r[sumKey]!==rows.reduce((n,x)=>n+x[rowKey],0))fail('ملخص القوات لا يطابق الصفوف');
 for(const k of ['dead','wounded','destroyed','woundEligible','overflow','humanLost'])r[k]=legacy?null:reportNumber(value[k],k,{integerOnly:true,max:100000000});
 if(!legacy){for(const k of ['dead','wounded','destroyed','woundEligible','overflow'])if(r[k]!==rows.reduce((n,x)=>n+x[k],0))fail('ملخص الخسائر لا يطابق الصفوف');if(r.humanLost!==r.dead+r.wounded)fail('الخسائر البشرية غير متسقة');}
 return r;
}
function sharedHospital(v,summaryValue){
 record(v,'المستشفى');const r={level:integer(v.level,0,30,'مستوى المستشفى'),...numberFields(v,['capacity','occupiedBefore','freeBefore','humanLost','eligible','admitted','overflow','occupiedAfter','woundPercent'],'المستشفى',{integerOnly:true,max:10000000})};
 if(r.capacity>500000||r.woundPercent>100||r.occupiedBefore+r.freeBefore!==r.capacity||r.occupiedAfter!==r.occupiedBefore+r.admitted||r.occupiedAfter>r.capacity||r.eligible!==r.admitted+r.overflow||r.admitted!==summaryValue.wounded||r.overflow!==summaryValue.overflow||r.humanLost!==summaryValue.humanLost||r.eligible!==summaryValue.woundEligible)fail('أعداد المستشفى غير متسقة');
 // Existing version-3 snapshots used serial healing. Preserve their prices and
 // times rather than inferring the current throughput from a historic level.
 r.parallelThroughput=v.parallelThroughput===undefined?1:reportNumber(v.parallelThroughput,'قدرة العلاج المتوازي',{max:200});
 if(r.level>0&&r.parallelThroughput===0)fail('قدرة العلاج المتوازي غير صالحة');
 return r;
}
function sharedQuote(v,expectedId,expectedCount,expectedForge,kind){
 record(v,'تكلفة التدريب');if(v.unitId!==expectedId||v.kind!==kind||v.count!==expectedCount||v.forge!==expectedForge)fail('تكلفة الوحدة لا تطابق التقرير');
 const r={source:'proposal',kind,unitId:expectedId,count:integer(v.count,0,1000000,'عدد التكلفة'),forge:integer(v.forge,1,30,'حداد التكلفة'),buildingLevel:integer(v.buildingLevel,1,30,'مبنى التكلفة'),building:kind==='healing'?'hospital':ECONOMY[expectedId].building,category:ECONOMY[expectedId].category,unitResources:reportResources(v.unitResources,'موارد الوحدة'),resources:reportResources(v.resources,'الموارد')};
 for(const k of ['resourceTotal','baseSeconds','seconds','normalGold','gold','goldBeforeDiscount','goldSaved','nextMarginalDiscountPercent','workPercent'])r[k]=reportNumber(v[k],k,{integerOnly:true,max:1000000000000});
 for(const k of ['resourceFactor','effortFactor','speedFactor','speedPercent','unitSeconds','averageGold','effectiveDiscountPercent','theoreticalDiscountPercent','undiscountedGold','discountedGold'])r[k]=reportNumber(v[k],k,{max:1000000000000});
 for(const k of RESOURCES)if(r.resources[k]!==r.unitResources[k]*r.count)fail('تكلفة موارد الوحدة غير متسقة');
 if(r.resourceTotal!==resourceSum(r.resources)||r.goldSaved!==r.goldBeforeDiscount-r.gold||r.normalGold!==0||r.nextMarginalDiscountPercent>20||r.theoreticalDiscountPercent>20.0000001||r.effectiveDiscountPercent>20.0000001)fail('ملخص التكلفة غير متسق');
 if(!Array.isArray(v.tiers)||v.tiers.length>GOLD_TIERS.length)fail('شرائح الذهب غير صالحة');
 r.tiers=v.tiers.map(x=>numberFields(x,['from','to','discountPercent','count'],'شريحة الذهب',{integerOnly:true,max:1000000}));if(r.tiers.reduce((n,x)=>n+x.count,0)!==r.count||r.tiers.some(x=>x.from<1||x.to<x.from||x.discountPercent>20))fail('شرائح العدد غير متسقة');
 if(kind==='healing'){r.hospitalLevel=integer(v.hospitalLevel,1,30,'مستشفى العلاج');r.resourcePercent=integer(v.resourcePercent,0,100,'نسبة موارد العلاج');r.parallelThroughput=v.parallelThroughput===undefined?1:reportNumber(v.parallelThroughput,'قدرة العلاج المتوازي',{max:200});if(r.parallelThroughput===0)fail('قدرة العلاج المتوازي غير صالحة');r.baseSerialSeconds=v.baseSerialSeconds===undefined?r.seconds:reportNumber(v.baseSerialSeconds,'زمن العلاج المتسلسل',{integerOnly:true,max:1000000000000});}
 return r;
}
function sharedQuoteCollection(v,rows,kind,countKey){
 if(!Array.isArray(v)||v.length!==rows.length||new Set(v.map(x=>x?.unitId)).size!==rows.length)fail('قائمة تكاليف التقرير ناقصة');
 return rows.map(r=>sharedQuote(v.find(q=>q?.unitId===r.id),r.id,countKey==='replacement'?r.dead+r.destroyed:r[countKey],r.forge,kind));
}
function sharedEconomy(v,rows){
 record(v,'اقتصاد التقرير');const training=sharedQuoteCollection(v.training,rows,'training','count'),replacementQuotes=sharedQuoteCollection(v.replacement?.quotes,rows,'training','replacement'),humanRows=rows.filter(r=>MAP[r.id].group!=='siege'),healingQuotes=sharedQuoteCollection(v.healing?.quotes,humanRows,'healing','wounded');
 // Aggregate only the preserved snapshot's validated quotes, not live prices.
 const all=combineQuotes(training),replacement=combineQuotes(replacementQuotes),healing=combineQuotes(healingQuotes,true);
 return {source:'proposal',training,resourceTotal:all.resourceTotal,resourceSum:all.resourceSum,goldTotal:all.goldTotal,queues:all.queues,completionSeconds:all.completionSeconds,count:all.count,replacement,healing};
}
function sharedLoot(v,view){
 record(v,'الغنائم');if(!['missing','calculated'].includes(v.status))fail('حالة الغنائم غير صالحة');const r={status:v.status};
 const numeric=view==='defender'?['total']:['before','after','occupied','discardedOccupied','free','total','utilization','survivingCapacityPercent','bonusPercent'];
 for(const k of numeric)r[k]=reportNumber(v[k],k,{nullable:true,max:1000000000000});
 r.amounts=reportResources(v.amounts,'المنهوب',true);
 if(view!=='defender')r.source=['example','custom','missing'].includes(v.source)?v.source:'missing';
 if(view!=='attacker'){for(const k of ['stock','protected'])r[k]=reportResources(v[k],'رصيد الموارد');r.stockAfter=reportResources(v.stockAfter,'الرصيد بعد القتال',true);}
 if(view==='analyst'){r.available=reportResources(v.available,'المتاح');r.availableTotal=reportNumber(v.availableTotal,'المتاح الكلي',{integerOnly:true});if(!Array.isArray(v.missing)||v.missing.some(x=>!IDS.includes(x)))fail('الوحدات ناقصة الحمولة غير صالحة');r.missing=[...v.missing];}
 if(r.total!==null&&r.amounts&&r.total!==resourceSum(r.amounts))fail('الموارد المنهوبة غير متسقة');
 return r;
}
function sharedWall(v,view){
 if(view==='attacker')return null;record(v,'السور');
 const keys=['level','max','hp','nominalPercent','availablePercent','direct','firePotential','fireMinutes','hpAfter','hpAfterFire'];
 if(view==='analyst')keys.push('intactPercent','appliedPercent','suppressionPercent','directRaw','prevented','directCap','hourCap','usedDirect','usedHour');
 const r=numberFields(v,keys,'السور',{max:1000000000});if(r.level>30||r.max>30000||r.hp>r.max||r.hpAfter>r.hp||r.hpAfterFire>r.hpAfter)fail('حالة السور غير صالحة');if(view==='analyst'){if(typeof v.experimentalSiege!=='boolean')fail('إعداد الحصار غير صالح');r.experimentalSiege=v.experimentalSiege;}return r;
}
export function readSharedReport(v){
 record(v,'التقرير');const legacy=v.schema==='GK_REPORT_2';if(!legacy&&v.schema!=='GK_REPORT_3')fail('إصدار التقرير غير صالح');if(!['analyst','attacker','defender'].includes(v.view)||!['attacker','defender','tie'].includes(v.winner)||!['strict','limited'].includes(v.policy))fail('منظور التقرير أو سياسته غير صالح');
 if(typeof v.generatedAt!=='string'||v.generatedAt.length>64||!Number.isFinite(Date.parse(v.generatedAt)))fail('تاريخ التقرير غير صالح');
 const full=v.view==='analyst',sides={};record(v.sides,'أطراف التقرير');
 for(const side of ['attacker','defender']){const x=record(v.sides[side],'طرف التقرير'),visible=full||v.view===side,rows=visible?sharedRows(x.rows,legacy,side,full):null;sides[side]={name:str(x.name,side==='attacker'?'المهاجم':'المدافع'),visible,rows,summary:visible?sharedSummary(x.summary,rows,legacy):null};}
 let power=null;if(full){power=numberFields(v.power,['attacker','defender','baseDefense','cavalryPercent'],'القوة',{max:1000000000000});power.ratio=reportNumber(v.power.ratio,'نسبة القوة',{nullable:true,max:1000000000000});}
 let estimate=null;if(!full&&v.policy==='limited'&&v.estimate){const band=v.estimate.initialTroopBand;const allowed=[1,10,50,200,1000,5000,20000,50000,200000,1000000,10000000].slice(0,-1).map((n,i)=>n+'–'+([1,10,50,200,1000,5000,20000,50000,200000,1000000,10000000][i+1]-1));allowed.push('أكثر من 10000000');if(!allowed.includes(band))fail('نطاق التقدير غير صالح');estimate={initialTroopBand:band,label:'تقدير واسع لعدد المشاركين وقت المعركة؛ لا يكشف الأنواع أو الحداد أو الناجين'};}
 const hospital=legacy?{status:'coming_soon',capacity:null,wounded:null,dead:null}:{status:'simulated',woundPercent:WOUND_PERCENT,attacker:null,defender:null};const economy=legacy?null:{source:'proposal',attacker:null,defender:null};
 if(!legacy){for(const side of ['attacker','defender'])if(sides[side].visible){hospital[side]=sharedHospital(v.hospital?.[side],sides[side].summary);economy[side]=sharedEconomy(v.economy?.[side],sides[side].rows);}}
 return freeze({schema:v.schema,ruleVersion:typeof v.ruleVersion==='string'?v.ruleVersion.slice(0,80):fail('إصدار قواعد التقرير غير صالح'),policyVersion:typeof v.policyVersion==='string'?v.policyVersion.slice(0,80):fail('إصدار سياسة التقرير غير صالح'),generatedAt:v.generatedAt,view:v.view,policy:v.policy,winner:v.winner,sides,power,wall:sharedWall(v.wall,v.view),loot:sharedLoot(v.loot,v.view),estimate,hospital,economy,notice:legacy?'تقرير قديم محفوظ: الجرحى والعلاج غير محسوبين، ولم نعد حسابه بقواعد جديدة.':'تقرير محاكاة مشترك؛ ليس صادرًا أو موقعًا من خادم اللعبة.',verification:'SIMULATOR_ONLY_NOT_SERVER_SIGNED'});
}
export function encodePayload(value){const bytes=new TextEncoder().encode(JSON.stringify(value));let s='';for(const x of bytes)s+=String.fromCharCode(x);return btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
export function decodePayload(text){if(typeof text!=='string'||text.length>150000||!/^[A-Za-z0-9_-]+$/.test(text))fail('رابط غير صالح أو طويل جدًا');const b=atob(text.replaceAll('-','+').replaceAll('_','/'));const v=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(b,c=>c.charCodeAt(0))));return v;}
export function example(kind='forge'){
 const s={schema:VERSION,attackerName:'جيشك',defenderName:'الخصم',attacker:blankArmy(5),defender:blankArmy(15),wall:{level:10,hp:10000,siege:true,usedDirect:0,usedHour:0},loot:{stock:{wheat:80000,wood:60000,clay:25000,iron:15000},protected:{wheat:10000,wood:10000,clay:5000,iron:5000},bonusPercent:0,occupied:0,carrySource:'example'},hospitals:{attacker:{level:10,occupied:0},defender:{level:10,occupied:0}},training:{attacker:{barracks:1,stable:1,workshop:1},defender:{barracks:1,stable:1,workshop:1}},policy:'strict'};
 const demo=[60,30,40,80,60,50,50,0,0];IDS.forEach((id,i)=>{s.attacker[id].carry=demo[i];s.defender[id].carry=demo[i];});
 s.attacker.LightInfantry.count=1000;s.attacker.SpearInfantry.count=1800;s.attacker.LightCavalry.count=350;s.attacker.BatteringRam.count=80;s.attacker.FireCatapult.count=20;
 s.defender.LightInfantry.count=1200;s.defender.Archer.count=400;s.defender.HeavyCavalry.count=100;
 if(kind==='probe'||kind==='small'){for(const id of IDS){s.attacker[id].count=0;s.defender[id].count=0;}s.attacker.LightInfantry.count=kind==='probe'?1:2000;s.defender.LightInfantry.count=50000;s.wall.level=30;s.wall.hp=30000;}
 if(kind==='loot'){for(const id of IDS){s.attacker[id].count=0;s.defender[id].count=0;}s.attacker.LightCavalry.count=400;s.defender.SpearInfantry.count=100;s.wall.level=5;s.wall.hp=5000;}
 if(kind==='siege'){s.attacker.SpearInfantry.count=15000;s.attacker.BatteringRam.count=300;s.attacker.FireCatapult.count=60;s.wall.level=30;s.wall.hp=30000;}
 return s;
}

