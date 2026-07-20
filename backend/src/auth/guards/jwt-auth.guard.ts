import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { UsersRepository } from '../../users/users.repository';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private cognitoVerifier: any = null;

  constructor(
    private readonly config: ConfigService,
    private readonly usersRepo: UsersRepository,
  ) {
    super();
    const poolId = this.config.get<string>('AWS_COGNITO_USER_POOL_ID');
    const clientId = this.config.get<string>('AWS_COGNITO_CLIENT_ID');
    if (poolId && clientId) {
      try {
        this.cognitoVerifier = CognitoJwtVerifier.create({
          userPoolId: poolId,
          tokenUse:
            (this.config.get<string>('AWS_COGNITO_TOKEN_USE') as any) || 'id',
          clientId: clientId,
        });
      } catch (e) {
        console.error('[JwtAuthGuard] Failed to init Cognito verifier:', e);
      }
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers?.authorization;

    if (this.cognitoVerifier && authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = await this.cognitoVerifier.verify(token);
        const cognitoId = payload.sub;
        const email = (payload.email || '').toLowerCase();
        const fullName =
          payload.name ||
          payload['custom:fullName'] ||
          email.split('@')[0] ||
          'Cognito User';

        let user = await this.usersRepo.findOne({
          $or: [{ cognitoId }, { email }],
        });

        if (!user && email) {
          user = await this.usersRepo.create({
            cognitoId,
            email,
            fullName,
          });
        } else if (user && !user.cognitoId) {
          await this.usersRepo.updateById((user as any)._id || user.id, {
            cognitoId,
          });
        }

        if (user) {
          // Block inactive users
          if (!user.isActive) {
            throw new UnauthorizedException('Account is deactivated');
          }
          req.user = {
            id: (user as any)._id?.toString() || user.id,
            email: user.email,
            role: user.role,
            cognitoId: user.cognitoId,
          };
          return true;
        }
      } catch (e) {
        // Fall through to passport-jwt strategy
      }
    }

    try {
      return (await super.canActivate(context)) as boolean;
    } catch (err) {
      return false;
    }
  }
}
