import { Injectable } from '@nestjs/common';
import { GameProviderAdapter, LaunchSessionParams, LaunchSessionResult } from '../interfaces/game-provider-adapter.interface.js';

@Injectable()
export class MockGameProviderAdapter implements GameProviderAdapter {
  readonly providerId = 'mock-provider';
  readonly providerName = 'Mock Third-Party Provider';

  async createLaunchSession(params: LaunchSessionParams): Promise<LaunchSessionResult> {
    const mockProviderSessionId = `mock_p_sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const launchUrl = `/mock-provider/launcher?gameId=${encodeURIComponent(params.gameId)}&providerToken=${encodeURIComponent(mockProviderSessionId)}&mode=${encodeURIComponent(params.mode)}`;

    return {
      providerSessionId: mockProviderSessionId,
      launchUrl,
      launchType: 'IFRAME',
      expiresInSeconds: 600,
      metadata: {
        provider: 'mock-provider',
        gameId: params.gameId,
      },
    };
  }

  async validateProviderSession(providerSessionId: string): Promise<boolean> {
    return !!providerSessionId && providerSessionId.startsWith('mock_p_sess_');
  }

  async closeProviderSession(providerSessionId: string): Promise<boolean> {
    return true;
  }

  verifyProviderCallback(payload: any, signature?: string): boolean {
    if (!signature) return false;
    return signature.length > 0;
  }

  parseProviderError(error: any): { code: string; message: string } {
    return {
      code: error?.code || 'MOCK_PROVIDER_ERROR',
      message: error?.message || 'Mock provider error occurred',
    };
  }
}
