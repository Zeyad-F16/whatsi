/**
 * gemini.js
 * طبقة التواصل مع Gemini API.
 * مسؤولة عن إرسال المحادثات وتلقي التقارير المفصلة.
 */

const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// استخدم نموذج Flash-Lite منخفض التكلفة لكل الطلبات. لا يوجد رجوع تلقائي
// إلى نموذج أغلى حتى لا ترتفع الفاتورة بصمت عند تعذر النموذج الأساسي.
const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const CANDIDATE_MODELS = [GEMINI_MODEL];
const PRICE_PER_MILLION = { textInput: 0.25, audioInput: 0.50, cachedTextInput: 0.025, cachedAudioInput: 0.05, output: 1.50 };
let usageRecorder = null;

function setUsageRecorder(recorder) { usageRecorder = recorder; }

function errorCode(error) {
  const raw = error && (error.status || error.code || error.name) || 'UNKNOWN';
  return String(raw).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 80) || 'UNKNOWN';
}

async function recordUsage(response, { callType, model, accountId = null, status = 'success', error = null, audioInput = false }) {
  if (!usageRecorder) return;
  const meta = response && response.usageMetadata || {};
  const inputTokens = Number.isFinite(meta.promptTokenCount) ? meta.promptTokenCount : null;
  const outputTokens = Number.isFinite(meta.candidatesTokenCount) ? meta.candidatesTokenCount : null;
  const thinkingTokens = Number.isFinite(meta.thoughtsTokenCount) ? meta.thoughtsTokenCount : null;
  const cachedInputTokens = Number.isFinite(meta.cachedContentTokenCount) ? meta.cachedContentTokenCount : 0;
  const details = meta.promptTokensDetails || [];
  const reportedAudioTokens = details.filter(item => String(item.modality).toUpperCase() === 'AUDIO').reduce((sum, item) => sum + (Number(item.tokenCount) || 0), 0);
  const inputAudioTokens = audioInput ? (reportedAudioTokens || inputTokens || 0) : reportedAudioTokens;
  const inputTextTokens = inputTokens === null ? null : Math.max(0, inputTokens - inputAudioTokens);
  const nonCachedTextTokens = Math.max(0, (inputTextTokens || 0) - cachedInputTokens);
  const billableOutput = (outputTokens || 0) + (thinkingTokens || 0);
  const estimatedCostUsd = inputTokens === null && outputTokens === null ? null :
    (nonCachedTextTokens * PRICE_PER_MILLION.textInput + inputAudioTokens * PRICE_PER_MILLION.audioInput +
      cachedInputTokens * PRICE_PER_MILLION.cachedTextInput + billableOutput * PRICE_PER_MILLION.output) / 1_000_000;
  try {
    await usageRecorder({ callType, accountId, model, status, inputTokens, inputTextTokens, inputAudioTokens,
      cachedInputTokens, outputTokens, thinkingTokens, estimatedCostUsd, errorCode: error ? errorCode(error) : null });
  } catch (loggingError) {
    console.warn('[Gemini] Could not persist usage metrics:', loggingError.message);
  }
}

