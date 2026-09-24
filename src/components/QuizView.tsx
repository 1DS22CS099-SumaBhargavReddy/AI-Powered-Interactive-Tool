import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trophy,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import type { QuizQuestion, QuizProgress } from '../types/result';

interface QuizViewProps {
  questions: QuizQuestion[];
  quizProgress: QuizProgress;
  onAnswerQuestion: (questionId: string, selectedIndex: number, isCorrect: boolean) => void;
  onResetQuiz: () => void;
  onRetestWrong: (wrongQuestionIds: string[]) => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  questions,
  quizProgress,
  onAnswerQuestion,
  onResetQuiz,
  onRetestWrong,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Sync state when moving questions
  const currentQ = questions[currentIndex];
  const existingAnswer = currentQ ? quizProgress[currentQ.id] : undefined;

  useEffect(() => {
    if (existingAnswer !== undefined) {
      setSelectedOpt(existingAnswer.selectedIndex);
      setRevealed(true);
    } else {
      setSelectedOpt(null);
      setRevealed(false);
    }
  }, [currentIndex, existingAnswer]);

  const handleSelectOption = (optIndex: number) => {
    if (revealed || !currentQ) return;
    setSelectedOpt(optIndex);
    setRevealed(true);

    const isCorrect = optIndex === currentQ.correctIndex;
    onAnswerQuestion(currentQ.id, optIndex, isCorrect);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsCompleted(true);
      // Celebrate with confetti if score >= 60%
      const totalAnswered = Object.keys(quizProgress).length;
      const totalCorrect = Object.values(quizProgress).filter(p => p.isCorrect).length;
      if (totalAnswered > 0 && totalCorrect / questions.length >= 0.6) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
      }
    }
  };

  const answeredCount = Object.keys(quizProgress).length;
  const correctCount = Object.values(quizProgress).filter(p => p.isCorrect).length;
  const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const wrongIds = questions.filter(q => quizProgress[q.id] && !quizProgress[q.id].isCorrect).map(q => q.id);

  if (isCompleted || answeredCount === questions.length && revealed && currentIndex === questions.length - 1) {
    return (
      <div className="quiz-summary-card glass-card">
        <div className="summary-trophy-box">
          {scorePercent >= 80 ? (
            <Trophy size={48} className="text-warning animate-bounce" />
          ) : (
            <Sparkles size={48} className="text-accent" />
          )}
        </div>

        <h2 className="summary-title">Quiz Completed!</h2>
        <p className="summary-subtitle">Here is your assessment performance summary:</p>

        <div className="score-metric-circle">
          <span className="score-number">{scorePercent}%</span>
          <span className="score-label">{correctCount} of {questions.length} Correct</span>
        </div>

        {wrongIds.length > 0 ? (
          <div className="wrong-questions-banner">
            <AlertCircle size={20} className="text-warning" />
            <span>You have {wrongIds.length} question{wrongIds.length > 1 ? 's' : ''} to review for mastery!</span>
          </div>
        ) : (
          <div className="perfect-score-banner">
            <CheckCircle2 size={20} className="text-success" />
            <span>Flawless score! You have mastered this topic's concepts.</span>
          </div>
        )}

        <div className="summary-actions">
          {wrongIds.length > 0 && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setIsCompleted(false);
                setCurrentIndex(0);
                onRetestWrong(wrongIds);
              }}
            >
              <RotateCcw size={16} />
              <span>Re-test Wrong Answers ({wrongIds.length})</span>
            </button>
          )}

          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setIsCompleted(false);
              setCurrentIndex(0);
              onResetQuiz();
            }}
          >
            <RotateCcw size={16} />
            <span>Restart Entire Quiz</span>
          </button>
        </div>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="empty-quiz-card glass-card">
        <HelpCircle size={32} />
        <h3>No quiz questions available</h3>
        <button type="button" className="btn-secondary" onClick={onResetQuiz}>
          Reset Quiz
        </button>
      </div>
    );
  }

  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="quiz-view-container glass-card">
      {/* Quiz Header & Progress */}
      <div className="quiz-header">
        <div className="quiz-meta-row">
          <span className="quiz-counter">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="quiz-score-pill">
            Score: {correctCount}/{answeredCount}
          </span>
        </div>
        <div className="quiz-progress-bar">
          <div
            className="quiz-progress-fill"
            style={{ width: `${((currentIndex + (revealed ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Content */}
      <div className="quiz-question-box">
        <h3 className="quiz-question-text">{currentQ.question}</h3>
      </div>

      {/* Options List */}
      <div className="quiz-options-grid">
        {currentQ.options.map((option, optIdx) => {
          let btnClass = 'quiz-option-btn';
          const isSelected = selectedOpt === optIdx;
          const isCorrectAnswer = optIdx === currentQ.correctIndex;

          if (revealed) {
            if (isCorrectAnswer) {
              btnClass += ' option-correct';
            } else if (isSelected && !isCorrectAnswer) {
              btnClass += ' option-wrong';
            } else {
              btnClass += ' option-dimmed';
            }
          } else if (isSelected) {
            btnClass += ' option-selected';
          }

          return (
            <button
              key={optIdx}
              type="button"
              className={btnClass}
              onClick={() => handleSelectOption(optIdx)}
              disabled={revealed}
            >
              <div className="option-letter">{optionLetters[optIdx] || optIdx + 1}</div>
              <div className="option-text">{option}</div>
              {revealed && isCorrectAnswer && (
                <CheckCircle2 size={20} className="option-feedback-icon text-success" />
              )}
              {revealed && isSelected && !isCorrectAnswer && (
                <XCircle size={20} className="option-feedback-icon text-danger" />
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation Banner */}
      {revealed && (
        <div className={`quiz-explanation-box ${selectedOpt === currentQ.correctIndex ? 'box-correct' : 'box-wrong'}`}>
          <div className="explanation-header">
            {selectedOpt === currentQ.correctIndex ? (
              <>
                <CheckCircle2 size={18} className="text-success" />
                <span className="font-semibold text-success">Correct! Well done.</span>
              </>
            ) : (
              <>
                <XCircle size={18} className="text-danger" />
                <span className="font-semibold text-danger">Incorrect.</span>
              </>
            )}
          </div>
          <p className="explanation-body">{currentQ.explanation}</p>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="quiz-footer">
        {currentIndex > 0 && (
          <button
            type="button"
            className="btn-quiz-prev"
            onClick={() => setCurrentIndex(prev => prev - 1)}
          >
            <ArrowLeft size={16} />
            <span>Previous</span>
          </button>
        )}

        <div style={{ flex: 1 }} />

        {revealed && (
          <button
            type="button"
            className="btn-primary btn-quiz-next"
            onClick={handleNext}
          >
            <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'View Results'}</span>
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
