import { Injectable } from '@nestjs/common';
import { GameProviderAdapter, LaunchSessionParams, LaunchSessionResult } from '../interfaces/game-provider-adapter.interface.js';

@Injectable()
export class InternalGameProviderAdapter implements GameProviderAdapter {
  readonly providerId = 'internal';
  readonly providerName = 'Internal Platform Games';

  async createLaunchSession(params: LaunchSessionParams): Promise<LaunchSessionResult> {
    const rawToken = params.token;
    const timeHex = Date.now().toString(16);
    const nonce = Buffer.from(`${rawToken}_${timeHex}_${Math.random()}`).toString('hex').substring(0, 32);
    const authKey = Buffer.from(`sec_key_${rawToken}_${Date.now()}`).toString('hex');
    const sessHash = Buffer.from(`sha512_session_${rawToken}_${params.gameSlug}_${params.mode}`).toString('hex');
    const checksum = Buffer.from(`${rawToken}_checksum_rivexa_game_2026`).toString('base64url');

    const route = `/play/${params.gameSlug}?st=${encodeURIComponent(rawToken)}&sig=${authKey}&nonce=${nonce}&sess_hash=${sessHash}&v=4.12.0-sec&chk=${checksum}&scope=gaming_real_production`;

    return {
      providerSessionId: `int_sess_${params.sessionId}`,
      launchUrl: route,
      launchType: 'DIRECT_ROUTE',
      metadata: {
        gameSlug: params.gameSlug,
        mode: params.mode,
        currency: params.currency,
      },
    };
  }

  async validateProviderSession(providerSessionId: string): Promise<boolean> {
    return !!providerSessionId && providerSessionId.startsWith('int_sess_');
  }

  async closeProviderSession(providerSessionId: string): Promise<boolean> {
    return true;
  }

  verifyProviderCallback(): boolean {
    return true;
  }
}
