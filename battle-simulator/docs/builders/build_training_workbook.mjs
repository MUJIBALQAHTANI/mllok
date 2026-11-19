import fs from 'node:fs/promises';
import {Workbook, SpreadsheetFile} from '@oai/artifact-tool';

const root=process.env.GK_WORKSPACE || '/workspace/scratch/1e72c071ce5d';
const outputDir=`${root}/outputs/revised_training_20261119`;
const data=JSON.parse(await fs.readFile(`${root}/mllok/battle-simulator/docs/training-approved-data.json`,'utf8'));
const engine=await import(`${root}/mllok/battle-simulator/training-engine.mjs`);
const units=data.units;
if(data.version!=='GK_TRAINING_APPROVED_3.0.0')throw Error('Expected revised V3 training data');
if(units.length!==8||units.some(u=>u.id==='ArcherCavalry'))throw Error('Expected approved eight-unit catalog');
const config=engine.BUILDING_CONFIG;
const labels={barracks:'الثكنة',stable:'الإسطبل',workshop:'ورشة العربات'};
const rule=engine.RULES;
await fs.mkdir(outputDir,{recursive:true});
const wb=Workbook.create();
const calc=wb.worksheets.add('المحاكي');
const buildings=wb.worksheets.add('المباني');
const forge=wb.worksheets.add('الحداد');
const prices=wb.worksheets.add('الأسعار');
const source=wb.worksheets.add('القوات');
const C={navy:'#142B3D',blue:'#254B68',gold:'#B48941',pale:'#F3F6F8',ink:'#20364A',muted:'#657584',input:'#FFF1CE',line:'#CED9E1',white:'#FFFFFF',attack:'#A84834',defense:'#27769B',cavalry:'#6D568E'};
function val(sh,address,value){sh.getRange(address).values=[[value]];}
function formula(sh,address,value){sh.getRange(address).formulas=[[value]];}
function text(sh,address,value){val(sh,address,value);sh.getRange(address).format.horizontalAlignment='right';}
function base(sh,lastCol,lastRow){
 sh.showGridLines=false;sh.tabColor=sh===calc?C.navy:sh===source?C.gold:C.blue;
 const r=sh.getRange(`A1:${lastCol}${lastRow}`);r.format.font={name:'Arial',size:11,color:C.ink};r.format.rowHeight=23;r.format.verticalAlignment='center';r.format.columnWidth=15;
 sh.getRange(`A1:${lastCol}1`).format.rowHeight=10;
}
function title(sh,textValue,lastCol){sh.getRange(`A2:${lastCol}2`).merge();text(sh,'A2',textValue);sh.getRange('A2').format.font={bold:true,size:16,color:C.navy};sh.getRange(`A3:${lastCol}3`).format.borders={bottom:{style:'thin',color:C.gold}};sh.getRange(`A2:${lastCol}2`).format.rowHeight=32;}
function header(sh,row,values){sh.getRangeByIndexes(row-1,0,1,values.length).values=[values];const r=sh.getRangeByIndexes(row-1,0,1,values.length);r.format={fill:C.navy,font:{name:'Arial',size:11,bold:true,color:C.white},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,rowHeight:42};r.format.borders={insideVertical:{style:'thin',color:C.white}};}
function rows(sh,start,end,lastCol){sh.getRange(`A${start}:${lastCol}${end}`).format.rowHeight=25;for(let r=start;r<=end;r++){if((r-start)%2===0)sh.getRange(`A${r}:${lastCol}${r}`).format.fill=C.pale;}sh.getRange(`A${end}:${lastCol}${end}`).format.borders={bottom:{style:'thin',color:C.line}};}
function input(sh,address){sh.getRange(address).format.fill=C.input;sh.getRange(address).format.font={color:C.ink,bold:true};}
function whole(sh,address,min,max){sh.getRange(address).dataValidation={rule:{type:'whole',operator:'between',formula1:min,formula2:max}};}
function nfmt(sh,address,fmt='#,##0'){sh.getRange(address).setNumberFormat(fmt);sh.getRange(address).format.horizontalAlignment='right';}
function ref(column,row){return `'القوات'!$${column}$${row}`;}
function getBase(u){const r=u.baseResources;if(!r)throw Error(`Missing resources ${u.id}`);return r;}
function ceilFraction(numerator,denominator){return `QUOTIENT(${numerator},${denominator})+IF(MOD(${numerator},${denominator})>0,1,0)`;}
const reductionNumerator="'القوات'!$B$42", reductionDenominator="'القوات'!$B$43";
const curveDenominator="'القوات'!$G$39";
function remainingNumerator(level){return `(${curveDenominator}-'القوات'!$G$40*(${level}-1)-'القوات'!$G$41*(${level}-1)^2)`;}
function durationFraction(referenceSeconds,count,forgeLevel,buildingNumerator){return {n:`(${referenceSeconds})*${reductionNumerator}*(${count})*(100+100*'القوات'!$B$33*(${forgeLevel}))*(${buildingNumerator})`,d:`${reductionDenominator}*100*${curveDenominator}`};}

