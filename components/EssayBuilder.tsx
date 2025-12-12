import React, { useState } from 'react';
import { PenTool, Sparkles, Database, CheckCircle, Search, AlertCircle, Zap } from 'lucide-react';
import { getGeminiClient } from '../lib/gemini';
import { PHILOSOPHER_PROMPT } from '../constants';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface EssayBuilderProps {
    user?: User;
    onUpdateUser?: (u: User) => void;
}

const EssayBuilder: React.FC<EssayBuilderProps> = ({ user, onUpdateUser }) => {
  const [topic, setTopic] = useState('');
  const [method, setMethod] = useState('dialectical'); // جدلية، استقصاء، مقارنة
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'ai' | 'db' | null>(null);

  const normalizeArabic = (text: string) => {
    return text
        .replace(/(أ|إ|آ)/g, 'ا')
        .replace(/(ة)/g, 'ه')
        .replace(/(ى)/g, 'ي')
        .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
  };

  const handleBuild = async () => {
    if (!topic.trim()) return;
    
    // Check points
    if (user && onUpdateUser && user.totalEarnings < 5) {
        alert("عذراً، ليس لديك رصيد كافٍ. تكلفة إنشاء المقالة 5 نقاط. حاول كسب المزيد من النقاط.");
        return;
    }

    setLoading(true);
    setResult('');
    setSource(null);
    
    try {
        const client = getGeminiClient();

        // 1. Search in Database first
        const { data: allPhiloLessons } = await supabase
            .from('lessons_content')
            .select('title, content, section_id')
            .ilike('section_id', '%philosophy%');

        let foundLesson = null;

        if (allPhiloLessons && allPhiloLessons.length > 0) {
            const normTopic = normalizeArabic(topic);
            const topicWords = normTopic.split(' ').filter(w => w.length > 2); 

            // Priority 1: Direct Containment
            foundLesson = allPhiloLessons.find(l => {
                 const normTitle = normalizeArabic(l.title);
                 return normTitle === normTopic || normTitle.includes(normTopic) || normTopic.includes(normTitle);
            });

            // Priority 2: Keyword Overlap
            if (!foundLesson && topicWords.length > 0) {
                const scoredLessons = allPhiloLessons.map(l => {
                    const normTitle = normalizeArabic(l.title);
                    const titleWords = normTitle.split(' ');
                    let matches = 0;
                    topicWords.forEach(w => {
                        if (titleWords.some(tw => tw.includes(w) || w.includes(tw))) matches++;
                    });
                    return { lesson: l, score: matches };
                });
                scoredLessons.sort((a, b) => b.score - a.score);
                const best = scoredLessons[0];
                // Require a decent match score
                if (best.score >= Math.min(2, Math.ceil(topicWords.length * 0.5))) {
                    foundLesson = best.lesson;
                }
            }
        }

        // 2. Prepare the AI Prompt
        let finalPrompt = "";

        if (foundLesson) {
            setSource('db');
            
            // Extract content to text
            let lessonContext = foundLesson.content;
            try {
                const parsed = JSON.parse(lessonContext);
                if (parsed.positions) {
                    // It's structured content, convert to readable string for AI
                    lessonContext = `
                    المشكلة: ${parsed.problem}
                    الموقف الأول: ${parsed.positions[0]?.title}
                    حجج الموقف الأول: ${JSON.stringify(parsed.positions[0]?.theories)}
                    نقد الموقف الأول: ${parsed.positions[0]?.critique || ''}
                    الموقف الثاني: ${parsed.positions[1]?.title}
                    حجج الموقف الثاني: ${JSON.stringify(parsed.positions[1]?.theories)}
                    نقد الموقف الثاني: ${parsed.positions[1]?.critique || ''}
                    التركيب: ${parsed.synthesis}
                    الخاتمة: ${parsed.conclusion}
                    `;
                }
            } catch (e) {
                // Use raw content if parsing fails
            }
            
            finalPrompt = `
            أنت أستاذ فلسفة خبير. لديك "محتوى درس" جاهز من قاعدة البيانات. مهمتك هي **تحرير مقالة فلسفية كاملة** بناءً على هذا المحتوى **حصراً**.

            🛑 **قواعد صارمة جداً (الالتزام بالمحتوى):**
            1. **لا تضف** أي فيلسوف أو قول أو حجة غير موجودة في البيانات أسفله.
            2. **التوسع في الشرح:** قم بصياغة الأفكار الموجودة بأسلوب فلسفي عميق، وسع في شرح الحجج لغوياً واربط بينها، لكن دون جلب معلومات خارجية.
            3. **دمج الأقوال:** لا تضع الأقوال في قائمة. وظفها بذكاء داخل الفقرات لتخدم الفكرة (مثلاً: "وفي هذا السياق يؤكد [الفيلسوف] أن...").

            ⚠️ **منهجية النقد (مهم جداً):**
            في فقرة نقد كل موقف، التزم بالترتيب التالي:
            أ) ابدأ **بنقد إيجابي (تثمين)** موجز (سطرين كحد أقصى) تبرز فيهما قوة الموقف.
            ب) انتقل مباشرة **للنقد السلبي** بشكل مركز وموسع لتبيان العيوب والتناقضات.

            البيانات المرجعية (المصدر):
            ${lessonContext}
            `;

        } else {
            setSource('ai');
            const methodText = method === 'dialectical' ? 'المنهجية الجدلية' : method === 'comparison' ? 'منهجية المقارنة' : 'منهجية الاستقصاء بالوضع';
            
            finalPrompt = `
            ${PHILOSOPHER_PROMPT}
            الموضوع: ${topic}
            المنهجية المطلوبة: ${methodText}

            ⚠️ تعليمات إضافية هامة:
            1. ابدأ المقالة مباشرة بمقدمة فلسفية رصينة.
            2. **التوسع:** اشرح الحجج باستفاضة وعمق فلسفي.
            3. **توظيف الأقوال:** ادمج الأقوال والأمثلة بسلاسة مع الشرح.
            4. **منهجية النقد:** في نقد الخصوم، ابدأ دائماً بـ **تثمين (نقد إيجابي)** موجز للفكرة، ثم أتبعه بـ **نقد سلبي** مركز وقوي.
            `;
        }

        // 3. Call AI
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: finalPrompt
        });
        
        setResult(response.text || 'تعذر الإنشاء.');
        
        // Deduct points
        if (user && onUpdateUser) {
            onUpdateUser({ ...user, totalEarnings: Math.max(0, user.totalEarnings - 5) });
            window.addToast('تم خصم 5 نقاط', 'info');
        }

    } catch (error: any) {
        setResult('حدث خطأ: ' + (error.message.includes('API Key') ? 'يرجى إضافة مفتاح API' : 'تحقق من الشبكة'));
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="animate-fadeIn max-w-4xl mx-auto space-y-4">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white text-center shadow-lg">
            <PenTool className="w-8 h-8 mx-auto mb-2 opacity-90" />
            <h2 className="text-xl font-bold mb-1">منشئ المقالات الذكي</h2>
            <p className="opacity-90 text-xs">يحرر مقالة كاملة بالمنهجية الصحيحة (تثمين ثم نقد) بناءً على الدروس أو التوليد الذكي.</p>
            {user && (
                <div className="mt-2 text-xs bg-white/20 inline-block px-3 py-1 rounded-full font-bold">
                    رصيدك: {user.totalEarnings} | التكلفة: 5 نقاط
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
             {/* Method Selection */}
             <div className="md:col-span-1 space-y-1">
                 <label className="text-xs font-bold text-slate-700 dark:text-gray-300">المنهجية (للتوليد الآلي)</label>
                 <select 
                    value={method} 
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl p-2.5 text-sm outline-none focus:border-purple-500 text-slate-900 dark:text-white transition-colors"
                 >
                     <option value="dialectical">جدلية</option>
                     <option value="investigation">استقصاء بالوضع</option>
                     <option value="comparison">مقارنة</option>
                 </select>
             </div>
             
             {/* Topic Input */}
             <div className="md:col-span-2 space-y-1">
                 <label className="text-xs font-bold text-slate-700 dark:text-gray-300">موضوع المقالة / السؤال الفلسفي</label>
                 <div className="relative">
                    <input 
                        type="text" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="مثال: هل الشعور بالأنا يتوقف على الغير؟"
                        className="w-full bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl p-2.5 pr-10 outline-none focus:border-purple-500 text-slate-900 dark:text-white transition-colors text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleBuild()}
                    />
                    <Search className="absolute right-3 top-2.5 text-slate-400 w-4 h-4" />
                 </div>
             </div>
        </div>

        <button
            onClick={handleBuild}
            disabled={loading || !topic.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold shadow-md disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Sparkles className="w-5 h-5" />}
            <span>إنشاء المقالة</span>
            {user && !loading && <span className="text-[10px] bg-black/20 px-2 rounded-full">-5 <Zap size={8} className="inline"/></span>}
        </button>

        {result && (
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border-l-4 border-purple-500 shadow-md animate-slideIn">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-neutral-800 pb-2">
                    <h3 className="font-bold text-lg text-purple-600 dark:text-purple-400 flex items-center gap-2">
                        {source === 'db' ? <Database size={18} /> : <Sparkles size={18} />}
                        {source === 'db' ? 'مقالة مستخرجة من الدرس (قاعدة البيانات)' : 'مقالة مولدة بالذكاء الاصطناعي'}
                    </h3>
                    <div className="flex gap-2">
                        {source === 'db' && <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle size={10} /> مطابق للمنهاج</span>}
                    </div>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-loose text-slate-800 dark:text-gray-200 text-justify font-medium">
                    {result}
                </div>
            </div>
        )}
    </div>
  );
};

export default EssayBuilder;