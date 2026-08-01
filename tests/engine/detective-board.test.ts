import { describe, expect, it } from "vitest";
import {
  connectDetectiveCards,
  initializeDetectiveBoards,
  placeDetectiveCard,
  submitDetectiveProposition
} from "../../src/engine/detective-board/detective-board";
import { createEmptyProgress } from "../../src/types/progress";
import { createFrameworkStory } from "../fixtures/framework-story";

describe("detective board", () => {
  it("persists free card placement and connections", () => {
    const story = createFrameworkStory();
    let state = initializeDetectiveBoards(story, createEmptyProgress());

    state = placeDetectiveCard(story, state, "board-main", "card-a", 120, 80);
    state = connectDetectiveCards(story, state, "board-main", {
      id: "connection-free",
      fromCardId: "card-a",
      toCardId: "card-b",
      relationType: "questions",
      label: "玩家假设"
    });

    expect(state.detectiveBoardStates["board-main"].placements).toEqual([
      {
        cardId: "card-a",
        x: 120,
        y: 80
      }
    ]);
    expect(state.detectiveBoardStates["board-main"].connections).toHaveLength(
      1
    );
  });

  it("checks propositions against player-created connections", () => {
    const story = createFrameworkStory();
    let state = initializeDetectiveBoards(story, createEmptyProgress());
    const wrong = submitDetectiveProposition(
      story,
      state,
      "board-main",
      "proposition-protects"
    );

    expect(wrong.matched).toBe(false);

    state = connectDetectiveCards(story, state, "board-main", {
      id: "connection-protects",
      fromCardId: "card-a",
      toCardId: "card-b",
      relationType: "protects"
    });

    const correct = submitDetectiveProposition(
      story,
      state,
      "board-main",
      "proposition-protects"
    );

    expect(correct.matched).toBe(true);
    expect(
      correct.state.detectiveBoardStates["board-main"].solvedPropositionIds
    ).toEqual(["proposition-protects"]);
  });
});
