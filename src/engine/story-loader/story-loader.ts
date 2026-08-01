import type { ContentItem } from "../../types/content";
import type { DialogueNode } from "../../types/dialogue";
import type { DetectiveBoardBundle } from "../../types/detective-board";
import type { Evidence } from "../../types/evidence";
import type { Observation } from "../../types/observation";
import type { RelationshipBundle } from "../../types/relationship";
import type { ReasoningNode } from "../../types/reasoning";
import type { TimelineBundle } from "../../types/timeline";
import type {
  ChapterManifest,
  LoadedStory,
  StoryChapter,
  StoryManifest
} from "../../types/story";
import {
  StoryValidationError,
  validateChapter,
  validateChapterManifest,
  validateContent,
  validateDetectiveBoardBundle,
  validateDialogues,
  validateEvidence,
  validateManifest,
  validateObservations,
  validateRelationshipBundle,
  validateReasoning,
  validateTimelineBundle
} from "./story-validation";

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`剧情文件加载失败：${url}（HTTP ${response.status}）`);
  }

  return response.json() as Promise<unknown>;
}

async function loadBundles<T>(
  baseUrl: string,
  files: string[],
  validator: (data: unknown, source: string) => T[]
): Promise<T[]> {
  const bundles = await Promise.all(
    files.map(async (file) => {
      const source = `${baseUrl}/${file}`;
      return validator(await fetchJson(source), source);
    })
  );

  return bundles.flat();
}

async function loadFiles<T>(
  baseUrl: string,
  files: string[],
  validator: (data: unknown, source: string) => T
): Promise<T[]> {
  return Promise.all(
    files.map(async (file) => {
      const source = `${baseUrl}/${file}`;
      return validator(await fetchJson(source), source);
    })
  );
}

function toUniqueRecord<T extends { id: string }>(
  kind: string,
  items: T[]
): Record<string, T> {
  const result: Record<string, T> = {};

  for (const item of items) {
    if (result[item.id]) {
      throw new Error(`剧情引用错误：${kind} ID重复：${item.id}`);
    }

    result[item.id] = item;
  }

  return result;
}

function assertReference(
  condition: boolean,
  owner: string,
  targetKind: string,
  targetId: string
): void {
  if (!condition) {
    throw new Error(
      `剧情引用错误：${owner} 指向不存在的${targetKind} ${targetId}`
    );
  }
}

