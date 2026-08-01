import { evaluateCondition } from "../condition-evaluator/condition-evaluator";
import { initializeDetectiveBoards } from "../detective-board/detective-board";
import { runEvent, runEvents } from "../event-runner/event-runner";
import { initializeRelationships } from "../relationship-engine/relationship-engine";
import type { GameEvent } from "../../types/event";
import type {
  ChapterProgressRecord,
  GameProgressState
} from "../../types/progress";
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

function sameStringArray(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  );
}

function writeChapterProgress(
  story: LoadedStory,
  state: GameProgressState,
  chapterId: string,
  overrides: Partial<ChapterProgressRecord> = {}
): GameProgressState {
  const chapter = story.chapters[chapterId];
  const previous = state.chapterProgressById[chapterId];
  const completedObjectiveIds =
    overrides.completedObjectiveIds ??
    (state.currentChapterId === chapterId
      ? chapter?.objectives
          .map((objective) => objective.id)
          .filter((id) => state.completedObjectiveIds.includes(id)) ?? []
      : previous?.completedObjectiveIds ?? []);
  const completed = state.completedChapterIds.includes(chapterId);
  const status =
    overrides.status ??
    (completed
      ? "completed"
      : state.currentChapterId === chapterId
        ? "in-progress"
        : state.unlockedChapterIds.includes(chapterId)
          ? "unlocked"
          : "locked");
  const stage =
    overrides.stage ??
    (completed
      ? "completed"
      : state.currentChapterId === chapterId
        ? state.chapterStage
        : previous?.stage ?? "not-started");
  const progressPercent =
    overrides.progressPercent ??
    (completed
      ? 100
      : chapter && chapter.objectives.length > 0
        ? Math.round(
            (completedObjectiveIds.length / chapter.objectives.length) * 100
          )
        : previous?.progressPercent ?? 0);
  const nextRecord: ChapterProgressRecord = {
    status,
    stage,
    completedObjectiveIds,
    progressPercent
  };

  if (
    previous &&
    previous.status === nextRecord.status &&
    previous.stage === nextRecord.stage &&
    previous.progressPercent === nextRecord.progressPercent &&
    sameStringArray(
      previous.completedObjectiveIds,
      nextRecord.completedObjectiveIds
    )
  ) {
    return state;
  }

  return {
    ...state,
    chapterProgressById: {
      ...state.chapterProgressById,
      [chapterId]: nextRecord
    }
  };
}

export function synchronizeChapterUnlocks(
  story: LoadedStory,
  state: GameProgressState
): GameProgressState {
  let next = initializeDetectiveBoards(
    story,
    initializeRelationships(story, state)
  );

  for (let pass = 0; pass < MAX_SYNC_PASSES; pass += 1) {
    let changed = false;

    for (const chapter of story.chapterManifest.chapters) {
      if (
        next.unlockedChapterIds.includes(chapter.id) ||
        !evaluateCondition(chapter.unlockCondition, next)
      ) {
        continue;
      }

      next = {
        ...next,
        unlockedChapterIds: [...next.unlockedChapterIds, chapter.id]
      };
      next = writeChapterProgress(story, next, chapter.id, {
        status: next.completedChapterIds.includes(chapter.id)
          ? "completed"
          : "unlocked"
      });
      changed = true;
    }

    if (!changed) {
      return next;
    }
  }

  throw new ChapterEngineError("章节清单解锁条件未能收敛");
}

export function saveActiveChapterProgress(
  story: LoadedStory,
  state: GameProgressState
): GameProgressState {
  return state.currentChapterId
    ? writeChapterProgress(story, state, state.currentChapterId)
    : state;
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

  return writeChapterProgress(story, next, chapter.id);
}

export function synchronizeChapter(
  story: LoadedStory,
  state: GameProgressState
): GameProgressState {
  let current = synchronizeChapterUnlocks(story, state);

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
  const manifestEntry = story.chapterManifest.chapters.find(
    (entry) => entry.id === chapterId
  );
  const chapter = story.chapters[chapterId];

  if (!manifestEntry || manifestEntry.availability !== "available" || !chapter) {
    throw new ChapterEngineError(`无法进入不存在的章节：${chapterId}`);
  }

  const prepared = synchronizeChapterUnlocks(
    story,
    saveActiveChapterProgress(story, state)
  );

  if (!prepared.unlockedChapterIds.includes(chapterId)) {
    throw new ChapterEngineError(`章节尚未解锁：${chapterId}`);
  }

  if (!evaluateCondition(chapter.entryCondition, prepared)) {
    throw new ChapterEngineError(`章节尚未满足进入条件：${chapterId}`);
  }

  const savedProgress = prepared.chapterProgressById[chapterId];
  const firstEntry = !savedProgress || savedProgress.status === "unlocked";
  const enteredState: GameProgressState = {
    ...prepared,
    currentChapterId: chapterId,
    chapterStage: firstEntry
      ? "not-started"
      : savedProgress.stage,
    completedObjectiveIds: firstEntry
      ? []
      : [...savedProgress.completedObjectiveIds]
  };
  const initializedState = firstEntry
    ? runEvents(enteredState, chapter.initialEvents)
    : enteredState;

  return synchronizeChapter(story, initializedState);
}

export function dispatchChapterEvents(
  story: LoadedStory,
  state: GameProgressState,
  events: GameEvent[]
): GameProgressState {
  assertActiveChapter(story, state);
  return synchronizeChapter(
    story,
    synchronizeChapterUnlocks(story, runEvents(state, events))
  );
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
  const saved = synchronizeChapterUnlocks(
    story,
    writeChapterProgress(story, completed, chapter.id, {
      status: "completed",
      stage: "completed",
      progressPercent: 100
    })
  );

  if (!chapter.nextChapterId) {
    return saved;
  }

  const nextEntry = story.chapterManifest.chapters.find(
    (entry) => entry.id === chapter.nextChapterId
  );

  if (
    !nextEntry ||
    nextEntry.availability !== "available" ||
    !story.chapters[chapter.nextChapterId]
  ) {
    return saved;
  }

  return enterChapter(story, saved, chapter.nextChapterId);
}
