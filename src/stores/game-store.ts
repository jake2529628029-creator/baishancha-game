import { create } from "zustand";
import {
  completeActiveChapter,
  discoverObservation as discoverChapterObservation,
  dispatchChapterEvents,
  enterChapter,
  synchronizeChapterUnlocks,
  synchronizeChapter,
  viewContent as viewChapterContent
} from "../engine/chapter-engine/chapter-engine";
import {
  connectDetectiveCards,
  disconnectDetectiveCards,
  placeDetectiveCard,
  submitDetectiveProposition as runDetectiveProposition
} from "../engine/detective-board/detective-board";
import { presentDialogueEvidence as runDialogueEvidence } from "../engine/dialogue-engine/dialogue-engine";
import { submitReasoning as runReasoning } from "../engine/reasoning-engine/reasoning-engine";
import { updateRelationship as runRelationshipUpdate } from "../engine/relationship-engine/relationship-engine";
import { loadStory } from "../engine/story-loader/story-loader";
import { submitTimelineOrder as runTimelineOrder } from "../engine/timeline-engine/timeline-engine";
import {
  AUTO_SAVE_ID,
  SAVE_VERSION,
  deleteAutoSave,
  loadAutoSave,
  writeAutoSave
} from "../persistence/repositories/save-repository";
import type { GameEvent } from "../types/event";
import type {
  DetectiveBoardAttempt,
  DetectiveBoardConnection
} from "../types/detective-board";
import type { DialogueAttempt } from "../types/dialogue";
import type {
  RelationshipDimension,
  RelationshipInsightState
} from "../types/relationship";
import type { ReasoningAttempt } from "../types/reasoning";
import {
  createEmptyProgress,
  type GameProgressState
} from "../types/progress";
import type { GameSaveRecord } from "../types/save";
import type { LoadedStory, PrimitiveFlag } from "../types/story";
import type { TimelineAttempt } from "../types/timeline";

type GameStatus = "idle" | "loading" | "ready" | "error";

interface GameStore extends GameProgressState {
  status: GameStatus;
  errorMessage: string | null;
  story: LoadedStory | null;
  sessionStarted: boolean;
  hasSave: boolean;
  bootstrap: () => Promise<void>;
  startNewGame: () => Promise<void>;
  continueGame: () => Promise<void>;
  openChapter: (chapterId: string) => Promise<void>;
  applyEvents: (events: GameEvent[]) => Promise<void>;
  viewContent: (contentId: string) => Promise<void>;
  discoverObservation: (observationId: string) => Promise<void>;
  presentDialogueEvidence: (
    dialogueId: string,
    evidenceIds: string[]
  ) => Promise<DialogueAttempt | null>;
  submitReasoning: (
    reasoningId: string,
    evidenceIds: string[]
  ) => Promise<ReasoningAttempt | null>;
  setFlag: (flagId: string, value: PrimitiveFlag) => Promise<void>;
  setRelationshipInsight: (
    relationshipId: string,
    dimension: RelationshipDimension,
    value: RelationshipInsightState
  ) => Promise<void>;
  submitTimelineOrder: (
    puzzleId: string,
    orderedEventIds: string[]
  ) => Promise<(TimelineAttempt & { feedback: string }) | null>;
  placeDetectiveCard: (
    boardId: string,
    cardId: string,
    x: number,
    y: number
  ) => Promise<void>;
  connectDetectiveCards: (
    boardId: string,
    connection: DetectiveBoardConnection
  ) => Promise<void>;
  disconnectDetectiveCards: (
    boardId: string,
    connectionId: string
  ) => Promise<void>;
  submitDetectiveProposition: (
    boardId: string,
    propositionId: string
  ) => Promise<(DetectiveBoardAttempt & { feedback: string }) | null>;
  completeCurrentChapter: (expectedChapterId?: string) => Promise<void>;
  returnToTitle: () => void;
  clearSave: () => Promise<void>;
}

const progressKeys: Array<keyof GameProgressState> = [
  "currentChapterId",
  "chapterStage",
  "unlockedChapterIds",
  "chapterProgressById",
  "completedChapterIds",
  "completedObjectiveIds",
  "unlockedContentIds",
  "viewedContentIds",
  "discoveredObservationIds",
  "collectedEvidenceIds",
  "unlockedDialogueIds",
  "completedDialogueIds",
  "unlockedReasoningIds",
  "reasoningResults",
  "reasoningAttempts",
  "relationshipStates",
  "relationshipHistory",
  "timelineOrders",
  "completedTimelinePuzzleIds",
  "timelineAttempts",
  "detectiveBoardStates",
  "flags"
];

