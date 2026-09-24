import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  Settings2,
  Bug,
  Server,
  Zap,
} from 'lucide-react';
import type { LLMProvider, SimulatedError } from '../types/result';

interface PromptInputProps {
  onSubmit: (prompt: string, provider: LLMProvider, simulate: SimulatedError) => void;
  isLoading: boolean;
  selectedProvider: LLMProvider;
  setSelectedProvider: (provider: LLMProvider) => void;
  selectedSimulation: SimulatedError;
  setSelectedSimulation: (sim: SimulatedError) => void;
}

const PRESET_TOPICS = [
  {
    label: '⚛️ React Hooks & Internals',
    prompt:
      'React Hooks architecture: useState, useEffect lifecycle vs class components, useMemo vs useCallback, stale closures, dependency array rules, and custom hooks best practices.',
  },
  {
    label: '🧠 OS: Concurrency & Deadlocks',
    prompt:
      'Operating systems concurrency: race conditions, mutex vs semaphore, deadlock conditions (mutual exclusion, hold and wait, no preemption, circular wait), and critical section problem.',
  },
  {
    label: '⚡ Web Performance & Core Web Vitals',
    prompt:
      'Core Web Vitals and frontend performance optimization: LCP (Largest Contentful Paint), INP (Interaction to Next Paint), CLS (Cumulative Layout Shift), code splitting, lazy loading, and CDN caching.',
  },
  {
    label: '🗄️ Database Indexing & B-Trees',
    prompt:
      'Database indexing strategies: B-Tree vs Hash index, clustered vs non-clustered indexes, composite indexing leftmost prefix rule, query execution plans, and write amplification trade-offs.',
  },
];

export const PromptInput: React.FC<PromptInputProps> = ({
  onSubmit,
  isLoading,
  selectedProvider,
  setSelectedProvider,
  selectedSimulation,
  setSelectedSimulation,
}) => {
  const [input, setInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSubmit(input.trim(), selectedProvider, selectedSimulation);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const applyPreset = (presetPrompt: string) => {
    setInput(presetPrompt);
  };

  return (
    <div className="prompt-input-card glass-card">
      <div className="prompt-card-header">
        <div className="prompt-card-title-group">
          <div className="icon-badge">
            <Sparkles size={20} className="text-accent" />
          </div>
          <div>
            <h2 className="prompt-card-title">Study Assistant Generator</h2>
            <p className="prompt-card-subtitle">
              Paste raw notes, syllabus topics, or concepts. The AI returns a structured, interactive study tool.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={`btn-settings-toggle ${showAdvanced ? 'active' : ''}`}
          onClick={() => setShowAdvanced(!showAdvanced)}
          title="Configure Provider & Failure Simulation"
          aria-expanded={showAdvanced}
        >
          <Settings2 size={16} />
          <span>Interviewer Controls</span>
        </button>
      </div>

      {/* Advanced Drawer: Provider & Failure Mode Simulation */}
      {showAdvanced && (
        <div className="advanced-drawer">
          <div className="drawer-grid">
            <div className="drawer-control">
              <label className="drawer-label" htmlFor="provider-select">
                <Server size={14} />
                <span>AI Provider Engine:</span>
              </label>
              <select
                id="provider-select"
                className="select-control"
                value={selectedProvider}
                onChange={e => setSelectedProvider(e.target.value as LLMProvider)}
              >
                <option value="auto">⚡ Auto Fallback Cascade (Recommended)</option>
                <option value="gemini">Google Gemini 1.5 Flash</option>
                <option value="groq">Groq Cloud (Llama 3.3 70B)</option>
                <option value="openrouter">OpenRouter API</option>
                <option value="ollama">Local Ollama (Llama 3)</option>
                <option value="mock">Offline Mock Deck (Zero API Keys Required)</option>
              </select>
            </div>

            <div className="drawer-control">
              <label className="drawer-label text-warning" htmlFor="simulation-select">
                <Bug size={14} />
                <span>Simulate Failure Mode (For Evaluator Testing):</span>
              </label>
              <select
                id="simulation-select"
                className="select-control select-simulation"
                value={selectedSimulation}
                onChange={e => setSelectedSimulation(e.target.value as SimulatedError)}
              >
                <option value="none">Normal Response (No Simulation)</option>
                <option value="malformed_json">⚠️ Malformed JSON Syntax</option>
                <option value="wrong_shape">⚠️ Wrong Shape (Missing Cards/Fields)</option>
                <option value="empty">⚠️ Empty Response (0 bytes)</option>
                <option value="timeout">⚠️ Slow / Hanging Request (Timeout)</option>
                <option value="server_error">⚠️ HTTP 500 Upstream Error</option>
              </select>
            </div>
          </div>
          {selectedSimulation !== 'none' && (
            <div className="simulation-alert">
              Active test mode: <strong>{selectedSimulation}</strong> will be simulated on your next submit to verify error resilience!
            </div>
          )}
        </div>
      )}

      {/* Form with textarea */}
      <form onSubmit={handleSubmit} className="prompt-form">
        <div className="textarea-wrapper">
          <textarea
            id="prompt-textarea"
            className="prompt-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste your lecture notes, textbook excerpt, interview topic, or syllabus here... (e.g., 'Explain React concurrency and fiber reconciler...')"
            rows={4}
            disabled={isLoading}
            required
          />
          <div className="textarea-footer">
            <span className="char-count">
              {input.length} characters {input.trim() ? `• ~${input.trim().split(/\s+/).length} words` : ''}
            </span>
            {input && (
              <button
                type="button"
                className="btn-clear"
                onClick={() => setInput('')}
                title="Clear input"
                disabled={isLoading}
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Preset Topic Pills */}
        <div className="preset-container">
          <span className="preset-label">
            <Zap size={14} />
            <span>Try sample topic:</span>
          </span>
          <div className="preset-pills">
            {PRESET_TOPICS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                className="preset-pill"
                onClick={() => applyPreset(preset.prompt)}
                disabled={isLoading}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit row */}
        <div className="form-submit-row">
          <div className="shortcut-hint">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to generate
          </div>
          <button
            type="submit"
            className="btn-generate"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <>
                <span className="spinner-dots" />
                <span>Generating Deck...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Generate Study Deck</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
