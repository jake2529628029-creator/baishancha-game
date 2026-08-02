// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChapterResult } from "../../src/features/chapter-result/ChapterResult";
import { getChapterSettlementCopy } from "../../src/features/chapter-result/chapter-settlement-copy";
import { useGameStore } from "../../src/stores/game-store";
import { createEmptyProgress } from "../../src/types/progress";
import type { StoryChapter } from "../../src/types/story";
import { createFrameworkStory } from "../fixtures/framework-story";

const always = { type: "always" as const };
const originalCompleteCurrentChapter =
  useGameStore.getState().completeCurrentChapter;

function createResultChapter(id: string, order: number, title: string): StoryChapter {
  return {
    id,
    order,
    title,
    summary: `${title}测试章节`,
    scenes: [],
    journalEntries: [],
    result: {
      eyebrow: `${title}调查结论`,
      title: `${title}结算标题`,
      summary: `${title}结算摘要`,
      confirmedFacts: [`${title}已确认事实`],
      unresolvedQuestions: [`${title}未解决问题`],
      closingLine: `${title}结语`,
      evaluationTiers: [
        {
          minimumScore: 0,
          title: "测试评价",
          description: "测试说明"
        }
      ]
    },
    objectives: [
      {
        id: `objective-${id}`,
        text: `${title}目标`,
        completionCondition: always
      }
    ],
    entryCondition: always,
    completionCondition: always,
    initialEvents: [],
    contentIds: [],
    dialogueIds: [],
    reasoningIds: [],
    nextChapterId: null
  };
}

function createResultStory() {
  const story = createFrameworkStory();
  const chapterOne = createResultChapter("chapter-01", 1, "第一章");
  const chapterTwo = createResultChapter("chapter-02", 2, "第二章");

  story.chapters = {
    [chapterOne.id]: chapterOne,
    [chapterTwo.id]: chapterTwo
  };
  story.observations = {
    "observation-chapter-01": {
      id: "observation-chapter-01",
      chapterId: chapterOne.id,
      title: "第一章观察",
      description: "第一章观察描述",
      sourceContentIds: [],
      discoverCondition: always,
      onDiscoverEvents: []
    },
    "observation-chapter-02": {
      id: "observation-chapter-02",
      chapterId: chapterTwo.id,
      title: "第二章观察",
      description: "第二章观察描述",
      sourceContentIds: [],
      discoverCondition: always,
      onDiscoverEvents: []
    }
  };

  return { story, chapterOne, chapterTwo };
}

function setResultState(
  chapter: StoryChapter,
  completedChapterIds: string[] = []
) {
  const { story } = createResultStory();

  useGameStore.setState({
    story,
    sessionStarted: true,
    ...createEmptyProgress(),
    currentChapterId: chapter.id,
    chapterStage: completedChapterIds.includes(chapter.id)
      ? "completed"
      : "result",
    completedChapterIds,
    completedObjectiveIds: [`objective-${chapter.id}`],
    discoveredObservationIds: [`observation-${chapter.id}`],
    chapterProgressById: {
      [chapter.id]: {
        status: completedChapterIds.includes(chapter.id)
          ? "completed"
          : "in-progress",
        stage: completedChapterIds.includes(chapter.id)
          ? "completed"
          : "result",
        completedObjectiveIds: [`objective-${chapter.id}`],
        progressPercent: 100
      }
    }
  });

  return story;
}

afterEach(() => {
  cleanup();
  useGameStore.setState({
    story: null,
    sessionStarted: false,
    completeCurrentChapter: originalCompleteCurrentChapter,
    ...createEmptyProgress()
  });
});

