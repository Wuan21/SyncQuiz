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
  GameSessionStatus,
} from './schemas/game-session.schema';
import { Quiz, QuizDocument } from '../quizzes/schemas/quiz.schema';

const AVATARS = ['😀', '🐶', '🦊', '🐱', '🐸', '🦄', '🐙', '🦋', '🎃', '🚀'];

export function normalizePin(value: any): string {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .trim();
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export function calculateScore(
  isCorrect: boolean,
  timeSpentMs: number,
  timeLimitSec: number,
  points: number,
  streak: number,
  doublePoints = false,
): number {
  if (!isCorrect) return 0;
  const ratio = Math.max(
    0,
    Math.min(1, 1 - timeSpentMs / (timeLimitSec * 1000)),
  );
  const base = Math.round(points * (0.5 + 0.5 * ratio));
  const bonus = streak >= 3 ? Math.round(base * 0.1 * Math.min(streak, 5)) : 0;
  const total = base + bonus;
  return doublePoints ? total * 2 : total;
}

@Injectable()
export class LiveService {
  constructor(
    @InjectModel(GameSession.name)
    private readonly sessionModel: Model<GameSessionDocument>,
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
  ) {}

  /* ── Generate unique 6-digit PIN ─────────────────────────────────────── */
  private async generateUniquePin(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const pin = String(Math.floor(100000 + Math.random() * 900000));
      const exists = await this.sessionModel.exists({
        pin,
        status: {
          $nin: [GameSessionStatus.ENDED, GameSessionStatus.FINISHED],
        },
      });
      if (!exists) return pin;
    }
    throw new HttpException(
      {
        success: false,
        code: 'PIN_GENERATION_FAILED',
        message: 'Không thể tạo mã PIN',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /* ── Create session (host) ───────────────────────────────────────────── */
  async createSession(
    hostId: string,
    dto: {
      quizId: string;
      shuffleQuestions?: boolean;
      shuffleAnswers?: boolean;
    },
  ) {
    if (!hostId) {
      throw new ForbiddenException({
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Người dùng chưa đăng nhập',
      });
    }
    if (!dto?.quizId || !Types.ObjectId.isValid(dto.quizId)) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_QUIZ_ID',
        message: 'Quiz ID không hợp lệ',
      });
    }

    const quiz = await this.quizModel.findById(dto.quizId).lean();
    if (!quiz || quiz.isDeleted) {
      throw new NotFoundException({
        success: false,
        code: 'QUIZ_NOT_FOUND',
        message: 'Không tìm thấy quiz',
      });
    }

    const isOwner = quiz.ownerId?.toString() === hostId.toString();
    if (quiz.visibility === 'private' && !isOwner) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Bạn chỉ có thể host quiz của chính mình',
      });
    }

    const pin = await this.generateUniquePin();
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000);

    const session = await this.sessionModel.create({
      pin,
      quizId: new Types.ObjectId(dto.quizId),
      hostId: hostId.toString(),
      status: GameSessionStatus.WAITING,
      players: [],
      currentQuestionIndex: -1,
      totalQuestions: 0,
      expiresAt,
      settings: {
        showLeaderboard: true,
        shuffleQuestions:
          dto.shuffleQuestions ?? quiz.shuffleQuestions ?? false,
        shuffleAnswers: dto.shuffleAnswers ?? quiz.shuffleAnswers ?? false,
      },
    });

    return {
      success: true,
      data: {
        gameId: session._id.toString(),
        pin: session.pin,
        status: session.status,
        expiresAt: session.expiresAt,
        quizId: session.quizId.toString(),
      },
    };
  }

  /* ── Player join ────────────────────────────────────────────────────── */
  async joinSession(dto: {
    pin: string;
    nickname: string;
    teamName?: string;
    avatar?: string;
  }) {
    const pin = normalizePin(dto.pin);
    const nickname = String(dto.nickname ?? '').trim();
    const teamName = String(dto.teamName ?? '').trim();
    const avatar = String(dto.avatar || AVATARS[0]).trim();

    if (!isValidPin(pin)) {
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
    if (nickname.length > 30) {
      throw new BadRequestException({
        success: false,
        code: 'NICKNAME_TOO_LONG',
        message: 'Nickname tối đa 30 ký tự',
      });
    }

    let game: any;
    try {
      game = await this.sessionModel.findOne({ pin });
    } catch (err: any) {
      throw new HttpException(
        {
          success: false,
          code: 'JOIN_GAME_FAILED',
          message: 'Không thể truy vấn phòng chơi',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!game) {
      throw new HttpException(
        {
          success: false,
          code: 'GAME_NOT_FOUND',
          message: 'Không tìm thấy phòng chơi',
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

    if (
      game.status === GameSessionStatus.ENDED ||
      game.status === GameSessionStatus.FINISHED
    ) {
      throw new HttpException(
        {
          success: false,
          code: 'GAME_ENDED',
          message: 'Phòng chơi đã kết thúc',
        },
        HttpStatus.GONE,
      );
    }

    if (game.status !== GameSessionStatus.WAITING) {
      throw new HttpException(
        {
          success: false,
          code: 'GAME_ALREADY_STARTED',
          message: 'Trò chơi đã bắt đầu',
        },
        HttpStatus.CONFLICT,
      );
    }

    const nickTaken = (game.players || []).some(
      (p: any) => (p.nickname || '').toLowerCase() === nickname.toLowerCase(),
    );
    if (nickTaken) {
      throw new HttpException(
        {
          success: false,
          code: 'NICKNAME_TAKEN',
          message: 'Nickname đã có người sử dụng',
        },
        HttpStatus.CONFLICT,
      );
    }

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
      totalScore: 0,
      rank: 0,
      streak: 0,
      answers: [],
    });
    await game.save();

    return {
      success: true,
      data: {
        gameId: game._id.toString(),
        playerId,
        pin: game.pin,
        status: game.status,
        nickname,
        avatar,
        teamName,
      },
    };
  }

  /* ── Lookup by PIN ──────────────────────────────────────────────────── */
  async getByPin(pin: string) {
    const normalizedPin = normalizePin(pin);
    if (!isValidPin(normalizedPin)) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_PIN',
        message: 'Mã PIN không hợp lệ',
      });
    }

    const session: any = await this.sessionModel
      .findOne({ pin: normalizedPin })
      .lean();
    if (!session) {
      throw new NotFoundException({
        success: false,
        code: 'GAME_NOT_FOUND',
        message: 'Không tìm thấy phòng chơi',
      });
    }

    if (
      session.status === GameSessionStatus.FINISHED ||
      session.status === GameSessionStatus.ENDED
    ) {
      throw new HttpException(
        {
          success: false,
          code: 'GAME_ENDED',
          message: 'Phòng chơi đã kết thúc',
        },
        HttpStatus.GONE,
      );
    }

    return {
      success: true,
      data: {
        pin: session.pin,
        status: session.status,
        gameId: session._id.toString(),
        quizId: session.quizId?.toString?.() || session.quizId,
        players: (session.players || []).map((p: any) => ({
          playerId: p.playerId,
          nickname: p.nickname,
          teamName: p.teamName,
          avatar: p.avatar,
          connected: p.connected,
        })),
      },
    };
  }

  async getMyHistory(hostId: string) {
    const items = await this.sessionModel
      .find({ hostId: hostId.toString() })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return {
      success: true,
      data: items.map((s: any) => ({
        id: s._id?.toString?.(),
        pin: s.pin,
        status: s.status,
        quizId: s.quizId?.toString?.() || s.quizId,
        playerCount: (s.players || []).length,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        createdAt: s.createdAt,
      })),
    };
  }

  async getResult(sessionId: string, userId: string) {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new NotFoundException({
        success: false,
        code: 'SESSION_NOT_FOUND',
        message: 'Không tìm thấy phiên chơi',
      });
    }
    const session: any = await this.sessionModel
      .findById(sessionId)
      .populate('quizId', 'title')
      .lean();
    if (!session) {
      throw new NotFoundException({
        success: false,
        code: 'SESSION_NOT_FOUND',
        message: 'Không tìm thấy phiên chơi',
      });
    }
    const isOwner = session.hostId?.toString() === userId.toString();
    if (!isOwner && session.status !== GameSessionStatus.FINISHED) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền xem kết quả',
      });
    }
    const quizTitle = session.quizId?.title || 'Kết quả game';
    return {
      success: true,
      data: {
        id: session._id.toString(),
        pin: session.pin,
        status: session.status,
        quizId: session.quizId?._id?.toString?.() || session.quizId,
        quizTitle,
        hostId: session.hostId,
        players: (session.players || []).map((p: any) => ({
          playerId: p.playerId,
          nickname: p.nickname,
          teamName: p.teamName,
          avatar: p.avatar,
          avatarIndex: p.avatarIndex,
          totalScore: p.totalScore,
          rank: p.rank,
          streak: p.streak,
          answers: p.answers || [],
        })),
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        createdAt: session.createdAt,
        currentQuestionIndex: session.currentQuestionIndex,
      },
    };
  }

  /* ── Mutations used by socket layer ────────────────────────────────── */
  async markPlayerConnected(
    sessionId: string,
    playerId: string,
    socketId: string | null,
    connected: boolean,
  ) {
    return this.sessionModel.updateOne(
      { _id: sessionId, 'players.playerId': playerId },
      {
        $set: {
          'players.$.socketId': socketId,
          'players.$.connected': connected,
        },
      },
    );
  }

  async saveSessionSnapshot(sessionId: string, data: any) {
    return this.sessionModel.updateOne({ _id: sessionId }, { $set: data });
  }
}
