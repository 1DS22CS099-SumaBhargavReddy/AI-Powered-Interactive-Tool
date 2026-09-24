const SYSTEM_PROMPT = `You are a curriculum and study tool engine. Return ONLY valid JSON matching the exact schema below.
DO NOT include any commentary, prose, markdown notes, or introductory text.
Return RAW JSON only.

Schema:
{
  "topic": "string (name of subject)",
  "summary": "string (concise 1-2 sentence overview)",
  "keyTakeaways": ["string (takeaway 1)", "string (takeaway 2)", "string (takeaway 3)"],
  "cards": [
    {
      "id": "c1",
      "question": "string (clear, direct study question)",
      "answer": "string (concise accurate answer)",
      "explanation": "string (additional context or memory cue)",
      "category": "string (e.g. Concept, Syntax, Gotcha, Architecture)",
      "difficulty": "beginner" | "intermediate" | "advanced"
    }
  ],
  "quiz": [
    {
      "id": "q1",
      "question": "string (multiple choice question)",
      "options": ["string (option A)", "string (option B)", "string (option C)", "string (option D)"],
      "correctIndex": 0,
      "explanation": "string (why this answer is correct)"
    }
  ]
}

Ensure you generate between 5 to 8 flashcards and between 3 to 5 quiz questions.`;

