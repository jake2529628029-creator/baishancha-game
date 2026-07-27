import type { ChapterStage } from "./event";
import type { GameProgressState } from "./progress";
import type { PrimitiveFlag } from "./story";

export const CURRENT_SAVE_VERSION = 3;

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
  extends Omit<GameProgressState, "currentChapterId" | "reasoningAttempts"> {
  id: "autosave" | string;
  saveVersion: 2;
  gameId: string;
  contentVersion: string;
  currentChapterId: string;
  chapterStage: ChapterStage;
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
  | GameSaveRecord;