// One source table for combat and time, one for resources and unlocks.
base(source,'N',57);title(source,'القوات والقواعد — الإصدار ٣','N');
source.getRange('A1:A56').format.columnWidth=25;source.getRange('B1:B56').format.columnWidth=22;source.getRange('C1:D56').format.columnWidth=20;source.getRange('E1:J56').format.columnWidth=16;
source.getRange('K1:N57').format.columnWidth=17;
header(source,5,['رقم','الوحدة','المبنى','التصنيف','الهجوم','دفاع المشاة','دفاع الفرسان','الثواني بعد خصم ٧٠٪','السرعة الثابتة','الحمولة الثابتة','ثواني مرجع V2']);
const statRows=units.map((u,i)=>[i+1,u.name,labels[u.building],u.category,u.attack,u.def,u.cavDef,u.baseSeconds,u.movementSpeed,u.cargo]);
source.getRange('A6:J13').values=statRows;units.forEach((u,i)=>{val(source,`K${i+6}`,u.referenceBaseSeconds);formula(source,`H${i+6}`,`=K${i+6}*$B$42/$B$43`);});rows(source,6,13,'K');nfmt(source,'E6:H13','0.0');nfmt(source,'I6:K13');source.getRange('B6:D13').format.horizontalAlignment='right';
source.getRange('A16:N16').merge();text(source,'A16','موارد الأساس الدقيقة بعد تخفيض ٧٠٪؛ تُقرّب تكلفة الوحدة مرة واحدة بعد تطبيق الحداد.');source.getRange('A16:N16').format.font={size:11,bold:true,color:C.muted};
header(source,18,['الوحدة','قمح دقيق','خشب دقيق','طين عند ٥','حديد عند ١٠','مبنى الإتاحة','مستوى الإتاحة','سعة دفعة الأساس','مصدر المرجع','حالة الأسعار','قمح مرجع V2','خشب مرجع V2','طين مرجع V2','حديد مرجع V2']);
source.getRange('A19:J26').values=units.map(u=>{const b=getBase(u);return[u.name,b.wheat,b.wood,b.clay,b.iron,u.unlock?.name??'بداية اللعبة',u.unlock?.level??1,config[u.building].baseCapacity,u.building==='workshop'?'القوة سابقة؛ الوقت مقترح':'صور المستخدم',u.building==='workshop'?'مقترح موازنة':'قرار المستخدم'];});
units.forEach((u,i)=>{const r=i+19;source.getRange(`K${r}:N${r}`).values=[[u.referenceBaseResources.wheat,u.referenceBaseResources.wood,u.referenceBaseResources.clay,u.referenceBaseResources.iron]];for(const[col,refcol]of[['B','K'],['C','L'],['D','M'],['E','N']])formula(source,`${col}${r}`,`=${refcol}${r}*$B$42/$B$43`);val(source,`J${r}`,u.building==='workshop'?'مرجع مقترح ×٣٠٪':'قرار المستخدم ×٣٠٪');});
rows(source,19,26,'N');nfmt(source,'B19:E26','#,##0.0');nfmt(source,'G19:H26');nfmt(source,'K19:N26');source.getRange('I19:J26').format.wrapText=true;source.getRange('A19:N26').format.rowHeight=42;
source.getRange('E19:H26').format.horizontalAlignment='center';source.getRange('F1:F56').format.columnWidth=20;source.getRange('F19:F26').format.borders={left:{style:'thin',color:C.line}};
header(source,30,['المعامل','القيمة','المعنى']);
const rules=[
 ['زيادة القوة لكل حداد',rule.forgePowerPerLevel,'من الأساس غير المطور ٠'],
 ['زيادة الموارد لكل حداد',rule.forgeResourcePerLevel,'مقترح سابق مستمر'],
 ['زيادة جهد التدريب للحداد',rule.forgeEffortPerLevel,'مقترح سابق مستمر'],
 ['نمو سعة الدفعة',1.25,'أساس ٣٠٠ / ١٥٠ / ٧٥؛ حسب المبنى'],
 ['سقف تخفيض الوقت',rule.maxTimeReduction,'قرار المستخدم للمستوى ٣٠'],
 ['حصة المنحنى الخطية',rule.timeCurveLinearShare,'توزيع مقترح للتخفيض'],
 ['حصة المنحنى التربيعية',rule.timeCurveQuadraticShare,'يزداد أثر المستويات العليا'],
 ['ثواني العمل لكل ذهب',rule.secondsPerGold,'مقترح يحفظ الأساسي = ١ ذهب'],
 ['بداية الطين',5,'مستوى مبنى التدريب'],
 ['بداية الحديد',10,'مستوى مبنى التدريب'],
 ['أقصى مستوى للمبنى',rule.maxBuildingLevel,'أقصى مستوى للحداد أيضًا'],
 ['بسط الأساس الجديد',3,'بقاء ٣٠٪ بعد تخفيض ٧٠٪'],
 ['مقام الأساس الجديد',10,'يطبق على الموارد والوقت فقط'],
];
source.getRange('A31:C43').values=rules;rows(source,31,43,'C');source.getRange('A31:C43').format.wrapText=true;source.getRange('A31:C43').format.rowHeight=36;nfmt(source,'B31:B33','0%');nfmt(source,'B35:B37','0%');nfmt(source,'B34','0.00');nfmt(source,'B38:B43');
source.getRange('E30:G30').values=[['من الوحدة','إلى الوحدة','الخصم الهامشي']];source.getRange('E30:G30').format={fill:C.navy,font:{bold:true,color:C.white},horizontalAlignment:'center',rowHeight:42,wrapText:true};
source.getRange('E31:G36').values=[[1,100,0],[101,1000,.02],[1001,5000,.05],[5001,10000,.10],[10001,50000,.15],[50001,1000000,.20]];nfmt(source,'E31:F36');nfmt(source,'G31:G36','0%');
const notes=[['المصدر','الشرح'],['المشاة','IMG_2651(1).jpeg: القوة ووقت التدريب'],['الفرسان','IMG_2653.jpeg: مطابقة الأسماء حسب طلب المستخدم'],['الحداد','IMG_2655.jpeg و IMG_2656.jpeg: المستوى ١ يعطي ٥٪'],['الموارد','طلب المستخدم في ١٩ نوفمبر ٢٠٢٦: الرقم لكل مورد منفرد'],['تعارض الحديد','لفارس الجمل: لا حديد قبل مبنى ١٠ وفق القاعدة العامة'],['فتح الورشة','المستوى ١٠ محسوب للقلعة كتفسير للسياق'],['إتاحة الفرسان','قصر الأبطال ٣ و٧ و١٠ مستقل عن عصر الموارد'],['الصحة والصيانة','الصحة وصيانة القمح وسعة السكان في صور الوحدات مستبعدة'],['حدود التطبيق','جداول المحاكي؛ لا تغيّر الخادم أو أرصدة اللاعبين']];
source.getRange('A44:B53').values=notes;source.getRange('A44:B44').format={fill:C.navy,font:{bold:true,color:C.white}};source.getRange('B45:D53').merge(true);for(let i=1;i<notes.length;i++)val(source,`B${44+i}`,notes[i][1]);source.getRange('B45:D53').format.wrapText=true;source.getRange('A45:D53').format.rowHeight=36;
text(source,'E38','معاملات الكسر الدقيق');text(source,'E39','مقام منحنى الوقت');formula(source,'G39','=25*(B41-1)^2');text(source,'E40','المعامل الخطي');formula(source,'G40','=ROUND(B35*B36*25*(B41-1),0)');text(source,'E41','المعامل التربيعي');formula(source,'G41','=ROUND(B35*B37*25,0)');
source.getRange('A55:D56').merge();text(source,'A55','التصحيح: موارد ووقت أقل ٧٠٪. المبنى ٣٠ يخفض ٨٠٪ من الزمن الجديد؛ يبقى ٦٪ من مرجع V2 عند ثبات الحداد. سعات الدفعات من صور IMG_2657–IMG_2665.');source.getRange('A55:D56').format.wrapText=true;source.freezePanes.freezeRows(5);

