import React, { useState, useEffect } from 'react';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import AuthScreen from './components/AuthScreen';
import AdminDashboard from './components/AdminDashboard';
import SelectionScreen from './components/SelectionScreen';
import BottomNav from './components/BottomNav';
import HomeScreen from './components/HomeScreen';
import LessonsScreen from './components/LessonsScreen';
import TeachersScreen from './components/TeachersScreen';
import CommunityScreen from './components/CommunityScreen';
import GameHub from './components/GameHub';
import SettingsModal from './components/SettingsModal';
import NotificationsModal from './components/NotificationsModal';
import CalculatorScreen from './components/CalculatorScreen';
import Header from './components/Header'; 
import MatchingGameSelectionScreen from './components/MatchingGameSelectionScreen'; 
import MatchingGame from './components/MatchingGame'; 
import UserProgressDashboard from './components/UserProgressDashboard';

import { GameState, Question, User, AppTab, Notification, MatchingGameData } from './types'; 
import { setGameVolume } from './utils/audio';
import { supabase } from './lib/supabase';
import { Session, RealtimeChannel } from '@supabase/supabase-js';

// Define explicit mapping for teachers to ensure frontend override
const TEACHER_ROLE_MAP: Record<string, string> = {
    'arabicadmin@almoutamayiz.com': 'teacher_arabic',
    'arabicadmine@almoutamayiz.com': 'teacher_arabic',
    'philosophyadmin@almoutamayiz.com': 'teacher_philosophy',
    'socialadmin@almoutamayiz.com': 'teacher_social'
};

