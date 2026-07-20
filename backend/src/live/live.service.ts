import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  GameSession,
  GameSessionDocument,
} from './schemas/game-session.schema';
import { Quiz, QuizDocument } from '../quizzes/schemas/quiz.schema';

const generatePin = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

@Injectable()
export class LiveService {
  constructor(
    @InjectModel(GameSession.name)
    private readonly sessionModel: Model<GameSessionDocument>,
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
  ) {}

  async createSession(
    hostId: string,
    dto: {
      quizId: string;
      shuffleQuestions?: boolean;
      shuffleAnswers?: boolean;
    },
  ) {
    const quiz: any = await this.quizModel.findById(dto.quizId).lean();
    if (!quiz || quiz.isDeleted) throw new NotFoundException('Quiz not found');
    if (quiz.ownerId?.toString() !== hostId)
      throw new ForbiddenException('Only the quiz owner can start a game');

    let pin: string;
    let attempts = 0;
    do {
      pin = generatePin();
      attempts++;
    } while (
      (await this.sessionModel.exists({ pin, status: { $ne: 'finished' } })) &&
      attempts < 10
    );

    const session = await this.sessionModel.create({
      quizId: quiz._id,
      hostId: new Types.ObjectId(hostId),
      pin,
      totalQuestions: quiz.questionCount || 0,
      settings: {
        shuffleQuestions:
          dto.shuffleQuestions ?? quiz.shuffleQuestions ?? false,
        shuffleAnswers: dto.shuffleAnswers ?? quiz.shuffleAnswers ?? false,
      },
    });

    return session;
  }

  async getByPin(pin: string) {
    const session = await this.sessionModel
      .findOne({ pin })
      .populate('quizId', 'title coverImageUrl')
      .lean();
    if (!session) throw new NotFoundException('Game not found');
    return session;
  }

  async getMyHistory(hostId: string) {
    return this.sessionModel
      .find({ hostId: new Types.ObjectId(hostId) })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('quizId', 'title coverImageUrl')
      .lean();
  }

  async getResult(sessionId: string, userId: string) {
    const session: any = await this.sessionModel
      .findById(sessionId)
      .populate('quizId', 'title coverImageUrl')
      .lean();
    if (!session) throw new NotFoundException('Session not found');
    if (
      session.hostId?.toString() !== userId &&
      session.status !== 'finished'
    ) {
      throw new ForbiddenException('Access denied');
    }
    return session;
  }
}