// Main calculator. Inputs are isolated and amber; output sections remain compact.
base(calc,'E',53);title(calc,'محاكي التدريب — الإصدار ٣','E');calc.getRange('A1:A53').format.columnWidth=33;calc.getRange('B1:B53').format.columnWidth=24;calc.getRange('C1:C53').format.columnWidth=17;calc.getRange('D1:D53').format.columnWidth=31;calc.getRange('E1:E53').format.columnWidth=27;
const mainLabels=[['نوع الجندي','فارس العرب'],['مستوى مبنى التدريب',10],['مستوى حداد الجندي',0],['عدد الوحدات',100],['مستوى قصر الأبطال',30],['مستوى القلعة',30]];
calc.getRange('A4:B9').values=mainLabels;input(calc,'B4:B9');calc.getRange('B4').dataValidation={rule:{type:'list',formula1:"'القوات'!$B$6:$B$13"}};whole(calc,'B5',1,30);whole(calc,'B6',0,30);whole(calc,'B7',1,1000000);whole(calc,'B8:B9',1,30);
calc.getRange('A10:C10').merge();text(calc,'A10','الخلايا الذهبية قابلة للتعديل. حداد ٠ = غير مطور.');calc.getRange('A10:C10').format.font={size:10,color:C.muted};
text(calc,'D4','مبنى التدريب');formula(calc,'E4',"=INDEX('القوات'!$C$6:$C$13,$E$25)");
text(calc,'D5','الإتاحة');formula(calc,'E5','=IF(E27="قصر الأبطال",IF(B8>=E28,"متاح","مغلق: عرض تكلفة افتراضي"),IF(E27="القلعة",IF(B9>=E28,"متاح","مغلق: عرض تكلفة افتراضي"),"متاح"))');calc.getRange('E5').format.wrapText=true;calc.getRange('D5:E5').format.rowHeight=38;
const calculatorTime=durationFraction("INDEX('القوات'!$K$6:$K$13,$E$25)",1,'$B$6','$E$31');
text(calc,'D6','وقت الجندي الواحد');formula(calc,'E6',`=(${ceilFraction(calculatorTime.n,calculatorTime.d)})/86400`);nfmt(calc,'E6','[h]:mm:ss');
text(calc,'D7','وقت الكمية كاملة');formula(calc,'E7','=(D34*C34+D35*C35)/86400');nfmt(calc,'E7','[h]:mm:ss');
text(calc,'D8','ذهب إنهاء الكمية');formula(calc,'E8','=E34*C34+E35*C35');nfmt(calc,'E8');
text(calc,'D9','متوسط الذهب للوحدة');formula(calc,'E9','=E8/B7');nfmt(calc,'E9','0.00');calc.getRange('D6:E9').format.fill=C.pale;calc.getRange('E6:E9').format.font={bold:true,size:14,color:C.navy};
calc.getRange('D10:E11').merge();text(calc,'D10','الأساس الجديد أقل ٧٠٪. عند المبنى ٣٠ يبقى ٦٪ من زمن مرجع V2 عند ثبات الحداد.');calc.getRange('D10:E11').format.wrapText=true;calc.getRange('D10:E11').format.font={size:10,color:C.muted};
header(calc,12,['القوة','للجندي الواحد','للمجموعة']);
for(const [r,label,col] of [[13,'الهجوم','E'],[14,'الدفاع ضد المشاة','F'],[15,'الدفاع ضد الفرسان','G']]){text(calc,`A${r}`,label);formula(calc,`B${r}`,`=INDEX('القوات'!$${col}$6:$${col}$13,$E$25)*(1+'القوات'!$B$31*$B$6)`);formula(calc,`C${r}`,`=B${r}*$B$7`);}
text(calc,'A16','سرعة الحركة الثابتة');formula(calc,'B16',"=INDEX('القوات'!$I$6:$I$13,$E$25)");text(calc,'C16','لا يغيرها الحداد');text(calc,'A17','حمولة الوحدة الثابتة');formula(calc,'B17',"=INDEX('القوات'!$J$6:$J$13,$E$25)");formula(calc,'C17','=B17*$B$7');rows(calc,13,17,'C');nfmt(calc,'B13:C15','#,##0.000');nfmt(calc,'B16:B17');nfmt(calc,'C17');calc.getRange('B13:C13').format.font={bold:true,color:C.attack};calc.getRange('B14:C14').format.font={bold:true,color:C.defense};calc.getRange('B15:C15').format.font={bold:true,color:C.cavalry};
const tLabels={12:'الأساس الجديد بالثواني',13:'معامل جهد الحداد',14:'تخفيض وقت المبنى',15:'المتبقي من الأساس الجديد',16:'الثواني قبل التقريب',17:'ذهب التدريب بالانتظار'};for(const[r,l]of Object.entries(tLabels))text(calc,`D${r}`,l);
formula(calc,'E12',"=INDEX('القوات'!$H$6:$H$13,$E$25)");formula(calc,'E13',"=1+'القوات'!$B$33*$B$6");formula(calc,'E14',"='القوات'!$B$35*('القوات'!$B$36*(B5-1)/('القوات'!$B$41-1)+'القوات'!$B$37*((B5-1)/('القوات'!$B$41-1))^2)");formula(calc,'E15',"=E31/'القوات'!$G$39");formula(calc,'E16',`=${calculatorTime.n}/(${calculatorTime.d})`);val(calc,'E17',0);nfmt(calc,'E12:E13','0.00');nfmt(calc,'E14:E15','0.00%');nfmt(calc,'E16','0.000000');
header(calc,19,['الموارد','للجندي الواحد','للكمية']);
for(const[r,label,col,gate]of[[20,'قمح','K',null],[21,'خشب','L',null],[22,'طين','M',39],[23,'حديد','N',40]]){text(calc,`A${r}`,label);const p=ceilFraction(`INDEX('القوات'!$${col}$19:$${col}$26,$E$25)*${reductionNumerator}*(100+100*'القوات'!$B$32*$B$6)`,`${reductionDenominator}*100`);formula(calc,`B${r}`,gate?`=IF($B$5>='القوات'!$B$${gate},${p},0)`:`=${p}`);formula(calc,`C${r}`,`=B${r}*$B$7`);}
text(calc,'A24','إجمالي عدد الموارد');formula(calc,'B24','=SUM(B20:B23)');formula(calc,'C24','=SUM(C20:C23)');rows(calc,20,24,'C');nfmt(calc,'B20:C24');calc.getRange('A24:C24').format.font={bold:true};
text(calc,'D20','عصر الموارد');formula(calc,'E20','=IF(B5<5,"قمح وخشب",IF(B5<10,"قمح وخشب وطين","الموارد الأربعة"))');text(calc,'D21','تكلفة القمح والخشب');text(calc,'E21','لكل مورد منفرد');text(calc,'D22','إنهاء التدريب بالذهب');text(calc,'E22','الموارد تبقى مطلوبة');text(calc,'D23','حالة النموذج');text(calc,'E23','محاكاة دون خصم فعلي');
text(calc,'D24','تخفيض الوقت مقابل مرجع V2');formula(calc,'E24',`=1-${reductionNumerator}/${reductionDenominator}*E15`);nfmt(calc,'E24','0.00%');
text(calc,'D25','صف الوحدة في المصدر');formula(calc,'E25',"=MATCH(B4,'القوات'!$B$6:$B$13,0)");text(calc,'D26','شرط فتح الوحدة');formula(calc,'E26','=E27&" "&E28');text(calc,'D27','مبنى الإتاحة');formula(calc,'E27',"=INDEX('القوات'!$F$19:$F$26,$E$25)");text(calc,'D28','مستوى الإتاحة');formula(calc,'E28',"=INDEX('القوات'!$G$19:$G$26,$E$25)");
const referenceSeconds="INDEX('القوات'!$K$6:$K$13,$E$25)", goldGcd=`GCD(${referenceSeconds}*${reductionNumerator},'القوات'!$B$38*${reductionDenominator})`;
text(calc,'D29','بسط الذهب قبل وزن الكمية');formula(calc,'E29',`=${referenceSeconds}*${reductionNumerator}/${goldGcd}*(100+100*'القوات'!$B$33*B6)*E31`);text(calc,'D30','مقام حساب الذهب');formula(calc,'E30',`='القوات'!$B$38*${reductionDenominator}/${goldGcd}*100*'القوات'!$G$39*100`);text(calc,'D31','بسط وقت المبنى المتبقي');formula(calc,'E31',"='القوات'!$G$39-'القوات'!$G$40*(B5-1)-'القوات'!$G$41*(B5-1)^2");
text(calc,'A28','سعة الدفعة');formula(calc,'B28',"=INT(INDEX('القوات'!$H$19:$H$26,$E$25)*'القوات'!$B$34^($B$5-1))");text(calc,'A29','عدد الدفعات الكاملة');formula(calc,'B29','=INT(B7/B28)');text(calc,'A30','وحدات الدفعة الأخيرة');formula(calc,'B30','=MOD(B7,B28)');text(calc,'A31','إجمالي الدفعات');formula(calc,'B31','=B29+IF(B30>0,1,0)');nfmt(calc,'B28:B31');
header(calc,33,['نوع الدفعة','عدد وحداتها','التكرار','الوقت بالثواني','الذهب']);
const fullBatchTime=durationFraction(referenceSeconds,'B34','$B$6','$E$31'),lastBatchTime=durationFraction(referenceSeconds,'B35','$B$6','$E$31');
text(calc,'A34','دفعة كاملة');formula(calc,'B34','=IF(B29>0,B28,0)');formula(calc,'C34','=B29');formula(calc,'D34',`=${ceilFraction(fullBatchTime.n,fullBatchTime.d)}`);formula(calc,'E34','=QUOTIENT($E$29*$D$46,$E$30)+IF(MOD($E$29*$D$46,$E$30)>0,1,0)');
text(calc,'A35','الدفعة الأخيرة');formula(calc,'B35','=B30');formula(calc,'C35','=IF(B30>0,1,0)');formula(calc,'D35',`=${ceilFraction(lastBatchTime.n,lastBatchTime.d)}`);formula(calc,'E35','=QUOTIENT($E$29*$E$46,$E$30)+IF(MOD($E$29*$E$46,$E$30)>0,1,0)');rows(calc,34,35,'E');nfmt(calc,'B34:E35');
calc.getRange('A37:E37').merge();text(calc,'A37','الخصم محسوب داخل كل دفعة فعلية. الوقت يفترض طابورًا فارغًا وتدريبًا متتابعًا.');calc.getRange('A37:E37').format.font={size:10,color:C.muted};
header(calc,39,['من الوحدة','إلى الوحدة','خصم هذه الشريحة','عددها بالدفعة الكاملة','عددها بالدفعة الأخيرة']);
for(let r=40;r<=45;r++){let s=31+r-40;formula(calc,`A${r}`,`='القوات'!E${s}`);formula(calc,`B${r}`,`='القوات'!F${s}`);formula(calc,`C${r}`,`='القوات'!G${s}`);formula(calc,`D${r}`,`=MAX(0,MIN($B$34,B${r})-A${r}+1)`);formula(calc,`E${r}`,`=MAX(0,MIN($B$35,B${r})-A${r}+1)`);}
rows(calc,40,45,'E');nfmt(calc,'A40:B45');nfmt(calc,'C40:C45','0%');nfmt(calc,'D40:E45');text(calc,'A46','وزن الكمية بعد الخصم (من ١٠٠)');formula(calc,'D46','=SUMPRODUCT(D40:D45,100-C40:C45*100)');formula(calc,'E46','=SUMPRODUCT(E40:E45,100-C40:C45*100)');nfmt(calc,'D46:E46','#,##0.00');
text(calc,'A47','ذهب الدفعة قبل الخصم');formula(calc,'D47','=QUOTIENT($E$29*$B$34*100,$E$30)+IF(MOD($E$29*$B$34*100,$E$30)>0,1,0)');formula(calc,'E47','=QUOTIENT($E$29*$B$35*100,$E$30)+IF(MOD($E$29*$B$35*100,$E$30)>0,1,0)');text(calc,'A49','إجمالي الذهب قبل الخصم');formula(calc,'B49','=D47*C34+E47*C35');text(calc,'A50','الذهب الذي تم توفيره');formula(calc,'B50','=B49-E8');text(calc,'A51','الخصم الفعلي بعد التقريب');formula(calc,'B51',"=MAX(0,1-E8/(E16/'القوات'!$B$38*B7))");nfmt(calc,'B49:B50');nfmt(calc,'B51','0.00%');
calc.getRange('A4:A9').format.horizontalAlignment='right';calc.getRange('B4').format.horizontalAlignment='right';calc.getRange('E4:E5').format.horizontalAlignment='right';calc.getRange('A28:A31').format.wrapText=true;calc.freezePanes.freezeRows(3);

