import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  completeActiveChapter,
  discoverObservation,
  enterChapter,
  synchronizeChapter,
  viewContent
} from "../../src/engine/chapter-engine/chapter-engine";
import {
  connectDetectiveCards,
  submitDetectiveProposition
} from "../../src/engine/detective-board/detective-board";
import { presentDialogueEvidence } from "../../src/engine/dialogue-engine/dialogue-engine";
import { getEvidenceNotebookCount } from "../../src/features/evidence-notebook/evidence-notebook-count";
import { submitReasoning } from "../../src/engine/reasoning-engine/reasoning-engine";
import { loadStory } from "../../src/engine/story-loader/story-loader";
import { evaluateCondition } from "../../src/engine/condition-evaluator/condition-evaluator";
import { createEmptyProgress } from "../../src/types/progress";
import type { DetectiveBoardConnection } from "../../src/types/detective-board";
import type { GameProgressState } from "../../src/types/progress";
import type { LoadedStory } from "../../src/types/story";
import { runtimePayloadForUrl } from "../fixtures/runtime-payloads";

const BOARD_ID = "board-ch02-identity";

function connect(
  story: LoadedStory,
  state: GameProgressState,
  connection: DetectiveBoardConnection
): GameProgressState {
  return connectDetectiveCards(story, state, BOARD_ID, connection);
}

function solveProposition(
  story: LoadedStory,
  state: GameProgressState,
  propositionId: string
): GameProgressState {
  const attempt = submitDetectiveProposition(
    story,
    state,
    BOARD_ID,
    propositionId
  );

  expect(attempt.matched).toBe(true);
  return synchronizeChapter(story, attempt.state);
}

function completeChapterOne(
  story: LoadedStory,
  initial: GameProgressState
): GameProgressState {
  let state = enterChapter(story, initial, "chapter-01");

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
  state = viewContent(story, state, "content-toxicology-appendix");
  state = discoverObservation(
    story,
    state,
    "observation-insufficient-dose"
  );

  expect(state.chapterStage).toBe("result");
  return completeActiveChapter(story, state);
}

