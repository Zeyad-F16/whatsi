/**
 * gemini.js
 * طبقة التواصل مع Gemini API.
 * مسؤولة عن إرسال المحادثات وتلقي التقارير المفصلة.
 */

const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// قائمة الموديلات المتاحة مرتبة حسب الأولوية وتوافر السيرفرات
const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
];

// نفس القائمة للصوت (هذه الموديلات multimodal بطبيعتها)
const AUDIO_MODELS = CANDIDATE_MODELS;

/**
 * تحليل محادثات يوم كامل وإصدار تقرير شامل.
 * @param {string} formattedChats - النص المنسق للمحادثات النصية
 * @param {object} stats          - إحصائيات أساسية
 * @param {string} reportDate     - تاريخ التقرير
 * @param {string} audioSummary   - ملخص الرسائل الصوتية المحلّلة (اختياري)
 */
async function analyzeDailyChats(formattedChats, stats, reportDate, audioSummary = null) {
  const today = reportDate || new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const prompt = `
أنت خبير في تقييم جودة أداء فرق المبيعات (Senior Sales Quality Auditor) ذو خبرة 20 عاماً في مجال السيلز في السوق المصري والعربي.

## مهمتك:
ستحلل الآن سجل كامل لمحادثات واتساب لفريق المبيعات خلال يوم عمل كامل (${today}).

## إحصائيات اليوم:
- عدد ممثلي المبيعات النشطين: ${stats.accounts || 0}
- إجمالي المحادثات مع العملاء: ${stats.chats || 0}
- إجمالي عدد العملاء المختلفين الذين تم التواصل معهم: ${stats.chats || 0}
- إجمالي الرسائل المرسلة والمستقبلة: ${stats.total_messages || stats.messages || 0}

## المحادثات الكاملة (تتضمن بيانات سرعة الرد لكل سيلز):
${formattedChats}

${audioSummary ? `## الرسائل الصوتية المسجّلة والمحلّلة:\n${audioSummary}\n` : ''}

## التعليمات:
قم بتحليل شامل ودقيق للمحادثات وأخرج تقريراً مفصلاً يشمل:

### أولاً: التقييم العام لكل سيلز:
- الدرجة الإجمالية من 100
- نقاط القوة (3-5 نقاط محددة)
- مجالات التطوير (3-5 نقاط محددة مع أمثلة من المحادثات)

### ثانياً: مؤشرات النشاط والسرعة لكل سيلز:
استخرج هذه البيانات مباشرة من بيانات الوقت المُضمَّنة في المحادثات:
- **أول رسالة في اليوم**: الوقت واسم العميل
- **آخر رسالة في اليوم**: الوقت واسم العميل
- **متوسط سرعة الرد**: الوقت بين رسالة العميل ورد السيلز
- **أسرع رد**: المدة والوقت
- **أبطأ رد**: المدة والوقت وسبب التأخر المحتمل
- **تقييم الانضباط الزمني**: هل الردود في أوقات العمل؟ هل هناك تأخر متكرر؟

### ثالثاً: تشريح كل محادثة بالتفصيل:
لكل عميل تكلم معه السيلز، حدد:
1. **حالة الصفقة**: مغلقة/مهتم/بارد/ضائعة
2. **الأخطاء المحددة**: اقتبس كلام السيلز الخاطئ وقدم الرد البديل الصحيح
3. **الفرص الضائعة**: ما الذي كان يجب فعله لتحويل العميل

### رابعاً: إحصائيات الأداء:
- عدد العملاء الذين تواصل معهم كل سيلز خلال اليوم (اذكر الرقم لكل سيلز بالاسم)
- معدل الاستجابة الاحترافية
- معدل إغلاق الصفقات
- أكثر الاعتراضات تكراراً وكيف تعامل معها السيلز

### خامساً: توصيات تدريبية:
- 3 توصيات أولوية قصوى لتطوير أداء الفريق

**مهم جداً**: استشهد دائماً بجمل حقيقية من المحادثات في تحليلك لتكون النتائج موثوقة وقابلة للتطبيق.

أجب بالعربية بالكامل، وكن صريحاً ومحدداً في نقدك - هذا التقرير للإدارة وليس للموظف مباشرة.
`;

  let lastError = null;

  for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
    const model = CANDIDATE_MODELS[i];
    try {
      console.log(`[Gemini] Sending request to Gemini API (model: ${model})...`);
      
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
      });

      console.log(`[Gemini] Report received successfully using ${model}.`);
      return {
        success: true,
        report: response.text,
        stats: stats,
        date: today,
        model: model
      };
    } catch (error) {
      console.warn(`[Gemini] Model ${model} failed: ${error.message}.`);
      lastError = error;
      
      // إذا كان هناك موديل تالٍ، ننتظر 1.2 ثانية لتجاوز الضغط المؤقت على السيرفرات
      if (i < CANDIDATE_MODELS.length - 1) {
        console.log('[Gemini] Waiting 1.2s before trying next fallback model...');
        await sleep(1200);
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


/**
 * تحليل محادثة واحدة بشكل فوري.
 */
async function analyzeSingleChat(messages, customerName, salesRepName) {
  const formattedChat = messages
    .map(m => `[${m.display_time || m.timestamp}] ${m.sender === 'sales' ? `${salesRepName} (السيلز)` : `${customerName} (العميل)`}: ${m.text}`)
    .join('\n');

  const prompt = `
أنت خبير مبيعات. حلل هذه المحادثة بين سيلز وعميل وأعطني:
1. تقييم أداء السيلز (1-10)
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
      });
      return { success: true, analysis: response.text, model };
    } catch (error) {
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
async function transcribeAudio(filePath, sender, repName, customerName) {
  const fs = require('fs');

  if (!fs.existsSync(filePath)) {
    return { success: false, error: 'ملف الصوت غير موجود' };
  }

  const audioData = fs.readFileSync(filePath).toString('base64');
  const senderLabel = sender === 'sales'
    ? `ممثل المبيعات (${repName})`
    : `العميل (${customerName})`;

  const prompt = `أنت خبير مبيعات ومحلل نبرة صوت.
استمع للتسجيل الصوتي المرفق من: ${senderLabel}.

أعطني بشكل مختصر وعملي:
1. **التفريغ النصي الكامل**: اكتب كل ما قاله بدقة.
2. **نبرة الصوت**: (واثق / مترددد / عصبي / ترحيبي / مستعجل / غير مبالٍ)
3. **ملاحظة سريعة** (جملة واحدة): هل الأسلوب احترافي؟

أجب بالعربية فقط، بدون مقدمات.`;

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

      const fullText    = response.text || '';
      const transcriptMatch  = fullText.match(/التفريغ[^:]*:\s*([\s\S]+?)(?=\n\d\.|$)/i);
      const toneMatch        = fullText.match(/نبرة[^:]*:\s*([^\n]+)/i);

      return {
        success:      true,
        transcript:   transcriptMatch ? transcriptMatch[1].trim() : fullText.trim(),
        toneAnalysis: toneMatch ? toneMatch[1].trim() : null,
        rawResponse:  fullText,
        model,
      };
    } catch (err) {
      const msg = err.message || '';
      // إذا كانت quota أو server error — ننتظر أطول قبل المحاولة التالية
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`[Gemini] Quota hit on ${model} — waiting 15s before next model...`);
        await sleep(15000);
      } else if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
        console.warn(`[Gemini] ${model} unavailable — waiting 3s...`);
        await sleep(3000);
      } else {
        console.warn(`[Gemini] Audio model ${model} failed: ${msg.slice(0, 120)}`);
        await sleep(1000);
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
      return { success: true, message: `${response.text.trim()} (الموديل: ${model})`, model };
    } catch (error) {
      console.warn(`[Gemini] Test with ${model} failed, trying next...`);
    }
  }
  return { success: false, error: 'تعذر الاتصال بـ Gemini عبر أي من الموديلات المتاحة' };
}


module.exports = {
  analyzeDailyChats,
  analyzeSingleChat,
  transcribeAudio,
  testConnection
};