// Building schedules: reduction/capacity and every unit's training time.
base(buildings,'J',73);title(buildings,'مستويات المباني','J');buildings.getRange('A1:A73').format.columnWidth=25;buildings.getRange('B1:J73').format.columnWidth=17;
text(buildings,'A4','حداد مقارنة الأوقات');formula(buildings,'B4',"='المحاكي'!B6");text(buildings,'D4','تعديل الحداد من المحاكي');
header(buildings,6,['المستوى','تخفيض المبنى','زيادة التخفيض','المتبقي من الأساس الجديد','تخفيض شامل من مرجع V2']);
buildings.getRange('F6:I6').values=[['المستوى','سعة الثكنة','سعة الإسطبل','سعة الورشة']];buildings.getRange('F6:I6').format={fill:C.navy,font:{bold:true,color:C.white},horizontalAlignment:'center',rowHeight:42,wrapText:true};
for(let level=1;level<=30;level++){const r=level+6;val(buildings,`A${r}`,level);formula(buildings,`B${r}`,`='القوات'!$B$35*('القوات'!$B$36*(A${r}-1)/('القوات'!$B$41-1)+'القوات'!$B$37*((A${r}-1)/('القوات'!$B$41-1))^2)`);formula(buildings,`C${r}`,r===7?`=B${r}`:`=B${r}-B${r-1}`);formula(buildings,`D${r}`,`=${remainingNumerator(`A${r}`)}/${curveDenominator}`);formula(buildings,`E${r}`,`=1-${reductionNumerator}/${reductionDenominator}*D${r}`);formula(buildings,`F${r}`,`=A${r}`);for(const[col,sourceRow]of[['G',19],['H',22],['I',25]])formula(buildings,`${col}${r}`,`=INT('القوات'!$H$${sourceRow}*'القوات'!$B$34^(A${r}-1))`);}
rows(buildings,7,36,'E');nfmt(buildings,'B7:E36','0.00%');nfmt(buildings,'G7:I36');
buildings.getRange('A38:J38').merge();text(buildings,'A38','السعة تحدد وحدات أمر التدريب الواحد. الكمية الأكبر تنقسم إلى دفعات كاملة وأخيرة، ويُحسب التقريب والخصم لكل دفعة.');buildings.getRange('A38:J38').format.wrapText=true;
header(buildings,41,['المستوى','تخفيض المدة',...units.map(u=>u.name)]);
for(let level=1;level<=30;level++){const r=41+level;val(buildings,`A${r}`,level);formula(buildings,`B${r}`,`=B${level+6}`);units.forEach((u,i)=>{const col=String.fromCharCode(67+i),time=durationFraction(`'القوات'!K${6+i}`,1,'$B$4',remainingNumerator(`A${r}`));formula(buildings,`${col}${r}`,`=(${ceilFraction(time.n,time.d)})/86400`);});}
rows(buildings,42,71,'J');nfmt(buildings,'B42:B71','0.00%');nfmt(buildings,'C42:J71','[h]:mm:ss');buildings.freezePanes.freezeRows(6);

