import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CricApiProvider } from '../providers/cricapi.provider.js';
import { CricketDataService } from '../cricket-data.service.js';

describe('Cricket Data Provider (CricAPI Integration)', () => {
  let provider: CricApiProvider;

  beforeEach(() => {
    provider = new CricApiProvider();
    vi.restoreAllMocks();
  });

  // 1. Capability Registry & Unsupported Market Handling
  describe('Capability Registry', () => {
    it('should explicitly register supported and unsupported capabilities without fake odds', () => {
      const caps = provider.getCapabilities();
      expect(caps.liveScore.supported).toBe(true);
      expect(caps.matchSquad.supported).toBe(true);
      expect(caps.matchesList.supported).toBe(true);
      expect(caps.seriesList.supported).toBe(true);

      // Section 10 verification
      expect(caps.exchangeBackLayOdds.supported).toBe(false);
      expect(caps.sessionFancyMarkets.supported).toBe(false);
      expect(caps.bookmakerOdds.supported).toBe(false);
      expect(caps.matchOdds.supported).toBe(false);
      expect(caps.exchangeBackLayOdds.notes).toContain('Not available from current provider');
    });
  });

  // 2. Secret Protection & URL Sanitization
  describe('Security & Secrets Protection', () => {
    it('should not leak API keys in public responses or logged strings', async () => {
      process.env.CRICAPI_API_KEY = 'secret_test_key_12345';
      const caps = provider.getCapabilities();
      const stringified = JSON.stringify(caps);
      expect(stringified).not.toContain('secret_test_key_12345');
    });
  });

  // 3. Match List & Detail Mapping
  describe('Data Mapping & Parsing', () => {
    it('should correctly map raw CricAPI match JSON into normalized ProviderMatch objects', async () => {
      const mockRawMatch = {
        id: 'test-match-101',
        name: 'India vs Australia, 1st T20I',
        matchType: 't20',
        status: 'Live score',
        venue: 'M. Chinnaswamy Stadium, Bengaluru',
        date: '2026-10-01',
        dateTimeGMT: '2026-10-01T13:30:00',
        teams: ['India', 'Australia'],
        teamInfo: [
          { name: 'India', shortname: 'IND', img: 'https://cricapi.com/img/ind.png' },
          { name: 'Australia', shortname: 'AUS', img: 'https://cricapi.com/img/aus.png' },
        ],
        score: [
          { r: 185, w: 4, o: 20, inning: 'India Inning 1' },
          { r: 120, w: 6, o: 15.2, inning: 'Australia Inning 1' },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          json: async () => ({ status: 'success', data: [mockRawMatch] }),
        } as Response;
      });

      const matches = await provider.getMatches(0);
      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe('test-match-101');
      expect(matches[0].matchType).toBe('T20');
      expect(matches[0].teams).toEqual(['India', 'Australia']);
      expect(matches[0].score).toHaveLength(2);
      expect(matches[0].score![0].r).toBe(185);
    });

    it('should handle missing, null, or empty fields gracefully without crashing', async () => {
      const mockIncompleteMatch = {
        id: 'test-incomplete-001',
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          json: async () => ({ status: 'success', data: [mockIncompleteMatch] }),
        } as Response;
      });

      const matches = await provider.getMatches(0);
      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe('test-incomplete-001');
      expect(matches[0].name).toBe('Cricket Match');
      expect(matches[0].teams).toEqual([]);
      expect(matches[0].venue).toBe('TBA');
    });

    it('should correctly map squad players with team roles', async () => {
      const mockRawSquad = [
        {
          teamName: 'India',
          players: [
            { id: 'p1', name: 'Rohit Sharma', role: 'Batsman', country: 'India' },
            { id: 'p2', name: 'Rishabh Pant', role: 'Wicketkeeper', country: 'India' },
          ],
        },
      ];

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          json: async () => ({ status: 'success', data: mockRawSquad }),
        } as Response;
      });

      const squad = await provider.getMatchSquad('test-match-101');
      expect(squad).not.toBeNull();
      expect(squad?.teams).toHaveLength(1);
      expect(squad?.teams[0].players).toHaveLength(2);
      expect(squad?.teams[0].players[0].name).toBe('Rohit Sharma');
    });
  });

  // 4. API Error Handling, Timeout & Failures
  describe('Resilience & Error Handling', () => {
    it('should return empty list gracefully on HTTP 500 or provider failures', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as Response;
      });

      const matches = await provider.getCurrentMatches();
      expect(matches).toEqual([]);
    });

    it('should return null gracefully if API key is invalid (status: failure)', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          json: async () => ({ status: 'failure', reason: 'Invalid API Key' }),
        } as Response;
      });

      const squad = await provider.getMatchSquad('any-id');
      expect(squad).toBeNull();
    });
  });
});
