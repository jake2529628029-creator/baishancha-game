import { describe, expect, it } from "vitest";
import chapter from "../../public/story/runtime/chapters/chapter-01.json";
import chapterTwo from "../../public/story/runtime/chapters/chapter-02.json";
import chapterManifest from "../../public/story/runtime/chapter-manifest.json";
import content from "../../public/story/runtime/content/chapter-01.json";
import contentTwo from "../../public/story/runtime/content/chapter-02.json";
import detectiveBoards from "../../public/story/runtime/framework/detective-boards.json";
import detectiveBoardsTwo from "../../public/story/runtime/framework/detective-boards-chapter-02.json";
import relationships from "../../public/story/runtime/framework/relationships.json";
import relationshipsTwo from "../../public/story/runtime/framework/relationships-chapter-02.json";
import timelines from "../../public/story/runtime/framework/timelines.json";
import dialogues from "../../public/story/runtime/dialogues/shen-yishu-chapter-01.json";
import dialoguesTwo from "../../public/story/runtime/dialogues/chapter-02.json";
import evidence from "../../public/story/runtime/evidence/chapter-01.json";
import evidenceTwo from "../../public/story/runtime/evidence/chapter-02.json";
import manifest from "../../public/story/runtime/manifest.json";
import observations from "../../public/story/runtime/observations/chapter-01.json";
import observationsTwo from "../../public/story/runtime/observations/chapter-02.json";
import reasoning from "../../public/story/runtime/reasoning/chapter-01.json";
import { createFrameworkStory } from "../fixtures/framework-story";
import {
  StoryValidationError,
  validateChapter,
  validateChapterManifest,
  validateContent,
  validateDetectiveBoardBundle,
  validateDialogues,
  validateEvidence,
  validateManifest,
  validateObservations,
  validateRelationshipBundle,
  validateReasoning,
  validateTimelineBundle
} from "../../src/engine/story-loader/story-validation";

describe("story JSON validation", () => {
  it("accepts the V0.1 manifest", () => {
    expect(validateManifest(manifest).gameId).toBe("white-camellia-will");
  });

  it("accepts the chapter 0-5 manifest", () => {
    expect(validateChapterManifest(chapterManifest).chapters).toHaveLength(6);
  });

  it("accepts the test chapter", () => {
    expect(validateChapter(chapter).id).toBe("chapter-01");
    expect(validateChapter(chapterTwo).id).toBe("chapter-02");
  });

  it("accepts all V0.2 chapter data bundles", () => {
    expect(validateContent(content)).toHaveLength(7);
    expect(validateObservations(observations)).toHaveLength(6);
    expect(validateEvidence(evidence)).toHaveLength(6);
    expect(validateDialogues(dialogues)).toHaveLength(4);
    expect(validateReasoning(reasoning)).toHaveLength(3);
    expect(validateRelationshipBundle(relationships).relationships).toEqual([]);
    expect(validateTimelineBundle(timelines).events).toEqual([]);
    expect(validateDetectiveBoardBundle(detectiveBoards).boards).toEqual([]);
  });

  it("accepts every second chapter runtime bundle", () => {
    expect(validateContent(contentTwo)).toHaveLength(14);
    expect(validateObservations(observationsTwo)).toHaveLength(29);
    expect(validateEvidence(evidenceTwo)).toHaveLength(6);
    expect(validateDialogues(dialoguesTwo)).toHaveLength(2);
    const relationshipBundle = validateRelationshipBundle(relationshipsTwo);
    expect(relationshipBundle.characters).toHaveLength(5);
    expect(relationshipBundle.relationships).toHaveLength(8);
    const boardBundle = validateDetectiveBoardBundle(detectiveBoardsTwo);
    expect(boardBundle.boards).toHaveLength(1);
    expect(boardBundle.boards[0].cards).toHaveLength(9);
    expect(boardBundle.boards[0].propositions).toHaveLength(2);
  });

  it("accepts non-empty V0.4 framework bundles", () => {
    const story = createFrameworkStory();

    expect(
      validateRelationshipBundle({
        characters: Object.values(story.characters),
        relationships: Object.values(story.relationships)
      }).relationships
    ).toHaveLength(1);
    expect(
      validateTimelineBundle({
        events: Object.values(story.timelineEvents),
        puzzles: Object.values(story.timelinePuzzles)
      }).puzzles
    ).toHaveLength(1);
    expect(
      validateDetectiveBoardBundle({
        boards: Object.values(story.detectiveBoards)
      }).boards
    ).toHaveLength(1);
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
