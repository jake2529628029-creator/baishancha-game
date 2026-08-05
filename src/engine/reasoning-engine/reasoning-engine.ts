import { dispatchChapterEvents } from "../chapter-engine/chapter-engine";
import type { GameProgressState } from "../../types/progress";
import type { ReasoningAttempt, ReasoningCloseness, ReasoningNode } from "../../types/reasoning";
import type { LoadedStory } from "../../types/story";

export class ReasoningEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReasoningEngineError";
  }
}

function sameEvidenceSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length || new Set(right).size !== right.length) {
    return false;
  }

  const expected = new Set(left);
  return right.every((id) => expected.has(id));
}

/**
 * 计算提交组合与最接近正解的重合度。
 * 取所有正解中命中数最高的一个——玩家只要"沾边"任意一条可行路线就算有进展。
 */
function computeCloseness(
  node: ReasoningNode,
  evidenceIds: string[]
): ReasoningCloseness {
  let best: ReasoningCloseness = { supporting: 0, required: node.slots.length };

  for (const solution of node.solutions) {
    const expected = new Set(solution.requiredEvidenceIds);
    const supporting = evidenceIds.filter((id) => expected.has(id)).length;

    if (supporting > best.supporting) {
      best = { supporting, required: solution.requiredEvidenceIds.length };
    }
  }

  return best;
}

export function submitReasoning(
  story: LoadedStory,
  state: GameProgressState,
  reasoningId: string,
  evidenceIds: string[]
): ReasoningAttempt {
  const node = story.reasoning[reasoningId];

  if (!node || !state.unlockedReasoningIds.includes(reasoningId)) {
    throw new ReasoningEngineError(`推理节点尚未解锁：${reasoningId}`);
  }

  if (evidenceIds.length !== node.slots.length) {
    throw new ReasoningEngineError(`推理槽位尚未填满：${reasoningId}`);
  }

  const invalidEvidenceId = evidenceIds.find(
    (id) => !state.collectedEvidenceIds.includes(id)
  );

  if (invalidEvidenceId) {
    throw new ReasoningEngineError(`尚未持有推理证据：${invalidEvidenceId}`);
  }

  const solution = node.solutions.find((candidate) =>
    sameEvidenceSet(candidate.requiredEvidenceIds, evidenceIds)
  );

  if (!solution) {
    const attemptedState: GameProgressState = {
      ...state,
      reasoningAttempts: [
        ...state.reasoningAttempts,
        {
          reasoningId,
          evidenceIds: [...evidenceIds],
          matched: false,
          solutionId: null
        }
      ]
    };

    return {
      matched: false,
      feedback: node.fallbackFeedback,
      solutionId: null,
      closeness: computeCloseness(node, evidenceIds),
      state: attemptedState
    };
  }

  const completedState = dispatchChapterEvents(story, state, solution.events);

  return {
    matched: true,
    feedback: solution.feedback,
    solutionId: solution.id,
    state: {
      ...completedState,
      reasoningAttempts: [
        ...completedState.reasoningAttempts,
        {
          reasoningId,
          evidenceIds: [...evidenceIds],
          matched: true,
          solutionId: solution.id
        }
      ]
    }
  };
}
