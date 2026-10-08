import { createHash } from 'crypto';

export const DEFAULT_DEMO_UUID = '00000000-0000-4000-a000-000000000000';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;

/**
 * Converts any userId input (UUID, guest_id, session token, Bearer JWT, username)
 * into a 100% deterministic, valid PostgreSQL UUID format.
 */
export function toValidUserId(userId?: string | null): string {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return DEFAULT_DEMO_UUID;
  }

  const trimmed = userId.replace(/^Bearer\s+/i, '').trim();

  // 1. If already a valid standalone UUID or contains an embedded UUID (e.g. jwt_session_<uuid>_<timestamp>)
  const embeddedUuid = trimmed.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  if (embeddedUuid) {
    return embeddedUuid[0].toLowerCase();
  }

  // 2. If passed a JWT Token string, extract sub/id/userId from payload
  const parts = trimmed.split('.');
  if (parts.length === 3) {
    try {
      const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);
      const extracted = payload.id || payload.userId || payload.sub || payload.user?.id;
      if (extracted && typeof extracted === 'string' && extracted.trim().length > 0) {
        const trimmedExt = extracted.trim();
        const extUuid = trimmedExt.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
        if (extUuid) {
          return extUuid[0].toLowerCase();
        }
        return hashToUuid(trimmedExt);
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Deterministically hash any other string (guest_*, demo_*, session_*, username) into a valid UUID
  return hashToUuid(trimmed);
}

function hashToUuid(input: string): string {
  const hash = createHash('sha256').update(input).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
