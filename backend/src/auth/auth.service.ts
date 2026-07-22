import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user: any = await this.usersService.createUser({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
    });

    const uid = user._id?.toString() || user.id;
    const tokens = await this.generateTokens(uid, user.email, user.role);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user: any = await this.usersService.findByEmail(dto.email, true);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const uid = user._id?.toString() || user.id;
    const tokens = await this.generateTokens(uid, user.email, user.role);
    return { user, ...tokens };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      const user: any = await this.usersService.findById(payload.sub);

      const uid = user._id?.toString() || user.id;
      const tokens = await this.generateTokens(uid, user.email, user.role);
      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        payload as any,
        {
          secret: this.config.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN'),
        } as any,
      ),

      this.jwtService.signAsync(
        payload as any,
        {
          secret: this.config.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
        } as any,
      ),
    ]);

    return { accessToken, refreshToken };
  }
}
