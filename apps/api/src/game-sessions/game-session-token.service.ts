import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';

@Injectable()
export class GameSessionTokenService {
  /**
   * Generates a cryptographically secure opaque game-session bearer token
   * and returns both the unhashed token (to be sent once to the client)
   * and its SHA-256 hash (to be stored in PostgreSQL).
   */
  generateToken(): { rawToken: string; tokenHash: string } {
    const randomBuffer = crypto.randomBytes(32);
    const rawToken = `gs_${randomBuffer.toString('base64url')}`;
    const tokenHash = this.hashToken(rawToken);

    return { rawToken, tokenHash };
  }

  /**
   * Computes SHA-256 hash of a raw session token.
   */
  hashToken(rawToken: string): string {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new Error('Raw token must be a non-empty string.');
    }
    return crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
  }

  /**
   * Verifies a raw session token against a stored SHA-256 hash using constant-time comparison.
   */
  verifyToken(rawToken: string, storedHash: string): boolean {
    if (!rawToken || !storedHash) {
      return false;
    }
    const computedHash = this.hashToken(rawToken);
    const computedBuffer = Buffer.from(computedHash, 'utf8');
    const storedBuffer = Buffer.from(storedHash, 'utf8');

    if (computedBuffer.length !== storedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuffer, storedBuffer);
  }
}