function validateReferences(story: LoadedStory): void {
  const {
    manifest,
    chapterManifest,
    chapters,
    content,
    observations,
    evidence,
    dialogues,
    reasoning,
    characters,
    relationships,
    timelineEvents,
    timelinePuzzles,
    detectiveBoards
  } = story;

  const chapterEntries = new Map(
    chapterManifest.chapters.map((chapter) => [chapter.id, chapter])
  );
  const uniqueChapterOrders = new Set(
    chapterManifest.chapters.map((chapter) => chapter.order)
  );

  assertReference(
    chapterEntries.size === chapterManifest.chapters.length,
    "chapter-manifest",
    "唯一章节 ID",
    "chapter-00...chapter-05"
  );
  assertReference(
    uniqueChapterOrders.size === chapterManifest.chapters.length,
    "chapter-manifest",
    "唯一章节顺序",
    "0...5"
  );

  for (const entry of chapterManifest.chapters) {
    assertReference(
      entry.availability === "planned" || Boolean(entry.chapterFile),
      entry.id,
      "章节文件",
      entry.chapterFile ?? "null"
    );
    assertReference(
      entry.availability === "available" || entry.chapterFile === null,
      entry.id,
      "计划章节空文件",
      entry.chapterFile ?? "null"
    );
  }

  assertReference(
    chapterEntries.has(manifest.startChapterId),
    "manifest",
    "起始章节",
    manifest.startChapterId
  );
  assertReference(
    Boolean(chapters[manifest.startChapterId]),
    "manifest",
    "起始章节",
    manifest.startChapterId
  );
  assertReference(
    chapterEntries.get(manifest.startChapterId)?.availability === "available",
    "manifest",
    "可用起始章节",
    manifest.startChapterId
  );

  for (const chapter of Object.values(chapters)) {
    if (chapter.nextChapterId) {
      assertReference(
        chapterEntries.has(chapter.nextChapterId),
        chapter.id,
        "下一章节",
        chapter.nextChapterId
      );
    }

    chapter.contentIds.forEach((id) =>
      assertReference(Boolean(content[id]), chapter.id, "调查材料", id)
    );
    chapter.dialogueIds.forEach((id) =>
      assertReference(Boolean(dialogues[id]), chapter.id, "对话", id)
    );
    chapter.reasoningIds.forEach((id) =>
      assertReference(Boolean(reasoning[id]), chapter.id, "推理", id)
    );
  }

  for (const item of Object.values(content)) {
    assertReference(
      Boolean(chapters[item.chapterId]),
      item.id,
      "所属章节",
      item.chapterId
    );
    item.observationIds.forEach((id) =>
      assertReference(Boolean(observations[id]), item.id, "观察", id)
    );
  }

  for (const observation of Object.values(observations)) {
    observation.sourceContentIds.forEach((id) =>
      assertReference(Boolean(content[id]), observation.id, "调查材料", id)
    );
  }

  for (const item of Object.values(evidence)) {
    item.sourceContentIds.forEach((id) =>
      assertReference(Boolean(content[id]), item.id, "调查材料", id)
    );
    item.observationIds.forEach((id) =>
      assertReference(Boolean(observations[id]), item.id, "观察", id)
    );
  }

  for (const node of Object.values(dialogues)) {
    node.evidenceResponses.forEach((response) =>
      response.acceptedEvidenceIds.forEach((id) =>
        assertReference(Boolean(evidence[id]), node.id, "证据", id)
      )
    );
  }

  for (const node of Object.values(reasoning)) {
    node.solutions.forEach((solution) =>
      solution.requiredEvidenceIds.forEach((id) =>
        assertReference(Boolean(evidence[id]), node.id, "证据", id)
      )
    );
  }

  for (const relationship of Object.values(relationships)) {
    assertReference(
      Boolean(characters[relationship.fromCharacterId]),
      relationship.id,
      "起点人物",
      relationship.fromCharacterId
    );
    assertReference(
      Boolean(characters[relationship.toCharacterId]),
      relationship.id,
      "终点人物",
      relationship.toCharacterId
    );
  }

  for (const event of Object.values(timelineEvents)) {
    assertReference(
      chapterEntries.has(event.chapterId),
      event.id,
      "所属章节",
      event.chapterId
    );
    event.characterIds.forEach((id) =>
      assertReference(Boolean(characters[id]), event.id, "人物", id)
    );
  }

  for (const puzzle of Object.values(timelinePuzzles)) {
    assertReference(
      chapterEntries.has(puzzle.chapterId),
      puzzle.id,
      "所属章节",
      puzzle.chapterId
    );
    puzzle.eventIds.forEach((id) =>
      assertReference(Boolean(timelineEvents[id]), puzzle.id, "时间事件", id)
    );
    puzzle.solutions.forEach((solution) => {
      const expected = new Set(puzzle.eventIds);
      const valid =
        solution.orderedEventIds.length === puzzle.eventIds.length &&
        solution.orderedEventIds.every((id) => expected.has(id));
      assertReference(valid, solution.id, "完整时间事件集合", puzzle.id);
    });
  }

  for (const board of Object.values(detectiveBoards)) {
    assertReference(
      chapterEntries.has(board.chapterId),
      board.id,
      "所属章节",
      board.chapterId
    );
    const cards = new Map(board.cards.map((card) => [card.id, card]));

    board.cards.forEach((card) => {
      if (card.type === "character") {
        assertReference(
          Boolean(characters[card.referenceId]),
          card.id,
          "人物",
          card.referenceId
        );
      } else if (card.type === "evidence") {
        assertReference(
          Boolean(evidence[card.referenceId]),
          card.id,
          "证据",
          card.referenceId
        );
      } else if (card.type === "timeline") {
        assertReference(
          Boolean(timelineEvents[card.referenceId]),
          card.id,
          "时间事件",
          card.referenceId
        );
      }
    });

    board.initialConnections.forEach((connection) => {
      assertReference(
        cards.has(connection.fromCardId),
        connection.id,
        "起点卡片",
        connection.fromCardId
      );
      assertReference(
        cards.has(connection.toCardId),
        connection.id,
        "终点卡片",
        connection.toCardId
      );
    });

    const propositionIds = new Set(
      board.propositions.map((proposition) => proposition.id)
    );

    board.cards
      .filter((card) => card.type === "proposition")
      .forEach((card) =>
        assertReference(
          propositionIds.has(card.referenceId),
          card.id,
          "推理命题",
          card.referenceId
        )
      );

    board.propositions.forEach((proposition) =>
      proposition.solutions.forEach((solution) =>
        solution.requiredConnections.forEach((connection) => {
          assertReference(
            cards.has(connection.fromCardId),
            solution.id,
            "起点卡片",
            connection.fromCardId
          );
          assertReference(
            cards.has(connection.toCardId),
            solution.id,
            "终点卡片",
            connection.toCardId
          );
        })
      )
    );
  }
}

