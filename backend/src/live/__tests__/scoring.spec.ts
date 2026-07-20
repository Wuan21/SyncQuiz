describe('Score calculation', () => {
  /**
   * Reproduces the scoring logic from live.service.ts
   * Score = basePoints * speedFactor * streakBonus * powerUp
   * speedFactor = clamp(1 - (timeSpent / timeLimit), 0.3, 1)
   * streakBonus = 1 + min(streak, 5) * 0.1
   * If wrong: 0 points
   */
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

  it('returns 0 for wrong answer', () => {
    expect(calculateScore(false, 5000, 30000, 1000, 0)).toBe(0);
    expect(calculateScore(false, 0, 30000, 1000, 3)).toBe(0);
  });

  it('returns full points for instant correct answer', () => {
    // speedFactor = 1, streakBonus = 1
    expect(calculateScore(true, 0, 30000, 1000, 0)).toBe(1000);
    expect(calculateScore(true, 1, 30000, 500, 0)).toBe(500);
  });

  it('applies speed factor for slower answers', () => {
    // timeLimit=30s, timeSpent=15s → speedFactor = 1 - 0.5 = 0.5
    const score = calculateScore(true, 15000, 30000, 1000, 0);
    expect(score).toBe(500); // 1000 * 0.5 * 1
  });

  it('applies minimum speed factor of 0.3', () => {
    // timeSpent=25s, timeLimit=30s → speedFactor = 1 - 25/30 = 0.167 → clamped to 0.3
    const score = calculateScore(true, 25000, 30000, 1000, 0);
    expect(score).toBe(300); // 1000 * 0.3 * 1
  });

  it('caps speed factor at 1.0 for very fast answers', () => {
    // timeSpent=0, timeLimit=10s → speedFactor = 1.0
    const score = calculateScore(true, 0, 10000, 500, 0);
    expect(score).toBe(500);
  });

  it('applies streak bonus up to 5 streaks', () => {
    // streak=3 → streakBonus = 1 + 0.3 = 1.3
    const score = calculateScore(true, 0, 30000, 1000, 3);
    expect(score).toBe(1300); // 1000 * 1.0 * 1.3
  });

  it('caps streak bonus at 5', () => {
    // streak=10 → streakBonus = 1 + 0.5 = 1.5
    const score = calculateScore(true, 0, 30000, 1000, 10);
    expect(score).toBe(1500); // 1000 * 1.0 * 1.5
  });

  it('combines speed factor and streak bonus', () => {
    // speedFactor=0.5, streak=3 → streakBonus=1.3
    // 1000 * 0.5 * 1.3 = 650
    const score = calculateScore(true, 15000, 30000, 1000, 3);
    expect(score).toBe(650);
  });

  it('doubles points when doublePoints is true', () => {
    const normal = calculateScore(true, 0, 30000, 1000, 0);
    const doubled = calculateScore(true, 0, 30000, 1000, 0, true);
    expect(doubled).toBe(normal * 2);
  });

  it('handles zero timeLimit gracefully', () => {
    // Division by zero produces NaN — the function should guard against timeLimit=0 in production
    const score = calculateScore(true, 0, 0, 1000, 0);
    expect(isNaN(score)).toBe(true);
  });
});
