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
  /** 渐进式提示：按失败次数逐级揭示，越靠后越直白 */
  hints?: string[];
}

export interface DialogueAttempt {
  matched: boolean;
  lines: DialogueLine[];
  responseId: string | null;
  /** 未命中时，提交证据中有多少份对当前话题是有效质询（不指明是哪几份） */
  relevantCount?: number;
  state: import("./progress").GameProgressState;
}
