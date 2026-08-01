import {
  CURRENT_SAVE_VERSION,
  type GameSaveRecord,
  type GameSaveRecordV1,
  type GameSaveRecordV2,
  type GameSaveRecordV3,
  type StoredSaveRecord
} from "../../types/save";
import type {
  ChapterProgressRecord,
  GameProgressState
} from "../../types/progress";

function isV1Save(save: StoredSaveRecord): save is GameSaveRecordV1 {
  return save.saveVersion === 1;
}

function isV2Save(save: StoredSaveRecord): save is GameSaveRecordV2 {
  return save.saveVersion === 2;
}

function isV3Save(save: StoredSaveRecord): save is GameSaveRecordV3 {
  return save.saveVersion === 3;
}

function createFrameworkProgress(
  currentChapterId: string,
  chapterStage: GameProgressState["chapterStage"],
  completedChapterIds: string[],
  completedObjectiveIds: string[]
): Pick<
  GameProgressState,
  | "unlockedChapterIds"
  | "chapterProgressById"
  | "relationshipStates"
  | "relationshipHistory"
  | "timelineOrders"
  | "completedTimelinePuzzleIds"
  | "timelineAttempts"
  | "detectiveBoardStates"
> {
  const unlockedChapterIds = Array.from(
    new Set([...completedChapterIds, currentChapterId])
  );
  const chapterProgressById: Record<string, ChapterProgressRecord> = {};

  for (const chapterId of unlockedChapterIds) {
    const completed = completedChapterIds.includes(chapterId);
    const active = chapterId === currentChapterId;

    chapterProgressById[chapterId] = {
      status: completed ? "completed" : active ? "in-progress" : "unlocked",
      stage: completed
        ? "completed"
        : active
          ? chapterStage
          : "not-started",
      completedObjectiveIds: active ? [...completedObjectiveIds] : [],
      progressPercent: completed ? 100 : 0
    };
  }

  return {
    unlockedChapterIds,
    chapterProgressById,
    relationshipStates: {},
    relationshipHistory: [],
    timelineOrders: {},
    completedTimelinePuzzleIds: [],
    timelineAttempts: [],
    detectiveBoardStates: {}
  };
}

export function migrateSaveRecord(
  save: StoredSaveRecord
): GameSaveRecord {
  if (save.saveVersion === CURRENT_SAVE_VERSION) {
    return {
      ...save,
      relationshipHistory: save.relationshipHistory ?? []
    };
  }

  if (isV3Save(save)) {
    return {
      ...save,
      saveVersion: CURRENT_SAVE_VERSION,
      ...createFrameworkProgress(
        save.currentChapterId,
        save.chapterStage,
        save.completedChapterIds,
        save.completedObjectiveIds
      )
    };
  }

  if (isV2Save(save)) {
    return {
      ...save,
      saveVersion: CURRENT_SAVE_VERSION,
      reasoningAttempts: [],
      ...createFrameworkProgress(
        save.currentChapterId,
        save.chapterStage,
        save.completedChapterIds,
        save.completedObjectiveIds
      )
    };
  }

  if (isV1Save(save)) {
    return {
      ...save,
      saveVersion: CURRENT_SAVE_VERSION,
      chapterStage: save.completedChapterIds.includes(save.currentChapterId)
        ? "completed"
        : "investigating",
      completedObjectiveIds: [],
      unlockedContentIds: [],
      viewedContentIds: [],
      discoveredObservationIds: [],
      collectedEvidenceIds: [],
      unlockedDialogueIds: [],
      completedDialogueIds: [],
      unlockedReasoningIds: [],
      reasoningResults: {},
      reasoningAttempts: [],
      ...createFrameworkProgress(
        save.currentChapterId,
        save.completedChapterIds.includes(save.currentChapterId)
          ? "completed"
          : "investigating",
        save.completedChapterIds,
        []
      )
    };
  }

  throw new Error("无法迁移未知版本存档");
}