describe("chapter two complete runtime playthrough", () => {
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

  it("plays from a clean save through the second chapter result", () => {
    const clean = createEmptyProgress();
    const chapterTwoEntry = story.chapterManifest.chapters.find(
      (entry) => entry.id === "chapter-02"
    );

    expect(chapterTwoEntry).toMatchObject({
      order: 2,
      availability: "available",
      chapterFile: "chapters/chapter-02.json"
    });
    expect(evaluateCondition(chapterTwoEntry!.unlockCondition, clean)).toBe(
      false
    );

    let state = completeChapterOne(story, clean);

    expect(state.completedChapterIds).toContain("chapter-01");
    expect(state.unlockedChapterIds).toContain("chapter-02");
    state = enterChapter(story, state, "chapter-02");
    expect(state.currentChapterId).toBe("chapter-02");
    expect(story.chapters["chapter-02"].title).toBe("不存在的女儿");
    expect(state.unlockedContentIds).toEqual(
      expect.arrayContaining([
        "mat-ch02-xiaolu-register",
        "mat-ch02-shen-register"
      ])
    );

    const board = story.detectiveBoards[BOARD_ID];
    const characterCards = board.cards.filter(
      (card) => card.type === "character"
    );
    expect(characterCards.map((card) => card.referenceId).sort()).toEqual([
      "shen-ciyun",
      "shen-yishu"
    ]);
    expect(
      characterCards.every((card) =>
        evaluateCondition(card.revealCondition, state)
      )
    ).toBe(true);

    state = viewContent(story, state, "mat-ch02-xiaolu-register");
    state = viewContent(story, state, "mat-ch02-shen-register");
    expect(state.discoveredObservationIds).not.toContain(
      "obs-ch02-register-conflict"
    );
    state = discoverObservation(
      story,
      state,
      "obs-ch02-register-conflict"
    );
    expect(state.collectedEvidenceIds).toContain(
      "evidence-ch02-dual-identity-records"
    );
    expect(state.unlockedContentIds).toContain(
      "mat-ch02-qihu-archive-index"
    );

    state = viewContent(story, state, "mat-ch02-qihu-archive-index");
    state = discoverObservation(
      story,
      state,
      "obs-ch02-files-indexed-not-destroyed"
    );
    expect(state.collectedEvidenceIds).toContain(
      "evidence-ch02-sealed-qihu-archive"
    );
    expect(state.unlockedContentIds).toEqual(
      expect.arrayContaining([
        "mat-ch02-restoration-request",
        "mat-ch02-identity-authorization"
      ])
    );

    state = viewContent(story, state, "mat-ch02-restoration-request");
    state = discoverObservation(
      story,
      state,
      "obs-ch02-restoration-purpose"
    );
    state = discoverObservation(
      story,
      state,
      "obs-ch02-restoration-withdrawn"
    );
    expect(state.collectedEvidenceIds).toContain(
      "evidence-ch02-adult-restoration-request"
    );

    state = viewContent(story, state, "mat-ch02-identity-authorization");
    state = discoverObservation(
      story,
      state,
      "obs-ch02-authorization-context-missing"
    );
    expect(state.collectedEvidenceIds).toContain(
      "evidence-ch02-identity-authorization"
    );
    expect(state.unlockedContentIds).toContain(
      "mat-ch02-qihu-photo-front"
    );

    state = viewContent(story, state, "mat-ch02-qihu-photo-front");
    for (const observationId of [
      "obs-ch02-photo-protected-child",
      "obs-ch02-photo-qihu-location",
      "obs-ch02-photo-cropped-edge"
    ]) {
      state = discoverObservation(story, state, observationId);
    }
    expect(state.collectedEvidenceIds).toContain(
      "evidence-ch02-qihu-rescue-photo"
    );
    expect(state.unlockedContentIds).toContain("mat-ch02-qihu-photo-back");

    state = viewContent(story, state, "mat-ch02-qihu-photo-back");
    state = discoverObservation(
      story,
      state,
      "obs-ch02-photo-back-note"
    );
    state = discoverObservation(
      story,
      state,
      "obs-ch02-note-is-retelling"
    );

    const propositionOneConnections: DetectiveBoardConnection[] = [
      {
        id: "test-ch02-p1-e10",
        fromCardId: "card-ch02-e10-dual-identity-records",
        toCardId: "card-ch02-proposition-two-names-one-person",
        relationType: "supports"
      },
      {
        id: "test-ch02-p1-e11",
        fromCardId: "card-ch02-e11-qihu-rescue-photo",
        toCardId: "card-ch02-proposition-two-names-one-person",
        relationType: "supports"
      },
      {
        id: "test-ch02-p1-e12",
        fromCardId: "card-ch02-e12-sealed-qihu-archive",
        toCardId: "card-ch02-proposition-two-names-one-person",
        relationType: "supports"
      }
    ];
    for (const connection of propositionOneConnections) {
      state = connect(story, state, connection);
    }
    state = solveProposition(
      story,
      state,
      "proposition-ch02-two-names-one-person"
    );

    expect(state.unlockedContentIds).toEqual(
      expect.arrayContaining([
        "mat-ch02-will-conditions",
        "mat-ch02-wen-medical-fragment",
        "mat-ch02-transfer-appendix-index",
        "mat-ch02-child-audio-fragment"
      ])
    );
    expect(state.unlockedDialogueIds).toEqual(
      expect.arrayContaining([
        "dialogue-ch02-yishu-identity-choice",
        "dialogue-ch02-he-authorization-boundary"
      ])
    );

    const historyAfterPropositionOne = state.relationshipHistory.length;
    state = solveProposition(
      story,
      state,
      "proposition-ch02-two-names-one-person"
    );
    expect(state.relationshipHistory).toHaveLength(
      historyAfterPropositionOne
    );

    const yishuWrongMissing = presentDialogueEvidence(
      story,
      state,
      "dialogue-ch02-yishu-identity-choice",
      []
    );
    const yishuWrongExtra = presentDialogueEvidence(
      story,
      state,
      "dialogue-ch02-yishu-identity-choice",
      [
        "evidence-ch02-adult-restoration-request",
        "evidence-ch02-identity-authorization"
      ]
    );
    expect(yishuWrongMissing.matched).toBe(false);
    expect(yishuWrongExtra.matched).toBe(false);
    expect(yishuWrongMissing.state).toBe(state);
    expect(yishuWrongExtra.state).toBe(state);

    state = presentDialogueEvidence(
      story,
      state,
      "dialogue-ch02-yishu-identity-choice",
      ["evidence-ch02-adult-restoration-request"]
    ).state;

    const heWrongMissing = presentDialogueEvidence(
      story,
      state,
      "dialogue-ch02-he-authorization-boundary",
      ["evidence-ch02-identity-authorization"]
    );
    const heWrongExtra = presentDialogueEvidence(
      story,
      state,
      "dialogue-ch02-he-authorization-boundary",
      [
        "evidence-ch02-identity-authorization",
        "evidence-ch02-adult-restoration-request",
        "evidence-ch02-dual-identity-records"
      ]
    );
    const heWrongSet = presentDialogueEvidence(
      story,
      state,
      "dialogue-ch02-he-authorization-boundary",
      [
        "evidence-ch02-dual-identity-records",
        "evidence-ch02-adult-restoration-request"
      ]
    );
    expect(heWrongMissing.matched).toBe(false);
    expect(heWrongExtra.matched).toBe(false);
    expect(heWrongSet.matched).toBe(false);

    state = presentDialogueEvidence(
      story,
      state,
      "dialogue-ch02-he-authorization-boundary",
      [
        "evidence-ch02-identity-authorization",
        "evidence-ch02-adult-restoration-request"
      ]
    ).state;
    const historyAfterDialogues = state.relationshipHistory.length;
    state = presentDialogueEvidence(
      story,
      state,
      "dialogue-ch02-he-authorization-boundary",
      [
        "evidence-ch02-identity-authorization",
        "evidence-ch02-adult-restoration-request"
      ]
    ).state;
    expect(state.relationshipHistory).toHaveLength(historyAfterDialogues);
    expect(
      getEvidenceNotebookCount(
        story,
        state.unlockedChapterIds,
        state.collectedEvidenceIds
      )
    ).toMatchObject({
      collectedCount: 11,
      totalCount: 12
    });

    state = viewContent(story, state, "mat-ch02-will-conditions");
    state = discoverObservation(
      story,
      state,
      "obs-ch02-safety-bound-to-obedience"
    );
    expect(state.collectedEvidenceIds).toContain(
      "evidence-ch02-protection-conditions"
    );
    expect(
      getEvidenceNotebookCount(
        story,
        state.unlockedChapterIds,
        state.collectedEvidenceIds
      )
    ).toMatchObject({
      collectedCount: 12,
      totalCount: 12
    });

    state = viewContent(story, state, "mat-ch02-wen-medical-fragment");
    state = viewContent(story, state, "mat-ch02-transfer-appendix-index");
    expect(state.unlockedContentIds).toContain(
      "mat-ch02-inventory-photo-1829"
    );
    state = viewContent(story, state, "mat-ch02-inventory-photo-1829");
    expect(state.unlockedContentIds).toContain(
      "mat-ch02-inventory-photo-1838"
    );
    state = viewContent(story, state, "mat-ch02-inventory-photo-1838");
    state = discoverObservation(
      story,
      state,
      "obs-ch02-inventory-general-difference"
    );
    expect(state.discoveredObservationIds).toContain(
      "obs-ch02-inventory-general-difference"
    );
    expect(state.unlockedContentIds).toContain(
      "mat-ch02-spare-supply-receipt"
    );
    state = viewContent(story, state, "mat-ch02-spare-supply-receipt");

    expect(state.completedObjectiveIds).not.toContain(
      "objective-ch02-investigate-appendices"
    );
    state = viewContent(story, state, "mat-ch02-child-audio-fragment");
    expect(state.completedObjectiveIds).toContain(
      "objective-ch02-investigate-appendices"
    );

    const propositionTwo = board.propositions.find(
      (item) => item.id === "proposition-ch02-rescue-has-expiry"
    );
    expect(evaluateCondition(propositionTwo!.entryCondition, state)).toBe(
      true
    );

    const propositionTwoConnections: DetectiveBoardConnection[] = [
      {
        id: "test-ch02-p2-e11",
        fromCardId: "card-ch02-e11-qihu-rescue-photo",
        toCardId: "card-ch02-proposition-rescue-has-expiry",
        relationType: "supports"
      },
      {
        id: "test-ch02-p2-e14",
        fromCardId: "card-ch02-e14-adult-restoration-request",
        toCardId: "card-ch02-proposition-rescue-has-expiry",
        relationType: "contradicts"
      },
      {
        id: "test-ch02-p2-e15",
        fromCardId: "card-ch02-e15-protection-conditions",
        toCardId: "card-ch02-proposition-rescue-has-expiry",
        relationType: "supports"
      }
    ];
    for (const connection of propositionTwoConnections) {
      state = connect(story, state, connection);
    }
    state = solveProposition(
      story,
      state,
      "proposition-ch02-rescue-has-expiry"
    );

    expect(state.completedObjectiveIds).toHaveLength(9);
    expect(state.chapterStage).toBe("result");
    expect(story.chapters["chapter-02"].result.title).toBe(
      "不存在的不是她"
    );
    expect(story.chapters["chapter-02"].result.closingLine).toBe(
      "有人曾替她藏起名字，让她活下来。\n后来，他们忘了把选择名字的权利还给她。"
    );

    const historyAfterPropositionTwo = state.relationshipHistory.length;
    state = solveProposition(
      story,
      state,
      "proposition-ch02-rescue-has-expiry"
    );
    expect(state.relationshipHistory).toHaveLength(
      historyAfterPropositionTwo
    );

    const refreshed = synchronizeChapter(
      story,
      JSON.parse(JSON.stringify(state)) as GameProgressState
    );
    expect(refreshed.currentChapterId).toBe("chapter-02");
    expect(refreshed.chapterStage).toBe("result");
    expect(refreshed.completedObjectiveIds).toHaveLength(9);

    state = completeActiveChapter(story, refreshed);
    expect(state.completedChapterIds).toEqual(
      expect.arrayContaining(["chapter-01", "chapter-02"])
    );
    expect(state.currentChapterId).toBe("chapter-02");
    expect(state.chapterStage).toBe("completed");
  });
});
