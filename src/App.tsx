import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Brain,
  Moon,
  Sun,
  History,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { PromptInput } from './components/PromptInput';
import { ResultView } from './components/ResultView';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import type { ErrorDetails } from './components/ErrorState';
import type {
  StudyDeck,
  LLMProvider,
  SimulatedError,
} from './types/result';
import { validateResult } from './lib/validateResult';
import {
  callBackendGenerate,
  fetchBackendHealth,
  ApiError,
} from './lib/api';
import type { BackendHealthResponse } from './lib/api';

interface SavedSession {
  id: string;
  topic: string;
  savedAt: string;
  cardsCount: number;
  deck: StudyDeck;
}

export const App: React.FC = () => {
  // Theme state: dark / light
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('flam_theme') as 'dark' | 'light') || 'dark';
  });

  // Main state machine
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [deck, setDeck] = useState<StudyDeck | null>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [providerUsed, setProviderUsed] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);

  // Provider and simulated failure modes
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('auto');
  const [selectedSimulation, setSelectedSimulation] = useState<SimulatedError>('none');

  // Backend diagnostics health
  const [backendHealth, setBackendHealth] = useState<BackendHealthResponse | null>(null);

  // Saved sessions drawer
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>(() => {
    try {
      const stored = localStorage.getItem('flam_saved_sessions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // 1. Guard against stale responses & 2. AbortController for in-flight cancellation
  const requestId = useRef<number>(0);
  const activeAbortController = useRef<AbortController | null>(null);

  // Persist theme to document attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('flam_theme', theme);
  }, [theme]);

  // Check backend health on mount
  useEffect(() => {
    fetchBackendHealth().then(data => {
      if (data) setBackendHealth(data);
    });
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  /**
   * Main generation handler.
   * Cancels prior in-flight requests, guards against race conditions,
   * sends input to proxy, and defensively validates structured JSON before rendering.
   */
  const handleGenerate = useCallback(
    async (
      promptText: string,
      provider: LLMProvider = selectedProvider,
      simulate: SimulatedError = selectedSimulation
    ) => {
      // 1. Guard against stale responses: increment request counter
      const currentId = ++requestId.current;

      // 2. Abort any previous pending request
      if (activeAbortController.current) {
        activeAbortController.current.abort();
      }
      const controller = new AbortController();
      activeAbortController.current = controller;

      setCurrentPrompt(promptText);
      setStatus('loading');
      setErrorDetails(null);

      try {
        const response = await callBackendGenerate({
          prompt: promptText,
          provider,
          simulate,
          signal: controller.signal,
        });

        // 3. Stale Response Guard: if another request started in the meantime, discard this one
        if (currentId !== requestId.current) {
          console.warn(`[StaleGuard] Discarded response from request #${currentId} because active request is #${requestId.current}`);
          return;
        }

        // 4. Defensive parsing: inspect and validate shape before anything touches UI
        const validation = validateResult(response.raw);

        if (!validation.success) {
          // Route directly to error state with diagnostic reasons
          setErrorDetails({
            errorType: validation.errorType,
            message: validation.message,
            details: validation.validationDetails,
            rawText: validation.rawText,
          });
          setStatus('error');
          return;
        }

        // 5. Validated successful structured data
        setDeck(validation.data);
        setProviderUsed(response.provider);
        setStatus('success');
      } catch (err: any) {
        // If aborted by a newer request, do nothing
        if (currentId !== requestId.current) return;

        if (err instanceof ApiError && err.isAbort) {
          // User deliberately cancelled
          setStatus(deck ? 'success' : 'idle');
          return;
        }

        const isTimeout = err instanceof ApiError && err.isTimeout;
        const statusCode = err instanceof ApiError ? err.statusCode : undefined;

        setErrorDetails({
          errorType: isTimeout ? 'TIMEOUT' : statusCode && statusCode >= 500 ? 'SERVER_ERROR' : 'NETWORK_ERROR',
          message: err?.message || 'Failed to fetch or process response from backend proxy.',
          details: err?.details || [err?.message || 'Network communication error'],
          statusCode,
        });
        setStatus('error');
      } finally {
        if (currentId === requestId.current) {
          activeAbortController.current = null;
        }
      }
    },
    [selectedProvider, selectedSimulation, deck]
  );

  /**
   * Refinement loop handler: sends follow-up prompts to edit or augment
   * the current deck without losing state.
   */
  const handleRefine = async (refinementPrompt: string) => {
    if (!deck) return;
    setIsRefining(true);

    try {
      const response = await callBackendGenerate({
        prompt: currentPrompt,
        refinementPrompt,
        existingDeckTopic: deck.topic,
        provider: selectedProvider,
      });

      const validation = validateResult(response.raw);
      if (validation.success) {
        setDeck(validation.data);
      } else {
        alert(`Refinement failed schema validation: ${validation.message}`);
      }
    } catch (err: any) {
      alert(`Refinement failed: ${err?.message || 'Network error'}`);
    } finally {
      setIsRefining(false);
    }
  };

  /**
   * Fallback mock handler: loads realistic study deck immediately
   */
  const handleUseFallbackMock = () => {
    handleGenerate(currentPrompt || 'React Modern Architecture & State', 'mock', 'none');
  };

  /**
   * Cancel in-flight request
   */
  const handleCancel = () => {
    if (activeAbortController.current) {
      activeAbortController.current.abort();
      activeAbortController.current = null;
    }
    setStatus(deck ? 'success' : 'idle');
  };

  /**
   * Save session to LocalStorage
   */
  const handleSaveSession = () => {
    if (!deck) return;
    const newSession: SavedSession = {
      id: `session-${Date.now()}`,
      topic: deck.topic,
      savedAt: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      cardsCount: deck.cards.length,
      deck,
    };

    const updated = [newSession, ...savedSessions.filter(s => s.topic !== deck.topic)];
    setSavedSessions(updated);
    localStorage.setItem('flam_saved_sessions', JSON.stringify(updated));
  };

  /**
   * Load saved session
   */
  const handleLoadSession = (loadedDeck: StudyDeck) => {
    setDeck(loadedDeck);
    setStatus('success');
    setShowHistoryDrawer(false);
  };

  /**
   * Delete saved session
   */
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedSessions.filter(s => s.id !== id);
    setSavedSessions(updated);
    localStorage.setItem('flam_saved_sessions', JSON.stringify(updated));
  };

  const isCurrentDeckSaved = Boolean(deck && savedSessions.some(s => s.topic === deck.topic));

  return (
    <div className="app-layout">
      {/* Top Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-group">
            <div className="brand-icon-wrapper">
              <Brain className="brand-icon" size={24} />
            </div>
            <div>
              <div className="brand-title-row">
                <span className="brand-title">NeuroDeck AI</span>
                <span className="brand-tag">Structured Study Tool</span>
              </div>
              <span className="brand-subtitle">Flam Frontend Internship Assignment</span>
            </div>
          </div>

          <div className="header-actions">
            {/* Backend health status indicator */}
            <div
              className="health-pill"
              title={
                backendHealth
                  ? `Proxy Active. Configured: ${Object.entries(backendHealth.providers)
                      .filter(([_, v]) => (v as any).configured || (v as any).available)
                      .map(([k]) => k)
                      .join(', ')}`
                  : 'Checking backend proxy...'
              }
            >
              <ShieldCheck size={14} className="text-success" />
              <span>{backendHealth ? 'Proxy Active' : 'Connecting to Proxy...'}</span>
            </div>

            {/* Saved Decks Drawer Button */}
            <button
              type="button"
              className="btn-icon-header"
              onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
              title="Saved Study Decks"
              aria-expanded={showHistoryDrawer}
            >
              <History size={18} />
              {savedSessions.length > 0 && (
                <span className="header-badge">{savedSessions.length}</span>
              )}
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              className="btn-icon-header"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Saved Sessions Drawer */}
      {showHistoryDrawer && (
        <div className="history-drawer glass-card">
          <div className="history-drawer-header">
            <h4>Saved Study Sessions ({savedSessions.length})</h4>
            <button
              type="button"
              className="btn-close-drawer"
              onClick={() => setShowHistoryDrawer(false)}
            >
              ✕
            </button>
          </div>

          {savedSessions.length === 0 ? (
            <div className="history-empty">
              <span>No saved sessions yet. Generate a deck and click "Save Session".</span>
            </div>
          ) : (
            <div className="history-list">
              {savedSessions.map(session => (
                <div
                  key={session.id}
                  className="history-item"
                  onClick={() => handleLoadSession(session.deck)}
                >
                  <div className="history-item-info">
                    <span className="history-topic">{session.topic}</span>
                    <span className="history-meta">
                      {session.cardsCount} cards • {session.savedAt}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-delete-session"
                    onClick={e => handleDeleteSession(session.id, e)}
                    title="Delete session"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {/* Free-form text input card */}
        <PromptInput
          onSubmit={handleGenerate}
          isLoading={status === 'loading'}
          selectedProvider={selectedProvider}
          setSelectedProvider={setSelectedProvider}
          selectedSimulation={selectedSimulation}
          setSelectedSimulation={setSelectedSimulation}
        />

        {/* View Routing based on current status */}
        {status === 'loading' && (
          <LoadingState
            onCancel={handleCancel}
            topic={currentPrompt.slice(0, 50)}
            provider={selectedProvider}
          />
        )}

        {status === 'error' && errorDetails && (
          <ErrorState
            error={errorDetails}
            onRetry={() => handleGenerate(currentPrompt, selectedProvider, selectedSimulation)}
            onUseFallbackMock={handleUseFallbackMock}
            onEditPrompt={() => {
              const el = document.getElementById('prompt-textarea');
              el?.focus();
            }}
          />
        )}

        {status === 'success' && deck && (
          <ResultView
            deck={deck}
            providerUsed={providerUsed}
            onRefine={handleRefine}
            isRefining={isRefining}
            onSaveSession={handleSaveSession}
            isSessionSaved={isCurrentDeckSaved}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <span>Flam Frontend Internship Assignment • AI Interactive Tool</span>
          <span className="footer-divider">•</span>
          <span>Zero raw chatbot prose • 100% defensive JSON schema validation</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
