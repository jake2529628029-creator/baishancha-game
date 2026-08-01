import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  discoverObservation,
  dispatchChapterEvents,
  enterChapter,
  viewContent
} from "../../src/engine/chapter-engine/chapter-engine";
import { loadStory } from "../../src/engine/story-loader/story-loader";
import { presentDialogueEvidence } from "../../src/engine/dialogue-engine/dialogue-engine";
import { submitReasoning } from "../../src/engine/reasoning-engine/reasoning-engine";
import { createEmptyProgress } from "../../src/types/progress";
import type { LoadedStory } from "../../src/types/story";
import { runtimePayloadForUrl } from "../fixtures/runtime-payloads";

describe("chapter engine", () => {
  let story: LoadedStory;

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
    vi.unstubAllGlobals();
  });

  it("enters chapter one and unlocks its initial content", () => {
    const state = enterChapter(story, createEmptyProgress(), "chapter-01");

    expect(state.chapterStage).toBe("investigating");
    expect(state.unlockedChapterIds).toEqual(
      expect.arrayContaining(["chapter-00", "chapter-01"])
    );
    expect(state.chapterProgressById["chapter-01"].status).toBe(
      "in-progress"
    );
    expect(state.unlockedContentIds).toEqual(
      expect.arrayContaining([
        "content-scene-report",
        "content-teacup-photo",
        "content-transfer-order"
      ])
    );
  });

  it("views content, discovers an observation and collects evidence", () => {
    let state = enterChapter(story, createEmptyProgress(), "chapter-01");
    state = viewContent(story, state, "content-scene-report");

    expect(state.viewedContentIds).toContain("content-scene-report");
    expect(state.completedObjectiveIds).toContain("inspect-scene");
    expect(
      state.chapterProgressById["chapter-01"].completedObjectiveIds
    ).toContain("inspect-scene");
    expect(state.chapterProgressById["chapter-01"].progressPercent).toBeGreaterThan(
      0
    );
    expect(state.unlockedContentIds).toContain(
      "content-toxicology-summary"
    );

    state = viewContent(story, state, "content-teacup-photo");
    state = discoverObservation(
      story,
      state,
      "observation-yishu-fingerprint"
    );

    expect(state.collectedEvidenceIds).toContain(
      "evidence-yishu-fingerprint"
    );
    expect(state.unlockedDialogueIds).toContain("dialogue-yishu-tea");
  });

  it("only completes a dialogue when the presented evidence set matches", () => {
    let state = enterChapter(story, createEmptyProgress(), "chapter-01");
    state = viewContent(story, state, "content-scene-report");
    state = viewContent(story, state, "content-teacup-photo");
    state = discoverObservation(
      story,
      state,
      "observation-yishu-fingerprint"
    );
    state = viewContent(story, state, "content-toxicology-summary");
    state = discoverObservation(
      story,
      state,
      "observation-aconite-in-tea"
    );

    const wrongAttempt = presentDialogueEvidence(
      story,
      state,
      "dialogue-yishu-tea",
      ["evidence-yishu-fingerprint"]
    );

    expect(wrongAttempt.matched).toBe(false);
    expect(wrongAttempt.state).toBe(state);
    expect(state.completedDialogueIds).not.toContain("dialogue-yishu-tea");

    const correctAttempt = presentDialogueEvidence(
      story,
      state,
      "dialogue-yishu-tea",
      ["evidence-yishu-fingerprint", "evidence-aconite-in-tea"]
    );

    expect(correctAttempt.matched).toBe(true);
    expect(correctAttempt.state.completedDialogueIds).toContain(
      "dialogue-yishu-tea"
    );
    expect(correctAttempt.state.unlockedReasoningIds).toContain(
      "reasoning-fingerprint"
    );
  });

  it("keeps wrong reasoning reversible and records an exact solution", () => {
    let state = enterChapter(story, createEmptyProgress(), "chapter-01");
    state = dispatchChapterEvents(story, state, [
      {
        type: "collectEvidence",
        evidenceId: "evidence-yishu-fingerprint"
      },
      {
        type: "collectEvidence",
        evidenceId: "evidence-transfer-order"
      },
      {
        type: "collectEvidence",
        evidenceId: "evidence-mother-daughter-conflict"
      },
      {
        type: "unlockReasoning",
        reasoningId: "reasoning-motive"
      }
    ]);

    const wrongAttempt = submitReasoning(
      story,
      state,
      "reasoning-motive",
      ["evidence-transfer-order", "evidence-yishu-fingerprint"]
    );

    expect(wrongAttempt.matched).toBe(false);
    expect(wrongAttempt.state.reasoningResults["reasoning-motive"]).toBeUndefined();
    expect(wrongAttempt.state.reasoningAttempts).toEqual([
      {
        reasoningId: "reasoning-motive",
        evidenceIds: [
          "evidence-transfer-order",
          "evidence-yishu-fingerprint"
        ],
        matched: false,
        solutionId: null
      }
    ]);
    expect(wrongAttempt.feedback).toContain("不足以");

    const correctAttempt = submitReasoning(
      story,
      state,
      "reasoning-motive",
      ["evidence-transfer-order", "evidence-mother-daughter-conflict"]
    );

    expect(correctAttempt.matched).toBe(true);
    expect(correctAttempt.state.reasoningResults["reasoning-motive"]).toBe(
      "solution-immediate-pressure"
    );
    expect(correctAttempt.state.reasoningAttempts[0].matched).toBe(true);
  });

  it("saves and restores chapter-local progress when switching chapters", () => {
    const chapterTwo = {
      ...story.chapters["chapter-01"],
      id: "chapter-02",
      order: 2,
      title: "Framework Chapter",
      scenes: [],
      journalEntries: [],
      objectives: [
        {
          id: "chapter-two-objective",
          text: "Framework objective",
          completionCondition: {
            type: "flagEquals" as const,
            flagId: "chapter-two-complete",
            value: true
          }
        }
      ],
      initialEvents: [
        {
          type: "setChapterStage" as const,
          stage: "investigating" as const
        }
      ],
      contentIds: [],
      dialogueIds: [],
      reasoningIds: [],
      entryCondition: {
        type: "always" as const
      },
      completionCondition: {
        type: "flagEquals" as const,
        flagId: "chapter-two-complete",
        value: true
      },
      nextChapterId: null
    };
    const twoChapterStory: LoadedStory = {
      ...story,
      chapterManifest: {
        ...story.chapterManifest,
        chapters: story.chapterManifest.chapters.map((entry) =>
          entry.id === "chapter-02"
            ? {
                ...entry,
                availability: "available",
                chapterFile: "chapters/chapter-02.json",
                unlockCondition: {
                  type: "always"
                }
              }
            : entry
        )
      },
      chapters: {
        ...story.chapters,
        "chapter-02": chapterTwo
      }
    };
    let state = enterChapter(
      twoChapterStory,
      createEmptyProgress(),
      "chapter-01"
    );

    state = viewContent(twoChapterStory, state, "content-scene-report");
    expect(state.completedObjectiveIds).toContain("inspect-scene");

    state = enterChapter(twoChapterStory, state, "chapter-02");
    expect(state.currentChapterId).toBe("chapter-02");
    expect(
      state.chapterProgressById["chapter-01"].completedObjectiveIds
    ).toContain("inspect-scene");

    state = enterChapter(twoChapterStory, state, "chapter-01");
    expect(state.completedObjectiveIds).toContain("inspect-scene");
  });
});
