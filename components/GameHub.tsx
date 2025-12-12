
import React, { useEffect, useState } from 'react';
import { Play, Trophy, Star, Zap, Brain, Link, Sparkles, Coins, Layers, Medal, Crown } from 'lucide-react';
import { User } from '../types';

interface GameHubProps {
  onStart: () => void;
  onStartMatchingGame: () => void;
  user: User;
}

const GameHub: React.FC<GameHubProps> = ({ onStart, onStartMatchingGame, user }) => {
  const [matchingLevel, setMatchingLevel] = useState(1);
  const [matchingXP, setMatchingXP] = useState(0);

  useEffect(() => {
      // Load user specific matching game progress
      // Simple XP system: Level = floor(sqrt(XP / 100)) + 1 or just simple counter
      const storedXP = localStorage.getItem(`matching_xp_${user.id}`);
      const xp = storedXP ? parseInt(storedXP) : 0;
      setMatchingXP(xp);
      const level = Math.floor(xp / 500) + 1; // Every 500 XP is a level
      setMatchingLevel(level);
  }, [user.id]);

  const getRankTitle = (lvl: number) => {
      if (lvl >= 50) return { title: 'أسطورة الذاكرة', color: 'text-yellow-400' };
      if (lvl >= 30) return { title: 'عبقري', color: 'text-purple-400' };
      if (lvl >= 20) return { title: 'خبير', color: 'text-red-400' };
      if (lvl >= 10) return { title: 'متقدم', color: 'text-blue-400' };
      if (lvl >= 5) return { title: 'هاوي', color: 'text-green-400' };
      return { title: 'مبتدئ', color: 'text-gray-400' };
  };

  const rank = getRankTitle(matchingLevel);
  const nextLevelXP = matchingLevel * 500;
  const progressPercent = Math.min(100, ((matchingXP % 500) / 500) * 100);

  return (
    <div className="flex flex-col items-center justify-start min-h-[80vh] p-4 sm:p-6 text-center animate-fadeIn pb-32">
      
      {/* Header: Global Points */}
      <div className="relative mb-12 transform hover:scale-105 transition-transform cursor-default">
        <div className="absolute inset-0 bg-yellow-600 rounded-full blur-sm translate-y-2"></div>
        <div className="relative bg-gradient-to-b from-yellow-300 to-yellow-500 border-4 border-white px-8 py-3 rounded-full shadow-[0_6px_0px_rgba(202,138,4,1)] flex items-center gap-3 z-10">
             <div className="p-2 bg-white/30 rounded-full backdrop-blur-sm">
                 <Coins className="w-8 h-8 text-yellow-900 drop-shadow-sm" />
             </div>
             <div className="flex flex-col items-start">
                 <span className="text-[10px] text-yellow-900 font-black uppercase tracking-wider leading-none">مجموع النقاط</span>
                 <span className="text-3xl font-black text-white drop-shadow-[0_2px_0px_rgba(0,0,0,0.2)] font-mono leading-none mt-1">
                     {user.totalEarnings.toLocaleString()}
                 </span>
             </div>
             <div className="absolute -top-3 -right-3">
                 <Star className="w-8 h-8 text-yellow-300 fill-yellow-300 stroke-yellow-600 stroke-2 animate-spin-slow" />
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl px-2">
          
          {/* Game Card 1: Millionaire */}
          <button
            onClick={onStart}
            className="group relative w-full focus:outline-none"
          >
             {/* 3D Shadow Layer */}
             <div className="absolute inset-0 bg-green-700 rounded-[2.5rem] translate-y-4 group-hover:translate-y-2 transition-transform duration-200"></div>
             
             {/* Main Card Content */}
             <div className="relative bg-gradient-to-b from-green-400 to-green-600 h-full rounded-[2.5rem] p-8 text-right border-4 border-white/20 overflow-hidden transform group-hover:translate-y-2 group-active:translate-y-4 transition-transform duration-200 flex flex-col justify-between min-h-[280px]">
                 
                 {/* Background Decorations */}
                 <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                 <div className="absolute left-10 bottom-10 w-20 h-20 bg-green-800/20 rounded-full"></div>
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>

                 <div className="relative z-10 flex justify-between items-start">
                     <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md shadow-inner border border-white/30 transform group-hover:rotate-12 transition-transform duration-300">
                         <Trophy className="w-10 h-10 text-yellow-300 drop-shadow-md" />
                     </div>
                     <span className="bg-green-800/40 text-white text-xs font-black px-3 py-1.5 rounded-full border border-white/20 shadow-sm">
                         مسابقة كبرى
                     </span>
                 </div>
                 
                 <div className="relative z-10 mt-6">
                     <h2 className="text-3xl md:text-4xl font-black text-white drop-shadow-md mb-2">من سيربح البكالوريا</h2>
                     <p className="text-green-100 font-bold text-sm leading-relaxed opacity-90 mb-4">
                         نظام جديد! دور هاتفك للعب بالوضع الأفقي وتحدي نفسك.
                     </p>
                     
                     <div className="inline-flex items-center gap-2 bg-white text-green-600 px-6 py-3 rounded-2xl font-black text-lg shadow-lg group-hover:scale-105 transition-transform">
                         <Play className="w-5 h-5 fill-current" />
                         ابدأ التحدي
                     </div>
                 </div>
             </div>
          </button>

          {/* Game Card 2: Matching Game with Progress */}
          <button
            onClick={onStartMatchingGame}
            className="group relative w-full focus:outline-none"
          >
             {/* 3D Shadow Layer */}
             <div className="absolute inset-0 bg-purple-900 rounded-[2.5rem] translate-y-4 group-hover:translate-y-2 transition-transform duration-200"></div>
             
             {/* Main Card Content */}
             <div className="relative bg-gradient-to-b from-purple-500 to-indigo-700 h-full rounded-[2.5rem] p-8 text-right border-4 border-white/20 overflow-hidden transform group-hover:translate-y-2 group-active:translate-y-4 transition-transform duration-200 flex flex-col justify-between min-h-[280px]">
                 
                 {/* Background Decorations */}
                 <div className="absolute -left-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                 <div className="absolute right-10 bottom-20 w-16 h-16 bg-indigo-900/20 rounded-full animate-pulse"></div>
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                 <div className="relative z-10 flex justify-between items-start">
                     <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md shadow-inner border border-white/30 transform group-hover:-rotate-12 transition-transform duration-300">
                         <Layers className="w-10 h-10 text-white drop-shadow-md" /> 
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="bg-black/30 text-white text-xs font-black px-3 py-1 rounded-full border border-white/20 shadow-sm flex items-center gap-1 mb-1">
                            <Crown size={12} className="text-yellow-400" /> المستوى {matchingLevel}
                        </span>
                        <span className={`text-[10px] font-bold ${rank.color}`}>{rank.title}</span>
                     </div>
                 </div>
                 
                 <div className="relative z-10 mt-6 w-full">
                     <h2 className="text-3xl md:text-4xl font-black text-white drop-shadow-md mb-1">لعبة المطابقة</h2>
                     
                     {/* XP Progress Bar */}
                     <div className="w-full bg-black/30 h-3 rounded-full mb-3 overflow-hidden border border-white/10">
                         <div 
                            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000" 
                            style={{ width: `${progressPercent}%` }}
                         ></div>
                     </div>

                     <p className="text-indigo-100 font-bold text-xs leading-relaxed opacity-90 mb-4 flex justify-between">
                         <span>نظام المستويات والمكافآت</span>
                         <span className="text-yellow-300">{matchingXP} XP</span>
                     </p>
                     
                     <div className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black text-lg shadow-lg group-hover:scale-105 transition-transform">
                         <Play className="w-5 h-5 fill-current" />
                         العب الآن
                     </div>
                 </div>
             </div>
          </button>
      </div>

      <p className="mt-12 text-slate-500 dark:text-gray-400 font-bold text-xs flex items-center gap-2 bg-white/50 dark:bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm border border-slate-200 dark:border-neutral-800">
          <Brain className="w-4 h-4" />
          ملاحظة: جميع النقاط المكتسبة من أي لعبة تضاف لرصيدك العام مباشرة!
      </p>

    </div>
  );
};

export default GameHub;
