

import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { Play, Book, Layers, FileText, ChevronRight, Globe, Sparkles, Loader2, Calendar, List, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getGeminiClient } from '../lib/gemini';
import { AI_QUESTION_PROMPT, ALL_SUBJECTS_LIST } from '../constants';

interface SelectionScreenProps {
  questions: Question[];
  onStartGame: (filteredQuestions: Question[]) => void;
  onBack: () => void;
}

const SUBJECTS_LIST = ALL_SUBJECTS_LIST;

const TRIMESTERS = [
    { id: 't1', label: 'الفصل الأول' },
    { id: 't2', label: 'الفصل الثاني' },
    { id: 't3', label: 'الفصل الثالث' }
];

const SelectionScreen: React.FC<SelectionScreenProps> = ({ questions, onStartGame, onBack }) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTrimester, setSelectedTrimester] = useState<string>('');
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  
  // Specific for History/Geo Millionaire Logic
  const [selectedContentType, setSelectedContentType] = useState<string>('');

  // Lesson Fetching
  const [availableLessons, setAvailableLessons] = useState<{id: number, title: string}[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Content Types for special subjects
  const getContentTypes = () => {
      if (selectedSubject === 'التاريخ') {
          return [
              { id: 'characters', label: 'شخصيات تاريخية', icon: Users },
              { id: 'terms', label: 'مصطلحات', icon: List }
          ];
      }
      if (selectedSubject === 'الجغرافيا') {
           return [
              { id: 'terms', label: 'مصطلحات ومفاهيم', icon: List }
           ];
      }
      return [];
  };
  
  const contentTypes = getContentTypes();

  useEffect(() => {
    if (selectedSubject) {
        fetchLessons();
    } else {
        setAvailableLessons([]);
        setSelectedLessonId(null);
    }
  }, [selectedSubject, selectedTrimester, selectedContentType]);

  const fetchLessons = async () => {
      setIsLoadingLessons(true);
      
      const subId = SUBJECTS_LIST.find(s => s.name === selectedSubject)?.id;
      
      let query = supabase.from('lessons_content').select('id, title, section_id');
      
      if (subId) {
          // Base filter
          let filter = `${subId}`;
          if (selectedTrimester) filter += `_${selectedTrimester}`;
          
          // Specific filter if Content Type is selected for History/Geo
          if (selectedContentType) {
              filter += `_${selectedContentType}`;
          }

          query = query.ilike('section_id', `${filter}%`);
      }

      const { data } = await query.order('created_at', { ascending: true });
      if (data) {
          setAvailableLessons(data.map(d => ({ id: d.id, title: d.title })));
      }
      setIsLoadingLessons(false);
  };

  const handleStartClassic = () => {
    let filtered = questions;
    
    // Classic filtering relies on the 'questions' prop (database questions)
    // Database questions have 'subject' as Arabic Name.
    if (selectedSubject) filtered = filtered.filter(q => q.subject === selectedSubject);
    
    if (filtered.length === 0) {
      alert("لا توجد أسئلة جاهزة لهذا التصنيف في البنك. جرب 'توليد بالذكاء الاصطناعي'!");
      return;
    }
    
    const tagged = filtered.map(q => ({...q, source: 'DB'}));
    onStartGame(tagged);
  };

  const handleAiGenerate = async () => {
      if (!selectedSubject) {
          alert("الرجاء اختيار المادة على الأقل لتوليد الأسئلة.");
          return;
      }
      
      // Enforce Type selection for History/Geo
      if ((selectedSubject === 'التاريخ' || selectedSubject === 'الجغرافيا') && !selectedContentType && !selectedLessonId) {
          alert(`الرجاء تحديد نوع المحتوى (${selectedSubject === 'التاريخ' ? 'شخصيات/مصطلحات' : 'مصطلحات'}) أو اختيار درس محدد.`);
          return;
      }

      setIsGenerating(true);
      try {
          let contentText = "";

          if (selectedLessonId) {
              // 1. Specific Lesson Selected
              const { data } = await supabase.from('lessons_content').select('content, title').eq('id', selectedLessonId).single();
              if (data) {
                  const parsed = JSON.parse(data.content);
                  // Extract raw text based on block structure
                  if (parsed.blocks) {
                      contentText = parsed.blocks.map((b: any) => b.text + (b.extra_1 ? ` (${b.extra_1})` : '')).join('\n');
                  } else if (Array.isArray(parsed)) {
                      contentText = parsed.map((b: any) => b.text + (b.extra_1 ? ` (${b.extra_1})` : '')).join('\n');
                  } else {
                      contentText = JSON.stringify(parsed);
                  }
                  contentText = `عنوان الدرس: ${data.title}\n` + contentText;
              }
          } else {
              // 2. Random Mix based on filters
              const subId = SUBJECTS_LIST.find(s => s.name === selectedSubject)?.id;
              
              let query = supabase.from('lessons_content').select('content, title, section_id');
              
              if (subId) {
                  let filter = `${subId}`;
                  if (selectedTrimester) filter += `_${selectedTrimester}`;
                  if (selectedContentType) filter += `_${selectedContentType}`;
                  query = query.ilike('section_id', `${filter}%`);
              }

              const { data } = await query;
              let filteredData = data || [];

              if (filteredData.length === 0) throw new Error("لا توجد دروس متاحة لهذا التصنيف لاستخراج الأسئلة منها.");

              // Pick 2 random lessons
              const shuffled = filteredData.sort(() => 0.5 - Math.random()).slice(0, 2);
              
              shuffled.forEach(lesson => {
                  let lessonText = "";
                  try {
                      const parsed = JSON.parse(lesson.content);
                      if (parsed.blocks) lessonText = parsed.blocks.map((b: any) => b.text).join('\n');
                      else if (Array.isArray(parsed)) lessonText = parsed.map((b: any) => b.text + (b.extra_1 ? ` (${b.extra_1})` : '')).join('\n');
                  } catch (e) {}
                  contentText += `\n--- درس: ${lesson.title} ---\n${lessonText.substring(0, 3000)}`; 
              });
          }

          if (!contentText.trim()) throw new Error("لم يتم العثور على محتوى نصي صالح.");

          // Call Gemini
          const client = getGeminiClient();
          const response = await client.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: AI_QUESTION_PROMPT + "\n\nالنص الدراسي:\n" + contentText.substring(0, 25000)
          });

          const rawJson = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
          if (!rawJson) throw new Error("فشل الذكاء الاصطناعي في توليد الأسئلة.");

          const generatedQs = JSON.parse(rawJson);
          
          if (!Array.isArray(generatedQs) || generatedQs.length === 0) throw new Error("تنسيق الأسئلة غير صحيح.");

          const finalQs: Question[] = generatedQs.map((q: any, idx: number) => ({
              id: Date.now() + idx,
              text: q.text,
              options: q.options,
              correctAnswerIndex: q.correctAnswerIndex,
              prize: "0",
              difficulty: q.difficulty || 'medium',
              subject: selectedSubject,
              chapter: q.chapter || (selectedTrimester ? TRIMESTERS.find(t=>t.id===selectedTrimester)?.label : 'عام'),
              lesson: q.lesson || 'AI Generated',
              isAi: true 
          }));

          onStartGame(finalQs);

      } catch (err: any) {
          alert("خطأ: " + err.message);
      } finally {
          setIsGenerating(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black p-6 animate-fadeIn">
       <button onClick={onBack} className="absolute top-6 right-6 text-slate-500 dark:text-gray-400 hover:text-black dark:hover:text-white flex items-center gap-2 bg-white dark:bg-neutral-900 px-4 py-2 rounded-xl shadow-sm border-b-[4px] border-slate-200 dark:border-neutral-800 active:border-b-0 active:translate-y-1 transition-all z-20">
         <ChevronRight className="w-5 h-5" />
         <span>عودة</span>
       </button>

       <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-lg mx-auto text-center relative z-10">
            <div className="text-center mb-8 mt-16">
                <h2 className="text-3xl font-black text-blue-600 dark:text-yellow-500 mb-2 drop-shadow-md">إعداد المسابقة</h2>
                <p className="text-slate-500 dark:text-gray-400">حدد المصدر الذي سيقوم الذكاء الاصطناعي بتوليد الأسئلة منه</p>
            </div>

            <div className="w-full space-y-5 bg-white dark:bg-neutral-900/50 p-6 rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-xl backdrop-blur-sm">
                
                {/* 1. Subject */}
                <div className="space-y-2 text-right">
                    <label className="flex items-center gap-2 text-slate-700 dark:text-gray-300 font-bold text-sm">
                        <Book className="w-4 h-4 text-blue-500 dark:text-yellow-500" /> المادة
                    </label>
                    <div className="relative">
                        <select 
                            value={selectedSubject} 
                            onChange={(e) => {
                                setSelectedSubject(e.target.value);
                                setSelectedContentType('');
                                setSelectedLessonId(null);
                            }}
                            className="w-full text-right bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white p-3 rounded-xl outline-none focus:border-blue-500 dark:focus:border-yellow-500 appearance-none font-bold"
                        >
                            <option value="">-- اختر المادة --</option>
                            {SUBJECTS_LIST.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                </div>

                {/* 2. Trimester */}
                <div className="space-y-2 text-right">
                    <label className="flex items-center gap-2 text-slate-700 dark:text-gray-300 font-bold text-sm">
                        <Calendar className="w-4 h-4 text-blue-500 dark:text-yellow-500" /> الفصل الدراسي
                    </label>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setSelectedTrimester('')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${!selectedTrimester ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'}`}
                        >
                            الكل
                        </button>
                        {TRIMESTERS.map(t => (
                            <button 
                                key={t.id}
                                onClick={() => setSelectedTrimester(t.id)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${selectedTrimester === t.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Content Type (Special for History/Geo) */}
                {contentTypes.length > 0 && (
                     <div className="space-y-2 text-right animate-fadeIn">
                        <label className="flex items-center gap-2 text-slate-700 dark:text-gray-300 font-bold text-sm">
                            <List className="w-4 h-4 text-blue-500 dark:text-yellow-500" /> نوع المحتوى
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {contentTypes.map(ct => (
                                <button
                                    key={ct.id}
                                    onClick={() => setSelectedContentType(ct.id === selectedContentType ? '' : ct.id)}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 ${selectedContentType === ct.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'}`}
                                >
                                    <ct.icon size={14} />
                                    {ct.label}
                                </button>
                            ))}
                        </div>
                     </div>
                )}

                {/* 4. Lesson (Dynamic from DB) */}
                <div className={`space-y-2 text-right transition-opacity duration-300 ${!selectedSubject ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <label className="flex items-center gap-2 text-slate-700 dark:text-gray-300 font-bold text-sm">
                        <FileText className="w-4 h-4 text-blue-500 dark:text-yellow-500" /> درس محدد (اختياري)
                    </label>
                    <div className="relative">
                        <select 
                            value={selectedLessonId || ''} 
                            onChange={(e) => setSelectedLessonId(Number(e.target.value) || null)}
                            className="w-full text-right bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white p-3 rounded-xl outline-none focus:border-blue-500 dark:focus:border-yellow-500 appearance-none font-bold"
                            disabled={isLoadingLessons}
                        >
                            <option value="">-- {isLoadingLessons ? 'جاري التحميل...' : 'مراجعة شاملة للوحدة'} --</option>
                            {availableLessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                </div>

                <div className="pt-6 space-y-3">
                    {/* AI Button */}
                    <button
                        onClick={handleAiGenerate}
                        disabled={isGenerating || !selectedSubject}
                        className="group w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-purple-900/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                    >
                        {isGenerating ? <Loader2 className="animate-spin w-6 h-6" /> : <Sparkles className="w-6 h-6 animate-pulse" />}
                        <div className="text-right">
                            <div className="text-sm">توليد اختبار ذكي (AI)</div>
                            <div className="text-[10px] opacity-80 font-normal">من الدروس المختارة أعلاه</div>
                        </div>
                    </button>
                    
                    {/* Classic Button */}
                    <button
                        onClick={handleStartClassic}
                        className="w-full bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-900 dark:text-gray-200 font-bold py-3 rounded-2xl flex items-center justify-center gap-3 border border-slate-200 dark:border-neutral-700 active:scale-[0.98] transition-all"
                    >
                        <Layers className="w-5 h-5" />
                        <span>لعب من بنك الأسئلة (الكلاسيكي)</span>
                    </button>
                </div>
            </div>
       </div>
    </div>
  );
};

export default SelectionScreen;
