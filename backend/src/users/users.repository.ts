import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FilterQuery<T> = Record<string, any>;
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).where({ deletedAt: null }).exec();
  }

  async findByEmail(email: string, withPassword = false): Promise<UserDocument | null> {
    const query = this.userModel
      .findOne({ email: email.toLowerCase(), deletedAt: null });
    if (withPassword) query.select('+passwordHash');
    return query.exec();
  }

  async findOne(filter: FilterQuery<UserDocument>): Promise<UserDocument | null> {
    return this.userModel.findOne({ ...filter, deletedAt: null }).exec();
  }

  async create(data: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(data);
    return user.save();
  }

  async updateById(id: string, data: Partial<User>): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async softDeleteById(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { deletedAt: new Date() });
  }
}
