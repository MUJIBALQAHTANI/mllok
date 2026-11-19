from pathlib import Path
import json, math, html, os
import fitz

ROOT=Path(os.environ.get('GK_WORKSPACE', '/workspace/scratch/1e72c071ce5d'))
DATA=ROOT/'mllok/battle-simulator/docs/training-approved-data.json'
OUT=ROOT/'outputs/approved_training_20261119'
TMP=ROOT/'tmp/pdfs/approved_training'
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
    txt(p,'TRAINING / V2',30,25,220,22,11,'#D2DBE2','left',ltr=True)
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
p=newpage('قواعد التدريب والقوة','نسخة 19 نوفمبر 2026 | مصدر موحد للمحاكي وملف Excel وهذا الدليل')
note(p,'ثمانية أنواع معتمدة في المحاكي','ثلاثة مشاة، وثلاثة فرسان، وآلتا حصار. أزيل رامي الخيل من قائمة التدريب.',187,77)
table(p,['الفئة','السرعة الثابتة','الحمولة الثابتة'],[
['المشاة','10','10'],['الفرسان','20','20'],['آلات الحصار','3','30']], [255,140,140],283,rowh=39)
note(p,'القوة المعروضة في بطاقة الجندي','الهجوم، ثم الدفاع ضد المشاة، ثم الدفاع ضد الفرسان. أزيلت الصحة. السرعة والحمولة لا تتغيران مع الحداد أو المبنى.',467,96)
bullet(p,'مستوى مبنى التدريب يحدد الموارد المفتوحة وتخفيض المدة؛ يصل التخفيض إلى 80% عند المستوى 30.',586)
bullet(p,'الحداد منفصل: المستوى 0 هو الأساس؛ المستوى 1 يعطي +5% قوة، والمستوى 30 يعطي +150%.',642)
bullet(p,'قواعد المستخدم منقولة كما هي، بينما منحنى الوقت وأرقام الحصار وتسعير الذهب موضحة كمقترحات موازنة.',698)

# 2 - Exact source values.
p=newpage('قوة الجنود وأوقاتهم الأساسية','القيم التالية قبل تطوير الحداد وعند مبنى تدريب مستوى 1. الوقت دقيقة:ثانية.')
rows=[[u['name'],num(u['attack']),num(u['def']),num(u['cavDef']),tm(u['baseSeconds'])] for u in U]
end=table(p,['الجندي','الهجوم','دفاع المشاة','دفاع الفرسان','وقت التدريب'],rows,[143,92,100,100,100],190,rowh=40,headh=43,size=13)
note(p,'مطابقة أسماء الصور مع أسماء ملوك المجد','حامل الرمح في المرجع = رامي السهام عندنا. التوأم الحديدي = فارس العرب؛ فارس البيضاء = فارس الجمل؛ كورنثي ساحق = سلاح الفرسان.',end+20,106)
txt(p,'المصدر: جدول المشاة IMG_2651(1).jpeg وجدول الفرسان IMG_2653.jpeg. قوة الحصار محفوظة من كتالوج المحاكي السابق؛ وقتا الكبش والمنجنيق مقترحان جديدان. السعة وصيانة القمح في صور المرجع لم تُستخدم.',34,end+143,527,92,11.8,color='#536571')

# 3 - Resource decisions.
p=newpage('الموارد: كل رقم يخص موردًا مستقلًا','تكلفة الجندي عند حداد 0. القمح والخشب يبقيان كما هما عند فتح مورد جديد.')
rows=[[u['name'],str(base_res(u)['wheat']),str(base_res(u)['wood']),str(base_res(u)['clay']),str(base_res(u)['iron'])] for u in U]
end=table(p,['الجندي','قمح','خشب','طين من 5','حديد من 10'],rows,[151,96,96,96,96],184,rowh=35,headh=38)
table(p,['مستوى المبنى','الموارد المطلوبة'],[['1 - 4','قمح + خشب'],['5 - 9','قمح + خشب + طين'],['10 - 30','قمح + خشب + طين + حديد']],[170,365],end+21,rowh=31,headh=32)
note(p,'قراءتان موضحتان قبل التنفيذ','100 قمح وخشب تعني 100 من كل مورد. ذكر الحديد لفارس الجمل عند 7 يتعارض مع القاعدة العامة؛ طُبقت القاعدة العامة: الحديد يبدأ من مستوى مبنى التدريب 10.',end+176,103)
txt(p,'مصدر تكلفة الأنواع الستة: رسالة المستخدم الأخيرة. موارد الكبش والمنجنيق مقترحة، ولم يُعَد توزيع تكلفة الطين والحديد على موارد أخرى.',34,793,527,26,9.8,color='#536571')

# 4 - Building curve for infantry.
def timepage(title,ids,explanation):
    p=newpage(title,explanation)
    hs=['المستوى','تخفيض الوقت']+[NAMES[x] for x in ids]
    widths=[66,100]+[(535-166)/len(ids)]*len(ids)
    rows=[]
    for level in range(1,31):rows.append([str(level),num(red(level)*100)+'%']+[tm(BASE_QUOTES[(i,level)]['seconds']) for i in ids])
    table(p,hs,rows,widths,184,rowh=19.3,headh=41,size=11.5)
    txt(p,'أوقات الوحدة عند حداد 0. تُحسب المدة الدقيقة أولًا، ثم تُقرّب الدفعة إلى الثانية الأعلى؛ لا تُضرب مدة الوحدة المدوّرة في العدد.',34,807,527,22,9.8,color='#536571')
