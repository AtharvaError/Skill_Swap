import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/current-user.decorator';

/**
 * Admins are listed by email in ADMIN_EMAILS (comma-separated). Signed-in
 * email addresses are lower-cased at signup and cannot be changed, so the
 * email in the verified access token is enough to decide.
 */
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/** Use after AuthGuard, which puts the verified token on the request. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!isAdminEmail(request.user?.email)) {
      throw new ForbiddenException('Admins only');
    }
    return true;
  }
}
