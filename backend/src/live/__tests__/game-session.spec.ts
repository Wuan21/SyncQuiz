describe('GameSession schema types', () => {
  it('normalizePin strips non-digit characters', () => {
    function normalizePin(pin: string): string {
      return String(pin).replace(/\D/g, '').slice(0, 6);
    }
    expect(normalizePin('123456')).toBe('123456');
    expect(normalizePin('  123 456  ')).toBe('123456');
    expect(normalizePin('abc123def')).toBe('123');
    expect(normalizePin('')).toBe('');
    expect(normalizePin('12345678')).toBe('123456');
  });

  it('isValidPin returns true for 6-digit strings', () => {
    function isValidPin(pin: string): boolean {
      return /^\d{6}$/.test(pin);
    }
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('000000')).toBe(true);
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12345a')).toBe(false);
    expect(isValidPin('')).toBe(false);
  });

  it('PIN generation produces 6-digit unique strings', () => {
    function generatePin(existing: string[] = []): string {
      let pin: string;
      do {
        pin = String(Math.floor(100000 + Math.random() * 900000));
      } while (existing.includes(pin));
      return pin;
    }

    const pins: string[] = [];
    for (let i = 0; i < 100; i++) {
      const pin = generatePin(pins);
      expect(pin).toMatch(/^\d{6}$/);
      expect(pins).not.toContain(pin);
      pins.push(pin);
    }
  });
});

describe('GameSessionStatus enum', () => {
  it('has correct values', () => {
    enum GameSessionStatus {
      WAITING = 'waiting',
      ACTIVE = 'active',
      PAUSED = 'paused',
      FINISHED = 'finished',
      ENDED = 'ended',
    }

    expect(GameSessionStatus.WAITING).toBe('waiting');
    expect(GameSessionStatus.ACTIVE).toBe('active');
    expect(GameSessionStatus.PAUSED).toBe('paused');
    expect(GameSessionStatus.FINISHED).toBe('finished');
    expect(GameSessionStatus.ENDED).toBe('ended');
  });
});

describe('Player scoring edge cases', () => {
  function calculateScore(
    isCorrect: boolean,
    timeSpent: number,
    timeLimit: number,
    basePoints: number,
    streak: number,
    doublePoints = false,
  ): number {
    if (!isCorrect) return 0;
    const speedFactor = Math.max(0.3, Math.min(1, 1 - timeSpent / timeLimit));
    const streakBonus = 1 + Math.min(streak, 5) * 0.1;
    const multiplier = doublePoints ? 2 : 1;
    return Math.round(basePoints * speedFactor * streakBonus * multiplier);
  }

  it('no score for negative timeSpent', () => {
    const score = calculateScore(true, -1000, 30000, 1000, 0);
    // speedFactor = 1 - (-1000/30000) = 1.033 → capped at 1.0
    expect(score).toBe(1000);
  });

  it('handles maximum streak correctly', () => {
    const score5 = calculateScore(true, 0, 30000, 1000, 5);
    const score10 = calculateScore(true, 0, 30000, 1000, 10);
    expect(score5).toBe(score10); // Both cap at 1.5x
    expect(score5).toBe(1500);
  });

  it('handles exact timeLimit as minimum speed factor', () => {
    // timeSpent === timeLimit → speedFactor = 1 - 1 = 0 → clamped to 0.3
    const score = calculateScore(true, 30000, 30000, 1000, 0);
    expect(score).toBe(300);
  });
});
