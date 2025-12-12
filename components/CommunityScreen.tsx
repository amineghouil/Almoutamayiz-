import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage } from '../types';
import { Send, User as UserIcon, ChevronRight, Play, Pause, Heart, Image as ImageIcon, X, ZoomIn, ArrowDown, Crown, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CommunityScreenProps {
  user: User;
  onChatStateChange: (isActive: boolean) => void;
}

const ROOMS = [
    { id: 'عام', label: 'المناقشة العامة', description: 'ملتقى الجميع للنقاشات العامة والترفيه', icon: '☕', color: 'from-slate-700 to-slate-900', size: 'large' },
    { id: 'الفلسفة', label: 'الفلسفة', description: 'مقالات، إشكاليات، ونقاشات فلسفية', icon: '🤔', color: 'from-purple-600 to-purple-400' },
    { id: 'اللغة العربية', label: 'الأدب العربي', description: 'الشعر، النثر، والقواعد', icon: '📖', color: 'from-green-600 to-green-400' },
    { id: 'التاريخ', label: 'التاريخ', description: 'الشخصيات، التواريخ، والمصطلحات', icon: '📜', color: 'from-orange-600 to-orange-400' },
    { id: 'الجغرافيا', label: 'الجغرافيا', description: 'الخرائط والمصطلحات الاقتصادية', icon: '🗺️', color: 'from-blue-600 to-blue-400' },
    { id: 'الرياضيات', label: 'الرياضيات', description: 'المسائل، التمارين، والقوانين', icon: '📐', color: 'from-cyan-600 to-cyan-400' },
    { id: 'اللغات', label: 'اللغات الأجنبية', description: 'الإنجليزية والفرنسية', icon: '🗣️', color: 'from-red-600 to-red-400' },
    { id: 'الشريعة', label: 'العلوم الإسلامية', description: 'الآيات، الأحكام، والقيم', icon: '🕌', color: 'from-emerald-600 to-emerald-400' },
];

const CommunityScreen: React.FC<CommunityScreenProps> = ({ user, onChatStateChange }) => {
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [likedIds, setLikedIds] = useState<number[]>([]);

  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Scroll Management
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  useEffect(() => {
    onChatStateChange(activeRoom !== null);
  }, [activeRoom, onChatStateChange]);
  
  useEffect(() => {
    // Load liked messages from local storage on mount
    const storedLikes = localStorage.getItem('liked_messages');
    if (storedLikes) {
        setLikedIds(JSON.parse(storedLikes));
    }
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    fetchMessages();

    const channel = supabase
      .channel(`room:${activeRoom}`)
      .on('postgres_changes', { 
          event: '*',
          schema: 'public', 
          table: 'chat_messages',
          filter: `subject=eq.${activeRoom}` 
      }, (payload) => {
          if (payload.eventType === 'INSERT') {
             const newMsgId = payload.new.id;
             if (payload.new.user_id !== user.id) {
                fetchSingleMessageAndAppend(newMsgId, true);
             }
          } else if (payload.eventType === 'UPDATE') {
             setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, likes: payload.new.likes } : m));
          } else if (payload.eventType === 'DELETE') {
             setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeRoom]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 150;
      if (isScrolledToBottom) {
        setShowScrollDown(false);
      }
    }
  };

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesContainerRef.current?.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: behavior
    });
    setShowScrollDown(false);
  };

  const fetchMessages = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('chat_messages')
        .select(`*, profiles (name, avatar, role)`)
        .eq('subject', activeRoom) 
        .order('created_at', { ascending: false }) 
        .limit(50);
      
      if (data) setMessages(data.reverse() as any);
      setLoading(false);
      setTimeout(() => scrollToBottom('auto'), 100);
  };

  const fetchSingleMessageAndAppend = async (id: number, isFromSubscription: boolean = false) => {
      const container = messagesContainerRef.current;
      const isAtBottom = container ? container.scrollHeight - container.clientHeight <= container.scrollTop + 150 : true;

      const { data } = await supabase
        .from('chat_messages')
        .select(`*, profiles (name, avatar, role)`)
        .eq('id', id)
        .single();
    
      if (data) {
          setMessages(prev => [...prev, data as any]);
          if (isFromSubscription && !isAtBottom) {
              setShowScrollDown(true);
          } else {
              setTimeout(() => scrollToBottom(), 100);
          }
      }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAndSendImage(file);
  };

  const uploadAndSendImage = async (file: File) => {
      if (!activeRoom) return;
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `img_${Date.now()}_${user.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('chat-images').upload(fileName, file);
      if (uploadError) { setIsUploading(false); return alert("فشل رفع الصورة"); }
      const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(fileName);
      await sendMessageToDB('صورة', 'image', publicUrl);
      setIsUploading(false);
  };

  const handleSendText = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || !activeRoom) return;
      const text = newMessage;
      setNewMessage('');
      await sendMessageToDB(text, 'text');
  };

  const sendMessageToDB = async (content: string, type: 'text'|'audio'|'image', mediaUrl?: string) => {
      if(!activeRoom) return;
      const tempId = Date.now();
      const optimisticMessage: ChatMessage = {
          id: tempId,
          user_id: user.id,
          content: content,
          type: type,
          media_url: mediaUrl,
          created_at: new Date().toISOString(),
          likes: 0,
          subject: activeRoom,
          profiles: { name: user.name, avatar: user.avatar || '', role: user.role }
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setTimeout(() => scrollToBottom(), 100);

      try {
          const { error } = await supabase.from('chat_messages').insert({
              user_id: user.id,
              content: content,
              type: type,
              media_url: mediaUrl,
              subject: activeRoom
          });
          if (error) console.error("Error sending:", error);
      } catch (err) { console.error(err); }
  };

  const handleLike = async (msgId: number, currentLikes: number) => {
      const isLiked = likedIds.includes(msgId);
      
      let newLikes;
      let newLikedIds;

      if (isLiked) {
          // Unlike logic
          newLikes = Math.max(0, currentLikes - 1);
          newLikedIds = likedIds.filter(id => id !== msgId);
      } else {
          // Like logic
          newLikes = currentLikes + 1;
          newLikedIds = [...likedIds, msgId];
      }

      // Optimistic Update
      setLikedIds(newLikedIds);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, likes: newLikes } : m));
      localStorage.setItem('liked_messages', JSON.stringify(newLikedIds));

      // DB Update
      await supabase.from('chat_messages').update({ likes: newLikes }).eq('id', msgId);
  };

  const AudioPlayer = ({ src }: { src: string }) => {
      const audioRef = useRef<HTMLAudioElement>(null);
      const [isPlaying, setIsPlaying] = useState(false);
      const togglePlay = () => {
          if (!audioRef.current) return;
          if (isPlaying) audioRef.current.pause();
          else audioRef.current.play();
          setIsPlaying(!isPlaying);
      };
      return (
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/20 rounded-xl p-2 min-w-[150px]">
              <button onClick={togglePlay} className="p-2 bg-blue-500 dark:bg-yellow-500 rounded-full text-white dark:text-black">
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="flex-1 h-1 bg-slate-300 dark:bg-neutral-600 rounded-full overflow-hidden">
                  <div className={`h-full bg-blue-500 dark:bg-yellow-500 ${isPlaying ? 'animate-pulse w-full' : 'w-1/2'}`}></div>
              </div>
              <audio ref={audioRef} src={src} onEnded={() => setIsPlaying(false)} className="hidden" />
          </div>
      );
  };

  if (!activeRoom) {
      return (
          <div className="p-4 sm:p-6 pb-24 animate-fadeIn min-h-screen">
              <div className="text-center mb-8 mt-4">
                  <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">مجتمع المتميز</h2>
                  <p className="text-slate-500 dark:text-gray-400">اختر الغرفة المناسبة وابدأ النقاش مع زملائك</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  {ROOMS.map((room) => (
                      <button key={room.id} onClick={() => setActiveRoom(room.id)} className={`relative overflow-hidden rounded-3xl p-6 shadow-xl transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl group flex flex-col items-center justify-center text-center ${room.size === 'large' ? 'col-span-2 md:col-span-3 h-48' : 'col-span-1 h-56'} bg-gradient-to-br ${room.color}`}>
                          <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                          <div className={`relative z-10 transition-transform duration-500 group-hover:scale-110 ${room.size === 'large' ? 'mb-4' : 'mb-6'}`}><span className="text-[4rem] drop-shadow-lg">{room.icon}</span></div>
                          <div className="relative z-10 text-white w-full">
                              <h3 className={`font-black mb-2 drop-shadow-md ${room.size === 'large' ? 'text-3xl' : 'text-xl'}`}>{room.label}</h3>
                              <p className="text-white/90 text-xs sm:text-sm font-medium opacity-90 mx-auto max-w-[90%]">{room.description}</p>
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      );
  }

  const currentRoomInfo = ROOMS.find(r => r.id === activeRoom);

  return (
    <div className="flex flex-col h-full bg-black animate-slideIn overflow-hidden relative">
      {selectedImage && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setSelectedImage(null)}>
              <button className="absolute top-4 right-4 text-white p-2 bg-white/10 rounded-full"><X size={24} /></button>
              <img src={selectedImage} alt="Full view" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
          </div>
      )}

      <div className={`bg-gradient-to-r ${currentRoomInfo?.color || 'from-slate-700 to-slate-900'} p-4 shadow-md z-20`}>
          <div className="flex items-center gap-3">
              <button onClick={() => setActiveRoom(null)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"><ChevronRight className="w-6 h-6" /></button>
              <div className="flex-1 text-white text-center pr-10">
                  <h3 className="font-bold text-lg flex items-center justify-center gap-2"><span>{currentRoomInfo?.icon}</span>{currentRoomInfo?.label}</h3>
              </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-black bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] dark:bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] custom-scrollbar relative" ref={messagesContainerRef} onScroll={handleScroll}>
        {loading && messages.length === 0 ? <div className="text-center text-slate-400 mt-10">جاري التحميل...</div> : messages.map((msg) => {
            const isMe = msg.user_id === user.id;
            const isAdmin = msg.profiles?.role === 'admin';
            const isLiked = likedIds.includes(msg.id);
            
            // Special styling for Admin
            let msgBubbleClass = isMe 
                ? 'bg-blue-600 dark:bg-yellow-500 text-white dark:text-black rounded-br-none' 
                : 'bg-white dark:bg-emerald-500/20 text-slate-800 dark:text-green-200 border border-slate-200 dark:border-emerald-500/40 rounded-bl-none';
            
            if (!isMe && isAdmin) {
                msgBubbleClass = 'bg-gradient-to-br from-yellow-900/30 to-amber-900/10 text-yellow-100 border border-yellow-500/50 rounded-bl-none shadow-[0_0_15px_rgba(234,179,8,0.1)]';
            }

            return (
                <div key={msg.id} className={`flex gap-2 sm:gap-3 animate-fadeIn ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="flex-shrink-0 self-end mb-1">
                        {isAdmin ? (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-yellow-400 to-amber-600 flex items-center justify-center border-2 border-yellow-300 shadow-lg shadow-yellow-500/20">
                                <Crown size={18} className="text-white fill-white" />
                            </div>
                        ) : msg.profiles?.avatar ? (
                            <img src={msg.profiles.avatar} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white dark:border-neutral-800 shadow-sm" alt="avatar" />
                        ) : (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-200 dark:bg-neutral-800 flex items-center justify-center border-2 border-white dark:border-neutral-800 shadow-sm">
                                <UserIcon size={16} className="text-slate-500" />
                            </div>
                        )}
                    </div>
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                        <div className="flex items-center gap-2 mb-1">
                            {!isMe && (
                                <span className={`text-[10px] sm:text-xs font-bold px-2 flex items-center gap-1 ${isAdmin ? 'text-yellow-400 drop-shadow-sm' : 'text-slate-600 dark:text-gray-400'}`}>
                                    {isAdmin && <ShieldCheck size={10} className="text-yellow-400" />}
                                    {msg.profiles?.name || 'مجهول'}
                                </span>
                            )}
                        </div>
                        <div className={`p-3 sm:p-4 rounded-2xl text-sm leading-relaxed shadow-sm break-words relative overflow-hidden ${msgBubbleClass}`}>
                            {msg.type === 'audio' && msg.media_url ? <AudioPlayer src={msg.media_url} /> : msg.type === 'image' && msg.media_url ? <div className="relative group cursor-pointer" onClick={() => setSelectedImage(msg.media_url!)}><img src={msg.media_url} alt="Shared" className="rounded-lg max-h-48 object-cover w-full" /><div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg"><ZoomIn className="text-white w-6 h-6" /></div></div> : msg.content}
                        </div>
                        <div className="flex items-center gap-2 mt-1 px-1">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 opacity-70">{new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                            <button 
                                onClick={() => handleLike(msg.id, msg.likes)} 
                                className={`flex items-center gap-1 text-[10px] transition-colors ${isLiked ? 'text-red-500 font-bold' : 'text-slate-400 hover:text-red-500'}`}
                            >
                                <Heart className={`w-3 h-3 ${isLiked ? 'fill-red-500' : ''}`} />
                                {msg.likes > 0 && <span>{msg.likes}</span>}
                            </button>
                        </div>
                    </div>
                </div>
            );
        })}
         {showScrollDown && (
            <button
                onClick={() => scrollToBottom()}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-blue-500/80 dark:bg-yellow-500/80 backdrop-blur-md text-white dark:text-black px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold animate-bounce"
            >
                <ArrowDown size={14} />
                <span>رسائل جديدة</span>
            </button>
        )}
      </div>

      <div className="p-3 bg-white dark:bg-neutral-900 border-t border-slate-200 dark:border-neutral-800 pb-safe">
        <form onSubmit={handleSendText} className="flex gap-2 relative items-end max-w-4xl mx-auto w-full">
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
            <button type="button" disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="h-[48px] w-[48px] flex items-center justify-center bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-gray-300 rounded-full hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors shrink-0">{isUploading ? <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : <ImageIcon className="w-5 h-5" />}</button>
            <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={`اكتب رسالة في ${activeRoom}...`} className="flex-1 bg-slate-100 dark:bg-black border border-slate-300 dark:border-neutral-800 rounded-3xl px-5 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-yellow-500 transition-colors resize-none max-h-32 min-h-[48px]" rows={1} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(e); } }} />
            <button type="submit" disabled={!newMessage.trim()} className="h-[48px] w-[48px] flex items-center justify-center bg-blue-600 dark:bg-yellow-500 text-white dark:text-black rounded-full hover:bg-blue-700 dark:hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 shrink-0"><Send className="w-5 h-5 rtl:-rotate-90 ml-1" /></button>
        </form>
      </div>
    </div>
  );
};

export default CommunityScreen;
