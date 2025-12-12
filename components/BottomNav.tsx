import React from 'react';
import { Home, BookOpen, Gamepad2, Users, GraduationCap } from 'lucide-react';
import { AppTab } from '../types';

interface BottomNavProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {

  // Reordered according to user request: Lessons -> Teachers -> Home -> Community -> Games
  const tabs = [
    { 
      id: 'lessons' as AppTab, 
      label: 'الدروس', 
      icon: <BookOpen className="w-6 h-6" strokeWidth={2.5} />,
      activeColor: 'text-green-500 dark:text-green-400',
      glowColor: 'drop-shadow-[0_0_10px_rgba(34,197,94,0.7)]'
    },
    { 
      id: 'teachers' as AppTab, 
      label: 'الأساتذة', 
      icon: <GraduationCap className="w-6 h-6" strokeWidth={2.5} />,
      activeColor: 'text-pink-500 dark:text-pink-400',
      glowColor: 'drop-shadow-[0_0_10px_rgba(236,72,153,0.7)]'
    },
    { 
      id: 'home' as AppTab, 
      label: 'الرئيسية', 
      icon: <Home className="w-6 h-6" strokeWidth={2.5} />,
      activeColor: 'text-blue-600 dark:text-yellow-500',
      glowColor: 'drop-shadow-[0_0_15px_rgba(59,130,246,0.9)] dark:drop-shadow-[0_0_15px_rgba(234,179,8,0.9)]',
    },
    { 
      id: 'community' as AppTab, 
      label: 'المجتمع', 
      icon: <Users className="w-6 h-6" strokeWidth={2.5} />,
      activeColor: 'text-orange-500 dark:text-orange-400',
      glowColor: 'drop-shadow-[0_0_10px_rgba(249,115,22,0.7)]'
    },
    { 
      id: 'game' as AppTab, 
      label: 'الألعاب', 
      icon: <Gamepad2 className="w-6 h-6" strokeWidth={2.5} />,
      activeColor: 'text-purple-500 dark:text-purple-400',
      glowColor: 'drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]'
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-white/90 dark:bg-black/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-neutral-800/50 rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.5)] px-2 pb-1 pt-2 flex justify-around items-center h-16">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              
              return (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex flex-col items-center justify-center gap-1 p-1 rounded-xl transition-all duration-300 relative flex-1
                    ${isActive
                        ? `${tab.activeColor} transform -translate-y-1` 
                        : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300'
                    }`}
                >
                    <div className={`transition-all duration-300 ${isActive ? tab.glowColor : ''}`}>
                        {tab.icon}
                    </div>
                    
                    <span className={`text-[10px] sm:text-xs transition-all ${isActive ? 'font-bold opacity-100' : 'opacity-80'}`}>
                        {tab.label}
                    </span>
                </button>
              );
            })}
        </div>
    </div>
  );
};

export default BottomNav;