export async function loadStory(
  baseUrl = "/story/runtime"
): Promise<LoadedStory> {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const manifestData = await fetchJson(`${normalizedBaseUrl}/manifest.json`);
  const manifest = validateManifest(manifestData);
  const chapterManifestSource = `${normalizedBaseUrl}/${manifest.chapterManifestFile}`;
  const chapterManifest: ChapterManifest = validateChapterManifest(
    await fetchJson(chapterManifestSource),
    chapterManifestSource
  );
  const availableChapterEntries = chapterManifest.chapters.filter(
    (
      entry
    ): entry is typeof entry & {
      chapterFile: string;
    } => entry.availability === "available" && Boolean(entry.chapterFile)
  );

  const chapterEntries = await Promise.all(
    availableChapterEntries.map(async (entry) => {
      const source = `${normalizedBaseUrl}/${entry.chapterFile}`;
      const chapter = validateChapter(await fetchJson(source), source);

      if (chapter.id !== entry.id) {
        throw new StoryValidationError(source, [
          {
            instancePath: "/id",
            schemaPath: "#/properties/id",
            keyword: "const",
            params: {
              allowedValue: entry.id
            },
            message: `必须与文件引用 ${entry.id} 一致`
          }
        ]);
      }

      return chapter;
    })
  );

  const [
    contentItems,
    observationItems,
    evidenceItems,
    dialogueItems,
    reasoningItems,
    relationshipBundles,
    timelineBundles,
    detectiveBoardBundles
  ] = await Promise.all([
    loadBundles(
      normalizedBaseUrl,
      manifest.dataFiles.content,
      validateContent
    ),
    loadBundles(
      normalizedBaseUrl,
      manifest.dataFiles.observations,
      validateObservations
    ),
    loadBundles(
      normalizedBaseUrl,
      manifest.dataFiles.evidence,
      validateEvidence
    ),
    loadBundles(
      normalizedBaseUrl,
      manifest.dataFiles.dialogues,
      validateDialogues
    ),
    loadBundles(
      normalizedBaseUrl,
      manifest.dataFiles.reasoning,
      validateReasoning
    ),
    loadFiles(
      normalizedBaseUrl,
      manifest.dataFiles.relationships,
      validateRelationshipBundle
    ),
    loadFiles(
      normalizedBaseUrl,
      manifest.dataFiles.timelines,
      validateTimelineBundle
    ),
    loadFiles(
      normalizedBaseUrl,
      manifest.dataFiles.detectiveBoards,
      validateDetectiveBoardBundle
    )
  ]);
  const relationshipItems = relationshipBundles.flatMap(
    (bundle: RelationshipBundle) => bundle.relationships
  );
  const characterItems = relationshipBundles.flatMap(
    (bundle: RelationshipBundle) => bundle.characters
  );
  const timelineEventItems = timelineBundles.flatMap(
    (bundle: TimelineBundle) => bundle.events
  );
  const timelinePuzzleItems = timelineBundles.flatMap(
    (bundle: TimelineBundle) => bundle.puzzles
  );
  const detectiveBoardItems = detectiveBoardBundles.flatMap(
    (bundle: DetectiveBoardBundle) => bundle.boards
  );

  const story: LoadedStory = {
    manifest,
    chapterManifest,
    chapters: toUniqueRecord<StoryChapter>("章节", chapterEntries),
    content: toUniqueRecord<ContentItem>("调查材料", contentItems),
    observations: toUniqueRecord<Observation>("观察", observationItems),
    evidence: toUniqueRecord<Evidence>("证据", evidenceItems),
    dialogues: toUniqueRecord<DialogueNode>("对话", dialogueItems),
    reasoning: toUniqueRecord<ReasoningNode>("推理", reasoningItems),
    characters: toUniqueRecord("人物", characterItems),
    relationships: toUniqueRecord("人物关系", relationshipItems),
    timelineEvents: toUniqueRecord("时间事件", timelineEventItems),
    timelinePuzzles: toUniqueRecord("时间线谜题", timelinePuzzleItems),
    detectiveBoards: toUniqueRecord("侦探墙", detectiveBoardItems)
  };

  validateReferences(story);
  return story;
}