// Prompt-based assessment criteria distilled from Khatwa's sales playbook.
const SALES_PLAYBOOK_RUBRIC = `
## المرجع الحاكم: منهج استشارة الطالب والتسجيل (Khatwa SalesPlaybook)
قيّم السلوك وفق المرحلة الظاهرة في المحادثة، لا وفق الإغلاق وحده:
1. فهم نوع العميل ومرحلة رحلته قبل البيع: طالب جديد يستكشف، لديه معلومات سابقة متضاربة، أو مر بتجربة سيئة وفقد الثقة.
2. الاستماع وبناء علاقة وثقة وراحة واحترام الطالب كشخص؛ تجنب تحويل الحوار إلى استجواب أو افتراض فهم احتياجه.
3. اكتشاف الخلفية والدافع والأهداف والتخصص والاهتمامات والتوقيت والخطة الزمنية، والمخاوف والاعتراضات مبكرًا. افهم ما يعرفه الطالب فعلًا قبل الشرح.
4. تحديد صاحب القرار ودور ولي الأمر/المؤثرين عند الحاجة.
5. تصحيح المعلومات غير الدقيقة باحترام ووضوح وأدلة واقعية. لا تسخر من آراء الطالب ولا تنتقد المكاتب الأخرى ولا تجادل لإثبات خطأ العميل.
6. مطابقة الشرح والترشيح مع احتياجات الطالب؛ لا تفرض تخصصًا ولا تبدأ بعرض الجامعات أو الأسعار أو الإقناع قبل بناء الثقة وفهم الاحتياج.
7. معالجة الاعتراضات بإنصات وتفهم ومعلومات محددة وصادقة. تجنب الوعود غير الواقعية والضغط للإغلاق.
8. إنهاء الحوار بخطوة تالية واضحة ومناسبة لدرجة جاهزية الطالب، مع متابعة متفق عليها عند الحاجة.

الأوزان من 100: فهم المرحلة والاحتياج (20)، الاستماع وبناء الثقة (20)، اكتشاف الدوافع والمخاوف وصاحب القرار (15)، ملاءمة ودقة المعلومات والتوصية (20)، معالجة الاعتراضات والأمانة وعدم الضغط (15)، الخطوة التالية والمتابعة (10). قيّم المحور فقط بقدر ما تسمح به الأدلة؛ اكتب «غير قابل للتقييم» للمحور الذي لا يظهر بالعينة ولا تخصم عليه. أظهر النقاط وأدلة مقتبسة، ولا تختلق حقائق عن الجامعات أو الأسعار أو التسجيل. هذا توجيه للموديل وقت التقييم وليس تدريبًا دائمًا أو fine-tuning.
`;

/**
 * تحليل محادثات يوم كامل وإصدار تقرير شامل.
 * @param {string} formattedChats - النص المنسق للمحادثات النصية
 * @param {object} stats          - إحصائيات أساسية
 * @param {string} reportDate     - تاريخ التقرير
 * @param {string} audioSummary   - ملخص الرسائل الصوتية المحلّلة (اختياري)
 */
