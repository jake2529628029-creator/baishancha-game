import type { GameEvent } from "./event";
import type { StoryCondition } from "./story";

export interface DocumentParagraph {
  id: string;
  text: string;
  observationId?: string;
}

export interface ImageHotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  observationId: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  time: string;
  text: string;
  observationId?: string;
}

export interface ContentItem {
  id: string;
  chapterId: string;
  type: "document" | "image" | "chat";
  title: string;
  source: string;
  summary: string;
  unlockCondition: StoryCondition;
  observationIds: string[];
  onViewEvents: GameEvent[];
  document?: {
    metadata: Record<string, string>;
    paragraphs: DocumentParagraph[];
  };
  image?: {
    asset: string;
    alt: string;
    display: {
      aspectRatio: "16:9" | "4:3" | "3:2";
      fit: "cover" | "contain";
      focalPoint: {
        x: number;
        y: number;
      };
    };
    hotspots: ImageHotspot[];
  };
  chat?: {
    participantIds: string[];
    participantNames: Record<string, string>;
    messages: ChatMessage[];
  };
}
