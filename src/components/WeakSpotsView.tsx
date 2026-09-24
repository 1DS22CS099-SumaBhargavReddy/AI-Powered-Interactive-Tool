import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import type { Flashcard, QuizQuestion, CardMastery, QuizProgress } from '../types/result';

interface WeakSpotsViewProps {
  cards: Flashcard[];
  quiz: QuizQuestion[];
  mastery: CardMastery;
  quizProgress: QuizProgress;
  onSwitchToFlashcards: () => void;
  onSwitchToQuiz: () => void;
  onRefineWeakSpots: (prompt: string) => void;
}

export const WeakSpotsView: React.FC<WeakSpotsViewProps> = ({
  cards,
  quiz,
  mastery,
  quizProgress,
  onSwitchToFlashcards,
  onSwitchToQuiz,
  onRefineWeakSpots,
}) => {
  const reviewCards = cards.filter(c => mastery[c.id] === 'review');
  const wrongQuiz = quiz.filter(q => quizProgress[q.id] && !quizProgress[q.id].isCorrect);

  const hasWeakSpots = reviewCards.length > 0 || wrongQuiz.length > 0;

  if (!hasWeakSpots) {
    return (
      <div className="empty-weakspots-card glass-card">
        <CheckCircle2 size={48} className="text-success" />
        <h3 className="empty-title">Zero Weak Spots Detected!</h3>
        <p className="empty-description">
          You haven't flagged any flashcards for review or missed any quiz questions yet.
          Take the quiz or flip through your cards to identify areas to improve.
        </p>
        <div className="empty-actions">
          <button type="button" className="btn-primary" onClick={onSwitchToFlashcards}>
            <BookOpen size={16} />
            <span>Practice Flashcards</span>
          </button>
          <button type="button" className="btn-secondary" onClick={onSwitchToQuiz}>
            <HelpCircle size={16} />
            <span>Take Knowledge Quiz</span>
          </button>
        </div>
      </div>
    );
  }

  const handleAiReinforce = () => {
    const cardTopics = reviewCards.map(c => c.question).join('; ');
    const quizTopics = wrongQuiz.map(q => q.question).join('; ');
    const refinement = `Please generate targeted reinforcement cards and clarifying examples specifically focusing on these concepts I struggled with: ${cardTopics || ''} ${quizTopics || ''}. Explain them step-by-step with analogies.`;
    onRefineWeakSpots(refinement);
  };

  return (
    <div className="weakspots-container glass-card">
      <div className="weakspots-header">
        <div className="weakspots-title-group">
          <AlertTriangle size={24} className="text-warning" />
          <div>
            <h3 className="weakspots-title">Targeted Mastery Cockpit</h3>
            <p className="weakspots-subtitle">
              Focus specifically on your gaps. Practice these items repeatedly until you achieve 100% recall.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn-ai-reinforce"
          onClick={handleAiReinforce}
          title="Ask AI to generate simplified explanations for these specific weak spots"
        >
          <Sparkles size={16} className="text-accent" />
          <span>Ask AI to Reinforce Weak Spots</span>
        </button>
      </div>

      <div className="weakspots-grid">
        {/* Review Cards Column */}
        <div className="weakspots-column">
          <div className="column-header">
            <HelpCircle size={18} className="text-warning" />
            <h4>Flashcards Needing Review ({reviewCards.length})</h4>
          </div>

          {reviewCards.length === 0 ? (
            <div className="column-empty">All flashcards are currently mastered!</div>
          ) : (
            <div className="weak-items-list">
              {reviewCards.map(card => (
                <div key={card.id} className="weak-item-card">
                  <div className="weak-item-top">
                    <span className="diff-pill diff-small">{card.difficulty}</span>
                    {card.category && <span className="category-pill">{card.category}</span>}
                  </div>
                  <div className="weak-item-q">{card.question}</div>
                  <div className="weak-item-a">
                    <strong>Answer:</strong> {card.answer}
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary btn-full"
                onClick={onSwitchToFlashcards}
              >
                Practice These in Flashcard Mode
              </button>
            </div>
          )}
        </div>

        {/* Incorrect Quiz Questions Column */}
        <div className="weakspots-column">
          <div className="column-header">
            <AlertTriangle size={18} className="text-danger" />
            <h4>Missed Quiz Questions ({wrongQuiz.length})</h4>
          </div>

          {wrongQuiz.length === 0 ? (
            <div className="column-empty">No quiz mistakes recorded yet!</div>
          ) : (
            <div className="weak-items-list">
              {wrongQuiz.map(q => {
                const answer = quizProgress[q.id];
                return (
                  <div key={q.id} className="weak-item-card">
                    <div className="weak-item-q">{q.question}</div>
                    <div className="weak-item-choice-wrong">
                      Your answer:{' '}
                      <span className="text-danger">
                        {answer ? q.options[answer.selectedIndex] : 'Not answered'}
                      </span>
                    </div>
                    <div className="weak-item-choice-correct">
                      Correct answer:{' '}
                      <span className="text-success font-medium">
                        {q.options[q.correctIndex]}
                      </span>
                    </div>
                    <div className="weak-item-explanation">
                      💡 {q.explanation}
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                className="btn-secondary btn-full"
                onClick={onSwitchToQuiz}
              >
                Re-test Quiz Questions
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
