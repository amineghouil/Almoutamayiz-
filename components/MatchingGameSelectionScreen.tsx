

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    ALL_SUBJECTS_LIST,
    GAME_THEMES,
    PHILOSOPHY_SUMMARIZATION_PROMPT
} from '../constants';
import {
    ChevronRight,
    Book,
    Calendar,
    FileText,
    Loader2,
    Play,
    Info,
    LayoutGrid,
    Users,
    List,
    Speech,
    Quote,
    Sigma,
    Sparkles
} from 'lucide-react';
import { LessonContent, LessonBlock, PhilosophyStructuredContent, MatchingGameData, MatchItem, PhilosophyPosition, PhilosophyPhilosopher } from '../types';
import { getGeminiClient } from '../lib/gemini';

const TRIMESTERS = [
    { id: 't1', label: 'الفصل الأول' },
    { id: 't2', label: 'الفصل الثاني' },
    { id: 't3', label: 'الفصل الثالث' }
];

// Mapping for Lesson Types to Game Modes for Matching Game
const LESSON_TYPE_MATCHING_MODES: Record<string, { label: string; icon: any; leftLabel: string; rightLabel: string; } | null> = {
    'philosophy_article': { label: 'فيلسوف vs. فكرة (ملخصة)', icon: Quote, leftLabel: 'الفيلسوف', rightLabel: 'الفكرة (كلمات مفتاحية)' },
    'dates': { label: 'تاريخ vs. حدث', icon: Calendar, leftLabel: 'التاريخ', rightLabel: 'الحدث' },
    'terms': { label: 'مصطلح vs. تعريف', icon: List, leftLabel: 'المصطلح', rightLabel: 'التعريف' },
    'characters': { label: 'شخصية vs. نبذة', icon: Users, leftLabel: 'الشخصية', rightLabel: 'النبذة' },
    'definitions': { label: 'تعريف vs. مصطلح', icon: Speech, leftLabel: 'التعريف', rightLabel: 'المصطلح' }, // For Islamic defs
    'math_law': { label: 'القانون vs. استعماله', icon: Sigma, leftLabel: 'القانون', rightLabel: 'الاسم/الاستعمال' },
    'intellectual': null,
    'linguistic': null,
    'criticism': null,
    'lessons': null, // Standard lessons usually don't fit matching directly
};

interface MatchingGameSelectionScreenProps {
    onStartGame: (gameConfig: MatchingGameData) => void;
    onBack: () => void;
}

