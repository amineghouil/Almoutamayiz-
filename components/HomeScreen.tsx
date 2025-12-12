import React, { useEffect, useState } from 'react';
import { User, CurriculumStatus } from '../types';
import { Calendar, Edit3, Save, X, Quote, BrainCircuit, PenTool, Sparkles, ArrowRight, MessageSquare, Send, Loader2, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SmartParser from './SmartParser';
import EssayBuilder from './EssayBuilder';
import EssayCorrector from './EssayCorrector';

interface HomeScreenProps {
  user: User;
  onUpdateUser?: (u: User) => void;
}

const QUOTES = [
  "من لم يذق مرّ التعلم ساعة، تجرّع ذلّ الجهل طول حياته",
  "طلب العلم أفضل من صلاة النافلة",
  "هَلْ يَسْتَوِي الَّذِينَ يَعْلَمُونَ وَالَّذِينَ لا يَعْلَمُونَ",
  "العلم في الصغر كالنقش على الحجر",
  "اطلبوا العلم من المهد إلى اللحد",
  "من سلك طريقاً يلتمس فيه علماً سهّل الله له به طريقاً إلى الجنة",
  "لا يولد المرء عالماً، فالعالم بالتعلّم",
  "التفكير هو حوار الروح مع نفسها"
];

const CurriculumSkeleton: React.FC = () => (
    <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between bg-[#111] border border-white/5 p-4 rounded-2xl animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-neutral-800 rounded"></div>
                    <div className="w-24 h-5 bg-neutral-800 rounded"></div>
                </div>
                <div className="w-32 h-5 bg-neutral-800 rounded"></div>
            </div>
        ))}
    </div>
);

