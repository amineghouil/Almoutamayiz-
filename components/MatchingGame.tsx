
import React, { useState, useEffect, useRef } from 'react';
import { User, MatchingGameData, MatchItem } from '../types';
import { ArrowLeft, RotateCcw, Volume2, VolumeX, Medal, Loader2, XCircle, Trophy, Check, ArrowRight, Lock, Unlock, Shield, Zap, Lightbulb, Frown, RefreshCw } from 'lucide-react';
import { playClickSound, playCorrectSound, playWrongSound, playVictorySound, playLifelineSound } from '../utils/audio';

// Music URL (Loopable game track)
const BGM_URL = "https://cdn.pixabay.com/download/audio/2022/03/24/audio_07865f3b74.mp3?filename=game-music-loop-7-145285.mp3";

interface MatchingGameProps {
    user: User;
    onExit: () => void;
    onUpdateScore: (points: number) => void;
    gameConfig: MatchingGameData | null;
}

const ITEMS_PER_LEVEL = 5; // 5 Pairs = 10 Cards

const MatchingGame: React.FC<MatchingGameProps> = ({ user, onExit, onUpdateScore, gameConfig }) => {
    // Game States: Added 'game_over'
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'level_complete' | 'victory' | 'game_over'>('loading');
    
    // Level & Progress State
    const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
    const [unlockedLevelIndex, setUnlockedLevelIndex] = useState(0);

    // Play States
    const [score, setScore] = useState(0);
    const [leftItems, setLeftItems] = useState<MatchItem[]>([]);
    const [rightItems, setRightItems] = useState<MatchItem[]>([]);
    const [selectedLeft, setSelectedLeft] = useState<MatchItem | null>(null);
    const [selectedRight, setSelectedRight] = useState<MatchItem | null>(null);
    const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [isMusicEnabled, setIsMusicEnabled] = useState(true);
    
    // Power-ups & Combo
    const [streak, setStreak] = useState(0);
    const [hasShield, setHasShield] = useState(false);
    const [hintsCount, setHintsCount] = useState(3);
    const [hintPair, setHintPair] = useState<{left: string, right: string} | null>(null);

    // Refs
    const audioRef = useRef<HTMLAudioElement | null>(null);
    
    // Auto-start & Load Progress
    useEffect(() => {
        if (!gameConfig) {
            setGameState('loading');
            return;
        }

        // Load progress for this specific mode/user
        const storageKey = `matching_progress_${user.id}_${gameConfig.modeId}`;
        const savedLevel = localStorage.getItem(storageKey);
        const startLevel = savedLevel ? parseInt(savedLevel) : 0;
        
        setUnlockedLevelIndex(startLevel);
        setCurrentLevelIndex(startLevel);
        
        initializeLevel(startLevel);

        // Initialize Audio
        if (!audioRef.current) {
            audioRef.current = new Audio(BGM_URL);
            audioRef.current.loop = true;
            audioRef.current.volume = 0.3;
        }

        return () => stopGameAudio();
    }, [gameConfig]); 

    // Handle Music
    useEffect(() => {
        if (!audioRef.current) return;
        if ((gameState === 'playing' || gameState === 'level_complete') && isMusicEnabled) {
            audioRef.current.play().catch(e => console.log("Audio play failed:", e));
        } else {
            audioRef.current.pause();
        }
    }, [gameState, isMusicEnabled]);

    const stopGameAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const initializeLevel = (levelIndex: number) => {
        if (!gameConfig) return;

        const totalItems = gameConfig.items.length;
        const startIndex = levelIndex * ITEMS_PER_LEVEL;
        const endIndex = Math.min(startIndex + ITEMS_PER_LEVEL, totalItems);
        
        // If we ran out of items, it's total victory
        if (startIndex >= totalItems) {
            setGameState('victory');
            playVictorySound();
            return;
        }

        const levelItems = gameConfig.items.slice(startIndex, endIndex);

        setSelectedLeft(null);
        setSelectedRight(null);
        setMatchedPairs([]);
        setFeedback(null);
        setStreak(0);
        setHasShield(true); // Grant a shield at start of level
        setHintPair(null);
        setGameState('playing');

        // Create shallow copy and shuffle right side
        const shuffledRight = [...levelItems].sort(() => 0.5 - Math.random());
        const shuffledLeft = [...levelItems].sort(() => 0.5 - Math.random()); 
        
        setLeftItems(shuffledLeft); 
        setRightItems(shuffledRight);
    };

    const handleRetryLevel = () => {
        // Reset score logic if needed, here we just retry
        initializeLevel(currentLevelIndex);
    };

    const handleItemClick = (item: MatchItem, side: 'left' | 'right') => {
        if (gameState !== 'playing' || matchedPairs.includes(item.id)) return;
        playClickSound();
        setHintPair(null); // Clear hint on interaction

        if (side === 'left') {
            setSelectedLeft(prev => prev?.id === item.id ? null : item);
        } else {
            setSelectedRight(prev => prev?.id === item.id ? null : item);
        }
    };

    const activateHint = () => {
        if (hintsCount <= 0 || hintPair) return;
        
        // Find a pair that isn't matched yet
        const availableLeft = leftItems.find(l => !matchedPairs.includes(l.id));
        if (availableLeft) {
            setHintPair({ left: availableLeft.id, right: availableLeft.id });
            setHintsCount(prev => prev - 1);
            playLifelineSound();
        }
    };

    // Match Check Logic
    useEffect(() => {
        if (selectedLeft && selectedRight) {
            if (selectedLeft.id === selectedRight.id) {
                // Correct
                playCorrectSound();
                setFeedback('correct');
                
                setStreak(prev => prev + 1);
                setMatchedPairs(prev => [...prev, selectedLeft.id]);

                setTimeout(() => {
                    setSelectedLeft(null);
                    setSelectedRight(null);
                    setFeedback(null);
                    
                    // Check Level Completion
                    if (matchedPairs.length + 1 === leftItems.length) {
                        completeLevel();
                    }
                }, 500);

            } else {
                // Wrong
                playWrongSound();
                setFeedback('wrong');
                setStreak(0); // Reset streak

                // STRICT LOSS LOGIC
                if (hasShield) {
                    setHasShield(false); // Consume shield
                    // Reset selection after delay
                    setTimeout(() => {
                        setSelectedLeft(null);
                        setSelectedRight(null);
                        setFeedback(null);
                    }, 700);
                } else {
                    // GAME OVER
                    setTimeout(() => {
                        setGameState('game_over');
                    }, 700);
                }
            }
        }
    }, [selectedLeft, selectedRight]);

    const saveUserProgress = (pointsGained: number) => {
        // Push earnings to main app score
        onUpdateScore(pointsGained); 
        window.addToast(`أكملت المستوى! +${pointsGained} نقاط`, 'success');
    };

    const completeLevel = () => {
        const nextLevelIndex = currentLevelIndex + 1;
        const totalLevels = Math.ceil((gameConfig?.items.length || 0) / ITEMS_PER_LEVEL);

        const pointsGained = 3; // Fixed small points per level
        saveUserProgress(pointsGained);

        if (nextLevelIndex >= totalLevels) {
            setGameState('victory');
            playVictorySound();
        } else {
            setGameState('level_complete');
            // Save Progress
            if (nextLevelIndex > unlockedLevelIndex) {
                setUnlockedLevelIndex(nextLevelIndex);
                if (gameConfig) {
                    const storageKey = `matching_progress_${user.id}_${gameConfig.modeId}`;
                    localStorage.setItem(storageKey, nextLevelIndex.toString());
                }
            }
        }
    };

    const handleNextLevel = () => {
        setCurrentLevelIndex(prev => prev + 1);
        initializeLevel(currentLevelIndex + 1);
    };

    if (gameState === 'loading' || !gameConfig) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full bg-black text-white">
                <Loader2 className="animate-spin w-16 h-16 text-fuchsia-500 mb-4" />
                <p className="text-xl">جاري تحميل المستوى...</p>
            </div>
        );
    }

    const totalLevels = Math.ceil(gameConfig.items.length / ITEMS_PER_LEVEL);

    // --- OVERLAYS ---

    if (gameState === 'victory') {
        return (
            <div className={`flex flex-col items-center justify-center h-full bg-gradient-to-b ${gameConfig.gradient} text-white p-6 animate-fadeIn relative overflow-hidden`}>
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
                 <div className="relative z-10 flex flex-col items-center w-full max-w-md text-center">
                     <div className="w-32 h-32 rounded-full bg-green-500 border-4 border-white/10 flex items-center justify-center mb-6 shadow-2xl backdrop-blur-md animate-bounce">
                         <Trophy size={64} className="text-white drop-shadow-md" />
                     </div>
                     <h2 className="text-4xl font-black text-white mb-2">ختمت اللعبة!</h2>
                     <p className="text-white/80 mb-8 font-medium">لقد أتممت جميع مستويات هذا الدرس بنجاح.</p>
                     
                     <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-8 w-full mb-8 shadow-2xl border border-white/10">
                         <span className="text-xs text-fuchsia-300 uppercase tracking-widest font-bold mb-2 block">مكافأة إضافية</span>
                         <div className="mt-4 flex justify-center gap-2">
                            <span className="text-xl bg-yellow-500/20 text-yellow-300 px-6 py-2 rounded-full border border-yellow-500/30">+5 نقاط</span>
                         </div>
                     </div>

                     <button onClick={onExit} className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors shadow-lg">
                         العودة للقائمة
                     </button>
                 </div>
            </div>
        );
    }

    if (gameState === 'level_complete') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-emerald-900/90 text-white p-6 animate-fadeIn relative">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                 <div className="relative z-10 flex flex-col items-center w-full max-w-md text-center">
                     <div className="w-24 h-24 rounded-full bg-emerald-500 border-4 border-emerald-400 flex items-center justify-center mb-6 shadow-2xl animate-pulse">
                         <Medal size={48} className="text-white" />
                     </div>
                     <h2 className="text-3xl font-black mb-2">أحسنت!</h2>
                     <p className="text-emerald-100 mb-8">أكملت المستوى {currentLevelIndex + 1} بنجاح.</p>
                     
                     <div className="bg-black/20 px-6 py-2 rounded-full mb-6">
                         <span className="text-yellow-400 font-bold">+3 نقاط</span>
                     </div>

                     <button onClick={handleNextLevel} className="w-full py-4 bg-white text-emerald-900 rounded-xl font-black hover:bg-gray-100 transition-colors shadow-lg flex items-center justify-center gap-2 mb-4 transform hover:scale-105">
                        <ArrowRight size={20} className="rtl:rotate-180" /> المستوى التالي
                     </button>
                     <button onClick={onExit} className="text-sm text-emerald-300 hover:text-white underline">
                        خروج وحفظ التقدم
                     </button>
                 </div>
            </div>
        );
    }

    // --- GAME OVER OVERLAY ---
    if (gameState === 'game_over') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-red-950/95 text-white p-6 animate-fadeIn relative z-50">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
                 <div className="relative z-10 flex flex-col items-center w-full max-w-md text-center">
                     <div className="w-32 h-32 rounded-full bg-red-600 border-4 border-red-400 flex items-center justify-center mb-6 shadow-2xl animate-pulse">
                         <Frown size={64} className="text-white" />
                     </div>
                     <h2 className="text-4xl font-black mb-2 text-white">خسرت المستوى!</h2>
                     <p className="text-red-200 mb-8 font-medium">ارتكبت خطأً ولم يتبق لديك دروع.</p>
                     
                     <div className="bg-red-900/50 p-4 rounded-xl border border-red-500/30 mb-8 w-full">
                         <p className="text-sm text-red-200">يجب عليك إكمال المستوى دون أخطاء (أو استخدام الدرع) للانتقال للتالي.</p>
                     </div>

                     <button onClick={handleRetryLevel} className="w-full py-4 bg-white text-red-900 rounded-xl font-black hover:bg-gray-100 transition-colors shadow-lg flex items-center justify-center gap-2 mb-4 transform hover:scale-105">
                        <RefreshCw size={20} /> إعادة المحاولة
                     </button>
                     <button onClick={onExit} className="text-sm text-red-300 hover:text-white underline">
                        الاستسلام والخروج
                     </button>
                 </div>
            </div>
        );
    }

    // --- GAMEPLAY UI ---
    return (
        <div className={`flex flex-col h-full relative overflow-hidden bg-slate-900 transition-colors duration-500 ${feedback === 'wrong' ? 'bg-red-900/20' : ''}`}>
            
            {/* Background */}
            {gameConfig.backgroundImage && (
                <div className="absolute inset-0 z-0">
                    <img src={gameConfig.backgroundImage} alt="BG" className="w-full h-full object-cover opacity-30" />
                    <div className={`absolute inset-0 bg-gradient-to-b ${gameConfig.gradient} opacity-90 mix-blend-multiply`}></div>
                </div>
            )}
            
            {/* Header */}
            <div className="flex justify-between items-center p-4 z-20 bg-black/30 backdrop-blur-md border-b border-white/5 shadow-lg">
                <div className="flex items-center gap-3">
                    <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-white/80 border border-white/10">
                        مستوى {currentLevelIndex + 1} / {totalLevels}
                    </span>
                    {/* Progress Dots */}
                    <div className="hidden sm:flex gap-1">
                        {[...Array(totalLevels)].map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${i < currentLevelIndex ? 'bg-green-500' : i === currentLevelIndex ? 'bg-white animate-pulse' : 'bg-white/20'}`}></div>
                        ))}
                    </div>
                </div>
                
                <button onClick={onExit} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white/70 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
            </div>

            {/* Game Board */}
            <div className="flex-1 flex flex-col items-center justify-center relative p-2 sm:p-4 z-10 overflow-hidden">
                <div className="grid grid-cols-2 gap-3 sm:gap-8 w-full max-w-5xl h-full py-2">
                    
                    {/* Left Column */}
                    <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 justify-center">
                        {leftItems.map((item) => {
                            const isSelected = selectedLeft?.id === item.id;
                            const isMatched = matchedPairs.includes(item.id);
                            const isWrong = feedback === 'wrong' && isSelected;
                            const isCorrect = feedback === 'correct' && isSelected;
                            const isHint = hintPair?.left === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleItemClick(item, 'left')}
                                    disabled={isMatched}
                                    className={`
                                        relative group min-h-[70px] sm:min-h-[90px] p-3 rounded-2xl flex items-center justify-center text-center font-bold text-sm sm:text-lg shadow-lg border-b-[4px] transition-all duration-200 active:translate-y-[2px] active:border-b-0
                                        ${isMatched 
                                            ? 'bg-emerald-500/20 border-emerald-500/0 text-emerald-500 opacity-0 pointer-events-none'
                                            : isSelected
                                                ? 'bg-cyan-600 border-cyan-800 text-white scale-[1.02] z-20'
                                                : isHint 
                                                    ? 'bg-yellow-600 border-yellow-800 text-white animate-pulse ring-2 ring-yellow-400'
                                                    : 'bg-slate-800 border-slate-950 text-slate-200 hover:bg-slate-700'
                                        }
                                        ${isWrong ? 'bg-red-600 border-red-800 animate-shake' : ''}
                                        ${isCorrect ? 'bg-green-500 border-green-700 scale-105' : ''}
                                    `}
                                >
                                    <span className="relative z-10 drop-shadow-sm">{item.left}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Column */}
                    <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pl-1 justify-center">
                        {rightItems.map((item) => {
                             const isSelected = selectedRight?.id === item.id;
                             const isMatched = matchedPairs.includes(item.id);
                             const isWrong = feedback === 'wrong' && isSelected;
                             const isCorrect = feedback === 'correct' && isSelected;
                             const isHint = hintPair?.right === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleItemClick(item, 'right')}
                                    disabled={isMatched}
                                    className={`
                                        relative group min-h-[70px] sm:min-h-[90px] p-3 rounded-2xl flex items-center justify-center text-center font-bold text-sm sm:text-lg shadow-lg border-b-[4px] transition-all duration-200 active:translate-y-[2px] active:border-b-0
                                        ${isMatched 
                                            ? 'bg-emerald-500/20 border-emerald-500/0 text-emerald-500 opacity-0 pointer-events-none'
                                            : isSelected
                                                ? 'bg-fuchsia-600 border-fuchsia-800 text-white scale-[1.02] z-20'
                                                : isHint 
                                                    ? 'bg-yellow-600 border-yellow-800 text-white animate-pulse ring-2 ring-yellow-400'
                                                    : 'bg-slate-800 border-slate-950 text-slate-200 hover:bg-slate-700'
                                        }
                                        ${isWrong ? 'bg-red-600 border-red-800 animate-shake' : ''}
                                        ${isCorrect ? 'bg-green-500 border-green-700 scale-105' : ''}
                                    `}
                                >
                                    <span className="relative z-10 drop-shadow-sm">{item.right}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            {/* Power-ups Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${hasShield ? 'bg-blue-600/80 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-black/40 border-white/10 text-gray-500 grayscale'}`}>
                    <Shield size={20} className={hasShield ? 'fill-blue-400 animate-pulse' : ''} />
                    <span className="font-bold text-xs">{hasShield ? 'درع الحماية' : 'بدون حماية'}</span>
                </div>

                <button 
                    onClick={activateHint}
                    disabled={hintsCount <= 0 || !!hintPair}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all active:scale-95 ${hintsCount > 0 ? 'bg-yellow-600/80 border-yellow-400 text-white hover:bg-yellow-500' : 'bg-black/40 border-white/10 text-gray-500 cursor-not-allowed'}`}
                >
                    <Lightbulb size={20} className={hintsCount > 0 ? 'fill-yellow-400' : ''} />
                    <span className="font-bold text-xs">{hintsCount} تلميح</span>
                </button>
            </div>

            {/* Music Toggle */}
            <div className="absolute bottom-6 left-6 z-30">
                <button 
                    onClick={() => setIsMusicEnabled(prev => !prev)}
                    className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white/60 hover:text-white transition-colors"
                >
                    {isMusicEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
            </div>
        </div>
    );
};

export default MatchingGame;
