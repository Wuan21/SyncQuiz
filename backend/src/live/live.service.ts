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
import { randomUUID } from 'crypto';
import {
  GameSession,
  GameSessionDocument,
} from './schemas/game-session.schema';
import { Quiz, QuizDocument } from '../quizzes/schemas/quiz.schema';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

export function normalizePin(value: any): string {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .trim();
}

const AVATARS = ['😀', '🐶', '🦊', '🐱', '🐸', '🦄', '🐙', '🦋', '🎃', '🚀'];

@Injectable()
export class LiveService {
  constructor(
    @InjectModel(GameSession.name)
    private readonly sessionModel: Model<GameSessionDocument>,
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
  ) {}

  /* ── Generate unique 6-digit PIN ───────────────────────────────────────── */
  private async generateUniquePin(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const pin = String(Math.floor(100000 + Math.random() * 900000));
      const exists = await this.sessionModel.exists({
        pin,
        status: { $ne: 'ended' },
        expiresAt: { $gt: new Date() },
      });
      if (!exists) return pin;
    }
    throw new HttpException(
      'PIN_GENERATION_FAILED',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /* ── Create game session (Host) ────────────────────────────────────────── */
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

    const pin = await this.generateUniquePin();
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours

    const session = await this.sessionModel.create({
      pin,
      quizId: quiz._id,
      hostId: hostId.toString(),
      status: 'waiting',
      players: [],
      currentQuestionIndex: -1,
      totalQuestions: quiz.questionCount || 0,
      expiresAt,
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

    return {
      success: true,
      data: {
        gameId: session._id.toString(),
        pin: session.pin,
        status: session.status,
        expiresAt: session.expiresAt,
      },
    };
  }

  /* ── Player join game (REST) ───────────────────────────────────────────── */
  async joinSession(dto: {
    pin: string;
    nickname: string;
    teamName?: string;
    avatar?: string;
  }) {
    const pin = normalizePin(dto.pin);
    const nickname = String(dto.nickname ?? '').trim();
    const teamName = String(dto.teamName ?? '').trim();
    const avatar = String(dto.avatar ?? '😀').trim();

    // Validate PIN format
    if (!/^\d{6}$/.test(pin)) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_PIN',
        message: 'Mã PIN phải gồm 6 chữ số',
      });
    }

    if (!nickname) {
      throw new BadRequestException({
        success: false,
        code: 'NICKNAME_REQUIRED',
        message: 'Vui lòng nhập nickname',
      });
    }

    // Query by PIN first (don't filter by status yet)
    let game: any;
    try {
      game = await this.sessionModel.findOne({ pin });
    } catch (err: any) {
      console.error('[LIVE SERVICE] DB error in joinSession:', err.message);
      throw new HttpException(
        {
          success: false,
          code: 'JOIN_GAME_FAILED',
          message: 'Không thể tham gia phòng chơi',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!game) {
      throw new HttpException(
        {
          success: false,
          code: 'GAME_NOT_FOUND',
          message: 'Không tìm thấy phòng chơi với mã PIN này',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (game.expiresAt && game.expiresAt.getTime() <= Date.now()) {
      throw new HttpException(
        {
          success: false,
          code: 'GAME_EXPIRED',
          message: 'Phòng chơi đã hết hạn',
        },
        HttpStatus.GONE,
      );
    }

    if (game.status === 'ended' || game.status === 'finished') {
      throw new HttpException(
        {
          success: false,
          code: 'GAME_ENDED',
          message: 'Phòng chơi đã kết thúc',
        },
        HttpStatus.GONE,
      );
    }

    if (game.status !== 'waiting') {
      throw new HttpException(
        {
          success: false,
          code: 'GAME_ALREADY_STARTED',
          message: 'Game đã bắt đầu',
        },
        HttpStatus.CONFLICT,
      );
    }

    // Check duplicate nickname in this game
    const nickTaken = game.players.some(
      (p: any) => p.nickname.toLowerCase() === nickname.toLowerCase(),
    );
    if (nickTaken) {
      throw new HttpException(
        {
          success: false,
          code: 'NICKNAME_TAKEN',
          message: 'Nickname này đã có người sử dụng',
        },
        HttpStatus.CONFLICT,
      );
    }

    // Determine avatarIndex from avatar string
    const avatarIndex = AVATARS.indexOf(avatar);

    const playerId = randomUUID();

    game.players.push({
      playerId,
      nickname,
      teamName,
      avatar,
      avatarIndex: avatarIndex >= 0 ? avatarIndex : 0,
      socketId: null,
      connected: false,
      joinedAt: new Date(),
    });

    await game.save();

    console.log('[LIVE SERVICE] Player joined:', {
      pin,
      playerId,
      nickname,
      gameId: game._id.toString(),
    });

    return {
      success: true,
      data: {
        gameId: game._id.toString(),
        playerId,
        pin: game.pin,
        status: game.status,
      },
    };
  }

  /* ── Get session by PIN (for validation) ───────────────────────────────── */
  async getByPin(pin: string) {
    const normalizedPin = normalizePin(pin);
    if (!normalizedPin) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_PIN',
        message: 'Mã PIN không hợp lệ',
      });
    }

    const session: any = await this.sessionModel
      .findOne({ pin: normalizedPin })
      .populate('quizId', 'title coverImageUrl')
      .lean();

    if (!session) {
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

  /* ── Host history ──────────────────────────────────────────────────────── */
  async getMyHistory(hostId: string) {
    return this.sessionModel
      .find({ hostId: hostId.toString() })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('quizId', 'title coverImageUrl')
      .lean();
  }

  /* ── Get result ────────────────────────────────────────────────────────── */
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
