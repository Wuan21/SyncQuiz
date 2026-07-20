import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Homework,
  HomeworkDocument,
  HomeworkStatus,
  HomeworkSubmission,
  HomeworkSubmissionDocument,
  HomeworkProgress,
  HomeworkProgressDocument,
} from './schemas/homework.schema';
import {
  Classroom,
  ClassroomDocument,
} from '../classrooms/schemas/classroom.schema';
import { Quiz, QuizDocument } from '../quizzes/schemas/quiz.schema';
import {
  Question,
  QuestionDocument,
} from '../questions/schemas/question.schema';

@Injectable()
export class HomeworkService {
  constructor(
    @InjectModel(Homework.name)
    private readonly hwModel: Model<HomeworkDocument>,
    @InjectModel(HomeworkSubmission.name)
    private readonly subModel: Model<HomeworkSubmissionDocument>,
    @InjectModel(Classroom.name)
    private readonly classroomModel: Model<ClassroomDocument>,
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
    @InjectModel(Question.name)
    private readonly questionModel: Model<QuestionDocument>,
    @InjectModel(HomeworkProgress.name)
    private readonly progressModel: Model<HomeworkProgressDocument>,
  ) {}

  /* ── Teacher side ─────────────────────────────────────────────────── */

  async create(teacherId: string, dto: any) {
    const {
      classroomId,
      quizId,
      title,
      instructions,
      dueDate,
      allowedAttempts,
    } = dto;

    if (!classroomId || !quizId || !title || !dueDate) {
      throw new BadRequestException({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'Thiếu trường bắt buộc',
      });
    }

    const classroom = await this.classroomModel.findById(classroomId);
    if (!classroom) {
      throw new NotFoundException({
        success: false,
        code: 'CLASSROOM_NOT_FOUND',
        message: 'Không tìm thấy lớp học',
      });
    }
    if (classroom.teacherId !== teacherId.toString()) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Bạn không phải giáo viên của lớp này',
      });
    }

    if (!Types.ObjectId.isValid(quizId)) {
      throw new NotFoundException({
        success: false,
        code: 'QUIZ_NOT_FOUND',
        message: 'Không tìm thấy quiz',
      });
    }
    const quiz = await this.quizModel.findById(quizId).lean();
    if (!quiz || quiz.isDeleted) {
      throw new NotFoundException({
        success: false,
        code: 'QUIZ_NOT_FOUND',
        message: 'Không tìm thấy quiz',
      });
    }

    const hw = await this.hwModel.create({
      teacherId: teacherId.toString(),
      classroomId,
      quizId,
      title: String(title).trim(),
      instructions: String(instructions || '').trim(),
      dueDate: new Date(dueDate),
      allowedAttempts: Math.max(1, Number(allowedAttempts) || 1),
      shuffleQuestions: Boolean(dto.shuffleQuestions),
      showCorrectAnswers: dto.showCorrectAnswers !== false,
      status: HomeworkStatus.ASSIGNED,
    });

    return this.serialize(hw.toObject());
  }

  async listMine(teacherId: string) {
    const items = await this.hwModel
      .find({ teacherId: teacherId.toString() })
      .sort({ createdAt: -1 })
      .populate('classroomId', 'name')
      .populate('quizId', 'title questionCount')
      .lean();

    return items.map((h: any) => this.serialize(h));
  }

  async getResults(teacherId: string, homeworkId: string) {
    const hw = await this.hwModel.findById(homeworkId).lean();
    if (!hw) {
      throw new NotFoundException({
        success: false,
        code: 'HOMEWORK_NOT_FOUND',
        message: 'Không tìm thấy bài tập',
      });
    }
    if (hw.teacherId !== teacherId.toString()) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền xem kết quả này',
      });
    }
    const subs = await this.subModel
      .find({ homeworkId })
      .sort({ percentage: -1 })
      .lean();
    return {
      homework: this.serialize(hw),
      submissions: subs.map((s: any) => ({
        id: s._id?.toString?.() || s.id,
        studentId: s.studentId,
        score: s.score,
        totalPoints: s.totalPoints,
        percentage: s.percentage,
        correct: s.correct,
        total: s.total,
        submittedAt: s.submittedAt,
      })),
    };
  }

  /* ── Student side ─────────────────────────────────────────────────── */

  /* ── Progress tracking (auto-save answers) ─────────────────────────── */
  async saveProgress(
    homeworkId: string,
    studentId: string,
    data: { answers: Record<string, number>; lastVisitedIndex: number },
  ) {
    if (!Types.ObjectId.isValid(homeworkId)) {
      throw new NotFoundException({
        success: false,
        code: 'HOMEWORK_NOT_FOUND',
        message: 'Không tìm thấy bài tập',
      });
    }

    const hw = await this.hwModel.findById(homeworkId).lean();
    if (!hw) {
      throw new NotFoundException({
        success: false,
        code: 'HOMEWORK_NOT_FOUND',
        message: 'Không tìm thấy bài tập',
      });
    }

    const classroom = await this.classroomModel.findById(hw.classroomId).lean();
    if (!classroom) {
      throw new ForbiddenException({
        success: false,
        code: 'CLASSROOM_NOT_FOUND',
        message: 'Không tìm thấy lớp học',
      });
    }
    if (!(classroom.studentIds || []).includes(studentId.toString())) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Bạn không phải học sinh của lớp này',
      });
    }

    // Upsert progress
    const answersMap: Record<string, number> = {};
    for (const [k, v] of Object.entries(data.answers)) {
      answersMap[k] = v;
    }

    await this.progressModel.findOneAndUpdate(
      { homeworkId, studentId: studentId.toString() },
      {
        homeworkId,
        studentId: studentId.toString(),
        answers: answersMap,
        lastVisitedIndex: data.lastVisitedIndex,
        updatedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    return { success: true };
  }

  async getProgress(homeworkId: string, studentId: string) {
    const progress = await this.progressModel
      .findOne({ homeworkId, studentId: studentId.toString() })
      .lean();
    return {
      answers: progress?.answers || {},
      lastVisitedIndex: progress?.lastVisitedIndex || 0,
      isSubmitted: progress?.isSubmitted || false,
      updatedAt: progress?.updatedAt || null,
    };
  }

  async listForStudent(studentId: string) {
    // Find classrooms where student is a member
    const classrooms = await this.classroomModel
      .find({ studentIds: studentId.toString() })
      .select('_id')
      .lean();

    const classroomIds = classrooms.map((c: any) => c._id.toString());

    if (classroomIds.length === 0) {
      return [];
    }

    const homeworks = await this.hwModel
      .find({ classroomId: { $in: classroomIds } })
      .sort({ dueDate: 1 })
      .populate('classroomId', 'name')
      .populate('quizId', 'title questionCount')
      .populate('teacherId', 'fullName')
      .lean();

    // Attach submissions per student
    const submissions = await this.subModel
      .find({
        homeworkId: { $in: homeworks.map((h: any) => h._id.toString()) },
        studentId: studentId.toString(),
      })
      .lean();

    const subMap = new Map<string, any[]>();
    for (const s of submissions) {
      const key = (s as any).homeworkId;
      if (!subMap.has(key)) subMap.set(key, []);
      subMap.get(key).push(s);
    }

    const now = new Date();
    return homeworks.map((h: any) => {
      const mySubs = subMap.get(h._id.toString()) || [];
      const bestScore = mySubs.length
        ? Math.max(...mySubs.map((s: any) => s.percentage || 0))
        : null;
      const submitted = mySubs.length >= (h.allowedAttempts || 1);
      const expired = h.dueDate ? new Date(h.dueDate) < now : false;
      const canSubmit =
        !submitted && !expired && h.status !== HomeworkStatus.CLOSED;

      return {
        ...this.serialize(h),
        classroomName: h.classroomId?.name,
        teacherName: h.teacherId?.fullName,
        questionCount: h.quizId?.questionCount,
        mySubmissions: mySubs.map((s: any) => ({
          id: s._id?.toString?.() || s.id,
          percentage: s.percentage,
          submittedAt: s.submittedAt,
        })),
        bestScore,
        submitted,
        canSubmit,
        expired,
      };
    });
  }

  async getDetail(homeworkId: string, studentId: string) {
    if (!Types.ObjectId.isValid(homeworkId)) {
      throw new NotFoundException({
        success: false,
        code: 'HOMEWORK_NOT_FOUND',
        message: 'Không tìm thấy bài tập',
      });
    }
    const hw = await this.hwModel.findById(homeworkId).lean();
    if (!hw) {
      throw new NotFoundException({
        success: false,
        code: 'HOMEWORK_NOT_FOUND',
        message: 'Không tìm thấy bài tập',
      });
    }

    const classroom = await this.classroomModel.findById(hw.classroomId).lean();
    if (!classroom) {
      throw new NotFoundException({
        success: false,
        code: 'CLASSROOM_NOT_FOUND',
        message: 'Không tìm thấy lớp học',
      });
    }

    const isTeacher = classroom.teacherId === studentId.toString();
    const isStudent = (classroom.studentIds || []).includes(
      studentId.toString(),
    );

    if (!isTeacher && !isStudent) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền truy cập bài tập này',
      });
    }

    // Load quiz + questions
    const quiz = await this.quizModel.findById(hw.quizId).lean();
    if (!quiz) {
      throw new NotFoundException({
        success: false,
        code: 'QUIZ_NOT_FOUND',
        message: 'Không tìm thấy quiz',
      });
    }
    const questions = await this.questionModel
      .find({ quizId: hw.quizId })
      .sort({ order: 1 })
      .lean();

    const cleanQuestions = questions.map((q: any) => ({
      id: q._id.toString(),
      _id: q._id.toString(),
      type: q.type,
      content: q.content,
      imageUrl: q.imageUrl,
      timeLimit: q.timeLimit,
      points: q.points,
      options: (q.options || []).map((o: any) => ({
        text: o.text,
        isCorrect: undefined, // hide correctness from student during test
      })),
      explanation: hw.showCorrectAnswers ? q.explanation : null,
    }));

    const mySubs = await this.subModel
      .find({ homeworkId, studentId: studentId.toString() })
      .sort({ submittedAt: -1 })
      .lean();

    return {
      ...this.serialize(hw),
      classroomName: classroom.name,
      teacherName: null, // could be populated
      allowedAttempts: hw.allowedAttempts,
      showCorrectAnswers: hw.showCorrectAnswers,
      questions: cleanQuestions,
      mySubmissions: mySubs.map((s: any) => ({
        id: s._id?.toString?.() || s.id,
        percentage: s.percentage,
        submittedAt: s.submittedAt,
      })),
    };
  }

  async submit(
    homeworkId: string,
    studentId: string,
    body: { answers: Array<{ questionId: string; selectedOption: number }> },
  ) {
    if (!Types.ObjectId.isValid(homeworkId)) {
      throw new NotFoundException({
        success: false,
        code: 'HOMEWORK_NOT_FOUND',
        message: 'Không tìm thấy bài tập',
      });
    }

    const hw = await this.hwModel.findById(homeworkId);
    if (!hw) {
      throw new NotFoundException({
        success: false,
        code: 'HOMEWORK_NOT_FOUND',
        message: 'Không tìm thấy bài tập',
      });
    }

    const classroom = await this.classroomModel.findById(hw.classroomId).lean();
    if (!classroom) {
      throw new NotFoundException({
        success: false,
        code: 'CLASSROOM_NOT_FOUND',
        message: 'Không tìm thấy lớp học',
      });
    }
    if (!(classroom.studentIds || []).includes(studentId.toString())) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Bạn không phải học sinh của lớp này',
      });
    }

    const now = new Date();
    if (hw.dueDate && hw.dueDate < now) {
      throw new BadRequestException({
        success: false,
        code: 'EXPIRED',
        message: 'Đã quá hạn nộp bài',
      });
    }

    const mySubs = await this.subModel.countDocuments({
      homeworkId,
      studentId: studentId.toString(),
    });
    if (mySubs >= hw.allowedAttempts) {
      throw new BadRequestException({
        success: false,
        code: 'NO_ATTEMPTS_LEFT',
        message: 'Đã hết lượt làm bài',
      });
    }

    const questions = await this.questionModel
      .find({ quizId: hw.quizId })
      .lean();
    const questionsById = new Map<string, any>(
      questions.map((q: any) => [q._id.toString(), q]),
    );

    let totalPoints = 0;
    let earnedPoints = 0;
    let correctCount = 0;
    const gradedAnswers: any[] = [];

    for (const a of body.answers || []) {
      const q = questionsById.get(String(a.questionId));
      if (!q) continue;
      const opts: any[] = q.options || [];
      const idx = Number(a.selectedOption);
      const opt = Number.isInteger(idx) ? opts[idx] : null;
      const correctIdx = opts.findIndex((o: any) => o.isCorrect);
      const isCorrect = opt?.isCorrect === true;
      totalPoints += q.points || 0;
      if (isCorrect) {
        earnedPoints += q.points || 0;
        correctCount++;
      }
      gradedAnswers.push({
        questionId: q._id.toString(),
        selectedOption: Number.isInteger(idx) ? idx : null,
        correctOptionIndex: correctIdx,
        isCorrect,
      });
    }

    const total = questions.length;
    const percentage = totalPoints
      ? Math.round((earnedPoints / totalPoints) * 100)
      : 0;

    const submission = await this.subModel.create({
      homeworkId,
      studentId: studentId.toString(),
      answers: gradedAnswers.map((g) => ({
        questionId: g.questionId,
        selectedOption: g.selectedOption,
        isCorrect: g.isCorrect,
        pointsEarned: questionsById.get(g.questionId)?.points || 0,
      })),
      score: earnedPoints,
      totalPoints,
      percentage,
      correct: correctCount,
      total,
    });

    // Mark progress as submitted
    await this.progressModel.findOneAndUpdate(
      { homeworkId, studentId: studentId.toString() },
      { isSubmitted: true, updatedAt: new Date() },
    );

    return {
      success: true,
      id: submission._id.toString(),
      score: earnedPoints,
      totalPoints,
      percentage,
      correct: correctCount,
      total,
      gradedAnswers,
    };
  }

  private serialize(h: any) {
    if (!h) return h;
    return {
      id: h._id?.toString?.() || h.id,
      classroomId: h.classroomId?._id?.toString?.() || h.classroomId,
      quizId: h.quizId?._id?.toString?.() || h.quizId,
      teacherId: h.teacherId?._id?.toString?.() || h.teacherId,
      title: h.title,
      instructions: h.instructions,
      dueDate: h.dueDate,
      allowedAttempts: h.allowedAttempts,
      shuffleQuestions: h.shuffleQuestions,
      showCorrectAnswers: h.showCorrectAnswers,
      status: h.status,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    };
  }
}