// Forge schedule uses the one authoritative unit/building selector above.
base(forge,'M',40);title(forge,'مستويات الحداد','M');forge.getRange('A1:A40').format.columnWidth=24;forge.getRange('B1:M40').format.columnWidth=15;
text(forge,'A4','الجندي المختار');formula(forge,'B4',"='المحاكي'!B4");text(forge,'D4','مستوى المبنى');formula(forge,'E4',"='المحاكي'!B5");text(forge,'G4','تكاليف الجندي الواحد');
header(forge,6,['الحداد','زيادة القوة','الهجوم','دفاع المشاة','دفاع الفرسان','قمح','خشب','طين','حديد','إجمالي الموارد','ثواني التدريب','وقت التدريب','ذهب الإنهاء']);
for(let f=0;f<=30;f++){const r=f+7;val(forge,`A${r}`,f);formula(forge,`B${r}`,`=A${r}*'القوات'!$B$31`);for(const[col,src]of[['C','E'],['D','F'],['E','G']])formula(forge,`${col}${r}`,`=INDEX('القوات'!$${src}$6:$${src}$13,'المحاكي'!$E$25)*(1+B${r})`);for(const[col,src,gate]of[['F','K',null],['G','L',null],['H','M',39],['I','N',40]]){const p=ceilFraction(`INDEX('القوات'!$${src}$19:$${src}$26,'المحاكي'!$E$25)*${reductionNumerator}*(100+100*'القوات'!$B$32*A${r})`,`${reductionDenominator}*100`);formula(forge,`${col}${r}`,gate?`=IF($E$4>='القوات'!$B$${gate},${p},0)`:`=${p}`);}formula(forge,`J${r}`,`=SUM(F${r}:I${r})`);const time=durationFraction("INDEX('القوات'!$K$6:$K$13,'المحاكي'!$E$25)",1,`A${r}`,"'المحاكي'!$E$31");formula(forge,`K${r}`,`=${ceilFraction(time.n,time.d)}`);formula(forge,`L${r}`,`=K${r}/86400`);formula(forge,`M${r}`,`=${ceilFraction(time.n,`${time.d}*'القوات'!$B$38`)}`);}
rows(forge,7,37,'M');nfmt(forge,'B7:B37','0%');nfmt(forge,'C7:E37','#,##0.000');nfmt(forge,'F7:K37');nfmt(forge,'L7:L37','[h]:mm:ss');nfmt(forge,'M7:M37');forge.freezePanes.freezeRows(6);forge.freezePanes.freezeColumns(1);

