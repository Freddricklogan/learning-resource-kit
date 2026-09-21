import { describe, expect, it } from 'vitest';
import { answerItem, createQuiz, isCorrect, type QuizItem, scoreQuiz, validateQuiz } from '../src/kit/quiz.ts';

const items: QuizItem[] = [
  { id: 'a', prompt: 'A?', options: ['1', '2', '3'], answer: 0 },
  { id: 'b', prompt: 'B?', options: ['1', '2', '3'], answer: 1 },
  { id: 'c', prompt: 'C?', options: ['1', '2', '3', '4'], answer: 3, explanation: 'because' }
];

describe('validateQuiz', () => {
  it('accepts a well-formed quiz', () => {
    expect(validateQuiz(items)).toEqual([]);
  });
  it('reports every defect with the item position', () => {
    const bad: QuizItem[] = [
      { id: '', prompt: ' ', options: ['x', 'x', ''], answer: 5 },
      { id: 'dup', prompt: 'p', options: ['a', 'b'], answer: 0 },
      { id: 'dup', prompt: 'p', options: ['a', 'b', 'c'], answer: -1 }
    ];
    const problems = validateQuiz(bad);
    expect(problems).toContain('item 0 (no id): missing id');
    expect(problems).toContain('item 0 (no id): empty prompt');
    expect(problems).toContain('item 0 (no id): duplicate options');
    expect(problems).toContain('item 0 (no id): empty option');
    expect(problems).toContain('item 0 (no id): answer index 5 out of range');
    expect(problems).toContain('item 1 (dup): fewer than 3 options');
    expect(problems).toContain('item 2 (dup): duplicate id');
    expect(problems).toContain('item 2 (dup): answer index -1 out of range');
  });
  it('requires at least three items', () => {
    expect(validateQuiz(items.slice(0, 2))[0]).toMatch(/at least 3/);
    expect(() => createQuiz(items.slice(0, 2))).toThrow(/invalid quiz/);
  });
});

describe('answer and score', () => {
  it('scores first attempts only and ignores repeats', () => {
    let s = createQuiz(items);
    expect(scoreQuiz(s)).toEqual({ total: 3, answered: 0, correct: 0, scaled: 0, complete: false });
    s = answerItem(s, 'a', 0);
    s = answerItem(s, 'a', 2); // ignored
    expect(isCorrect(s, 'a')).toBe(true);
    s = answerItem(s, 'b', 0);
    expect(isCorrect(s, 'b')).toBe(false);
    expect(isCorrect(s, 'c')).toBeNull();
    expect(scoreQuiz(s)).toMatchObject({ answered: 2, correct: 1, complete: false });
    s = answerItem(s, 'c', 3);
    expect(scoreQuiz(s)).toEqual({ total: 3, answered: 3, correct: 2, scaled: 2 / 3, complete: true });
  });
  it('rejects unknown items and out-of-range choices', () => {
    const s = createQuiz(items);
    expect(() => answerItem(s, 'zz', 0)).toThrow(/unknown/);
    expect(() => answerItem(s, 'a', 3)).toThrow(RangeError);
    expect(isCorrect(s, 'zz')).toBeNull();
  });
  it('scores an empty state as zero without dividing by zero', () => {
    expect(scoreQuiz({ items: [], answers: {} })).toEqual({ total: 0, answered: 0, correct: 0, scaled: 0, complete: false });
  });
});
