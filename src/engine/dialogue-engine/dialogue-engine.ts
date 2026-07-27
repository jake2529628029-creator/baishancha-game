import { dispatchChapterEvents } from "../chapter-engine/chapter-engine";
import type { DialogueAttempt } from "../../types/dialogue";
import type { GameProgressState } from "../../types/progress";
import type { LoadedStory } from "../../types/story";

export class DialogueEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DialogueEngineError";
  }
}

function sameEvidenceSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const expected = new Set(left);
  return right.every((id) => expected.has(id));
}

export function presentDialogueEvidence(
  story: LoadedStory,
  state: GameProgressState,
  dialogueId: string,
  evidenceIds: string[]
): DialogueAttempt {
  const dialogue = story.dialogues[dialogueId];

  if (!dialogue || !state.unlockedDialogueIds.includes(dialogueId)) {
    throw new DialogueEngineError(`对话话题尚未解锁：${dialogueId}`);
  }

  const invalidEvidenceId = evidenceIds.find(
    (id) => !state.collectedEvidenceIds.includes(id)
  );

  if (invalidEvidenceId) {
    throw new DialogueEngineError(`尚未持有出示证据：${invalidEvidenceId}`);
  }

  const response = dialogue.evidenceResponses.find((candidate) =>
    sameEvidenceSet(candidate.acceptedEvidenceIds, evidenceIds)
  );

  if (!response) {
    return {
      matched: false,
      lines: dialogue.fallbackLines,
      responseId: null,
      state
    };
  }

  return {
    matched: true,
    lines: response.lines,
    responseId: response.id,
    state: dispatchChapterEvents(story, state, [
      ...response.events,
      ...dialogue.completionEvents
    ])
  };
}
