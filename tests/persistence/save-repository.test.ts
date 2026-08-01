import "fake-indexeddb/auto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { gameDatabase } from "../../src/persistence/database/game-database";
import {
  deleteAutoSave,
  loadAutoSave,
  writeAutoSave
} from "../../src/persistence/repositories/save-repository";
import type {
  GameSaveRecordV2,
  GameSaveRecordV3
} from "../../src/types/save";

describe("IndexedDB save repository", () => {
  beforeEach(async () => {
    await deleteAutoSave();
  });

  afterAll(async () => {
    gameDatabase.close();
    await gameDatabase.delete();
  });

  it("writes and loads the autosave", async () => {
    await writeAutoSave({
      id: "autosave",
      saveVersion: 4,
      gameId: "white-camellia-will",
      contentVersion: "0.1.0",
      currentChapterId: "chapter-01",
      chapterStage: "investigating",
      unlockedChapterIds: ["chapter-01"],
      chapterProgressById: {
        "chapter-01": {
          status: "in-progress",
          stage: "investigating",
          completedObjectiveIds: [],
          progressPercent: 0
        }
      },
      completedChapterIds: [],
      completedObjectiveIds: [],
      unlockedContentIds: ["content-scene-report"],
      viewedContentIds: [],
      discoveredObservationIds: [],
      collectedEvidenceIds: [],
      unlockedDialogueIds: [],
      completedDialogueIds: [],
      unlockedReasoningIds: [],
      reasoningResults: {},
      reasoningAttempts: [],
      relationshipStates: {},
      relationshipHistory: [],
      timelineOrders: {},
      completedTimelinePuzzleIds: [],
      timelineAttempts: [],
      detectiveBoardStates: {
        "board-main": {
          placements: [{ cardId: "card-a", x: 24, y: 38 }],
          connections: [
            {
              id: "connection-a-b",
              fromCardId: "card-a",
              toCardId: "card-b",
              relationType: "questions"
            }
          ],
          solvedPropositionIds: []
        }
      },
      flags: {
        test: true
      },
      updatedAt: "2026-07-24T00:00:00.000Z"
    });

    const save = await loadAutoSave();

    expect(save?.currentChapterId).toBe("chapter-01");
    expect(save?.flags.test).toBe(true);
    expect(save?.detectiveBoardStates["board-main"].placements[0]).toEqual({
      cardId: "card-a",
      x: 24,
      y: 38
    });
    expect(save?.detectiveBoardStates["board-main"].connections).toHaveLength(1);
  });

  it("migrates a V0.1 autosave to save version 4", async () => {
    await gameDatabase.saves.put({
      id: "autosave",
      saveVersion: 1,
      gameId: "white-camellia-will",
      contentVersion: "0.1.0",
      currentChapterId: "chapter-01",
      completedChapterIds: [],
      flags: {
        legacy: true
      },
      updatedAt: "2026-07-24T00:00:00.000Z"
    });

    const save = await loadAutoSave();

    expect(save?.saveVersion).toBe(4);
    expect(save?.chapterStage).toBe("investigating");
    expect(save?.unlockedContentIds).toEqual([]);
    expect(save?.reasoningAttempts).toEqual([]);
    expect(save?.flags.legacy).toBe(true);
  });

  it("migrates a V0.2 autosave without losing progress", async () => {
    await gameDatabase.saves.put({
      id: "autosave",
      saveVersion: 2,
      gameId: "white-camellia-will",
      contentVersion: "0.2.0",
      currentChapterId: "chapter-01",
      chapterStage: "reasoning-available",
      completedChapterIds: [],
      completedObjectiveIds: ["inspect-scene"],
      unlockedContentIds: ["content-scene-report"],
      viewedContentIds: ["content-scene-report"],
      discoveredObservationIds: [],
      collectedEvidenceIds: [],
      unlockedDialogueIds: [],
      completedDialogueIds: [],
      unlockedReasoningIds: ["reasoning-fingerprint"],
      reasoningResults: {},
      flags: {},
      updatedAt: "2026-07-24T00:00:00.000Z"
    } as GameSaveRecordV2);

    const save = await loadAutoSave();

    expect(save?.saveVersion).toBe(4);
    expect(save?.completedObjectiveIds).toContain("inspect-scene");
    expect(save?.reasoningAttempts).toEqual([]);
  });

  it("migrates a V3 autosave into chapter and framework state", async () => {
    await gameDatabase.saves.put({
      id: "autosave",
      saveVersion: 3,
      gameId: "white-camellia-will",
      contentVersion: "0.3.0",
      currentChapterId: "chapter-01",
      chapterStage: "reasoning-available",
      completedChapterIds: [],
      completedObjectiveIds: ["inspect-scene"],
      unlockedContentIds: ["content-scene-report"],
      viewedContentIds: ["content-scene-report"],
      discoveredObservationIds: [],
      collectedEvidenceIds: [],
      unlockedDialogueIds: [],
      completedDialogueIds: [],
      unlockedReasoningIds: ["reasoning-fingerprint"],
      reasoningResults: {},
      reasoningAttempts: [],
      flags: {
        migratedFromV3: true
      },
      updatedAt: "2026-07-24T00:00:00.000Z"
    } as GameSaveRecordV3);

    const save = await loadAutoSave();

    expect(save?.saveVersion).toBe(4);
    expect(save?.unlockedChapterIds).toEqual(["chapter-01"]);
    expect(
      save?.chapterProgressById["chapter-01"].completedObjectiveIds
    ).toEqual(["inspect-scene"]);
    expect(save?.relationshipStates).toEqual({});
    expect(save?.timelineOrders).toEqual({});
    expect(save?.detectiveBoardStates).toEqual({});
    expect(save?.flags.migratedFromV3).toBe(true);
  });
});
