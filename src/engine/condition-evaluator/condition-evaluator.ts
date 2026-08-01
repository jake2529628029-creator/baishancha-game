import type { GameProgressState } from "../../types/progress";
import type { StoryCondition } from "../../types/story";

export type ConditionContext = Pick<
  GameProgressState,
  | "completedChapterIds"
  | "completedObjectiveIds"
  | "viewedContentIds"
  | "discoveredObservationIds"
  | "collectedEvidenceIds"
  | "completedDialogueIds"
  | "reasoningResults"
  | "relationshipStates"
  | "completedTimelinePuzzleIds"
  | "detectiveBoardStates"
  | "flags"
>;

export function evaluateCondition(
  condition: StoryCondition,
  context: ConditionContext
): boolean {
  switch (condition.type) {
    case "always":
      return true;
    case "chapterCompleted":
      return context.completedChapterIds.includes(condition.chapterId);
    case "flagEquals":
      return context.flags[condition.flagId] === condition.value;
    case "contentViewed":
      return context.viewedContentIds.includes(condition.contentId);
    case "observationDiscovered":
      return context.discoveredObservationIds.includes(
        condition.observationId
      );
    case "evidenceCollected":
      return context.collectedEvidenceIds.includes(condition.evidenceId);
    case "dialogueCompleted":
      return context.completedDialogueIds.includes(condition.dialogueId);
    case "reasoningCompleted":
      return Boolean(context.reasoningResults[condition.reasoningId]);
    case "objectiveCompleted":
      return context.completedObjectiveIds.includes(condition.objectiveId);
    case "relationshipStateEquals":
      return (
        context.relationshipStates[condition.relationshipId]?.[
          condition.dimension
        ] === condition.state
      );
    case "timelineCompleted":
      return context.completedTimelinePuzzleIds.includes(condition.puzzleId);
    case "detectivePropositionCompleted":
      return Boolean(
        context.detectiveBoardStates[
          condition.boardId
        ]?.solvedPropositionIds.includes(condition.propositionId)
      );
    case "all":
      return condition.conditions.every((child) =>
        evaluateCondition(child, context)
      );
    case "any":
      return condition.conditions.some((child) =>
        evaluateCondition(child, context)
      );
    case "not":
      return !evaluateCondition(condition.condition, context);
  }
}
