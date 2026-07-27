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
  chapterIds: string[];
  dataFiles: {
    content: string[];
    observations: string[];
    evidence: string[];
    dialogues: string[];
    reasoning: string[];
  };
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
  chapters: Record<string, StoryChapter>;
  content: Record<string, import("./content").ContentItem>;
  observations: Record<string, import("./observation").Observation>;
  evidence: Record<string, import("./evidence").Evidence>;
  dialogues: Record<string, import("./dialogue").DialogueNode>;
  reasoning: Record<string, import("./reasoning").ReasoningNode>;
}
