import type { ContentItem } from "../../types/content";
import type { DialogueNode } from "../../types/dialogue";
import type { Evidence } from "../../types/evidence";
import type { Observation } from "../../types/observation";
import type { ReasoningNode } from "../../types/reasoning";
import type {
  LoadedStory,
  StoryChapter,
  StoryManifest
} from "../../types/story";
import {
  StoryValidationError,
  validateChapter,
  validateContent,
  validateDialogues,
  validateEvidence,
  validateManifest,
  validateObservations,
  validateReasoning
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
    chapters,
    content,
    observations,
    evidence,
    dialogues,
    reasoning
  } = story;

  assertReference(
    manifest.chapterIds.includes(manifest.startChapterId),
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

  for (const chapter of Object.values(chapters)) {
    if (chapter.nextChapterId) {
      assertReference(
        Boolean(chapters[chapter.nextChapterId]),
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
}

export async function loadStory(
  baseUrl = "/story/runtime"
): Promise<LoadedStory> {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const manifestData = await fetchJson(`${normalizedBaseUrl}/manifest.json`);
  const manifest = validateManifest(manifestData);

  const chapterEntries = await Promise.all(
    manifest.chapterIds.map(async (chapterId) => {
      const source = `${normalizedBaseUrl}/chapters/${chapterId}.json`;
      const chapter = validateChapter(await fetchJson(source), source);

      if (chapter.id !== chapterId) {
        throw new StoryValidationError(source, [
          {
            instancePath: "/id",
            schemaPath: "#/properties/id",
            keyword: "const",
            params: {
              allowedValue: chapterId
            },
            message: `必须与文件引用 ${chapterId} 一致`
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
    reasoningItems
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
    )
  ]);

  const story: LoadedStory = {
    manifest,
    chapters: toUniqueRecord<StoryChapter>("章节", chapterEntries),
    content: toUniqueRecord<ContentItem>("调查材料", contentItems),
    observations: toUniqueRecord<Observation>("观察", observationItems),
    evidence: toUniqueRecord<Evidence>("证据", evidenceItems),
    dialogues: toUniqueRecord<DialogueNode>("对话", dialogueItems),
    reasoning: toUniqueRecord<ReasoningNode>("推理", reasoningItems)
  };

  validateReferences(story);
  return story;
}
