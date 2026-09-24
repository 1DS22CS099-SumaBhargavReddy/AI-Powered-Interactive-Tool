export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  explanation: string;
  category?: string;
  difficulty: DifficultyLevel;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StudyDeck {
  topic: string;
  summary: string;
  keyTakeaways: string[];
  cards: Flashcard[];
  quiz: QuizQuestion[];
}

export type ParseErrorType =
  | 'MALFORMED_JSON'
  | 'WRONG_SHAPE'
  | 'EMPTY_RESPONSE'
  | 'SCHEMA_MISMATCH'
  | 'NO_CARDS';

export interface ValidationFailure {
  success: false;
  errorType: ParseErrorType;
  message: string;
  rawText?: string;
  validationDetails?: string[];
}

export interface ValidationSuccess {
  success: true;
  data: StudyDeck;
  rawText?: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export type StudyMode = 'flashcards' | 'quiz' | 'weakspots' | 'notes';

export interface CardMastery {
  [cardId: string]: 'mastered' | 'review' | 'unseen';
}

export interface QuizProgress {
  [questionId: string]: {
    selectedIndex: number;
    isCorrect: boolean;
  };
}

export type LLMProvider = 'auto' | 'gemini' | 'groq' | 'openrouter' | 'ollama' | 'mock';

export type SimulatedError = 'none' | 'malformed_json' | 'wrong_shape' | 'empty' | 'timeout' | 'server_error';
