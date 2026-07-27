import type { GameEvent } from "./event";
import type { StoryCondition } from "./story";

export interface DialogueLine {
  speakerId: string;
  text: string;
}

export interface EvidenceResponse {
  id: string;
  acceptedEvidenceIds: string[];
  lines: DialogueLine[];
  events: GameEvent[];
}

export interface DialogueNode {
  id: string;
  chapterId: string;
  characterId: string;
  characterName: string;
  topic: string;
  entryCondition: StoryCondition;
  openingLines: DialogueLine[];
  evidenceResponses: EvidenceResponse[];
  fallbackLines: DialogueLine[];
  completionEvents: GameEvent[];
}

export interface DialogueAttempt {
  matched: boolean;
  lines: DialogueLine[];
  responseId: string | null;
  state: import("./progress").GameProgressState;
}
