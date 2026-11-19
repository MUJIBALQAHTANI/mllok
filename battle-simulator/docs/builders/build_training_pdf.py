from pathlib import Path
import json, math, html, os
import fitz

ROOT=Path(os.environ.get('GK_WORKSPACE', '/workspace/scratch/1e72c071ce5d'))
DATA=ROOT/'mllok/battle-simulator/docs/training-approved-data.json'
OUT=ROOT/'outputs/revised_training_20261119'
TMP=ROOT/'tmp/pdfs/revised_training'
OUT.mkdir(parents=True,exist_ok=True);TMP.mkdir(parents=True,exist_ok=True)
D=json.loads(DATA.read_text())
U=D['units']
UNITS={u['id']:u for u in U}
NAMES={u['id']:u['name'] for u in U}
BASE_QUOTES={(q['unitId'],q['buildingLevel']):q for q in D['baseQuotes']}
BUILDING_ROWS={r['level']:r for r in D['buildingLevels']}
NAVY=(.055,.10,.16);GOLD=(.71,.52,.24);TEAL=(.10,.38,.35);INK=(.13,.19,.25)
PALE=(.94,.96,.97);LINE=(.83,.86,.88)
AR=fitz.Archive('/usr/share/fonts/truetype/noto')
CSS='''@font-face{font-family:AR;src:url(NotoNaskhArabic-Regular.ttf)} @font-face{font-family:AR;font-weight:bold;src:url(NotoNaskhArabic-Bold.ttf)} body{font-family:AR;margin:0;padding:0} p{margin:0;padding:0}'''
doc=fitz.open(); fits=[]
def esc(v):return html.escape(str(v))
def num(v,dp=2):
    if isinstance(v,str):return v
    return f'{v:,.{dp}f}'.rstrip('0').rstrip('.') if dp else f'{v:,.0f}'
def tm(s):
    s=math.ceil(s);h,s=divmod(s,3600);m,s=divmod(s,60)
    return f'{h}:{m:02}:{s:02}' if h else f'{m}:{s:02}'
def red(l):
    return BUILDING_ROWS[l]['reductionPercent']/100
def base_res(u):return u['baseResources']
def txt(page,text,x,y,w,h,size=13,color='#223441',align='right',bold=False,ltr=False):
    body=f'<div dir="{"ltr" if ltr else "rtl"}" style="font-family:AR;font-size:{size}pt;line-height:1.2;text-align:{align};color:{color};font-weight:{"bold" if bold else "normal"}">{text}</div>'
    r=page.insert_htmlbox(fitz.Rect(x,y,x+w,y+h),body,css=CSS,archive=AR,scale_low=1)
    fits.append({'page':page.number+1,'text':text[:85],'spare':r[0],'scale':r[1]})
    if r[0]<0:raise RuntimeError(f'Text does not fit page{page.number+1} {text[:100]} rect={x,y,w,h}')
def newpage(title,subtitle=''):
    p=doc.new_page(width=595.276,height=841.89)
    p.draw_rect(fitz.Rect(0,0,595.276,76),color=None,fill=NAVY)
    p.draw_rect(fitz.Rect(0,76,595.276,79),color=None,fill=GOLD)
    txt(p,'ملوك المجد',340,16,220,30,23,'#E8C98C',bold=True)
    txt(p,'TRAINING / V3',30,25,220,22,11,'#D2DBE2','left',ltr=True)
    txt(p,esc(title),30,96,535,39,21,bold=True)
    if subtitle:txt(p,esc(subtitle),30,137,535,40,11.7,color='#536571')
    return p
def note(p,heading,body,y,height=83,color=TEAL):
    p.draw_rect(fitz.Rect(30,y,565,y+height),color=None,fill=(.94,.97,.96))
    p.draw_rect(fitz.Rect(560,y,565,y+height),color=None,fill=color)
    txt(p,esc(heading),42,y+8,504,24,14,color='#1A5C50',bold=True)
    txt(p,esc(body),42,y+33,504,height-38,12.2)
def table(p,headers,rows,widths,y,rowh=31,headh=38,size=12):
    assert abs(sum(widths)-535)<.01
    p.draw_rect(fitz.Rect(30,y,565,y+headh),color=None,fill=NAVY)
    def cells(row,cy,ch,ishead=False,index=0):
        right=565
        for j,(value,w) in enumerate(zip(row,widths)):
            x=right-w
            if not ishead:
                p.draw_rect(fitz.Rect(x,cy,right,cy+ch),color=LINE,fill=PALE if index%2==0 else (1,1,1),width=.45)
            value=str(value)
            numeric=all(c in '0123456789.,:/%+- ×' for c in value)
            txt(p,esc(value),x+4,cy+max(1,(ch-size*1.4)/2)-1,w-8,ch-2,size if not ishead else 11.7,'#FFFFFF' if ishead else '#223441','center',ishead,numeric)
            right=x
    cells(headers,y,headh,True)
    for i,row in enumerate(rows):cells(row,y+headh+i*rowh,rowh,index=i)
    return y+headh+rowh*len(rows)
