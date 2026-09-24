import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Rotate3D,
  CheckCircle,
  HelpCircle,
  Sparkles,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import type { Flashcard, CardMastery } from '../types/result';

interface FlashcardDeckProps {
  cards: Flashcard[];
  mastery: CardMastery;
  onUpdateMastery: (cardId: string, status: 'mastered' | 'review') => void;
  onResetMastery: () => void;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({
  cards,
  mastery,
  onUpdateMastery,
  onResetMastery,
}) => {
  const [deck, setDeck] = useState<Flashcard[]>(cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterNeedsReview, setFilterNeedsReview] = useState(false);

  // Sync deck when cards prop updates
  useEffect(() => {
    setDeck(cards);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [cards]);

  const activeCards = filterNeedsReview
    ? deck.filter(c => mastery[c.id] === 'review')
    : deck;

  const currentCard = activeCards[currentIndex] || activeCards[0];

  const handleNext = useCallback(() => {
    if (activeCards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex(prev => (prev < activeCards.length - 1 ? prev + 1 : 0));
  }, [activeCards.length]);

  const handlePrev = useCallback(() => {
    if (activeCards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : activeCards.length - 1));
  }, [activeCards.length]);

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const handleShuffle = () => {
    setIsFlipped(false);
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === '1' && currentCard) {
        onUpdateMastery(currentCard.id, 'review');
        handleNext();
      } else if (e.key === '2' && currentCard) {
        onUpdateMastery(currentCard.id, 'mastered');
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, currentCard, onUpdateMastery]);

  // Compute stats
  const totalOriginal = deck.length;
  const masteredCount = deck.filter(c => mastery[c.id] === 'mastered').length;
  const reviewCount = deck.filter(c => mastery[c.id] === 'review').length;
  const masteryPercentage = totalOriginal > 0 ? Math.round((masteredCount / totalOriginal) * 100) : 0;

  // Audio speech synthesis helper for accessibility
  const handleSpeak = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!currentCard) {
    return (
      <div className="empty-filter-card glass-card">
        <Sparkles size={36} className="text-accent" />
        <h3>All filtered cards completed!</h3>
        <p>You have no cards marked as needing review.</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setFilterNeedsReview(false)}
        >
          Return to All Cards
        </button>
      </div>
    );
  }

  const currentMasteryStatus = mastery[currentCard.id] || 'unseen';

  return (
    <div className="flashcard-deck-container">
      {/* Progress & Stats Bar */}
      <div className="deck-stats-bar glass-card">
        <div className="stats-metric">
          <span className="stats-label">Mastery Progress</span>
          <span className="stats-value">{masteryPercentage}%</span>
        </div>
        <div className="mastery-progress-track">
          <div
            className="mastery-progress-fill"
            style={{ width: `${masteryPercentage}%` }}
          />
        </div>
        <div className="stats-counters">
          <span className="badge badge-mastered">
            <CheckCircle size={14} /> {masteredCount} Mastered
          </span>
          <span className="badge badge-review">
            <HelpCircle size={14} /> {reviewCount} Need Review
          </span>
          <span className="badge badge-unseen">
            {totalOriginal - masteredCount - reviewCount} Unseen
          </span>
        </div>
      </div>

      {/* Filter and Shuffle Controls */}
      <div className="deck-toolbar">
        <div className="deck-counter-badge">
          Card {currentIndex + 1} of {activeCards.length}
          {filterNeedsReview && <span className="review-only-tag">(Review Mode)</span>}
        </div>

        <div className="toolbar-actions">
          {reviewCount > 0 && (
            <button
              type="button"
              className={`btn-tool ${filterNeedsReview ? 'active' : ''}`}
              onClick={() => {
                setFilterNeedsReview(!filterNeedsReview);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
            >
              <HelpCircle size={14} />
              <span>{filterNeedsReview ? 'Show All' : `Review Weak Spots (${reviewCount})`}</span>
            </button>
          )}

          <button
            type="button"
            className="btn-tool"
            onClick={handleShuffle}
            title="Shuffle deck"
          >
            <Shuffle size={14} />
            <span>Shuffle</span>
          </button>

          <button
            type="button"
            className="btn-tool"
            onClick={onResetMastery}
            title="Reset mastery progress"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 3D Flip Card Container */}
      <div className="flashcard-scene" onClick={handleFlip}>
        <div className={`flashcard-3d ${isFlipped ? 'is-flipped' : ''}`}>
          {/* Card Front: Question */}
          <div className="flashcard-face flashcard-front">
            <div className="card-face-header">
              <span className={`diff-pill diff-${currentCard.difficulty}`}>
                {currentCard.difficulty}
              </span>
              {currentCard.category && (
                <span className="category-pill">{currentCard.category}</span>
              )}
              {currentMasteryStatus === 'mastered' && (
                <span className="card-status-badge status-mastered">
                  <CheckCircle size={14} /> Mastered
                </span>
              )}
              {currentMasteryStatus === 'review' && (
                <span className="card-status-badge status-review">
                  <HelpCircle size={14} /> Needs Review
                </span>
              )}
              <button
                type="button"
                className="btn-speak"
                onClick={(e) => handleSpeak(currentCard.question, e)}
                title="Read question aloud"
              >
                <Volume2 size={16} />
              </button>
            </div>

            <div className="card-content-center">
              <span className="question-prefix">QUESTION</span>
              <h3 className="card-question-text">{currentCard.question}</h3>
            </div>

            <div className="card-face-footer">
              <div className="flip-hint">
                <Rotate3D size={16} />
                <span>Click or press <kbd>Space</kbd> to flip answer</span>
              </div>
            </div>
          </div>

          {/* Card Back: Answer & Explanation */}
          <div className="flashcard-face flashcard-back">
            <div className="card-face-header">
              <span className="answer-prefix">ANSWER</span>
              <button
                type="button"
                className="btn-speak"
                onClick={(e) => handleSpeak(currentCard.answer + '. ' + currentCard.explanation, e)}
                title="Read answer aloud"
              >
                <Volume2 size={16} />
              </button>
            </div>

            <div className="card-content-center">
              <p className="card-answer-text">{currentCard.answer}</p>

              {currentCard.explanation && (
                <div className="card-explanation-box">
                  <div className="explanation-title">
                    <Sparkles size={14} className="text-accent" />
                    <span>Memory Cue & Insight</span>
                  </div>
                  <p className="explanation-text">{currentCard.explanation}</p>
                </div>
              )}
            </div>

            <div className="card-face-footer">
              <div className="flip-hint">
                <Rotate3D size={16} />
                <span>Click or press <kbd>Space</kbd> to flip back</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mastery Rating Buttons */}
      <div className="mastery-actions">
        <button
          type="button"
          className={`btn-mastery btn-need-review ${currentMasteryStatus === 'review' ? 'active-status' : ''}`}
          onClick={() => {
            onUpdateMastery(currentCard.id, 'review');
            handleNext();
          }}
          title="Mark as needing review (Shortcut: 1)"
        >
          <HelpCircle size={18} />
          <span>Need Review</span>
          <kbd className="key-shortcut">1</kbd>
        </button>

        <button
          type="button"
          className={`btn-mastery btn-got-it ${currentMasteryStatus === 'mastered' ? 'active-status' : ''}`}
          onClick={() => {
            onUpdateMastery(currentCard.id, 'mastered');
            handleNext();
          }}
          title="Mark as mastered (Shortcut: 2)"
        >
          <CheckCircle size={18} />
          <span>Mastered</span>
          <kbd className="key-shortcut">2</kbd>
        </button>
      </div>

      {/* Navigation Controls */}
      <div className="deck-navigation">
        <button
          type="button"
          className="btn-nav"
          onClick={handlePrev}
          title="Previous card (Arrow Left)"
        >
          <ChevronLeft size={20} />
          <span>Previous</span>
        </button>

        <button
          type="button"
          className="btn-flip-primary"
          onClick={handleFlip}
        >
          <Rotate3D size={18} />
          <span>{isFlipped ? 'View Question' : 'Reveal Answer'}</span>
        </button>

        <button
          type="button"
          className="btn-nav"
          onClick={handleNext}
          title="Next card (Arrow Right)"
        >
          <span>Next</span>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Keyboard Shortcut Legend */}
      <div className="shortcut-legend">
        <span>Shortcuts:</span>
        <span><kbd>Space</kbd> Flip</span>
        <span><kbd>←</kbd> <kbd>→</kbd> Navigate</span>
        <span><kbd>1</kbd> Needs Review</span>
        <span><kbd>2</kbd> Mastered</span>
      </div>
    </div>
  );
};
