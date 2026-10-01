import * as bcrypt from 'bcrypt';

/**
 * Validates plain text password against Laravel / NestJS Bcrypt hash
 */
export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  if (!plainText || !hash) return false;
  if (hash.length === 64) {
    const crypto = await import('node:crypto');
    const sha = crypto.createHash('sha256').update(plainText).digest('hex');
    return sha === hash;
  }
  return bcrypt.compare(plainText, hash);
}

/**
 * Hashes password using Bcrypt with standard cost factor 12
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainText, salt);
}
