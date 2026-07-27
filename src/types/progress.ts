import type { ChapterStage } from "./event";
import type { PrimitiveFlag } from "./story";

export interface ReasoningAttemptRecord {
  reasoningId: string;
  evidenceIds: string[];
  matched: boolean;
  solutionId: string | null;
}

export interface GameProgressState {
  currentChapterId: string | null;
  chapterStage: ChapterStage;
  completedChapterIds: string[];
  completedObjectiveIds: string[];
  unlockedContentIds: string[];
  viewedContentIds: string[];
  discoveredObservationIds: string[];
  collectedEvidenceIds: string[];
  unlockedDialogueIds: string[];
  completedDialogueIds: string[];
  unlockedReasoningIds: string[];
  reasoningResults: Record<string, string>;
  reasoningAttempts: ReasoningAttemptRecord[];
  flags: Record<string, PrimitiveFlag>;
}

export function createEmptyProgress(): GameProgressState {
  return {
    currentChapterId: null,
    chapterStage: "not-started",
    completedChapterIds: [],
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
    flags: {}
  };
}
