import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
  UnprocessableEntityException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
];

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  private getModelCandidates(): string[] {
    const preferred = (this.config.get<string>('GEMINI_MODEL') || '').trim();
    return preferred
      ? [preferred, ...DEFAULT_MODELS.filter((m) => m !== preferred)]
      : DEFAULT_MODELS;
  }

  private isModelNotFoundError(err: any): boolean {
    const msg = String(err?.message || '').toLowerCase();
    return (
      err?.status === 404 ||
      (msg.includes('model') && msg.includes('not found'))
    );
  }

  private async generateWithFallback(prompt: string) {
    if (!this.genAI) {
      const apiKey = this.config.get<string>('GEMINI_API_KEY');
      if (!apiKey) {
        throw new ServiceUnavailableException(
          'AI service not configured. GEMINI_API_KEY missing on server.',
        );
      }
      this.genAI = new GoogleGenerativeAI(apiKey);
    }

    const candidates = this.getModelCandidates();
    let lastErr: any;

    for (const modelName of candidates) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return { result, modelName };
      } catch (err) {
        if (this.isModelNotFoundError(err)) {
          lastErr = err;
          continue;
        }
        throw err;
      }
    }

    throw (
      lastErr ||
      new Error('No compatible Gemini model available for this API key')
    );
  }

  async generateQuiz(dto: {
    topic: string;
    count?: number;
    difficulty?: string;
    language?: string;
    type?: string;
  }) {
    const topic = (dto.topic || '').trim();
    const count = Math.min(20, Math.max(1, Number(dto.count) || 5));
    const difficulty = dto.difficulty || 'medium';
    const language = dto.language || 'Vietnamese';

    if (!topic) throw new BadRequestException('Topic is required');

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

    try {
      const { result, modelName } = await this.generateWithFallback(prompt);
      const text = result.response.text().trim();
      const jsonText = text
        .replace(/^```json?\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim();

      let questions: any[];
      try {
        questions = JSON.parse(jsonText);
      } catch {
        throw new UnprocessableEntityException(
          'AI returned invalid JSON format. Please try again.',
        );
      }

      if (!Array.isArray(questions)) {
        throw new UnprocessableEntityException(
          'AI returned unexpected format. Please try again.',
        );
      }

      const sanitized = questions.slice(0, count).map((q: any, i: number) => ({
        type: 'multiple_choice',
        content: String(q.content || '').trim(),
        options: (q.options || []).slice(0, 4).map((o: any) => ({
          text: String(o.text || '').trim(),
          isCorrect: Boolean(o.isCorrect),
          imageUrl: null,
        })),
        explanation: String(q.explanation || '').trim(),
        timeLimit: Number(q.timeLimit) || 30,
        points: Number(q.points) || 1000,
        order: i,
      }));

      return {
        questions: sanitized,
        topic,
        count: sanitized.length,
        model: modelName,
      };
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      if (err.message?.includes('API_KEY')) {
        throw new ServiceUnavailableException(
          'Invalid Gemini API key configured on backend',
        );
      }
      if (this.isModelNotFoundError(err)) {
        throw new ServiceUnavailableException(
          'No compatible Gemini model found for backend API key',
        );
      }
      if (err.status === 429 || err.message?.includes('Quota exceeded')) {
        throw new HttpException(
          'AI quota exceeded. Free tier limit reached. Please wait or use manual question creation.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new BadRequestException(
        err.message || 'AI question generation failed',
      );
    }
  }
}
