import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import chapter from "../../public/story/runtime/chapters/chapter-02.json";
import chapterManifest from "../../public/story/runtime/chapter-manifest.json";
import content from "../../public/story/runtime/content/chapter-02.json";
import dialogues from "../../public/story/runtime/dialogues/chapter-02.json";
import evidence from "../../public/story/runtime/evidence/chapter-02.json";
import boardBundle from "../../public/story/runtime/framework/detective-boards-chapter-02.json";
import relationshipBundle from "../../public/story/runtime/framework/relationships-chapter-02.json";
import manifest from "../../public/story/runtime/manifest.json";
import observations from "../../public/story/runtime/observations/chapter-02.json";

type Condition = {
  type: string;
  conditions?: Condition[];
  contentId?: string;
  observationId?: string;
  evidenceId?: string;
  dialogueId?: string;
  objectiveId?: string;
  chapterId?: string;
  boardId?: string;
  propositionId?: string;
};

function walkCondition(
  condition: Condition,
  visit: (condition: Condition) => void
): void {
  visit(condition);
  condition.conditions?.forEach((child) => walkCondition(child, visit));
}

function uniqueIds(items: Array<{ id: string }>): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

describe("chapter two runtime integrity", () => {
  const board = boardBundle.boards[0];
  const chapterIds = new Set(
    chapterManifest.chapters.map((entry) => entry.id)
  );
  const contentIds = new Set(content.map((item) => item.id));
  const observationIds = new Set(observations.map((item) => item.id));
  const evidenceIds = new Set(evidence.map((item) => item.id));
  const dialogueIds = new Set(dialogues.map((item) => item.id));
  const characterIds = new Set(
    relationshipBundle.characters.map((item) => item.id)
  );
  const relationshipIds = new Set(
    relationshipBundle.relationships.map((item) => item.id)
  );
  const objectiveIds = new Set(chapter.objectives.map((item) => item.id));
  const propositionIds = new Set(
    board.propositions.map((item) => item.id)
  );
  const boardCardIds = new Set(board.cards.map((item) => item.id));

  it("registers every second chapter bundle exactly once", () => {
    const expectedEntries = {
      content: "content/chapter-02.json",
      observations: "observations/chapter-02.json",
      evidence: "evidence/chapter-02.json",
      dialogues: "dialogues/chapter-02.json",
      relationships: "framework/relationships-chapter-02.json",
      detectiveBoards: "framework/detective-boards-chapter-02.json"
    } as const;

    for (const [kind, file] of Object.entries(expectedEntries)) {
      const files = manifest.dataFiles[
        kind as keyof typeof manifest.dataFiles
      ];
      expect(files.filter((candidate) => candidate === file)).toHaveLength(
        1
      );
      expect(existsSync(join(process.cwd(), "public/story/runtime", file))).toBe(
        true
      );
    }

    expect(
      manifest.dataFiles.timelines.some((file) =>
        file.includes("chapter-02")
      )
    ).toBe(false);
    expect(
      manifest.dataFiles.reasoning.some((file) =>
        file.includes("chapter-02")
      )
    ).toBe(false);
  });

  it("has the approved object counts and unique IDs", () => {
    expect(content).toHaveLength(14);
    expect(observations).toHaveLength(29);
    expect(evidence).toHaveLength(6);
    expect(dialogues).toHaveLength(2);
    expect(boardBundle.boards).toHaveLength(1);
    expect(board.cards).toHaveLength(9);
    expect(board.propositions).toHaveLength(2);
    expect(relationshipBundle.relationships).toHaveLength(8);
    expect(chapter.objectives).toHaveLength(9);

    expect(uniqueIds(content)).toBe(true);
    expect(uniqueIds(observations)).toBe(true);
    expect(uniqueIds(evidence)).toBe(true);
    expect(uniqueIds(dialogues)).toBe(true);
    expect(uniqueIds(board.cards)).toBe(true);
    expect(uniqueIds(board.propositions)).toBe(true);
    expect(uniqueIds(relationshipBundle.relationships)).toBe(true);
    expect(uniqueIds(chapter.objectives)).toBe(true);
  });

  it("resolves chapter, evidence, character and board references", () => {
    expect(new Set(chapter.contentIds)).toEqual(contentIds);
    expect(new Set(chapter.dialogueIds)).toEqual(dialogueIds);
    expect(chapter.reasoningIds).toEqual([]);

    for (const item of content) {
      item.observationIds.forEach((id) =>
        expect(observationIds.has(id)).toBe(true)
      );
    }
    for (const item of observations) {
      item.sourceContentIds.forEach((id) =>
        expect(contentIds.has(id)).toBe(true)
      );
    }
    for (const item of evidence) {
      item.sourceContentIds.forEach((id) =>
        expect(contentIds.has(id)).toBe(true)
      );
      item.observationIds.forEach((id) =>
        expect(observationIds.has(id)).toBe(true)
      );
    }
    for (const dialogue of dialogues) {
      expect(characterIds.has(dialogue.characterId)).toBe(true);
      dialogue.evidenceResponses.forEach((response) =>
        response.acceptedEvidenceIds.forEach((id) =>
          expect(evidenceIds.has(id)).toBe(true)
        )
      );
    }
    for (const relationship of relationshipBundle.relationships) {
      expect(characterIds.has(relationship.fromCharacterId)).toBe(true);
      expect(characterIds.has(relationship.toCharacterId)).toBe(true);
    }
    for (const card of board.cards) {
      if (card.type === "character") {
        expect(characterIds.has(card.referenceId)).toBe(true);
      } else if (card.type === "evidence") {
        expect(evidenceIds.has(card.referenceId)).toBe(true);
      } else if (card.type === "proposition") {
        expect(propositionIds.has(card.referenceId)).toBe(true);
      }
    }
    for (const proposition of board.propositions) {
      proposition.solutions.forEach((solution) =>
        solution.requiredConnections.forEach((connection) => {
          expect(boardCardIds.has(connection.fromCardId)).toBe(true);
          expect(boardCardIds.has(connection.toCardId)).toBe(true);
        })
      );
    }
  });

  it("resolves every second chapter condition target", () => {
    const conditions: Condition[] = [
      chapter.entryCondition,
      chapter.completionCondition,
      ...chapter.objectives.map((item) => item.completionCondition),
      ...chapter.journalEntries.map((item) => item.revealCondition),
      ...content.map((item) => item.unlockCondition),
      ...observations.map((item) => item.discoverCondition),
      ...evidence.map((item) => item.collectCondition),
      ...dialogues.map((item) => item.entryCondition),
      ...relationshipBundle.relationships.map(
        (item) => item.revealCondition
      ),
      ...board.cards.map((item) => item.revealCondition),
      ...board.propositions.map((item) => item.entryCondition)
    ];

    for (const condition of conditions) {
      walkCondition(condition, (item) => {
        if (item.contentId) expect(contentIds.has(item.contentId)).toBe(true);
        if (item.observationId) {
          expect(observationIds.has(item.observationId)).toBe(true);
        }
        if (item.evidenceId) {
          expect(evidenceIds.has(item.evidenceId)).toBe(true);
        }
        if (item.dialogueId) {
          expect(dialogueIds.has(item.dialogueId)).toBe(true);
        }
        if (item.objectiveId) {
          expect(objectiveIds.has(item.objectiveId)).toBe(true);
        }
        if (item.chapterId) {
          expect(chapterIds.has(item.chapterId)).toBe(true);
        }
        if (item.boardId) expect(item.boardId).toBe(board.id);
        if (item.propositionId) {
          expect(propositionIds.has(item.propositionId)).toBe(true);
        }
      });
    }

    expect(objectiveIds.has("objective-ch02-investigate-appendices")).toBe(
      true
    );
    const propositionTwo = board.propositions.find(
      (item) => item.id === "proposition-ch02-rescue-has-expiry"
    );
    const propositionTwoCondition = JSON.stringify(
      propositionTwo?.entryCondition
    );
    expect(propositionTwoCondition).toContain(
      "objective-ch02-investigate-appendices"
    );

    const propositionContentRefs = content.filter((item) =>
      JSON.stringify(item.unlockCondition).includes(
        "proposition-ch02-two-names-one-person"
      )
    );
    expect(propositionContentRefs).toHaveLength(4);
  });

  it("keeps all event targets valid and proposition completion implicit", () => {
    const events: Array<Record<string, unknown>> = [];
    const appendEvents = (items: readonly unknown[]) => {
      items.forEach((item) =>
        events.push(item as Record<string, unknown>)
      );
    };

    appendEvents(chapter.initialEvents);
    content.forEach((item) => appendEvents(item.onViewEvents));
    observations.forEach((item) => appendEvents(item.onDiscoverEvents));
    dialogues.forEach((item) => {
      appendEvents(item.completionEvents);
      item.evidenceResponses.forEach((response) =>
        appendEvents(response.events)
      );
    });
    board.propositions.forEach((proposition) =>
      proposition.solutions.forEach((solution) =>
        appendEvents(solution.onSolvedEvents)
      )
    );

    for (const event of events) {
      if (typeof event.contentId === "string") {
        expect(contentIds.has(event.contentId)).toBe(true);
      }
      if (typeof event.observationId === "string") {
        expect(observationIds.has(event.observationId)).toBe(true);
      }
      if (typeof event.evidenceId === "string") {
        expect(evidenceIds.has(event.evidenceId)).toBe(true);
      }
      if (typeof event.dialogueId === "string") {
        expect(dialogueIds.has(event.dialogueId)).toBe(true);
      }
      if (typeof event.objectiveId === "string") {
        expect(objectiveIds.has(event.objectiveId)).toBe(true);
      }
      if (typeof event.relationshipId === "string") {
        expect(relationshipIds.has(event.relationshipId)).toBe(true);
      }
    }

    const solvedEvents = board.propositions.flatMap((proposition) =>
      proposition.solutions.flatMap((solution) => solution.onSolvedEvents)
    );
    expect(
      solvedEvents.some(
        (event) => event.type === "completeDetectiveProposition"
      )
    ).toBe(false);
  });

  it("contains no forbidden second-chapter reveal language", () => {
    const runtimeText = JSON.stringify({
      chapter,
      content,
      dialogues,
      evidence,
      observations,
      boardBundle,
      relationshipBundle
    });
    const forbidden = [
      "被替换喷雾",
      "致死乌头来源",
      "第二给药路径",
      "沈仪真是真凶",
      "儿童主动选择沈意舒",
      "录音中的儿童就是沈小鹿",
      "录音中的儿童就是沈意舒",
      "沈慈云撤回了申请",
      "最终选择使用沈小鹿",
      "最终选择使用沈意舒"
    ];

    forbidden.forEach((phrase) => expect(runtimeText).not.toContain(phrase));
  });
});