def bullet(p,body,y):txt(p,'• '+esc(body),36,y,522,52,13)

# 1 - Decisions and precise scope.
p=newpage('تصحيح تكلفة التدريب ومدته','تعديل 19 نوفمبر 2026 | تخفيض أساس الوقت والموارد 70% لجميع الجيوش')
note(p,'الأساس الجديد يساوي 30% من المرجع السابق','تطبق عليه معاملات الحداد السابقة. يتدرج تخفيض وقت المبنى من 0% إلى 80% إضافية؛ عند المستوى 30 يبقى 6% من الوقت القديم لنفس الحداد.',187,77)
table(p,['الفئة','السرعة الثابتة','الحمولة الثابتة'],[
['المشاة','10','10'],['الفرسان','20','20'],['آلات الحصار','3','30']], [255,140,140],283,rowh=39)
note(p,'القوة المعروضة في بطاقة الجندي','الهجوم، ثم الدفاع ضد المشاة، ثم الدفاع ضد الفرسان. أزيلت الصحة. السرعة والحمولة لا تتغيران مع الحداد أو المبنى.',467,96)
bullet(p,'حدود الدفعات حسب الصور: الثكنة 300، الإسطبل 150، الورشة 75 عند المستوى 1، وتزيد 25% كل مستوى.',586)
bullet(p,'الحداد منفصل: المستوى 0 هو الأساس؛ المستوى 1 يعطي +5% قوة، والمستوى 30 يعطي +150%.',642)
bullet(p,'القائمة ثمانية أنواع. الموارد تفتح حسب مستوى مبنى التدريب: الطين من 5، والحديد من 10. تفاصيل التقريب موضحة في الدليل.',698)

# 2 - Exact source values.
p=newpage('القوة ثابتة ووقت الأساس أقل','بدون حداد وعند مبنى 1. عمود الوقت: القديم / الجديد، دقيقة:ثانية؛ مقرب للوحدة.')
rows=[[u['name'],num(u['attack']),num(u['def']),num(u['cavDef']),tm(u['referenceBaseSeconds'])+' / '+tm(u['baseSeconds'])] for u in U]
end=table(p,['الجندي','الهجوم','دفاع المشاة','دفاع الفرسان','الوقت قبل / بعد'],rows,[135,78,96,96,130],190,rowh=40,headh=43,size=12)
note(p,'مطابقة أسماء الصور مع أسماء ملوك المجد','حامل الرمح في المرجع = رامي السهام عندنا. التوأم الحديدي = فارس العرب؛ فارس البيضاء = فارس الجمل؛ كورنثي ساحق = سلاح الفرسان.',end+20,106)
txt(p,'القوة والأوقات المرجعية من IMG_2651(1).jpeg وIMG_2653.jpeg. خُفض الوقت المرجعي إلى 30% دون تغيير القوة. مثال أبو هراوة: 96 إلى 28.8 ثانية، وتعرض الوحدة 29 ثانية. حسبة الكمية تستخدم 28.8 الدقيقة. وقتا الحصار المرجعيان 480 و600 ثانية أصبحا 144 و180 ثانية.',34,end+143,527,92,11.8,color='#536571')

# 3 - Resource decisions.
p=newpage('الموارد بعد التخفيض الأساسي 70%','المبلغ الصحيح المطلوب للوحدة عند حداد 0، بعد التقريب لأعلى. لا يُطلب المورد قبل فتحه.')
rows=[[u['name']]+[str(BASE_QUOTES[(u['id'],30)]['unitResources'][key]) for key in ['wheat','wood','clay','iron']] for u in U]
end=table(p,['الجندي','قمح','خشب','طين من 5','حديد من 10'],rows,[151,96,96,96,96],184,rowh=35,headh=38)
table(p,['مستوى المبنى','الموارد المطلوبة'],[['1 - 4','قمح + خشب'],['5 - 9','قمح + خشب + طين'],['10 - 30','قمح + خشب + طين + حديد']],[170,365],end+21,rowh=31,headh=32)
note(p,'التقريب بعد الخصم والحداد مرة واحدة','المورد = تقريب لأعلى (المرجع القديم × 30% × معامل الحداد). مثال حديد أبو هراوة: 7.5 يصبح 8 عند حداد 0؛ وعند حداد 3: 8.85 يصبح 9، لا 10. ثم تضرب تكلفة الوحدة في العدد.',end+176,103)
txt(p,'قد يجعل تقريب الوحدة إلى مورد صحيح التخفيض الفعلي أقل قليلًا من 70%. القيم المرجعية محفوظة، ولم يُنقل الحديد إلى ما قبل مستوى المبنى 10.',34,793,527,26,9.8,color='#536571')

