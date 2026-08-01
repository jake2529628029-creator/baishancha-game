// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  DialoguePanel,
  getDialoguePanelDisplay
} from "../../src/features/dialogue/DialoguePanel";
import { useGameStore } from "../../src/stores/game-store";
import type { DialogueNode } from "../../src/types/dialogue";
import { createEmptyProgress } from "../../src/types/progress";
import type { StoryChapter } from "../../src/types/story";
import { createFrameworkStory } from "../fixtures/framework-story";

const always = { type: "always" as const };

function createDialogue(
  id: string,
  characterId: string,
  characterName: string,
  topic: string
): DialogueNode {
  return {
    id,
    chapterId: "chapter-02",
    characterId,
    characterName,
    topic,
    entryCondition: always,
    openingLines: [
      {
        speakerId: characterId,
        text: `${characterName}的开场陈述。`
      }
    ],
    evidenceResponses: [],
    fallbackLines: [
      {
        speakerId: characterId,
        text: "当前证据不足。"
      }
    ],
    completionEvents: []
  };
}

function createDialogueChapter(dialogueIds: string[]): StoryChapter {
  return {
    id: "chapter-02",
    order: 2,
    title: "不存在的女儿",
    summary: "Dialogue component test chapter.",
    scenes: [
      {
        id: "scene-dialogue-test",
        name: "测试场景",
        eyebrow: "测试",
        description: "用于验证多人物对话标题。",
        contentIds: []
      }
    ],
    journalEntries: [
      {
        id: "journal-dialogue-test",
        category: "question",
        title: "测试问题",
        text: "测试文本",
        revealCondition: always
      }
    ],
    result: {
      eyebrow: "测试",
      title: "测试结果",
      summary: "测试摘要",
      confirmedFacts: ["测试事实"],
      unresolvedQuestions: ["测试问题"],
      closingLine: "测试结语",
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
        id: "objective-dialogue-test",
        text: "测试目标",
        completionCondition: always
      }
    ],
    entryCondition: always,
    completionCondition: always,
    initialEvents: [],
    contentIds: [],
    dialogueIds,
    reasoningIds: [],
    nextChapterId: null
  };
}

afterEach(() => {
  cleanup();
  useGameStore.setState({
    story: null,
    sessionStarted: false,
    ...createEmptyProgress()
  });
});

describe("DialoguePanel character display", () => {
  it("switches the panel title between 沈意舒 and 何清和 from dialogue data", async () => {
    const user = userEvent.setup();
    const yishu = createDialogue(
      "dialogue-ch02-yishu-identity-choice",
      "shen-yishu",
      "沈意舒",
      "我申请的不是一个答案"
    );
    const he = createDialogue(
      "dialogue-ch02-he-authorization-boundary",
      "he-qinghe",
      "何清和",
      "当时的授权"
    );
    const story = createFrameworkStory();
    story.chapters["chapter-02"] = createDialogueChapter([yishu.id, he.id]);
    story.dialogues = {
      [yishu.id]: yishu,
      [he.id]: he
    };

    useGameStore.setState({
      story,
      currentChapterId: "chapter-02",
      unlockedDialogueIds: [yishu.id, he.id]
    });

    render(<DialoguePanel />);

    expect(screen.getByRole("heading", { name: "沈意舒" })).toBeTruthy();
    expect(screen.getByText("当前话题：我申请的不是一个答案")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /当时的授权/ }));

    expect(screen.getByRole("heading", { name: "何清和" })).toBeTruthy();
    expect(screen.getByText("当前话题：当时的授权")).toBeTruthy();
  });

  it("falls back safely when optional display values are unavailable", () => {
    expect(getDialoguePanelDisplay(undefined)).toEqual({
      characterName: "待确认人物",
      topic: "未命名话题"
    });
    expect(
      getDialoguePanelDisplay({
        characterName: " ",
        topic: ""
      })
    ).toEqual({
      characterName: "待确认人物",
      topic: "未命名话题"
    });
  });
});
