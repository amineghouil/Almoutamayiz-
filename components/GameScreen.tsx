import React, { useState, useEffect } from 'react';
import { Question, Lifelines, MoneyTier } from '../types';
import { Users, Phone, XCircle, Clock, LogOut, Sparkles } from 'lucide-react';
import { playClickSound, playCorrectSound, playLifelineSound, playWrongSound } from '../utils/audio';

// Custom small points ladder
const POINTS_LADDER: MoneyTier[] = [
  { level: 15, amount: "15 نقاط", value: 15, isSafeHaven: true },
  { level: 14, amount: "14 نقطة", value: 14, isSafeHaven: false },
  { level: 13, amount: "13 نقطة", value: 13, isSafeHaven: false },
  { level: 12, amount: "12 نقطة", value: 12, isSafeHaven: false },
  { level: 11, amount: "11 نقطة", value: 11, isSafeHaven: false },
  { level: 10, amount: "10 نقاط", value: 10, isSafeHaven: true },
  { level: 9, amount: "9 نقاط", value: 9, isSafeHaven: false },
  { level: 8, amount: "8 نقاط", value: 8, isSafeHaven: false },
  { level: 7, amount: "7 نقاط", value: 7, isSafeHaven: false },
  { level: 6, amount: "6 نقاط", value: 6, isSafeHaven: false },
  { level: 5, amount: "5 نقاط", value: 5, isSafeHaven: true },
  { level: 4, amount: "4 نقاط", value: 4, isSafeHaven: false },
  { level: 3, amount: "3 نقاط", value: 3, isSafeHaven: false },
  { level: 2, amount: "2 نقاط", value: 2, isSafeHaven: false },
  { level: 1, amount: "1 نقطة", value: 1, isSafeHaven: false },
];

interface GameScreenProps {
  questions: Question[];
  onGameOver: (amountWon: string, numericValue: number) => void;
  onVictory: (amountWon:string, numericValue: number) => void;
  onExit: () => void;
}

const MoneyLadder: React.FC<{ currentLevel: number, ladderData: MoneyTier[] }> = ({ currentLevel, ladderData }) => {
    return (
        <div className="w-full h-full flex flex-col-reverse justify-end p-2 md:p-4">
            {ladderData.map((tier) => (
                <div key={tier.level} className={`
                    text-sm md:text-base py-1 px-3 my-1 rounded-md transition-all duration-300 text-right font-bold flex items-center justify-between
                    ${currentLevel === tier.level ? 'bg-yellow-500 text-black scale-110 shadow-lg' : ''}
                    ${tier.isSafeHaven ? 'text-yellow-300' : 'text-white/70'}
                `}>
                    <span className="font-mono text-left w-6">{tier.level}</span>
                    <span className="font-mono">{tier.amount}</span>
                </div>
            ))}
        </div>
    );
};