function generateMockDeck(prompt: string, _refinement?: string): string {
  const cleanPrompt = prompt.slice(0, 80).replace(/["\n\r]/g, ' ').trim() || 'General Knowledge';
  const topicTitle = cleanPrompt.charAt(0).toUpperCase() + cleanPrompt.slice(1);

  return JSON.stringify(
    {
      topic: topicTitle,
      summary: `Structured flashcards and comprehensive quiz designed to master ${topicTitle}.`,
      keyTakeaways: [
        `Grasp core fundamentals and terminology for ${topicTitle}`,
        `Identify common anti-patterns, edge cases, and best practices`,
        `Practice interactive active-recall testing to solidify memory`,
      ],
      cards: [
        {
          id: `card-mock-1`,
          question: `What is the primary objective of studying ${topicTitle}?`,
          answer: `To build deep conceptual understanding, recognize trade-offs, and apply principles in practical scenarios.`,
          explanation: `Foundational mastery allows you to troubleshoot issues intuitively and explain core concepts clearly.`,
          category: 'Foundations',
          difficulty: 'beginner',
        },
        {
          id: `card-mock-2`,
          question: `What is a common pitfall or misconception regarding ${topicTitle}?`,
          answer: `Overlooking lifecycle edge cases, failing to validate state transitions, or treating symptoms rather than root causes.`,
          explanation: `Defensive design and predictable state flows eliminate the vast majority of real-world bugs.`,
          category: 'Gotchas',
          difficulty: 'intermediate',
        },
        {
          id: `card-mock-3`,
          question: `How does predictable structured data improve reliability in systems handling ${topicTitle}?`,
          answer: `It decouples raw input from rendering, allows deterministic validation, and shields the UI from corrupt or unexpected payloads.`,
          explanation: `In frontend architecture, passing unvalidated data directly to views causes unhandled runtime exceptions.`,
          category: 'Architecture',
          difficulty: 'intermediate',
        },
        {
          id: `card-mock-4`,
          question: `What performance optimization technique is most relevant to ${topicTitle}?`,
          answer: `Minimizing redundant computations, memoizing expensive derivations, and debouncing rapid state triggers.`,
          explanation: `Profiling before optimizing prevents premature complexity while ensuring a responsive 60fps interface.`,
          category: 'Performance',
          difficulty: 'advanced',
        },
        {
          id: `card-mock-5`,
          question: `What strategy is best for long-term retention of ${topicTitle}?`,
          answer: `Spaced repetition, re-testing weak spots, and synthesizing concepts into self-contained flashcards.`,
          explanation: `Active recall triggers neural pathways more effectively than passive re-reading.`,
          category: 'Best Practices',
          difficulty: 'beginner',
        },
      ],
      quiz: [
        {
          id: 'quiz-mock-1',
          question: `Which approach is safest when dealing with unpredictable external payloads in ${topicTitle}?`,
          options: [
            'Pass the raw payload directly to components to save memory',
            'Rigorously validate against a strict schema and route malformed payloads to an error state',
            'Suppress all errors using empty catch blocks',
            'Only validate in production environments',
          ],
          correctIndex: 1,
          explanation:
            'Defensive validation ensures bad or altered data never reaches rendering code, preventing silent crashes.',
        },
        {
          id: 'quiz-mock-2',
          question: `Why is an asynchronous request ID guard recommended when fetching dynamic data?`,
          options: [
            'It makes network requests 2x faster',
            'It forces the browser to compress payload headers',
            'It prevents older, slower responses from overwriting newer user requests',
            'It encrypts API credentials in local storage',
          ],
          correctIndex: 2,
          explanation:
            'Without request ID guards or abort controllers, out-of-order responses can silently overwrite newer user selections.',
        },
        {
          id: 'quiz-mock-3',
          question: `What distinguishes an interactive AI tool from a simple chatbot?`,
          options: [
            'Interactive tools parse structured data into dedicated stateful UI widgets rather than printing freeform chat bubbles',
            'Interactive tools can only be written in Python',
            'Chatbots cannot use LLMs',
            'Interactive tools never use network calls',
          ],
          correctIndex: 0,
          explanation:
            'Structured data enables rich interactions like flip cards, quiz scoring, mastery tracking, and filtering.',
        },
      ],
    },
    null,
    2
  );
}

async function callGemini(fullPrompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const json: any = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned an empty candidate.');
  return text;
}

async function callGroq(fullPrompt: string, apiKey: string): Promise<string> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: fullPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const json: any = await response.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq returned empty completion message.');
  return text;
}

async function callOpenRouter(fullPrompt: string, apiKey: string): Promise<string> {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://ai-powered-interactive-tool.vercel.app',
      'X-Title': 'Flam AI Study Assistant',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: fullPrompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  const json: any = await response.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenRouter returned empty message.');
  return text;
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const { prompt, refinementPrompt, existingDeckTopic, provider = 'auto', simulate = 'none' } = body;

  // Failure simulation triggers (for evaluator testing)
  if (simulate === 'malformed_json') {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send('{"topic": "Simulated Malformed JSON", "cards": [{"question": "Is this broken?", "answer":');
    return;
  }

  if (simulate === 'wrong_shape') {
    res.status(200).json({
      unrelatedField: 'This is valid JSON but has the wrong shape entirely',
      statusCode: 200,
      timestamp: 123456,
      weather: 'Cloudy',
    });
    return;
  }

  if (simulate === 'empty') {
    res.status(200).send('');
    return;
  }

  if (simulate === 'timeout') {
    setTimeout(() => {
      res.status(200).json({ delayed: true });
    }, 35000);
    return;
  }

  if (simulate === 'server_error') {
    res.status(500).json({
      error: 'Simulated 500 Internal Server Error from upstream LLM provider.',
      code: 'SIMULATED_SERVER_FAILURE',
    });
    return;
  }

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    res.status(400).json({ error: 'Prompt must be a non-empty string.' });
    return;
  }

  let userQuery = prompt.trim();
  if (refinementPrompt && refinementPrompt.trim()) {
    userQuery = `Existing Topic: "${existingDeckTopic || 'Current Session'}"
Follow-up Refinement Request: "${refinementPrompt.trim()}"
Original Prompt Context: "${prompt.trim()}"
Please update, expand, or adjust the flashcards and quiz according to the refinement request while preserving the exact JSON schema.`;
  }

  const fullPrompt = `${SYSTEM_PROMPT}\n\nUser Input:\n${userQuery}`;

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  const providerChain: Array<{ name: string; exec: () => Promise<string> }> = [];

  if (provider === 'gemini') {
    if (!geminiKey) {
      res.status(400).json({ error: 'GEMINI_API_KEY is not configured in environment variables' });
      return;
    }
    providerChain.push({ name: 'gemini', exec: () => callGemini(fullPrompt, geminiKey) });
  } else if (provider === 'groq') {
    if (!groqKey) {
      res.status(400).json({ error: 'GROQ_API_KEY is not configured in environment variables' });
      return;
    }
    providerChain.push({ name: 'groq', exec: () => callGroq(fullPrompt, groqKey) });
  } else if (provider === 'openrouter') {
    if (!openRouterKey) {
      res.status(400).json({ error: 'OPENROUTER_API_KEY is not configured in environment variables' });
      return;
    }
    providerChain.push({ name: 'openrouter', exec: () => callOpenRouter(fullPrompt, openRouterKey) });
  } else if (provider === 'mock') {
    providerChain.push({ name: 'mock', exec: async () => generateMockDeck(prompt, refinementPrompt) });
  } else {
    // AUTO Fallback cascade
    if (geminiKey) {
      providerChain.push({ name: 'gemini', exec: () => callGemini(fullPrompt, geminiKey) });
    }
    if (groqKey) {
      providerChain.push({ name: 'groq', exec: () => callGroq(fullPrompt, groqKey) });
    }
    if (openRouterKey) {
      providerChain.push({ name: 'openrouter', exec: () => callOpenRouter(fullPrompt, openRouterKey) });
    }
    // Final foolproof fallback: Mock Generator
    providerChain.push({ name: 'mock-fallback', exec: async () => generateMockDeck(prompt, refinementPrompt) });
  }

  const executionLog: string[] = [];
  let successfulText: string | null = null;
  let activeProvider = 'unknown';

  for (const item of providerChain) {
    try {
      successfulText = await item.exec();
      activeProvider = item.name;
      executionLog.push(`[${item.name}] SUCCESS`);
      break;
    } catch (err: any) {
      executionLog.push(`[${item.name}] FAILED: ${err?.message || String(err)}`);
    }
  }

  if (!successfulText) {
    res.status(502).json({
      error: 'All LLM providers and fallbacks failed to respond.',
      details: executionLog,
    });
    return;
  }

  res.status(200).json({
    raw: successfulText,
    provider: activeProvider,
    executionLog,
  });
}
