import { evaluateCondition } from "../condition-evaluator/condition-evaluator";
import { runEvent, runEvents } from "../event-runner/event-runner";
import type { GameEvent } from "../../types/event";
import type { GameProgressState } from "../../types/progress";
import type { LoadedStory } from "../../types/story";

const MAX_SYNC_PASSES = 20;

export class ChapterEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChapterEngineError";
  }
}

function assertActiveChapter(
  story: LoadedStory,
  state: GameProgressState
) {
  if (!state.currentChapterId) {
    throw new ChapterEngineError("当前没有进行中的章节");
  }

  const chapter = story.chapters[state.currentChapterId];

  if (!chapter) {
    throw new ChapterEngineError(
      `当前章节不存在：${state.currentChapterId}`
    );
  }

  return chapter;
}

function synchronizePass(
  story: LoadedStory,
  state: GameProgressState
): GameProgressState {
  const chapter = assertActiveChapter(story, state);
  let next = state;

  for (const contentId of chapter.contentIds) {
    const item = story.content[contentId];

    if (
      item &&
      evaluateCondition(item.unlockCondition, next) &&
      !next.unlockedContentIds.includes(contentId)
    ) {
      next = runEvent(next, {
        type: "unlockContent",
        contentId
      });
    }
  }

  for (const dialogueId of chapter.dialogueIds) {
    const node = story.dialogues[dialogueId];

    if (
      node &&
      evaluateCondition(node.entryCondition, next) &&
      !next.unlockedDialogueIds.includes(dialogueId)
    ) {
      next = runEvent(next, {
        type: "unlockDialogue",
        dialogueId
      });
    }
  }

  for (const reasoningId of chapter.reasoningIds) {
    const node = story.reasoning[reasoningId];

    if (
      node &&
      evaluateCondition(node.entryCondition, next) &&
      !next.unlockedReasoningIds.includes(reasoningId)
    ) {
      next = runEvent(next, {
        type: "unlockReasoning",
        reasoningId
      });
    }
  }

  for (const item of Object.values(story.evidence)) {
    if (
      item.chapterId === chapter.id &&
      evaluateCondition(item.collectCondition, next) &&
      !next.collectedEvidenceIds.includes(item.id)
    ) {
      next = runEvent(next, {
        type: "collectEvidence",
        evidenceId: item.id
      });
    }
  }

  for (const objective of chapter.objectives) {
    if (
      evaluateCondition(objective.completionCondition, next) &&
      !next.completedObjectiveIds.includes(objective.id)
    ) {
      next = runEvent(next, {
        type: "completeObjective",
        objectiveId: objective.id
      });
    }
  }

  if (
    evaluateCondition(chapter.completionCondition, next) &&
    next.chapterStage !== "result" &&
    next.chapterStage !== "completed"
  ) {
    next = runEvent(next, {
      type: "setChapterStage",
      stage: "result"
    });
  }

  return next;
}

export function synchronizeChapter(
  story: LoadedStory,
  state: GameProgressState
): GameProgressState {
  let current = state;

  for (let pass = 0; pass < MAX_SYNC_PASSES; pass += 1) {
    const next = synchronizePass(story, current);

    if (next === current) {
      return current;
    }

    current = next;
  }

  throw new ChapterEngineError(
    `章节 ${state.currentChapterId ?? "unknown"} 的自动解锁未能收敛`
  );
}

export function enterChapter(
  story: LoadedStory,
  state: GameProgressState,
  chapterId: string
): GameProgressState {
  const chapter = story.chapters[chapterId];

  if (!chapter) {
    throw new ChapterEngineError(`无法进入不存在的章节：${chapterId}`);
  }

  if (!evaluateCondition(chapter.entryCondition, state)) {
    throw new ChapterEngineError(`章节尚未满足进入条件：${chapterId}`);
  }

  const enteredState: GameProgressState = {
    ...state,
    currentChapterId: chapterId,
    chapterStage: "not-started",
    completedObjectiveIds: []
  };

  return synchronizeChapter(
    story,
    runEvents(enteredState, chapter.initialEvents)
  );
}

export function dispatchChapterEvents(
  story: LoadedStory,
  state: GameProgressState,
  events: GameEvent[]
): GameProgressState {
  assertActiveChapter(story, state);
  return synchronizeChapter(story, runEvents(state, events));
}

export function viewContent(
  story: LoadedStory,
  state: GameProgressState,
  contentId: string
): GameProgressState {
  const item = story.content[contentId];

  if (!item || !state.unlockedContentIds.includes(contentId)) {
    throw new ChapterEngineError(`调查材料尚未开放：${contentId}`);
  }

  return dispatchChapterEvents(story, state, item.onViewEvents);
}

export function discoverObservation(
  story: LoadedStory,
  state: GameProgressState,
  observationId: string
): GameProgressState {
  const observation = story.observations[observationId];

  if (!observation) {
    throw new ChapterEngineError(`观察不存在：${observationId}`);
  }

  const hasViewedSource = observation.sourceContentIds.some((contentId) =>
    state.viewedContentIds.includes(contentId)
  );

  if (
    !hasViewedSource ||
    !evaluateCondition(observation.discoverCondition, state)
  ) {
    throw new ChapterEngineError(`尚未满足观察发现条件：${observationId}`);
  }

  return dispatchChapterEvents(story, state, [
    {
      type: "discoverObservation",
      observationId
    },
    ...observation.onDiscoverEvents
  ]);
}

export function completeActiveChapter(
  story: LoadedStory,
  state: GameProgressState
): GameProgressState {
  const chapter = assertActiveChapter(story, state);

  if (!evaluateCondition(chapter.completionCondition, state)) {
    throw new ChapterEngineError(`章节尚未满足完成条件：${chapter.id}`);
  }

  const completed = runEvent(state, {
    type: "completeChapter",
    chapterId: chapter.id
  });

  if (!chapter.nextChapterId) {
    return completed;
  }

  return enterChapter(story, completed, chapter.nextChapterId);
}
