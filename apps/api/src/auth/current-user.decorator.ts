import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
}

export type AuthenticatedRequest = Request & { user: JwtPayload };

/** The id of the user authenticated by AuthGuard. */
export const UserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user.sub,
);
