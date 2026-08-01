import type { LoadedStory } from "../../src/types/story";

export function createFrameworkStory(): LoadedStory {
  return {
    manifest: {
      gameId: "framework-test",
      schemaVersion: 2,
      contentVersion: "0.4.1",
      title: "Framework Test",
      startChapterId: "chapter-01",
      chapterManifestFile: "chapter-manifest.json",
      dataFiles: {
        content: [],
        observations: [],
        evidence: [],
        dialogues: [],
        reasoning: [],
        relationships: [],
        timelines: [],
        detectiveBoards: []
      }
    },
    chapterManifest: {
      schemaVersion: 1,
      chapters: Array.from({ length: 6 }, (_, order) => ({
        id: `chapter-0${order}`,
        order,
        title: `Chapter ${order}`,
        availability: "planned" as const,
        chapterFile: null,
        unlockCondition: {
          type: "always" as const
        }
      }))
    },
    chapters: {},
    content: {},
    observations: {},
    evidence: {},
    dialogues: {},
    reasoning: {},
    characters: {
      "character-a": {
        id: "character-a",
        name: "A",
        role: "调查对象"
      },
      "character-b": {
        id: "character-b",
        name: "B",
        role: "调查对象"
      }
    },
    relationships: {
      "relationship-a-b": {
        id: "relationship-a-b",
        fromCharacterId: "character-a",
        toCharacterId: "character-b",
        type: "protects",
        label: "表面保护",
        initialDimensions: {
          trust: "unknown",
          suspicion: "unknown",
          understanding: "unknown",
          hidden_information: "suspected"
        },
        revealCondition: {
          type: "always"
        }
      }
    },
    timelineEvents: {
      "timeline-a": {
        id: "timeline-a",
        chapterId: "chapter-04",
        title: "先发生",
        occurredAt: "20:57",
        characterIds: ["character-a"],
        locationId: "location-room",
        description: "事件 A",
        revealCondition: {
          type: "always"
        }
      },
      "timeline-b": {
        id: "timeline-b",
        chapterId: "chapter-04",
        title: "后发生",
        occurredAt: "21:17",
        characterIds: ["character-b"],
        locationId: "location-room",
        description: "事件 B",
        revealCondition: {
          type: "always"
        }
      }
    },
    timelinePuzzles: {
      "timeline-puzzle": {
        id: "timeline-puzzle",
        chapterId: "chapter-04",
        title: "还原顺序",
        eventIds: ["timeline-a", "timeline-b"],
        entryCondition: {
          type: "always"
        },
        solutions: [
          {
            id: "timeline-solution",
            orderedEventIds: ["timeline-a", "timeline-b"],
            onSolvedEvents: [
              {
                type: "updateRelationship",
                relationshipId: "relationship-a-b",
                dimension: "understanding",
                state: "confirmed"
              }
            ]
          }
        ],
        incorrectFeedback: "顺序仍有矛盾。"
      }
    },
    detectiveBoards: {
      "board-main": {
        id: "board-main",
        chapterId: "chapter-04",
        title: "案件墙",
        cards: [
          {
            id: "card-a",
            type: "character",
            referenceId: "character-a",
            title: "人物 A",
            revealCondition: {
              type: "always"
            }
          },
          {
            id: "card-b",
            type: "character",
            referenceId: "character-b",
            title: "人物 B",
            revealCondition: {
              type: "always"
            }
          }
        ],
        initialConnections: [],
        propositions: [
          {
            id: "proposition-protects",
            title: "谁在保护谁",
            prompt: "建立保护关系。",
            entryCondition: {
              type: "always"
            },
            solutions: [
              {
                id: "proposition-solution",
                requiredConnections: [
                  {
                    fromCardId: "card-a",
                    toCardId: "card-b",
                    relationType: "protects"
                  }
                ],
                onSolvedEvents: []
              }
            ],
            incorrectFeedback: "关系尚未成立。"
          }
        ]
      }
    }
  };
}
