import React, { useEffect, useState } from 'react';
import { Loader2, XCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface LoadingStateProps {
  onCancel?: () => void;
  topic?: string;
  provider?: string;
}

const STEPS = [
  'Routing request securely through backend proxy...',
  'Querying AI model for structured curriculum JSON...',
  'Validating schema and parsing unpredictable output...',
  'Constructing interactive flashcard deck and quiz widgets...',
];

export const LoadingState: React.FC<LoadingStateProps> = ({ onCancel, topic, provider }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);

    const stepInterval = setInterval(() => {
      setCurrentStepIndex(prev => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 2800);

    return () => {
      clearInterval(timer);
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <div className="loading-container glass-card" role="status" aria-live="polite">
      <div className="loading-badge">
        <Sparkles className="animate-spin text-accent" size={18} />
        <span>Generating Interactive Curriculum</span>
        {provider && <span className="provider-tag">via {provider}</span>}
      </div>

      <h3 className="loading-title">
        {topic ? `Analyzing "${topic}"` : 'Synthesizing Your Notes...'}
      </h3>
      <p className="loading-subtitle">
        We ask the model for strict JSON data and validate every field defensively before rendering.
      </p>

      {/* Progress steps */}
      <div className="steps-list">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          return (
            <div
              key={idx}
              className={`step-item ${isDone ? 'step-done' : ''} ${isCurrent ? 'step-current' : ''}`}
            >
              <div className="step-icon">
                {isDone ? (
                  <CheckCircle2 size={18} className="text-success" />
                ) : isCurrent ? (
                  <Loader2 size={18} className="animate-spin text-accent" />
                ) : (
                  <div className="step-dot" />
                )}
              </div>
              <span className="step-text">{step}</span>
            </div>
          );
        })}
      </div>

      {/* Shimmer skeleton preview */}
      <div className="skeleton-card-preview">
        <div className="skeleton skeleton-header" />
        <div className="skeleton skeleton-line skeleton-w-80" />
        <div className="skeleton skeleton-line skeleton-w-60" />
        <div className="skeleton-footer">
          <div className="skeleton skeleton-btn" />
          <div className="skeleton skeleton-btn" />
        </div>
      </div>

      {/* Footer with elapsed timer & cancel button */}
      <div className="loading-footer">
        <span className="elapsed-time">Elapsed: {elapsedSeconds}s</span>
        {onCancel && (
          <button
            type="button"
            className="btn-cancel"
            onClick={onCancel}
            title="Cancel generation"
          >
            <XCircle size={16} />
            <span>Cancel Request</span>
          </button>
        )}
      </div>
    </div>
  );
};
