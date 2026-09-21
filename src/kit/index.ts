export { mountLearningResource, type ResourceApi, type ResourceConfig } from './mount.ts';
export { createProgress, type Progress } from './progress.ts';
export { answerItem, createQuiz, isCorrect, type QuizItem, type QuizScore, type QuizState, scoreQuiz, validateQuiz } from './quiz.ts';
export { DEFAULT_WPM, readingMinutes, sectionIndex, type SectionInfo, wordCount } from './reading.ts';
export { type KeyValueStore, memoryStore, readJson, safeLocalStore } from './storage.ts';
export { ACTIVITY_TYPES, anonymousActor, buildStatement, createStatementStore, isStatement, type Statement, type StatementStore, uuid, VERBS } from './xapi.ts';
export { type CollapsibleApi, initCollapsible } from './collapsible.ts';
