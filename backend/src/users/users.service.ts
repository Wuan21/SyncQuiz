import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
import { UserDocument, UserRole } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async findById(id: string): Promise<UserDocument> {
    const user = await this.usersRepo.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(
    email: string,
    withPassword = false,
  ): Promise<UserDocument | null> {
    return this.usersRepo.findByEmail(email, withPassword);
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    role?: UserRole;
  }): Promise<UserDocument> {
    const existing = await this.usersRepo.findByEmail(data.email);
    if (existing) throw new ConflictException('Email already registered');
    return this.usersRepo.create(data);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserDocument> {
    const user = await this.usersRepo.updateById(userId, dto);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // Re-fetch with password
    const userWithPw = await this.usersRepo.findByEmail(user.email, true);
    const valid = await bcrypt.compare(
      dto.currentPassword,
      userWithPw.passwordHash,
    );
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.usersRepo.updateById(userId, { passwordHash: newHash });
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.usersRepo.softDeleteById(userId);
  }
}
