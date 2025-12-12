
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Question, Notification, AdminMessage, LessonContent, LessonBlock, PhilosophyStructuredContent, User } from '../types';
import { 
  PlusCircle, Trash2, Loader2, Save, Edit3, Sparkles, Inbox, 
  Link as LinkIcon, Camera, ImageIcon, ChevronLeft, ChevronDown, X,
  ArrowUp, ArrowDown, Type, AlignLeft, Palette, RotateCcw,
  MessageCircle, Send, LogOut, RefreshCw, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
    LESSON_FORMAT_PROMPT, DATES_FORMAT_PROMPT, TERMS_FORMAT_PROMPT, CHARACTERS_FORMAT_PROMPT, 
    PHILOSOPHY_LESSON_PROMPT, ALL_SUBJECTS_LIST,
    MATH_LAW_PROMPT, MATH_IMAGE_EXTRACT_PROMPT, EXAM_YEARS
} from '../constants';
import { getGeminiClient } from '../lib/gemini';
import PhilosophyLessonEditor from './PhilosophyLessonEditor'; 

interface AdminDashboardProps {
  currentUser: User;
  questions: Question[];
  onAddQuestion: (q: Question) => void;
  onDeleteQuestion: (id: number) => void;
  onLogout: () => void;
  onPlay: () => void;
  onSeedQuestions?: () => void;
}

const SUBJECTS = ALL_SUBJECTS_LIST;

const TRIMESTERS = [
    { id: 't1', label: 'الفصل الأول' },
    { id: 't2', label: 'الفصل الثاني' },
    { id: 't3', label: 'الفصل الثالث' }
];

const EXAM_TYPES = [
    { id: 'bac', label: 'بكالوريا رسمية' },
    { id: 't1', label: 'اختبارات الفصل الأول' },
    { id: 't2', label: 'اختبارات الفصل الثاني' },
    { id: 't3', label: 'اختبارات الفصل الثالث' },
];

const ALL_LESSON_TYPES = [
    { id: 'intellectual', label: 'البناء الفكري (عربية)' },
    { id: 'linguistic', label: 'البناء اللغوي (عربية)' },
    { id: 'criticism', label: 'التقويم النقدي (عربية)' },
    { id: 'philosophy_article', label: 'مقالة فلسفية (منهجية)' },
    { id: 'lessons', label: 'درس عادي (نص وعناوين)' },
    { id: 'dates', label: 'تواريخ وأحداث' },
    { id: 'terms', label: 'مصطلحات' },
    { id: 'characters', label: 'شخصيات' },
    { id: 'definitions', label: 'تعاريف شرعية' },
    { id: 'math_law', label: 'قوانين رياضية' }, 
];

const INPUT_CLASS = "w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-400 dark:placeholder:text-gray-500 transition-colors";

// --- MATH KEYBOARD COMPONENT ---
const MATH_SYMBOLS = [
    { label: '√', value: '√' }, { label: '²', value: '²' }, { label: 'ⁿ', value: 'ⁿ' },
    { label: '∞', value: '∞' }, { label: '∈', value: '∈' }, { label: '∉', value: '∉' },
    { label: '∪', value: '∪' }, { label: '∩', value: '∩' }, { label: '≡', value: '≡' },
    { label: 'u₀', value: 'u₀' }, { label: 'uₙ', value: 'uₙ' }, { label: 'uₙ₊₁', value: 'uₙ₊₁' },
    { label: '∫', value: '∫' }, { label: '∑', value: '∑' }, { label: '≠', value: '≠' },
    { label: '≤', value: '≤' }, { label: '≥', value: '≥' }, { label: '→', value: '→' },
    { label: 'lim', value: 'lim ' }, { label: 'ln', value: 'ln ' }, { label: 'e', value: 'e' },
    { label: 'π', value: 'π' }, { label: 'Δ', value: 'Δ' }, { label: 'α', value: 'α' },
    { label: 'β', value: 'β' }, { label: 'θ', value: 'θ' }, { label: 'λ', value: 'λ' },
];

