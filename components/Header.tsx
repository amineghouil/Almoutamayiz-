import React, { useState, useEffect } from 'react';
import { User, GameState } from '../types';
import { Settings, LogOut, Bell, Shield, ChevronDown, Timer, Calculator, PieChart, Zap } from 'lucide-react';

interface HeaderProps {
    user: User;
    appLogo: string;
    hasUnreadNotifs: boolean;
    onOpenNotifications: () => void;
    onOpenSettings: () => void;
    onLogout: () => void;
    onNavigate: (state: GameState) => void;
}

const Header: React.FC<HeaderProps> = ({ user, appLogo, hasUnreadNotifs, onOpenNotifications, onOpenSettings, onLogout, onNavigate }) => {
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    
    // --- COUNTDOWN LOGIC (Now self-contained for performance) ---
    const calculateTimeLeft = () => {
        const targetDate = new Date("2026-06-10T08:00:00").getTime();
        const now = new Date().getTime();
        const difference = targetDate - now;
        if (difference > 0) {
            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((difference % (1000 * 60)) / 1000),
            };
        }
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const interval = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
        return () => clearInterval(interval);
    }, []);

    const isAdminOrTeacher = user.role === 'admin' || user.role.startsWith('teacher_');

    return (
        <header className="fixed top-0 w-full bg-black/40 backdrop-blur-xl z-40 border-b border-white/5 px-4 py-1 flex justify-between items-center transition-all duration-300 h-16">
            <div className="relative">
                <button 
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-2 group focus:outline-none"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-600 flex items-center justify-center text-black font-bold shadow-lg ring-2 ring-black/50 group-hover:scale-105 transition-transform">
                        {user.avatar ? (
                            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            user.role === 'admin' ? 'A' : 'S'
                        )}
                    </div>
                    <div className="hidden sm:flex flex-col items-start">
                        <span className="font-bold text-xs leading-tight group-hover:text-yellow-500 transition-colors">{user.name}</span>
                        <span className="text-[9px] text-gray-400 font-bold flex items-center gap-1">
                            <Zap size={10} className="text-yellow-500 fill-yellow-500" />
                            {user.totalEarnings.toLocaleString()} نقطة
                        </span>
                    </div>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-300 ${showUserDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showUserDropdown && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)}></div>
                        <div className="absolute top-10 right-0 w-80 bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-800 overflow-hidden z-50 animate-fadeIn origin-top-right max-h-[85vh] overflow-y-auto custom-scrollbar">
                            
                            {/* Points & Streak Section */}
                            <div className="bg-gradient-to-br from-yellow-900/20 to-amber-900/10 p-4 border-b border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 font-bold">رصيد النقاط</span>
                                        <span className="text-2xl font-black text-white flex items-center gap-2">
                                            {user.totalEarnings} <span className="text-sm font-medium text-yellow-500">نقطة</span>
                                        </span>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                                        <Zap className="text-yellow-500 fill-yellow-500" size={20} />
                                    </div>
                                </div>
                                
                                {user.streak ? (
                                    <div className="bg-black/30 rounded-lg p-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex space-x-1 space-x-reverse">
                                                {[...Array(7)].map((_, i) => (
                                                    <div key={i} className={`w-2 h-2 rounded-full ${i < (user.streak! % 7) || (user.streak! % 7 === 0 && user.streak! > 0) ? 'bg-green-500' : 'bg-neutral-700'}`}></div>
                                                ))}
                                            </div>
                                            <span className="text-[10px] text-gray-400 mr-2">دخول متتالي</span>
                                        </div>
                                        <span className="text-xs font-bold text-green-400">{user.streak} يوم</span>
                                    </div>
                                ) : null}
                            </div>

                            <div className="p-4 bg-neutral-900 border-b border-white/5 text-center">
                                <p className="text-[10px] text-blue-300 mb-2 font-bold flex items-center justify-center gap-1">
                                    <Timer size={12} className="animate-pulse" /> العد التنازلي للبكالوريا
                                </p>
                                <div className="flex justify-center gap-2 text-white">
                                    <div className="flex flex-col items-center bg-black/40 rounded p-1 w-12 border border-white/10">
                                        <span className="font-bold text-lg leading-none text-yellow-500">{String(timeLeft.days).padStart(2, '0')}</span>
                                        <span className="text-[8px] text-gray-400">يوم</span>
                                    </div>
                                    <div className="flex flex-col items-center bg-black/40 rounded p-1 w-12 border border-white/10">
                                        <span className="font-bold text-lg leading-none">{String(timeLeft.hours).padStart(2, '0')}</span>
                                        <span className="text-[8px] text-gray-400">ساعة</span>
                                    </div>
                                    <div className="flex flex-col items-center bg-black/40 rounded p-1 w-12 border border-white/10">
                                        <span className="font-bold text-lg leading-none">{String(timeLeft.minutes).padStart(2, '0')}</span>
                                        <span className="text-[8px] text-gray-400">دقيقة</span>
                                    </div>
                                    <div className="flex flex-col items-center bg-black/40 rounded p-1 w-12 border border-white/10">
                                        <span className="font-bold text-lg leading-none text-red-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
                                        <span className="text-[8px] text-gray-400">ثانية</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-2 space-y-1">
                                <button onClick={() => { onNavigate(GameState.CALCULATOR); setShowUserDropdown(false); }} className="w-full text-right px-3 py-3 rounded-xl hover:bg-neutral-800 flex items-center gap-3 text-xs text-green-400 transition-colors">
                                    <Calculator className="w-4 h-4" />
                                    <span>حساب معدل البكالوريا</span>
                                </button>
                                
                                <button onClick={() => { onNavigate(GameState.PROGRESS_DASHBOARD); setShowUserDropdown(false); }} className="w-full text-right px-3 py-3 rounded-xl hover:bg-neutral-800 flex items-center gap-3 text-xs text-teal-400 transition-colors">
                                    <PieChart className="w-4 h-4" />
                                    <span>تقدمي</span>
                                </button>

                                {isAdminOrTeacher && (
                                    <button onClick={() => { onNavigate(GameState.ADMIN); setShowUserDropdown(false); }} className="w-full text-right px-3 py-3 rounded-xl hover:bg-neutral-800 flex items-center gap-3 text-xs text-purple-400 transition-colors">
                                        <Shield className="w-4 h-4" />
                                        <span>{user.role === 'admin' ? 'لوحة الإدارة' : 'لوحة الأستاذ (الردود)'}</span>
                                    </button>
                                )}

                                <button onClick={() => { onOpenSettings(); setShowUserDropdown(false); }} className="w-full text-right px-3 py-3 rounded-xl hover:bg-neutral-800 flex items-center gap-3 text-xs text-gray-200 transition-colors">
                                    <Settings className="w-4 h-4 text-gray-400" />
                                    <span>الإعدادات</span>
                                </button>

                                <div className="h-px bg-neutral-800 my-1"></div>

                                <button onClick={onLogout} className="w-full text-right px-3 py-3 rounded-xl hover:bg-red-900/10 flex items-center gap-3 text-xs text-red-500 transition-colors">
                                    <LogOut className="w-4 h-4" />
                                    <span>تسجيل خروج</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <img 
                    src={appLogo || "https://i.ibb.co/bjLDwBbd/IMG-20250722-114332.png"} 
                    alt="المتميز" 
                    className="h-10 w-auto object-contain drop-shadow-md transition-all duration-300"
                />
            </div>

            <div className="flex gap-2">
                <button 
                    onClick={onOpenNotifications} 
                    className="relative p-2 text-gray-300 hover:text-yellow-500 transition-colors"
                >
                    <Bell className="w-5 h-5" />
                    {hasUnreadNotifs && (
                        <span className="absolute top-1.5 right-2 w-2 h-2 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.6)]"></span>
                    )}
                </button>
            </div>
        </header>
    );
};

export default Header;