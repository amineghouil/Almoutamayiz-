
import React, { useState } from 'react';
import { User, Lock, Mail, UserPlus, LogIn, Eye, EyeOff, CheckSquare, Square, BookOpen, Sparkles, Users, Gamepad2, AlertCircle, BrainCircuit, ArrowRight } from 'lucide-react';
import SmartParser from './SmartParser';

interface AuthScreenProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onRegister: (name: string, email: string, pass: string) => Promise<void>;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showSmartParser, setShowSmartParser] = useState(false); // State for public parser
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const mapSupabaseError = (msg: string) => {
      if (msg.includes("User already registered") || msg.includes("unique")) return "هذا البريد الإلكتروني مسجل مسبقاً.";
      if (msg.includes("Invalid login credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      if (msg.includes("Email not confirmed")) return "يرجى تفعيل حسابك عبر الرابط المرسل لبريدك.";
      if (msg.includes("Password should be at least")) return "كلمة المرور يجب أن تكون 6 أحرف على الأقل.";
      if (msg.includes("CONFIRMATION_SENT")) return "تم إرسال رابط التفعيل إلى بريدك الإلكتروني بنجاح!";
      return msg || "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
        if (isLogin) {
            if (!email || !password) {
                throw new Error("يرجى ملء البريد الإلكتروني وكلمة المرور.");
            }
            // Standard Supabase Login - Role check happens in App.tsx after auth
            await onLogin(email, password);
        } else {
            // Registration Checks
            const reservedNames = ['admin', 'administrator', 'root', 'support', 'مدير', 'ادمن', 'أدمن', 'مشرف', 'الادارة', 'الإدارة'];
            if (reservedNames.some(reserved => name.toLowerCase().includes(reserved))) {
                throw new Error("هذا الاسم محجوز ولا يمكن استخدامه.");
            }

            if (password !== confirmPassword) {
                throw new Error("كلمة المرور وتأكيد كلمة المرور غير متطابقين.");
            }
            if (!agreeTerms) {
                throw new Error("يجب الموافقة على سياسة الخصوصية وشروط الاستخدام.");
            }
            if (!name || !email || !password) {
                throw new Error("يرجى ملء جميع الحقول المطلوبة.");
            }
            await onRegister(name, email, password);
        }
    } catch (err: any) {
        setErrorMsg(mapSupabaseError(err.message || ''));
        setLoading(false);
    }
  };

  // --- PUBLIC SMART PARSER VIEW ---
  if (showSmartParser) {
      return (
          <div className="min-h-screen bg-black text-white p-4 sm:p-8 animate-fadeIn flex flex-col items-center">
              <div className="w-full max-w-3xl">
                  <button 
                      onClick={() => setShowSmartParser(false)}
                      className="mb-8 flex items-center gap-2 px-5 py-3 bg-neutral-900 rounded-xl border border-neutral-800 text-gray-300 hover:text-white hover:border-yellow-500 transition-all shadow-lg"
                  >
                      <ArrowRight className="w-5 h-5" />
                      <span className="font-bold">عودة لتسجيل الدخول</span>
                  </button>
                  
                  <div className="bg-neutral-900/50 p-8 rounded-3xl border border-neutral-800 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
                      
                      <div className="text-center mb-6 relative z-10">
                          <h2 className="text-2xl font-black text-white mb-2">تجربة المعرب الذكي</h2>
                          <p className="text-gray-400">استخدم أدواتنا الذكية مجاناً قبل التسجيل</p>
                      </div>
                      
                      <SmartParser />
                  </div>
              </div>
          </div>
      );
  }

  // --- MAIN AUTH VIEW ---
  return (
    <div className="relative flex flex-col items-center justify-start min-h-screen w-full overflow-y-auto overflow-x-hidden font-cairo text-center">
      
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=2573&auto=format&fit=crop')"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-black/90 to-black/95 backdrop-blur-[3px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center justify-center p-6 py-12 gap-8">
        
        <div className="w-full flex flex-col items-center justify-center gap-6 text-center">
            <div className="relative group">
                <div className="absolute -inset-4 bg-yellow-500/20 rounded-full blur-xl group-hover:bg-yellow-500/30 transition-all duration-500"></div>
                <img 
                    src="https://i.ibb.co/bjLDwBbd/IMG-20250722-114332.png" 
                    alt="Logo" 
                    className="relative w-32 md:w-40 h-auto drop-shadow-2xl mb-4 transform hover:scale-105 transition-transform duration-500 mx-auto"
                />
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight text-white">
                تطبيق <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300">المتميز</span>
            </h1>
            <p className="text-base md:text-xl text-slate-300 leading-relaxed font-light max-w-xl">
                بوابتك الشاملة للتحضير للبكالوريا: دروس، ذكاء اصطناعي، ومجتمع تفاعلي.
            </p>

            {/* PUBLIC TOOL BUTTON */}
            <button 
                onClick={() => setShowSmartParser(true)}
                className="group relative flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg backdrop-blur-sm"
            >
                <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full shadow-lg group-hover:shadow-indigo-500/50 transition-shadow">
                    <BrainCircuit className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                    <span className="block text-xs text-gray-400 font-bold">لست مسجلاً؟</span>
                    <span className="block text-sm text-white font-bold">جرب المعرب الذكي مجاناً</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white mr-2 rtl:rotate-180" />
            </button>
        </div>

        <div className="w-full max-w-md">
            <div className="glass-panel border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-300 bg-black/60 backdrop-blur-md">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">
                    {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
                </h2>
                <p className="text-sm text-slate-400">
                    {isLogin ? 'تابع تقدمك الدراسي من حيث توقفت' : 'انضم إلينا وابدأ رحلة التميز'}
                </p>
            </div>
            
            {errorMsg && (
                <div className={`mb-4 rounded-xl p-3 flex items-center gap-2 text-xs font-bold animate-fadeIn ${errorMsg.includes('بنجاح') ? 'bg-green-500/10 border border-green-500/50 text-green-200' : 'bg-red-500/10 border border-red-500/50 text-red-200'}`}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                <div className="relative group animate-fadeIn">
                    <User className="absolute right-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-yellow-500" />
                    <input type="text" placeholder="الاسم الكامل" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pr-12 pl-4 text-white focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-slate-500 text-center" required={!isLogin} />
                </div>
                )}
                <div className="relative group">
                    <Mail className="absolute right-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-yellow-500" />
                    <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pr-12 pl-4 text-white focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-slate-500 text-center" required />
                </div>
                <div className="relative group">
                    <Lock className="absolute right-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-yellow-500" />
                    <input type={showPassword ? "text" : "password"} placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pr-12 pl-12 text-white focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-slate-500 text-center" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-3.5 text-slate-500 hover:text-yellow-500 transition-colors">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                </div>
                {!isLogin && (
                    <div className="relative group animate-fadeIn">
                        <Lock className="absolute right-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-yellow-500" />
                        <input type={showPassword ? "text" : "password"} placeholder="تأكيد كلمة المرور" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full bg-black/50 border rounded-xl py-3 pr-12 pl-4 text-white focus:outline-none transition-colors placeholder:text-slate-500 text-center ${confirmPassword && password !== confirmPassword ? 'border-red-500' : 'border-white/10 focus:border-yellow-500'}`} required={!isLogin} />
                    </div>
                )}
                {!isLogin && (
                    <div className="flex items-center gap-3 mt-4 animate-fadeIn justify-center">
                        <button type="button" onClick={() => setAgreeTerms(!agreeTerms)} className={`mt-1 transition-colors ${agreeTerms ? 'text-yellow-500' : 'text-slate-500'}`}>{agreeTerms ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}</button>
                        <p className="text-xs text-slate-400 leading-relaxed text-center">أوافق على <span className="text-yellow-400 font-bold cursor-pointer hover:underline">سياسة الخصوصية</span> و <span className="text-yellow-400 font-bold cursor-pointer hover:underline">شروط الاستخدام</span>.</p>
                    </div>
                )}
                <button type="submit" disabled={loading} className="w-full mt-6 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-black font-bold py-4 rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 border border-yellow-500/20">
                    {loading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : (isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
                    <span>{isLogin ? 'دخول' : 'إنشاء الحساب'}</span>
                </button>
                <p className="text-center text-sm text-slate-400 mt-4">
                  {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
                  <button type="button" onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }} className="font-bold text-yellow-400 hover:underline mx-2">
                    {isLogin ? 'سجل الآن' : 'ادخل الآن'}
                  </button>
                </p>
            </form>
            </div>
        </div>

        <div className="w-full max-w-5xl mx-auto mt-8 px-4">
            <h3 className="text-slate-400 text-sm mb-6 uppercase tracking-widest font-bold">لماذا تختار تطبيق المتميز؟</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-5 rounded-2xl flex flex-col items-center text-center hover:bg-black/50 transition-colors group">
                    <div className="p-3 bg-blue-500/10 rounded-full mb-3 group-hover:bg-blue-500/20 transition-colors">
                        <BookOpen className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="font-bold text-white text-sm mb-1">مكتبة شاملة</h3>
                    <p className="text-[10px] text-slate-400 leading-relaxed">جميع الدروس والمواضيع منظمة وملخصة لسهولة المراجعة</p>
                </div>
                <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-5 rounded-2xl flex flex-col items-center text-center hover:bg-black/50 transition-colors group">
                    <div className="p-3 bg-yellow-500/10 rounded-full mb-3 group-hover:bg-yellow-500/20 transition-colors">
                        <Sparkles className="w-6 h-6 text-yellow-400" />
                    </div>
                    <h3 className="font-bold text-white text-sm mb-1">ذكاء اصطناعي</h3>
                    <p className="text-[10px] text-slate-400 leading-relaxed">معرب آلي، مصحح مقالات فلسفية، ومنشئ محتوى ذكي</p>
                </div>
                <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-5 rounded-2xl flex flex-col items-center text-center hover:bg-black/50 transition-colors group">
                    <div className="p-3 bg-green-500/10 rounded-full mb-3 group-hover:bg-green-500/20 transition-colors">
                        <Users className="w-6 h-6 text-green-400" />
                    </div>
                    <h3 className="font-bold text-white text-sm mb-1">مجتمع تفاعلي</h3>
                    <p className="text-[10px] text-slate-400 leading-relaxed">غرف دردشة دراسية لتبادل الخبرات مع زملائك</p>
                </div>
                <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-5 rounded-2xl flex flex-col items-center text-center hover:bg-black/50 transition-colors group">
                    <div className="p-3 bg-purple-500/10 rounded-full mb-3 group-hover:bg-purple-500/20 transition-colors">
                        <Gamepad2 className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="font-bold text-white text-sm mb-1">ألعاب تعليمية</h3>
                    <p className="text-[10px] text-slate-400 leading-relaxed">اختبر معلوماتك وتنافس مع الآخرين في مسابقات ممتعة</p>
                </div>
            </div>
        </div>

        <div className="mt-4 mb-4 text-center">
            <p className="text-[10px] md:text-xs font-mono text-slate-500 tracking-widest opacity-60">
                تم إنشاء هذا التطبيق من طرف GH.A/2025
            </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
