import { describe, expect, it } from "vitest";
import { evaluateCondition } from "../../src/engine/condition-evaluator/condition-evaluator";
import { createEmptyProgress } from "../../src/types/progress";

describe("condition evaluator", () => {
  it("evaluates nested all, any and not conditions", () => {
    const state = {
      ...createEmptyProgress(),
      viewedContentIds: ["content-scene-report"],
      collectedEvidenceIds: ["evidence-yishu-fingerprint"]
    };

    expect(
      evaluateCondition(
        {
          type: "all",
          conditions: [
            {
              type: "contentViewed",
              contentId: "content-scene-report"
            },
            {
              type: "any",
              conditions: [
                {
                  type: "evidenceCollected",
                  evidenceId: "evidence-yishu-fingerprint"
                },
                {
                  type: "flagEquals",
                  flagId: "missing",
                  value: true
                }
              ]
            },
            {
              type: "not",
              condition: {
                type: "chapterCompleted",
                chapterId: "chapter-01"
              }
            }
          ]
        },
        state
      )
    ).toBe(true);
  });
});
