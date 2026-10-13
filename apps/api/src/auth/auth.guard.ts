import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ACCESS_COOKIE } from './cookie.config';
import type { JwtPayload } from './current-user.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const token = (request.cookies as Record<string, string> | undefined)?.[
      ACCESS_COOKIE
    ];
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_SECRET!,
      });
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
