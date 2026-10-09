export interface LaunchSessionParams {
  sessionId: string;
  userId: string;
  gameId: string;
  gameSlug: string;
  mode: string;
  currency: string;
  token: string;
  metadata?: Record<string, any>;
}

export interface LaunchSessionResult {
  providerSessionId?: string;
  launchUrl: string;
  launchType: 'IFRAME' | 'REDIRECT' | 'DIRECT_ROUTE';
  token?: string;
  expiresInSeconds?: number;
  metadata?: Record<string, any>;
}

export interface GameProviderAdapter {
  readonly providerId: string;
  readonly providerName: string;

  createLaunchSession(params: LaunchSessionParams): Promise<LaunchSessionResult>;
  validateProviderSession?(providerSessionId: string, metadata?: Record<string, any>): Promise<boolean>;
  closeProviderSession?(providerSessionId: string): Promise<boolean>;
  verifyProviderCallback?(payload: any, signature?: string): boolean;
  parseProviderError?(error: any): { code: string; message: string };
}