const GameScreen: React.FC<GameScreenProps> = ({ questions, onGameOver, onVictory, onExit }) => {
  const maxLevels = Math.min(15, questions.length);
  const activeLadder = POINTS_LADDER.slice(POINTS_LADDER.length - maxLevels);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [gameState, setGameState] = useState<'waiting' | 'selected' | 'revealed'>('waiting');
  const [lifelines, setLifelines] = useState<Lifelines>({ fiftyFifty: true, askAudience: true, callFriend: true });
  const [disabledOptions, setDisabledOptions] = useState<number[]>([]);
  const [timer, setTimer] = useState(45);
  const [audienceData, setAudienceData] = useState<number[] | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const isAiQuestion = (currentQuestion as any).isAi;

  useEffect(() => {
    if (gameState !== 'waiting') return;
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, currentQuestionIndex]);

  const handleTimeOut = () => {
    playWrongSound();
    const safeData = getSafeAmountData(currentQuestionIndex);
    onGameOver(safeData.amount, safeData.value);
  };

  const getSafeAmountData = (index: number): { amount: string, value: number } => {
    if (index === 0) return { amount: "0", value: 0 };
    // Get highest reached safe haven
    const safeTier = activeLadder
        .filter(t => t.level <= index && t.isSafeHaven)
        .sort((a, b) => b.level - a.level)[0];
    
    // If no safe haven reached, return 0 or minimal points
    if (safeTier) return { amount: safeTier.amount, value: safeTier.value };
    
    // Even if not safe haven, let's give 1 point for effort if > level 1
    return { amount: "0 نقطة", value: 0 };
  };

  const handleOptionSelect = (index: number) => {
    if (gameState !== 'waiting' || disabledOptions.includes(index)) return;
    playClickSound();
    setSelectedOption(index);
    setGameState('selected');

    setTimeout(() => {
      setGameState('revealed');
      if (index === currentQuestion.correctAnswerIndex) {
        playCorrectSound();
        setTimeout(() => {
          if (currentQuestionIndex < maxLevels - 1) {
            handleNextLevel();
          } else {
            const finalTier = activeLadder.find(t => t.level === maxLevels);
            onVictory(finalTier?.amount || "15 نقطة", finalTier?.value || 15);
          }
        }, 1500);
      } else {
        playWrongSound();
        setTimeout(() => {
          const safeData = getSafeAmountData(currentQuestionIndex);
          onGameOver(safeData.amount, safeData.value);
        }, 2000);
      }
    }, 2000);
  };

  const handleNextLevel = () => {
    setCurrentQuestionIndex(prev => prev + 1);
    setSelectedOption(null);
    setGameState('waiting');
    setDisabledOptions([]);
    setAudienceData(null);
    setTimer(45);
  };

  const useFiftyFifty = () => {
    if (!lifelines.fiftyFifty || gameState !== 'waiting') return;
    playLifelineSound();
    const correct = currentQuestion.correctAnswerIndex;
    let wrongOptions = [0, 1, 2, 3].filter(i => i !== correct);
    const randomWrongIndex = Math.floor(Math.random() * wrongOptions.length);
    wrongOptions.splice(randomWrongIndex, 1);
    setDisabledOptions(wrongOptions);
    setLifelines(prev => ({ ...prev, fiftyFifty: false }));
  };

  const useAskAudience = () => {
    if (!lifelines.askAudience || gameState !== 'waiting') return;
    playLifelineSound();
    const correct = currentQuestion.correctAnswerIndex;
    let data = [0, 0, 0, 0];
    let remaining = 100;
    const correctChance = Math.floor(Math.random() * 40) + 45; // 45-85% for correct
    data[correct] = correctChance;
    remaining -= correctChance;
    [0, 1, 2, 3].filter(i => i !== correct).forEach((i, idx, arr) => {
        if (idx === arr.length - 1) {
            data[i] = remaining;
        } else {
            const val = Math.floor(Math.random() * remaining);
            data[i] = val;
            remaining -= val;
        }
    });
    setAudienceData(data);
    setLifelines(prev => ({ ...prev, askAudience: false }));
  };

  const useCallFriend = () => {
    if (!lifelines.callFriend || gameState !== 'waiting') return;
    playLifelineSound();
    const correct = currentQuestion.correctAnswerIndex;
    const friendChoice = Math.random() > 0.15 ? correct : [0, 1, 2, 3].filter(i => i !== correct)[Math.floor(Math.random()*3)];
    alert(`صديقك: "لست متأكداً تماماً، ولكن أعتقد أنها ${currentQuestion.options[friendChoice]}"`);
    setLifelines(prev => ({ ...prev, callFriend: false }));
  };

  const getOptionClasses = (index: number) => {
    let base = "relative w-full h-full flex items-center justify-end p-4 rounded-md border-2 border-white/20 bg-black/40 backdrop-blur-sm transition-all duration-300 text-white font-bold text-lg shadow-lg hover:bg-white/10";
    if (disabledOptions.includes(index)) return `${base} opacity-50 pointer-events-none`;
    if (gameState === 'selected' && selectedOption === index) return `${base} bg-yellow-500/50 border-yellow-500 animate-pulse`;
    if (gameState === 'revealed') {
        if (index === currentQuestion.correctAnswerIndex) return `${base} bg-green-500/80 border-green-400`;
        if (index === selectedOption) return `${base} bg-red-600/80 border-red-500`;
    }
    return base;
  };
  
  const handleExitClick = () => {
    if (window.confirm("هل أنت متأكد من رغبتك في الانسحاب؟ ستعود إلى الشاشة الرئيسية.")) {
      onExit();
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-slate-900 text-white font-cairo bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1517976487-151859901f65?auto=format&fit=crop&q=80')"}}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      
      {/* Exit Button */}
      <div className="absolute top-4 right-4 z-20">
        <button onClick={handleExitClick} className="p-3 bg-red-900/40 border-b-4 border-red-900/80 rounded-xl text-red-300 active:border-b-0 active:translate-y-1 transition-all shadow-md backdrop-blur-sm" title="انسحاب">
            <LogOut className="w-6 h-6" />
        </button>
      </div>

      <div className="w-full md:w-1/4 bg-black/50 p-4 relative order-2 md:order-1 flex flex-col justify-center">
        <MoneyLadder currentLevel={currentQuestionIndex + 1} ladderData={activeLadder} />
      </div>

      <div className="flex-1 flex flex-col p-4 md:p-8 items-center justify-between relative order-1 md:order-2">
        {/* Lifelines */}
        <div className="flex gap-4 mb-4">
            <button onClick={useFiftyFifty} disabled={!lifelines.fiftyFifty} className="disabled:opacity-50 disabled:grayscale transition-opacity p-3 bg-white/10 rounded-full border border-white/20"><XCircle className="w-6 h-6 text-white"/></button>
            <button onClick={useAskAudience} disabled={!lifelines.askAudience} className="disabled:opacity-50 disabled:grayscale transition-opacity p-3 bg-white/10 rounded-full border border-white/20"><Users className="w-6 h-6 text-white"/></button>
            <button onClick={useCallFriend} disabled={!lifelines.callFriend} className="disabled:opacity-50 disabled:grayscale transition-opacity p-3 bg-white/10 rounded-full border border-white/20"><Phone className="w-6 h-6 text-white"/></button>
        </div>
        
        {/* Timer */}
        <div className={`relative w-24 h-24 flex items-center justify-center font-mono font-black text-4xl rounded-full border-8 mb-4 ${timer < 10 ? 'border-red-500 text-red-400 animate-pulse' : 'border-white/20'}`}>
          {timer}
        </div>

        {/* Question */}
        <div className="w-full max-w-3xl text-center bg-black/40 backdrop-blur-md p-6 rounded-lg border-2 border-white/20 shadow-lg mb-6">
            <h2 className="text-xl md:text-2xl font-bold leading-relaxed">{currentQuestion.text}</h2>
            {isAiQuestion && <div className="text-xs text-purple-400 font-bold mt-2 flex items-center justify-center gap-1"><Sparkles size={12}/> سؤال مولد بالذكاء الاصطناعي</div>}
        </div>

        {/* Options */}
        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4 h-[250px] md:h-auto">
            {currentQuestion.options.map((option, index) => (
                <button key={index} onClick={() => handleOptionSelect(index)} className={getOptionClasses(index)} disabled={gameState !== 'waiting'}>
                    <span className="flex-1 text-right">{option}</span>
                    <span className="font-mono text-yellow-400 ml-4">{['أ', 'ب', 'ج', 'د'][index]}</span>
                </button>
            ))}
        </div>

        {/* Audience Poll */}
        {audienceData && (
            <div className="w-full max-w-3xl mt-4 flex justify-around items-end h-24 bg-black/20 p-2 rounded-lg">
                {audienceData.map((val, i) => (
                    <div key={i} className="flex flex-col items-center">
                        <div className="bg-blue-500 w-8 rounded-t" style={{height: `${val}%`}}></div>
                        <div className="text-xs mt-1">{['أ','ب','ج','د'][i]}: {val}%</div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default GameScreen;