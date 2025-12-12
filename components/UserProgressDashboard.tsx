import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { User, LessonBlock, PhilosophyStructuredContent } from '../types';
import { ALL_SUBJECTS_LIST } from '../constants';
import { getGeminiClient } from '../lib/gemini';
import { Loader2, Award, BrainCircuit, BookOpen, ArrowRight } from 'lucide-react';

interface ProgressStats {
  [subjectId: string]: {
    completed: number;
    total: number;
    name: string;
    color: string;
  };
}

// Helper from LessonsScreen to calculate total trackable items
const getTrackableIdsCount = (content: string): number => {
    try {
        const parsed = JSON.parse(content);
        if (parsed.type === 'philosophy_structured') {
            const philoContent = parsed as PhilosophyStructuredContent;
            let count = 3; // problem, synthesis, conclusion
            philoContent.positions.forEach((pos, idx) => {
                count++; // for the position title
                if (pos.critique) count++; // for the critique
                pos.theories.forEach(theory => {
                    count += theory.philosophers.length; // for each argument card
                });
            });
            return count;
        } else {
            const blocks: LessonBlock[] = Array.isArray(parsed) ? parsed : parsed.blocks || [];
            return blocks.length;
        }
    } catch (e) { return 0; }
};

const CircularProgress: React.FC<{ percentage: number; color: string }> = ({ percentage, color }) => {
    const sqSize = 120;
    const strokeWidth = 12;
    const radius = (sqSize - strokeWidth) / 2;
    const viewBox = `0 0 ${sqSize} ${sqSize}`;
    const dashArray = radius * Math.PI * 2;
    const dashOffset = dashArray - (dashArray * percentage) / 100;
  
    return (
      <div className="relative" style={{ width: sqSize, height: sqSize }}>
        <svg width={sqSize} height={sqSize} viewBox={viewBox}>
          <circle className="fill-none stroke-neutral-800" cx={sqSize / 2} cy={sqSize / 2} r={radius} strokeWidth={`${strokeWidth}px`} />
          <circle
            className="fill-none transition-all duration-1000 ease-in-out"
            stroke={color}
            cx={sqSize / 2} cy={sqSize / 2} r={radius}
            strokeWidth={`${strokeWidth}px`} transform={`rotate(-90 ${sqSize / 2} ${sqSize / 2})`}
            style={{ strokeDasharray: dashArray, strokeDashoffset: dashOffset, strokeLinecap: 'round' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-black text-white">{`${Math.round(percentage)}%`}</span>
        </div>
      </div>
    );
};

interface UserProgressDashboardProps {
    user: User;
    onBack: () => void;
}
  
const UserProgressDashboard: React.FC<UserProgressDashboardProps> = ({ user, onBack }) => {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);

  const subjectColors: Record<string, string> = {
    arabic: '#22c55e', philosophy: '#a855f7', history: '#f97316',
    geography: '#3b82f6', islamic: '#14b8a6', math: '#06b6d4',
    english: '#ef4444', french: '#6366f1',
  };

  useEffect(() => {
    const fetchAllProgress = async () => {
      setLoading(true);

      // 1. Fetch all user's completed sub-items
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('subject, sub_item_id, item_id, item_type')
        .eq('user_id', user.id);

      const completedCounts = (progressData || []).reduce((acc, item) => {
        if (item.subject) {
            acc[item.subject] = (acc[item.subject] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // 2. Fetch all content to calculate total trackable items
      const { data: allLessons } = await supabase.from('lessons_content').select('section_id, content');
      const { data: allExams } = await supabase.from('exams').select('subject');

      const totalCounts: Record<string, number> = {};
      
      // Count sub-items from lessons
      (allLessons || []).forEach(lesson => {
          const subjectId = lesson.section_id.split('_')[0];
          if (subjectId) {
              totalCounts[subjectId] = (totalCounts[subjectId] || 0) + getTrackableIdsCount(lesson.content);
          }
      });
      
      // Count exams as single items
      const subjectNameToId = ALL_SUBJECTS_LIST.reduce((acc, sub) => {
          acc[sub.name] = sub.id;
          return acc;
      }, {} as Record<string, string>);

      (allExams || []).forEach(exam => {
          const subjectId = subjectNameToId[exam.subject];
          if (subjectId) {
              totalCounts[subjectId] = (totalCounts[subjectId] || 0) + 1;
          }
      });

      // 3. Combine data into final stats object
      const finalStats: ProgressStats = {};
      ALL_SUBJECTS_LIST.forEach(subject => {
        const total = totalCounts[subject.id] || 0;
        if (total > 0) { // Only show subjects with content
          finalStats[subject.id] = {
            completed: completedCounts[subject.id] || 0,
            total: total,
            name: subject.name,
            color: subjectColors[subject.id] || '#71717a',
          };
        }
      });
      
      setStats(finalStats);
      setLoading(false);
    };

    fetchAllProgress();
  }, [user.id]);

  useEffect(() => {
    const getAdvice = async () => {
      if (!stats || Object.keys(stats).length === 0) return;
      setLoadingAi(true);
      
      let summary = "بيانات تقدم الطالب:\n";
      let totalProgress = 0;
      let totalItems = 0;

      for (const subjectId in stats) {
        const { completed, total, name } = stats[subjectId];
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        summary += `- ${name}: ${completed}/${total} (${Math.round(percentage)}%)\n`;
        totalProgress += completed;
        totalItems += total;
      }
      
      const overallPercentage = totalItems > 0 ? (totalProgress / totalItems) * 100 : 0;
      if (overallPercentage < 5) {
        setAiAdvice("ابدأ رحلتك الدراسية! اختر مادة من قسم الدروس وحدد الدروس التي أكملتها لتتبع تقدمك والحصول على نصائح ذكية.");
        setLoadingAi(false);
        return;
      }

      const prompt = `أنت مستشار دراسي ذكي ومحفز لطلاب البكالوريا. بناءً على بيانات تقدم الطالب التالية، قدم له نصائح موجزة ومركزة في 3 نقاط فقط حول المواد التي يجب أن يركز عليها أكثر ولماذا. كن مشجعاً وإيجابياً واختم كلامك بعبارة تحفيزية. ${summary}`;
      
      try {
        const client = getGeminiClient();
        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        setAiAdvice(response.text || 'لا توجد نصائح حالياً.');
      } catch (error) {
        console.error("AI advice error:", error);
        setAiAdvice('حدث خطأ أثناء جلب النصيحة.');
      } finally {
        setLoadingAi(false);
      }
    };

    if (!loading) {
      getAdvice();
    }
  }, [stats, loading]);

  const overallProgress = useMemo(() => {
    if (!stats) return { completed: 0, total: 0, percentage: 0 };
    // FIX: Refactored to use Object.keys for more robust type inference, resolving 'unknown' type errors.
    const completed = Object.keys(stats).reduce((sum, subjectId) => sum + stats[subjectId].completed, 0);
    const total = Object.keys(stats).reduce((sum, subjectId) => sum + stats[subjectId].total, 0);
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  }, [stats]);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Loader2 className="w-12 h-12 animate-spin text-teal-500 mb-4" />
        <p className="text-lg font-bold text-gray-300">جاري تحليل تقدمك الدقيق...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 animate-fadeIn pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="p-3 bg-neutral-900 rounded-xl hover:bg-neutral-800 transition-colors border border-neutral-800">
              <ArrowRight size={20} />
          </button>
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500">لوحة التقدم</h1>
          <div className="w-12"></div> {/* Spacer */}
      </div>

      <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-neutral-900 to-black rounded-3xl p-8 text-center border border-neutral-800 shadow-2xl">
            <h2 className="text-3xl font-black text-white mb-2">لوحة التقدم الشاملة</h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
            تابع إنجازاتك، واعرف أين يجب أن تركز جهودك القادمة.
            </p>
            <div className="mt-8 bg-black/30 p-6 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">التقدم الإجمالي</h3>
            <p className="text-5xl font-black text-teal-400 font-mono tracking-tighter">{Math.round(overallProgress.percentage)}%</p>
            <p className="text-xs text-gray-400 mt-1">{overallProgress.completed} من أصل {overallProgress.total} عنصر مكتمل</p>
            </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats && Object.entries(stats).map(([id, data]) => {
            const typedData = data as ProgressStats[string];
            return (
            <div key={id} className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 flex flex-col items-center text-center hover:border-neutral-700 transition-colors">
                <CircularProgress percentage={typedData.total > 0 ? (typedData.completed / typedData.total) * 100 : 0} color={typedData.color} />
                <h4 className="font-bold text-white text-lg mt-4">{typedData.name}</h4>
                <p className="text-sm text-gray-500">{typedData.completed} / {typedData.total}</p>
            </div>
            )})}
        </div>

        <div className="bg-neutral-900 p-6 rounded-2xl border-l-4 border-teal-500 shadow-md">
            <h3 className="font-bold text-lg text-teal-400 mb-3 flex items-center gap-2">
            <BrainCircuit size={20} /> نصيحة المستشار الذكي
            </h3>
            {loadingAi ? (
            <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري إنشاء خطتك الدراسية...</span>
            </div>
            ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line leading-relaxed text-gray-200 text-justify font-medium">
                {aiAdvice}
            </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default UserProgressDashboard;