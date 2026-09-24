import React, { useState } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Code2,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  Clock,
  ServerCrash,
  Sparkles,
} from 'lucide-react';
import type { ParseErrorType } from '../types/result';

export interface ErrorDetails {
  errorType: ParseErrorType | 'TIMEOUT' | 'SERVER_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN';
  message: string;
  details?: string[];
  rawText?: string;
  statusCode?: number;
}

interface ErrorStateProps {
  error: ErrorDetails;
  onRetry: () => void;
  onUseFallbackMock?: () => void;
  onEditPrompt?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  onUseFallbackMock,
  onEditPrompt,
}) => {
  const [showRaw, setShowRaw] = useState(false);

  const getErrorBadge = () => {
    switch (error.errorType) {
      case 'MALFORMED_JSON':
        return {
          icon: <Code2 size={24} className="text-warning" />,
          title: 'Malformed JSON Syntax',
          description: 'The AI model returned text that could not be parsed as valid JSON. This commonly happens with unescaped quotes or abrupt completions.',
        };
      case 'WRONG_SHAPE':
      case 'SCHEMA_MISMATCH':
        return {
          icon: <FileQuestion size={24} className="text-warning" />,
          title: 'Unexpected Data Structure',
          description: 'The model returned valid JSON, but the required fields (cards, quiz questions, topic) were missing or had the wrong data types.',
        };
      case 'EMPTY_RESPONSE':
        return {
          icon: <AlertTriangle size={24} className="text-danger" />,
          title: 'Empty Model Response',
          description: 'The model returned 0 bytes of content. Upstream filter or rate limit may have intercepted the request.',
        };
      case 'TIMEOUT':
        return {
          icon: <Clock size={24} className="text-warning" />,
          title: 'Request Timed Out',
          description: 'The upstream provider took longer than 25 seconds to respond. The model might be experiencing high traffic.',
        };
      case 'SERVER_ERROR':
        return {
          icon: <ServerCrash size={24} className="text-danger" />,
          title: 'Backend Proxy / Provider Error',
          description: `The backend proxy encountered an error (${error.statusCode ? `HTTP ${error.statusCode}` : 'API failed'}). Check your API credentials or provider availability.`,
        };
      default:
        return {
          icon: <AlertTriangle size={24} className="text-danger" />,
          title: 'Generation Failed',
          description: error.message || 'An unexpected error occurred while processing the AI response.',
        };
    }
  };

  const badge = getErrorBadge();

  return (
    <div className="error-card glass-card" role="alert">
      <div className="error-header">
        <div className="error-icon-box">{badge.icon}</div>
        <div className="error-title-box">
          <div className="error-type-tag">{error.errorType}</div>
          <h3 className="error-title">{badge.title}</h3>
          <p className="error-description">{badge.description}</p>
        </div>
      </div>

      {/* Validation / Diagnostic details */}
      {error.details && error.details.length > 0 && (
        <div className="error-diagnostics">
          <div className="diagnostics-label">Defensive Validation Findings:</div>
          <ul className="diagnostics-list">
            {error.details.map((detail, idx) => (
              <li key={idx} className="diagnostic-item">
                <code>{detail}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Raw output inspector */}
      {error.rawText && (
        <div className="raw-inspector-container">
          <button
            type="button"
            className="btn-toggle-raw"
            onClick={() => setShowRaw(!showRaw)}
            aria-expanded={showRaw}
          >
            <Code2 size={16} />
            <span>{showRaw ? 'Hide Raw Model Output' : 'Inspect Raw Model Output'}</span>
            {showRaw ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showRaw && (
            <div className="raw-output-box">
              <div className="raw-output-header">
                <span>Received Payload ({error.rawText.length} characters)</span>
                <button
                  type="button"
                  className="btn-copy-raw"
                  onClick={() => navigator.clipboard.writeText(error.rawText || '')}
                >
                  Copy Raw
                </button>
              </div>
              <pre className="raw-output-pre">
                <code>{error.rawText || '(Empty string)'}</code>
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="error-actions">
        <button type="button" className="btn-primary" onClick={onRetry}>
          <RotateCcw size={16} />
          <span>Retry Generation</span>
        </button>

        {onEditPrompt && (
          <button type="button" className="btn-secondary" onClick={onEditPrompt}>
            <span>Modify Input Prompt</span>
          </button>
        )}

        {onUseFallbackMock && (
          <button
            type="button"
            className="btn-secondary btn-fallback"
            onClick={onUseFallbackMock}
            title="Load an intelligent fallback deck for this topic"
          >
            <Sparkles size={16} />
            <span>Load Fallback Deck</span>
          </button>
        )}
      </div>
    </div>
  );
};
