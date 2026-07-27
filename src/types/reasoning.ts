import type { GameEvent } from "./event";
import type { StoryCondition } from "./story";

export interface ReasoningSlot {
  id: string;
  label: string;
  kind: "evidence";
}

export interface ReasoningSolution {
  id: string;
  requiredEvidenceIds: string[];
  feedback: string;
  events: GameEvent[];
}

export interface ReasoningNode {
  id: string;
  chapterId: string;
  type: "evidenceCombination";
  question: string;
  entryCondition: StoryCondition;
  slots: ReasoningSlot[];
  solutions: ReasoningSolution[];
  fallbackFeedback: string;
}

export interface ReasoningAttempt {
  matched: boolean;
  feedback: string;
  solutionId: string | null;
  state: import("./progress").GameProgressState;
}
