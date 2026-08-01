import type { GameEvent } from "./event";
import type { StoryCondition } from "./story";

export type DetectiveBoardCardType =
  | "character"
  | "evidence"
  | "timeline"
  | "proposition";

export interface DetectiveBoardCardDefinition {
  id: string;
  type: DetectiveBoardCardType;
  referenceId: string;
  title: string;
  revealCondition: StoryCondition;
}

export interface DetectiveBoardConnection {
  id: string;
  fromCardId: string;
  toCardId: string;
  relationType: string;
  label?: string;
}

export interface DetectiveBoardConnectionRequirement {
  fromCardId: string;
  toCardId: string;
  relationType: string;
}

export interface DetectiveBoardPropositionSolution {
  id: string;
  requiredConnections: DetectiveBoardConnectionRequirement[];
  onSolvedEvents: GameEvent[];
}

export interface DetectiveBoardProposition {
  id: string;
  title: string;
  prompt: string;
  entryCondition: StoryCondition;
  solutions: DetectiveBoardPropositionSolution[];
  incorrectFeedback: string;
}

export interface DetectiveBoardDefinition {
  id: string;
  chapterId: string;
  title: string;
  cards: DetectiveBoardCardDefinition[];
  initialConnections: DetectiveBoardConnection[];
  propositions: DetectiveBoardProposition[];
}

export interface DetectiveBoardBundle {
  boards: DetectiveBoardDefinition[];
}

export interface DetectiveBoardCardPlacement {
  cardId: string;
  x: number;
  y: number;
}

export interface DetectiveBoardState {
  placements: DetectiveBoardCardPlacement[];
  connections: DetectiveBoardConnection[];
  solvedPropositionIds: string[];
}

export interface DetectiveBoardAttempt {
  boardId: string;
  propositionId: string;
  matched: boolean;
  solutionId: string | null;
}