const MathKeyboard: React.FC<{onInsert: (s:string)=>void}> = ({ onInsert }) => (
    <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 p-2 rounded-xl grid grid-cols-6 sm:grid-cols-9 gap-1 mt-2 animate-fadeIn mb-2">
        {MATH_SYMBOLS.map((sym) => (
            <button key={sym.label} onClick={(e) => { e.preventDefault(); onInsert(sym.value); }} className="bg-white dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg py-1.5 text-sm font-bold shadow-sm active:scale-95 transition-transform text-slate-800 dark:text-white">
                {sym.label}
            </button>
        ))}
    </div>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, questions, onDeleteQuestion, onLogout }) => {
  // Determine role-based restrictions
  const isTeacher = currentUser.role.startsWith('teacher_');
  
  const getTeacherKeywords = (role: string): string[] => {
      if (role === 'teacher_arabic') return ['اللغة العربية', 'أدب عربي', 'الأدب العربي', 'arabic'];
      if (role === 'teacher_philosophy') return ['الفلسفة', 'فلسفة', 'philosophy'];
      if (role === 'teacher_social') return ['الاجتماعيات', 'التاريخ', 'الجغرافيا', 'history'];
      return [];
  };

  const teacherKeywords = isTeacher ? getTeacherKeywords(currentUser.role) : [];
  const teacherTitle = isTeacher ? 
      (currentUser.role === 'teacher_arabic' ? 'أستاذ اللغة العربية' : 
       currentUser.role === 'teacher_philosophy' ? 'أستاذ الفلسفة' : 
       'أستاذ الاجتماعيات') : 'لوحة الإدارة';

  const [activeTab, setActiveTab] = useState<'lessons' | 'game' | 'notifications' | 'inbox' | 'community' | 'exams' | 'ai'>(() => {
      if (isTeacher) return 'inbox';
      const saved = localStorage.getItem('admin_active_tab');
      return (saved as any) || 'lessons';
  });

  const [loading, setLoading] = useState(false);
  const [lessons, setLessons] = useState<LessonContent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [inbox, setInbox] = useState<AdminMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyText, setReplyText] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  // Exams State
  const [examSub, setExamSub] = useState('arabic');
  const [examType, setExamType] = useState('bac'); 
  const [examLinks, setExamLinks] = useState<Record<number, string>>({});

  // Lesson Editor State
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [lessonTitle, setLessonTitle] = useState(() => localStorage.getItem('draft_lesson_title') || '');
  const [lessonSub, setLessonSub] = useState(() => {
      return localStorage.getItem('draft_lesson_sub') || 'arabic';
  });
  const [lessonTri, setLessonTri] = useState(() => localStorage.getItem('draft_lesson_tri') || 't1');
  const [lessonType, setLessonType] = useState(() => localStorage.getItem('draft_lesson_type') || 'lessons');
  const [lessonContentRaw, setLessonContentRaw] = useState(() => localStorage.getItem('draft_lesson_content') || '');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [formattedContent, setFormattedContent] = useState<any>(null); 
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isEditingPhilosophyLesson, setIsEditingPhilosophyLesson] = useState(false);
  const [editingPhiloLessonData, setEditingPhiloLessonData] = useState<PhilosophyStructuredContent | null>(null);

  // Block Editing
  const [expandedLessonId, setExpandedLessonId] = useState<number | null>(null);
  
  // Image Upload
  const [uploadImage, setUploadImage] = useState<string | null>(null);
  const [isExtractingImage, setIsExtractingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableLessonTypes = useMemo(() => {
      let types: string[] = [];
      switch (lessonSub) {
          case 'arabic': types = ['intellectual', 'linguistic', 'criticism', 'lessons']; break;
          case 'philosophy': types = ['philosophy_article', 'lessons']; break;
          case 'history': types = ['lessons', 'dates', 'characters', 'terms']; break;
          case 'geography': types = ['lessons', 'terms']; break;
          case 'math': types = ['math_law']; break;
          case 'french': case 'english': types = ['lessons', 'terms']; break;
          case 'islamic': types = ['lessons', 'definitions']; break;
          default: types = ['lessons']; break;
      }
      return types;
  }, [lessonSub]);

  useEffect(() => {
      const types = availableLessonTypes;
      if (!types.includes(lessonType)) setLessonType(types[0]);
  }, [lessonSub, availableLessonTypes]);

  useEffect(() => {
      if (!isTeacher) {
          localStorage.setItem('admin_active_tab', activeTab);
      } else {
          setActiveTab('inbox');
      }
  }, [activeTab, isTeacher]);
  
  useEffect(() => { fetchUnreadCount(); fetchData(); }, [activeTab]);

  // --- POLLING MECHANISM ---
  useEffect(() => {
      if (activeTab === 'inbox') {
          const interval = setInterval(() => {
              // Only poll if not currently replying
              if (!replyingTo) {
                  fetchData();
                  fetchUnreadCount();
              }
          }, 8000);
          return () => clearInterval(interval);
      }
  }, [activeTab, replyingTo]);

  useEffect(() => {
    if (activeTab === 'lessons' && !isTeacher) { fetchFilteredLessons(); }
  }, [activeTab, lessonSub, lessonTri, lessonType, isTeacher]);

  useEffect(() => {
    if (activeTab === 'exams' && !isTeacher) fetchExamsForSubject();
  }, [examSub, examType, activeTab, isTeacher]);

  useEffect(() => {
      if (isTeacher) return;
      localStorage.setItem('draft_lesson_title', lessonTitle);
      localStorage.setItem('draft_lesson_sub', lessonSub);
      localStorage.setItem('draft_lesson_tri', lessonTri);
      localStorage.setItem('draft_lesson_type', lessonType);
      localStorage.setItem('draft_lesson_content', lessonContentRaw);
  }, [lessonTitle, lessonSub, lessonTri, lessonType, lessonContentRaw, isTeacher]);

  const fetchUnreadCount = async () => {
    try {
        const { data } = await supabase.from('admin_messages').select('content').eq('is_replied', false);
        if (data) {
            let relevantMessages = data;
            if (isTeacher && teacherKeywords.length > 0) {
                 relevantMessages = data.filter(m => teacherKeywords.some(k => m.content.includes(k)));
            }
            setUnreadCount(relevantMessages.length);
        }
    } catch (e) {
        console.error("Error fetching unread count:", e);
    }
  };

  const fetchData = async () => {
      if (activeTab === 'notifications' && !isTeacher) {
          const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
          if (data) setNotifications(data as any);
      } else if (activeTab === 'inbox') {
          // Fetch ALL messages from admin_messages
          // NOTE: If RLS is set to 'Users can only see their own rows', this will only return rows created by the current user (Teacher).
          // If you want Teachers to see Students' messages, the Supabase Policy for 'admin_messages' must allow 'SELECT' for the teacher's role.
          const { data, error } = await supabase
            .from('admin_messages')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (data) {
              let msgs = data as AdminMessage[];
              
              // Frontend filtering for teachers to see only their subject
              if (isTeacher && teacherKeywords.length > 0) {
                  msgs = msgs.filter(m => {
                      return teacherKeywords.some(keyword => m.content.includes(keyword));
                  });
              }
              setInbox(msgs);
          } else if (error) {
              console.error("Error fetching admin messages:", error);
          }
      }
  };

  const fetchFilteredLessons = async () => {
      setLoading(true);
      setExpandedLessonId(null); 
      const sectionId = `${lessonSub}_${lessonTri}_${lessonType}`;
      const { data } = await supabase.from('lessons_content').select('*').eq('section_id', sectionId).order('created_at', { ascending: false });
      if (data) setLessons(data as any);
      setLoading(false);
  };

  const fetchExamsForSubject = async () => {
      setLoading(true);
      const subjectName = SUBJECTS.find(s => s.id === examSub)?.name || '';
      
      let query = supabase.from('exams')
          .select('*')
          .eq('subject', subjectName);
          
      if (examType === 'bac') {
          query = query.or('type.eq.bac,type.is.null');
      } else {
          query = query.eq('type', examType);
      }
      
      const { data } = await query;
      
      const links: Record<number, string> = {};
      if (data) {
          data.forEach((e: any) => {
              if (e.year) links[e.year] = e.pdf_url;
          });
      }
      setExamLinks(links);
      setLoading(false);
  };

  const handleSaveAllExams = async () => {
      setLoading(true);
      const subjectName = SUBJECTS.find(s => s.id === examSub)?.name || '';
      try {
          for (const year of EXAM_YEARS) {
              const link = examLinks[year]?.trim();
              
              if (examType === 'bac') {
                  await supabase.from('exams').delete().eq('subject', subjectName).eq('year', year).eq('type', 'bac');
                  await supabase.from('exams').delete().eq('subject', subjectName).eq('year', year).is('type', null);
              } else {
                  await supabase.from('exams').delete().eq('subject', subjectName).eq('year', year).eq('type', examType);
              }

              if (link) {
                  const { error: insError } = await supabase.from('exams').insert({
                      subject: subjectName,
                      year: year,
                      pdf_url: link,
                      type: examType
                  });
                  if (insError) throw insError;
              }
          }
          window.addToast("تم حفظ المواضيع بنجاح", 'success');
          await fetchExamsForSubject();
      } catch (e: any) {
          console.error(e);
          window.addToast("حدث خطأ أثناء الحفظ. تحقق من الاتصال.", 'error');
      } finally {
          setLoading(false);
      }
  };

  const handleAiFormat = async () => {
      if (!lessonContentRaw.trim()) {
          window.addToast("يرجى إدخال نص الدرس أولاً", 'error');
          return;
      }
      setIsProcessingAI(true);
      try {
          const client = getGeminiClient();
          let prompt = LESSON_FORMAT_PROMPT;
          
          if (lessonType === 'dates') prompt = DATES_FORMAT_PROMPT;
          else if (lessonType === 'terms') {
              if (lessonSub === 'french' || lessonSub === 'english') prompt = "Extract French/English terms and definitions into JSON (term_entry).";
              else prompt = TERMS_FORMAT_PROMPT;
          }
          else if (lessonType === 'characters') prompt = CHARACTERS_FORMAT_PROMPT;
          else if (lessonType === 'philosophy_article') prompt = PHILOSOPHY_LESSON_PROMPT;
          else if (lessonType === 'math_law') prompt = MATH_LAW_PROMPT;

          const response = await client.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt + "\n\nالنص المراد تنسيقه:\n" + lessonContentRaw
          });
          
          let jsonStr = response.text || '';
          jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
          
          const startArr = jsonStr.indexOf('[');
          const startObj = jsonStr.indexOf('{');
          
          let startIndex = -1;
          if (startArr !== -1 && (startObj === -1 || startArr < startObj)) startIndex = startArr;
          else if (startObj !== -1) startIndex = startObj;
          
          if (startIndex !== -1) {
              const lastArr = jsonStr.lastIndexOf(']');
              const lastObj = jsonStr.lastIndexOf('}');
              const endIndex = Math.max(lastArr, lastObj);
              if (endIndex !== -1) {
                  jsonStr = jsonStr.substring(startIndex, endIndex + 1);
              }
          }

          if (jsonStr) {
              try {
                  const parsed = JSON.parse(jsonStr);
                  setFormattedContent(parsed);
                  
                  if (lessonType === 'philosophy_article' && parsed.type === 'philosophy_structured') {
                       setEditingPhiloLessonData(parsed);
                       setIsEditingPhilosophyLesson(true);
                       if (parsed.videoUrl) setLessonVideoUrl(parsed.videoUrl);
                  } else {
                       setIsEditingPhilosophyLesson(false);
                       if (Array.isArray(parsed)) {
                           const normalized = parsed.map((b: any) => ({...b, id: b.id || Math.random().toString(36).substr(2,9)}));
                           setFormattedContent(normalized);
                       } else if (parsed.blocks) {
                           const normalized = parsed.blocks.map((b: any) => ({...b, id: b.id || Math.random().toString(36).substr(2,9)}));
                           setFormattedContent({...parsed, blocks: normalized});
                       }
                  }
                  window.addToast("تم التنسيق بنجاح", 'success');
              } catch (parseError) {
                  console.error(parseError);
                  window.addToast("فشل تحليل رد الذكاء الاصطناعي (JSON غير صالح)", 'error');
              }
          } else {
              window.addToast("لم يتم استلام رد صالح من الذكاء الاصطناعي", 'error');
          }
      } catch (e: any) {
          console.error(e);
          window.addToast(`خطأ: ${e.message}`, 'error');
      } finally {
          setIsProcessingAI(false);
      }
  };

  const handleSaveLesson = async () => {
      if (!lessonTitle || !formattedContent) return alert("يرجى ملء العنوان والمحتوى");
      
      setLoading(true);
      
      let finalContent = formattedContent;
      
      if (Array.isArray(formattedContent) || (formattedContent.blocks)) {
           let blocks = Array.isArray(formattedContent) ? formattedContent : formattedContent.blocks;
           blocks = blocks.map((b: any) => ({ ...b, id: b.id || Math.random().toString(36).substr(2, 9) }));
           
           if (lessonType !== 'philosophy_article') { 
               finalContent = {
                   type: 'standard',
                   videoUrl: lessonVideoUrl,
                   blocks: blocks
               };
           }
      }

      if (isEditingPhilosophyLesson && editingPhiloLessonData) {
          finalContent = { ...editingPhiloLessonData, videoUrl: lessonVideoUrl };
      }

      const lessonData = {
          section_id: `${lessonSub}_${lessonTri}_${lessonType}`,
          title: lessonTitle,
          subtitle: '',
          content: JSON.stringify(finalContent),
          subject: SUBJECTS.find(s=>s.id===lessonSub)?.name || lessonSub,
          color: 'blue'
      };

      if (editingLessonId) {
          await supabase.from('lessons_content').update(lessonData).eq('id', editingLessonId);
          setEditingLessonId(null);
      } else {
          await supabase.from('lessons_content').insert(lessonData);
      }
      
      setLessonTitle('');
      setLessonContentRaw('');
      setFormattedContent(null);
      setLessonVideoUrl('');
      setIsEditingPhilosophyLesson(false);
      
      fetchFilteredLessons();
      setLoading(false);
      window.addToast('تم حفظ الدرس بنجاح', 'success');
  };

  const handleImageExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsExtractingImage(true);
      try {
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64Data = (reader.result as string).split(',')[1];
              const client = getGeminiClient();
              
              const response = await client.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: {
                      parts: [
                          { inlineData: { mimeType: file.type, data: base64Data } },
                          { text: MATH_IMAGE_EXTRACT_PROMPT }
                      ]
                  }
              });
              
              const jsonStr = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
              if (jsonStr) {
                  const parsed = JSON.parse(jsonStr);
                  setFormattedContent(parsed);
              }
          };
          reader.readAsDataURL(file);
      } catch (err) {
          alert("فشل استخراج النص من الصورة");
      } finally {
          setIsExtractingImage(false);
      }
  };

  const handleEditLesson = (l: LessonContent) => {
      setEditingLessonId(l.id); setLessonTitle(l.title); setLessonSub(l.section_id.split('_')[0]); setLessonTri(l.section_id.split('_')[1]); setLessonType(l.section_id.split('_')[2]); setLessonContentRaw(l.content); 
      try {
          const parsed = JSON.parse(l.content);
          if (parsed.videoUrl) setLessonVideoUrl(parsed.videoUrl);
          
          if (parsed.type === 'philosophy_structured') {
               setEditingPhiloLessonData(parsed); 
               setIsEditingPhilosophyLesson(true); 
               setFormattedContent(parsed);
          } else if (parsed.type === 'standard') { 
              setFormattedContent(parsed.blocks); 
              setIsEditingPhilosophyLesson(false); 
          } else if (Array.isArray(parsed)) { 
              setFormattedContent(parsed); 
              setIsEditingPhilosophyLesson(false); 
          } else { 
              setFormattedContent(null); 
              setIsEditingPhilosophyLesson(false); 
          }
      } catch { setFormattedContent(null); setIsEditingPhilosophyLesson(false); }
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteLesson = async (id: number) => { if(confirm('حذف؟')) { await supabase.from('lessons_content').delete().eq('id', id); fetchFilteredLessons(); } };
  
  const updateBlock = (blockId: string, field: string, value: string) => {
      if (!formattedContent) return;
      let blocks = Array.isArray(formattedContent) ? [...formattedContent] : [...formattedContent.blocks];
      const idx = blocks.findIndex((b: any) => b.id === blockId);
      if (idx !== -1) {
          blocks[idx] = { ...blocks[idx], [field]: value };
          setFormattedContent(Array.isArray(formattedContent) ? blocks : { ...formattedContent, blocks });
      }
  };

  const addBlock = () => {
      const newBlock: LessonBlock = { id: Date.now().toString(), type: 'paragraph', text: 'نص جديد', color: 'black' };
      let blocks = Array.isArray(formattedContent) ? [...formattedContent] : (formattedContent?.blocks || []);
      blocks.push(newBlock);
      setFormattedContent(Array.isArray(formattedContent) ? blocks : { ...(formattedContent || { type: 'standard' }), blocks });
  };

  const removeBlock = (blockId: string) => {
      let blocks = Array.isArray(formattedContent) ? [...formattedContent] : [...formattedContent.blocks];
      blocks = blocks.filter((b: any) => b.id !== blockId);
      setFormattedContent(Array.isArray(formattedContent) ? blocks : { ...formattedContent, blocks });
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
      let blocks = Array.isArray(formattedContent) ? [...formattedContent] : [...formattedContent.blocks];
      if (direction === 'up' && index > 0) {
          [blocks[index], blocks[index - 1]] = [blocks[index - 1], blocks[index]];
      } else if (direction === 'down' && index < blocks.length - 1) {
          [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
      }
      setFormattedContent(Array.isArray(formattedContent) ? blocks : { ...formattedContent, blocks });
  };

  // --- GUARANTEED REPLY FUNCTION ---
  const handleReplySubmit = async (message: AdminMessage) => {
      if (!replyText.trim()) return;
      if (!message.id) { alert("خطأ: معرف الرسالة مفقود"); return; }
      
      setLoading(true);
      try {
          // 1. Try the Robust RPC first (Bypasses Role Issues by checking Email if available)
          // Even if RPC fails, we fall back to standard update
          const { error: rpcError } = await supabase.rpc('reply_to_consultation', { 
              p_message_id: message.id, 
              p_reply_text: replyText 
          });

          if (rpcError) {
              console.warn("RPC failed or not available, falling back to standard update", rpcError);
              // Fallback: Standard update
              const { error: updateError } = await supabase
                .from('admin_messages')
                .update({ 
                    is_replied: true,
                    response: replyText 
                })
                .eq('id', message.id);
              
              if (updateError) throw updateError;
          }

          // 2. Send Notification to Student (USING NOTIFICATIONS TABLE NOW)
          const notificationPayload = {
              type: 'consultation_reply',
              question: message.content,
              answer: replyText,
              responder: teacherTitle || currentUser.name,
              subject: teacherTitle || 'Admin'
          };

          // Insert into notifications table instead of chat_messages for better reliability
          // This ensures the student receives the toast/modal alert immediately
          const { error: notifError } = await supabase.from('notifications').insert({
              user_id: message.user_id, // Target the student specifically
              title: 'تم الرد على استشارتك',
              content: JSON.stringify(notificationPayload),
              is_consultation_reply: true,
              reply_data: notificationPayload
          });

          if (notifError) console.error("Notification insert error:", notifError);

          // 3. UI Update
          setReplyText('');
          setReplyingTo(null);
          
          setInbox(prev => prev.map(m => m.id === message.id ? { ...m, is_replied: true, response: replyText } : m));
          setUnreadCount(prev => Math.max(0, prev - 1));
          
          window.addToast('تم إرسال الرد بنجاح ووصل للطالب', 'success');
          
      } catch (err: any) {
          console.error(err);
          alert('خطأ في العملية: ' + (err.message || "فشل الاتصال بقاعدة البيانات"));
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white dark:bg-neutral-900 border-b md:border-r border-slate-200 dark:border-neutral-800 flex-shrink-0">
          <div className="p-6">
              <h1 className="text-xl font-black text-blue-600 dark:text-yellow-500">
                  {teacherTitle}
              </h1>
          </div>
          <nav className="p-4 space-y-2 flex md:block overflow-x-auto">
              {!isTeacher && (
                  <>
                    <button onClick={() => setActiveTab('lessons')} className={`block w-full text-right p-3 rounded-xl font-bold whitespace-nowrap ${activeTab === 'lessons' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-neutral-800'}`}>الدروس</button>
                    <button onClick={() => setActiveTab('exams')} className={`block w-full text-right p-3 rounded-xl font-bold whitespace-nowrap ${activeTab === 'exams' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-neutral-800'}`}>البكالوريات والفروض</button>
                    <button onClick={() => setActiveTab('game')} className={`block w-full text-right p-3 rounded-xl font-bold whitespace-nowrap ${activeTab === 'game' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-neutral-800'}`}>الألعاب</button>
                    <button onClick={() => setActiveTab('notifications')} className={`block w-full text-right p-3 rounded-xl font-bold whitespace-nowrap ${activeTab === 'notifications' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-neutral-800'}`}>الإشعارات</button>
                  </>
              )}
              
              <button onClick={() => setActiveTab('inbox')} className={`block w-full text-right p-3 rounded-xl font-bold whitespace-nowrap ${activeTab === 'inbox' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-gray-300'}`}>
                  {isTeacher ? 'صندوق الاستشارات' : 'استشارات الطلاب'}
                  {unreadCount > 0 && <span className="mr-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{unreadCount}</span>}
              </button>
              
              <button onClick={onLogout} className="block w-full text-right p-3 rounded-xl font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 whitespace-nowrap mt-4 md:mt-2">
                  <LogOut size={20} className="inline ml-2" />
                  خروج
              </button>
          </nav>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {activeTab === 'lessons' && !isTeacher && (
              <div className="space-y-6">
                   <h2 className="text-2xl font-bold">إدارة الدروس</h2>
                   {/* ... (Existing Lessons Management UI) ... */}
                   <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm">
                       {isEditingPhilosophyLesson && editingPhiloLessonData ? (
                           <PhilosophyLessonEditor
                               lessonId={editingLessonId || 0}
                               initialData={editingPhiloLessonData}
                               videoUrl={lessonVideoUrl}
                               onSave={(updatedData) => {
                                   setEditingPhiloLessonData(updatedData);
                                   setFormattedContent(updatedData);
                                   setLessonVideoUrl(updatedData.videoUrl);
                                   setTimeout(handleSaveLesson, 100);
                               }}
                               onCancel={() => { setIsEditingPhilosophyLesson(false); setFormattedContent(null); }}
                           />
                       ) : (
                           <div className="space-y-4">
                               <div className="flex justify-between items-center mb-4">
                                   <h3 className="font-bold text-lg">{editingLessonId ? 'تعديل درس' : 'إضافة درس جديد'}</h3>
                                   <div className="flex gap-2">
                                       <button onClick={() => { setLessonContentRaw(''); setLessonTitle(''); setFormattedContent(null); setLessonVideoUrl(''); }} className="text-sm bg-gray-200 dark:bg-neutral-800 px-3 py-1 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-neutral-700"><RotateCcw size={14} className="inline ml-1"/> مسح</button>
                                       {editingLessonId && <button onClick={() => { setEditingLessonId(null); setLessonTitle(''); setFormattedContent(null); }} className="text-sm text-red-500">إلغاء التعديل</button>}
                                   </div>
                               </div>
                               
                               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                   <select value={lessonSub} onChange={e => setLessonSub(e.target.value)} className={INPUT_CLASS}>{SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                                   <select value={lessonTri} onChange={e => setLessonTri(e.target.value)} className={INPUT_CLASS}>{TRIMESTERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
                                   <select value={lessonType} onChange={e => setLessonType(e.target.value)} className={INPUT_CLASS}>
                                       {availableLessonTypes.map(typeId => {
                                           const typeObj = ALL_LESSON_TYPES.find(t => t.id === typeId);
                                           return typeObj ? <option key={typeObj.id} value={typeObj.id}>{typeObj.label}</option> : null;
                                       })}
                                   </select>
                               </div>

                               <input type="text" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} placeholder="عنوان الدرس" className={INPUT_CLASS} />
                               
                               <div className="relative">
                                    <LinkIcon className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
                                    <input type="text" value={lessonVideoUrl} onChange={e => setLessonVideoUrl(e.target.value)} placeholder="رابط فيديو يوتيوب (اختياري)" className={`${INPUT_CLASS} pr-10`} dir="ltr" />
                               </div>
                               
                               <div className="relative">
                                   <textarea 
                                       value={lessonContentRaw} 
                                       onChange={e => setLessonContentRaw(e.target.value)} 
                                       placeholder="الصق نص الدرس هنا ليتم تنسيقه تلقائياً..." 
                                       className="w-full h-40 bg-slate-50 dark:bg-black border border-slate-300 dark:border-neutral-700 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors"
                                   />
                                   {lessonType === 'math_law' && (
                                       <div className="absolute top-2 left-2">
                                           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageExtract} />
                                           <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 shadow-lg" title="استخراج من صورة">
                                               {isExtractingImage ? <Loader2 className="animate-spin w-5 h-5" /> : <Camera className="w-5 h-5" />}
                                           </button>
                                       </div>
                                   )}
                                   {(lessonType === 'math_law' || lessonSub === 'math') && (
                                       <MathKeyboard onInsert={(sym) => setLessonContentRaw(prev => prev + sym)} />
                                   )}
                               </div>
                               
                               <button 
                                   onClick={handleAiFormat} 
                                   disabled={isProcessingAI || !lessonContentRaw}
                                   className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                >
                                   {isProcessingAI ? <Loader2 className="animate-spin" /> : <Sparkles />}
                                   <span>تنسيق ذكي (AI)</span>
                               </button>

                               {formattedContent && (
                                   <div className="mt-8 space-y-4 border-t border-slate-200 dark:border-neutral-800 pt-6 animate-fadeIn">
                                       <div className="flex justify-between items-center">
                                           <h4 className="font-bold flex items-center gap-2 text-lg"><Edit3 className="text-yellow-500"/> محرر الكتل ({Array.isArray(formattedContent) ? formattedContent.length : formattedContent.blocks?.length || 0})</h4>
                                           <button onClick={addBlock} className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 hover:bg-green-500"><PlusCircle size={14}/> إضافة كتلة</button>
                                       </div>
                                       
                                       <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar border border-neutral-800/50 p-2 rounded-xl">
                                            {(Array.isArray(formattedContent) ? formattedContent : formattedContent.blocks || []).map((block: any, index: number) => (
                                                <div key={block.id || index} className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-3 rounded-xl flex gap-3 items-start group">
                                                    <div className="flex flex-col gap-1 mt-1 items-center">
                                                        <span className="text-xs text-center text-gray-500 font-mono w-5 h-5 flex items-center justify-center bg-neutral-900 rounded-full">{index + 1}</span>
                                                        <button onClick={() => moveBlock(index, 'up')} className="p-1 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded text-gray-400 hover:text-white"><ArrowUp size={14}/></button>
                                                        <button onClick={() => moveBlock(index, 'down')} className="p-1 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded text-gray-400 hover:text-white"><ArrowDown size={14}/></button>
                                                    </div>
                                                    
                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex gap-2 items-center">
                                                            <select 
                                                                value={block.type} 
                                                                onChange={(e) => updateBlock(block.id, 'type', e.target.value)} 
                                                                className="bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-lg p-1 text-xs outline-none"
                                                            >
                                                                <option value="title">عنوان رئيسي</option>
                                                                <option value="subtitle">عنوان فرعي</option>
                                                                <option value="paragraph">فقرة</option>
                                                                <option value="term_entry">مصطلح</option>
                                                                <option value="date_entry">تاريخ</option>
                                                                <option value="char_entry">شخصية</option>
                                                            </select>
                                                            <select 
                                                                value={block.color || 'black'} 
                                                                onChange={(e) => updateBlock(block.id, 'color', e.target.value)} 
                                                                className="bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-lg p-1 text-xs outline-none w-24"
                                                            >
                                                                <option value="black">عادي</option>
                                                                <option value="red">أحمر</option>
                                                                <option value="blue">أزرق</option>
                                                                <option value="green">أخضر</option>
                                                                <option value="yellow">أصفر</option>
                                                            </select>
                                                            <div className={`w-3 h-3 rounded-full ${block.color === 'red' ? 'bg-red-500' : block.color === 'blue' ? 'bg-blue-500' : block.color === 'green' ? 'bg-green-500' : block.color === 'yellow' ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
                                                        </div>
                                                        <textarea 
                                                            value={block.text} 
                                                            onChange={(e) => updateBlock(block.id, 'text', e.target.value)} 
                                                            className="w-full bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-lg p-2 text-sm outline-none min-h-[60px]"
                                                            placeholder="النص..."
                                                        />
                                                        {['term_entry', 'date_entry', 'char_entry'].includes(block.type) && (
                                                            <input 
                                                                type="text" 
                                                                value={block.extra_1 || ''} 
                                                                onChange={(e) => updateBlock(block.id, 'extra_1', e.target.value)}
                                                                className="w-full bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-lg p-2 text-sm outline-none"
                                                                placeholder="معلومة إضافية (تاريخ، تعريف...)"
                                                            />
                                                        )}
                                                    </div>
                                                    
                                                    <button onClick={() => removeBlock(block.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={16}/></button>
                                                </div>
                                            ))}
                                       </div>
                                       
                                       <button onClick={handleSaveLesson} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all mt-4">
                                           <Save size={20} /> حفظ الدرس
                                       </button>
                                   </div>
                               )}
                           </div>
                       )}
                       
                       <div className="mt-10 space-y-3 pt-8 border-t border-slate-200 dark:border-neutral-800">
                           <h3 className="font-bold text-lg mb-4">قائمة الدروس ({lessons.length})</h3>
                           {lessons.map(l => (
                               <div key={l.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 hover:border-blue-500 transition-colors">
                                   <div className="flex flex-col">
                                       <span className="font-bold">{l.title}</span>
                                       <span className="text-xs text-gray-500">{l.section_id}</span>
                                   </div>
                                   <div className="flex gap-2">
                                       <button onClick={() => handleEditLesson(l)} className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><Edit3 size={16}/></button>
                                       <button onClick={() => handleDeleteLesson(l.id)} className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg"><Trash2 size={16}/></button>
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>
              </div>
          )}

          {activeTab === 'exams' && !isTeacher && (
              <div className="space-y-6">
                   <div className="flex justify-between items-center">
                       <h2 className="text-2xl font-bold">إدارة بنك الفروض والبكالوريات</h2>
                       <button onClick={handleSaveAllExams} disabled={loading} className="fixed bottom-6 left-6 z-50 bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-full font-bold shadow-2xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                           {loading ? <Loader2 className="animate-spin"/> : <Save/>}
                           <span>حفظ التغييرات</span>
                       </button>
                   </div>
                   
                   <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm">
                       {/* ... (Exams Management UI) ... */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-4 bg-slate-50 dark:bg-black rounded-xl border border-slate-100 dark:border-neutral-800">
                           <div>
                               <label className="text-sm font-bold text-gray-500 mb-2 block">1. اختر المادة:</label>
                               <select 
                                    value={examSub} 
                                    onChange={e => setExamSub(e.target.value)} 
                                    className={`${INPUT_CLASS} text-lg font-bold border-2 border-blue-500/20 focus:border-blue-500`}
                               >
                                   {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                               </select>
                           </div>
                           <div>
                               <label className="text-sm font-bold text-gray-500 mb-2 block">2. اختر نوع الامتحان:</label>
                               <select value={examType} onChange={e => setExamType(e.target.value)} className={`${INPUT_CLASS} text-lg font-bold border-2 border-green-500/20 focus:border-green-500`}>
                                   {EXAM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                               </select>
                           </div>
                       </div>

                       <div className="space-y-3">
                           {EXAM_YEARS.map(year => (
                               <div key={year} className="flex items-center gap-4">
                                   <div className="w-24 h-12 flex items-center justify-center bg-slate-100 dark:bg-neutral-800 rounded-xl font-black text-xl text-slate-700 dark:text-gray-300 shadow-sm border border-slate-200 dark:border-neutral-700">
                                       {year}
                                   </div>
                                   <div className="flex-1 relative">
                                       <LinkIcon className="absolute right-4 top-3.5 text-gray-400 w-5 h-5" />
                                       <input
                                           type="text"
                                           value={examLinks[year] || ''}
                                           onChange={(e) => setExamLinks(prev => ({ ...prev, [year]: e.target.value }))}
                                           className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl py-3 pr-12 pl-4 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 placeholder:text-gray-500 transition-colors text-left dir-ltr"
                                           placeholder="https://drive.google.com/..."
                                           dir="ltr"
                                       />
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>
              </div>
          )}

          {activeTab === 'inbox' && (
              <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                          <Inbox className="w-6 h-6 text-blue-500" />
                          {isTeacher ? 'الاستشارات الواردة' : 'استشارات الطلاب'}
                      </h2>
                      <button onClick={() => { fetchData(); fetchUnreadCount(); }} className="p-2 bg-slate-100 dark:bg-neutral-800 rounded-full hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors" title="تحديث يدوي">
                          <RefreshCw size={18} className="text-slate-500 dark:text-gray-400" />
                      </button>
                  </div>
                  
                  {inbox.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                          <Inbox className="w-16 h-16 mb-4 opacity-20" />
                          <p>لا توجد استشارات جديدة.</p>
                      </div>
                  ) : (
                      inbox.map((msg) => (
                      <div key={msg.id} className={`bg-white dark:bg-neutral-900 p-4 rounded-xl border ${msg.is_replied ? 'border-green-500/20 opacity-70' : 'border-neutral-800 shadow-md'} relative group`}>
                          {msg.is_replied && <div className="absolute top-2 left-2 text-green-500 text-xs font-bold bg-green-500/10 px-2 py-1 rounded">تم الرد</div>}
                          <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2"><MessageCircle size={16} /> {msg.user_name}</h4>
                          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed bg-black/20 p-3 rounded-lg">{msg.content}</p>
                          <div className="mt-2 text-xs text-gray-500 flex justify-between items-center">
                              <span>{new Date(msg.created_at).toLocaleString('ar-SA')}</span>
                              {!msg.is_replied && (
                                  <button onClick={() => setReplyingTo(msg.id)} className="text-blue-400 hover:text-blue-300 underline font-bold flex items-center gap-1">
                                      <Send size={12} className="rtl:-rotate-90"/> رد على الطالب
                                  </button>
                              )}
                          </div>
                          
                          {/* Reply Box */}
                          {replyingTo === msg.id && (
                              <div className="mt-4 pt-4 border-t border-neutral-800 animate-fadeIn">
                                  <textarea 
                                      value={replyText} 
                                      onChange={(e) => setReplyText(e.target.value)} 
                                      className="w-full bg-black border border-neutral-700 rounded-lg p-3 text-sm text-white mb-2 h-24 resize-none"
                                      placeholder="اكتب ردك هنا..."
                                  />
                                  <div className="flex gap-2 justify-end">
                                      <button onClick={() => setReplyingTo(null)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">إلغاء</button>
                                      <button onClick={() => handleReplySubmit(msg)} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-green-500">
                                          {loading ? <Loader2 className="animate-spin w-3 h-3" /> : <Send className="w-3 h-3 rtl:-rotate-90" />} إرسال الرد
                                      </button>
                                  </div>
                              </div>
                          )}
                      </div>
                  ))
                  )}
              </div>
          )}
      </main>
    </div>
  );
};

export default AdminDashboard;
