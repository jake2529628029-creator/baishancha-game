import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import chapterSchema from "../../../schemas/chapter.schema.json";
import chapterManifestSchema from "../../../schemas/chapter-manifest.schema.json";
import contentSchema from "../../../schemas/content.schema.json";
import detectiveBoardSchema from "../../../schemas/detective-board.schema.json";
import definitionsSchema from "../../../schemas/definitions.schema.json";
import dialogueSchema from "../../../schemas/dialogue.schema.json";
import evidenceSchema from "../../../schemas/evidence.schema.json";
import manifestSchema from "../../../schemas/manifest.schema.json";
import observationSchema from "../../../schemas/observation.schema.json";
import relationshipSchema from "../../../schemas/relationship.schema.json";
import reasoningSchema from "../../../schemas/reasoning.schema.json";
import timelineSchema from "../../../schemas/timeline.schema.json";
import type { ContentItem } from "../../types/content";
import type { DialogueNode } from "../../types/dialogue";
import type { Evidence } from "../../types/evidence";
import type { Observation } from "../../types/observation";
import type { DetectiveBoardBundle } from "../../types/detective-board";
import type { RelationshipBundle } from "../../types/relationship";
import type { ReasoningNode } from "../../types/reasoning";
import type {
  ChapterManifest,
  StoryChapter,
  StoryManifest
} from "../../types/story";
import type { TimelineBundle } from "../../types/timeline";

const ajv = new Ajv({
  allErrors: true,
  strict: true
});

ajv.addSchema(definitionsSchema);

const manifestValidator = ajv.compile<StoryManifest>(manifestSchema);
const chapterManifestValidator =
  ajv.compile<ChapterManifest>(chapterManifestSchema);
const chapterValidator = ajv.compile<StoryChapter>(chapterSchema);
const contentValidator = ajv.compile<ContentItem[]>(contentSchema);
const observationValidator = ajv.compile<Observation[]>(observationSchema);
const evidenceValidator = ajv.compile<Evidence[]>(evidenceSchema);
const dialogueValidator = ajv.compile<DialogueNode[]>(dialogueSchema);
const reasoningValidator = ajv.compile<ReasoningNode[]>(reasoningSchema);
const relationshipValidator =
  ajv.compile<RelationshipBundle>(relationshipSchema);
const timelineValidator = ajv.compile<TimelineBundle>(timelineSchema);
const detectiveBoardValidator =
  ajv.compile<DetectiveBoardBundle>(detectiveBoardSchema);

export class StoryValidationError extends Error {
  readonly source: string;
  readonly validationErrors: ErrorObject[];

  constructor(source: string, validationErrors: ErrorObject[]) {
    const details = validationErrors
      .map((error) => `${error.instancePath || "/"} ${error.message ?? "校验失败"}`)
      .join("; ");

    super(`剧情数据校验失败：${source}${details ? `（${details}）` : ""}`);
    this.name = "StoryValidationError";
    this.source = source;
    this.validationErrors = validationErrors;
  }
}

function assertValid<T>(
  source: string,
  data: unknown,
  validator: ValidateFunction<T>
): asserts data is T {
  if (!validator(data)) {
    throw new StoryValidationError(source, [...(validator.errors ?? [])]);
  }
}

export function validateManifest(
  data: unknown,
  source = "manifest.json"
): StoryManifest {
  assertValid(source, data, manifestValidator);
  return data;
}

export function validateChapterManifest(
  data: unknown,
  source = "chapter-manifest.json"
): ChapterManifest {
  assertValid(source, data, chapterManifestValidator);
  return data;
}

export function validateChapter(
  data: unknown,
  source = "chapter.json"
): StoryChapter {
  assertValid(source, data, chapterValidator);
  return data;
}

export function validateContent(
  data: unknown,
  source = "content.json"
): ContentItem[] {
  assertValid(source, data, contentValidator);
  return data;
}

export function validateObservations(
  data: unknown,
  source = "observations.json"
): Observation[] {
  assertValid(source, data, observationValidator);
  return data;
}

export function validateEvidence(
  data: unknown,
  source = "evidence.json"
): Evidence[] {
  assertValid(source, data, evidenceValidator);
  return data;
}

export function validateDialogues(
  data: unknown,
  source = "dialogues.json"
): DialogueNode[] {
  assertValid(source, data, dialogueValidator);
  return data;
}

export function validateReasoning(
  data: unknown,
  source = "reasoning.json"
): ReasoningNode[] {
  assertValid(source, data, reasoningValidator);
  return data;
}

export function validateRelationshipBundle(
  data: unknown,
  source = "relationships.json"
): RelationshipBundle {
  assertValid(source, data, relationshipValidator);
  return data;
}

export function validateTimelineBundle(
  data: unknown,
  source = "timeline.json"
): TimelineBundle {
  assertValid(source, data, timelineValidator);
  return data;
}

export function validateDetectiveBoardBundle(
  data: unknown,
  source = "detective-board.json"
): DetectiveBoardBundle {
  assertValid(source, data, detectiveBoardValidator);
  return data;
}