# 4 - Building curve for infantry.
def timepage(title,ids,explanation):
    p=newpage(title,explanation)
    hs=['المستوى','تخفيض الوقت']+[NAMES[x] for x in ids]
    widths=[66,100]+[(535-166)/len(ids)]*len(ids)
    rows=[]
    for level in range(1,31):rows.append([str(level),num(red(level)*100)+'%']+[tm(BASE_QUOTES[(i,level)]['seconds']) for i in ids])
    table(p,hs,rows,widths,184,rowh=19.3,headh=41,size=11.5)
    txt(p,'أوقات الوحدة عند حداد 0. تُحسب المدة الدقيقة أولًا، ثم تُقرّب الدفعة إلى الثانية الأعلى؛ لا تُضرب مدة الوحدة المدوّرة في العدد.',34,807,527,22,9.8,color='#536571')
timepage('أوقات المشاة: مبنى 1 إلى 30',['LightInfantry','Archer','SpearInfantry'],'المدد بعد تخفيض الأساس 70%. عمود التخفيض هو تخفيض المبنى الإضافي من الأساس الجديد.')
timepage('أوقات الفرسان: مبنى 1 إلى 30',['LightCavalry','CamelCavalry','HeavyCavalry'],'المدد بعد تخفيض الأساس 70%. فتح الفرسان من قصر الأبطال 3 و7 و10 لم يتغير.')
timepage('أوقات الحصار: مبنى 1 إلى 30',['BatteringRam','FireCatapult'],'المدد بعد تخفيض الأساس 70%. ورشة العربات تفتح عند القلعة 10 في نموذج الإتاحة.')

# Batch limits match the supplied building screenshots, not their old times/prices.
p=newpage('حدود الدفعات والتخفيض الكلي','حد الدفعة ينمو 25% لكل مستوى. التخفيض الكلي يقارن بالوقت القديم لنفس الحداد.')
rows=[]
for level in range(1,31):
    br=BUILDING_ROWS[level]
    rows.append([str(level),num(red(level)*100)+'%',num(70+30*red(level))+'%',*[num(br['capacities'][key],0) for key in ['barracks','stable','workshop']]])
table(p,['المستوى','تخفيض المبنى','التخفيض الكلي','حد الثكنة','حد الإسطبل','حد الورشة'],rows,[49,88,88,104,103,103],184,rowh=19,headh=41,size=10.8)
txt(p,'الحد = حذف كسر (أساس المبنى × 1.25^(المستوى - 1)). مصدر السعة صور المباني 2657 إلى 2665. الطلب الأكبر يقسم إلى دفعات.',34,798,527,28,9.2,color='#536571')

# 7 - Forge exact factors.
p=newpage('الحداد: الأساس ثم المستويات 1 إلى 30','السرعة والحمولة ثابتتان؛ الحداد يغيّر القوة والموارد وجهد التدريب فقط.')
rows=[]
for f in range(31):rows.append([str(f),num(5*f)+'%',num(1+.06*f,2)+'×',num(1+.04*f,2)+'×',num(UNITS['LightCavalry']['attack']*(1+.05*f),3)])
table(p,['الحداد','زيادة القوة','معامل الموارد','معامل الوقت','هجوم فارس العرب'],rows,[66,100,118,118,133],184,rowh=18.55,headh=41,size=11.3)
txt(p,'المستوى 0 بلا تطوير. الموارد +6% والجهد +4% لكل مستوى محفوظان من المقترح السابق، ويطبقان على الأساس الدقيق بعد تخفيضه 70%.',34,805,527,25,9.7,color='#536571')

