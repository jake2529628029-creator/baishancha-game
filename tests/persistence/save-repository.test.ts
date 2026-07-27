import "fake-indexeddb/auto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { gameDatabase } from "../../src/persistence/database/game-database";
import {
  deleteAutoSave,
  loadAutoSave,
  writeAutoSave
} from "../../src/persistence/repositories/save-repository";
import type { GameSaveRecordV2 } from "../../src/types/save";

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
      saveVersion: 3,
      gameId: "white-camellia-will",
      contentVersion: "0.1.0",
      currentChapterId: "chapter-01",
      chapterStage: "investigating",
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
      flags: {
        test: true
      },
      updatedAt: "2026-07-24T00:00:00.000Z"
    });

    const save = await loadAutoSave();

    expect(save?.currentChapterId).toBe("chapter-01");
    expect(save?.flags.test).toBe(true);
  });

  it("migrates a V0.1 autosave to save version 3", async () => {
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

    expect(save?.saveVersion).toBe(3);
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

    expect(save?.saveVersion).toBe(3);
    expect(save?.completedObjectiveIds).toContain("inspect-scene");
    expect(save?.reasoningAttempts).toEqual([]);
  });
});
