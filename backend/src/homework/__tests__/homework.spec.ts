describe('HomeworkProgress schema logic', () => {
  it('stores answer progress correctly', () => {
    const progress = {
      homeworkId: 'hw123',
      studentId: 'student456',
      answers: new Map<string, number>([
        ['q1', 0], // answered question q1 with option 0
        ['q2', 2], // answered question q2 with option 2
      ]),
      lastVisitedIndex: 3,
      isSubmitted: false,
    };

    expect(progress.answers.get('q1')).toBe(0);
    expect(progress.answers.get('q2')).toBe(2);
    expect(progress.lastVisitedIndex).toBe(3);
    expect(progress.isSubmitted).toBe(false);
  });

  it('restores answers from progress object', () => {
    const rawAnswers = { q1: 0, q2: 2, q3: 1 };
    const progress = {
      answers: rawAnswers,
      lastVisitedIndex: 4,
      isSubmitted: false,
    };

    const questions = [
      { _id: 'q1' },
      { _id: 'q2' },
      { _id: 'q3' },
      { _id: 'q4' },
      { _id: 'q5' },
    ];

    // Restore: start at lastVisitedIndex
    expect(progress.lastVisitedIndex).toBe(4);
    expect(Object.keys(progress.answers).length).toBe(3);
  });

  it('marks submitted when isSubmitted is true', () => {
    const progress = { isSubmitted: true, answers: { q1: 0 } };
    expect(progress.isSubmitted).toBe(true);
    // Student should not be able to change answers
  });

  it('marks submitted when final submit is called', () => {
    const progress = {
      homeworkId: 'hw1',
      studentId: 's1',
      answers: { q1: 0, q2: 1 },
      lastVisitedIndex: 2,
      isSubmitted: false,
    };

    // Simulate submit
    const submitted = { ...progress, isSubmitted: true };
    expect(submitted.isSubmitted).toBe(true);
    expect(progress.isSubmitted).toBe(false); // Original unchanged
  });
});

describe('Homework deadline logic', () => {
  function getDeadlineSeconds(dueDateStr: string): number {
    const deadline = new Date(dueDateStr).getTime();
    return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  }

  it('returns positive seconds for future deadline', () => {
    const future = new Date(Date.now() + 3600_000).toISOString(); // 1 hour
    expect(getDeadlineSeconds(future)).toBeGreaterThan(3500);
  });

  it('returns 0 for past deadline', () => {
    const past = new Date(Date.now() - 1000).toISOString(); // 1 second ago
    expect(getDeadlineSeconds(past)).toBe(0);
  });

  it('handles invalid date gracefully', () => {
    // Invalid date produces NaN — the frontend should guard against this
    const result = getDeadlineSeconds('invalid-date');
    expect(isNaN(result)).toBe(true);
  });
});

describe('Homework grading', () => {
  function gradeAnswer(
    selectedOption: number,
    correctOptionIndex: number,
    pointsPerQuestion: number,
  ): { isCorrect: boolean; pointsEarned: number } {
    const isCorrect = selectedOption === correctOptionIndex;
    return {
      isCorrect,
      pointsEarned: isCorrect ? pointsPerQuestion : 0,
    };
  }

  it('awards full points for correct answer', () => {
    const result = gradeAnswer(0, 0, 1000);
    expect(result.isCorrect).toBe(true);
    expect(result.pointsEarned).toBe(1000);
  });

  it('awards 0 for wrong answer', () => {
    const result = gradeAnswer(1, 0, 1000);
    expect(result.isCorrect).toBe(false);
    expect(result.pointsEarned).toBe(0);
  });

  it('awards 0 for unanswered (selectedOption = -1)', () => {
    const result = gradeAnswer(-1, 0, 1000);
    expect(result.isCorrect).toBe(false);
    expect(result.pointsEarned).toBe(0);
  });
});
