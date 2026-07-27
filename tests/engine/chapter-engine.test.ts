import { beforeAll, describe, expect, it, vi } from "vitest";
import chapter from "../../public/story/runtime/chapters/chapter-01.json";
import content from "../../public/story/runtime/content/chapter-01.json";
import dialogues from "../../public/story/runtime/dialogues/shen-yishu-chapter-01.json";
import evidence from "../../public/story/runtime/evidence/chapter-01.json";
import manifest from "../../public/story/runtime/manifest.json";
import observations from "../../public/story/runtime/observations/chapter-01.json";
import reasoning from "../../public/story/runtime/reasoning/chapter-01.json";
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

describe("chapter engine", () => {
  let story: LoadedStory;

  beforeAll(async () => {
    const payloadBySuffix: Record<string, unknown> = {
      "manifest.json": manifest,
      "chapters/chapter-01.json": chapter,
      "content/chapter-01.json": content,
      "observations/chapter-01.json": observations,
      "evidence/chapter-01.json": evidence,
      "dialogues/shen-yishu-chapter-01.json": dialogues,
      "reasoning/chapter-01.json": reasoning
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        const suffix = Object.keys(payloadBySuffix).find((key) =>
          url.endsWith(key)
        );
        const payload = suffix ? payloadBySuffix[suffix] : undefined;

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
});
