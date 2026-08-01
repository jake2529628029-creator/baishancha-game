import type { PrimitiveFlag } from "./story";
import type {
  RelationshipDimension,
  RelationshipInsightState
} from "./relationship";

export type GameEvent =
  | {
      type: "unlockContent";
      contentId: string;
    }
  | {
      type: "markContentViewed";
      contentId: string;
    }
  | {
      type: "discoverObservation";
      observationId: string;
    }
  | {
      type: "collectEvidence";
      evidenceId: string;
    }
  | {
      type: "unlockDialogue";
      dialogueId: string;
    }
  | {
      type: "completeDialogue";
      dialogueId: string;
    }
  | {
      type: "unlockReasoning";
      reasoningId: string;
    }
  | {
      type: "completeReasoning";
      reasoningId: string;
      resultId: string;
    }
  | {
      type: "completeObjective";
      objectiveId: string;
    }
  | {
      type: "updateRelationship";
      relationshipId: string;
      dimension: RelationshipDimension;
      state: RelationshipInsightState;
    }
  | {
      type: "recordTimelineOrder";
      puzzleId: string;
      orderedEventIds: string[];
      matched: boolean;
      solutionId: string | null;
    }
  | {
      type: "completeTimelinePuzzle";
      puzzleId: string;
    }
  | {
      type: "completeDetectiveProposition";
      boardId: string;
      propositionId: string;
    }
  | {
      type: "setFlag";
      flagId: string;
      value: PrimitiveFlag;
    }
  | {
      type: "setChapterStage";
      stage: ChapterStage;
    }
  | {
      type: "completeChapter";
      chapterId: string;
    };

export type ChapterStage =
  | "not-started"
  | "investigating"
  | "reasoning-available"
  | "result"
  | "completed";
