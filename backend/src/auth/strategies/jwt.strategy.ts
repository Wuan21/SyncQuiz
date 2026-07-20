import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { UsersRepository } from '../../users/users.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersRepo: UsersRepository,
  ) {
    const jwtSecret = config.get<string>('JWT_ACCESS_SECRET') || 'fallback_secret';
    const poolId = config.get<string>('AWS_COGNITO_USER_POOL_ID');
    const clientId = config.get<string>('AWS_COGNITO_CLIENT_ID');

    let verifier: any = null;
    if (poolId && clientId) {
      try {
        verifier = CognitoJwtVerifier.create({
          userPoolId: poolId,
          tokenUse: (config.get<string>('AWS_COGNITO_TOKEN_USE') as any) || 'id',
          clientId: clientId,
        });
      } catch (e) {
        console.error('[JwtStrategy] Failed to init Cognito verifier:', e);
      }
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKeyProvider: (request: any, rawJwtToken: string, done: any) => {
        if (verifier) {
          verifier
            .verify(rawJwtToken)
            .then((cognitoPayload: any) => {
              request._cognitoPayload = cognitoPayload;
              // Return dummy secret so passport-jwt passes signature verification step
              done(null, 'dummy_cognito_secret');
            })
            .catch(() => {
              done(null, jwtSecret);
            });
        } else {
          done(null, jwtSecret);
        }
      },
    });
  }

  async validate(req: any, payload: any) {
    // 1. If Cognito token was verified
    if (req._cognitoPayload) {
      const cognitoPayload = req._cognitoPayload;
      const cognitoId = cognitoPayload.sub;
      const email = (cognitoPayload.email || '').toLowerCase();
      const fullName =
        cognitoPayload.name ||
        cognitoPayload['custom:fullName'] ||
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
        await this.usersRepo.updateById((user as any)._id || user.id, { cognitoId });
      }

      if (!user) throw new UnauthorizedException('Cognito user sync failed');

      return {
        id: (user as any)._id?.toString() || user.id,
        email: user.email,
        role: user.role,
        cognitoId: user.cognitoId,
      };
    }

    // 2. Standard local JWT token
    if (!payload?.sub) throw new UnauthorizedException('Invalid token payload');

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
