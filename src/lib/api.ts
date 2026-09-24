import type { LLMProvider, SimulatedError } from '../types/result';

export interface GenerateOptions {
  prompt: string;
  refinementPrompt?: string;
  existingDeckTopic?: string;
  provider?: LLMProvider;
  simulate?: SimulatedError;
  signal?: AbortSignal;
}

export interface GenerateApiResponse {
  raw: string;
  provider: string;
  executionLog?: string[];
}

export interface BackendHealthResponse {
  status: string;
  timestamp: string;
  providers: {
    gemini: { configured: boolean; model: string };
    groq: { configured: boolean; model: string };
    openrouter: { configured: boolean; model: string };
    ollama: { available: boolean; url: string };
    mock: { available: boolean; description: string };
  };
}

export class ApiError extends Error {
  statusCode?: number;
  details?: string[];
  isTimeout?: boolean;
  isAbort?: boolean;

  constructor(message: string, options?: { statusCode?: number; details?: string[]; isTimeout?: boolean; isAbort?: boolean }) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = options?.statusCode;
    this.details = options?.details;
    this.isTimeout = options?.isTimeout;
    this.isAbort = options?.isAbort;
  }
}

/**
 * Calls backend proxy /api/generate with timeout & abort signal support.
 * Frontend NEVER touches LLM API keys directly.
 */
export async function callBackendGenerate(options: GenerateOptions): Promise<GenerateApiResponse> {
  const { prompt, refinementPrompt, existingDeckTopic, provider = 'auto', simulate = 'none', signal } = options;

  // Use timeout signal (25s) combined with optional caller abort signal
  const timeoutMs = 25000;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort(new Error('REQUEST_TIMEOUT'));
  }, timeoutMs);

  // Link signals
  const combinedHandler = () => timeoutController.abort();
  if (signal) {
    signal.addEventListener('abort', combinedHandler);
  }

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        refinementPrompt,
        existingDeckTopic,
        provider,
        simulate,
      }),
      signal: timeoutController.signal,
    });

    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', combinedHandler);

    if (!response.ok) {
      let errorBody: any = null;
      try {
        errorBody = await response.json();
      } catch {
        const text = await response.text().catch(() => '');
        errorBody = { error: text || response.statusText };
      }

      throw new ApiError(errorBody?.error || `Server responded with HTTP ${response.status}`, {
        statusCode: response.status,
        details: Array.isArray(errorBody?.details) ? errorBody.details : undefined,
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      // Handle simulate wrong shape or malformed JSON
      if (typeof json.raw === 'string') {
        return {
          raw: json.raw,
          provider: json.provider || 'server',
          executionLog: json.executionLog,
        };
      } else {
        // If the backend sent back raw object or simulated wrong shape
        return {
          raw: JSON.stringify(json),
          provider: 'server-simulated',
        };
      }
    } else {
      const text = await response.text();
      return {
        raw: text,
        provider: 'raw-response',
      };
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', combinedHandler);

    if (error?.name === 'AbortError' || error?.message === 'REQUEST_TIMEOUT') {
      const isUserAbort = signal?.aborted;
      throw new ApiError(
        isUserAbort ? 'Generation was cancelled by the user.' : 'Request timed out after 25 seconds. The AI model or server is taking too long to respond.',
        {
          isTimeout: !isUserAbort,
          isAbort: isUserAbort,
        }
      );
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(error?.message || 'Failed to connect to backend proxy. Make sure the server is running on port 3001.', {
      statusCode: 0,
    });
  }
}

/**
 * Checks backend health and detected provider keys
 */
export async function fetchBackendHealth(): Promise<BackendHealthResponse | null> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
