import { describe, expect, it } from "vitest";
import { evaluateCondition } from "../../src/engine/condition-evaluator/condition-evaluator";
import {
  getVisibleRelationships,
  initializeRelationships,
  updateRelationship
} from "../../src/engine/relationship-engine/relationship-engine";
import { createEmptyProgress } from "../../src/types/progress";
import { createFrameworkStory } from "../fixtures/framework-story";

describe("relationship engine", () => {
  it("initializes categorical dimensions without numeric affection", () => {
    const story = createFrameworkStory();
    const state = initializeRelationships(story, createEmptyProgress());

    expect(state.relationshipStates["relationship-a-b"]).toEqual({
      trust: "unknown",
      suspicion: "unknown",
      understanding: "unknown",
      hidden_information: "suspected"
    });
    expect(getVisibleRelationships(story, state)).toHaveLength(1);
  });

  it("updates a relationship through a condition-readable state", () => {
    const story = createFrameworkStory();
    const initial = initializeRelationships(story, createEmptyProgress());
    const state = updateRelationship(
      story,
      initial,
      "relationship-a-b",
      "understanding",
      "reinterpreted"
    );

    expect(
      evaluateCondition(
        {
          type: "relationshipStateEquals",
          relationshipId: "relationship-a-b",
          dimension: "understanding",
          state: "reinterpreted"
        },
        state
      )
    ).toBe(true);
  });
});
