import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Classroom, ClassroomDocument } from './schemas/classroom.schema';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

@Injectable()
export class ClassroomsService {
  constructor(
    @InjectModel(Classroom.name)
    private readonly model: Model<ClassroomDocument>,
  ) {}

  async listForUser(userId: string) {
    const taught = await this.model
      .find({ teacherId: userId.toString() })
      .sort({ createdAt: -1 })
      .lean();

    const taughtWithStudentCount = taught.map((c: any) => ({
      ...c,
      id: c._id.toString(),
      studentCount: (c.studentIds || []).length,
      studentIds: undefined,
    }));

    const joined = await this.model
      .find({ studentIds: userId.toString() })
      .sort({ createdAt: -1 })
      .lean();

    const joinedWithTeacherCount = joined.map((c: any) => ({
      ...c,
      id: c._id.toString(),
      studentCount: (c.studentIds || []).length,
      studentIds: undefined,
    }));

    return {
      taught: taughtWithStudentCount,
      joined: joinedWithTeacherCount,
    };
  }

  async create(teacherId: string, dto: { name: string; description?: string }) {
    if (!dto?.name?.trim()) {
      throw new BadRequestException({
        success: false,
        code: 'NAME_REQUIRED',
        message: 'Tên lớp học là bắt buộc',
      });
    }

    // Generate unique code
    let code = generateCode();
    for (let i = 0; i < 10; i++) {
      const exists = await this.model.exists({ code });
      if (!exists) break;
      code = generateCode();
    }

    const classroom = await this.model.create({
      teacherId: teacherId.toString(),
      name: dto.name.trim(),
      description: dto.description?.trim() || '',
      code,
      studentIds: [],
    });

    const obj: any = classroom.toObject();
    obj.id = obj._id.toString();
    delete obj.studentIds;
    obj.studentCount = 0;
    return obj;
  }

  async join(studentId: string, code: string) {
    const cleanCode = String(code || '')
      .toUpperCase()
      .trim();
    if (!cleanCode) {
      throw new BadRequestException({
        success: false,
        code: 'CODE_REQUIRED',
        message: 'Mã lớp là bắt buộc',
      });
    }

    const classroom = await this.model.findOne({ code: cleanCode });
    if (!classroom) {
      throw new NotFoundException({
        success: false,
        code: 'CLASSROOM_NOT_FOUND',
        message: 'Không tìm thấy lớp học',
      });
    }

    if (classroom.teacherId === studentId.toString()) {
      throw new ConflictException({
        success: false,
        code: 'TEACHER_CANNOT_JOIN',
        message: 'Giáo viên không thể tham gia lớp do mình tạo',
      });
    }

    const already = (classroom.studentIds || []).includes(studentId.toString());
    if (already) {
      throw new ConflictException({
        success: false,
        code: 'ALREADY_JOINED',
        message: 'Bạn đã tham gia lớp này',
      });
    }

    classroom.studentIds.push(studentId.toString());
    await classroom.save();

    const obj: any = classroom.toObject();
    obj.id = obj._id.toString();
    delete obj.studentIds;
    obj.studentCount = obj.studentIds?.length || 0;
    return obj;
  }

  async remove(classroomId: string, teacherId: string) {
    if (!Types.ObjectId.isValid(classroomId)) {
      throw new NotFoundException({
        success: false,
        code: 'CLASSROOM_NOT_FOUND',
        message: 'Không tìm thấy lớp học',
      });
    }
    const classroom = await this.model.findById(classroomId);
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
        message: 'Bạn không có quyền xóa lớp này',
      });
    }
    await classroom.deleteOne();
    return { success: true };
  }

  async getStudents(classroomId: string, teacherId: string) {
    if (!Types.ObjectId.isValid(classroomId)) {
      throw new NotFoundException({
        success: false,
        code: 'CLASSROOM_NOT_FOUND',
        message: 'Không tìm thấy lớp học',
      });
    }
    const classroom = await this.model.findById(classroomId).lean();
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
        message: 'Bạn không có quyền xem lớp này',
      });
    }
    return {
      id: classroom._id.toString(),
      name: classroom.name,
      students: classroom.studentIds || [],
    };
  }
}
