import { evaluateCondition } from "../condition-evaluator/condition-evaluator";
import { runEvent } from "../event-runner/event-runner";
import type { GameProgressState } from "../../types/progress";
import type {
  RelationshipDimension,
  RelationshipInsightState,
  RelationshipDefinition
} from "../../types/relationship";
import type { LoadedStory } from "../../types/story";

export class RelationshipEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelationshipEngineError";
  }
}

export function initializeRelationships(
  story: LoadedStory,
  state: GameProgressState
): GameProgressState {
  let relationshipStates = state.relationshipStates;

  for (const relationship of Object.values(story.relationships)) {
    const current = relationshipStates[relationship.id] ?? {};
    let nextRelationship = current;

    for (const [dimension, value] of Object.entries(
      relationship.initialDimensions
    )) {
      if (current[dimension as RelationshipDimension] !== undefined) {
        continue;
      }

      nextRelationship = {
        ...nextRelationship,
        [dimension]: value as RelationshipInsightState
      };
    }

    if (nextRelationship !== current) {
      relationshipStates = {
        ...relationshipStates,
        [relationship.id]: nextRelationship
      };
    }
  }

  return relationshipStates === state.relationshipStates
    ? state
    : {
        ...state,
        relationshipStates
      };
}

export function getVisibleRelationships(
  story: LoadedStory,
  state: GameProgressState
): RelationshipDefinition[] {
  return Object.values(story.relationships)
    .filter((relationship) =>
      evaluateCondition(relationship.revealCondition, state)
    )
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function updateRelationship(
  story: LoadedStory,
  state: GameProgressState,
  relationshipId: string,
  dimension: RelationshipDimension,
  value: RelationshipInsightState
): GameProgressState {
  if (!story.relationships[relationshipId]) {
    throw new RelationshipEngineError(
      `人物关系不存在：${relationshipId}`
    );
  }

  return runEvent(state, {
    type: "updateRelationship",
    relationshipId,
    dimension,
    state: value
  });
}
