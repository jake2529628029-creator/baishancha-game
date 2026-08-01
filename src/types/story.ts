export type PrimitiveFlag = boolean | string | number;

export type StoryCondition =
  | {
      type: "always";
    }
  | {
      type: "chapterCompleted";
      chapterId: string;
    }
  | {
      type: "flagEquals";
      flagId: string;
      value: PrimitiveFlag;
    }
  | {
      type: "contentViewed";
      contentId: string;
    }
  | {
      type: "observationDiscovered";
      observationId: string;
    }
  | {
      type: "evidenceCollected";
      evidenceId: string;
    }
  | {
      type: "dialogueCompleted";
      dialogueId: string;
    }
  | {
      type: "reasoningCompleted";
      reasoningId: string;
    }
  | {
      type: "objectiveCompleted";
      objectiveId: string;
    }
  | {
      type: "relationshipStateEquals";
      relationshipId: string;
      dimension: import("./relationship").RelationshipDimension;
      state: import("./relationship").RelationshipInsightState;
    }
  | {
      type: "timelineCompleted";
      puzzleId: string;
    }
  | {
      type: "detectivePropositionCompleted";
      boardId: string;
      propositionId: string;
    }
  | {
      type: "all" | "any";
      conditions: StoryCondition[];
    }
  | {
      type: "not";
      condition: StoryCondition;
    };

export interface StoryManifest {
  gameId: string;
  schemaVersion: number;
  contentVersion: string;
  title: string;
  subtitle?: string;
  startChapterId: string;
  chapterManifestFile: string;
  dataFiles: {
    content: string[];
    observations: string[];
    evidence: string[];
    dialogues: string[];
    reasoning: string[];
    relationships: string[];
    timelines: string[];
    detectiveBoards: string[];
  };
}

export type ChapterAvailability = "available" | "planned";

export interface ChapterManifestEntry {
  id: string;
  order: number;
  title: string;
  subtitle?: string;
  availability: ChapterAvailability;
  chapterFile: string | null;
  unlockCondition: StoryCondition;
}

export interface ChapterManifest {
  schemaVersion: number;
  chapters: ChapterManifestEntry[];
}

export interface ChapterObjective {
  id: string;
  text: string;
  completionCondition: StoryCondition;
}

export interface InvestigationScene {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  contentIds: string[];
}

export interface ChapterResult {
  eyebrow: string;
  title: string;
  summary: string;
  confirmedFacts: string[];
  unresolvedQuestions: string[];
  closingLine: string;
  evaluationTiers: Array<{
    minimumScore: number;
    title: string;
    description: string;
  }>;
}

export interface JournalEntry {
  id: string;
  category: "fact" | "hypothesis" | "question";
  title: string;
  text: string;
  revealCondition: StoryCondition;
  retireCondition?: StoryCondition;
}

export interface StoryChapter {
  id: string;
  order: number;
  title: string;
  summary: string;
  scenes: InvestigationScene[];
  journalEntries: JournalEntry[];
  result: ChapterResult;
  objectives: ChapterObjective[];
  entryCondition: StoryCondition;
  completionCondition: StoryCondition;
  initialEvents: import("./event").GameEvent[];
  contentIds: string[];
  dialogueIds: string[];
  reasoningIds: string[];
  nextChapterId?: string | null;
}

export interface LoadedStory {
  manifest: StoryManifest;
  chapterManifest: ChapterManifest;
  chapters: Record<string, StoryChapter>;
  content: Record<string, import("./content").ContentItem>;
  observations: Record<string, import("./observation").Observation>;
  evidence: Record<string, import("./evidence").Evidence>;
  dialogues: Record<string, import("./dialogue").DialogueNode>;
  reasoning: Record<string, import("./reasoning").ReasoningNode>;
  characters: Record<string, import("./relationship").CharacterNode>;
  relationships: Record<
    string,
    import("./relationship").RelationshipDefinition
  >;
  timelineEvents: Record<string, import("./timeline").TimelineEventDefinition>;
  timelinePuzzles: Record<string, import("./timeline").TimelinePuzzleDefinition>;
  detectiveBoards: Record<
    string,
    import("./detective-board").DetectiveBoardDefinition
  >;
}