// All 240 base training prices, with formulas instead of pasted finished totals.
base(prices,'J',247);title(prices,'الأسعار الأساسية','J');prices.getRange('A1:A247').format.columnWidth=25;prices.getRange('B1:J247').format.columnWidth=17;text(prices,'A4','حداد ٠، جندي واحد');text(prices,'C4','الموارد تُضاف عند الفتح دون إعادة توزيع');
header(prices,6,['الوحدة','مستوى المبنى','قمح','خشب','طين','حديد','إجمالي الموارد','ثواني التدريب','وقت التدريب','ذهب الإنهاء']);
let row=7;for(let i=0;i<units.length;i++){for(let level=1;level<=30;level++,row++){const r=row;formula(prices,`A${r}`,`='القوات'!B${6+i}`);val(prices,`B${r}`,level);for(const[col,src,gate]of[['C','K',null],['D','L',null],['E','M',39],['F','N',40]]){const p=ceilFraction(`'القوات'!${src}${19+i}*${reductionNumerator}`,reductionDenominator);formula(prices,`${col}${r}`,gate?`=IF(B${r}>='القوات'!$B$${gate},${p},0)`:`=${p}`);}formula(prices,`G${r}`,`=SUM(C${r}:F${r})`);const time=durationFraction(`'القوات'!K${6+i}`,1,0,remainingNumerator(`B${r}`));formula(prices,`H${r}`,`=${ceilFraction(time.n,time.d)}`);formula(prices,`I${r}`,`=H${r}/86400`);formula(prices,`J${r}`,`=${ceilFraction(time.n,`${time.d}*'القوات'!$B$38`)}`);}}
rows(prices,7,246,'J');nfmt(prices,'B7:H246');nfmt(prices,'I7:I246','[h]:mm:ss');nfmt(prices,'J7:J246');prices.freezePanes.freezeRows(6);prices.freezePanes.freezeColumns(1);const ptable=prices.tables.add('A6:J246',true,'BaseTrainingPrices');ptable.showFilterButton=true;

