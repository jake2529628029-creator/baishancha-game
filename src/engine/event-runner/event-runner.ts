import type { GameEvent } from "../../types/event";
import type { GameProgressState } from "../../types/progress";

function appendUnique(items: string[], item: string): string[] {
  return items.includes(item) ? items : [...items, item];
}

export function runEvent(
  state: GameProgressState,
  event: GameEvent
): GameProgressState {
  switch (event.type) {
    case "unlockContent": {
      const next = appendUnique(state.unlockedContentIds, event.contentId);
      return next === state.unlockedContentIds
        ? state
        : {
            ...state,
            unlockedContentIds: next
          };
    }
    case "markContentViewed": {
      const next = appendUnique(state.viewedContentIds, event.contentId);
      return next === state.viewedContentIds
        ? state
        : {
            ...state,
            viewedContentIds: next
          };
    }
    case "discoverObservation": {
      const next = appendUnique(
        state.discoveredObservationIds,
        event.observationId
      );
      return next === state.discoveredObservationIds
        ? state
        : {
            ...state,
            discoveredObservationIds: next
          };
    }
    case "collectEvidence": {
      const next = appendUnique(
        state.collectedEvidenceIds,
        event.evidenceId
      );
      return next === state.collectedEvidenceIds
        ? state
        : {
            ...state,
            collectedEvidenceIds: next
          };
    }
    case "unlockDialogue": {
      const next = appendUnique(state.unlockedDialogueIds, event.dialogueId);
      return next === state.unlockedDialogueIds
        ? state
        : {
            ...state,
            unlockedDialogueIds: next
          };
    }
    case "completeDialogue": {
      const next = appendUnique(state.completedDialogueIds, event.dialogueId);
      return next === state.completedDialogueIds
        ? state
        : {
            ...state,
            completedDialogueIds: next
          };
    }
    case "unlockReasoning": {
      const next = appendUnique(
        state.unlockedReasoningIds,
        event.reasoningId
      );
      return next === state.unlockedReasoningIds
        ? state
        : {
            ...state,
            unlockedReasoningIds: next
          };
    }
    case "completeReasoning": {
      if (state.reasoningResults[event.reasoningId]) {
        return state;
      }

      return {
        ...state,
        reasoningResults: {
          ...state.reasoningResults,
          [event.reasoningId]: event.resultId
        }
      };
    }
    case "completeObjective": {
      const next = appendUnique(
        state.completedObjectiveIds,
        event.objectiveId
      );
      return next === state.completedObjectiveIds
        ? state
        : {
            ...state,
            completedObjectiveIds: next
          };
    }
    case "setFlag": {
      if (state.flags[event.flagId] === event.value) {
        return state;
      }

      return {
        ...state,
        flags: {
          ...state.flags,
          [event.flagId]: event.value
        }
      };
    }
    case "setChapterStage":
      return state.chapterStage === event.stage
        ? state
        : {
            ...state,
            chapterStage: event.stage
          };
    case "completeChapter": {
      const completedChapterIds = appendUnique(
        state.completedChapterIds,
        event.chapterId
      );
      const stageChanged = state.chapterStage !== "completed";

      if (
        completedChapterIds === state.completedChapterIds &&
        !stageChanged
      ) {
        return state;
      }

      return {
        ...state,
        completedChapterIds,
        chapterStage: "completed"
      };
    }
  }
}

export function runEvents(
  state: GameProgressState,
  events: GameEvent[]
): GameProgressState {
  return events.reduce(runEvent, state);
}
