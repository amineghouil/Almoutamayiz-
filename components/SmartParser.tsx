import React, { useState, useMemo } from 'react';
import { BrainCircuit, Send, Copy, Check, Type, Brackets, Info, MousePointerClick, RefreshCw, Eraser, Zap } from 'lucide-react';
import { getGeminiClient } from '../lib/gemini';
import { GRAMMAR_PROMPT } from '../constants';
import { User } from '../types';

interface SmartParserProps {
    user?: User;
    onUpdateUser?: (u: User) => void;
}

const SmartParser: React.FC<SmartParserProps> = ({ user, onUpdateUser }) => {
  const [input, setInput] = useState('');
  const [parseType, setParseType] = useState<'word' | 'context'>('word');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // State for Word Selection Mode
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // Split input into words for selection mode
  const words = useMemo(() => {
    if (!input.trim()) return [];
    return input.trim().split(/\s+/);
  }, [input]);

  const toggleWordSelection = (index: number) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index].sort((a, b) => a - b);
      }
    });
  };

  const clearSelection = () => {
    setSelectedIndices([]);
    setResult('');
  };

  const handleParse = async () => {
    if (!input.trim()) return;
    
    // Check points
    if (user && onUpdateUser && user.totalEarnings < 2) {
        alert("عذراً، ليس لديك رصيد كافٍ من النقاط. تكلفة الإعراب 2 نقطة. يمكنك كسب النقاط من الألعاب والدروس.");
        return;
    }

    // Validation for Word Mode
    if (parseType === 'word' && selectedIndices.length === 0) {
        alert("يرجى اختيار كلمة واحدة على الأقل من الأسفل للإعراب.");
        return;
    }

    setLoading(true);
    setResult('');
    
    let userInstruction = "";

    if (parseType === 'word') {
        // Get the actual selected words
        const selectedWords = selectedIndices.map(i => words[i]).join(' - ');
        
        userInstruction = `
        النص الكامل (للسياق فقط): "${input}"
        الكلمات المطلوب إعرابها بدقة: [ ${selectedWords} ]
        
        التعليمات:
        1. أعرب الكلمات المحددة أعلاه فقط إعراباً تاماً ومفصلاً.
        2. اعتمد على "النص الكامل" لفهم موقع الكلمة من الإعراب (فاعل، مفعول به، مضاف إليه... إلخ).
        3. لا تعرب أي كلمة أخرى غير مطلوبة.
        4. قدم الإجابة على شكل قائمة واضحة.
        `;
    } else {
        // Sentence/Context Mode
        userInstruction = `
        النص والسياق: "${input}"
        
        التعليمات:
        1. ابحث في النص عن الجملة أو الجمل الموضوعة بين قوسين (...).
        2. قم بإعراب الجملة التي بداخل القوسين فقط (إعراب جمل: محلها من الإعراب).
        3. إذا لم تجد أقواساً، نبه المستخدم بضرورة تحديد الجملة.
        4. استخدم باقي النص لفهم السياق فقط.
        `;
    }

    try {
        const client = getGeminiClient();
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: GRAMMAR_PROMPT + "\n" + userInstruction
        });
        
        setResult(response.text || 'تعذر الحصول على إجابة، حاول مجدداً.');
        
        // Deduct points on success
        if (user && onUpdateUser) {
            onUpdateUser({ ...user, totalEarnings: Math.max(0, user.totalEarnings - 2) });
            window.addToast('تم خصم 2 نقطة', 'info');
        }

    } catch (error: any) {
        setResult('حدث خطأ: ' + (error.message.includes('API Key') ? 'يرجى إضافة مفتاح API في الإعدادات' : 'تأكد من الاتصال بالإنترنت'));
    } finally {
        setLoading(false);
    }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fadeIn max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 text-white text-center shadow-lg">
            <BrainCircuit className="w-8 h-8 mx-auto mb-2 opacity-90" />
            <h2 className="text-xl font-bold mb-1">المعرب الذكي</h2>
            <p className="opacity-90 text-xs">إعراب دقيق للمفردات والجمل مع فهم السياق.</p>
            {user && (
                <div className="mt-2 text-xs bg-white/20 inline-block px-3 py-1 rounded-full font-bold">
                    رصيدك: {user.totalEarnings} | التكلفة: 2 نقطة
                </div>
            )}
        </div>

        {/* Toggle Mode */}
        <div className="flex bg-slate-200 dark:bg-neutral-800 p-1 rounded-xl">
            <button 
                onClick={() => { setParseType('word'); setResult(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${parseType === 'word' ? 'bg-white dark:bg-neutral-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
            >
                <MousePointerClick className="w-4 h-4" />
                <span>إعراب مفردات (تفاعلي)</span>
            </button>
            <button 
                onClick={() => { setParseType('context'); setResult(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${parseType === 'context' ? 'bg-white dark:bg-neutral-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
            >
                <Brackets className="w-4 h-4" />
                <span>إعراب جمل</span>
            </button>
        </div>

        {/* Instructions Banner */}
        {parseType === 'word' ? (
             <div className="flex items-start gap-2 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg text-xs text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/30">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>اكتب النص كاملاً أولاً، ثم <strong>اضغط على الكلمات</strong> التي تريد إعرابها في الأسفل ليتم تحديدها.</p>
            </div>
        ) : (
            <div className="flex items-start gap-2 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-xs text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/30">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>لإعراب الجمل، يجب وضع الجملة المراد إعرابها بين قوسين <strong>(...)</strong> وكتابة النص المحيط بها لتحديد السياق.<br/>مثال: قال تعالى <strong>(قل هو الله أحد)</strong>.</p>
            </div>
        )}

        {/* Input Area */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-slate-200 dark:border-neutral-800 shadow-sm">
            <textarea
                value={input}
                onChange={(e) => {
                    setInput(e.target.value);
                    if (parseType === 'word') setSelectedIndices([]); // Reset selection on edit
                }}
                placeholder={parseType === 'word' ? "اكتب الجملة كاملة هنا... (ثم اختر الكلمات من الأسفل)" : "اكتب النص وضع الجملة المراد إعرابها بين قوسين (...)"}
                className="w-full h-24 bg-slate-50 dark:bg-black border border-slate-300 dark:border-neutral-700 rounded-xl p-3 outline-none focus:border-indigo-500 transition-colors resize-none text-slate-900 dark:text-white text-base leading-relaxed"
            />
            
            {/* WORD SELECTION AREA */}
            {parseType === 'word' && input.trim().length > 0 && (
                <div className="mt-4 animate-fadeIn">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-500">حدد الكلمات المطلوبة ({selectedIndices.length}):</span>
                        {selectedIndices.length > 0 && (
                            <button onClick={clearSelection} className="text-xs text-red-500 flex items-center gap-1 hover:underline">
                                <Eraser size={12} /> مسح التحديد
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-black/50 rounded-xl border border-dashed border-slate-300 dark:border-neutral-700 max-h-40 overflow-y-auto custom-scrollbar">
                        {words.map((word, idx) => (
                            <button
                                key={idx}
                                onClick={() => toggleWordSelection(idx)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
                                    selectedIndices.includes(idx)
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                                        : 'bg-white dark:bg-neutral-800 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-neutral-700 hover:border-indigo-400'
                                }`}
                            >
                                {word}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-end mt-4 pt-2 border-t border-slate-100 dark:border-neutral-800">
                <button
                    onClick={handleParse}
                    disabled={loading || !input.trim() || (parseType === 'word' && selectedIndices.length === 0)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 text-sm"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <Send className="w-4 h-4 rtl:-rotate-90" />
                            <span>{parseType === 'word' ? `إعراب (${selectedIndices.length})` : 'تحليل وإعراب'}</span>
                            {user && <span className="text-[10px] bg-black/20 px-2 rounded-full">-2 <Zap size={8} className="inline"/></span>}
                        </>
                    )}
                </button>
            </div>
        </div>

        {/* Result Area */}
        {result && (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border-2 border-indigo-500/20 shadow-md relative animate-slideIn">
                <div className="flex justify-between items-center mb-3 border-b border-indigo-100 dark:border-neutral-800 pb-2">
                    <h3 className="font-bold text-base text-indigo-700 dark:text-indigo-400">
                        النتيجة:
                    </h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleParse}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="إعادة المحاولة"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={copyToClipboard}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="نسخ"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-gray-200 leading-loose font-medium whitespace-pre-wrap text-right" dir="rtl">
                    {result}
                </div>
            </div>
        )}
    </div>
  );
};

export default SmartParser;