function selectProgress(state: GameProgressState): GameProgressState {
  return {
    currentChapterId: state.currentChapterId,
    chapterStage: state.chapterStage,
    unlockedChapterIds: state.unlockedChapterIds,
    chapterProgressById: state.chapterProgressById,
    completedChapterIds: state.completedChapterIds,
    completedObjectiveIds: state.completedObjectiveIds,
    unlockedContentIds: state.unlockedContentIds,
    viewedContentIds: state.viewedContentIds,
    discoveredObservationIds: state.discoveredObservationIds,
    collectedEvidenceIds: state.collectedEvidenceIds,
    unlockedDialogueIds: state.unlockedDialogueIds,
    completedDialogueIds: state.completedDialogueIds,
    unlockedReasoningIds: state.unlockedReasoningIds,
    reasoningResults: state.reasoningResults,
    reasoningAttempts: state.reasoningAttempts,
    relationshipStates: state.relationshipStates,
    relationshipHistory: state.relationshipHistory,
    timelineOrders: state.timelineOrders,
    completedTimelinePuzzleIds: state.completedTimelinePuzzleIds,
    timelineAttempts: state.timelineAttempts,
    detectiveBoardStates: state.detectiveBoardStates,
    flags: state.flags
  };
}

function progressFromSave(save: GameSaveRecord): GameProgressState {
  return selectProgress(save);
}

function progressPatch(progress: GameProgressState): GameProgressState {
  return Object.fromEntries(
    progressKeys.map((key) => [key, progress[key]])
  ) as unknown as GameProgressState;
}

function createSaveRecord(state: GameStore): GameSaveRecord | null {
  if (!state.story || !state.currentChapterId || !state.sessionStarted) {
    return null;
  }

  return {
    id: AUTO_SAVE_ID,
    saveVersion: SAVE_VERSION,
    gameId: state.story.manifest.gameId,
    contentVersion: state.story.manifest.contentVersion,
    ...selectProgress(state),
    currentChapterId: state.currentChapterId,
    updatedAt: new Date().toISOString()
  };
}

