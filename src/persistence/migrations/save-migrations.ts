import {
  CURRENT_SAVE_VERSION,
  type GameSaveRecord,
  type GameSaveRecordV1,
  type GameSaveRecordV2,
  type StoredSaveRecord
} from "../../types/save";

function isV1Save(save: StoredSaveRecord): save is GameSaveRecordV1 {
  return save.saveVersion === 1;
}

function isV2Save(save: StoredSaveRecord): save is GameSaveRecordV2 {
  return save.saveVersion === 2;
}

export function migrateSaveRecord(
  save: StoredSaveRecord
): GameSaveRecord {
  if (save.saveVersion === CURRENT_SAVE_VERSION) {
    return save;
  }

  if (isV2Save(save)) {
    return {
      ...save,
      saveVersion: CURRENT_SAVE_VERSION,
      reasoningAttempts: []
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
      reasoningAttempts: []
    };
  }

  throw new Error("无法迁移未知版本存档");
}
