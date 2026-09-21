import './shell/exec-shell.css';
import './styles/lr-kit.css';
import './demo.css';
import { initCollapsible } from './kit/collapsible.ts';
import { mountLearningResource } from './kit/mount.ts';
import type { QuizItem } from './kit/quiz.ts';

const quiz: QuizItem[] = [
  { id: 'store', prompt: 'Where do a reader’s progress and xAPI statements go?', options: ['To a learning record store over HTTPS', 'To the reader’s own browser storage only', 'To GitHub Pages analytics'], answer: 1, explanation: 'The page’s content-security policy sets connect-src to none; the kit writes only to localStorage and degrades to memory when that is blocked.' },
  { id: 'verb', prompt: 'Which xAPI verb does the kit record when a section is opened?', options: ['completed', 'attempted', 'experienced'], answer: 2, explanation: 'Opening a section is evidence of exposure, not mastery, so the kit uses the ADL “experienced” verb; “answered” and “completed” are reserved for the quiz.' },
  { id: 'attempt', prompt: 'How many attempts does a quiz question allow?', options: ['One', 'Two', 'Unlimited'], answer: 0, explanation: 'answerItem() records the first choice and ignores later ones, so the recorded result reflects what the reader knew before the explanation appeared.' },
  { id: 'actor', prompt: 'What identifies the actor in a statement?', options: ['The reader’s email address', 'A random anonymous account name per browser', 'The GitHub username'], answer: 1, explanation: 'anonymousActor() creates an anon-xxxxxxxx name once per browser and never collects a name or email.' },
  { id: 'valid', prompt: 'What does validateQuiz() check that a resource’s config test relies on?', options: ['Spelling of the prompts', 'Ids unique, three or more distinct options, answer index in range', 'That every explanation cites a source'], answer: 1, explanation: 'The validator is structural; each resource’s config test calls it so a malformed question fails CI before it can ship.' }
];

initCollapsible();
mountLearningResource({
  title: 'Learning Resource Kit',
  tagline: 'The shared layer under ten graduate-level learning resources: Executive Shell, collapsible sections with saved progress, a quiz engine that emits xAPI 1.0.3 statements, and a print stylesheet. This page is the kit applied to itself.',
  repo: 'https://github.com/Freddricklogan/learning-resource-kit',
  pagesUrl: 'https://freddricklogan.github.io/learning-resource-kit/',
  quiz,
  quizTitle: 'Five questions on the kit'
});
