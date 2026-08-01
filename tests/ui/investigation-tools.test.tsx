// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChapterSelect } from "../../src/features/chapter-select/ChapterSelect";
import { DetectiveBoardView } from "../../src/features/detective-board/DetectiveBoard";
import { RelationshipGraphView } from "../../src/features/relationship-graph/RelationshipGraph";
import { TimelineBoardView } from "../../src/features/timeline-board/TimelineBoard";
import {
  prototypeCharacters,
  prototypeDetectiveBoard,
  prototypeRelationshipHistory,
  prototypeRelationships,
  prototypeRelationshipStates,
  prototypeTimelineEvents,
  prototypeTimelinePuzzle
} from "../../src/features/investigation-tools/prototype-data";
import { useGameStore } from "../../src/stores/game-store";
import type {
  DetectiveBoardConnection,
  DetectiveBoardState
} from "../../src/types/detective-board";
import { createEmptyProgress } from "../../src/types/progress";
import { createFrameworkStory } from "../fixtures/framework-story";
import { useState } from "react";

afterEach(() => {
  cleanup();
  useGameStore.setState({
    story: null,
    sessionStarted: false,
    ...createEmptyProgress()
  });
});

describe("V0.4.2 investigation tool UI", () => {
  it("renders chapter state and progress from the manifest/store", () => {
    const story = createFrameworkStory();
    story.chapterManifest.chapters[1] = {
      ...story.chapterManifest.chapters[1],
      title: "茶杯上的指纹",
      availability: "available",
      chapterFile: "chapters/chapter-01.json"
    };
    useGameStore.setState({
      story,
      unlockedChapterIds: ["chapter-01"],
      chapterProgressById: {
        "chapter-01": {
          status: "in-progress",
          stage: "investigating",
          completedObjectiveIds: [],
          progressPercent: 40
        }
      }
    });

    render(<ChapterSelect onBack={() => undefined} />);

    expect(screen.getByRole("heading", { name: "茶杯上的指纹" })).toBeTruthy();
    expect(
      screen.getByRole("progressbar", { name: "茶杯上的指纹调查完成度" })
      .getAttribute("aria-valuenow")
    ).toBe("40");
    expect(screen.getAllByRole("button", { name: "封存" }).length).toBeGreaterThan(0);
  });

  it("shows categorical relationship insight and its change history", async () => {
    const user = userEvent.setup();
    render(
      <RelationshipGraphView
        characters={prototypeCharacters}
        relationships={prototypeRelationships}
        states={prototypeRelationshipStates}
        history={prototypeRelationshipHistory}
      />
    );

    await user.click(screen.getByRole("button", { name: /人物甲.*声称保护.*人物乙/ }));

    expect(screen.getAllByText("重新理解").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/有所察觉/).length).toBeGreaterThan(0);
    expect(screen.queryByText("75")).toBeNull();
  });

  it("reorders timeline cards and reports correct/incorrect submissions", async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async (order: string[]) => {
      const matched =
        order.join("|") ===
        prototypeTimelinePuzzle.solutions[0].orderedEventIds.join("|");
      return {
        matched,
        feedback: matched ? "时间顺序成立。" : "顺序仍有矛盾。"
      };
    });
    render(
      <TimelineBoardView
        events={prototypeTimelineEvents}
        puzzle={prototypeTimelinePuzzle}
        onSubmit={submit}
      />
    );

    await user.click(screen.getByRole("button", { name: "验证时间顺序" }));
    expect(await screen.findByText("顺序仍有矛盾。")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "门厅记录出现上移" }));
    await user.click(screen.getByRole("button", { name: "门厅记录出现上移" }));
    await user.click(screen.getByRole("button", { name: "走廊脚步经过上移" }));
    await user.click(screen.getByRole("button", { name: "验证时间顺序" }));

    expect(await screen.findByText("时间顺序成立。")).toBeTruthy();
    expect(submit).toHaveBeenLastCalledWith([
      "time-1",
      "time-2",
      "time-3",
      "time-4"
    ]);
  });

  it("creates and deletes a detective-board connection through the UI", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [state, setState] = useState<DetectiveBoardState>({
        placements: [],
        connections: [],
        solvedPropositionIds: []
      });
      return (
        <DetectiveBoardView
          definition={prototypeDetectiveBoard}
          state={state}
          onPlace={() => undefined}
          onConnect={(connection: DetectiveBoardConnection) =>
            setState((current) => ({
              ...current,
              connections: [...current.connections, connection]
            }))
          }
          onDisconnect={(connectionId) =>
            setState((current) => ({
              ...current,
              connections: current.connections.filter(
                (connection) => connection.id !== connectionId
              )
            }))
          }
          onSubmitProposition={async () => null}
        />
      );
    }

    render(<Harness />);
    const evidenceCard = screen.getByText("证据样本").closest("article");
    const timeCard = screen.getByText("21:14 时间卡").closest("article");
    expect(evidenceCard).not.toBeNull();
    expect(timeCard).not.toBeNull();

    await user.click(
      within(evidenceCard as HTMLElement).getByRole("button", {
        name: "用于连线"
      })
    );
    await user.click(
      within(timeCard as HTMLElement).getByRole("button", {
        name: "用于连线"
      })
    );
    await user.selectOptions(screen.getByLabelText("关系"), "contradicts");
    await user.click(screen.getByRole("button", { name: "连接卡片" }));

    const deleteButton = screen.getByRole("button", { name: "删除矛盾连接" });
    expect(deleteButton).toBeTruthy();
    await user.click(deleteButton);
    expect(screen.queryByRole("button", { name: "删除矛盾连接" })).toBeNull();
  });
});