// Recalculation checks with actual changes to the central selector and then restore.
wb.recalculate();
const checks=[];
function valueAt(sh,address){return sh.getRange(address).values[0][0];}
function check(name,actual,expected,tol=1e-6){const pass=typeof expected==='number'?Math.abs(Number(actual)-expected)<=tol:actual===expected;checks.push({name,actual,expected,pass});if(!pass)throw Error(`${name}: ${actual} != ${expected}`);}
for(const c of [
 {unitId:'LightInfantry',buildingLevel:1,forge:0,count:1},
 {unitId:'LightInfantry',buildingLevel:1,forge:0,count:1000},
 {unitId:'LightInfantry',buildingLevel:10,forge:0,count:1},
 {unitId:'LightInfantry',buildingLevel:10,forge:3,count:1},
 {unitId:'LightInfantry',buildingLevel:30,forge:0,count:100},
 {unitId:'LightCavalry',buildingLevel:4,forge:0,count:100},
 {unitId:'LightCavalry',buildingLevel:5,forge:3,count:1001},
 {unitId:'CamelCavalry',buildingLevel:9,forge:20,count:5000},
 {unitId:'HeavyCavalry',buildingLevel:10,forge:30,count:1000000},
 {unitId:'BatteringRam',buildingLevel:30,forge:0,count:100000},
 {unitId:'FireCatapult',buildingLevel:30,forge:30,count:1000000},
]){const u=units.find(u=>u.id===c.unitId);val(calc,'B4',u.name);val(calc,'B5',c.buildingLevel);val(calc,'B6',c.forge);val(calc,'B7',c.count);wb.recalculate();const q=engine.quoteTraining(c);const tag=`${c.unitId} B${c.buildingLevel} F${c.forge} N${c.count}`;check(`${tag} gold`,valueAt(calc,'E8'),q.totalGold);check(`${tag} seconds`,valueAt(calc,'E7')*86400,q.seconds);for(const[k,r]of[['wheat',20],['wood',21],['clay',22],['iron',23]])check(`${tag} ${k}`,valueAt(calc,`C${r}`),q.resources[k]);check(`${tag} attack`,valueAt(calc,'B13'),q.combat.perUnit.attack);check(`${tag} movement`,valueAt(calc,'B16'),q.movementSpeed);check(`${tag} cargo`,valueAt(calc,'B17'),q.cargo);check(`${tag} capacity`,valueAt(calc,'B28'),q.capacity);check(`${tag} full batches`,valueAt(calc,'B29'),q.fullBatches);check(`${tag} remainder`,valueAt(calc,'B30'),q.remainder);check(`${tag} batch count`,valueAt(calc,'B31'),q.batches);check(`${tag} combined time reduction`,valueAt(calc,'E24')*100,q.totalTimeReductionVsReferencePercent);}
// All 240 building / unit source rows against the same published engine.
for(let i=0;i<8;i++)for(let level=1;level<=30;level++){const r=7+i*30+level-1;const q=engine.quoteTraining({unitId:units[i].id,count:1,forge:0,buildingLevel:level});check(`base row${r} time`,valueAt(prices,`H${r}`),q.seconds);check(`base row${r} gold`,valueAt(prices,`J${r}`),q.totalGold);for(const[k,col]of[['wheat','C'],['wood','D'],['clay','E'],['iron','F']])check(`base row${r} ${k}`,valueAt(prices,`${col}${r}`),q.resources[k]);}
for(const u of units){val(calc,'B4',u.name);val(calc,'B5',30);val(calc,'B6',0);val(calc,'B7',1);wb.recalculate();for(let f=0;f<=30;f++){const q=engine.quoteTraining({unitId:u.id,count:1,forge:f,buildingLevel:30});const r=f+7,tag=`${u.id} forge${f}`;check(`${tag} seconds`,valueAt(forge,`K${r}`),q.seconds);check(`${tag} gold`,valueAt(forge,`M${r}`),q.totalGold);check(`${tag} attack`,valueAt(forge,`C${r}`),q.combat.perUnit.attack);for(const[k,col]of[['wheat','F'],['wood','G'],['clay','H'],['iron','I']])check(`${tag} ${k}`,valueAt(forge,`${col}${r}`),q.resources[k]);}}
val(calc,'B4','فارس العرب');val(calc,'B5',10);val(calc,'B6',0);val(calc,'B7',100);val(calc,'B8',30);val(calc,'B9',30);wb.recalculate();
for(let level=1;level<=30;level++){const r=level+6;for(const[building,col]of[['barracks','G'],['stable','H'],['workshop','I']])check(`${building} capacity${level}`,valueAt(buildings,`${col}${r}`),engine.capacity(building,level));check(`combined reduction${level}`,valueAt(buildings,`E${r}`),data.buildingLevels[level-1].totalTimeReductionVsReferencePercent/100);}
for(let i=0;i<units.length;i++)for(let level=1;level<=30;level++){const q=engine.quoteTraining({unitId:units[i].id,count:1,forge:0,buildingLevel:level});check(`building times ${units[i].id} B${level}`,valueAt(buildings,`${String.fromCharCode(67+i)}${41+level}`)*86400,q.seconds);}
const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},maxChars:6000,summary:'Final formula error scan'});
await fs.writeFile(`${outputDir}/workbook-verification.json`,JSON.stringify({version:data.version,checkedAt:new Date().toISOString(),checks:checks.length,passed:checks.filter(x=>x.pass).length,errors:errors.ndjson,engine:'Artifact Tool recalculation; native Microsoft Excel not opened',results:checks},null,2));
console.log(JSON.stringify({checks:checks.length,passed:checks.filter(x=>x.pass).length,errors:errors.ndjson}));
for(const [sh,range,file]of[[calc,'A1:F24','workbook-calculator.png'],[calc,'A27:F51','workbook-batch-details.png'],[source,'A1:O26','workbook-roster.png'],[source,'A29:K56','workbook-rules.png'],[buildings,'A1:J38','workbook-building-levels.png'],[buildings,'A40:K57','workbook-building-times.png'],[forge,'A1:N22','workbook-forge.png'],[prices,'A1:K20','workbook-prices.png']]){const png=await wb.render({sheetName:sh.name,range,scale:1.3,format:'png'});await fs.writeFile(`${outputDir}/${file}`,new Uint8Array(await png.arrayBuffer()));}
const xlsx=await SpreadsheetFile.exportXlsx(wb);await xlsx.save(`${outputDir}/GloryKings_Training_Balance_Approved.xlsx`);
console.log(`SAVED ${outputDir}/GloryKings_Training_Balance_Approved.xlsx`);
