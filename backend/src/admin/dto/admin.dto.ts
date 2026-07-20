import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum UserSortField {
  email = 'email',
  fullName = 'fullName',
  role = 'role',
  isActive = 'isActive',
  createdAt = 'createdAt',
}

export enum QuizSortField {
  title = 'title',
  visibility = 'visibility',
  totalPlays = 'totalPlays',
  createdAt = 'createdAt',
}

export class ListUsersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserSortField)
  sortBy?: UserSortField;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  isActive?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;
}

export class ListQuizzesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['public', 'private'])
  visibility?: string;

  @IsOptional()
  @IsString()
  isDeleted?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;
}

export class UpdateUserRoleDto {
  @IsString()
  @IsEnum(['admin', 'host', 'player'])
  role: string;
}

export class ToggleUserStatusDto {
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive: boolean;
}
