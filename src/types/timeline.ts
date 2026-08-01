import type { GameEvent } from "./event";
import type { StoryCondition } from "./story";

export interface TimelineEventDefinition {
  id: string;
  chapterId: string;
  title: string;
  occurredAt: string;
  characterIds: string[];
  locationId: string;
  description: string;
  revealCondition: StoryCondition;
}

export interface TimelinePuzzleSolution {
  id: string;
  orderedEventIds: string[];
  onSolvedEvents: GameEvent[];
}

export interface TimelinePuzzleDefinition {
  id: string;
  chapterId: string;
  title: string;
  eventIds: string[];
  entryCondition: StoryCondition;
  solutions: TimelinePuzzleSolution[];
  incorrectFeedback: string;
}

export interface TimelineBundle {
  events: TimelineEventDefinition[];
  puzzles: TimelinePuzzleDefinition[];
}

export interface TimelineAttempt {
  puzzleId: string;
  orderedEventIds: string[];
  matched: boolean;
  solutionId: string | null;
}
