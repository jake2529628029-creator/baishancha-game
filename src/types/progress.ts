import type { ChapterStage } from "./event";
import type { DetectiveBoardState } from "./detective-board";
import type {
  RelationshipChangeRecord,
  RelationshipStateMap
} from "./relationship";
import type { PrimitiveFlag } from "./story";
import type { TimelineAttempt } from "./timeline";

export interface ReasoningAttemptRecord {
  reasoningId: string;
  evidenceIds: string[];
  matched: boolean;
  solutionId: string | null;
}

export type ChapterProgressStatus =
  | "locked"
  | "unlocked"
  | "in-progress"
  | "completed";

export interface ChapterProgressRecord {
  status: ChapterProgressStatus;
  stage: ChapterStage;
  completedObjectiveIds: string[];
  progressPercent: number;
}

export interface GameProgressState {
  currentChapterId: string | null;
  chapterStage: ChapterStage;
  unlockedChapterIds: string[];
  chapterProgressById: Record<string, ChapterProgressRecord>;
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
  relationshipStates: RelationshipStateMap;
  relationshipHistory: RelationshipChangeRecord[];
  timelineOrders: Record<string, string[]>;
  completedTimelinePuzzleIds: string[];
  timelineAttempts: TimelineAttempt[];
  detectiveBoardStates: Record<string, DetectiveBoardState>;
  flags: Record<string, PrimitiveFlag>;
}

export function createEmptyProgress(): GameProgressState {
  return {
    currentChapterId: null,
    chapterStage: "not-started",
    unlockedChapterIds: [],
    chapterProgressById: {},
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
    relationshipStates: {},
    relationshipHistory: [],
    timelineOrders: {},
    completedTimelinePuzzleIds: [],
    timelineAttempts: [],
    detectiveBoardStates: {},
    flags: {}
  };
}