const MatchingGameSelectionScreen: React.FC<MatchingGameSelectionScreenProps> = ({ onStartGame, onBack }) => {
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [selectedTrimester, setSelectedTrimester] = useState<string>('');
    const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
    const [selectedLessonType, setSelectedLessonType] = useState<string>('');
    const [availableLessons, setAvailableLessons] = useState<LessonContent[]>([]);
    const [isLoadingLessons, setIsLoadingLessons] = useState(false);
    const [isGeneratingGame, setIsGeneratingGame] = useState(false);
    const [gameErrorMessage, setGameErrorMessage] = useState('');
    const [processingStage, setProcessingStage] = useState('');

    const currentSubject = ALL_SUBJECTS_LIST.find(s => s.id === selectedSubjectId);
    
    // Determine available lesson types based on selected subject (STRICT ENFORCEMENT)
    const availableLessonTypes = React.useMemo(() => {
        if (!currentSubject) return [];
        switch (currentSubject.id) {
            case 'philosophy': return [
                { id: 'philosophy_article', label: 'فلاسفة وأفكارهم', icon: LayoutGrid },
            ];
            case 'history': return [
                { id: 'dates', label: 'تواريخ وأحداث', icon: Calendar },
                { id: 'characters', label: 'شخصيات تاريخية', icon: Users },
                { id: 'terms', label: 'مصطلحات تاريخية', icon: List }
            ];
            case 'geography': return [
                { id: 'terms', label: 'مصطلحات جغرافية', icon: List }
            ];
            case 'math': return [
                { id: 'math_law', label: 'قوانين رياضية', icon: Sigma }
            ];
            case 'french': 
            case 'english':
                return [
                { id: 'terms', label: 'مصطلحات (Terms)', icon: List }
            ];
            case 'islamic': return [
                { id: 'definitions', label: 'تعاريف شرعية', icon: Speech }
            ];
            default: return [];
        }
    }, [currentSubject]);

    // Fetch lessons when subject, trimester, or lesson type changes
    useEffect(() => {
        if (selectedSubjectId && selectedTrimester && selectedLessonType) {
            fetchLessons();
        } else {
            setAvailableLessons([]);
            setSelectedLessonId(null);
        }
    }, [selectedSubjectId, selectedTrimester, selectedLessonType]);

    const fetchLessons = async () => {
        setIsLoadingLessons(true);
        setGameErrorMessage('');
        
        let query = supabase.from('lessons_content')
            .select('id, title, content, section_id')
            .eq('section_id', `${selectedSubjectId}_${selectedTrimester}_${selectedLessonType}`)
            .order('created_at', { ascending: true });

        const { data, error } = await query;
        if (error) {
            console.error("Error fetching lessons:", error);
            setGameErrorMessage(`فشل تحميل الدروس: ${error.message || 'خطأ غير معروف'}`);
            setAvailableLessons([]);
        } else if (data) {
            setAvailableLessons(data as LessonContent[]);
        }
        setIsLoadingLessons(false);
    };

    const generateGameData = async () => {
        if (!currentSubject || !selectedTrimester || !selectedLessonType) {
            setGameErrorMessage("الرجاء اختيار المادة والفصل ونوع اللعب.");
            return;
        }

        setIsGeneratingGame(true);
        setGameErrorMessage('');
        setProcessingStage('جاري استخراج البيانات...');

        try {
            let matchingPairs: MatchItem[] = [];
            let gameModeInfo = LESSON_TYPE_MATCHING_MODES[selectedLessonType];

            // Default fallback if type not explicitly mapped (e.g. French terms)
            if (!gameModeInfo && (selectedLessonType === 'terms')) {
                 gameModeInfo = { label: 'مصطلح vs. تعريف', icon: List, leftLabel: 'المصطلح', rightLabel: 'التعريف' };
            }

            if (!gameModeInfo) {
                throw new Error("نوع الدرس المختار لا يدعم لعبة الربط.");
            }

            let sourceLessons: LessonContent[] = [];
            if (selectedLessonId) {
                const lesson = availableLessons.find(l => l.id === selectedLessonId);
                if (lesson) sourceLessons.push(lesson);
            } else {
                sourceLessons = availableLessons;
            }

            if (sourceLessons.length === 0) {
                throw new Error("لا توجد دروس متاحة لتوليد عناصر اللعبة.");
            }
            
            const clean = (s?: string) => s ? s.trim() : '';

            // --- SPECIAL LOGIC FOR PHILOSOPHY ---
            // We need to collect raw ideas first, then summarize them if they are long
            let rawPhiloItems: { id: string, name: string, rawIdea: string }[] = [];

            for (const lesson of sourceLessons) {
                let parsedContent: any;
                try { parsedContent = JSON.parse(lesson.content); } catch { continue; }

                if (selectedLessonType === 'philosophy_article' && parsedContent.type === 'philosophy_structured') {
                    const philoContent: PhilosophyStructuredContent = parsedContent;
                    philoContent.positions?.forEach((pos: PhilosophyPosition) => {
                        pos.theories?.forEach(theory => {
                            theory.philosophers?.forEach((philo: PhilosophyPhilosopher) => {
                                const left = clean(philo.name);
                                const right = clean(philo.idea) || clean(philo.quote);
                                if (left && right) {
                                    const id = `philo_${left}_${Math.random().toString(36).substr(2,9)}`;
                                    // Push to raw list for later processing
                                    rawPhiloItems.push({ id, name: left, rawIdea: right });
                                }
                            });
                        });
                    });
                } else if (Array.isArray(parsedContent)) {
                    // Logic for other types (History, Terms, etc.) - No AI summarization needed usually
                    const lessonBlocks: LessonBlock[] = parsedContent;
                    lessonBlocks.forEach(block => {
                        let leftText = '';
                        let rightText = '';
                        
                        if (selectedLessonType === 'dates' && block.type === 'date_entry') {
                            leftText = clean(block.extra_1); // Date
                            rightText = clean(block.text); // Event
                        } else if (selectedLessonType === 'terms' && block.type === 'term_entry') {
                            leftText = clean(block.text); // Term
                            rightText = clean(block.extra_1); // Definition
                        } else if (selectedLessonType === 'characters' && block.type === 'char_entry') {
                            leftText = clean(block.text); // Name
                            rightText = clean(block.extra_1); // Bio
                        } else if (selectedLessonType === 'definitions' && block.type === 'term_entry') {
                            leftText = clean(block.extra_1); // Definition
                            rightText = clean(block.text); // Term
                        } else if (selectedLessonType === 'math_law' && block.type === 'term_entry') {
                            leftText = clean(block.text); // Formula
                            rightText = clean(block.extra_1); // Name
                        }

                        if (leftText && rightText) {
                            matchingPairs.push({
                                id: `${selectedLessonType}_${leftText}_${rightText}_${Math.random()}`,
                                left: leftText,
                                right: rightText,
                                sourceId: block.id!
                            });
                        }
                    });
                }
            }

            // --- PROCESS PHILOSOPHY SUMMARIZATION ---
            if (rawPhiloItems.length > 0) {
                setProcessingStage('جاري تلخيص الأفكار بالذكاء الاصطناعي (AI)...');
                
                // We send batches to AI to summarize long text into 2-4 words
                const client = getGeminiClient();
                const itemsToSummarize = rawPhiloItems.map(p => ({ id: p.id, idea: p.rawIdea }));
                
                // Chunking request just in case, though 1 batch usually fine for < 50 items
                const prompt = PHILOSOPHY_SUMMARIZATION_PROMPT + `\n\nالمدخلات:\n${JSON.stringify(itemsToSummarize)}`;
                
                try {
                    const response = await client.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: prompt
                    });
                    
                    const jsonStr = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
                    const summarizedData = JSON.parse(jsonStr || '[]');
                    
                    if (Array.isArray(summarizedData)) {
                        // Merge summaries back
                        rawPhiloItems.forEach(item => {
                            const summaryObj = summarizedData.find((s: any) => s.id === item.id);
                            // Fallback to first 4 words if AI fails for specific item, or use AI result
                            const finalRight = summaryObj ? summaryObj.short_idea : item.rawIdea.split(' ').slice(0, 4).join(' ');
                            
                            matchingPairs.push({
                                id: item.id,
                                left: item.name,
                                right: finalRight,
                                sourceId: item.name
                            });
                        });
                    } else {
                        // Fallback if JSON invalid
                        throw new Error("Invalid AI Response");
                    }
                } catch (e) {
                    console.error("AI Summarization failed, falling back to truncation", e);
                    // Fallback: Truncate manually
                    rawPhiloItems.forEach(item => {
                        matchingPairs.push({
                            id: item.id,
                            left: item.name,
                            right: item.rawIdea.split(' ').slice(0, 4).join(' ') + '...',
                            sourceId: item.name
                        });
                    });
                }
            }

            // Remove duplicates
            const uniquePairs = new Map<string, MatchItem>();
            matchingPairs.forEach(pair => {
                const key = `${pair.left}|${pair.right}`;
                if (!uniquePairs.has(key)) {
                    uniquePairs.set(key, pair);
                }
            });
            const finalPairs = Array.from(uniquePairs.values());

            // --- Validation ---
            if (finalPairs.length < 5) { // Minimum 5 pairs for at least one level
                throw new Error(
                    `عدد الأزواج المستخرجة (${finalPairs.length}) غير كافٍ. الحد الأدنى المطلوب هو 5 أزواج (مستوى واحد).
                    يرجى التأكد من أن الدروس المختارة تحتوي على بيانات كافية.`
                );
            }

            const theme = GAME_THEMES[currentSubject.id] || GAME_THEMES['default'];
            
            let modeTitle = currentSubject.name + ' - ' + gameModeInfo.label;
            let modeDescription = `تحدى نفسك في مستويات متصاعدة!`;
            if (selectedLessonId) {
                const lessonTitle = sourceLessons[0]?.title || currentSubject.name;
                modeTitle = `الدرس: ${lessonTitle}`;
            }

            const gameConfig: MatchingGameData = {
                modeId: `${selectedSubjectId}_${selectedTrimester}_${selectedLessonType}_${selectedLessonId || 'all'}`,
                title: modeTitle,
                description: modeDescription,
                gradient: theme.gradient,
                primaryColor: theme.primaryColor,
                shadowColor: theme.shadowColor,
                icon: theme.icon,
                backgroundImage: theme.backgroundImage,
                items: finalPairs,
            };

            onStartGame(gameConfig);

        } catch (error: any) {
            console.error("Game generation error:", error);
            setGameErrorMessage(error.message || "حدث خطأ غير متوقع أثناء توليد اللعبة.");
        } finally {
            setIsGeneratingGame(false);
            setProcessingStage('');
        }
    };

    return (
        <div className="min-h-screen bg-black p-6 animate-fadeIn text-white relative">
            <button onClick={onBack} className="absolute top-6 right-6 text-slate-400 hover:text-white flex items-center gap-2 bg-neutral-900 px-4 py-2 rounded-xl shadow-sm border border-neutral-800 active:translate-y-1 transition-all z-20">
                <ChevronRight className="w-5 h-5" />
                <span>عودة</span>
            </button>

            <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-lg mx-auto text-center relative z-10">
                <div className="text-center mb-8 mt-16">
                    <h2 className="text-3xl font-black text-fuchsia-500 mb-2 drop-shadow-md">إعداد لعبة المطابقة</h2>
                    <p className="text-gray-400">اختر المادة والمحتوى الذي تريد اللعب به</p>
                </div>

                <div className="w-full space-y-5 bg-neutral-900/50 p-6 rounded-3xl border border-neutral-800 shadow-xl backdrop-blur-sm">
                    {/* 1. Subject */}
                    <div className="space-y-2 text-right">
                        <label className="flex items-center gap-2 text-gray-300 font-bold text-sm">
                            <Book className="w-4 h-4 text-fuchsia-500" /> المادة
                        </label>
                        <div className="relative">
                            <select
                                value={selectedSubjectId}
                                onChange={(e) => {
                                    setSelectedSubjectId(e.target.value);
                                    setSelectedTrimester('');
                                    setSelectedLessonType('');
                                    setSelectedLessonId(null);
                                }}
                                className="w-full text-right bg-neutral-800 border border-neutral-700 text-white p-3 rounded-xl outline-none focus:border-fuchsia-500 appearance-none font-bold"
                            >
                                <option value="">-- اختر المادة --</option>
                                {ALL_SUBJECTS_LIST.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                        </div>
                    </div>

                    {/* 2. Trimester */}
                    <div className={`space-y-2 text-right transition-opacity duration-300 ${!selectedSubjectId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <label className="flex items-center gap-2 text-gray-300 font-bold text-sm">
                            <Calendar className="w-4 h-4 text-fuchsia-500" /> الفصل الدراسي
                        </label>
                        <div className="flex gap-2">
                            {TRIMESTERS.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTrimester(t.id)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${selectedTrimester === t.id ? 'bg-fuchsia-600 text-white border-fuchsia-600' : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3. Lesson Type (Strictly filtered) */}
                    <div className={`space-y-2 text-right transition-opacity duration-300 ${!selectedTrimester ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <label className="flex items-center gap-2 text-gray-300 font-bold text-sm">
                            <List className="w-4 h-4 text-fuchsia-500" /> نوع اللعب
                        </label>
                        <div className="relative">
                            <select
                                value={selectedLessonType}
                                onChange={(e) => {
                                    setSelectedLessonType(e.target.value);
                                    setSelectedLessonId(null);
                                }}
                                className="w-full text-right bg-neutral-800 border border-neutral-700 text-white p-3 rounded-xl outline-none focus:border-fuchsia-500 appearance-none font-bold"
                            >
                                <option value="">-- اختر المحتوى --</option>
                                {availableLessonTypes.length === 0 ? (
                                    <option value="" disabled>لا يتوفر محتوى مطابق لهذه المادة</option>
                                ) : (
                                    availableLessonTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.label}</option>
                                    ))
                                )}
                            </select>
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                        </div>
                    </div>

                    {/* 4. Specific Lesson (Optional) */}
                    <div className={`space-y-2 text-right transition-opacity duration-300 ${!selectedLessonType || isLoadingLessons ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <label className="flex items-center gap-2 text-gray-300 font-bold text-sm">
                            <FileText className="w-4 h-4 text-fuchsia-500" /> الوحدة / الدرس (اختياري)
                        </label>
                        <div className="relative">
                            <select
                                value={selectedLessonId || ''}
                                onChange={(e) => setSelectedLessonId(Number(e.target.value) || null)}
                                className="w-full text-right bg-neutral-800 border border-neutral-700 text-white p-3 rounded-xl outline-none focus:border-fuchsia-500 appearance-none font-bold"
                                disabled={isLoadingLessons || availableLessons.length === 0}
                            >
                                <option value="">-- {isLoadingLessons ? 'جاري التحميل...' : 'لعب شامل لكل الوحدات'} --</option>
                                {availableLessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                            </select>
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                        </div>
                    </div>

                    {gameErrorMessage && (
                        <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg text-sm border border-red-900/50 animate-fadeIn">
                            <Info size={20} className="shrink-0" />
                            <span className="whitespace-pre-line text-xs">{gameErrorMessage}</span>
                        </div>
                    )}

                    <div className="pt-6">
                        <button
                            onClick={generateGameData}
                            disabled={isGeneratingGame || !selectedSubjectId || !selectedTrimester || !selectedLessonType || isLoadingLessons}
                            className="group w-full bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-fuchsia-900/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                        >
                            {isGeneratingGame ? <Loader2 className="animate-spin w-6 h-6" /> : (selectedSubjectId === 'philosophy' ? <Sparkles className="w-6 h-6 animate-pulse" /> : <Play className="w-6 h-6" />)}
                            <div className="text-right">
                                <div className="text-sm">{isGeneratingGame ? (processingStage || 'جاري إعداد اللعبة...') : 'ابدأ اللعبة'}</div>
                                {!isGeneratingGame && <div className="text-[10px] opacity-80 font-normal">نظام المستويات + تلخيص ذكي</div>}
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MatchingGameSelectionScreen;
