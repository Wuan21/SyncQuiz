const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const DEFAULT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
];

function getModelCandidates() {
  const preferred = (process.env.GEMINI_MODEL || '').trim();
  return preferred ? [preferred, ...DEFAULT_MODELS.filter((m) => m !== preferred)] : DEFAULT_MODELS;
}

function isModelNotFoundError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return err?.status === 404 || msg.includes('model') && msg.includes('not found');
}

async function generateWithFallback(prompt) {
  const candidates = getModelCandidates();
  let lastErr;

  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return { result, modelName };
    } catch (err) {
      if (isModelNotFoundError(err)) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  throw lastErr || new Error('No compatible Gemini model available');
}

/**
 * Generate quiz questions using Google Gemini
 * POST /api/quizzes/ai-generate
 * Body: { topic, count, difficulty, language }
 */
exports.generateQuiz = async (req, res, next) => {
  try {
    const {
      topic,
      count = 5,
      difficulty = 'medium',
      language = 'Vietnamese',
      type = 'multiple_choice',
    } = req.body;

    if (!topic?.trim()) return res.status(400).json({ message: 'Topic is required' });
    if (count > 20) return res.status(400).json({ message: 'Max 20 questions per generation' });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ message: 'AI service not configured. Add GEMINI_API_KEY to .env' });
    }

    const prompt = `
You are a quiz creator. Generate exactly ${count} ${difficulty} difficulty quiz questions about "${topic}".
Language: ${language}.
Question type: multiple choice with 4 options, exactly 1 correct answer.

Return ONLY a valid JSON array (no markdown, no explanation) in this exact format:
[
  {
    "content": "Question text here?",
    "options": [
      { "text": "Option A", "isCorrect": false },
      { "text": "Option B", "isCorrect": true },
      { "text": "Option C", "isCorrect": false },
      { "text": "Option D", "isCorrect": false }
    ],
    "explanation": "Brief explanation of correct answer",
    "timeLimit": 30,
    "points": 1000
  }
]

Rules:
- Exactly 1 option must have "isCorrect": true per question
- Questions must be clear and unambiguous
- Shuffle the correct answer position randomly (don't always put it second)
- For ${difficulty} difficulty: ${difficulty === 'easy' ? 'basic facts' : difficulty === 'medium' ? 'requires some knowledge' : 'challenging, requires deep understanding'}
`;

  const { result, modelName } = await generateWithFallback(prompt);
    const text = result.response.text().trim();

    // Strip markdown code blocks if present
    const jsonText = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();

    let questions;
    try {
      questions = JSON.parse(jsonText);
    } catch {
      return res.status(422).json({ message: 'AI returned invalid format. Try again.' });
    }

    if (!Array.isArray(questions)) {
      return res.status(422).json({ message: 'AI returned unexpected data. Try again.' });
    }

    // Sanitize output
    const sanitized = questions.slice(0, count).map((q, i) => ({
      type: 'multiple_choice',
      content: String(q.content || '').trim(),
      options: (q.options || []).slice(0, 4).map((o) => ({
        text: String(o.text || '').trim(),
        isCorrect: Boolean(o.isCorrect),
        imageUrl: null,
      })),
      explanation: String(q.explanation || '').trim(),
      timeLimit: Number(q.timeLimit) || 30,
      points: Number(q.points) || 1000,
      order: i,
    }));

    res.json({ questions: sanitized, topic, count: sanitized.length, model: modelName });
  } catch (err) {
    if (err.message?.includes('API_KEY')) {
      return res.status(503).json({ message: 'Invalid Gemini API key' });
    }
    if (isModelNotFoundError(err)) {
      return res.status(503).json({
        message: 'No compatible Gemini model found for this API key. Set GEMINI_MODEL in backend/.env to a model available in your account.',
      });
    }
    if (err.status === 429 || err.message?.includes('Quota exceeded')) {
      return res.status(429).json({
        message: 'AI quota exceeded. Free tier limited. To fix: 1) Add billing to your Google Cloud project at console.cloud.google.com, 2) Or wait 24 hours for quota reset, 3) Or use CSV import feature instead of AI generator.',
      });
    }
    next(err);
  }
};
