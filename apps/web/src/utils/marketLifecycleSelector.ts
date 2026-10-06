export const ACTIVE_MARKET_STATUSES = ['OPEN', 'SUSPENDED'];
export const INACTIVE_MARKET_STATUSES = ['CLOSED', 'SETTLED', 'VOID', 'CANCELLED', 'EXPIRED'];

export interface IMarketStatusEntity {
  id?: string;
  status: string;
  expiresAt?: string | Date | null;
}

/**
 * Single reusable selector for filtering active betting markets.
 * Only returns markets in OPEN or SUSPENDED state that have not expired.
 * Excludes CLOSED, SETTLED, VOID, CANCELLED, EXPIRED markets.
 */
export function getActiveMarkets<T extends IMarketStatusEntity>(markets: T[]): T[] {
  if (!Array.isArray(markets)) return [];
  const now = new Date();

  return markets.filter((m) => {
    const statusUpper = (m.status || '').toUpperCase();
    if (!ACTIVE_MARKET_STATUSES.includes(statusUpper)) {
      return false;
    }
    if (m.expiresAt && new Date(m.expiresAt) <= now) {
      return false;
    }
    return true;
  });
}
