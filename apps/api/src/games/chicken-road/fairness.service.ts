import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class ChickenRoadFairnessService {
  /**
   * Generates a secure random 32-byte hex server seed.
   */
  generateServerSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Computes SHA-256 hash of a server seed.
   */
  hashServerSeed(serverSeed: string): string {
    return crypto.createHash('sha256').update(serverSeed).digest('hex');
  }

  /**
   * Generates a client seed if player doesn't provide one.
   */
  generateClientSeed(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generates a deterministic random float [0, 1) for a specific checkpoint
   * using HMAC-SHA256(serverSeed, clientSeed:nonce:checkpoint).
   */
  generateRandomValue(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    checkpoint: number,
  ): number {
    const message = `${clientSeed}:${nonce}:${checkpoint}`;
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(message);
    const hash = hmac.digest('hex');

    // Take the first 8 hex characters (4 bytes = 32-bit uint)
    const subHash = hash.substring(0, 8);
    const decimalValue = parseInt(subHash, 16);
    
    // Divide by 2^32 (0xFFFFFFFF = 4294967295)
    return decimalValue / 4294967295;
  }

  /**
   * Evaluates whether a checkpoint is SAFE or CRASH.
   */
  evaluateCheckpoint(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    checkpoint: number,
    safeProbability: number,
  ): { randomValue: number; isSafe: boolean } {
    const randomValue = this.generateRandomValue(serverSeed, clientSeed, nonce, checkpoint);
    const isSafe = randomValue < safeProbability;
    return { randomValue, isSafe };
  }

  /**
   * Verifies if a revealed server seed matches the pre-game server seed hash.
   */
  verifySeed(serverSeed: string, serverSeedHash: string): boolean {
    return this.hashServerSeed(serverSeed) === serverSeedHash;
  }

  /**
   * Provably fair verification helper for a completed round.
   */
  verifyRoundCheckpoints(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    safeProbability: number,
    maxCheckpoints = 25,
  ): Array<{ checkpoint: number; randomValue: number; isSafe: boolean }> {
    const results = [];
    for (let cp = 1; cp <= maxCheckpoints; cp++) {
      const outcome = this.evaluateCheckpoint(serverSeed, clientSeed, nonce, cp, safeProbability);
      results.push({
        checkpoint: cp,
        randomValue: outcome.randomValue,
        isSafe: outcome.isSafe,
      });
    }
    return results;
  }
}
