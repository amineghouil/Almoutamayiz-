import React, { useState } from 'react';
import { GraduationCap, Clock, Send, X, ArrowLeft, CheckCircle } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

const CONSULTATION_SUBJECTS = [
    { id: 'arabic', name: 'اللغة العربية', icon: '📚' },
    { id: 'philosophy', name: 'الفلسفة', icon: '🤔' },
    { id: 'history', name: 'الاجتماعيات', icon: '🌍' } // Social Studies
];

interface TeachersScreenProps {
  user: User;
}

const TeachersScreen: React.FC<TeachersScreenProps> = ({ user }) => {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleStudentSubmit = async () => {
    if (!selectedSubject || !questionText.trim() || !user) return;
    setIsSending(true);

    try {
      // Construct the message content with a tag that allows filtering
      // This ONE message will be visible to:
      // 1. General Admin (sees all messages)
      // 2. Subject Teacher (sees messages containing the subject name)
      const messageContent = `[استشارة في ${selectedSubject}]:\n${questionText}`;
      
      const { error } = await supabase.from('admin_messages').insert({
        user_id: user.id, // Critical for RLS: MUST match auth.uid()
        user_name: user.name,
        content: messageContent,
        is_replied: false,
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error("Submission error:", error);
        throw error;
      }

      // Success Feedback
      window.addToast("تم إرسال الاستشارة بنجاح", 'success');
      alert("✅ تم استلام استشارتك بنجاح!\n\n- تم إرسال نسخة إلى الإدارة العامة.\n- تم إرسال نسخة إلى أستاذ المادة المختص.\n\nسيصلك الرد عبر الإشعارات قريباً.");
      
      setQuestionText('');
      setSelectedSubject(null);
    } catch (error: any) {
      alert("فشل الإرسال: " + (error.message || "يرجى التحقق من الاتصال بالإنترنت"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 animate-fadeIn pb-32">
        <div className="text-center mb-8 mt-4">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300 mb-2">منصة الاستشارات</h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto">اطرح سؤالك على أساتذة متخصصين في المواد الأساسية واحصل على إجابة موثوقة.</p>
        </div>

        {!selectedSubject ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {CONSULTATION_SUBJECTS.map(sub => (
                    <button 
                        key={sub.id}
                        onClick={() => setSelectedSubject(sub.name)}
                        className="group relative overflow-hidden rounded-3xl p-8 text-center transition-all duration-300 hover:-translate-y-2 shadow-2xl backdrop-blur-md bg-teal-900/20 border border-teal-500/20 hover:border-teal-500/50 hover:bg-teal-900/30"
                    >
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl shadow-lg group-hover:scale-110 transition-transform bg-gradient-to-tr from-teal-600 to-cyan-500 text-white`}>
                            {sub.icon}
                        </div>
                        <h3 className="font-bold text-white text-xl tracking-wide mb-2">{sub.name}</h3>
                        <div className="w-12 h-1 bg-teal-500/50 mx-auto rounded-full group-hover:w-20 transition-all duration-300"></div>
                        <p className="text-xs text-teal-200/70 mt-4 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">اضغط لطلب استشارة خاصة</p>
                    </button>
                ))}
            </div>
        ) : (
            <div className="max-w-xl mx-auto bg-neutral-900/80 backdrop-blur-xl p-8 rounded-[2rem] border border-teal-500/20 shadow-[0_0_50px_rgba(20,184,166,0.15)] animate-slideIn relative">
                <button onClick={() => setSelectedSubject(null)} className="absolute top-6 left-6 p-2 bg-neutral-800 rounded-full hover:bg-neutral-700 transition-colors text-gray-400 hover:text-white">
                    <X size={20} />
                </button>
                
                <div className="text-center mb-6">
                    <h3 className="font-black text-2xl text-white mb-1">
                        طلب استشارة
                    </h3>
                    <p className="text-teal-400 font-bold">{selectedSubject}</p>
                </div>
                
                <textarea 
                    value={questionText}
                    onChange={e => setQuestionText(e.target.value)}
                    className="w-full h-48 bg-black/50 border border-neutral-700 rounded-2xl p-5 text-white placeholder:text-gray-600 focus:border-teal-500 outline-none resize-none mb-6 transition-colors shadow-inner text-base leading-relaxed"
                    placeholder="اكتب سؤالك هنا بوضوح..."
                />

                <button 
                    onClick={handleStudentSubmit}
                    disabled={isSending || !questionText.trim()}
                    className="w-full py-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSending ? <Clock className="animate-spin"/> : <Send size={20} className="rtl:-rotate-90"/>}
                    <span className="text-lg">إرسال الاستشارة</span>
                </button>
                
                <div className="mt-6 bg-teal-900/20 p-3 rounded-xl border border-teal-500/10">
                    <p className="text-[10px] text-teal-200/80 text-center flex items-center justify-center gap-2">
                        <CheckCircle size={12} /> 
                        سيتم توجيه السؤال آلياً للإدارة وللأستاذ المختص.
                    </p>
                </div>
            </div>
        )}
    </div>
  );
};

export default TeachersScreen;