timepage('أوقات المشاة: مبنى 1 إلى 30',['LightInfantry','Archer','SpearInfantry'],'التخفيض يتزايد تدريجيًا؛ أثر الترقية في المستويات الأخيرة أكبر من المستويات الأولى.')
timepage('أوقات الفرسان: مبنى 1 إلى 30',['LightCavalry','CamelCavalry','HeavyCavalry'],'قصر الأبطال يفتح الأنواع عند 3 و7 و10. مستوى الإسطبل هو محور الوقت والموارد في هذا الجدول.')
timepage('أوقات الحصار: مبنى 1 إلى 30',['BatteringRam','FireCatapult'],'افتتاح الورشة عند مستوى قلعة 10 في نموذج الإتاحة. أوقات المبنى الأولى تبقى ظاهرة للمقارنة.')

# 7 - Forge exact factors.
p=newpage('الحداد: الأساس ثم المستويات 1 إلى 30','السرعة والحمولة ثابتتان؛ الحداد يغيّر القوة والموارد وجهد التدريب فقط.')
rows=[]
for f in range(31):rows.append([str(f),num(5*f)+'%',num(1+.06*f,2)+'×',num(1+.04*f,2)+'×',num(UNITS['LightCavalry']['attack']*(1+.05*f),3)])
table(p,['الحداد','زيادة القوة','معامل الموارد','معامل الوقت','هجوم فارس العرب'],rows,[66,100,118,118,133],184,rowh=18.55,headh=41,size=11.3)
txt(p,'المستوى 0 مرجع بلا تطوير، وتبقى المستويات القابلة للتطوير 1 إلى 30. معدلا الموارد 6% والجهد 4% لكل مستوى محفوظان من مقترح المحاكي السابق.',34,805,527,25,9.7,color='#536571')

# 8 - Economy, availability, integration contract.
p=newpage('الذهب وشروط الإتاحة والتطبيق','تفسير القرارات والافتراضات حتى لا تختلط بقواعد اللعبة المنشورة.')
note(p,'التدريب والإنهاء بالذهب','الانتظار الطبيعي: 0 ذهب مع دفع الموارد. إنهاء الوقت: ذهب إضافي مع بقاء الموارد. اقتراح التسعير 96 ثانية عمل مقابل ذهب واحد، ليبقى أبو هراوة الأساسي وحدة واحدة = ذهب واحد.',184,105)
table(p,['وحدات الدفعة','خصم الشريحة'],[['1 - 100','0%'],['101 - 1,000','2%'],['1,001 - 5,000','5%'],['5,001 - 10,000','10%'],['10,001 - 50,000','15%'],['50,001 وما فوق','20%']],[335,200],306,rowh=25,headh=34)
txt(p,'الخصم على الوحدات داخل كل شريحة، وليس على كامل الطلب بأعلى نسبة. عند تعدد الدفعات تُحسب الشرائح والتقريب لكل دفعة. سعة الطابور السابقة مستخدمة لهذا الغرض فقط؛ لم نستخدم سعة الجندي أو صيانة القمح من الصور.',34,501,527,70,11.8)
note(p,'شروط الفتح منفصلة عن حسبة الموارد','فارس العرب: قصر الأبطال 3. فارس الجمل: قصر الأبطال 7. سلاح الفرسان: قصر الأبطال 10. الورشة: قلعة 10 كقراءة سياقية. عرض تكلفة وحدة مغلقة في المحاكي يُوسم بأنه معاينة فقط.',587,105)
txt(p,'عند توفر سلاح الفرسان في قصر الأبطال 10، تطلب الأربعة موارد إذا كان الإسطبل نفسه 10 أو أعلى. إبقاء الإسطبل أقل يُبقي موارده بحسب مرحلته؛ لم يُضَف شرط مبنى جديد دون نص صريح. أي قصد مختلف لفتح الموارد يحتاج قرارًا موحدًا قبل تطبيقه في خادم اللعبة.',34,710,527,78,11.3,color='#536571')

# 9 - Detailed formulas and release evidence.
p=newpage('معادلات التنفيذ ومصدر كل قرار','المحاكي والملفان يتبعون إصدار البيانات نفسه، دون كتابة على حسابات اللاعبين.')
formulae=[('تخفيض الوقت حسب المبنى','x = (B - 1) / 29; R = 0.8 × (0.4x + 0.6x²)'),('القوة لكل خاصية','P = BaseP × (1 + 0.05F)'),('تكلفة المورد المفتوح للوحدة','Resource = CEILING(BaseResource × (1 + 0.06F))'),('مدة الدفعة بالثواني','Seconds = CEILING(BaseSeconds × N × (1 + 0.04F) × (1 - R))')]
y=184
for title,formula in formulae:
    txt(p,esc(title),34,y,527,24,13,bold=True)
    p.draw_rect(fitz.Rect(30,y+28,565,y+66),color=None,fill=PALE)
    txt(p,esc(formula),40,y+33,515,28,10.5,'#245956','left',ltr=True)
    y+=84
txt(p,'B مستوى مبنى التدريب من 1 إلى 30. F مستوى الحداد من 0 إلى 30. N عدد وحدات الدفعة. يُطبَّق قفل المورد قبل حساب تكلفته. لا تدخل السرعة أو الحمولة في معادلات الحداد.',34,526,527,68,12)
note(p,'ما ثبت وما يزال مقترحًا','ثابت من المستخدم: الأنواع الستة، قوتها وأوقاتها بالصور، مواردها، الفئات وسرعاتها وحمولتها، وإلغاء الصحة ورامي الخيل. مقترح: منحنى توزيع 80%، موارد ووقت الحصار، تحويل الوقت إلى ذهب، ومعاملا تكلفة الحداد وجهده.',608,115)
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
