// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { InvestigationNotebook } from "../../src/features/evidence-notebook/InvestigationNotebook";
import { getEvidenceNotebookCount } from "../../src/features/evidence-notebook/evidence-notebook-count";
import { loadStory } from "../../src/engine/story-loader/story-loader";
import { useGameStore } from "../../src/stores/game-store";
import { createEmptyProgress } from "../../src/types/progress";
import type { LoadedStory } from "../../src/types/story";
import { runtimePayloadForUrl } from "../fixtures/runtime-payloads";

describe("InvestigationNotebook evidence count", () => {
  let story: LoadedStory;
  let chapterOneEvidenceIds: string[];
  let chapterTwoEvidenceIds: string[];

  beforeAll(async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const payload = runtimePayloadForUrl(input);

        return new Response(JSON.stringify(payload), {
          status: payload ? 200 : 404,
          headers: {
            "Content-Type": "application/json"
          }
        });
      })
    );

    story = await loadStory("/story/runtime");
    chapterOneEvidenceIds = Object.values(story.evidence)
      .filter((evidence) => evidence.chapterId === "chapter-01")
      .map((evidence) => evidence.id);
    chapterTwoEvidenceIds = Object.values(story.evidence)
      .filter((evidence) => evidence.chapterId === "chapter-02")
      .map((evidence) => evidence.id);
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    cleanup();
    useGameStore.setState({
      story: null,
      sessionStarted: false,
      ...createEmptyProgress()
    });
  });

  it("counts only the available chapters that are currently unlocked", () => {
    expect(
      getEvidenceNotebookCount(
        story,
        ["chapter-00", "chapter-01"],
        []
      )
    ).toMatchObject({
      collectedCount: 0,
      totalCount: 6
    });

    expect(
      getEvidenceNotebookCount(
        story,
        ["chapter-00", "chapter-01"],
        chapterOneEvidenceIds.slice(0, 3)
      )
    ).toMatchObject({
      collectedCount: 3,
      totalCount: 6
    });

    expect(
      getEvidenceNotebookCount(
        story,
        ["chapter-00", "chapter-01"],
        chapterOneEvidenceIds
      )
    ).toMatchObject({
      collectedCount: 6,
      totalCount: 6
    });
  });

  it("updates the denominator as soon as chapter two is unlocked", () => {
    expect(
      getEvidenceNotebookCount(
        story,
        ["chapter-00", "chapter-01", "chapter-02"],
        chapterOneEvidenceIds
      )
    ).toMatchObject({
      collectedCount: 6,
      totalCount: 12
    });

    expect(
      getEvidenceNotebookCount(
        story,
        ["chapter-00", "chapter-01", "chapter-02"],
        [...chapterOneEvidenceIds, ...chapterTwoEvidenceIds.slice(0, 5)]
      )
    ).toMatchObject({
      collectedCount: 11,
      totalCount: 12
    });
  });

  it("deduplicates collected evidence and never exceeds the denominator", () => {
    const count = getEvidenceNotebookCount(
      story,
      ["chapter-00", "chapter-01", "chapter-02"],
      [
        ...chapterOneEvidenceIds,
        ...chapterTwoEvidenceIds,
        chapterOneEvidenceIds[0],
        chapterTwoEvidenceIds[0],
        "evidence-that-does-not-exist"
      ]
    );

    expect(count.collectedCount).toBe(12);
    expect(count.totalCount).toBe(12);
    expect(count.collectedCount).toBeLessThanOrEqual(count.totalCount);
    expect(new Set(count.collectedEvidenceIds).size).toBe(
      count.collectedEvidenceIds.length
    );
  });

  it("keeps the same count after progress serialization and restoration", () => {
    const progress = {
      unlockedChapterIds: ["chapter-00", "chapter-01", "chapter-02"],
      collectedEvidenceIds: [
        ...chapterOneEvidenceIds,
        ...chapterTwoEvidenceIds.slice(0, 5),
        chapterOneEvidenceIds[0]
      ]
    };
    const restored = JSON.parse(JSON.stringify(progress)) as typeof progress;

    expect(
      getEvidenceNotebookCount(
        story,
        restored.unlockedChapterIds,
        restored.collectedEvidenceIds
      )
    ).toEqual(
      getEvidenceNotebookCount(
        story,
        progress.unlockedChapterIds,
        progress.collectedEvidenceIds
      )
    );
  });

  it("excludes planned chapters even if their IDs appear unlocked", () => {
    const plannedEvidenceId = "evidence-ch03-planned";
    const storyWithPlannedEvidence: LoadedStory = {
      ...story,
      chapters: {
        ...story.chapters,
        "chapter-03": {
          ...story.chapters["chapter-02"],
          id: "chapter-03",
          order: 3,
          contentIds: [],
          dialogueIds: [],
          reasoningIds: []
        }
      },
      evidence: {
        ...story.evidence,
        [plannedEvidenceId]: {
          ...story.evidence[chapterTwoEvidenceIds[0]],
          id: plannedEvidenceId,
          chapterId: "chapter-03",
          sourceContentIds: [],
          observationIds: []
        }
      }
    };
    const count = getEvidenceNotebookCount(
      storyWithPlannedEvidence,
      ["chapter-00", "chapter-01", "chapter-02", "chapter-03"],
      [...chapterOneEvidenceIds, plannedEvidenceId]
    );

    expect(count.totalCount).toBe(12);
    expect(count.collectedCount).toBe(6);
    expect(count.collectedEvidenceIds).not.toContain(plannedEvidenceId);
  });

  it("renders the cumulative 11/12 count and keeps it when switching chapters", () => {
    useGameStore.setState({
      story,
      currentChapterId: "chapter-02",
      unlockedChapterIds: ["chapter-00", "chapter-01", "chapter-02"],
      collectedEvidenceIds: [
        ...chapterOneEvidenceIds,
        ...chapterTwoEvidenceIds.slice(0, 5)
      ]
    });

    render(<InvestigationNotebook onOpenContent={() => undefined} />);

    expect(screen.getByText("11/12")).toBeTruthy();

    act(() => {
      useGameStore.setState({
        currentChapterId: "chapter-01"
      });
    });

    expect(screen.getByText("11/12")).toBeTruthy();
    expect(screen.queryByText("11/6")).toBeNull();
  });
});
