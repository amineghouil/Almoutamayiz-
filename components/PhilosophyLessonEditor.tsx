
import React, { useState, useEffect } from 'react';
import { PhilosophyStructuredContent, PhilosophyPosition, PhilosophyPhilosopher } from '../types';
import { BookOpen, Sparkles, User, Quote, Edit3, PlusCircle, Trash2, Save, X, ChevronLeft, Video, Lightbulb, MessageCircle, Layers, CheckCircle } from 'lucide-react';

interface PhilosophyLessonEditorProps {
    lessonId: number;
    initialData: PhilosophyStructuredContent;
    videoUrl: string;
    onSave: (updatedData: PhilosophyStructuredContent) => void;
    onCancel: () => void;
}

const PhilosophyLessonEditor: React.FC<PhilosophyLessonEditorProps> = ({ lessonId, initialData, videoUrl, onSave, onCancel }) => {
    const [data, setData] = useState<PhilosophyStructuredContent>(initialData);
    const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl);

    useEffect(() => {
        setData(initialData);
        setCurrentVideoUrl(videoUrl);
    }, [initialData, videoUrl]);

    const handleTextChange = (field: keyof PhilosophyStructuredContent, value: string) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const handlePositionChange = (posIndex: number, field: keyof PhilosophyPosition, value: string) => {
        const newPositions = [...data.positions];
        // Ensure field exists before assignment (e.g., critique is optional)
        if (field === 'critique') {
            newPositions[posIndex].critique = value;
        } else {
            (newPositions[posIndex] as any)[field] = value;
        }
        setData(prev => ({ ...prev, positions: newPositions }));
    };

    const handlePhilosopherChange = (posIndex: number, theoryIndex: number, philoIndex: number, field: keyof PhilosophyPhilosopher, value: string) => {
        const newPositions = [...data.positions];
        const newPhilosophers = [...newPositions[posIndex].theories[theoryIndex].philosophers];
        (newPhilosophers[philoIndex] as any)[field] = value;
        newPositions[posIndex].theories[theoryIndex].philosophers = newPhilosophers;
        setData(prev => ({ ...prev, positions: newPositions }));
    };

    const addPhilosopher = (posIndex: number, theoryIndex: number) => {
        const newPositions = [...data.positions];
        newPositions[posIndex].theories[theoryIndex].philosophers.push({ name: '', idea: '', quote: '', example: '' });
        setData(prev => ({ ...prev, positions: newPositions }));
    };

    const removePhilosopher = (posIndex: number, theoryIndex: number, philoIndex: number) => {
        const newPositions = [...data.positions];
        newPositions[posIndex].theories[theoryIndex].philosophers.splice(philoIndex, 1);
        setData(prev => ({ ...prev, positions: newPositions }));
    };

    const handleSaveClick = () => {
        onSave({ ...data, videoUrl: currentVideoUrl });
    };

    const INPUT_CLASS = "w-full bg-slate-50 dark:bg-black border border-slate-300 dark:border-neutral-700 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 placeholder:text-slate-400 dark:placeholder:text-gray-500 transition-colors text-sm";
    const TEXTAREA_CLASS = "w-full bg-slate-50 dark:bg-black border border-slate-300 dark:border-neutral-700 rounded-xl p-3 h-24 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 placeholder:text-slate-400 dark:placeholder:text-gray-500 transition-colors text-sm resize-y";

    return (
        <div className="space-y-6 animate-fadeIn">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <BookOpen className="w-7 h-7 text-purple-500" /> تعديل مقالة فلسفية (ID: {lessonId})
            </h2>

            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 shadow-md space-y-4">
                <label className="block text-sm font-bold text-gray-400 flex items-center gap-2"><Video size={16} /> رابط فيديو الشرح (يوتيوب)</label>
                <input
                    type="text"
                    value={currentVideoUrl}
                    onChange={(e) => setCurrentVideoUrl(e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="https://www.youtube.com/watch?v=..."
                    dir="ltr"
                />
            </div>

            {/* Problem Statement */}
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 shadow-md space-y-4">
                <h3 className="text-xl font-black text-white flex items-center gap-2"><Lightbulb size={20} className="text-yellow-500" /> طرح المشكلة (المقدمة)</h3>
                <textarea
                    value={data.problem}
                    onChange={(e) => handleTextChange('problem', e.target.value)}
                    className={TEXTAREA_CLASS}
                    placeholder="اكتب هنا طرح المشكلة أو المقدمة..."
                />
            </div>

            {/* Positions (Arguments) */}
            {data.positions.map((position, posIndex) => (
                <div key={posIndex} className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 shadow-md space-y-6">
                    <h3 className={`text-xl font-black ${posIndex === 0 ? 'text-blue-500' : 'text-orange-500'} flex items-center gap-2`}>
                        <MessageCircle size={20} /> {position.title}
                    </h3>

                    {position.theories.map((theory, theoryIndex) => (
                        <div key={theoryIndex} className="space-y-4 border-b border-neutral-800 pb-6 last:border-b-0">
                            {/* Philosophers */}
                            {theory.philosophers.map((philo, philoIndex) => (
                                <div key={philoIndex} className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 space-y-2 relative">
                                    <button
                                        onClick={() => removePhilosopher(posIndex, theoryIndex, philoIndex)}
                                        className="absolute top-2 left-2 p-1 bg-red-600/20 text-red-500 rounded-full hover:bg-red-600/40 transition-colors"
                                        title="حذف فيلسوف"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                        <User size={16} className="text-purple-400" /> فيلسوف {philoIndex + 1}
                                    </h4>
                                    <input
                                        type="text"
                                        value={philo.name}
                                        onChange={(e) => handlePhilosopherChange(posIndex, theoryIndex, philoIndex, 'name', e.target.value)}
                                        className={INPUT_CLASS}
                                        placeholder="اسم الفيلسوف"
                                    />
                                    <textarea
                                        value={philo.idea}
                                        onChange={(e) => handlePhilosopherChange(posIndex, theoryIndex, philoIndex, 'idea', e.target.value)}
                                        className={TEXTAREA_CLASS}
                                        placeholder="فكرته باختصار"
                                    />
                                    <textarea
                                        value={philo.quote}
                                        onChange={(e) => handlePhilosopherChange(posIndex, theoryIndex, philoIndex, 'quote', e.target.value)}
                                        className={TEXTAREA_CLASS}
                                        placeholder="قول مأثور له (اختياري)"
                                    />
                                    <textarea
                                        value={philo.example}
                                        onChange={(e) => handlePhilosopherChange(posIndex, theoryIndex, philoIndex, 'example', e.target.value)}
                                        className={TEXTAREA_CLASS}
                                        placeholder="مثال واقعي (اختياري)"
                                    />
                                </div>
                            ))}
                            <button
                                onClick={() => addPhilosopher(posIndex, theoryIndex)}
                                className="w-full py-2 bg-blue-600/20 text-blue-500 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600/30 transition-colors"
                            >
                                <PlusCircle size={16} /> إضافة فيلسوف
                            </button>
                        </div>
                    ))}
                    
                    {/* NEW: Critique for this position */}
                    <div className="bg-red-900/10 p-5 rounded-xl border border-red-500/20 space-y-3">
                        <h4 className="font-black text-lg text-red-400 flex items-center gap-2">
                            <Layers size={18} /> نقد الموقف {posIndex === 0 ? 'الأول' : 'الثاني'}
                        </h4>
                        <textarea
                            value={position.critique || ''}
                            onChange={(e) => handlePositionChange(posIndex, 'critique', e.target.value)}
                            className={TEXTAREA_CLASS}
                            placeholder={`اكتب هنا نقد الموقف ${posIndex === 0 ? 'الأول' : 'الثاني'}...`}
                        />
                    </div>
                </div>
            ))}

            {/* Synthesis */}
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 shadow-md space-y-4">
                <h3 className="text-xl font-black text-white flex items-center gap-2"><Sparkles size={20} className="text-yellow-500" /> التركيب</h3>
                <select
                    value={data.synthesisType}
                    onChange={(e) => handleTextChange('synthesisType', e.target.value as any)}
                    className={INPUT_CLASS + " mb-2"}
                >
                    <option value="transcending">تجاوز</option>
                    <option value="predominance">تغليب</option>
                    <option value="reconciliation">توفيق</option>
                </select>
                <textarea
                    value={data.synthesis}
                    onChange={(e) => handleTextChange('synthesis', e.target.value)}
                    className={TEXTAREA_CLASS}
                    placeholder="اكتب هنا التركيب (التوفيق أو التغليب أو التجاوز)..."
                />
            </div>

            {/* Conclusion */}
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 shadow-md space-y-4">
                <h3 className="text-xl font-black text-green-500 flex items-center gap-2"><CheckCircle size={20} /> حل المشكلة (الخاتمة)</h3>
                <textarea
                    value={data.conclusion}
                    onChange={(e) => handleTextChange('conclusion', e.target.value)}
                    className={TEXTAREA_CLASS}
                    placeholder="اكتب هنا حل المشكلة أو الخاتمة..."
                />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-8">
                <button
                    onClick={handleSaveClick}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                >
                    <Save size={18} /> حفظ التعديلات
                </button>
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                >
                    <X size={18} /> إلغاء
                </button>
            </div>
        </div>
    );
};

export default PhilosophyLessonEditor;
