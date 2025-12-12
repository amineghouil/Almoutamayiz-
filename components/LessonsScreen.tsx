import React, { useState, useEffect, useMemo } from 'react';
import { User, LessonContent, Exam, LessonBlock, PhilosophyStructuredContent } from '../types';
import { FileText, ArrowLeft, BrainCircuit, BookOpen, Calendar, Users, List, FolderOpen, ChevronDown, FileCheck, Sparkles, PenTool, Book, Link, Sigma, GraduationCap, Clock, CheckCircle, Circle, MinusCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import LessonRenderer from './LessonRenderer';
import SmartParser from './SmartParser';
import EssayBuilder from './EssayBuilder';
import EssayCorrector from './EssayCorrector';

const SUBJECTS = [
    { id: 'arabic', name: 'اللغة العربية', color: 'bg-green-600', icon: '📚' },
    { id: 'philosophy', name: 'الفلسفة', color: 'bg-purple-600', icon: '🤔' },
    { id: 'history', name: 'التاريخ', color: 'bg-orange-600', icon: '📜' },
    { id: 'geography', name: 'الجغرافيا', color: 'bg-blue-600', icon: '🗺️' },
    { id: 'islamic', name: 'العلوم الإسلامية', color: 'bg-emerald-600', icon: '🕌' },
    { id: 'math', name: 'الرياضيات', color: 'bg-cyan-700', icon: '📐' },
    { id: 'english', name: 'اللغة الإنجليزية', color: 'bg-red-600', icon: '🇬🇧' },
    { id: 'french', name: 'اللغة الفرنسية', color: 'bg-indigo-600', icon: '🇫🇷' },
];

const SUBJECT_TYPES: Record<string, { id: string; label: string; icon: any; }[]> = {
    'arabic': [
        { id: 'lessons', label: 'الدروس', icon: BookOpen },
        { id: 'intellectual', label: 'البناء الفكري', icon: BookOpen },
        { id: 'linguistic', label: 'البناء اللغوي', icon: BrainCircuit },
        { id: 'criticism', label: 'التقويم النقدي', icon: FileText },
        { id: 'exams_hub', label: 'بنك الفروض والاختبارات', icon: FileCheck } 
    ],
    'history': [
        { id: 'lessons', label: 'دروس', icon: BookOpen },
        { id: 'dates', label: 'تواريخ', icon: Calendar },
        { id: 'characters', label: 'شخصيات', icon: Users },
        { id: 'terms', label: 'مصطلحات', icon: List },
        { id: 'exams_hub', label: 'بنك الفروض والاختبارات', icon: FileCheck }
    ],
    'geography': [
        { id: 'lessons', label: 'دروس', icon: BookOpen },
        { id: 'terms', label: 'مصطلحات', icon: List },
        { id: 'exams_hub', label: 'بنك الفروض والاختبارات', icon: FileCheck }
    ],
    'islamic': [
        { id: 'lessons', label: 'دروس', icon: BookOpen },
        { id: 'exams_hub', label: 'بنك الفروض والاختبارات', icon: FileCheck }
    ],
    'philosophy': [
        { id: 'philosophy_article', label: 'مقالات فلسفية', icon: FileText },
        { id: 'lessons', label: 'دروس عادية', icon: BookOpen },
        { id: 'exams_hub', label: 'بنك الفروض والاختبارات', icon: FileCheck }
    ],
    'math': [
        { id: 'math_law', label: 'قوانين', icon: Sigma },
        { id: 'exams_hub', label: 'بنك الفروض والاختبارات', icon: FileCheck }
    ],
    'english': [
        { id: 'lessons', label: 'دروس', icon: BookOpen }, 
        { id: 'terms', label: 'مصطلحات', icon: List },
        { id: 'exams_hub', label: 'بنك الفروض والاختبارات', icon: FileCheck }
    ],
    'french': [
        { id: 'lessons', label: 'دروس', icon: BookOpen }, 
        { id: 'terms', label: 'مصطلحات', icon: List },
        { id: 'exams_hub', label: 'بنك الفروض والاختبارات', icon: FileCheck }
    ],
};

const TRIMESTERS = [
    { id: 't1', label: 'الفصل الأول' },
    { id: 't2', label: 'الفصل الثاني' },
    { id: 't3', label: 'الفصل الثالث' }
];

const EXAM_CATEGORIES = [
    { id: 'bac', label: 'البكالوريا الرسمية', color: 'from-green-600 to-emerald-800', border: 'border-green-500', icon: GraduationCap, desc: 'مواضيع وحلول من 2015-2025' },
    { id: 't1', label: 'الفصل الأول', color: 'from-blue-600 to-indigo-800', border: 'border-blue-500', icon: Clock, desc: 'اختبارات فصلية' },
    { id: 't2', label: 'الفصل الثاني', color: 'from-purple-600 to-violet-800', border: 'border-purple-500', icon: Clock, desc: 'اختبارات فصلية' },
    { id: 't3', label: 'الفصل الثالث', color: 'from-orange-600 to-red-800', border: 'border-orange-500', icon: Clock, desc: 'اختبارات فصلية' },
];

const getTrackableIds = (content: string): string[] => {
    try {
        const parsed = JSON.parse(content);
        if (parsed.type === 'philosophy_structured') {
            const philoContent = parsed as PhilosophyStructuredContent;
            let ids: string[] = ['philo_problem', 'philo_synthesis', 'philo_conclusion'];
            philoContent.positions.forEach((pos, idx) => {
                ids.push(`philo_pos_${idx}`);
                if (pos.critique) ids.push(`philo_critique_${idx}`);
                pos.theories.forEach(theory => {
                    theory.philosophers.forEach(philo => {
                        ids.push(`philo_arg_${philo.name.replace(/\s/g, '_')}_${idx}`);
                    });
                });
            });
            return ids;
        } else {
            const blocks: LessonBlock[] = Array.isArray(parsed) ? parsed : parsed.blocks || [];
            return blocks.map(b => b.id);
        }
    } catch (e) { return []; }
};

interface LessonsScreenProps {
    onUpdateUserScore?: (points: number) => void;
}

const LessonsScreen: React.FC<LessonsScreenProps> = ({ onUpdateUserScore }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 'exams_selection' | 'exams_list'>(1);
  const [selectedSubject, setSelectedSubject] = useState<typeof SUBJECTS[0] | null>(null);
  const [selectedTrimester, setSelectedTrimester] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedExamCategory, setSelectedExamCategory] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'parser' | 'builder' | 'corrector' | null>(null);
  
  const [lessons, setLessons] = useState<LessonContent[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLessonId, setExpandedLessonId] = useState<number | null>(null);

  // Granular Progress Tracking State
  const [completedSubItems, setCompletedSubItems] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser({ id: user.id } as User);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!currentUser || !selectedSubject) return;
      const { data } = await supabase
        .from('user_progress')
        .select('item_id, sub_item_id')
        .eq('user_id', currentUser.id)
        .eq('subject', selectedSubject.id);

      if (data) {
        const combinedIds = data.map(p => p.sub_item_id || p.item_id).filter(Boolean);
        setCompletedSubItems(new Set(combinedIds as string[]));
      }
    };
    fetchProgress();
  }, [currentUser, selectedSubject, step]);

  const handleToggleSubItemProgress = async (lessonId: number, subItemId: string, subjectId: string) => {
    if (!currentUser) return;

    const newCompletedItems = new Set(completedSubItems);
    const isCompleted = completedSubItems.has(subItemId);

    if (isCompleted) {
      newCompletedItems.delete(subItemId);
    } else {
      newCompletedItems.add(subItemId);
      // Award 1 point for progress
      if (onUpdateUserScore) {
          onUpdateUserScore(1);
          window.addToast('+1 نقطة', 'success');
      }
    }
    setCompletedSubItems(newCompletedItems);

    if (isCompleted) {
      await supabase.from('user_progress').delete().match({ user_id: currentUser.id, sub_item_id: subItemId });
    } else {
      await supabase.from('user_progress').insert({
        user_id: currentUser.id,
        item_id: `lesson_${lessonId}`,
        sub_item_id: subItemId,
        item_type: 'lesson',
        subject: subjectId
      });
    }
  };
  
  // For whole items like exams
  const handleToggleItemProgress = async (itemId: string, itemType: 'exam', subjectId: string) => {
     if (!currentUser) return;
     const newCompletedItems = new Set(completedSubItems);
     const isCompleted = completedSubItems.has(itemId);
     if (isCompleted) newCompletedItems.delete(itemId);
     else {
         newCompletedItems.add(itemId);
         // Award 1 point for exam marked done
         if (onUpdateUserScore) {
             onUpdateUserScore(1);
             window.addToast('+1 نقطة', 'success');
         }
     }
     setCompletedSubItems(newCompletedItems);

     if (isCompleted) {
        await supabase.from('user_progress').delete().match({ user_id: currentUser.id, item_id: itemId });
     } else {
        await supabase.from('user_progress').insert({ user_id: currentUser.id, item_id: itemId, item_type: itemType, subject: subjectId });
     }
  };

  const getLessonStatus = useMemo(() => (lesson: LessonContent): 'none' | 'partial' | 'full' => {
    const trackableIds = getTrackableIds(lesson.content);
    if (trackableIds.length === 0) return 'none';
    const completedCount = trackableIds.filter(id => completedSubItems.has(id)).length;
    if (completedCount === 0) return 'none';
    if (completedCount === trackableIds.length) return 'full';
    return 'partial';
  }, [completedSubItems]);


  const handleSubjectSelect = (sub: typeof SUBJECTS[0]) => { setSelectedSubject(sub); setStep(2); };
  const handleTrimesterSelect = (triId: string) => { setSelectedTrimester(triId); setStep(3); };
  const handleExamsHubSelect = () => { setStep('exams_selection'); };

  const handleExamCategorySelect = async (catId: string) => {
    if (!selectedSubject) return;
    setLoading(true);
    setSelectedExamCategory(catId);
    setStep('exams_list');

    let query = supabase.from('exams').select('*').eq('subject', selectedSubject.name);
    
    if (catId === 'bac') {
        query = query.or('type.eq.bac,type.is.null');
    } else {
        query = query.eq('type', catId);
    }

    const { data } = await query.order('year', { ascending: false });
    if (data) setExams(data as Exam[]);
    setLoading(false);
  };

  const handleTypeSelect = async (typeId: string) => {
    if (!selectedSubject || !selectedTrimester) return;
    if (typeId === 'exams_hub') { handleExamsHubSelect(); return; }

    setLoading(true);
    setSelectedType(typeId);
    setStep(4);
    
    const sectionId = `${selectedSubject.id}_${selectedTrimester}_${typeId}`;
    const { data } = await supabase.from('lessons_content').select('*').eq('section_id', sectionId).order('created_at', { ascending: true });
    if (data) setLessons(data);
    setLoading(false);
  };

  const handleBack = () => {
    if (activeTool) { setActiveTool(null); return; }
    if (step === 4) { setStep(3); setLessons([]); }
    else if (step === 'exams_list') { setStep('exams_selection'); setExams([]); }
    else if (step === 'exams_selection') { setStep(2); }
    else if (step === 3) { setStep(2); setSelectedType(null); }
    else if (step === 2) { setStep(1); setSelectedSubject(null); }
  };

  const toggleLesson = (id: number) => { setExpandedLessonId(prev => (prev === id ? null : id)); };
  
  return (
    <div className="p-4 sm:p-6 pb-32 min-h-screen animate-fadeIn text-center">
      {step !== 1 && (
          <button onClick={handleBack} className="mb-6 flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 rounded-xl shadow-sm border-b-[4px] border-neutral-800 hover:bg-neutral-800 active:border-b-0 active:translate-y-1 transition-all text-sm font-bold text-gray-200 mx-auto w-fit">
              <ArrowLeft className="w-4 h-4" /> <span>عودة</span>
          </button>
      )}

      {step === 1 && (
          <div>
              <h1 className="text-2xl sm:text-3xl font-black mb-2 text-white">المواد الدراسية</h1>
              <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 max-w-lg mx-auto">
                  {SUBJECTS.map((sub) => (
                      <button key={sub.id} onClick={() => handleSubjectSelect(sub)} className="group relative bg-[#111] rounded-3xl border border-neutral-800 p-6 flex flex-col items-center justify-center hover:border-neutral-600 transition-all duration-300 active:scale-95">
                          <div className={`w-20 h-20 rounded-2xl ${sub.color} flex items-center justify-center text-4xl shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>{sub.icon}</div>
                          <h3 className="text-lg font-bold text-white mb-1">{sub.name}</h3>
                      </button>
                  ))}
              </div>
          </div>
      )}

      {step === 2 && selectedSubject && !activeTool && (
          <div>
              <h2 className="text-2xl font-black mb-6 text-white">{selectedSubject.icon} {selectedSubject.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10">
                  {TRIMESTERS.map(tri => (
                      <button key={tri.id} onClick={() => handleTrimesterSelect(tri.id)} className="group bg-neutral-900 border-b-8 border-neutral-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-yellow-500 hover:-translate-y-1 transform transition-all shadow-md hover:shadow-xl">
                          <BookOpen className="w-10 h-10 text-gray-400 group-hover:text-yellow-500 transition-colors" />
                          <span className="font-bold text-lg text-white">{tri.label}</span>
                      </button>
                  ))}
                  <button onClick={handleExamsHubSelect} className="sm:col-span-2 lg:col-span-3 group bg-gradient-to-br from-neutral-900 to-neutral-800 border-b-8 border-green-900/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-green-500 hover:-translate-y-1 transform transition-all shadow-md hover:shadow-xl">
                      <FileCheck className="w-10 h-10 text-gray-400 group-hover:text-green-500 transition-colors" />
                      <span className="font-bold text-lg text-white">بنك الفروض والبكالوريات</span>
                  </button>
              </div>
              {selectedSubject.id === 'arabic' && (
                  <div className="animate-slideIn max-w-4xl mx-auto border-t border-neutral-800 pt-8">
                      <button onClick={() => setActiveTool('parser')} className="w-full sm:w-auto px-8 py-6 bg-gradient-to-br from-neutral-900 to-black border border-neutral-800 rounded-2xl flex items-center justify-center gap-4 hover:border-green-500 transition-all shadow-lg hover:shadow-green-900/20 group">
                          <div className="p-3 bg-green-500/10 rounded-full group-hover:bg-green-500/20"><BrainCircuit className="w-8 h-8 text-green-500" /></div>
                          <div className="text-right"><h4 className="font-black text-white text-lg">المعرب الذكي</h4></div>
                      </button>
                  </div>
              )}
              {selectedSubject.id === 'philosophy' && (
                  <div className="animate-slideIn max-w-4xl mx-auto border-t border-neutral-800 pt-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                          <button onClick={() => setActiveTool('builder')} className="p-6 bg-gradient-to-br from-neutral-900 to-black border border-neutral-800 rounded-2xl flex items-center gap-4 hover:border-purple-500 text-right">
                              <div className="p-3 bg-purple-500/10 rounded-full"><PenTool className="w-8 h-8 text-purple-500" /></div>
                              <div><h4 className="font-black text-white text-lg">منشئ المقالات</h4></div>
                          </button>
                          <button onClick={() => setActiveTool('corrector')} className="p-6 bg-gradient-to-br from-neutral-900 to-black border border-neutral-800 rounded-2xl flex items-center gap-4 hover:border-blue-500 text-right">
                              <div className="p-3 bg-blue-500/10 rounded-full"><FileCheck className="w-8 h-8 text-blue-500" /></div>
                              <div><h4 className="font-black text-white text-lg">مصحح المقالات</h4></div>
                          </button>
                      </div>
                  </div>
              )}
          </div>
      )}
      
      {activeTool && <div className="max-w-4xl mx-auto animate-fadeIn">{activeTool === 'parser' ? <SmartParser /> : activeTool === 'builder' ? <EssayBuilder /> : <EssayCorrector />}</div>}

      {step === 3 && selectedSubject && selectedTrimester && !activeTool && (
          <div>
              <h2 className="text-xl font-bold mb-1 text-white">{selectedSubject.name} - {TRIMESTERS.find(t=>t.id===selectedTrimester)?.label}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto mt-6">
                  {(SUBJECT_TYPES[selectedSubject.id] || []).filter(t => t.id !== 'exams_hub').map(type => {
                      return (
                        <button key={type.id} onClick={() => handleTypeSelect(type.id)} className={`group flex flex-col items-center justify-center p-6 rounded-2xl border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all transform bg-neutral-900 border-neutral-800 hover:border-yellow-500`}>
                            <type.icon className={`w-8 h-8 mb-3 transition-colors text-gray-500 group-hover:text-yellow-500`} />
                            <span className={`font-semibold text-gray-200`}>{type.label}</span>
                        </button>
                      );
                  })}
              </div>
          </div>
      )}

      {step === 4 && (
          <div className="max-w-3xl mx-auto">
              <h2 className="text-lg font-bold text-center mb-6 text-gray-500">{selectedSubject?.name} / {SUBJECT_TYPES[selectedSubject?.id || '']?.find(t => t.id === selectedType)?.label}</h2>
              {loading ? <div className="space-y-4"><div className="bg-neutral-900 rounded-2xl p-6 animate-pulse h-24"></div></div> : lessons.length === 0 ? <div className="text-center py-12 bg-neutral-900 rounded-2xl border border-dashed border-neutral-800"><FolderOpen className="w-12 h-12 mx-auto text-gray-600 mb-3" /><p className="text-gray-500">فارغ</p></div> : (
                  <div className="space-y-4">
                      {lessons.map((lesson) => {
                        const status = getLessonStatus(lesson);
                        return (
                          <div key={lesson.id} className={`bg-neutral-900 rounded-2xl shadow-sm border ${status === 'full' ? 'border-green-500/40' : status === 'partial' ? 'border-yellow-500/40' : 'border-neutral-800'} overflow-hidden transition-all duration-300`}>
                              <div onClick={() => toggleLesson(lesson.id)} className="flex items-center justify-between p-5 text-right bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer">
                                  <div className="p-2">
                                    {status === 'full' ? <CheckCircle className="w-6 h-6 text-green-500" /> : status === 'partial' ? <MinusCircle className="w-6 h-6 text-yellow-500" /> : <Circle className="w-6 h-6 text-gray-600" />}
                                  </div>
                                  <div className="flex-1 flex items-center justify-between ml-4">
                                      <div className="flex flex-col items-start w-full"><h3 className="font-black text-lg text-yellow-500 mb-1 text-right">{lesson.title}</h3>{lesson.subtitle && <span className="text-[10px] font-bold px-2 py-0.5 bg-black rounded border border-neutral-700 text-gray-400">{lesson.subtitle}</span>}</div>
                                      <ChevronDown size={20} className={`text-gray-400 transition-transform ${expandedLessonId === lesson.id ? 'rotate-180' : ''}`} />
                                  </div>
                              </div>
                              {expandedLessonId === lesson.id && <div className="p-6 border-t border-neutral-800 animate-fadeIn bg-black"><LessonRenderer lessonId={lesson.id} content={lesson.content} completedSubItems={completedSubItems} onToggle={handleToggleSubItemProgress} subjectId={selectedSubject!.id} /></div>}
                          </div>
                        );
                      })}
                  </div>
              )}
          </div>
      )}

      {step === 'exams_selection' && selectedSubject && (
          // ... (Exams selection UI remains the same)
          <div className="max-w-3xl mx-auto animate-fadeIn px-2">
               <h2 className="text-3xl font-black mb-8 text-white drop-shadow-md">بنك الفروض والبكالوريات</h2>
               <div className="mb-8 mx-auto max-w-lg">
                   {EXAM_CATEGORIES.filter(c => c.id === 'bac').map(cat => (
                       <button key={cat.id} onClick={() => handleExamCategorySelect(cat.id)} className="w-full group relative overflow-hidden rounded-[2.5rem] p-8 text-center transition-all hover:scale-[1.02] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-white/10 bg-white/5 backdrop-blur-xl">
                           <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-20 group-hover:opacity-30 transition-opacity`}></div>
                           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                           <div className="relative z-10 flex flex-col items-center">
                               <div className="w-20 h-20 bg-gradient-to-tr from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 transform group-hover:rotate-6 transition-transform">
                                   <cat.icon className="w-10 h-10 text-white" />
                               </div>
                               <h3 className="font-black text-2xl text-white mb-2">{cat.label}</h3>
                               <p className="text-sm text-gray-300 font-medium opacity-90">{cat.desc}</p>
                           </div>
                           <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-green-500/30 rounded-full blur-3xl"></div>
                       </button>
                   ))}
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mx-auto">
                   {EXAM_CATEGORIES.filter(c => c.id !== 'bac').map(cat => (
                       <button key={cat.id} onClick={() => handleExamCategorySelect(cat.id)} className="group relative overflow-hidden rounded-3xl p-6 text-center transition-all hover:-translate-y-1 shadow-lg border border-white/5 bg-white/5 backdrop-blur-md">
                           <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                           <div className="relative z-10 flex flex-col items-center">
                               <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <cat.icon className="w-5 h-5 text-gray-200" />
                               </div>
                               <h3 className="font-bold text-base text-white mb-1">{cat.label}</h3>
                               <p className="text-[10px] text-gray-400">{cat.desc}</p>
                           </div>
                       </button>
                   ))}
               </div>
           </div>
      )}

      {step === 'exams_list' && selectedSubject && selectedExamCategory && (
          <div className="max-w-2xl mx-auto animate-slideIn">
              <h2 className="text-xl font-bold mb-6 text-white bg-neutral-900 inline-block px-6 py-2 rounded-full border border-neutral-800">
                  <Book className="w-5 h-5 inline-block ml-2 text-yellow-500"/>
                  {EXAM_CATEGORIES.find(c => c.id === selectedExamCategory)?.label}
              </h2>
              {loading ? <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-neutral-900 rounded-xl animate-pulse"></div>)}</div> : exams.length === 0 ? <div className="text-center py-16 bg-neutral-900 rounded-3xl border border-dashed border-neutral-800"><FolderOpen className="w-20 h-20 text-neutral-700 mb-4" /><p className="text-gray-500">لا توجد مواضيع مضافة.</p></div> : (
                  <div className="flex flex-col gap-3">
                      {exams.map(exam => {
                        const itemId = `exam_${exam.id}`;
                        const isCompleted = completedSubItems.has(itemId);
                        return (
                          <div key={exam.id} className={`bg-neutral-900 p-4 rounded-xl border ${isCompleted ? 'border-green-500/30' : 'border-neutral-800 hover:border-green-600'} transition-all flex items-center justify-between shadow-sm group`}>
                              <div className="flex items-center gap-4">
                                  <div onClick={() => handleToggleItemProgress(itemId, 'exam', selectedSubject!.id)} className="cursor-pointer p-2">
                                    {isCompleted ? <CheckCircle className="w-6 h-6 text-green-500" /> : <div className="w-6 h-6 rounded-full border-2 border-gray-600 group-hover:border-green-500 transition-colors"></div>}
                                  </div>
                                  <span className="font-black text-2xl text-white font-mono">{exam.year}</span>
                                  <span className="text-sm text-gray-400 group-hover:text-green-500 transition-colors">{exam.type === 'bac' || !exam.type ? 'دورة جوان' : 'الموسم الدراسي'}</span>
                              </div>
                              <a href={exam.pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all transform active:scale-95 shadow-lg">
                                  <Link size={16} /> <span>مشاهدة</span>
                              </a>
                          </div>
                        )
                      })}
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

export default LessonsScreen;