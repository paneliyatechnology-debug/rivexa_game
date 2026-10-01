import { IGameBet, ICrashRound, IGameManifest } from '@gaming-platform/types';

export interface GameSDKConfig {
  gameSlug: string;
  apiBaseUrl?: string;
  wsBaseUrl?: string;
}

export type EventCallback = (data: any) => void;

export class PlatformGameSDK {
  private gameSlug: string;
  private apiBaseUrl: string;
  private wsBaseUrl: string;
  private sessionToken: string | null = null;
  private listeners: Map<string, EventCallback[]> = new Map();

  constructor(config: GameSDKConfig) {
    this.gameSlug = config.gameSlug;
    this.apiBaseUrl = config.apiBaseUrl || '/api/v1';
    this.wsBaseUrl = config.wsBaseUrl || '';
  }

  public setToken(token: string): void {
    this.sessionToken = token;
  }

  public on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach((cb) => cb(data));
  }

  public async getManifest(): Promise<IGameManifest> {
    const res = await fetch(`${this.apiBaseUrl}/games/${this.gameSlug}`);
    const json = await res.json();
    return json.data;
  }

  public async placeBet(betAmount: number, betDetails: Record<string, any> = {}): Promise<IGameBet> {
    if (!this.sessionToken) {
      throw new Error('Authentication token is required to place bets.');
    }

    const res = await fetch(`${this.apiBaseUrl}/games/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        gameSlug: this.gameSlug,
        betAmount,
        betDetails,
      }),
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Failed to place bet.');
    }

    this.emit('BET_PLACED', json.data);
    return json.data;
  }

  public async cashout(roundId?: string): Promise<{ multiplier: number; payout: number }> {
    if (!this.sessionToken) {
      throw new Error('Authentication token is required to cash out.');
    }

    const res = await fetch(`${this.apiBaseUrl}/games/${this.gameSlug}/cashout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({ roundId }),
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Cashout failed.');
    }

    this.emit('CASHOUT_SUCCESS', json.data);
    return json.data;
  }
}
