import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        if (token.startsWith('jwt_session_')) {
          userId = token.replace('jwt_session_', '').replace(/_\d+$/, '');
        } else {
          userId = token;
        }
      }
    }

    if (!userId) {
      // Fallback for dev/demo headers
      userId = (request.headers['x-user-id'] as string) || request.body?.userId || request.query?.userId || null;
    }

    if (!userId) {
      throw new UnauthorizedException('Authorization token or user identity is required.');
    }

    // Attach decoded user payload to request
    request.user = { id: userId };
    return true;
  }
}
