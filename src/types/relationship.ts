import type { StoryCondition } from "./story";

export type RelationshipDimension =
  | "trust"
  | "suspicion"
  | "understanding"
  | "hidden_information";

export type RelationshipInsightState =
  | "unknown"
  | "suspected"
  | "confirmed"
  | "questioned"
  | "reinterpreted";

export type RelationshipType =
  | "family"
  | "protects"
  | "controls"
  | "withholds"
  | "conflicts"
  | "trusts"
  | "custom";

export interface CharacterNode {
  id: string;
  name: string;
  role: string;
  portraitAssetId?: string;
}

export type RelationshipDimensions = Partial<
  Record<RelationshipDimension, RelationshipInsightState>
>;

export interface RelationshipDefinition {
  id: string;
  fromCharacterId: string;
  toCharacterId: string;
  type: RelationshipType;
  label: string;
  initialDimensions: RelationshipDimensions;
  revealCondition: StoryCondition;
}

export interface RelationshipBundle {
  characters: CharacterNode[];
  relationships: RelationshipDefinition[];
}

export type RelationshipStateMap = Record<string, RelationshipDimensions>;

export interface RelationshipChangeRecord {
  sequence: number;
  relationshipId: string;
  dimension: RelationshipDimension;
  previousState: RelationshipInsightState | null;
  nextState: RelationshipInsightState;
}
