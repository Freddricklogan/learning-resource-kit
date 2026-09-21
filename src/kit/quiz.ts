/** Quiz engine: pure state transitions plus a validator used by every resource's config test. */

export interface QuizItem {
  id: string;
  prompt: string;
  options: readonly string[];
  /** Index into options. */
  answer: number;
  explanation?: string;
}

export interface QuizState {
  items: readonly QuizItem[];
  /** item id -> chosen option index */
  answers: Readonly<Record<string, number>>;
}

export interface QuizScore {
  total: number;
  answered: number;
  correct: number;
  /** correct / total in [0, 1]; 0 when total is 0 */
  scaled: number;
  complete: boolean;
}

export function validateQuiz(items: readonly QuizItem[]): string[] {
  const problems: string[] = [];
  if (items.length < 3) problems.push(`need at least 3 items, got ${items.length}`);
  const ids = new Set<string>();
  items.forEach((it, i) => {
    const where = `item ${i} (${it.id || 'no id'})`;
    if (!it.id) problems.push(`${where}: missing id`);
    else if (ids.has(it.id)) problems.push(`${where}: duplicate id`);
    ids.add(it.id);
    if (!it.prompt?.trim()) problems.push(`${where}: empty prompt`);
    if (it.options.length < 3) problems.push(`${where}: fewer than 3 options`);
    if (new Set(it.options.map((o) => o.trim().toLowerCase())).size !== it.options.length) {
      problems.push(`${where}: duplicate options`);
    }
    if (it.options.some((o) => !o.trim())) problems.push(`${where}: empty option`);
    if (!Number.isInteger(it.answer) || it.answer < 0 || it.answer >= it.options.length) {
      problems.push(`${where}: answer index ${it.answer} out of range`);
    }
  });
  return problems;
}

export function createQuiz(items: readonly QuizItem[]): QuizState {
  const problems = validateQuiz(items);
  if (problems.length) throw new Error(`invalid quiz: ${problems.join('; ')}`);
  return { items, answers: {} };
}

/** Records the first answer for an item; later answers are ignored (one attempt per item). */
export function answerItem(state: QuizState, id: string, choice: number): QuizState {
  const item = state.items.find((it) => it.id === id);
  if (!item) throw new Error(`unknown quiz item ${id}`);
  if (id in state.answers) return state;
  if (!Number.isInteger(choice) || choice < 0 || choice >= item.options.length) {
    throw new RangeError(`choice ${choice} out of range for ${id}`);
  }
  return { items: state.items, answers: { ...state.answers, [id]: choice } };
}

export function isCorrect(state: QuizState, id: string): boolean | null {
  const item = state.items.find((it) => it.id === id);
  if (!item || !(id in state.answers)) return null;
  return state.answers[id] === item.answer;
}

export function scoreQuiz(state: QuizState): QuizScore {
  const total = state.items.length;
  let answered = 0;
  let correct = 0;
  for (const it of state.items) {
    if (it.id in state.answers) {
      answered += 1;
      if (state.answers[it.id] === it.answer) correct += 1;
    }
  }
  return {
    total,
    answered,
    correct,
    scaled: total === 0 ? 0 : correct / total,
    complete: total > 0 && answered === total
  };
}
