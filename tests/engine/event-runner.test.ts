import { describe, expect, it } from "vitest";
import { runEvent } from "../../src/engine/event-runner/event-runner";
import { createEmptyProgress } from "../../src/types/progress";

describe("event runner", () => {
  it("applies collection events idempotently", () => {
    const initial = createEmptyProgress();
    const once = runEvent(initial, {
      type: "collectEvidence",
      evidenceId: "evidence-yishu-fingerprint"
    });
    const twice = runEvent(once, {
      type: "collectEvidence",
      evidenceId: "evidence-yishu-fingerprint"
    });

    expect(once.collectedEvidenceIds).toEqual([
      "evidence-yishu-fingerprint"
    ]);
    expect(twice).toBe(once);
  });
});
