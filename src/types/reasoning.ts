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
  /** 渐进式提示：按失败次数逐级揭示，越靠后越直白 */
  hints?: string[];
}

/** 失败提交与最近解的接近程度，用于"差多少"式反馈而非二元对错 */
export interface ReasoningCloseness {
  /** 提交的证据中，有多少份属于某个正解 */
  supporting: number;
  /** 正解所需的证据总数 */
  required: number;
}

export interface ReasoningAttempt {
  matched: boolean;
  feedback: string;
  solutionId: string | null;
  closeness?: ReasoningCloseness;
  state: import("./progress").GameProgressState;
}
