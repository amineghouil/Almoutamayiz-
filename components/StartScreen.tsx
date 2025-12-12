
import React, { useState } from 'react';
import { Play, BookOpen, Trophy, LogOut, Settings, User } from 'lucide-react';
import { User as UserType } from '../types';
import SettingsModal from './SettingsModal';

interface StartScreenProps {
  onStart: () => void;
  currentUser: UserType;
  isAdmin: boolean;
  onAdminPanel: () => void;
  onLogout: () => void;
  onUpdateUser: (u: UserType) => void;
  onResetProgress: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ 
    onStart, 
    currentUser, 
    isAdmin, 
    onAdminPanel, 
    onLogout,
    onUpdateUser,
    onResetProgress
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Check if admin or any teacher role
  const canAccessAdmin = isAdmin || ['teacher_arabic', 'teacher_philosophy', 'teacher_social'].includes(currentUser.role);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center animate-fadeIn relative">
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        user={currentUser}
        onUpdateUser={onUpdateUser}
        onResetProgress={onResetProgress}
        onLogout={onLogout}
      />

      {/* User Info & Controls */}
      <div className="absolute top-4 right-4 md:right-8 flex items-center gap-4 z-20">
        <div 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 bg-white/80 dark:bg-neutral-900/80 backdrop-blur pl-4 pr-2 py-2 rounded-full border border-slate-200 dark:border-neutral-700 cursor-pointer hover:border-blue-500 dark:hover:border-yellow-500 transition-colors shadow-lg"
        >
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500 dark:border-yellow-500 bg-slate-200 dark:bg-neutral-800 flex items-center justify-center">
                {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <User className="w-6 h-6 text-slate-400 dark:text-gray-400" />
                )}
            </div>
            <div className="flex flex-col items-start mr-1">
                <span className="text-sm font-bold text-slate-800 dark:text-gray-200 leading-tight">{currentUser.name}</span>
                <span className="text-xs font-mono text-blue-600 dark:text-yellow-400 leading-tight">{currentUser.totalEarnings.toLocaleString()} نقطة</span>
            </div>
        </div>
      </div>

      <div className="absolute top-4 left-4 md:left-8 flex gap-3 z-20">
        {canAccessAdmin && (
            <button 
                onClick={onAdminPanel} 
                className="p-3 bg-white dark:bg-neutral-900 border-b-4 border-slate-200 dark:border-neutral-950 rounded-xl text-blue-600 dark:text-yellow-500 active:border-b-0 active:translate-y-1 transition-all shadow-md" 
                title={currentUser.role === 'admin' ? "لوحة الإدارة" : "رد على الاستشارات"}
            >
                <Settings className="w-6 h-6" />
            </button>
        )}
        <button 
            onClick={() => setIsSettingsOpen(true)} 
            className="p-3 bg-white dark:bg-neutral-900 border-b-4 border-slate-200 dark:border-neutral-950 rounded-xl text-slate-400 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white active:border-b-0 active:translate-y-1 transition-all shadow-md" 
            title="الإعدادات"
        >
            <Settings className="w-6 h-6" />
        </button>
        <button 
            onClick={onLogout} 
            className="p-3 bg-red-50 dark:bg-red-900/20 border-b-4 border-red-100 dark:border-red-900 rounded-xl text-red-500 active:border-b-0 active:translate-y-1 transition-all shadow-md" 
            title="تسجيل خروج"
        >
            <LogOut className="w-6 h-6" />
        </button>
      </div>

      <div className="mb-8 relative mt-24 md:mt-0">
        <div className="absolute -inset-4 bg-blue-500/20 dark:bg-yellow-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="relative bg-gradient-to-br from-blue-400 to-blue-600 dark:from-yellow-400 dark:to-yellow-600 w-32 h-32 rounded-full flex items-center justify-center shadow-2xl border-4 border-blue-200 dark:border-yellow-200 transform hover:rotate-12 transition-transform duration-300">
          <BookOpen className="w-16 h-16 text-white dark:text-black drop-shadow-lg" />
        </div>
      </div>

      <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-blue-700 to-blue-500 dark:from-yellow-300 dark:via-yellow-500 dark:to-yellow-300 mb-4 drop-shadow-sm">
        المراجعة المليونية
      </h1>
      
      <p className="text-slate-500 dark:text-gray-400 text-lg md:text-xl max-w-md mb-12 leading-relaxed">
        منصة تعليمية تفاعلية بأسلوب شيق.
        <br />
        <span className="text-sm text-blue-600 dark:text-yellow-600 mt-2 block font-bold">اضبط ملفك الشخصي وابدأ التحدي!</span>
      </p>

      <button
        onClick={onStart}
        className="group relative px-12 py-6 bg-blue-600 dark:bg-yellow-500 rounded-2xl border-b-[6px] border-blue-800 dark:border-yellow-700 shadow-xl transition-all hover:bg-blue-500 dark:hover:bg-yellow-400 active:border-b-0 active:translate-y-[6px]"
      >
        <div className="flex items-center gap-3 text-2xl font-black text-white dark:text-black">
          <Play className="fill-white dark:fill-black w-8 h-8" />
          <span>ابدأ المسابقة</span>
        </div>
      </button>

      <div className="mt-16 grid grid-cols-2 gap-8 text-slate-500 dark:text-gray-500 text-sm">
        <div className="flex flex-col items-center gap-2 bg-white/50 dark:bg-neutral-900/50 p-4 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm">
          <Trophy className="w-6 h-6 text-blue-600 dark:text-yellow-600" />
          <span>نظام نقاط تنافسي</span>
        </div>
        <div className="flex flex-col items-center gap-2 bg-white/50 dark:bg-neutral-900/50 p-4 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm">
          <BookOpen className="w-6 h-6 text-blue-600 dark:text-yellow-600" />
          <span>مراجعة شاملة للمواد</span>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