async function persistCurrentState(): Promise<void> {
  const save = createSaveRecord(useGameStore.getState());

  if (save) {
    await writeAutoSave(save);
    useGameStore.setState({
      hasSave: true
    });
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  status: "idle",
  errorMessage: null,
  story: null,
  sessionStarted: false,
  hasSave: false,
  ...createEmptyProgress(),

  bootstrap: async () => {
    set({
      status: "loading",
      errorMessage: null
    });

    try {
      const [story, save] = await Promise.all([loadStory(), loadAutoSave()]);
      const hasCompatibleSave =
        Boolean(save) &&
        save?.gameId === story.manifest.gameId &&
        Boolean(story.chapters[save.currentChapterId]);
      const overviewProgress = hasCompatibleSave && save
        ? synchronizeChapterUnlocks(story, progressFromSave(save))
        : synchronizeChapterUnlocks(story, createEmptyProgress());

      set({
        status: "ready",
        story,
        hasSave: hasCompatibleSave,
        sessionStarted: false,
        ...progressPatch(overviewProgress)
      });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "游戏初始化失败"
      });
    }
  },

  startNewGame: async () => {
    const story = get().story;

    if (!story) {
      return;
    }

    const progress = enterChapter(
      story,
      createEmptyProgress(),
      story.manifest.startChapterId
    );

    set({
      sessionStarted: true,
      ...progressPatch(progress)
    });

    await persistCurrentState();
  },

  continueGame: async () => {
    const story = get().story;
    const save = await loadAutoSave();

    if (
      !story ||
      !save ||
      save.gameId !== story.manifest.gameId ||
      !story.chapters[save.currentChapterId]
    ) {
      throw new Error("没有可继续的兼容存档");
    }

    const progress = synchronizeChapter(story, progressFromSave(save));

    set({
      sessionStarted: true,
      ...progressPatch(progress)
    });
  },

  openChapter: async (chapterId) => {
    const state = get();

    if (!state.story) {
      return;
    }

    const progress = enterChapter(
      state.story,
      selectProgress(state),
      chapterId
    );

    set({
      sessionStarted: true,
      ...progressPatch(progress)
    });
    await persistCurrentState();
  },

  applyEvents: async (events) => {
    const state = get();

    if (!state.story) {
      return;
    }

    const progress = dispatchChapterEvents(
      state.story,
      selectProgress(state),
      events
    );

    set(progressPatch(progress));
    await persistCurrentState();
  },

  viewContent: async (contentId) => {
    const state = get();

    if (!state.story) {
      return;
    }

    const progress = viewChapterContent(
      state.story,
      selectProgress(state),
      contentId
    );

    set(progressPatch(progress));
    await persistCurrentState();
  },

  discoverObservation: async (observationId) => {
    const state = get();

    if (!state.story) {
      return;
    }

    const progress = discoverChapterObservation(
      state.story,
      selectProgress(state),
      observationId
    );

    set(progressPatch(progress));
    await persistCurrentState();
  },

  presentDialogueEvidence: async (dialogueId, evidenceIds) => {
    const state = get();

    if (!state.story) {
      return null;
    }

    const currentProgress = selectProgress(state);
    const attempt = runDialogueEvidence(
      state.story,
      currentProgress,
      dialogueId,
      evidenceIds
    );

    if (attempt.state !== currentProgress) {
      set(progressPatch(attempt.state));
      await persistCurrentState();
    }

    return attempt;
  },

  submitReasoning: async (reasoningId, evidenceIds) => {
    const state = get();

    if (!state.story) {
      return null;
    }

    const currentProgress = selectProgress(state);
    const attempt = runReasoning(
      state.story,
      currentProgress,
      reasoningId,
      evidenceIds
    );

    if (attempt.state !== currentProgress) {
      set(progressPatch(attempt.state));
      await persistCurrentState();
    }

    return attempt;
  },

  setFlag: async (flagId, value) => {
    await get().applyEvents([
      {
        type: "setFlag",
        flagId,
        value
      }
    ]);
  },

  setRelationshipInsight: async (
    relationshipId,
    dimension,
    value
  ) => {
    const state = get();

    if (!state.story) {
      return;
    }

    const updated = runRelationshipUpdate(
      state.story,
      selectProgress(state),
      relationshipId,
      dimension,
      value
    );
    const progress = state.currentChapterId
      ? synchronizeChapter(state.story, updated)
      : synchronizeChapterUnlocks(state.story, updated);

    set(progressPatch(progress));
    await persistCurrentState();
  },

  submitTimelineOrder: async (puzzleId, orderedEventIds) => {
    const state = get();

    if (!state.story) {
      return null;
    }

    const attempt = runTimelineOrder(
      state.story,
      selectProgress(state),
      puzzleId,
      orderedEventIds
    );
    const progress = state.currentChapterId
      ? synchronizeChapter(state.story, attempt.state)
      : synchronizeChapterUnlocks(state.story, attempt.state);

    set(progressPatch(progress));
    await persistCurrentState();
    return attempt;
  },

  placeDetectiveCard: async (boardId, cardId, x, y) => {
    const state = get();

    if (!state.story) {
      return;
    }

    const progress = placeDetectiveCard(
      state.story,
      selectProgress(state),
      boardId,
      cardId,
      x,
      y
    );

    set(progressPatch(progress));
    await persistCurrentState();
  },

  connectDetectiveCards: async (boardId, connection) => {
    const state = get();

    if (!state.story) {
      return;
    }

    const progress = connectDetectiveCards(
      state.story,
      selectProgress(state),
      boardId,
      connection
    );

    set(progressPatch(progress));
    await persistCurrentState();
  },

  disconnectDetectiveCards: async (boardId, connectionId) => {
    const state = get();

    if (!state.story) {
      return;
    }

    const progress = disconnectDetectiveCards(
      state.story,
      selectProgress(state),
      boardId,
      connectionId
    );

    set(progressPatch(progress));
    await persistCurrentState();
  },

  submitDetectiveProposition: async (boardId, propositionId) => {
    const state = get();

    if (!state.story) {
      return null;
    }

    const attempt = runDetectiveProposition(
      state.story,
      selectProgress(state),
      boardId,
      propositionId
    );
    const progress = state.currentChapterId
      ? synchronizeChapter(state.story, attempt.state)
      : synchronizeChapterUnlocks(state.story, attempt.state);

    set(progressPatch(progress));
    await persistCurrentState();
    return attempt;
  },

  completeCurrentChapter: async (expectedChapterId) => {
    const state = get();

    if (
      !state.story ||
      (expectedChapterId && state.currentChapterId !== expectedChapterId)
    ) {
      return;
    }

    const progress = completeActiveChapter(
      state.story,
      selectProgress(state)
    );

    set(progressPatch(progress));
    await persistCurrentState();
  },

  returnToTitle: () => {
    set({
      sessionStarted: false
    });
  },

  clearSave: async () => {
    await deleteAutoSave();
    set({
      hasSave: false,
      sessionStarted: false,
      ...createEmptyProgress()
    });
  }
}));
