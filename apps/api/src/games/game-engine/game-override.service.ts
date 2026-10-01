import { Injectable } from '@nestjs/common';

@Injectable()
export class GameOverrideService {
  private overrides = new Map<string, string>();

  public setOverride(gameId: string, result: any): string | null {
    const cleanId = (gameId || '').toLowerCase().trim();
    const target = String(result ?? '').trim();
    if (!target || target === 'AUTO' || target === 'NONE' || target === 'CLEAR') {
      this.overrides.delete(cleanId);
      return null;
    }
    this.overrides.set(cleanId, target);
    return target;
  }

  public getOverride(gameId: string): string | null {
    const cleanId = (gameId || '').toLowerCase().trim();
    return this.overrides.get(cleanId) || null;
  }

  public clearOverride(gameId: string): void {
    const cleanId = (gameId || '').toLowerCase().trim();
    this.overrides.delete(cleanId);
  }

  public getAllOverrides(): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const [key, value] of this.overrides.entries()) {
      obj[key] = value;
    }
    return obj;
  }
}
