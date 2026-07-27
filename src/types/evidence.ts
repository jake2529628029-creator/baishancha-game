import type { StoryCondition } from "./story";

export interface Evidence {
  id: string;
  chapterId: string;
  title: string;
  category: "physical" | "medical" | "document" | "testimony";
  description: string;
  sourceContentIds: string[];
  observationIds: string[];
  collectCondition: StoryCondition;
}