describe("ChapterResult chapter-aware settlement copy", () => {
  it("renders and completes the first chapter using its bound chapter id", async () => {
    const user = userEvent.setup();
    const { chapterOne } = createResultStory();
    const story = setResultState(chapterOne);
    const completeCurrentChapter = vi.fn(async () => undefined);
    useGameStore.setState({ completeCurrentChapter });

    render(<ChapterResult chapter={story.chapters[chapterOne.id]} />);

    expect(screen.getByText("Chapter 01 · Settlement")).toBeTruthy();
    const archiveButton = screen.getByRole("button", {
      name: "封存第一章调查记录"
    });
    await user.click(archiveButton);
    expect(completeCurrentChapter).toHaveBeenCalledWith("chapter-01");
  });

  it("renders and completes the second chapter using its bound chapter id", async () => {
    const user = userEvent.setup();
    const { chapterTwo } = createResultStory();
    const story = setResultState(chapterTwo);
    const completeCurrentChapter = vi.fn(async () => undefined);
    useGameStore.setState({ completeCurrentChapter });

    render(<ChapterResult chapter={story.chapters[chapterTwo.id]} />);

    expect(screen.getByText("Chapter 02 · Settlement")).toBeTruthy();
    const archiveButton = screen.getByRole("button", {
      name: "封存第二章调查记录"
    });
    await user.click(archiveButton);
    expect(completeCurrentChapter).toHaveBeenCalledWith("chapter-02");
  });

  it("keeps each completed chapter's copy when results are reopened", () => {
    const { story, chapterOne, chapterTwo } = createResultStory();
    useGameStore.setState({
      story,
      sessionStarted: true,
      ...createEmptyProgress(),
      currentChapterId: chapterOne.id,
      chapterStage: "completed",
      completedChapterIds: [chapterOne.id, chapterTwo.id],
      completedObjectiveIds: [`objective-${chapterOne.id}`],
      discoveredObservationIds: [
        `observation-${chapterOne.id}`,
        `observation-${chapterTwo.id}`
      ],
      chapterProgressById: {
        [chapterOne.id]: {
          status: "completed",
          stage: "completed",
          completedObjectiveIds: [`objective-${chapterOne.id}`],
          progressPercent: 100
        },
        [chapterTwo.id]: {
          status: "completed",
          stage: "completed",
          completedObjectiveIds: [`objective-${chapterTwo.id}`],
          progressPercent: 100
        }
      }
    });

    const view = render(<ChapterResult chapter={chapterOne} />);
    expect(screen.getByText("Chapter 01 · Settlement")).toBeTruthy();
    expect(
      (screen.getByRole("button", {
        name: "第一章已完成"
      }) as HTMLButtonElement).disabled
    ).toBe(true);

    useGameStore.setState({
      currentChapterId: chapterTwo.id,
      completedObjectiveIds: [`objective-${chapterTwo.id}`]
    });
    view.rerender(<ChapterResult chapter={chapterTwo} />);

    expect(screen.getByText("Chapter 02 · Settlement")).toBeTruthy();
    expect(
      (screen.getByRole("button", {
        name: "第二章已完成"
      }) as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it("restores second chapter copy from completed save state", () => {
    const { chapterTwo } = createResultStory();
    const story = setResultState(chapterTwo, ["chapter-01", "chapter-02"]);

    render(<ChapterResult chapter={story.chapters[chapterTwo.id]} />);

    expect(screen.getByText("Chapter 02 · Settlement")).toBeTruthy();
    expect(
      (screen.getByRole("button", {
        name: "第二章已完成"
      }) as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it("formats future chapter orders and safely degrades missing data", () => {
    expect(getChapterSettlementCopy({ order: 5 })).toEqual({
      settlementLabel: "Chapter 05 · Settlement",
      archiveLabel: "封存第五章调查记录",
      completedLabel: "第五章已完成"
    });
    expect(getChapterSettlementCopy({ order: 12 })).toEqual({
      settlementLabel: "Chapter 12 · Settlement",
      archiveLabel: "封存第十二章调查记录",
      completedLabel: "第十二章已完成"
    });
    expect(getChapterSettlementCopy(undefined)).toEqual({
      settlementLabel: "Chapter -- · Settlement",
      archiveLabel: "封存当前章节调查记录",
      completedLabel: "当前章节已完成"
    });
  });

  it("does not use chapter-specific id branches in settlement implementation", () => {
    const componentSource = readFileSync(
      "src/features/chapter-result/ChapterResult.tsx",
      "utf8"
    );
    const copySource = readFileSync(
      "src/features/chapter-result/chapter-settlement-copy.ts",
      "utf8"
    );

    expect(`${componentSource}\n${copySource}`).not.toMatch(
      /chapter-01|chapter-02/
    );
  });
});