async function analyzeDailyChats(formattedChats, stats, reportDate, audioSummary = null, accountId = null, period = 'today') {
  const today = reportDate || new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const prompt = `
أنت خبير في تقييم جودة أداء فرق المبيعات (Senior Sales Quality Auditor) ذو خبرة 20 عاماً في مجال السيلز في السوق المصري والعربي.

## مهمتك:
ستحلل سجل محادثات واتساب خلال الفترة المحددة (${today}).

## إحصائيات الفترة المحددة:
- عدد ممثلي المبيعات النشطين: ${stats.accounts || 0}
- إجمالي المحادثات المختلفة مع العملاء: ${stats.chats || 0}
- إجمالي الرسائل المرسلة والمستقبلة: ${stats.total_messages || stats.messages || 0}
- الرسائل الصادرة من السيلز: ${stats.sales_messages || 0}
- الرسائل الواردة من العملاء: ${stats.customer_messages || 0}
الأعداد أعلاه محسوبة مباشرة من قاعدة البيانات بعد تطبيق فلتر السيلز والتاريخ المختارين. اعرضها كما هي دون إعادة تقديرها أو استبدالها بعدّ محتوى التقرير.
- ليدات جديدة محسوبة من سجل الاتصال: ${stats.leadCount || 0}
- فولو أب محسوب من سجل الاتصال: ${stats.followupCount || 0}
- توزيع الشاتات والرسائل لكل حساب (محسوب من قاعدة البيانات): ${JSON.stringify(stats.perAccount || {})}
- الفترة: ${period === 'last48h' ? 'آخر 48 ساعة متحركة' : 'اليوم من منتصف الليل حتى الآن'}

## مؤشرات محسوبة محليًا للرسائل النصية فقط (JSON):
${JSON.stringify(stats.textActivityByAccount || {}, null, 2)}
هذه المؤشرات محسوبة من الطوابع الزمنية محليًا وليست تقديرات. وضّح أنها للرسائل النصية فقط؛ لا تنسبها إلى الصوت ولا تجمعها مع أعداد قاعدة البيانات مرة أخرى.

## المحادثات الكاملة (تتضمن بيانات سرعة الرد لكل سيلز):
${formattedChats}

${audioSummary ? `## الرسائل الصوتية المسجّلة وتفريغها:\n${audioSummary}\n` : ''}

${SALES_PLAYBOOK_RUBRIC}

## التعليمات:
اكتب تقريرًا إداريًا عربيًا شاملًا على غرار تقرير تدقيق مبيعات منظم: مقدمة تحدد ممثل المبيعات والحساب والفترة من البيانات المتاحة، ثم الأقسام الأربعة أدناه بالترتيب، ثم خلاصة موجزة للإدارة. لا تخترع اسم مؤسسة أو موظف أو تاريخ أو معلومة غير موجودة. لا تختصره إلى ملخص تنفيذي.

## قاعدة إلزامية للاستدلال وربط كل ملاحظة بصاحبها:
- كل وصف أو استنتاج عن سلوك السيلز (مثل التأخر، ضعف الاستماع، الضغط، الإهمال، المتابعة الجيدة، أو دقة الشرح) يجب أن يذكر رقم واتساب الطالب كما ورد في عنوان المحادثة، ثم يورد اقتباسًا حرفيًا قصيرًا من الرسائل وتوقيته.
- افصل بوضوح بين «الواقعة»: ما قاله أو فعله السيلز حرفيًا، و«الاستنتاج»: ما قد يدل عليه ذلك السلوك، و«الأثر المحتمل»: أثره الممكن على الطالب. لا تعرض الاستنتاج كحقيقة مؤكدة.
- عند عدم توفر رقم الهاتف، اذكر «رقم واتساب غير متاح» واربط الدليل بمعرّف الشات البديل المذكور في العنوان؛ لا تخترع رقمًا أو تنسب اقتباسًا لشخص آخر.
- لا تستنتج صفة دائمة أو نية من كلمة منفردة مثل «أيوة» أو «تمام»؛ اقرأ الرسالة في سياق الحوار، واشرح حدود الاستدلال.
- لا تعرض أرقام الطلاب في المقدمة أو مؤشرات النشاط أو جداول الإحصاءات؛ اذكرها فقط داخل التقرير بجوار السلوك أو الاقتباس الذي تخصه.
- لا تستنتج نية سلبية من كثرة الرسائل الصوتية أو من وقت الإرسال وحده، ولا تصف الموظف بالكسل أو الإهمال أو الاستهتار. لا تصف صفقة بأنها خاسرة أو مغلقة دون دليل صريح في السجل.
- لا تخترع أسعارًا أو نسبًا أو شروط قبول أو ردًا بديلًا يحتوي معلومات غير موجودة. اجعل صياغة الرد البديل عامة أو ضع موضع المعلومة المطلوب التحقق منها بين أقواس.
- إذا لم يتوفر تفريغ صوت، اذكر أن محتوى الصوت غير متاح ولا تحكم على محتواه أو سبب إرساله. لا تساوِ بين الاعتراض والسلوك الخاطئ تلقائيًا.
- كل نقد للسيلز يجب أن يتضمن: رقم الطالب، التوقيت، الاقتباس الداعم، سبب اعتبار التصرف مشكلة وفق المرجع، بديلًا عمليًا كان يمكن قوله، وخطوة متابعة مقترحة. إذا لم توجد مشكلة مدعومة، قل ذلك صراحة ولا تختلق خطأ.
- لا تكرر نص المحادثة كاملًا؛ اقتبس القدر اللازم فقط لإثبات النقطة.
- افحص الرسائل الكتابية الصادرة من السيلز صراحةً من حيث وضوح الفكرة، ملاءمة الرد لسؤال الطالب، المهنية والاحترام، التعاطف، الاختصار المناسب، سلامة الصياغة، ووضوح الخطوة التالية. لا تعتبر اللهجة المصرية أو الأخطاء الإملائية البسيطة خطأً إلا إذا أثرت فعلاً في الفهم أو المهنية.
- ميّز بصريًا وبعبارات مباشرة بين **خطأ كتابي مثبت** و**فرصة لتحسين الأسلوب**، واكتب هذين الوسمين بصيغة Markdown العريضة نفسها. عند ذكر خطأ، اعرض رقم الطالب والتوقيت والعبارة الأصلية القصيرة حرفيًا، ثم وضّح أثرها وصياغة بديلة أفضل. لا تصف تفضيلًا أسلوبيًا بأنه خطأ.
- أضف في القسم الأول فقرة بعنوان «جودة الرسائل الكتابية والأسلوب» تلخص نقاط القوة والأخطاء الكتابية المثبتة، مع أدلة قصيرة؛ وإذا لم يظهر خطأ واضح فاكتب ذلك صراحة. هذا تقييم وصفي ضمن المحاور القائمة، ولا تضف وزنًا جديدًا إلى مجموع الدرجات.

### أولاً: التقييم العام لكل ممثل مبيعات:
- اذكر الدرجة الإجمالية من 100 ووصفًا مهنيًا متزنًا لمستوى الأداء، ثم جدول محاور المرجع: المحور، الوزن، الدرجة، السبب والدليل. اجعل التبرير في الجدول دقيقًا وقابلًا للتحقق، وبجواره رقم الطالب والاقتباس والتوقيت عند الاستدلال على سلوك.
- اعرض نقاط القوة ومجالات التطوير كلًا على حدة. استخدم أمثلة من عدة محادثات عند توفرها؛ لا تفرض عددًا ثابتًا إذا لم تدعمه الأدلة، ولا تعمم سلوك محادثة واحدة على كل الموظف.
- قيّم جودة الرسائل النصية الصادرة من السيلز والتفريغات الصوتية المتاحة فقط. خصّص فقرة واضحة لأسلوب الكتابة كما في التعليمات أعلاه. انقل تحليل النبرة كما هو إذا وُجد، واعتبره قرينة مساعدة لا حكمًا على النية.

### ثانياً: مراجعة تفصيلية لجميع المحادثات — لا تكتفِ بنماذج مختارة:
أنشئ عنوانًا مستقلًا لكل محادثة، واذكر اسم الطالب أو رقمه المتاح في هذا القسم فقط. راجع جميع المحادثات الواردة واحدةً واحدة؛ لا تكتب «مراجعة مختارة» ولا تستبدل بقية المحادثات بأمثلة قليلة. لكل محادثة اكتب: حالة العميل/الصفقة بحذر، ملخص احتياجه وما صرّح به، تقييمًا واضحًا لجودة الرسائل الكتابية الصادرة من السيلز، ما فعله السيلز جيدًا، الأخطاء المثبتة أو فرص التحسين مع اقتباس وتوقيت ورقم الطالب، بديل رد مناسب عند الحاجة، والخطوة التالية. اجعل الخطأ المثبت بارزًا ومنفصلًا عن فرصة التحسين. إذا لم يظهر خطأ كتابي، قل «لم يظهر خطأ كتابي مثبت في الرسائل المتاحة». إذا كانت المحادثة قصيرة فاذكر حدود الدليل بدل الحشو. استهدف 100–180 كلمة لكل محادثة ذات سجل كافٍ.

### ثالثاً: اعتراضات العملاء وفرص التحسين (اختياري):
- أظهر هذا القسم فقط إذا وجدت اعتراضًا محددًا فعلًا في الرسائل. لكل اعتراض، اذكر موضوعه بوضوح (مثل السعر أو مدة الدراسة)، ورقم الطالب والتوقيت، واقتباسًا قصيرًا يثبت الاعتراض، ثم اشرح رد السيلز وما كان جيدًا أو ما الخطوة الأفضل. إذا لم يظهر اعتراض واضح، احذف القسم بالكامل. ممنوع كتابة مقدمات عامة أو جمل ناقصة مثل «الاعتراضات تركزت حول» دون تسمية الاعتراض ودليل عليه.
- لا تكرر أعداد المحادثات أو الرسائل أو الصادر والوارد أو الليدات والفولو أب؛ فهي معروضة بالفعل في جدول الإحصائيات أعلى التقرير.
- لا تذكر نسبة الاستجابة الاحترافية أو إغلاق الصفقات إلا إذا توفر تعريف واضح وبسط ومقام من السجل؛ وإلا اكتب أن النسبة غير قابلة للحساب بدقة. لا تصف أي صفقة بأنها مفقودة أو مغلقة بلا قرينة صريحة.

### رابعاً: توصيات تدريبية:
- ضع توصيات عملية مرتبة حسب الأولوية، وكل توصية ترتبط بسلوك موثق أو تتضح أنها توصية عامة، وتتضمن تدريبًا أو صياغة بديلة وطريقة متابعة التحسن. تجنب ذكر بروتوكول أو سياسة ملزمة على أنها قائمة ما لم يثبت ذلك في المدخل.

**مهم جداً**: لا تذكر أي حكم على سلوك أي سيلز من دون رقم الطالب أو معرّف الشات، واقتباس حقيقي، وتوقيت متاح. لا تحذف دليلًا بحجة الاختصار، ولا تخلط بين محادثتين أو حسابين.

استخدم عناوين وترقيمًا وقوائم واضحة وجدولًا حقيقيًا لمحاور التقييم، مثل تقرير مرفوع للإدارة. افصل الحقائق المحسوبة عن التقييم النوعي. أجب بالعربية بالكامل، ولا تخمّن الأرقام أو أسماء العملاء أو نتائج البيع، واربط كل نقد باقتباس من السجل.

## صيغة الإخراج:
أعد JSON صالحًا فقط بالمفاتيح التالية: report (نص التقرير Markdown كاملًا)، dailyScores (مصفوفة تقييم يومي عنصر واحد لكل حساب في التوزيع أعلاه). كل عنصر يحتوي accountId (المعرف حرفيًا من التوزيع)، accountName، overallScore عددًا صحيحًا من 0 إلى 100، وimprovement (أهم نقطة تطوير مدعومة بمثال قصير). لا تسقط حسابًا ولا تخترع معرفًا.
`;

  const scoreSchema = { type: 'OBJECT', properties: {
    accountId: { type: 'STRING' }, accountName: { type: 'STRING' }, overallScore: { type: 'INTEGER' }, improvement: { type: 'STRING' }
  }, required: ['accountId', 'accountName', 'overallScore', 'improvement'] };
  const responseSchema = { type: 'OBJECT', properties: {
    report: { type: 'STRING' }, dailyScores: { type: 'ARRAY', items: scoreSchema }
  }, required: ['report', 'dailyScores'] };

  let lastError = null;

  for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
    const model = CANDIDATE_MODELS[i];
    let response = null;
    let usageRecorded = false;
    try {
      console.log(`[Gemini] Sending request to Gemini API (model: ${model})...`);
      
      const maxOutputTokens = Math.min(32000, Math.max(16000, (Number(stats.chats) || 1) * 240));
      response = await ai.models.generateContent({ model, contents: prompt, config: {
        maxOutputTokens, responseMimeType: 'application/json', responseSchema
      } });
      await recordUsage(response, { callType: 'daily_report', model, accountId });
      usageRecorded = true;
      const output = JSON.parse(response.text || '{}');
      if (typeof output.report !== 'string' || !Array.isArray(output.dailyScores)) {
        throw new Error('استجابة التقرير لا تطابق مخطط التقييم اليومي');
      }

      console.log(`[Gemini] Report received successfully using ${model}.`);
      return {
        success: true,
        report: output.report,
        scores: output.dailyScores,
        stats: stats,
        date: today,
        model: model
      };
    } catch (error) {
      console.warn(`[Gemini] Model ${model} failed: ${error.message}.`);
      lastError = error;
      
      if (!usageRecorded) {
        await recordUsage(response, { callType: 'daily_report', model, accountId,
          status: response ? 'invalid_response' : 'failed', error });
      }
    }
  }

  console.error('[Gemini] All fallback models failed:', lastError);
  
  // صياغة رسالة واضحة للمستخدم
  let userFriendlyError = lastError ? lastError.message : 'خطأ غير معروف في الاتصال';
  if (userFriendlyError.includes('503') || userFriendlyError.includes('high demand') || userFriendlyError.includes('UNAVAILABLE')) {
    userFriendlyError = 'تشهد خوادم الذكاء الاصطناعي ضغطاً استثنائياً مؤقتاً حالياً (High Traffic). يرجى الضغط على "إعادة المحاولة" بعد ثوانٍ قليلة.';
  }

  return {
    success: false,
    error: userFriendlyError,
    stats: stats,
    date: today
  };
}

/** Analyze only unseen or changed messages and return an append-only report update. */
async function analyzeDailyChatsDelta(formattedDelta, stats, reportDate, audioSummary, previousScores = [], accountId = null, period = 'today') {
  const prompt = `
أنت مدقق جودة أداء مبيعات. هذا تحديث تزايدي لتقرير محفوظ سابقًا عن الفترة ${reportDate} (${period === 'last48h' ? 'آخر 48 ساعة' : 'اليوم'}).

حلّل الرسائل الجديدة أو التي اكتمل تفريغها فقط كما وردت أدناه. لا تعِد تحليل أي محادثة قديمة ولا تكرر نص التقرير السابق. أخرج ملحقًا يُضاف إلى نهاية التقرير المحفوظ، يعرض التغيير السلوكي الجديد بالتفصيل، ولا يكرر أعداد النشاط الظاهرة في جدول الإحصائيات أعلى التقرير.

الأعداد الحالية الدقيقة: ${JSON.stringify(stats)}
التقييمات المحفوظة قبل هذا التحديث: ${JSON.stringify(previousScores)}

## رسائل نصية جديدة أو متغيرة فقط:
${formattedDelta || 'لا توجد رسائل نصية جديدة.'}

${audioSummary ? `## تفريغات صوتية جديدة أو مكتملة فقط:\n${audioSummary}\n` : ''}

قواعد التقرير:
- لكل استنتاج سلوكي اذكر رقم واتساب الطالب كما يظهر في عنوان المحادثة، وتوقيتًا واقتباسًا حرفيًا. إذا لم يوجد رقم فاستخدم معرّف الشات وصرّح بأن الهاتف غير متاح.
- اكتب لكل محادثة متأثرة ما الجديد، وما الذي يثبته الدليل، وما أثره المحتمل، والخطوة التالية. لا تكرر المحادثات أو الأدلة القديمة.
- إذا تضمنت الرسائل الجديدة نصوصًا صادرة من السيلز، قيّم وضوحها ومهنيتها وتعاطفها وملاءمتها للسؤال. اذكر **خطأ كتابي مثبت** فقط عند وجود دليل واضح، مع رقم الطالب والتوقيت والاقتباس الحرفي وأثره وصياغة بديلة؛ وافصل ذلك عن **فرصة لتحسين الأسلوب**. اكتب الوسمين بالخط العريض، وإذا لم يوجد خطأ مدعوم فاكتب ذلك، ولا تنتقد اللهجة أو الأخطاء البسيطة غير المؤثرة.
- افصل بين الحقيقة والاستنتاج، ولا تخترع الأسعار أو نتائج الصفقات أو نية الموظف. لا تحكم على تفريغ صوت لم يكتمل.
- استخدم أرقام قاعدة البيانات الحالية كما هي ولا تعِد عدّها من نص الرسائل.
- dailyScores: أعد تقييمًا محدثًا لكل حساب ظاهر في stats.perAccount، مع الاستفادة من الدرجة السابقة كخط أساس ومن الأدلة الجديدة فقط كتغيير. لا تعِد تقييم تفاصيل سابقة غير موجودة هنا، ولا تخفض أو ترفع الدرجة دون دليل جديد. اكتب improvement موجزًا ومدعومًا.
- إذا لم يوجد تغيير سلوكي ذي دلالة، اجعل appendix فارغًا. لا تنشئ عنوان ملحق أو عبارة عامة لمجرد وجود رسائل جديدة.

أعد JSON صالحًا فقط: appendix (نص Markdown للملحق)، dailyScores (مصفوفة عنصر لكل حساب نشط تتضمن accountId وaccountName وoverallScore بين 0 و100 وimprovement).
`;
  const scoreSchema = { type: 'OBJECT', properties: {
    accountId: { type: 'STRING' }, accountName: { type: 'STRING' }, overallScore: { type: 'INTEGER' }, improvement: { type: 'STRING' }
  }, required: ['accountId', 'accountName', 'overallScore', 'improvement'] };
  const responseSchema = { type: 'OBJECT', properties: {
    appendix: { type: 'STRING' }, dailyScores: { type: 'ARRAY', items: scoreSchema }
  }, required: ['appendix', 'dailyScores'] };
  const model = GEMINI_MODEL;
  try {
    // Cap output using only the delta size; don't pay for a full-report-sized
    // answer just because the cached report covers many historical chats.
    const chats = Math.max(1, Number(stats.deltaChats) || 1);
    const maxOutputTokens = Math.min(6000, Math.max(1200, chats * 700));
    const response = await ai.models.generateContent({ model, contents: prompt, config: {
      maxOutputTokens, responseMimeType: 'application/json', responseSchema
    } });
    await recordUsage(response, { callType: 'daily_report', model, accountId });
    const output = JSON.parse(response.text || '{}');
    if (typeof output.appendix !== 'string' || !Array.isArray(output.dailyScores)) throw new Error('استجابة تحديث التقرير غير مكتملة');
    return { success: true, appendix: output.appendix, scores: output.dailyScores, model };
  } catch (error) {
    await recordUsage(null, { callType: 'daily_report', model, accountId, status: 'failed', error });
    return { success: false, error: error.message || 'تعذر تحليل الرسائل الجديدة' };
  }
}


/**
 * تحليل محادثة واحدة بشكل فوري.
 */
async function analyzeSingleChat(messages, customerName, salesRepName, accountId = null) {
  const formattedChat = messages
    .map(m => `[${m.display_time || m.timestamp}] ${m.sender === 'sales' ? `${salesRepName} (السيلز)` : `${customerName} (العميل)`}: ${m.text}`)
    .join('\n');

  const prompt = `
أنت خبير مبيعات. حلل هذه المحادثة بين سيلز وعميل وأعطني:
${SALES_PLAYBOOK_RUBRIC}
1. تقييم أداء السيلز من 100 وفق أوزان المرجع، مع الدرجات والأدلة المتاحة فقط
2. الأخطاء المرتكبة مع الرد البديل الصح
3. حالة الصفقة (ناجحة/مهتم/ضائعة/تحتاج متابعة)
4. توصية واحدة لتحسين الأداء

المحادثة:
${formattedChat}

أجب بالعربية بشكل مختصر وعملي.
`;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: { maxOutputTokens: 1200 },
      });
      await recordUsage(response, { callType: 'single_chat', model, accountId });
      return { success: true, analysis: response.text, model };
    } catch (error) {
      await recordUsage(null, { callType: 'single_chat', model, accountId, status: 'failed', error });
      console.warn(`[Gemini] Single chat analysis with ${model} failed, trying next...`);
    }
  }

  return { success: false, error: 'تعذر التحليل بواسطة الموديلات المتاحة' };
}

/**
 * تحليل رسالة صوتية واحدة: تفريغ الكلام + نبرة الصوت.
 * @param {string} filePath - مسار ملف OGG المحفوظ
 * @param {string} sender   - 'sales' | 'customer'
 * @param {string} repName  - اسم السيلز
 * @param {string} customerName - اسم العميل
 */
async function transcribeAudio(filePath, sender, repName, customerName, accountId = null) {
  const fs = require('fs');

  if (!fs.existsSync(filePath)) {
    return { success: false, error: 'ملف الصوت غير موجود' };
  }

  const audioData = (await fs.promises.readFile(filePath)).toString('base64');
  const senderLabel = sender === 'sales'
    ? `ممثل المبيعات (${repName})`
    : `العميل (${customerName})`;

  const prompt = `استمع إلى التسجيل الصوتي من ${senderLabel}. أخرج النتيجة بهذا التنسيق فقط:
<TRANSCRIPT>
التفريغ النصي الكامل والدقيق باللغة المنطوقة، دون تلخيص. إذا تعذر فهم جزء فاكتب [غير واضح].
</TRANSCRIPT>
<TONE>
وصف قصير للنبرة المسموعة فقط، مثل: هادئ وواثق، متردد، مستعجل، منزعج، محايد، أو غير واضح. لا تستنتج شخصية المتحدث أو نيته أو جودة أداء المبيعات.
</TONE>`;

  // نستخدم CANDIDATE_MODELS لأنها تدعم multimodal
  for (const model of CANDIDATE_MODELS) {
    try {
      console.log(`[Gemini] Transcribing audio with ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'audio/ogg',
                  data: audioData,
                },
              },
            ],
          },
        ],
      });
      await recordUsage(response, { callType: 'audio_transcription', model, accountId, audioInput: true });

      const fullText = response.text || '';
      const transcriptMatch = fullText.match(/<TRANSCRIPT>\s*([\s\S]*?)\s*<\/TRANSCRIPT>/i);
      const toneMatch = fullText.match(/<TONE>\s*([\s\S]*?)\s*<\/TONE>/i);
      const transcriptFallback = fullText.replace(/<TONE>[\s\S]*?<\/TONE>/i, '').trim();

      return {
        success:      true,
        transcript:   (transcriptMatch ? transcriptMatch[1] : transcriptFallback).trim(),
        toneAnalysis: toneMatch ? toneMatch[1].trim() : null,
        rawResponse:  fullText,
        model,
      };
    } catch (err) {
      await recordUsage(null, { callType: 'audio_transcription', model, accountId, status: 'failed', error: err, audioInput: true });
      const msg = err.message || '';
      // انتقل مباشرة إلى الموديل الاحتياطي لتقليل انتظار تفريغ الصوت.
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`[Gemini] Quota hit on ${model} — trying the next model immediately...`);
      } else if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
        console.warn(`[Gemini] ${model} unavailable — trying the next model immediately...`);
      } else {
        console.warn(`[Gemini] Audio model ${model} failed: ${msg.slice(0, 120)}`);
      }
    }
  }

  return { success: false, error: 'تعذر تحليل الصوت بواسطة الموديلات المتاحة' };
}

/**
 * اختبار الاتصال بـ Gemini API.
 */
async function testConnection() {
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: 'قل "مرحباً! اتصال Gemini يعمل بنجاح." فقط.',
      });
      await recordUsage(response, { callType: 'connection_test', model });
      return { success: true, message: `${response.text.trim()} (الموديل: ${model})`, model };
    } catch (error) {
      await recordUsage(null, { callType: 'connection_test', model, status: 'failed', error });
      console.warn(`[Gemini] Test with ${model} failed, trying next...`);
    }
  }
  return { success: false, error: 'تعذر الاتصال بـ Gemini عبر أي من الموديلات المتاحة' };
}


module.exports = {
  setUsageRecorder,
  analyzeDailyChats,
  analyzeDailyChatsDelta,
  analyzeSingleChat,
  transcribeAudio,
  testConnection
};

