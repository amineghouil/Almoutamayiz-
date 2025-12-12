export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  prize: string;
  difficulty: 'easy' | 'medium' | 'hard';
  subject: string;
  chapter: string;
  lesson: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user' | 'teacher_arabic' | 'teacher_philosophy' | 'teacher_social';
  totalEarnings: number;
  avatar?: string;
  volume?: number;
  theme?: 'light' | 'dark';
  lastLogin?: string; // YYYY-MM-DD
  streak?: number; // Consecutive days logged in
}

export enum GameState {
  AUTH = 'AUTH',
  APP = 'APP', // Main App State (Tabs)
  PLAYING = 'PLAYING', // Inside the Millionaire Game
  VICTORY = 'VICTORY',
  GAME_OVER = 'GAME_OVER',
  ADMIN = 'ADMIN',
  SELECTION = 'SELECTION',
  CALCULATOR = 'CALCULATOR', // New Calculator Page State
  MATCHING_GAME_SELECTION = 'MATCHING_GAME_SELECTION', // NEW: Matching Game Selection State
  MATCHING_GAME = 'MATCHING_GAME', // NEW: Matching Game Play State
  PROGRESS_DASHBOARD = 'PROGRESS_DASHBOARD',
}

export interface Lifelines {
  fiftyFifty: boolean;
  askAudience: boolean;
  callFriend: boolean;
}

export interface MoneyTier {
  level: number;
  amount: string;
  isSafeHaven: boolean;
  value: number;
}

// New Types for the LMS features
export interface ChatMessage {
  id: number;
  user_id: string;
  content: string; // Will store text or "Voice Message" label
  type: 'text' | 'audio' | 'image'; // Added 'image'
  media_url?: string; // New field for audio/image URL
  created_at: string;
  likes: number;
  subject?: string;
  profiles?: {
    name: string;
    avatar: string;
    role: string;
  }
}

export interface Exam {
  id: number;
  year: number;
  subject: string;
  type: 'bac' | 't1' | 't2' | 't3'; // Updated to support types
  pdf_url: string;
  created_at: string;
}

export interface AdminMessage {
  id: number;
  user_id: string;
  user_name: string;
  content: string;
  is_replied: boolean;
  response?: string; // NEW: Store the teacher's reply here
  created_at: string;
}

export interface LessonContent {
  id: number;
  subject: string;
  section_id: string;
  title: string;
  subtitle: string;
  content: string; // JSON string of LessonBlock[]
  color: 'red' | 'green' | 'blue' | 'yellow'; // Legacy or Main Color
  created_at: string;
}

export interface LessonBlock {
  id: string;
  // FIX: Added 'math_law' to support math-specific blocks and fix type error in LessonRenderer.
  type: 'title' | 'subtitle' | 'paragraph' | 'date_entry' | 'term_entry' | 'char_entry' | 'math_law';
  text: string; // Main text (Event, Term, Name, or Paragraph content)
  extra_1?: string; // Optional: Date, Definition, or Bio
  color: 'black' | 'red' | 'green' | 'blue' | 'yellow' | 'indigo';
}

export interface PhilosophyPhilosopher {
  name: string;
  idea: string;
  quote?: string;
  example?: string;
}

export interface PhilosophyTheory {
  title: string;
  philosophers: PhilosophyPhilosopher[];
}

export interface PhilosophyPosition {
  title: string;
  theories: PhilosophyTheory[];
  critique?: string; // NEW: Added critique field
}

export interface PhilosophyStructuredContent {
  type: "philosophy_structured";
  videoUrl: string;
  problem: string;
  positions: PhilosophyPosition[];
  synthesisType: "transcending" | "predominance" | "reconciliation";
  synthesis: string;
  conclusion: string;
}

export interface CurriculumStatus {
  id: number;
  subject: string;
  last_lesson: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  title: string;
  content: string;
  created_at: string;
  user_id?: string | null;
  // Extra fields for UI logic
  is_consultation_reply?: boolean;
  reply_data?: { question: string, answer: string, responder: string };
}

export type AppTab = 'home' | 'lessons' | 'game' | 'community' | 'teachers';

// NEW: Matching Game Types
export interface MatchItem {
  id: string;
  left: string; // Text for the left column (e.g., Philosopher Name, Date, Term)
  right: string; // Text for the right column (e.g., Idea/Quote, Event, Definition)
  sourceId: string; // To help link back to original lesson block if needed
}

export interface MatchingGameData {
  modeId: string;
  title: string;
  description: string;
  gradient: string;
  primaryColor: string;
  shadowColor: string;
  icon: string;
  backgroundImage: string;
  items: MatchItem[];
}

export interface UserProgress {
  id?: number;
  user_id: string;
  item_id: string; // e.g., 'lesson_123' or 'exam_45'
  sub_item_id?: string; // NEW: Granular tracking e.g., 'block_abc' or 'philo_pos_0'
  item_type: 'lesson' | 'exam';
  subject: string; // e.g., 'arabic', 'philosophy'
  completed_at?: string;
}

declare global {
  interface Window {
    addToast: (message: string, type: 'success' | 'error' | 'info') => { success: boolean };
  }
}