import { describe, expect, it } from "vitest";
import chapter from "../../public/story/runtime/chapters/chapter-01.json";
import content from "../../public/story/runtime/content/chapter-01.json";
import dialogues from "../../public/story/runtime/dialogues/shen-yishu-chapter-01.json";
import evidence from "../../public/story/runtime/evidence/chapter-01.json";
import manifest from "../../public/story/runtime/manifest.json";
import observations from "../../public/story/runtime/observations/chapter-01.json";
import reasoning from "../../public/story/runtime/reasoning/chapter-01.json";
import {
  StoryValidationError,
  validateChapter,
  validateContent,
  validateDialogues,
  validateEvidence,
  validateManifest,
  validateObservations,
  validateReasoning
} from "../../src/engine/story-loader/story-validation";

describe("story JSON validation", () => {
  it("accepts the V0.1 manifest", () => {
    expect(validateManifest(manifest).gameId).toBe("white-camellia-will");
  });

  it("accepts the test chapter", () => {
    expect(validateChapter(chapter).id).toBe("chapter-01");
  });

  it("accepts all V0.2 chapter data bundles", () => {
    expect(validateContent(content)).toHaveLength(7);
    expect(validateObservations(observations)).toHaveLength(6);
    expect(validateEvidence(evidence)).toHaveLength(6);
    expect(validateDialogues(dialogues)).toHaveLength(4);
    expect(validateReasoning(reasoning)).toHaveLength(3);
  });

  it("rejects a chapter without objectives", () => {
    const invalidChapter = {
      ...chapter,
      objectives: []
    };

    expect(() => validateChapter(invalidChapter)).toThrow(
      StoryValidationError
    );
  });
});