# 8 - Economy, availability, integration contract.
p=newpage('الذهب وشروط الإتاحة والتطبيق','تفسير القرارات والافتراضات حتى لا تختلط بقواعد اللعبة المنشورة.')
note(p,'التدريب والإنهاء بالذهب','الانتظار الطبيعي: 0 ذهب مع دفع الموارد. إنهاء الوقت: ذهب إضافي مع بقاء الموارد. بقي معامل 96 ثانية مقابل ذهب واحد؛ لذلك يقل الذهب مع الوقت. مثال 100 أبو هراوة، مبنى 1، حداد 0: 48 دقيقة و30 ذهب للإنهاء.',184,105)
table(p,['وحدات الدفعة','خصم الشريحة'],[['1 - 100','0%'],['101 - 1,000','2%'],['1,001 - 5,000','5%'],['5,001 - 10,000','10%'],['10,001 - 50,000','15%'],['50,001 وما فوق','20%']],[335,200],306,rowh=25,headh=34)
txt(p,'الخصم على الوحدات داخل كل شريحة، وليس على كامل الطلب بأعلى نسبة. عند تعدد الدفعات تُحسب الشرائح والتقريب لكل دفعة حسب حدود الصور. مثال الثكنة 1: طلب 301 يقسم إلى 300 ثم 1، ولا يعد دفعة واحدة.',34,501,527,70,11.8)
note(p,'شروط الفتح منفصلة عن حسبة الموارد','فارس العرب: قصر الأبطال 3. فارس الجمل: قصر الأبطال 7. سلاح الفرسان: قصر الأبطال 10. الورشة: قلعة 10 كقراءة سياقية. عرض تكلفة وحدة مغلقة في المحاكي يُوسم بأنه معاينة فقط.',587,105)
txt(p,'عند توفر سلاح الفرسان في قصر الأبطال 10، تطلب الأربعة موارد إذا كان الإسطبل نفسه 10 أو أعلى. إبقاء الإسطبل أقل يُبقي موارده بحسب مرحلته؛ لم يُضَف شرط مبنى جديد دون نص صريح. أي قصد مختلف لفتح الموارد يحتاج قرارًا موحدًا قبل تطبيقه في خادم اللعبة.',34,710,527,78,11.3,color='#536571')

# 9 - Detailed formulas and release evidence.
p=newpage('معادلات التنفيذ ومصدر كل قرار','المحاكي والملفان يتبعون إصدار البيانات نفسه، دون كتابة على حسابات اللاعبين.')
formulae=[('تخفيض الوقت حسب المبنى','x = (B - 1) / 29; R = 0.8 × (0.4x + 0.6x²)'),('القوة لكل خاصية','P = BaseP × (1 + 0.05F)'),('تكلفة المورد المفتوح للوحدة','Resource = CEILING(RefResource × 0.30 × (1 + 0.06F))'),('مدة الدفعة بالثواني','Seconds = CEILING(RefSeconds × 0.30 × N × (1 + 0.04F) × (1 - R))')]
y=184
for title,formula in formulae:
    txt(p,esc(title),34,y,527,24,13,bold=True)
    p.draw_rect(fitz.Rect(30,y+28,565,y+66),color=None,fill=PALE)
    txt(p,esc(formula),40,y+33,515,28,10.5,'#245956','left',ltr=True)
    y+=84
txt(p,'Ref يشير إلى المرجع السابق قبل تخفيض 70%. B مستوى المبنى، F مستوى الحداد، N عدد وحدات الدفعة. التخفيض الكلي للمدة = 70% + 30% × R، لذلك يكون 94% عند المبنى 30، لا مجموع النسب 150%.',34,526,527,68,12)
note(p,'أولوية التصحيح الأخير ومصدر الحدود','الجديد: تخفيض الأساس 70% وحدود الدفعات من صور المباني. بقي منحنى الوقت السابق حتى 80% من الأساس الجديد. لم تنقل نسب سرعة التدريب أو أسعار الموارد القديمة الظاهرة في الصور، ولم يعد رامي الخيل إلى القائمة.',608,115)
txt(p,'هذه حزمة جاهزة لمراجعة قواعد المحاكي ودمجها لاحقًا في اللعبة. لم تُنشر هذه القواعد على خادم اللعبة أو عميل Unity. مرجع التفاصيل: TRAINING_SIMULATOR_AR.md وtraining-approved-data.json.',34,740,527,55,11.5,color='#536571')

for i,p in enumerate(doc):
    p.draw_line(fitz.Point(30,832),fitz.Point(565,832),color=LINE,width=.6)
    p.insert_text((31,829),f'{i+1} / {len(doc)}',fontname='helv',fontsize=8,color=(.4,.45,.5))
    p.insert_text((450,829),'GK TRAINING / 2026-11-19',fontname='helv',fontsize=7,color=(.4,.45,.5))
doc.set_metadata({'title':'GloryKings Training Balance - 19 November 2026','author':'GloryKings','subject':D['version']})
file=OUT/'GloryKings_Training_Balance_Approved.pdf'
doc.save(file,garbage=4,deflate=True)
for i,p in enumerate(doc):p.get_pixmap(matrix=fitz.Matrix(1.25,1.25)).save(TMP/f'page-{i+1:02}.png')
(OUT/'pdf-verification.json').write_text(json.dumps({'version':D['version'],'pages':len(doc),'allTextFits':all(x['spare']>=0 for x in fits),'minimumScale':min(x['scale'] for x in fits),'file':str(file)},indent=2))
print(json.dumps({'file':str(file),'pages':len(doc),'textBoxes':len(fits),'allTextFits':True}))