const App: React.FC = () => {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>(GameState.AUTH);
  const [currentTab, setCurrentTab] = useState<AppTab>(() => {
      const saved = localStorage.getItem('app_current_tab');
      return (saved as AppTab) || 'home';
  });
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [finalPrize, setFinalPrize] = useState("0");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false); 
  
  // Matching Game State
  const [selectedMatchingGameData, setSelectedMatchingGameData] = useState<MatchingGameData | null>(null); 

  // App Settings
  const [appLogo, setAppLogo] = useState<string>('');

  // Notifications State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);

  useEffect(() => {
      localStorage.setItem('app_current_tab', currentTab);
  }, [currentTab]);

  useEffect(() => {
    if (currentTab !== 'community') {
        setIsChatActive(false);
    }
  }, [currentTab]);

  useEffect(() => {
      if (gameState !== GameState.AUTH && gameState !== GameState.PLAYING && gameState !== GameState.MATCHING_GAME) {
          localStorage.setItem('app_last_game_state', gameState);
      }
  }, [gameState]);

  // --- AUTH & SESSION MANAGEMENT ---
  useEffect(() => {
    let mounted = true;
    document.documentElement.classList.add('dark');

    const handleSession = async (session: Session | null) => {
        if (!mounted) return;
        if (session) {
            await fetchOrCreateProfile(session);
        } else {
            setCurrentUser(null);
            setGameState(GameState.AUTH);
            setLoading(false);
        }
    };

    supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
            console.error("Session init error:", error.message);
            const isAuthError = 
                error.message.includes("Refresh Token") || 
                error.message.includes("Invalid") || 
                error.message.includes("not found");

            if (isAuthError) {
                supabase.auth.signOut().catch(() => {});
                if(mounted) {
                    setCurrentUser(null);
                    setGameState(GameState.AUTH);
                    setLoading(false);
                }
            } else {
                if(mounted) setLoading(false);
            }
            return;
        }
        handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESH_REVOKED') {
            setLoading(false);
            setGameState(GameState.AUTH);
            setCurrentUser(null);
        } else if (session) {
            handleSession(session);
        }
    });
    
    const fetchSettings = async () => {
        const { data } = await supabase.from('app_settings').select('key, value');
        if (data) {
            data.forEach(setting => {
                if(setting.key === 'app_logo') setAppLogo(setting.value);
                if(setting.key === 'gemini_keys') localStorage.setItem('gemini_api_keys', setting.value);
            });
        }
    };
    fetchSettings();
    
    const settingsChannel = supabase.channel('settings_updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' }, (payload) => {
            if(payload.new.key === 'app_logo') setAppLogo(payload.new.value);
            if(payload.new.key === 'gemini_keys') localStorage.setItem('gemini_api_keys', payload.new.value);
        })
        .subscribe();

    return () => {
        mounted = false;
        subscription.unsubscribe();
        supabase.removeChannel(settingsChannel);
    };
  }, []);

  const fetchOrCreateProfile = async (session: Session) => {
      const timeoutId = setTimeout(() => {
          if (loading) setLoading(false);
      }, 8000);

      try {
          const { user } = session;
          let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

          if (profile) {
              loadUserIntoApp(profile, user.email);
          } else {
              const newProfile = {
                  id: user.id,
                  name: user.user_metadata.full_name || user.user_metadata.name || user.email?.split('@')[0] || 'User',
                  role: 'user',
                  avatar: user.user_metadata.avatar_url || user.user_metadata.picture,
                  total_earnings: 0,
                  volume: 80,
                  theme: 'dark',
                  last_login: new Date().toISOString().split('T')[0],
                  streak: 1
              };
              const { data: created } = await supabase.from('profiles').upsert(newProfile).select().single();
              if (created) loadUserIntoApp(created, user.email);
              else {
                  loadUserIntoApp(newProfile, user.email);
              }
          }
      } catch (err) {
          console.error("Profile fetch error:", err);
          setLoading(false); 
          alert("حدث خطأ أثناء تحميل البيانات. يرجى إعادة المحاولة.");
      } finally {
          clearTimeout(timeoutId);
      }
  };

  const loadUserIntoApp = async (profileData: any, email?: string) => {
      // --- FORCE ROLE ASSIGNMENT ---
      let finalRole = profileData.role;
      const cleanEmail = email?.toLowerCase().trim() || '';
      
      if (TEACHER_ROLE_MAP[cleanEmail]) {
          finalRole = TEACHER_ROLE_MAP[cleanEmail];
          if (profileData.role !== finalRole) {
              supabase.from('profiles').update({ role: finalRole }).eq('id', profileData.id).then();
          }
      }

      let currentStreak = profileData.streak || 0;
      let lastLoginDate = profileData.last_login;
      let totalPoints = profileData.total_earnings || 0;
      let bonusMessage = '';

      // --- LOGIN BONUS LOGIC ---
      const today = new Date().toISOString().split('T')[0];
      
      if (lastLoginDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (lastLoginDate === yesterdayStr) {
              currentStreak += 1;
          } else {
              currentStreak = 1; // Streak broken
          }

          let bonus = 2; 
          bonusMessage = 'مكافأة دخول يومي: +2 نقطة';

          if (currentStreak > 0 && currentStreak % 7 === 0) {
              bonus += 10;
              bonusMessage = 'مكافأة أسبوعية رائعة! +12 نقطة';
          }

          totalPoints += bonus;
          lastLoginDate = today;

          await supabase.from('profiles').update({
              last_login: today,
              streak: currentStreak,
              total_earnings: totalPoints
          }).eq('id', profileData.id);
          
          setTimeout(() => {
             if (bonusMessage) window.addToast(bonusMessage, 'success');
          }, 1500);
      }

      const mappedUser: User = {
          id: profileData.id,
          name: profileData.name,
          email: email || '',
          role: finalRole, 
          totalEarnings: totalPoints,
          avatar: profileData.avatar,
          volume: profileData.volume || 80,
          theme: 'dark',
          lastLogin: lastLoginDate,
          streak: currentStreak
      };

      setCurrentUser(mappedUser);
      setGameVolume(mappedUser.volume || 80);
      
      const savedState = localStorage.getItem('app_last_game_state');
      
      if (savedState === GameState.ADMIN && (finalRole === 'admin' || finalRole.startsWith('teacher_'))) {
          setGameState(GameState.ADMIN);
      } else if (savedState === GameState.APP || savedState === GameState.SELECTION || savedState === GameState.CALCULATOR || savedState === GameState.PROGRESS_DASHBOARD) {
          setGameState(savedState as GameState);
      } else {
          setGameState(GameState.APP);
      }

      fetchQuestions();
      setTimeout(() => fetchNotifications(mappedUser), 100);
      setLoading(false); 
  };

  const fetchQuestions = async () => {
      const { data } = await supabase.from('questions').select('*');
      if (data) {
          const mappedQuestions = data.map((q: any) => ({
              id: q.id,
              text: q.text,
              options: q.options,
              correctAnswerIndex: q.correct_answer_index,
              prize: "0",
              difficulty: q.difficulty || 'easy',
              subject: q.subject,
              chapter: q.chapter,
              lesson: q.lesson
          }));
          setQuestions(mappedQuestions);
      }
  };

  const fetchNotifications = async (userObj?: User) => {
      const userToUse = userObj || currentUser;
      if (!userToUse) return;

      // 1. Fetch System Notifications
      const { data: sysNotifs } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${userToUse.id}`)
        .order('created_at', { ascending: false });
      
      // 2. Fetch Chat Messages targeted as replies (Subject: consultation_reply_<ID>)
      // This bypasses the admin_messages RLS limitation for students
      const { data: chatReplies } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('subject', `consultation_reply_${userToUse.id}`)
        .order('created_at', { ascending: false });

      // Merge them
      const combinedNotifs: Notification[] = [];
      
      if (sysNotifs) combinedNotifs.push(...sysNotifs);
      
      if (chatReplies) {
          chatReplies.forEach((msg: any) => {
              // Parse potential JSON content for replies
              let notifContent = msg.content;
              let isReply = false;
              let replyData = undefined;
              
              try {
                  const parsed = JSON.parse(msg.content);
                  if (parsed.type === 'consultation_reply') {
                      isReply = true;
                      notifContent = parsed.answer || msg.content;
                      replyData = parsed;
                  }
              } catch (e) {}

              // Convert replied message to notification format
              const notif: Notification = {
                  id: -msg.id, // Use negative ID to avoid collision with real notifications
                  title: 'تم الرد على استشارتك',
                  content: notifContent,
                  created_at: msg.created_at,
                  user_id: msg.user_id,
                  is_consultation_reply: isReply,
                  reply_data: replyData
              };
              combinedNotifs.push(notif);
          });
      }

      // Sort combined by date
      combinedNotifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (combinedNotifs.length > 0) {
          setNotifications(combinedNotifs);
          checkUnread(combinedNotifs);
      }
  };

  useEffect(() => {
    if (!currentUser) return;
    
    // Channel for System Notifications
    const sysChannel: RealtimeChannel = supabase.channel(`notifications_user_${currentUser.id}`)
      .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications'
      }, (payload) => {
          const newNotif = payload.new as Notification;
          if (newNotif.user_id === null || newNotif.user_id === currentUser.id) {
              setNotifications(prev => [newNotif, ...prev.filter(n => n.id !== newNotif.id)]);
              playNotifSound();
              if (!isNotifOpen) setHasUnreadNotifs(true);
          }
      })
      .subscribe();

    // Channel for Chat Replies (Teacher to Student) - Using the special channel ID
    const chatChannel = supabase.channel(`consultation_reply_${currentUser.id}`)
      .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `subject=eq.consultation_reply_${currentUser.id}`
      }, (payload) => {
          const msg = payload.new;
          let notifContent = msg.content;
          let replyData = undefined;
          
          try {
              const parsed = JSON.parse(msg.content);
              if (parsed.type === 'consultation_reply') {
                  notifContent = parsed.answer;
                  replyData = parsed;
              }
          } catch(e) {}

          const notif: Notification = {
              id: -msg.id,
              title: 'تم الرد على استشارتك',
              content: notifContent,
              created_at: msg.created_at,
              user_id: msg.user_id,
              is_consultation_reply: true,
              reply_data: replyData
          };
          setNotifications(prev => [notif, ...prev.filter(n => n.id !== notif.id)]);
          playNotifSound();
          if (!isNotifOpen) setHasUnreadNotifs(true);
      })
      .subscribe();

    return () => { 
        supabase.removeChannel(sysChannel); 
        supabase.removeChannel(chatChannel);
    };
  }, [currentUser, isNotifOpen]);

  const playNotifSound = () => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
  };

  const checkUnread = (notifs: Notification[]) => {
      const readIdsString = localStorage.getItem('readNotifications');
      const readIds = readIdsString ? JSON.parse(readIdsString) : [];
      const hasUnread = notifs.some(n => !readIds.includes(n.id));
      setHasUnreadNotifs(hasUnread);
  };

  const handleOpenNotifications = () => {
      setIsNotifOpen(true);
      setHasUnreadNotifs(false);
  };

  const handleLogin = async (email: string, pass: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
        setLoading(false);
        throw error; 
    }
  };

  const handleRegister = async (name: string, email: string, pass: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { data: { name: name } }
    });

    if (error) {
        setLoading(false);
        throw error; 
    } else if (data.session) {
         await supabase.from('profiles').upsert({
            id: data.user!.id,
            name: name,
            role: 'user', 
            total_earnings: 0,
            theme: 'dark'
        });
    } else {
        setLoading(false);
        throw new Error("CONFIRMATION_SENT");
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    if (!currentUser) return;
    setCurrentUser(updatedUser);
    await supabase.from('profiles').update({
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        volume: updatedUser.volume,
        theme: 'dark',
        total_earnings: updatedUser.totalEarnings
    }).eq('id', currentUser.id);
  };

  const handleLogout = async () => {
      try {
          setLoading(true);
          await supabase.auth.signOut();
          localStorage.removeItem('app_last_game_state');
          localStorage.removeItem('app_current_tab');
      } catch (error) {
          console.error("Logout failed:", error);
      } finally {
          setCurrentUser(null);
          setGameState(GameState.AUTH);
          setLoading(false);
      }
  };

  const startGame = (selectedQuestions: Question[]) => {
    const shuffled = [...selectedQuestions].sort(() => 0.5 - Math.random());
    const finalSet = shuffled.slice(0, 15);
    const difficultyMap = { 'easy': 1, 'medium': 2, 'hard': 3 };
    finalSet.sort((a, b) => difficultyMap[a.difficulty] - difficultyMap[b.difficulty]);

    setFilteredQuestions(finalSet);
    setFinalPrize("0");
    setGameState(GameState.PLAYING);
  };

  return (
    <main className="min-h-screen w-full overflow-hidden relative font-cairo bg-black text-white">
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black">
            <div className="loader animate-spin-fast">
                <div className="loader-dot"></div><div className="loader-dot"></div><div className="loader-dot"></div><div className="loader-dot"></div><div className="loader-dot"></div>
            </div>
            <p className="mt-6 text-amber-400 text-xl font-bold tracking-widest">جاري التحميل...</p>
        </div>
      )}

      {currentUser && (
          <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            user={currentUser}
            onUpdateUser={handleUpdateUser}
            onResetProgress={() => handleUpdateUser({...currentUser, totalEarnings: 0})}
            onLogout={handleLogout}
          />
      )}

      <NotificationsModal 
         isOpen={isNotifOpen} 
         onClose={() => setIsNotifOpen(false)} 
         notifications={notifications} 
      />

      {gameState === GameState.AUTH && !loading && (
        <AuthScreen onLogin={handleLogin} onRegister={handleRegister} />
      )}

      {gameState === GameState.APP && currentUser && (
        <>
            {!isChatActive && (
                <Header
                    user={currentUser}
                    appLogo={appLogo}
                    hasUnreadNotifs={hasUnreadNotifs}
                    onOpenNotifications={handleOpenNotifications}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onLogout={handleLogout}
                    onNavigate={(state) => setGameState(state)}
                />
            )}
            
            <div className={isChatActive ? 'h-screen' : "pt-20 pb-16 h-screen overflow-y-auto custom-scrollbar"}>
                {currentTab === 'home' && <HomeScreen user={currentUser} onUpdateUser={handleUpdateUser} />}
                {currentTab === 'lessons' && <LessonsScreen onUpdateUserScore={(points) => handleUpdateUser({...currentUser, totalEarnings: currentUser.totalEarnings + points})} />}
                {currentTab === 'teachers' && currentUser && <TeachersScreen user={currentUser} />}
                {currentTab === 'community' && <CommunityScreen user={currentUser} onChatStateChange={setIsChatActive} />}
                {currentTab === 'game' && (
                    <div className="h-full">
                        <GameHub 
                            user={currentUser} 
                            onStart={() => setGameState(GameState.SELECTION)} 
                            onStartMatchingGame={() => { 
                                setGameState(GameState.MATCHING_GAME_SELECTION);
                            }}
                        />
                    </div>
                )}
            </div>
            
            {!isChatActive && (
                <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
            )}
        </>
      )}

      {/* FULL SCREEN OVERLAYS */}

      {gameState === GameState.SELECTION && (
        <div className="fixed inset-0 bg-black z-50 overflow-y-auto">
             <SelectionScreen 
                questions={questions} 
                onStartGame={startGame} 
                onBack={() => setGameState(GameState.APP)} 
             />
        </div>
      )}

      {gameState === GameState.PLAYING && (
          <div className="fixed inset-0 z-[60] bg-black">
            <GameScreen 
                questions={filteredQuestions} 
                onGameOver={(amount, val) => {
                    setFinalPrize(amount);
                    handleUpdateUser({ ...currentUser!, totalEarnings: currentUser!.totalEarnings + val });
                    setGameState(GameState.GAME_OVER);
                }}
                onVictory={(amount, val) => {
                    setFinalPrize(amount);
                    handleUpdateUser({ ...currentUser!, totalEarnings: currentUser!.totalEarnings + val });
                    setGameState(GameState.VICTORY);
                }}
                onExit={() => setGameState(GameState.APP)}
            />
          </div>
      )}

      {gameState === GameState.MATCHING_GAME_SELECTION && currentUser && (
         <div className="fixed inset-0 z-[60] bg-black overflow-y-auto">
             <MatchingGameSelectionScreen
                onStartGame={(gameConfig) => {
                    setSelectedMatchingGameData(gameConfig);
                    setGameState(GameState.MATCHING_GAME);
                }}
                onBack={() => setGameState(GameState.APP)}
             />
         </div>
      )}

      {gameState === GameState.MATCHING_GAME && currentUser && selectedMatchingGameData && (
         <div className="fixed inset-0 z-[60] bg-black">
             <MatchingGame 
                user={currentUser} 
                onExit={() => {
                    setGameState(GameState.MATCHING_GAME_SELECTION); 
                    setSelectedMatchingGameData(null); 
                }}
                onUpdateScore={(points) => handleUpdateUser({...currentUser, totalEarnings: currentUser.totalEarnings + points})} 
                gameConfig={selectedMatchingGameData}
             />
         </div>
      )}

      {gameState === GameState.CALCULATOR && (
         <div className="fixed inset-0 z-[60] bg-black overflow-y-auto">
             <CalculatorScreen onBack={() => setGameState(GameState.APP)} />
         </div>
      )}
      
      {gameState === GameState.PROGRESS_DASHBOARD && currentUser && (
         <div className="fixed inset-0 z-[60] bg-black overflow-y-auto">
             <UserProgressDashboard user={currentUser} onBack={() => setGameState(GameState.APP)} />
         </div>
      )}

      {gameState === GameState.ADMIN && currentUser && (
          <div className="fixed inset-0 z-[60] overflow-y-auto bg-black">
              <AdminDashboard 
                 currentUser={currentUser}
                 questions={questions}
                 onAddQuestion={async (q) => {
                     const dbQ = {
                        text: q.text, options: q.options, correct_answer_index: q.correctAnswerIndex,
                        difficulty: q.difficulty, subject: q.subject, chapter: q.chapter, lesson: q.lesson, prize: "0"
                     };
                     await supabase.from('questions').insert(dbQ);
                     fetchQuestions();
                 }}
                 onDeleteQuestion={async (id) => {
                     if(window.confirm("حذف؟")) {
                        await supabase.from('questions').delete().eq('id', id);
                        fetchQuestions();
                     }
                 }}
                 onLogout={() => {
                     setGameState(GameState.APP);
                 }}
                 onPlay={() => setGameState(GameState.APP)}
                 onSeedQuestions={() => {}} 
              />
          </div>
      )}
    </main>
  );
};

export default App;