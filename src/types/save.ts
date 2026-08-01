import type { ChapterStage } from "./event";
import type { GameProgressState } from "./progress";
import type { PrimitiveFlag } from "./story";

export const CURRENT_SAVE_VERSION = 4;

type LegacyProgressV2 = Pick<
  GameProgressState,
  | "completedChapterIds"
  | "completedObjectiveIds"
  | "unlockedContentIds"
  | "viewedContentIds"
  | "discoveredObservationIds"
  | "collectedEvidenceIds"
  | "unlockedDialogueIds"
  | "completedDialogueIds"
  | "unlockedReasoningIds"
  | "reasoningResults"
  | "flags"
>;

export interface GameSaveRecordV1 {
  id: "autosave" | string;
  saveVersion: 1;
  gameId: string;
  contentVersion: string;
  currentChapterId: string;
  completedChapterIds: string[];
  flags: Record<string, PrimitiveFlag>;
  updatedAt: string;
}

export interface GameSaveRecordV2
  extends LegacyProgressV2 {
  id: "autosave" | string;
  saveVersion: 2;
  gameId: string;
  contentVersion: string;
  currentChapterId: string;
  chapterStage: ChapterStage;
  updatedAt: string;
}

export interface GameSaveRecordV3 extends LegacyProgressV2 {
  id: "autosave" | string;
  saveVersion: 3;
  gameId: string;
  contentVersion: string;
  currentChapterId: string;
  chapterStage: ChapterStage;
  reasoningAttempts: GameProgressState["reasoningAttempts"];
  updatedAt: string;
}

export interface GameSaveRecord
  extends Omit<GameProgressState, "currentChapterId"> {
  id: "autosave" | string;
  saveVersion: typeof CURRENT_SAVE_VERSION;
  gameId: string;
  contentVersion: string;
  currentChapterId: string;
  chapterStage: ChapterStage;
  updatedAt: string;
}

export type StoredSaveRecord =
  | GameSaveRecordV1
  | GameSaveRecordV2
  | GameSaveRecordV3
  | GameSaveRecord;
