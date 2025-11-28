export enum Subject {
  MATH = 'Toán',
  VIETNAMESE = 'Tiếng Việt'
}

export interface Question {
  id: number;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  svgImage?: string; // Optional field for SVG content
}

export interface QuizData {
  id: string;
  subject: Subject;
  questions: Question[];
  createdAt: number;
}

export interface QuizResult {
  quizId: string;
  subject: Subject;
  score: number;
  totalQuestions: number;
  date: number;
  userAnswers: number[]; // Store index of selected answers
}