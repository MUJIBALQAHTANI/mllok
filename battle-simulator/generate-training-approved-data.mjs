import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {TRAINING_VERSION,RULES,PROVENANCE,TRAINING_UNITS,BUILDING_CONFIG,GOLD_TIERS,RESOURCES,buildingTimeDetails,capacity,quoteTraining} from './training-engine.mjs';
const directory=path.join(path.dirname(fileURLToPath(import.meta.url)),'docs');
const baseQuotes=[],forgeQuotes=[];
const snapshot=q=>({unitId:q.unitId,count:q.count,forge:q.forge,buildingLevel:q.buildingLevel,referenceBaseSeconds:q.referenceBaseSeconds,baseSeconds:q.baseSeconds,referenceBaseUnitResources:q.referenceBaseUnitResources,previousBaseUnitResources:q.previousBaseUnitResources,baseUnitResources:q.baseUnitResources,baseReductionPercent:q.baseReductionPercent,timeBaseReductionPercent:q.timeBaseReductionPercent,resourceIncreasePercent:q.resourceIncreasePercent,resourceIncreaseFactor:q.resourceIncreaseFactor,previousBaseResourceFactor:q.previousBaseResourceFactor,baseResourceFactor:q.baseResourceFactor,unitResources:q.unitResources,resourceTotal:q.resourceTotal,combat:q.combat.perUnit,movementSpeed:q.movementSpeed,cargo:q.cargo,seconds:q.seconds,perUnitTime:q.perUnitTime,totalGold:q.totalGold,capacity:q.capacity,trainingReductionPercent:q.trainingReductionPercent,totalTimeReductionVsReferencePercent:q.totalTimeReductionVsReferencePercent,totalTimeFactorVsReference:q.totalTimeFactorVsReference});
for(const unit of TRAINING_UNITS){
  for(let buildingLevel=1;buildingLevel<=30;buildingLevel++)baseQuotes.push(snapshot(quoteTraining({unitId:unit.id,count:1,forge:0,buildingLevel})));
  for(let forge=0;forge<=30;forge++)forgeQuotes.push(snapshot(quoteTraining({unitId:unit.id,count:1,forge,buildingLevel:30})));
}
const data={
  version:TRAINING_VERSION,generatedAt:'2026-11-19',rules:RULES,provenance:PROVENANCE,units:TRAINING_UNITS,buildings:BUILDING_CONFIG,goldTiers:GOLD_TIERS,
  buildingLevels:Array.from({length:30},(_,i)=>({ ...buildingTimeDetails(i+1),capacities:Object.fromEntries(Object.keys(BUILDING_CONFIG).map(key=>[key,capacity(key,i+1)])) })),
  forgeLevels:Array.from({length:31},(_,level)=>({level,combatFactor:(100+5*level)/100,resourceFactor:(100+6*level)/100,effortFactor:(100+4*level)/100})),baseQuotes,forgeQuotes,
};
await fs.mkdir(directory,{recursive:true});
await fs.writeFile(path.join(directory,'training-approved-data.json'),JSON.stringify(data,null,2)+'\n');
const number=value=>new Intl.NumberFormat('en-US',{maximumFractionDigits:3,useGrouping:false}).format(value);
const time=value=>{const n=Math.ceil(value),h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;};
const table=(header,rows)=>[header.map(x=>` ${x} `).join('|'),header.map(()=>'---').join('|'),...rows.map(row=>row.map(x=>` ${x} `).join('|'))].map(row=>'|'+row+'|').join('\n');
const text=`# ملوك المجد - محاكي التدريب V4: زيادة الموارد الحالية 70% مع ثبات الوقت

التاريخ: 19 نوفمبر 2026. نسخة البيانات: ${TRAINING_VERSION}.

مصدر الحساب الموحد training-engine.mjs، والبيانات المولدة training-approved-data.json. هذه محاكاة مستقلة؛ لا تكتب على خادم اللعبة أو حسابات اللاعبين.

## 1. قرار الميزانية الجديد

قرار هذه المراجعة هو **زيادة تكاليف الموارد الحالية 70% لجميع الوحدات الثماني، مع إبقاء الوقت كما هو**. أساس موارد V3 كان 30% من المرجع الأصلي؛ أصبح أساس V4 = 0.30 ×1.70 = **0.51 من المرجع الأصلي**. مثال قمح أبي هراوة: 30 أصبح 51، والخشب كذلك. هذه زيادة على التكلفة الحالية، وليست إضافة 70 نقطة مئوية إلى المرجع.

الوقت الأساسي يبقى 30% من المرجع، والقوة والحركة والحمولة والحداد وحدود الدفعات والذهب باقية دون أي تغيير عددي عن V3. احتفظت بالمرجع الأصلي في referenceBaseSeconds وreferenceBaseResources، وبأساس الموارد السابق الدقيق في previousBaseResources، وبالأساس الحالي في baseResources. حقل timeBaseReductionPercent يوضح تخفيض الوقت 70%؛ baseReductionPercent اسم متوافق للوقت فقط. حقل resourceIncreasePercent يوضح زيادة الموارد الحالية 70%.

يظل مستوى مبنى التدريب يخفض المدة بالمنحنى السابق حتى تخفيض إضافي 80% من الوقت الأساسي عند المستوى 30. الزمن النهائي للمستوى 30 = 0.30 ×0.20 = **0.06 من المرجع الأصلي** لنفس الحداد: تخفيض إجمالي 94%. زيادة الموارد الجديدة لا تدخل في معادلة الوقت أو الذهب.

حدود الدفعة الجديدة من صور المباني: الثكنة 300، الإسطبل 150، الورشة 75 عند المستوى 1، بنمو 25% لكل مستوى. استعملت صور IMG_2657.PNG إلى IMG_2665.PNG للسعات فقط؛ لم أنقل زيادة السرعة القديمة +70% أو أسعارها أو شروط الإتاحة المخالفة للاعتماد السابق.

## 2. الوحدات والقوة الثابتة

القائمة ثماني وحدات؛ حذف رامي الخيل. لا توجد صحة: البطاقة تعرض الهجوم ودفاع المشاة ودفاع الفرسان. القوة الأساسية من الصور المرجعية لا تخفض 70%.

${table(['الوحدة','هجوم','دفاع مشاة','دفاع فرسان','سرعة الحركة','الحمولة'],TRAINING_UNITS.map(u=>[u.name,u.attack,u.def,u.cavDef,u.movementSpeed,u.cargo]))}

المشاة: أبو هراوة = المهاجم بهراوة؛ رامي السهام = حامل الرمح؛ أبو فأسين = المقاتل بالفأس. المصدر IMG_2651(1).jpeg. الفرسان: فارس العرب = التوأم الحديدي تيريون؛ فارس الجمل = فارس البيداء؛ سلاح الفرسان = كورِنثي ساحق. المصدر IMG_2653.jpeg. الأسماء داخل اللعبة تبقى أسماء ملوك المجد.

قوة كبش الحصار والمنجنيق محفوظة من محاكي المعارك السابق. مواردهما ومددهما الأصلية كانت مقترح النسخة السابقة؛ الموارد الآن ×0.51 من ذلك المرجع والمدة باقية ×0.30. أثرهما على السور خارج حساب التدريب.

## 3. مرجع الوقت والتخفيض الأساسي

الأوقات التالية للحداد 0، وقيم الثواني الجديدة الدقيقة قبل تقريب طلب التدريب.

${table(['الوحدة','المرجع السابق بالثواني','الجديد عند مبنى 1 بالثواني','الدقيق عند مبنى 30 بالثواني','طلب وحدة عند 30'],TRAINING_UNITS.map(u=>[u.name,u.referenceBaseSeconds,number(u.baseSeconds),number(quoteTraining({unitId:u.id,count:1,forge:0,buildingLevel:30}).perUnitTime),time(quoteTraining({unitId:u.id,count:1,forge:0,buildingLevel:30}).seconds)]))}

وقت الدفعة = تقريب إلى أعلى ثانية بعد ضرب الزمن الدقيق للوحدة ×عدد وحدات الدفعة. لا نضرب وقت الوحدة المقرب في العدد. مثال أبو هراوة عند مبنى 30: الوقت الدقيق 5.76 ثانية، وطلب وحدة يظهر 6 ثوانٍ، لكن 100 وحدة تستغرق 576 ثانية لا 600 ثانية. قد يتساوى عرض ثواني الوحدة في مستويين بسبب التقريب، مع استمرار انخفاض الزمن الدقيق في كل مستوى.

## 4. زيادة الموارد الحالية وعصورها

الموارد تعتمد على مستوى مبنى التدريب: 1-4 قمح وخشب، 5-9 يضاف الطين، 10-30 يضاف الحديد. المورد المغلق يساوي صفرًا. فتح مورد يضيف تكلفته ولا يعيد توزيع الموارد السابقة.

${table(['الوحدة','قمح دقيق','خشب دقيق','طين دقيق من 5','حديد دقيق من 10','المدفوع عند حداد 0 وعصر الأربعة'],TRAINING_UNITS.map(u=>[u.name,...RESOURCES.map(key=>number(u.baseResources[key])),RESOURCES.map(key=>quoteTraining({unitId:u.id,count:1,forge:0,buildingLevel:10}).unitResources[key]).join(' / ')]))}

تفسير أرقام القمح والخشب الأصلية: لكل منهما الرقم المحدد، لا مجموعهما. معادلة المورد المفتوح للوحدة هي:

**ceil(مرجع المورد ×51 ×(100+6×F) ÷10000)**، ثم نضرب النتيجة الصحيحة في الكمية. تساوي هذه المعادلة: أساس V3 الدقيق ×1.70 ×معامل الحداد، مع تقريب واحد في النهاية. لا نزيد المبلغ القديم المقرب ثم نقرب مرة ثانية، ولا نقرب أساس V4 قبل الحداد.

مثال الحديد لأبي هراوة: المرجع25، وأساس V3 كان7.5؛ أساس V4 الدقيق12.75. عند حداد0 يدفع13، وعند حداد4 يحسب12.75×1.24=15.81 ثم يدفع16، وليس ceil(12.75)×1.24 ثم17. الفرق بين التكلفة الدقيقة والمدفوعة أقل من مورد واحد لكل نوع مورد لكل وحدة. لذلك قد لا تساوي نسبة الفرق بين المبلغين المدفوعين 70% تمامًا في الموارد الصغيرة، بينما زيادة الأساس الدقيق تساوي70% بالضبط.

هذه السياسة تحفظ الانضباط بين تدريب الوحدة وتدريب الكمية: تكلفة الكمية = عددها ×تكلفة الوحدة المدفوعة. لا توجد كسور موارد في المبالغ المدفوعة. حقول referenceBaseResources وpreviousBaseResources وbaseResources في JSON تعرض المرجع ثم أساس V3 ثم أساس V4 دون فقد الكسور. في حسبة الوحدة تقابلها referenceBaseUnitResources وpreviousBaseUnitResources وbaseUnitResources.

## 5. الحداد

الحداد 0 هو الأساس. المستوى1 يعطي +5%، والمستوى2 +10%، والمستوى30 +150% من قوة الأساس، أي×2.5. من بطاقة IMG_2655.jpeg. يظل معامل الموارد 1+0.06×F ومعامل جهد التدريب 1+0.04×F من موازنة النسخة السابقة. معامل الموارد يضرب أساس V4 الجديد ×0.51 من المرجع، ومعامل الجهد يضرب الوقت المستمر ×0.30 من المرجع. الزيادة خطية من الأساس، وليست تراكمًا مركبًا.

${table(['الحداد','معامل القوة','معامل الموارد بعد زيادة الأساس','معامل جهد التدريب المستمر'],data.forgeLevels.map(r=>[r.level,number(r.combatFactor),number(r.resourceFactor),number(r.effortFactor)]))}

## 6. منحنى وقت مباني التدريب

إذا كان B مستوى المبنى وx=(B-1)/29، فالتخفيض الإضافي R=0.80×(0.40×x+0.60×x²). تتزايد حصة كل ترقية في المستويات العليا. المدة = الزمن المرجعي السابق ×0.30×(1+0.04×F)×(1-R).

معامل المدة للمبنى يحسب داخليًا بالكسر [21025-232×(B-1)-12×(B-1)²]/21025. وحساب الدفعة الدقيق في أعداد صحيحة يستخدم المرجع×3×(100+4F)×بسط معامل المبنى، مقسومًا على1000×21025، ثم تقريب واحد إلى أعلى ثانية. الذهب يستخدم المدة الدقيقة لا الثانية المقربة.

التخفيض الإجمالي مقارنة بالمرجع السابق لنفس الحداد =70%+0.30×نسبة تخفيض المبنى. المقارنة لنفس الحداد حتى لا ننسب أثر تجهيز مختلف إلى المبنى.

${table(['المبنى','تخفيض المبنى %','مكسب المستوى بالنقاط المئوية','الإجمالي من المرجع %','حد دفعة الثكنة','حد دفعة الإسطبل','حد دفعة الورشة'],data.buildingLevels.map(r=>[r.level,number(r.reductionPercent),number(r.incrementPercentagePoints),number(r.totalTimeReductionVsReferencePercent),r.capacities.barracks,r.capacities.stable,r.capacities.workshop]))}

## 7. أوقات المستويات الثلاثين للحداد 0

الأرقام دقيقة:ثانية لطلب وحدة واحدة، مقربة إلى أعلى ثانية. الحساب الكامل للكميات يستخدم الزمن غير المقرب.

${table(['المبنى','أبو هراوة','رامي السهام','أبو فأسين','فارس العرب','فارس الجمل','سلاح الفرسان','كبش','منجنيق'],data.buildingLevels.map(r=>[r.level,...TRAINING_UNITS.map(u=>time(quoteTraining({unitId:u.id,count:1,forge:0,buildingLevel:r.level}).seconds))]))}

## 8. الإتاحة المستمرة

فارس العرب يتطلب قصر الأبطال3، وفارس الجمل7، وسلاح الفرسان10. الإسطبل يتطلب قلعة3 وفق القاعدة السابقة؛ الورشة قلعة10 وفق قراءة القرار السابق. هذه الشروط مستقلة عن مستوى مبنى التدريب الذي يحدد عصر الموارد. يمكن معاينة الوحدة المغلقة ويظهر سبب عدم الإتاحة.

بقي تفسير التعارض السابق ظاهرًا: لا حديد قبل مبنى التدريب10، حتى مع ذكر الحديد لفارس الجمل عند7؛ طبقنا القاعدة العامة. ولا يفتح حداد1 وحده الموارد الأربعة لسلاح الفرسان، بل تتبع مستوى مبنى التدريب. لم تنقل شروط فتح المشاة أو الحصار الظاهرة في صور السعات الجديدة إذا خالفت الاعتماد السابق.

## 9. حد الدفعة والذهب

حد الدفعة =floor(الأساس×1.25^(B-1))، والأساس300/150/75 للثكنة/الإسطبل/الورشة. هذه أقصى وحدات في طلب تدريب واحد، وليست سعة السكان ولا حد الجيش الموجود. أي كمية أكبر تقسم إلى دفعات متتالية؛ تعرض كل دفعة وعدد تكرارها ووقتها وذهبها. يفترض الحساب طابورًا فارغًا وعدم وجود فواصل انتظار بين الدفعات.

التدريب الطبيعي يتطلب الموارد والوقت، وصفر ذهب. الإنهاء بالذهب اختياري مع بقاء الموارد. **تحويل الذهب مستمر:96 ثانية عمل فعلي لكل ذهب**؛ لم يتغير المقام أو شرائح الذهب. بما أن وقت التدريب لم يتغير في V4، تبقى جميع أسعار الإنهاء بالذهب كما كانت في V3؛ الزيادة70% تخص الموارد فقط.

${table(['الوحدات داخل الدفعة','خصم الشريحة'],GOLD_TIERS.map(r=>[r.from+'-'+r.to,r.discountPercent+'%']))}

الخصم هامشي على كل شريحة من الدفعة نفسها، ولا يعاد تسعير الوحدات السابقة. تطبق الشرائح على الزمن الدقيق ثم تقرب تكلفة كل دفعة إلى أعلى ذهب كامل. لا تعد كمية تتجاوز الحد دفعة واحدة لمجرد إدخالها في المحاكي.

مثال1000 أبو هراوة، حداد0، ثكنة1: الحد300؛ الخطة3دفعات من300 ودفعة100، بإجمالي28800ثانية (8ساعات). ذهب الإنهاء89 لكل دفعة300، و30 للدفعة100؛ المجموع297ذهبًا. مثال100 أبو هراوة، حداد0، ثكنة30:576ثانية و6ذهب. الوحدة المنفردة قد تظل1ذهب بسبب تقريب الذهب إلى عدد صحيح؛ المتوسط الحقيقي للكمية ظاهر في المحاكي.

## 10. المصادر وحدود الأرقام

مصادر القوة والزمن المرجعي: صور الوحدات المرفقة في19نوفمبر2026. مصادر حدود الدفعات: صور تفاصيل المباني IMG_2657.PNG إلىIMG_2665.PNG؛ أمثلة النهايات193870للثكنة و96935للإسطبل و48467للورشة عند30. القرار السابق خفض أساس الموارد والوقت70%. القرار الأحدث يزيد موارد V3 الحالية70% فقط، مع ثبات الوقت ومنحنى المبنى حتى80%.

الثابت من الاعتماد: القوة والأسماء والسرعات والحمولات والعصور ومتطلبات الإتاحة المشار إليها. المقترحات المستمرة: شكل توزيع منحنى80%، معاملات موارد وجهد الحداد، تحويل الذهب وشرائحه، وقيم الحصار المرجعية قبل تطبيق القرارات المتتابعة. لا تعني سلامة الحساب وحدها إثبات توازن اللعبة الاقتصادي أو أثر الحصار في المعارك. نقل هذه القواعد إلى الإنتاج خارج مهمة المحاكي والملفات.

التحقق من شرط عدم تغيير الوقت: سجل مرجعي مأخوذ من محرك V3 قبل التعديل يقارن 7440 تركيبة من الوحدة والمبنى والحداد، بكمية تتجاوز حد الدفعة. يتحقق من تطابق الوقت والذهب والقوة والحركة والحمولة وحدود الدفعات وخططها وشروط الإتاحة. أُصدرت روابط الحسبات الجديدة بالإصدار V4 حتى لا تعرض حسبة قديمة تسعيرًا جديدًا بصمت.

## 11. التدريب والحداد والسور في صفحة واحدة

تحتوي الصفحة على ثلاثة أقسام: التدريب، والحداد، والسور. يعرض قسم الحداد إحصاءات الوحدة الأساسية والحالية والمستوى التالي، ويطبق الجندي والمستوى المختارين على حسبة التدريب. جميع الأقسام تستخدم قائمة الوحدات الثماني نفسها وحداد0 كأساس، ثم +5% قوة لكل مستوى.

قسم السور يحسب أثره على مجموعة المدافعين المختارة. المتانة القصوى =1000×المستوى؛ المكافأة الكاملة =1% لكل مستوى. المكافأة الحالية تتناسب مع المتانة المتبقية. يضرب السور دفاع المشاة ودفاع الفرسان بعد الحداد، ولا يضيف هجومًا أو جنودًا. لا يحتسب الحداد مرتين.

الحصار حسبة مشروطة: المستخدم يحدد نتيجة المعركة والكباش الواصلة والآلات الناجية. لا يحسم هذا القسم المعركة أو يستنتج الناجين. احتُفظ بمقترح الحصار السابق: الكباش الواصلة تخفض مكافأة السور تدريجيًا بسقف50%، والضرر بعد فوز المهاجم =12 لكل كبش ناجٍ و6 لكل منجنيق ناجٍ بعد معامل الحداد. يحد الضرر المباشر سقف10% من أقصى المتانة خلال60ثانية، ويحد مجموع الأضرار سقف25% خلالساعة مع احتساب الضرر السابق المدخل.

حريق المنجنيقات يعرض كضرر محتمل على30دقيقة، بعد أخذ أصغر حدود3لكل منجنيق ناجٍ بعد الحداد، و2% من أقصى المتانة، ونصف الضرر المباشر، والمتانة المتبقية، ورصيد سقف الساعة. إذا لم يفز المهاجم فلا ضرر متانة أو حريق في هذه الحسبة. هذه معادلات محاكي قابلة للمراجعة وليست ربطًا بخادم اللعبة أو تعديلًا لنظام المعركة القديم.
`;
await fs.writeFile(path.join(directory,'TRAINING_SIMULATOR_AR.md'),text);
console.log(JSON.stringify({version:data.version,units:data.units.length,buildingLevels:data.buildingLevels.length,forgeLevels:data.forgeLevels.length,baseQuotes:baseQuotes.length,forgeQuotes:forgeQuotes.length,files:['training-approved-data.json','TRAINING_SIMULATOR_AR.md']}));
