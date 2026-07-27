import { beforeAll, describe, expect, it, vi } from "vitest";
import chapter from "../../public/story/runtime/chapters/chapter-01.json";
import content from "../../public/story/runtime/content/chapter-01.json";
import dialogues from "../../public/story/runtime/dialogues/shen-yishu-chapter-01.json";
import evidence from "../../public/story/runtime/evidence/chapter-01.json";
import manifest from "../../public/story/runtime/manifest.json";
import observations from "../../public/story/runtime/observations/chapter-01.json";
import reasoning from "../../public/story/runtime/reasoning/chapter-01.json";
import {
  completeActiveChapter,
  discoverObservation,
  enterChapter,
  viewContent
} from "../../src/engine/chapter-engine/chapter-engine";
import { presentDialogueEvidence } from "../../src/engine/dialogue-engine/dialogue-engine";
import { submitReasoning } from "../../src/engine/reasoning-engine/reasoning-engine";
import { loadStory } from "../../src/engine/story-loader/story-loader";
import { createChapterReport } from "../../src/features/chapter-result/chapter-report";
import { createEmptyProgress } from "../../src/types/progress";
import type { LoadedStory } from "../../src/types/story";

describe("chapter one standard playthrough", () => {
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

  it("advances from chapter entry to the result stage using JSON events", () => {
    let state = enterChapter(
      story,
      createEmptyProgress(),
      "chapter-01"
    );

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
    state = viewContent(story, state, "content-transfer-order");
    state = discoverObservation(
      story,
      state,
      "observation-transfer-at-2300"
    );
    state = viewContent(story, state, "content-argument-chat");
    state = discoverObservation(
      story,
      state,
      "observation-mother-daughter-conflict"
    );

    state = presentDialogueEvidence(
      story,
      state,
      "dialogue-yishu-tea",
      ["evidence-yishu-fingerprint", "evidence-aconite-in-tea"]
    ).state;

    state = presentDialogueEvidence(
      story,
      state,
      "dialogue-yishu-transfer",
      ["evidence-transfer-order"]
    ).state;

    state = viewContent(story, state, "content-sisters-chat");
    state = discoverObservation(
      story,
      state,
      "observation-yishu-refused-leaving"
    );

    state = submitReasoning(
      story,
      state,
      "reasoning-fingerprint",
      ["evidence-yishu-fingerprint"]
    ).state;

    state = submitReasoning(
      story,
      state,
      "reasoning-motive",
      ["evidence-transfer-order", "evidence-mother-daughter-conflict"]
    ).state;

    expect(state.unlockedReasoningIds).toContain(
      "reasoning-first-hypothesis"
    );

    state = submitReasoning(
      story,
      state,
      "reasoning-first-hypothesis",
      [
        "evidence-yishu-fingerprint",
        "evidence-aconite-in-tea",
        "evidence-transfer-order",
        "evidence-mother-daughter-conflict"
      ]
    ).state;

    expect(state.unlockedContentIds).toContain(
      "content-toxicology-appendix"
    );

    state = viewContent(story, state, "content-toxicology-appendix");
    state = discoverObservation(
      story,
      state,
      "observation-insufficient-dose"
    );

    expect(state.chapterStage).toBe("result");
    expect(state.completedObjectiveIds).toHaveLength(5);
    expect(state.collectedEvidenceIds).toContain(
      "evidence-insufficient-dose"
    );
    expect(state.reasoningAttempts).toHaveLength(3);

    const report = createChapterReport(
      story,
      story.chapters["chapter-01"],
      state
    );

    expect(report.investigationPercent).toBe(100);
    expect(report.discoveredClueIds).toHaveLength(6);
    expect(report.wrongAttempts).toHaveLength(0);
    expect(report.score).toBe(100);
    expect(report.evaluation.title).toBe("冷静的证据主义者");

    const reportWithWrongAttempt = createChapterReport(
      story,
      story.chapters["chapter-01"],
      {
        ...state,
        reasoningAttempts: [
          ...state.reasoningAttempts,
          {
            reasoningId: "reasoning-fingerprint",
            evidenceIds: ["evidence-aconite-in-tea"],
            matched: false,
            solutionId: null
          }
        ]
      }
    );

    expect(reportWithWrongAttempt.score).toBe(95);
    expect(reportWithWrongAttempt.wrongAttempts).toHaveLength(1);
    expect(reportWithWrongAttempt.evaluation.title).toBe("敏锐的案情拆解者");

    state = completeActiveChapter(story, state);

    expect(state.chapterStage).toBe("completed");
    expect(state.completedChapterIds).toContain("chapter-01");
  });
});
