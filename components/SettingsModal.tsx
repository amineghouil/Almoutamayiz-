
import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, User, Trash2, Volume2, Save, Upload, LogOut, ChevronLeft } from 'lucide-react';
import { User as UserType } from '../types';
import { setGameVolume, playClickSound } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onUpdateUser: (updatedUser: UserType) => void;
  onResetProgress: () => void;
  onLogout: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user, onUpdateUser, onResetProgress, onLogout }) => {
  const [name, setName] = useState(user.name);
  const [volume, setVolume] = useState(user.volume ?? 80);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        setName(user.name);
        setVolume(user.volume ?? 80);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSave = () => {
    const updatedUser = { ...user, name, volume, theme: 'dark' as 'dark' };
    onUpdateUser(updatedUser);
    playClickSound();
    onClose();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseInt(e.target.value);
      setVolume(vol);
      setGameVolume(vol);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser({ ...user, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
      if(window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
          onLogout();
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col animate-slideIn">
      
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 bg-neutral-900 border-b border-neutral-800 shadow-sm shrink-0">
         <button 
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:bg-neutral-800 rounded-full transition-colors"
         >
            <ArrowRight className="w-6 h-6" />
         </button>
         
         <h2 className="text-lg font-bold">الإعدادات</h2>
         
         <div className="w-10"></div> {/* Spacer for center alignment */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Profile Section */}
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 shadow-sm flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-neutral-800 shadow-inner bg-neutral-800 flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-gray-500" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="w-8 h-8 text-white" />
              </div>
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
            />
            
            <div className="w-full text-center">
                <label className="text-xs text-slate-400 mb-1 block">الاسم الظاهر</label>
                <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-center text-xl font-bold bg-transparent border-b border-neutral-700 pb-2 focus:border-yellow-500 outline-none text-white transition-colors"
                />
            </div>
          </div>

          {/* Preferences Section */}
          <div className="space-y-4">
             <h3 className="text-sm font-bold text-slate-400 px-2">التفضيلات</h3>
             
             <div className="bg-neutral-900 rounded-2xl border border-neutral-800 shadow-sm overflow-hidden">
                
                {/* Volume */}
                <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-900/20 text-green-500">
                                <Volume2 size={20} />
                            </div>
                            <span className="font-medium">الأصوات</span>
                        </div>
                        <span className="text-sm font-mono text-slate-400">{volume}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={volume} 
                        onChange={handleVolumeChange}
                        onMouseUp={() => playClickSound()}
                        className="w-full accent-yellow-500 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
             </div>
          </div>

          {/* Account Actions */}
          <div className="space-y-4">
             <h3 className="text-sm font-bold text-slate-400 px-2">الحساب</h3>
             
             <div className="bg-neutral-900 rounded-2xl border border-neutral-800 shadow-sm overflow-hidden divide-y divide-neutral-800">
                <button 
                    onClick={() => {
                        if(window.confirm('هل أنت متأكد من رغبتك في تصفير النقاط؟')) {
                            onResetProgress();
                            onClose();
                        }
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition-colors text-right"
                >
                    <div className="flex items-center gap-3 text-red-500">
                        <Trash2 size={20} />
                        <span className="font-medium">إعادة تعيين التقدم</span>
                    </div>
                    <ChevronLeft size={16} className="text-slate-300" />
                </button>

                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition-colors text-right"
                >
                    <div className="flex items-center gap-3 text-red-500">
                        <LogOut size={20} />
                        <span className="font-medium">تسجيل خروج</span>
                    </div>
                    <ChevronLeft size={16} className="text-slate-300" />
                </button>
             </div>
          </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-neutral-900 border-t border-neutral-800 shrink-0 pb-safe">
        <button 
            onClick={handleSave}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
            <Save className="w-5 h-5" />
            <span>حفظ التعديلات</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
