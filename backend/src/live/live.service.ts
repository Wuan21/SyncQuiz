import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
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
    if (!hostId) {
      throw new ForbiddenException('User unauthenticated');
    }

    const quiz: any = await this.quizModel.findById(dto.quizId).lean();
    if (!quiz || quiz.isDeleted) {
      throw new NotFoundException('Quiz not found');
    }

    // Allow hosting if quiz is public OR host is the owner
    const isOwner = quiz.ownerId?.toString() === hostId.toString();
    if (quiz.isPublic === false && !isOwner) {
      throw new ForbiddenException(
        'Bạn chỉ có thể host bộ câu hỏi của chính mình hoặc bộ câu hỏi công khai',
      );
    }

    let pin: string;
    let attempts = 0;
    do {
      pin = generatePin();
      attempts++;
    } while (
      (await this.sessionModel.exists({
        $or: [{ pin }, { pin: Number(pin) || -1 }],
        status: { $ne: 'finished' },
      })) &&
      attempts < 10
    );

    const session = await this.sessionModel.create({
      quizId: quiz._id,
      hostId: Types.ObjectId.isValid(hostId)
        ? new Types.ObjectId(hostId)
        : hostId,
      pin: pin.toString().trim(),
      totalQuestions: quiz.questionCount || 0,
      status: 'waiting',
      settings: {
        shuffleQuestions:
          dto.shuffleQuestions ?? quiz.shuffleQuestions ?? false,
        shuffleAnswers: dto.shuffleAnswers ?? quiz.shuffleAnswers ?? false,
      },
    });

    console.log('[LIVE SERVICE] Created game session:', {
      id: session._id.toString(),
      pin: session.pin,
      status: session.status,
      hostId,
    });

    return session;
  }

  async getByPin(pin: string) {
    const normalizedPin = String(pin || '').trim();
    if (!normalizedPin) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_PIN',
        message: 'Mã PIN không hợp lệ',
      });
    }

    const numericPin = Number(normalizedPin);
    const pinFilter = !isNaN(numericPin)
      ? { $or: [{ pin: normalizedPin }, { pin: numericPin }] }
      : { pin: normalizedPin };

    const session: any = await this.sessionModel
      .findOne(pinFilter)
      .populate('quizId', 'title coverImageUrl')
      .lean();

    if (!session) {
      console.log(
        '[LIVE SERVICE] Game session not found for PIN:',
        normalizedPin,
      );
      throw new NotFoundException({
        success: false,
        code: 'GAME_NOT_FOUND',
        message: 'Không tìm thấy phòng chơi với mã PIN này',
      });
    }

    if (session.status === 'finished' || session.status === 'ended') {
      throw new HttpException(
        {
          success: false,
          code: 'GAME_ENDED',
          message: 'Phòng chơi đã kết thúc',
        },
        HttpStatus.GONE,
      );
    }

    return session;
  }

  async getMyHistory(hostId: string) {
    const hostFilter = Types.ObjectId.isValid(hostId)
      ? { hostId: new Types.ObjectId(hostId) }
      : { hostId };

    return this.sessionModel
      .find(hostFilter)
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
