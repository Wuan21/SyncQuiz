import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

type FilterQuery<T> = Record<string, any>;
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findById(id: string): Promise<any> {
    return this.userModel.findById(id).where({ deletedAt: null }).lean().select('-passwordHash').exec();
  }

  async findByEmail(email: string, withPassword = false): Promise<any> {
    const query = this.userModel
      .findOne({ email: email.toLowerCase(), deletedAt: null })
      .lean();
    if (withPassword) query.select('+passwordHash');
    return query.exec();
  }

  async findOne(filter: FilterQuery<UserDocument>): Promise<any> {
    return this.userModel.findOne({ ...filter, deletedAt: null }).lean().select('-passwordHash').exec();
  }

  async create(data: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(data);
    return user.save();
  }

  async updateById(id: string, data: Partial<User>): Promise<any> {
    return this.userModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean()
      .exec();
  }

  async softDeleteById(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { deletedAt: new Date() });
  }

  async toggleFavorite(userId: string, quizId: string): Promise<{ isFavorite: boolean }> {
    const user: any = await this.userModel.findById(userId).select('favoriteQuizIds').lean().exec();
    if (!user) return { isFavorite: false };
    const isFavorite = user.favoriteQuizIds?.includes(quizId);
    if (isFavorite) {
      await this.userModel.findByIdAndUpdate(userId, { $pull: { favoriteQuizIds: quizId } });
    } else {
      await this.userModel.findByIdAndUpdate(userId, { $addToSet: { favoriteQuizIds: quizId } });
    }
    return { isFavorite: !isFavorite };
  }

  async getFavoriteIds(userId: string): Promise<string[]> {
    const user: any = await this.userModel.findById(userId).select('favoriteQuizIds').lean().exec();
    return user?.favoriteQuizIds || [];
  }
}
