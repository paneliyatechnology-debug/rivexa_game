import { describe, it, expect, beforeEach } from 'vitest';
import { GameSessionTokenService } from './game-session-token.service.js';

describe('GameSessionTokenService', () => {
  let tokenService: GameSessionTokenService;

  beforeEach(() => {
    tokenService = new GameSessionTokenService();
  });

  it('should generate a unique raw token with prefix and high entropy', () => {
    const { rawToken, tokenHash } = tokenService.generateToken();

    expect(rawToken).toBeDefined();
    expect(rawToken.startsWith('gs_')).toBe(true);
    expect(rawToken.length).toBeGreaterThan(40);
    expect(tokenHash).toBeDefined();
    expect(tokenHash.length).toBe(64); // SHA-256 hex string length
  });

  it('should generate distinct raw tokens and hashes on consecutive calls', () => {
    const token1 = tokenService.generateToken();
    const token2 = tokenService.generateToken();

    expect(token1.rawToken).not.toBe(token2.rawToken);
    expect(token1.tokenHash).not.toBe(token2.tokenHash);
  });

  it('should hash token deterministically using SHA-256', () => {
    const rawToken = 'gs_test_token_1234567890_abcdefghijklmnopqrstuvwxyz';
    const hash1 = tokenService.hashToken(rawToken);
    const hash2 = tokenService.hashToken(rawToken);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(rawToken);
  });

  it('should verify valid token against stored SHA-256 hash', () => {
    const { rawToken, tokenHash } = tokenService.generateToken();
    const isValid = tokenService.verifyToken(rawToken, tokenHash);

    expect(isValid).toBe(true);
  });

  it('should reject invalid or tampered token during verification', () => {
    const { rawToken, tokenHash } = tokenService.generateToken();
    const tamperedToken = rawToken + '_extra';
    const isValid = tokenService.verifyToken(tamperedToken, tokenHash);

    expect(isValid).toBe(false);
  });
});
