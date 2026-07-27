import { dispatchChapterEvents } from "../chapter-engine/chapter-engine";
import type { GameProgressState } from "../../types/progress";
import type { ReasoningAttempt } from "../../types/reasoning";
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
