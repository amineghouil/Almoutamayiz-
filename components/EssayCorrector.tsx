import React, { useState } from 'react';
import { Upload, FileCheck, AlertCircle, Zap } from 'lucide-react';
import { getGeminiClient } from '../lib/gemini';
import { PHILOSOPHER_PROMPT } from '../constants';
import { User } from '../types';

interface EssayCorrectorProps {
    user?: User;
    onUpdateUser?: (u: User) => void;
}

const EssayCorrector: React.FC<EssayCorrectorProps> = ({ user, onUpdateUser }) => {
  const [essayText, setEssayText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleCorrect = async () => {
      if (!essayText && !image) return;
      
      // Check points
      if (user && onUpdateUser && user.totalEarnings < 5) {
          alert("عذراً، ليس لديك رصيد كافٍ. تكلفة تصحيح المقالة 5 نقاط. حاول كسب المزيد من النقاط.");
          return;
      }

      setLoading(true);
      setResult('');

      try {
          const client = getGeminiClient();
          const instruction = "\nتعليمات التصحيح: افصل بوضوح بين (المقدمة، العرض، الخاتمة). امنح علامة دقيقة من 20 في نهاية التصحيح (مثال: العلامة: 14/20).";
          const parts: any[] = [{ text: PHILOSOPHER_PROMPT + instruction + "\nالنص المراد تصحيحه:\n" + essayText }];
          
          if (image) {
              const base64Data = image.split(',')[1];
              parts.push({
                  inlineData: {
                      data: base64Data,
                      mimeType: 'image/jpeg' 
                  }
              });
              parts[0].text += "\n(تم إرفاق صورة للمقالة، قم بقراءتها وتصحيحها بناءً على التعليمات)";
          }

          const response = await client.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: { parts }
          });

          setResult(response.text || 'لم يتم استلام رد.');
          
          // Deduct points
          if (user && onUpdateUser) {
              onUpdateUser({ ...user, totalEarnings: Math.max(0, user.totalEarnings - 5) });
              window.addToast('تم خصم 5 نقاط', 'info');
          }

      } catch (error: any) {
          setResult('خطأ: ' + error.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="animate-fadeIn max-w-3xl mx-auto space-y-4">
        {/* Changed from Blue to Yellow/Amber */}
        <div className="bg-gradient-to-r from-amber-500 to-yellow-600 rounded-2xl p-6 text-white text-center shadow-lg">
            <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-90" />
            <h2 className="text-xl font-bold mb-1">مصحح المقالات</h2>
            <p className="opacity-90 text-xs">تصحيح دقيق مع تقسيم المراحل وعلامة نهائية.</p>
            {user && (
                <div className="mt-2 text-xs bg-white/20 inline-block px-3 py-1 rounded-full font-bold">
                    رصيدك: {user.totalEarnings} | التكلفة: 5 نقاط
                </div>
            )}
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-slate-200 dark:border-neutral-800 shadow-sm space-y-3">
            
            {/* Image Upload */}
            <div className="border-2 border-dashed border-slate-300 dark:border-neutral-700 rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer relative group">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1 group-hover:text-amber-500" />
                <p className="text-slate-500 dark:text-gray-400 text-xs">ارفع صورة المقالة (اختياري)</p>
                {image && <p className="text-green-500 text-[10px] mt-1 font-bold">تم اختيار الصورة</p>}
            </div>

            <textarea 
                value={essayText}
                onChange={(e) => setEssayText(e.target.value)}
                placeholder="أو اكتب نص المقالة هنا..."
                className="w-full h-40 bg-slate-50 dark:bg-black border border-slate-300 dark:border-neutral-700 rounded-xl p-3 outline-none focus:border-amber-500 text-sm text-slate-900 dark:text-white"
            />

            <button
                onClick={handleCorrect}
                disabled={loading || (!essayText && !image)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-bold shadow-md disabled:opacity-50 text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                {loading ? 'جاري التصحيح...' : 'ابدأ التصحيح'}
                {user && !loading && <span className="text-[10px] bg-black/20 px-2 rounded-full">-5 <Zap size={8} className="inline"/></span>}
            </button>
        </div>

        {result && (
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border-l-4 border-amber-500 shadow-md animate-slideIn">
                <h3 className="font-bold text-base mb-3 text-amber-600">تقرير التصحيح</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-gray-200">
                    {result}
                </div>
            </div>
        )}
    </div>
  );
};

export default EssayCorrector;