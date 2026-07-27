import type { GameEvent } from "./event";
import type { StoryCondition } from "./story";

export interface Observation {
  id: string;
  chapterId: string;
  title: string;
  description: string;
  sourceContentIds: string[];
  discoverCondition: StoryCondition;
  onDiscoverEvents: GameEvent[];
}