const HomeScreen: React.FC<HomeScreenProps> = ({ user, onUpdateUser }) => {
  const [curriculum, setCurriculum] = useState<CurriculumStatus[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<'parser' | 'corrector' | 'builder' | null>(null);
  const [adminMsg, setAdminMsg] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [animatingQuote, setAnimatingQuote] = useState(false);

  useEffect(() => {
    fetchCurriculum();
    const channel = supabase
      .channel('curriculum_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'curriculum_status' }, () => {
        fetchCurriculum();
      })
      .subscribe();

    const quoteInterval = setInterval(() => {
        setAnimatingQuote(true);
        setTimeout(() => {
            setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
            setAnimatingQuote(false);
        }, 300); // Wait for fade out
    }, 7000);

    return () => { 
        supabase.removeChannel(channel); 
        clearInterval(quoteInterval);
    };
  }, []);

  const fetchCurriculum = async () => {
    setLoading(true);
    const { data } = await supabase.from('curriculum_status').select('*').order('id');
    if (data) setCurriculum(data);
    setLoading(false);
  };

  const handleUpdate = async (id: number) => {
    if (!editValue.trim()) return;
    await supabase.from('curriculum_status').update({ last_lesson: editValue }).eq('id', id);
    setEditingId(null);
  };

  const handleSendAdminMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!adminMsg.trim()) return;
      setIsSendingMsg(true);
      const { error } = await supabase.from('admin_messages').insert({
          user_id: user.id,
          user_name: user.name,
          content: adminMsg
      });
      setIsSendingMsg(false);
      if (error) {
          alert("فشل الإرسال: " + error.message);
      } else {
          alert("تم إرسال رسالتك للإدارة بنجاح.");
          setAdminMsg('');
      }
  };

  if (activeTool) {
      return (
          <div className="p-4 sm:p-6 pb-24 animate-fadeIn min-h-screen">
              <button onClick={() => setActiveTool(null)} className="mb-6 flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors text-sm font-bold text-slate-700 dark:text-gray-200">
                  <ArrowRight className="w-4 h-4" /> <span>عودة للرئيسية</span>
              </button>
              {activeTool === 'parser' && <SmartParser user={user} onUpdateUser={onUpdateUser} />}
              {activeTool === 'corrector' && <EssayCorrector user={user} onUpdateUser={onUpdateUser} />}
              {activeTool === 'builder' && <EssayBuilder user={user} onUpdateUser={onUpdateUser} />}
          </div>
      );
  }

  return (
    <div className="p-4 sm:p-6 pb-24 animate-fadeIn space-y-6">
      
      {/* 1. Rotating Quotes Section */}
      <div className="rounded-2xl p-4 text-center relative overflow-hidden border border-yellow-500/30 bg-[#0a0a0a] min-h-[100px] flex flex-col items-center justify-center">
        <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/5 rounded-full blur-2xl"></div>
        <div className="flex justify-center mb-2"><Quote className="w-6 h-6 text-yellow-500 opacity-80" /></div>
        <div className={`transition-all duration-500 transform ${animatingQuote ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
             <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-bold font-cairo">"{QUOTES[quoteIndex]}"</p>
        </div>
      </div>

      {/* 2. New Welcome Section */}
      <div className="bg-[#111] border border-white/10 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
              <h2 className="text-3xl font-black text-white mb-2 font-cairo">
                مرحباً بعودتك، {user.name}!
              </h2>
              <p className="text-gray-500 text-sm mb-6 font-medium">سلام الله عليك أيها المتميز(ة).</p>
              
              <p className="text-gray-400 leading-loose max-w-2xl mx-auto mb-8 text-sm md:text-base">
                نحن هنا لنرافقك في رحلتك نحو التفوق. استغل كل الموارد المتاحة من دروس وتمارين ومجتمع تفاعلي لتحقيق أفضل النتائج.
              </p>
              
              <div className="text-white font-black text-lg md:text-xl border-t border-white/5 pt-6">
                 بسيرك رفقتنا لا نعدك فقط بالنجاح بل <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">نعدك بالتميز.</span>
              </div>
          </div>
          
          {/* Background Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* 3. Curriculum Section */}
      <div className="w-full mt-4">
         <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-white flex items-center justify-center gap-3 mb-2">
               <span>واكب المنهج الدراسي</span>
               <Calendar className="w-6 h-6 text-yellow-500" />
            </h2>
            <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">تعرض هذه الاداة آخر الدروس التي بلغها الطلبة النظاميون في كل مادة.</p>
         </div>
         
         {loading ? <CurriculumSkeleton /> : (
             <div className="space-y-3">
                {curriculum.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-[#111] border border-white/5 p-4 rounded-2xl hover:border-white/10 transition-colors shadow-sm">
                        <div className="flex items-center gap-3">
                            <Copy className="w-5 h-5 text-yellow-600/80" />
                            <span className="font-bold text-white text-base">{item.subject}</span>
                        </div>
                        
                        <div className="text-left pl-2 flex-1 flex justify-end">
                             {editingId === item.id ? (
                                 <div className="flex gap-2 w-full justify-end">
                                    <input 
                                        type="text" 
                                        value={editValue} 
                                        onChange={(e) => setEditValue(e.target.value)} 
                                        className="bg-black border border-neutral-700 rounded px-2 py-1 text-sm text-white outline-none focus:border-yellow-500 w-full max-w-[150px]" 
                                        autoFocus
                                    />
                                    <button onClick={() => handleUpdate(item.id)} className="p-1 bg-green-600 rounded text-white"><Save size={16}/></button>
                                    <button onClick={() => setEditingId(null)} className="p-1 bg-red-600 rounded text-white"><X size={16}/></button>
                                 </div>
                             ) : (
                                 <div className="flex items-center gap-2 max-w-[60%] justify-end">
                                    {user.role === 'admin' && (
                                        <button onClick={() => { setEditingId(item.id); setEditValue(item.last_lesson); }} className="text-slate-600 hover:text-yellow-500 transition-colors shrink-0">
                                            <Edit3 size={14} />
                                        </button>
                                    )}
                                    <span className="text-slate-500 text-sm font-medium truncate text-left" dir="rtl">
                                        {item.last_lesson || 'لم تضف دروس بعد'}
                                    </span>
                                 </div>
                             )}
                        </div>
                    </div>
                ))}
             </div>
         )}
      </div>

      {/* 4. AI Tools Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4 px-2">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-yellow-500" />
            <h2 className="text-lg font-black text-slate-800 dark:text-white">الأدوات الذكية</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <button onClick={() => setActiveTool('parser')} className="group relative overflow-hidden rounded-3xl p-6 text-right shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 h-40 flex flex-col justify-between border border-white/10 bg-neutral-900/60 backdrop-blur-md">
                <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><BrainCircuit className="w-24 h-24 text-blue-400" /></div>
                <div><h3 className="text-2xl font-black text-white mb-1 group-hover:text-blue-400 transition-colors">المعرب الذكي</h3><p className="text-gray-400 text-xs opacity-90">إعراب فوري للمفردات والجمل (2 نقطة)</p></div>
                <div className="self-end bg-blue-500/20 p-2 rounded-full border border-blue-500/30"><ArrowRight className="w-5 h-5 text-blue-400 rtl:rotate-180" /></div>
            </button>
            
            <button onClick={() => setActiveTool('corrector')} className="group relative overflow-hidden rounded-3xl p-6 text-right shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 h-40 flex flex-col justify-between border border-white/10 bg-neutral-900/60 backdrop-blur-md">
                <div className="absolute inset-0 bg-amber-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Sparkles className="w-24 h-24 text-amber-400" /></div>
                <div><h3 className="text-2xl font-black text-white mb-1 group-hover:text-amber-400 transition-colors">مصحح المقالات</h3><p className="text-gray-400 text-xs opacity-90">تصحيح دقيق مع العلامة (5 نقاط)</p></div>
                <div className="self-end bg-amber-500/20 p-2 rounded-full border border-amber-500/30"><ArrowRight className="w-5 h-5 text-amber-400 rtl:rotate-180" /></div>
            </button>
            
            <button onClick={() => setActiveTool('builder')} className="group relative overflow-hidden rounded-3xl p-6 text-right shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 h-40 flex flex-col justify-between border border-white/10 bg-neutral-900/60 backdrop-blur-md">
                <div className="absolute inset-0 bg-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><PenTool className="w-24 h-24 text-purple-400" /></div>
                <div><h3 className="text-2xl font-black text-white mb-1 group-hover:text-purple-400 transition-colors">منشئ المقالات</h3><p className="text-gray-400 text-xs opacity-90">إنشاء مقالات فلسفية منهجية (5 نقاط)</p></div>
                <div className="self-end bg-purple-500/20 p-2 rounded-full border border-purple-500/30"><ArrowRight className="w-5 h-5 text-purple-400 rtl:rotate-180" /></div>
            </button>
        </div>
      </div>

      {/* 5. Contact Admin Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-slate-200 dark:border-neutral-800 shadow-sm mt-8">
         <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full"><MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
             <div><h3 className="font-bold text-slate-800 dark:text-white text-sm">تواصل مع الإدارة</h3><p className="text-[10px] text-slate-500 dark:text-gray-400">لديك اقتراح أو استفسار؟ راسلنا مباشرة.</p></div>
         </div>
         <form onSubmit={handleSendAdminMessage} className="relative">
             <textarea value={adminMsg} onChange={(e) => setAdminMsg(e.target.value)} placeholder="اكتب رسالتك هنا..." className="w-full h-24 bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl p-3 text-sm focus:border-blue-500 dark:focus:border-yellow-500 outline-none resize-none text-slate-900 dark:text-white" />
             <button type="submit" disabled={isSendingMsg || !adminMsg.trim()} className="absolute bottom-3 left-3 p-2 bg-blue-600 dark:bg-yellow-500 text-white dark:text-black rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-sm">
                 {isSendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rtl:-rotate-90" />}
             </button>
         </form>
      </div>
    </div>
  );
};

export default HomeScreen;