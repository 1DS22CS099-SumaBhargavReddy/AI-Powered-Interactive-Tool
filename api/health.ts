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

  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const groqConfigured = Boolean(process.env.GROQ_API_KEY);
  const openRouterConfigured = Boolean(process.env.OPENROUTER_API_KEY);

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    providers: {
      gemini: { configured: geminiConfigured, model: 'gemini-1.5-flash' },
      groq: { configured: groqConfigured, model: 'llama-3.3-70b-versatile' },
      openrouter: { configured: openRouterConfigured, model: 'meta-llama/llama-3.1-8b-instruct:free' },
      ollama: { available: false, url: process.env.OLLAMA_BASE_URL || 'http://localhost:11434' },
      mock: { available: true, description: 'Offline Intelligent Mock Generator' },
    },
  });
}
